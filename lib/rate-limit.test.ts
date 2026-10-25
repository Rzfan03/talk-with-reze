import test from "node:test";
import assert from "node:assert/strict";
import { take } from "./rate-limit.ts";

test("rate-limit: limit lalu reset", () => {
  const key = `test:${Date.now()}:${Math.random()}`;
  assert.equal(take(key, 2, 1000), true);
  assert.equal(take(key, 2, 1000), true);
  assert.equal(take(key, 2, 1000), false);
});
