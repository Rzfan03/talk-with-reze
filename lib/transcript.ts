import { createHmac, timingSafeEqual } from "node:crypto";
import { serverSecret } from "./key-crypto.ts";

function key() {
  return createHmac("sha256", serverSecret()).update("reze-voice-assistant-transcript-v1").digest();
}

export function signAssistant(conversationId: string, content: string) {
  return createHmac("sha256", key())
    .update(conversationId)
    .update("\n")
    .update(content)
    .digest("base64url");
}

export function verifyAssistant(conversationId: string, content: string, sig: unknown) {
  if (typeof sig !== "string" || !sig) return false;
  const want = Buffer.from(signAssistant(conversationId, content));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}
