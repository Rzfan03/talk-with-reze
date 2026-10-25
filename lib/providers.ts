export type Kind = "openai-compatible" | "anthropic" | "google";
export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
export interface Preset { id: string; name: string; kind: Kind; baseURL: string; needKey: boolean }

export const PRESETS: Preset[] = [
  { id: "anthropic",  name: "Claude (Anthropic)", kind: "anthropic",         baseURL: "https://api.anthropic.com/v1", needKey: true },
  { id: "xai",        name: "Grok (xAI)",         kind: "openai-compatible", baseURL: "https://api.x.ai/v1", needKey: true },
  { id: "groq",       name: "Groq",               kind: "openai-compatible", baseURL: GROQ_BASE_URL, needKey: true },
  { id: "openrouter", name: "OpenRouter",         kind: "openai-compatible", baseURL: "https://openrouter.ai/api/v1", needKey: true },
  { id: "openai",     name: "OpenAI",             kind: "openai-compatible", baseURL: "https://api.openai.com/v1", needKey: true },
  { id: "google",     name: "Gemini (Google)",    kind: "google",            baseURL: "https://generativelanguage.googleapis.com/v1beta", needKey: true },
  { id: "ollama",     name: "Ollama (lokal)",     kind: "openai-compatible", baseURL: "http://localhost:11434/v1", needKey: false },
  { id: "custom",     name: "Custom (OpenAI-compatible)", kind: "openai-compatible", baseURL: "", needKey: false },
];
export const preset = (id: string) => PRESETS.find((p) => p.id === id) ?? PRESETS[3];
export const normalizeBaseURL = (url: string) => url.trim().replace(/\/$/, "");

/** Tolak URL non-http dan, di production, alamat lokal/privat (cegah SSRF). */
export function assertSafeURL(raw: string) {
  const u = new URL(raw);
  if (!/^https?:$/.test(u.protocol)) throw new Error("Base URL harus http(s).");
  if (process.env.NODE_ENV === "production") {
    const h = u.hostname;
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1)/.test(h) || h.endsWith(".local"))
      throw new Error("Alamat lokal/privat tidak diizinkan di server production.");
  }
  return u.toString().replace(/\/$/, "");
}
