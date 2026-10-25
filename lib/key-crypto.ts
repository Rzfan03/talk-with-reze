import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

export interface StoredKey {
  apiKey: string;
  baseURL: string;
}

const VERSION = "v1";
const AAD = Buffer.from("reze-voice-provider-key-v1");
const DEV_SECRET = "reze-voice-local-development-secret-change-me";

let cached: Buffer | null = null;

function derive() {
  if (cached) return cached;
  const secret =
    process.env.SESSION_SECRET ||
    process.env.ELEVENLABS_API_KEY ||
    (process.env.NODE_ENV !== "production" ? DEV_SECRET : "");
  if (!secret) throw new Error("SESSION_SECRET belum diatur di server.");
  cached = scryptSync(secret, "reze-voice-key", 32);
  return cached;
}

export function sealKey(data: StoredKey): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", derive(), iv);
  cipher.setAAD(AAD);
  const body = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), body.toString("base64url"), cipher.getAuthTag().toString("base64url")].join(".");
}

export function openKey(token: string): StoredKey | null {
  const key = derive();
  try {
    const [version, iv, body, tag] = token.split(".");
    if (version !== VERSION || !iv || !body || !tag) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAAD(AAD);
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const json = Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
    const data = JSON.parse(json);
    if (typeof data?.apiKey !== "string" || typeof data?.baseURL !== "string") return null;
    return { apiKey: data.apiKey, baseURL: data.baseURL };
  } catch {
    return null;
  }
}
