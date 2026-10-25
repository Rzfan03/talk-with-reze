/** Pecah buffer menjadi kalimat lengkap; sisa yang belum selesai dikembalikan. */
export function splitSentences(buf: string) {
  const out: string[] = [];
  const re = /([.!?]+["')\]]*\s+|\n+)/;
  let m: RegExpExecArray | null;
  while ((m = re.exec(buf))) {
    const end = m.index + m[0].length;
    const s = buf.slice(0, end).trim();
    if (s) out.push(s);
    buf = buf.slice(end);
  }
  return { out, rest: buf };
}

export interface Seg { code: boolean; text: string; lang?: string }

/** Pisahkan teks dan fenced code block (```lang). Fence yang belum ditutup dianggap code. */
export function segments(src: string): Seg[] {
  const out: Seg[] = [];
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf("```", i);
    if (open < 0) {
      if (i < src.length) out.push({ code: false, text: src.slice(i) });
      break;
    }
    if (open > i) out.push({ code: false, text: src.slice(i, open) });
    const nl = src.indexOf("\n", open + 3);
    if (nl < 0) {
      out.push({ code: true, text: "", lang: src.slice(open + 3).trim() });
      break;
    }
    const lang = src.slice(open + 3, nl).trim();
    const close = src.indexOf("```", nl + 1);
    if (close < 0) {
      out.push({ code: true, text: src.slice(nl + 1), lang });
      break;
    }
    out.push({ code: true, text: src.slice(nl + 1, close).replace(/\n$/, ""), lang });
    i = close + 3;
  }
  return out.filter((s) => s.code ? s.text.length > 0 || !!s.lang : s.text.length > 0);
}

/** Filter streaming: hanya kalimat di luar code block yang dikembalikan untuk dibacakan. */
export class ProseStream {
  private raw = "";
  private prose = "";
  private code = false;

  push(chunk: string): string[] {
    this.raw += chunk;
    return this.drain(false);
  }

  flush(): string[] {
    const out = this.drain(true);
    const rest = this.prose.trim();
    if (rest) out.push(rest);
    this.raw = "";
    this.prose = "";
    this.code = false;
    return out;
  }

  private drain(flush: boolean): string[] {
    for (;;) {
      if (this.code) {
        const close = this.raw.indexOf("```");
        if (close < 0) {
          this.raw = flush ? "" : this.raw.slice(-2);
          break;
        }
        this.raw = this.raw.slice(close + 3);
        this.code = false;
        continue;
      }
      const open = this.raw.indexOf("```");
      if (open < 0) {
        const safe = flush ? this.raw.length : Math.max(0, this.raw.length - 2);
        this.prose += this.raw.slice(0, safe);
        this.raw = this.raw.slice(safe);
        break;
      }
      this.prose += this.raw.slice(0, open);
      this.raw = this.raw.slice(open + 3);
      this.code = true;
    }
    const { out, rest } = splitSentences(this.prose);
    this.prose = rest;
    return out;
  }
}
