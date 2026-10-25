import { cookies } from "next/headers";
import { openKey, sealKey, type StoredKey } from "./key-crypto";
import { normalizeBaseURL } from "./providers";

const NAME = "reze_provider_key";
const MAX_AGE = 60 * 60 * 24 * 30;

export async function readStoredKey(): Promise<StoredKey | null> {
  const token = (await cookies()).get(NAME)?.value;
  return token ? openKey(token) : null;
}

export async function readKeyFor(baseURL: string): Promise<string | null> {
  const stored = await readStoredKey();
  return stored && stored.baseURL === normalizeBaseURL(baseURL) ? stored.apiKey : null;
}

export async function saveKey(data: StoredKey) {
  (await cookies()).set(NAME, sealKey({ apiKey: data.apiKey, baseURL: normalizeBaseURL(data.baseURL) }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE,
    priority: "high",
  });
}

export async function clearKey() {
  (await cookies()).delete(NAME);
}
