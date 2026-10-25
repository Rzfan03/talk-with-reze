import { NextResponse } from "next/server";
import { assertSafeURL, type Kind } from "@/lib/providers";
import { readKeyFor } from "@/lib/key-cookie";

type Model = { id: string; name: string };

const noStore = { "cache-control": "no-store" };

export async function POST(req: Request) {
  try {
    const { kind, baseURL } = (await req.json()) as { kind: Kind; baseURL: string };
    const base = assertSafeURL(baseURL);
    const apiKey = (await readKeyFor(base)) ?? undefined;
    if (!apiKey && kind !== "openai-compatible") throw new Error("API key untuk provider ini belum diatur.");
    let models: Model[] = [];

    if (kind === "anthropic") {
      const r = await fetch(`${base}/models?limit=100`, { headers: { "x-api-key": apiKey!, "anthropic-version": "2023-06-01" } });
      if (!r.ok) throw new Error(`Provider menjawab ${r.status}`);
      models = (await r.json()).data.map((m: any) => ({ id: m.id, name: m.display_name ?? m.id }));
    } else if (kind === "google") {
      const r = await fetch(`${base}/models?pageSize=100`, { headers: { "x-goog-api-key": apiKey! } });
      if (!r.ok) throw new Error(`Provider menjawab ${r.status}`);
      models = (await r.json()).models
        .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m: any) => ({ id: String(m.name).replace("models/", ""), name: m.displayName ?? m.name }));
    } else {
      const r = await fetch(`${base}/models`, { headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {} });
      if (!r.ok) throw new Error(`Provider menjawab ${r.status}`);
      models = ((await r.json()).data ?? []).map((m: any) => ({ id: m.id, name: m.name ?? m.id }));
    }
    models = models.filter((m) => !/embed|whisper|tts|moderation|rerank/i.test(m.id));
    models.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ models }, { headers: noStore });
  } catch (e: any) {
    return NextResponse.json({ error: `Gagal memuat model: ${e.message}` }, { status: 400, headers: noStore });
  }
}
