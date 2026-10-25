import test from "node:test";
import assert from "node:assert/strict";
import { ProseStream, segments } from "./format.ts";

test("segments: pisahkan teks dan code", () => {
  assert.deepEqual(segments("Halo.\n```js\nconst a = 1;\n```\nSelesai."), [
    { code: false, text: "Halo.\n" },
    { code: true, text: "const a = 1;", lang: "js" },
    { code: false, text: "\nSelesai." },
  ]);
});

test("segments: fence belum ditutup dianggap code", () => {
  const s = segments("Lihat:\n```py\nprint(1)");
  assert.deepEqual(s.at(-1), { code: true, text: "print(1)", lang: "py" });
});

test("ProseStream: code tidak diucapkan, prosa per kalimat", () => {
  const p = new ProseStream();
  const said = [
    ...p.push("Halo! Ini "),
    ...p.push("contoh.\n```js\nconst a = 1;\n"),
    ...p.push("```\nSelesai."),
  ];
  assert.deepEqual(said, ["Halo!", "Ini contoh."]);
  assert.deepEqual(p.flush(), ["Selesai."]);
});

test("ProseStream: prosa tanpa titik sebelum fence tetap tidak diucapkan setelah code", () => {
  const p = new ProseStream();
  assert.deepEqual(p.push("Cek ini:\n```js\nconst a = 1;\n```\nSelesai."), ["Cek ini:"]);
  assert.deepEqual(p.flush(), ["Selesai."]);
});

test("ProseStream: fence terpotong antar chunk", () => {
  const p = new ProseStream();
  assert.deepEqual(p.push("Satu. ``"), ["Satu."]);
  assert.deepEqual(p.push("`js\nconst a = 1;\n```"), []);
  assert.deepEqual(p.push("Dua."), []);
  assert.deepEqual(p.flush(), ["Dua."]);
});
