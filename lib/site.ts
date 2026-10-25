export const SITE_NAME = "Talk With Reze";
export const SITE_DESC =
  "Ngobrol pakai suara dengan Reze, avatar AI yang bergerak saat bicara. Balasan dibacakan ElevenLabs dan percakapan waspada layar basah - from developer.";
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
).replace(/\/$/, "");
