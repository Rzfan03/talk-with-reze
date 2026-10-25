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

const PROD_HOSTS = new Set([
  "api.anthropic.com",
  "api.x.ai",
  "api.groq.com",
  "openrouter.ai",
  "api.openai.com",
  "generativelanguage.googleapis.com",
]);

function allowedHosts() {
  const extra = (process.env.ALLOWED_PROVIDER_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return extra.length ? new Set([...PROD_HOSTS, ...extra]) : PROD_HOSTS;
}

/** Tolak URL non-http dan, di production, host di luar allowlist (cegah SSRF). */
export function assertSafeURL(raw: string, production = process.env.NODE_ENV === "production") {
  const u = new URL(raw);
  if (!/^https?:$/.test(u.protocol)) throw new Error("Base URL harus http(s).");
  if (u.username || u.password) throw new Error("Base URL tidak boleh berisi kredensial.");
  if (production) {
    if (u.protocol !== "https:") throw new Error("Base URL harus https di production.");
    if (!allowedHosts().has(u.hostname.toLowerCase()))
      throw new Error("Host provider tidak diizinkan. Tambahkan ke ALLOWED_PROVIDER_HOSTS.");
  }
  return u.toString().replace(/\/$/, "");
}

export const noRedirectFetch: typeof fetch = (input, init) => fetch(input, { ...init, redirect: "error" });
