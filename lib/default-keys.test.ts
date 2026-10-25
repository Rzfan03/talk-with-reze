import test from "node:test";
import assert from "node:assert/strict";
import { demoBaseURLs, demoKeyFor } from "./default-keys.ts";

test("demo keys: only the configured provider is used", () => {
  const prev = process.env.DEMO_GROQ_API_KEY;
  const prevOpenAI = process.env.DEMO_OPENAI_API_KEY;
  process.env.DEMO_GROQ_API_KEY = "gsk_demo_test";
  delete process.env.DEMO_OPENAI_API_KEY;
  try {
    assert.equal(demoKeyFor("https://api.groq.com/openai/v1/"), "gsk_demo_test");
    assert.equal(demoKeyFor("https://api.openai.com/v1"), undefined);
    assert.deepEqual(demoBaseURLs(), ["https://api.groq.com/openai/v1"]);
  } finally {
    if (prev === undefined) delete process.env.DEMO_GROQ_API_KEY;
    else process.env.DEMO_GROQ_API_KEY = prev;
    if (prevOpenAI === undefined) delete process.env.DEMO_OPENAI_API_KEY;
    else process.env.DEMO_OPENAI_API_KEY = prevOpenAI;
  }
});
