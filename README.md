# Talk With Reze

Proyek open source buat ngobrol pakai suara sama Reze: avatar AI yang ikut bergerak saat bicara, balasan suara, dan riwayat percakapan yang tersimpan di browser.

Dibuat dengan Next.js 15, React 19, Tailwind CSS 4, GSAP, Zustand, Vercel AI SDK, dan ElevenLabs. Silakan dipakai, diubah, dan dikembangkan lagi — bebas.

## Fitur

- Chat streaming dengan banyak provider: Anthropic, OpenAI, Gemini, Groq, xAI, OpenRouter, Ollama, atau endpoint OpenAI-compatible sendiri.
- Input suara lewat mikrofon. Web Speech API dipakai dulu; kalau gagal, audio direkam dan dikirim ke ElevenLabs Speech-to-Text.
- Balasan dibacakan per kalimat lewat ElevenLabs TTS. Tanpa API key, otomatis fallback ke TTS browser.
- Avatar Reze beranimasi mengikuti level audio dan status bicara.
- Riwayat percakapan, pengaturan provider, dan preferensi suara tersimpan lokal di browser.
- Layout responsif, dark mode, SEO metadata, Open Graph image, sitemap, dan manifest PWA.

## Jalankan di lokal

Butuh Node.js 20 atau lebih baru.

```bash
git clone https://github.com/Rzfan03/talk-with-reze.git
cd talk-with-reze
npm install
cp .env.example .env.local
npm run dev
```

Buka http://localhost:3000. Klik ikon pengaturan, pilih provider, tempel API key, klik **Muat model**, pilih model, lalu simpan.

### Environment

| Variabel | Wajib | Fungsi |
| --- | --- | --- |
| `ELEVENLABS_API_KEY` | Tidak | Dipakai untuk TTS dan STT. Tanpa ini, suara balasan memakai TTS browser dan STT fallback tidak tersedia. |
| `ELEVENLABS_VOICE_ID` | Tidak | Voice default ElevenLabs. Bisa juga diisi lewat menu Pengaturan. |
| `NEXT_PUBLIC_SITE_URL` | Tidak | URL publik untuk canonical, sitemap, dan OG image. Di Vercel biasanya otomatis. |

API key provider model tidak disimpan di server. Key tersebut disimpan di localStorage browser dan hanya dikirim ke route handler saat dibutuhkan. Key ElevenLabs tetap di server.

## Cara kerja

1. Mikrofon menangkap suara. Web Speech API jadi pilihan pertama; kalau tidak tersedia, rekaman dikirim ke `/api/stt`.
2. Teks dikirim ke `/api/chat`, lalu balasan di-stream.
3. Balasan dipecah per kalimat dan dikirim ke `/api/tts`.
4. Audio diputar berurutan. Analyser audio membaca level suara dan menggerakkan avatar lewat GSAP.

## Struktur

- `app/api/chat`, `app/api/models`, `app/api/stt`, `app/api/tts` — route handler.
- `app/layout.tsx` — metadata, SEO, dan JSON-LD.
- `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts` — file SEO dan PWA.
- `components/ChatApp.tsx` — sidebar, thread, composer, dan alur percakapan.
- `components/Avatar.tsx` — animasi avatar.
- `components/SettingsDialog.tsx` — pengaturan provider dan suara.
- `lib/providers.ts` — preset provider dan penjaga SSRF.
- `lib/store.ts` — state, persona, dan penyimpanan lokal.
- `lib/voice.ts` — antrean TTS, STT, dan pemecah kalimat.
- `lib/site.ts` — nama, deskripsi, dan URL situs.
- `public/avatars` — aset avatar. `public/og-image.jpg` — gambar Open Graph.

## Deploy

Paling gampang lewat Vercel: import repo, tambahkan environment variable yang dibutuhkan, lalu deploy. `NEXT_PUBLIC_SITE_URL` boleh dikosongkan karena Vercel menyediakan domain produksi otomatis.

Untuk Ollama atau LM Studio, jalankan aplikasi di mesin yang sama dengan model lokal. Alamat lokal dan privat sengaja diblokir di production untuk menghindari SSRF.

## Kontribusi

Issue dan pull request terbuka untuk siapa saja. Kalau menemukan bug atau punya ide fitur, buat issue dulu supaya bisa didiskusikan. Jangan commit API key atau file `.env.local`.

## Lisensi

Kode proyek ini memakai lisensi [MIT](LICENSE). Bebas dipakai, diubah, dan didistribusikan, termasuk untuk proyek komersial, asalkan notice lisensi tetap disertakan.

Catatan aset: avatar Reze dan Denji adalah karakter dari *Chainsaw Man* dan bukan bagian dari lisensi MIT. Kalau mau dipakai untuk produk publik atau komersial, ganti aset avatarnya dengan gambar yang kamu punya hak pakainya.
