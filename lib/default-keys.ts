import { GROQ_BASE_URL, normalizeBaseURL } from "./providers.ts";

const ENV_BY_BASE: Record<string, string> = {
  "https://api.anthropic.com/v1": "DEMO_ANTHROPIC_API_KEY",
  "https://api.x.ai/v1": "DEMO_XAI_API_KEY",
  [GROQ_BASE_URL]: "DEMO_GROQ_API_KEY",
  "https://openrouter.ai/api/v1": "DEMO_OPENROUTER_API_KEY",
  "https://api.openai.com/v1": "DEMO_OPENAI_API_KEY",
  "https://generativelanguage.googleapis.com/v1beta": "DEMO_GOOGLE_API_KEY",
};

export function demoKeyFor(baseURL: string): string | undefined {
  const env = ENV_BY_BASE[normalizeBaseURL(baseURL)];
  const key = env ? process.env[env]?.trim() : "";
  return key || undefined;
}

export function demoBaseURLs(): string[] {
  return Object.keys(ENV_BY_BASE).filter((base) => !!process.env[ENV_BY_BASE[base]]?.trim());
}
