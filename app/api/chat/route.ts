import { streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { assertSafeURL, type Kind } from "@/lib/providers";
import { readKeyFor } from "@/lib/key-cookie";

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
  if (p.kind === "anthropic") return createAnthropic({ apiKey, baseURL: p.baseURL })(p.modelId);
  if (p.kind === "google") return createGoogleGenerativeAI({ apiKey, baseURL: p.baseURL })(p.modelId);
  return createOpenAICompatible({ name: "custom", apiKey, baseURL: p.baseURL })(p.modelId);
}

export async function POST(req: Request) {
  try {
    const { provider, system, messages } = await req.json();
    if (!provider?.modelId) return new Response("Pilih model dulu di Pengaturan.", { status: 400 });
    const baseURL = assertSafeURL(provider.baseURL);
    const apiKey = (await readKeyFor(baseURL)) ?? undefined;
    const result = streamText({
      model: getModel({ kind: provider.kind, baseURL, modelId: provider.modelId }, apiKey),
      system,
      messages,
      onError: ({ error }) => console.error("chat error:", redact(error)),
    });
    return result.toTextStreamResponse({ headers: noStore });
  } catch (e: any) {
    return new Response(redact(e) || "Gagal memanggil model.", { status: 400, headers: noStore });
  }
}
