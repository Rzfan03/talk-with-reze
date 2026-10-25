export async function POST(req: Request) {
  let form: FormData;
  try { form = await req.formData(); }
  catch { return new Response("Format audio tidak valid", { status: 400 }); }

  const file = form.get("file");
  if (!(file instanceof Blob) || !file.size) return new Response("Audio kosong", { status: 400 });
  if (file.size > 25 * 1024 * 1024) return new Response("Audio terlalu besar", { status: 413 });

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return new Response("ElevenLabs belum diatur", { status: 501 });

  const body = new FormData();
  const name = "name" in file && typeof file.name === "string" ? file.name : "rekaman.webm";
  body.set("file", file, name);
  body.set("model_id", "scribe_v1");
  body.set("language_code", "id");

  const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST", headers: { "xi-api-key": key }, body,
  });
  if (!r.ok) return new Response(await r.text(), { status: r.status });
  const data = await r.json();
  return Response.json({ text: typeof data?.text === "string" ? data.text : "" });
}
