import { streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { assertSafeURL, type Kind } from "@/lib/providers";

export const maxDuration = 60;

function getModel(p: { kind: Kind; baseURL: string; apiKey: string; modelId: string }) {
  const baseURL = assertSafeURL(p.baseURL);
  const apiKey = p.apiKey || undefined;
  if (p.kind === "anthropic") return createAnthropic({ apiKey, baseURL })(p.modelId);
  if (p.kind === "google") return createGoogleGenerativeAI({ apiKey, baseURL })(p.modelId);
  return createOpenAICompatible({ name: "custom", apiKey, baseURL })(p.modelId);
}

export async function POST(req: Request) {
  try {
    const { provider, system, messages } = await req.json();
    if (!provider?.modelId) return new Response("Pilih model dulu di Pengaturan.", { status: 400 });
    const result = streamText({
      model: getModel(provider), system, messages,
      onError: ({ error }) => console.error("chat error:", error),
    });
    return result.toTextStreamResponse();
  } catch (e: any) {
    return new Response(e.message ?? "Gagal memanggil model.", { status: 400 });
  }
}
