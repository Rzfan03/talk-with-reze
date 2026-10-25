import { streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { assertSafeURL, type Kind } from "@/lib/providers";
import { readKeyFor } from "@/lib/key-cookie";
import { demoKeyFor } from "@/lib/default-keys";
import { clientIP, take } from "@/lib/rate-limit";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store" };

function redact(value: unknown) {
  const message = value instanceof Error ? value.message : String(value);
  return message
    .replace(/\b(sk-|gsk_|xai-|AIza)[A-Za-z0-9_-]{8,}/g, "$1…")
    .slice(0, 500);
}

function getModel(p: { kind: Kind; baseURL: string; modelId: string }, apiKey?: string) {
  const key = apiKey ?? "";
  if (p.kind === "anthropic") return createAnthropic({ apiKey: key, baseURL: p.baseURL })(p.modelId);
  if (p.kind === "google") return createGoogleGenerativeAI({ apiKey: key, baseURL: p.baseURL })(p.modelId);
  return createOpenAICompatible({ name: "custom", apiKey: key, baseURL: p.baseURL })(p.modelId);
}

export async function POST(req: Request) {
  try {
    const { provider, system, messages } = await req.json();
    if (!provider?.modelId) return new Response("Pilih model dulu di Pengaturan.", { status: 400, headers: noStore });
    if (!Array.isArray(messages)) return new Response("Format pesan tidak valid.", { status: 400, headers: noStore });
    const baseURL = assertSafeURL(provider.baseURL);
    const userKey = await readKeyFor(baseURL);
    const apiKey = userKey ?? demoKeyFor(baseURL);
    const usingDemo = !userKey && !!apiKey;
    let payload = messages;

    if (usingDemo) {
      const ip = clientIP(req);
      if (!take(`demo-chat:min:${ip}`, 10, 60_000) || !take(`demo-chat:day:${ip}`, 100, 86_400_000)) {
        return new Response("Batas demo tercapai. Coba lagi nanti atau pakai API key sendiri.", {
          status: 429,
          headers: { ...noStore, "retry-after": "60" },
        });
      }
      payload = messages.slice(-20);
      const systemChars = typeof system === "string" ? system.length : 0;
      const chars = payload.reduce((n, m) => n + (typeof m?.content === "string" ? m.content.length : 0), systemChars);
      if (chars > 14_000) {
        return new Response("Percakapan demo terlalu panjang. Pakai API key sendiri untuk lanjut.", { status: 413, headers: noStore });
      }
    }

    const result = streamText({
      model: getModel({ kind: provider.kind, baseURL, modelId: provider.modelId }, apiKey),
      system,
      messages: payload,
      onError: ({ error }) => console.error("chat error:", redact(error)),
    });
    return result.toTextStreamResponse({ headers: noStore });
  } catch (e: any) {
    return new Response(redact(e) || "Gagal memanggil model.", { status: 400, headers: noStore });
  }
}
