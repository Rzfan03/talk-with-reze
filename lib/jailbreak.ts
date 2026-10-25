const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/g;
const CONFUSABLES: Record<string, string> = {
  "а": "a", "α": "a", "е": "e", "ε": "e", "о": "o", "ο": "o", "р": "p", "ρ": "p",
  "с": "c", "ϲ": "c", "у": "y", "υ": "u", "х": "x", "χ": "x", "і": "i", "ι": "i",
  "ј": "j", "ѕ": "s", "к": "k", "κ": "k", "т": "t", "τ": "t", "м": "m", "н": "n",
  "ԁ": "d", "ɡ": "g", "һ": "h", "ӏ": "l",
};
const LEET: Record<string, string> = {
  "0": "o", "1": "i", "!": "i", "|": "i", "3": "e", "4": "a", "@": "a", "5": "s", "$": "s", "7": "t",
};

const PATTERNS: RegExp[] = [
  /\b(ignore|disregard|forget|override|bypass)\b.{0,50}\b(instructions?|rules?|prompts?|orders?|guidelines?)\b/,
  /\b(abaikan|hiraukan|lupakan|langgar|lewati|timpa|override|bypass)\b.{0,50}\b(instruksi|aturan|perintah|prompt|persona|kepribadian)\b/,
  /\b(lupakan|abaikan|hiraukan|ignore|forget)\b.{0,40}\b(persona|kepribadian|aturan|instruksi|prompt)\b/,
  /\b(ganti|ubah|timpa|replace|change|override)\b.{0,30}\b(persona|kepribadian|system prompt|aturan|instruksi)\b/,
  /\b(kamu|kau|you)\b.{0,20}\b(bukan|not)\s+reze\b/,
  /\b(kamu sekarang adalah|sekarang kamu adalah|mulai sekarang kamu|from now on,? you are|you are now)\b.{0,50}\b(jailbreak|unrestricted|uncensored|tanpa|no rules|different|ai|asisten|assistant|model|bot)\b/,
  /\b(bypass|lewati|matikan|nonaktifkan|disable)\b.{0,40}\b(filter|sensor|safety|keamanan|batas|limit|aturan|guardrail|restrictions?)\b/,
  /\b(dan mode|do anything now|developer mode|jailbreak mode|mode (bebas|tanpa (batas|filter|aturan|sensor)|uncensored|unfiltered|evil|gelap))\b/,
  /\b(jailbreak|jail break)\b.{0,30}\b(mode|prompt|aktifkan|gunakan|pakai|coba|bypass)\b/,
  /\b(mode|aktifkan|gunakan|pakai|coba)\b.{0,30}\b(jailbreak|jail break)\b/,
  /\b(kamu|kau|you)\b.{0,30}\b(tanpa|no|without)\s+(batas|aturan|filter|sensor|restrictions?|limits?|rules?|filters?)\b/,
  /\b(mode|you|kamu|kau)\b.{0,20}\b(unrestricted|uncensored|unfiltered|tanpa sensor)\b/,
  /\b(pretend|roleplay|act as|berpura-pura|berperan sebagai)\b.{0,50}\b(no rules|tanpa (aturan|filter)|unrestricted|different (ai|assistant)|ai lain|bukan reze|jailbreak|dan mode)\b/,
  /\b(reveal|show|print|repeat|leak|dump|expose|display|output|tampilkan|bocorkan|tulis|ulangi|kasih|beri)\b.{0,50}\b(system prompt|prompt|instruksi|instructions?|aturan (internal|rahasia|kamu|mu)|hidden|internal rules)\b/,
  /\b(repeat|ulangi|tulis ulang)\b.{0,30}\b(kata|teks|pesan|instructions?)\b.{0,20}\b(above|di atas|sebelumnya)\b/,
  /\b(lakukan|gunakan|coba|terapkan|use|apply|perform|do)\b.{0,20}\b(prompt injection|inject(?:ing)? (?:a )?(?:prompt|instruction))\b/,
  /<\|?(system|developer|assistant|im_start|im_end)\|?>/,
  /(^|\n)\s*(system|developer|assistant)\s*:/,
  /(^|\n)\s*#{2,}\s*(system|instruction|prompt)/,
  /\[(system|developer|instruction)\]/,
  /```\s*(system|instruction|prompt)/,
  /\b(begin|start|end)\s+(system|developer|instruction)\b/,
  /"role"\s*:\s*"system"/,
  /\b(for educational purposes|educational purposes only|hypothetically|in a fictional world|for a story|dalam cerita fiksi|untuk edukasi|hanya fiksi|anggap fiksi)\b.{0,100}\b(ignore|abaikan|tanpa filter|no rules|jailbreak|system prompt|kode|code)\b/,
  /\b(decode|decrypt|terjemahkan|baca|ikuti|jalankan|execute)\b.{0,40}\b(base64|rot13|hex|unicode|kode sandi|cipher)\b/,
  /\b(base64|rot13|hex|unicode)\b.{0,40}\b(ikuti|jalankan|abaikan|ignore|follow|execute|instructions?|aturan)\b/,
];

const COMPACT_PATTERNS: RegExp[] = [
  /(ignore|disregard|forget|override|bypass)(all|any|the)?(previous|prior|above)?(instructions?|rules?|prompts?)/,
  /(abaikan|hiraukan|lupakan|langgar|lewati|timpa)(semua|seluruh)?(aturan|instruksi|perintah|prompt|persona)/,
  /(kamu|kau|you)(bukan|not)reze/,
  /(system|developer)(prompt|message|instruction)/,
  /(jailbreak)(mode|prompt|aktifkan|gunakan|pakai|coba|bypass)/,
  /(mode|aktifkan|gunakan|pakai|coba)(jailbreak)/,
  /(danmode|doanythingnow|developermode)/,
];

function normalize(input: string) {
  return input
    .normalize("NFKC")
    .replace(ZERO_WIDTH, "")
    .replace(/[^\x00-\x7F]/g, (c) => CONFUSABLES[c] ?? c)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function deSpace(text: string) {
  return text.replace(/\b(?:[a-z][\s._\-*]+){2,}[a-z]\b/g, (part) => part.replace(/[^a-z]/g, ""));
}

function leet(text: string) {
  return text.replace(/[01!|345@$7]/g, (c) => LEET[c] ?? c);
}

function rot13(text: string) {
  return text.replace(/[a-z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 97 + 13) % 26) + 97));
}

function decodeBase64(text: string) {
  const sources = [text, text.replace(/\s+/g, "")];
  return sources
    .flatMap((source) => source.match(/[A-Za-z0-9+/]{32,}={0,2}/g) ?? [])
    .map((part) => Buffer.from(part, "base64").toString("utf8"))
    .join(" ");
}

function decodeEscapes(text: string) {
  return text
    .replace(/&#(x?[0-9a-f]+);/gi, (_, code: string) => {
      try {
        const hex = /^x/i.test(code);
        return String.fromCodePoint(parseInt(hex ? code.slice(1) : code, hex ? 16 : 10));
      } catch {
        return "";
      }
    })
    .replace(/\\u\{?([0-9a-f]{4,6})\}?/gi, (_, code: string) => {
      try {
        return String.fromCodePoint(parseInt(code, 16));
      } catch {
        return "";
      }
    })
    .replace(/\\x([0-9a-f]{2})/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)));
}

function decodeURI(text: string) {
  try {
    return decodeURIComponent(text);
  } catch {
    return "";
  }
}

/** Deteksi heuristik jailbreak/prompt injection. Bukan jaminan absolut. */
export function isJailbreak(raw: string) {
  if (!raw.trim()) return false;
  const plain = normalize(raw);
  const texts = new Set([plain, leet(plain), deSpace(plain), rot13(plain)]);
  for (const extra of [decodeBase64(raw), decodeURI(raw), decodeEscapes(raw)]) {
    const text = normalize(extra);
    texts.add(text);
    texts.add(leet(text));
    texts.add(deSpace(text));
    texts.add(rot13(text));
  }
  return [...texts].some((text) =>
    PATTERNS.some((pattern) => pattern.test(text)) ||
    COMPACT_PATTERNS.some((pattern) => pattern.test(text.replace(/[^a-z0-9]/g, "")))
  );
}
