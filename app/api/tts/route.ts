export async function POST(req: Request) {
  const { text, voiceId, modelId } = await req.json();
  const key = process.env.ELEVENLABS_API_KEY;
  const voice = voiceId || process.env.ELEVENLABS_VOICE_ID;
  if (!key || !voice || !text) return new Response("ElevenLabs belum diatur", { status: 501 });
  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}/stream?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ text, model_id: modelId || "eleven_flash_v2_5" }),
    },
  );
  if (!r.ok) return new Response(await r.text(), { status: r.status });
  return new Response(r.body, { headers: { "content-type": "audio/mpeg" } });
}
