import { NextResponse } from "next/server";
import { assertSafeURL } from "@/lib/providers";
import { clearKey, readStoredKey, saveKey } from "@/lib/key-cookie";
import { demoBaseURLs } from "@/lib/default-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store" };

export async function GET() {
  try {
    const stored = await readStoredKey();
    return NextResponse.json({ hasKey: !!stored, baseURL: stored?.baseURL ?? null, demoBaseURLs: demoBaseURLs() }, { headers: noStore });
  } catch {
    return NextResponse.json({ hasKey: false, error: "Penyimpanan key belum siap.", demoBaseURLs: demoBaseURLs() }, { status: 500, headers: noStore });
  }
}

export async function POST(req: Request) {
  let body: { apiKey?: unknown; baseURL?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400, headers: noStore });
  }

  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const baseURL = typeof body.baseURL === "string" ? body.baseURL : "";
  if (apiKey.length < 8 || apiKey.length > 512) {
    return NextResponse.json({ error: "API key tidak valid." }, { status: 400, headers: noStore });
  }

  try {
    const safeURL = assertSafeURL(baseURL);
    await saveKey({ apiKey, baseURL: safeURL });
    return NextResponse.json({ ok: true, baseURL: safeURL }, { headers: noStore });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Gagal menyimpan API key." }, { status: 400, headers: noStore });
  }
}

export async function DELETE() {
  await clearKey();
  return NextResponse.json({ ok: true }, { headers: noStore });
}
