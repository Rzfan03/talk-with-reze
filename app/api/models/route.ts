import { NextResponse } from "next/server";
import { assertSafeURL, type Kind } from "@/lib/providers";

type Model = { id: string; name: string };

export async function POST(req: Request) {
  try {
    const { kind, baseURL, apiKey } = (await req.json()) as { kind: Kind; baseURL: string; apiKey: string };
    const base = assertSafeURL(baseURL);
    let models: Model[] = [];

    if (kind === "anthropic") {
      const r = await fetch(`${base}/models?limit=100`, { headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" } });
      if (!r.ok) throw new Error(`Provider menjawab ${r.status}`);
      models = (await r.json()).data.map((m: any) => ({ id: m.id, name: m.display_name ?? m.id }));
    } else if (kind === "google") {
      const r = await fetch(`${base}/models?pageSize=100`, { headers: { "x-goog-api-key": apiKey } });
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
    return NextResponse.json({ models });
  } catch (e: any) {
    return NextResponse.json({ error: `Gagal memuat model: ${e.message}` }, { status: 400 });
  }
}
