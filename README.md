# Reze Voice

Chat suara dengan provider AI pilihanmu. Next.js 15, Tailwind 4, GSAP, lucide-react, Zustand, Vercel AI SDK, ElevenLabs.

## Jalankan
```bash
npm install
cp .env.example .env.local   # opsional: isi key ElevenLabs
npm run dev
```
Buka http://localhost:3000, klik ikon pengaturan, pilih provider, tempel API key, **Muat model**, pilih model, simpan.

## Alur
mic (Web Speech API) → `/api/chat` (streaming) → dipecah per kalimat → `/api/tts` (ElevenLabs) → diputar berurutan; amplitudo audio menggerakkan avatar lewat GSAP.
Tanpa key/Voice ID ElevenLabs, balasan dibacakan TTS browser.

## Struktur
- `app/api/models|chat|tts` route handler (key ElevenLabs di server)
- `lib/providers.ts` preset provider + penjaga SSRF
- `lib/voice.ts` antrean TTS, STT, pemecah kalimat
- `components/ChatApp.tsx` layout sidebar, thread, composer
- `public/avatars` avatar Reze dan Denji

## Catatan
- API key pengguna disimpan di localStorage browser dan dikirim ke route handler hanya untuk satu permintaan. Jangan di-log.
- Ollama/LM Studio lokal hanya terjangkau dari server yang berjalan di mesin yang sama (dev lokal). Di production, alamat lokal/privat diblokir.
- Avatar adalah karakter berhak cipta dari Chainsaw Man. Aman untuk proyek pribadi; ganti sebelum dipublikasikan.
