import test from "node:test";
import assert from "node:assert/strict";
import { signAssistant, verifyAssistant } from "./transcript.ts";

test("transcript: signature binds assistant content and conversation", () => {
  const sig = signAssistant("conv-1", "halo, aku Reze");
  assert.equal(verifyAssistant("conv-1", "halo, aku Reze", sig), true);
  assert.equal(verifyAssistant("conv-2", "halo, aku Reze", sig), false);
  assert.equal(verifyAssistant("conv-1", "halo, aku Reze!", sig), false);
  assert.equal(verifyAssistant("conv-1", "halo, aku Reze", "palsu"), false);
  assert.equal(verifyAssistant("conv-1", "halo, aku Reze", undefined), false);
});
