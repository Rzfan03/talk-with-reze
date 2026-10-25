import test from "node:test";
import assert from "node:assert/strict";
import { assertSafeURL } from "./providers.ts";

test("providers: production hanya mengizinkan host allowlist via https", () => {
  assert.equal(assertSafeURL("https://api.groq.com/openai/v1/", true), "https://api.groq.com/openai/v1");
  assert.throws(() => assertSafeURL("https://evil.example/v1", true), /tidak diizinkan/);
  assert.throws(() => assertSafeURL("http://api.groq.com/openai/v1", true), /https/);
  assert.throws(() => assertSafeURL("https://169.254.169.254/latest", true), /tidak diizinkan/);
  assert.throws(() => assertSafeURL("https://user:pass@api.groq.com/v1", true), /kredensial/);
});

test("providers: development boleh host lokal", () => {
  assert.equal(assertSafeURL("http://localhost:11434/v1/", false), "http://localhost:11434/v1");
});
