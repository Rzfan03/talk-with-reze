import { streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { assertSafeURL, noRedirectFetch, type Kind } from "@/lib/providers";
import { readKeyFor } from "@/lib/key-cookie";
import { demoKeyFor } from "@/lib/default-keys";
import { clientIP, take } from "@/lib/rate-limit";
import { SYSTEM_PROMPT } from "@/lib/persona";
import { isJailbreak } from "@/lib/jailbreak";
import { signAssistant, verifyAssistant } from "@/lib/transcript";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store" };
const REFUSAL = "Aku tetap Reze, dan aku nggak bisa mengabaikan aturan atau berganti persona. Yuk, ngobrol soal hal lain aja.";
const SIG_MARK = "\u0000";
const MAX_BODY = 2_000_000;
const MAX_MSG = 20_000;

type ChatMessage = { role: "user" | "assistant"; content: string; sig?: string };

class HttpError extends Error {
  constructor(readonly status: number, message: string, readonly headers: Record<string, string> = {}) {
    super(message);
  }
}

async function readBody(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) throw new HttpError(413, "Permintaan terlalu besar.");
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "Format pesan tidak valid.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) {
      await reader.cancel();
      throw new HttpError(413, "Permintaan terlalu besar.");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function cleanMessages(value: unknown, conversationId: string): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  const out: ChatMessage[] = [];
  for (const item of value.slice(-200)) {
    if (!item || typeof item !== "object") continue;
    const { role, content, sig } = item as { role?: unknown; content?: unknown; sig?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string" || !content) continue;
    if (role === "assistant" && !verifyAssistant(conversationId, content, sig)) continue;
    const message: ChatMessage = { role, content: content.slice(0, MAX_MSG) };
    if (role === "assistant") message.sig = sig as string;
    out.push(message);
  }
  return out;
}

function redact(value: unknown) {
  const message = value instanceof Error ? value.message : String(value);
  return message
    .replace(/\b(sk-|gsk_|xai-|AIza)[A-Za-z0-9_-]{8,}/g, "$1…")
    .slice(0, 500);
}

function getModel(p: { kind: Kind; baseURL: string; modelId: string }, apiKey: string) {
  const settings = { apiKey, baseURL: p.baseURL, fetch: noRedirectFetch };
  if (p.kind === "anthropic") return createAnthropic(settings)(p.modelId);
  if (p.kind === "google") return createGoogleGenerativeAI(settings)(p.modelId);
  return createOpenAICompatible({ name: "custom", ...settings })(p.modelId);
}

function signedText(conversationId: string, text: string) {
  return new Response(text + SIG_MARK + signAssistant(conversationId, text), {
    status: 200,
    headers: { ...noStore, "content-type": "text/plain; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  try {
    const body = await readBody(req);
    const { provider, messages, conversationId } = body ?? {};
    if (!provider?.modelId || typeof provider.modelId !== "string" || provider.modelId.length > 200)
      return new Response("Pilih model dulu di Pengaturan.", { status: 400, headers: noStore });
    if (provider.kind !== "openai-compatible" && provider.kind !== "anthropic" && provider.kind !== "google")
      return new Response("Provider tidak dikenal.", { status: 400, headers: noStore });
    if (typeof conversationId !== "string" || !conversationId || conversationId.length > 128)
      return new Response("ID percakapan tidak valid.", { status: 400, headers: noStore });

    const baseURL = assertSafeURL(provider.baseURL);
    const userKey = await readKeyFor(baseURL);
    const apiKey = userKey ?? demoKeyFor(baseURL);
    const usingDemo = !userKey && !!apiKey;
    const ip = clientIP(req);

    if (usingDemo) {
      if (!take(`demo-chat:min:${ip}`, 10, 60_000) || !take(`demo-chat:day:${ip}`, 100, 86_400_000)) {
        return new Response("Batas demo tercapai. Coba lagi nanti atau pakai API key sendiri.", {
          status: 429,
          headers: { ...noStore, "retry-after": "60" },
        });
      }
    } else if (!take(`chat:${ip}`, 60, 60_000)) {
      return new Response("Terlalu banyak permintaan. Coba lagi sebentar.", { status: 429, headers: noStore });
    }

    let payload = cleanMessages(messages, conversationId);
    const lastUser = [...payload].reverse().find((m) => m.role === "user");
    if (!lastUser) return new Response("Format pesan tidak valid.", { status: 400, headers: noStore });

    if (isJailbreak(lastUser.content)) return signedText(conversationId, REFUSAL);
    payload = payload.filter((m) => !isJailbreak(m.content));

    if (usingDemo) {
      payload = payload.slice(-20);
      const chars = payload.reduce((n, m) => n + m.content.length, SYSTEM_PROMPT.length);
      if (chars > 14_000) {
        return new Response("Percakapan demo terlalu panjang. Pakai API key sendiri untuk lanjut.", { status: 413, headers: noStore });
      }
    }

    const result = streamText({
      model: getModel({ kind: provider.kind, baseURL, modelId: provider.modelId }, apiKey ?? ""),
      system: SYSTEM_PROMPT,
      messages: payload,
      onError: ({ error }) => console.error("chat error:", redact(error)),
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let full = "";
        try {
          for await (const chunk of result.textStream) {
            full += chunk;
            controller.enqueue(encoder.encode(chunk));
          }
          controller.enqueue(encoder.encode(SIG_MARK + signAssistant(conversationId, full)));
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });
    return new Response(stream, { headers: { ...noStore, "content-type": "text/plain; charset=utf-8" } });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 400;
    const headers = { ...noStore, ...(e instanceof HttpError ? e.headers : {}) };
    return new Response(redact(e) || "Gagal memanggil model.", { status, headers });
  }
}
