import test from "node:test";
import assert from "node:assert/strict";
import { openKey, sealKey } from "./key-crypto.ts";

test("key-crypto: roundtrip", () => {
  const token = sealKey({ apiKey: "gsk_test_123456", baseURL: "https://api.groq.com/openai/v1" });
  assert.deepEqual(openKey(token), { apiKey: "gsk_test_123456", baseURL: "https://api.groq.com/openai/v1" });
});

test("key-crypto: reject tampered token", () => {
  const token = sealKey({ apiKey: "gsk_test_123456", baseURL: "https://api.groq.com/openai/v1" });
  const tampered = token.slice(0, -2) + (token.endsWith("A") ? "B" : "A");
  assert.equal(openKey(tampered), null);
});

test("key-crypto: reject malformed token", () => {
  assert.equal(openKey("bukan-token"), null);
});
