/** Level audio (0..1) yang dibaca avatar GSAP untuk lip-sync sederhana. */
export const level = { v: 0 };

interface VoiceCfg { voiceId: string; voiceModel: string }

/** Antrean TTS: ambil audio per kalimat (paralel), putar berurutan. Fallback ke TTS browser. */
export class TTSPlayer {
  private ctx?: AudioContext; private an?: AnalyserNode; private src?: AudioBufferSourceNode;
  private chain: Promise<void> = Promise.resolve(); private pending = 0; private gen = 0; private raf = 0;
  constructor(private cfg: () => VoiceCfg, private onState: (s: "speaking" | "idle") => void) {}

  private ensure() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.an = this.ctx.createAnalyser(); this.an.fftSize = 512;
      this.an.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  say(text: string) {
    this.ensure();
    const g = this.gen, c = this.cfg();
    const audio = fetch("/api/tts", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, voiceId: c.voiceId, modelId: c.voiceModel }),
    }).then((r) => (r.ok ? r.arrayBuffer() : null)).then((b) => (b ? this.ctx!.decodeAudioData(b) : null)).catch(() => null);
    this.pending++; this.onState("speaking");
    this.chain = this.chain.then(async () => {
      if (g !== this.gen) return;
      const buf = await audio;
      if (g !== this.gen) return;
      await (buf ? this.play(buf) : this.browser(text));
    }).catch(() => {}).finally(() => {
      if (g === this.gen && --this.pending <= 0) { this.pending = 0; level.v = 0; this.onState("idle"); }
    });
  }

  private play(buf: AudioBuffer) {
    return new Promise<void>((done) => {
      const s = this.ctx!.createBufferSource(); s.buffer = buf; s.connect(this.an!); this.src = s;
      const data = new Uint8Array(this.an!.fftSize);
      const tick = () => {
        this.an!.getByteTimeDomainData(data);
        let sum = 0; for (const x of data) sum += ((x - 128) / 128) ** 2;
        level.v = Math.min(1, Math.sqrt(sum / data.length) * 4);
        this.raf = requestAnimationFrame(tick);
      };
      s.onended = () => { cancelAnimationFrame(this.raf); level.v = 0; done(); };
      s.start(); tick();
    });
  }

  private browser(text: string) {
    return new Promise<void>((done) => {
      if (!("speechSynthesis" in window)) return done();
      const u = new SpeechSynthesisUtterance(text); u.lang = "id-ID";
      const t = setInterval(() => (level.v = 0.2 + Math.random() * 0.6), 110);
      u.onend = u.onerror = () => { clearInterval(t); level.v = 0; done(); };
      speechSynthesis.speak(u);
    });
  }

  stop() {
    this.gen++; this.pending = 0; level.v = 0; cancelAnimationFrame(this.raf);
    try { this.src?.stop(); } catch {}
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    this.chain = Promise.resolve(); this.onState("idle");
  }
}

const MIC_ERRORS: Record<string, string> = {
  insecure: "Mikrofon hanya bisa dipakai lewat localhost atau HTTPS.",
  unsupported: "Browser ini tidak mendukung input suara.",
  "not-allowed": "Izin mikrofon ditolak. Aktifkan izinnya di browser.",
  "audio-capture": "Mikrofon tidak ditemukan.",
  network: "Pengenalan suara browser butuh koneksi internet.",
  "no-speech": "Tidak ada suara yang terdengar, coba lagi.",
  "stt-key": "Atur API key ElevenLabs untuk mengubah suara jadi teks.",
  "stt-fail": "Gagal mengubah suara jadi teks.",
  empty: "Suara tidak terbaca, coba lagi.",
  aborted: "",
};

export const micMessage = (e: string) => MIC_ERRORS[e] ?? "Suara tidak terbaca, coba lagi.";

interface MicHandlers {
  cfg: () => VoiceCfg;
  onText: (t: string) => void;
  onEnd: () => void;
  onError: (e: string) => void;
  onRecord: () => void;
}

/**
 * Mikrofon: utamakan Web Speech, lalu fallback rekam + ElevenLabs STT
 * (Chromium tanpa layanan Google, mis. Helium, gagal dengan error network).
 */
export async function startMic(h: MicHandlers): Promise<{ stop: () => void } | null> {
  const fail = (e: string) => { h.onError(e); h.onEnd(); return null; };
  if (!window.isSecureContext) return fail("insecure");
  if (!navigator.mediaDevices?.getUserMedia) return fail("unsupported");

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e: any) {
    return fail(e?.name === "NotAllowedError" ? "not-allowed" : e?.name === "NotFoundError" ? "audio-capture" : "unsupported");
  }

  let cancelled = false;
  let active: { stop: () => void } | null = null;
  const handle = {
    stop: () => {
      if (active) active.stop();
      else { cancelled = true; h.onEnd(); }
    },
  };

  async function beginRecorder(): Promise<{ stop: () => void } | null> {
    let s = stream?.getTracks().every((t) => t.readyState === "live") ? stream : null;
    if (!s) {
      try { s = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch { h.onError("not-allowed"); h.onEnd(); return null; }
    }
    if (cancelled) { s.getTracks().forEach((t) => t.stop()); return null; }
    if (typeof MediaRecorder === "undefined") {
      s.getTracks().forEach((t) => t.stop()); h.onError("unsupported"); h.onEnd(); return null;
    }

    let rec: MediaRecorder;
    try { rec = new MediaRecorder(s); }
    catch { s.getTracks().forEach((t) => t.stop()); h.onError("unsupported"); h.onEnd(); return null; }

    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = async () => {
      s!.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      if (!blob.size) { h.onError("empty"); h.onEnd(); return; }
      try {
        const fd = new FormData();
        fd.set("file", blob, `rekaman.${blob.type.includes("mp4") ? "mp4" : "webm"}`);
        const res = await fetch("/api/stt", { method: "POST", body: fd });
        if (!res.ok) { h.onError(res.status === 501 ? "stt-key" : "stt-fail"); return; }
        const data = await res.json();
        const text = typeof data?.text === "string" ? data.text.trim() : "";
        if (!text) { h.onError("empty"); return; }
        h.onText(text);
      } catch { h.onError("stt-fail"); }
      finally { h.onEnd(); }
    };

    try { rec.start(); }
    catch { s.getTracks().forEach((t) => t.stop()); h.onError("unsupported"); h.onEnd(); return null; }
    h.onRecord();
    return { stop: () => { try { if (rec.state !== "inactive") rec.stop(); } catch {} } };
  }

  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) {
    const rec = await beginRecorder();
    if (!rec) return null;
    active = rec;
    return handle;
  }

  stream.getTracks().forEach((t) => t.stop());
  let r: any;
  try { r = new SR(); } catch {
    const rec = await beginRecorder();
    if (!rec) return null;
    active = rec;
    return handle;
  }
  r.lang = "id-ID"; r.continuous = false; r.interimResults = false; r.maxAlternatives = 1;

  let fellBack = false;
  r.onresult = (e: any) => {
    let text = "";
    for (const res of e.results) text += `${res[0]?.transcript ?? ""} `;
    text = text.trim();
    if (text) h.onText(text);
  };
  r.onerror = (e: any) => {
    if (fellBack || e.error === "aborted") return;
    if (["network", "service-not-allowed", "language-not-supported"].includes(e.error)) {
      fellBack = true; active = null;
      try { r.abort(); } catch {}
      void beginRecorder().then((rec) => { if (rec && !cancelled) active = rec; });
      return;
    }
    h.onError(e.error); h.onEnd();
  };
  r.onend = () => { if (!fellBack) h.onEnd(); };

  try {
    r.start();
    active = { stop: () => { try { r.stop(); } catch {} } };
  } catch {
    fellBack = true; active = null;
    const rec = await beginRecorder();
    if (!rec) return null;
    active = rec;
  }
  return handle;
}
