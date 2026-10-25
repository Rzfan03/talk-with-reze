"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowUp, ChevronDown, ChevronRight, CircleCheck, Copy, Mic, PanelLeft, Pencil, Plus, Search, SlidersHorizontal, Trash2, Volume2, VolumeX } from "lucide-react";
import { Toaster, toast } from "react-hot-toast";
import gsap from "gsap";
import { Streamdown, type ControlsConfig, type StreamdownTranslations } from "streamdown";
import { code } from "@streamdown/code";
import { useApp, PERSONA, type Msg } from "@/lib/store";
import { preset } from "@/lib/providers";
import { TTSPlayer, micMessage, startMic } from "@/lib/voice";
import { ProseStream, segments } from "@/lib/format";
import { layout } from "@/lib/layout";
import { Avatar, type VState } from "./Avatar";
import SettingsDialog from "./SettingsDialog";
import ConfirmDialog from "./ConfirmDialog";

const REZE = "/avatars/reze.jpg", DENJI = "/avatars/denji.jpg";
const hm = () => new Date().toTimeString().slice(0, 5);
const PLACEHOLDER: Record<VState, string> = {
  idle: "Tanya apa saja atau tekan mikrofon", listening: "Mendengarkan…", thinking: "Sedang berpikir…", speaking: "Sedang berbicara…",
};
const SUGGEST = ["Kenalan dong", "Model apa yang kamu pakai?", "Ceritakan hal seru hari ini"];
const FOLLOW = ["Ceritakan lebih banyak", "Ganti topik", "Rangkum obrolan ini"];
const SD_PLUGINS = { code };
const SD_THEME: [string, string] = ["github-dark", "github-dark"];
const SD_CONTROLS: ControlsConfig = { code: { copy: true, download: false } };
const SD_TRANSLATIONS = {
  close: "Tutup", copied: "Tersalin", copyCode: "Salin kode", copyLink: "Salin tautan", copyTable: "Salin tabel",
  downloadFile: "Unduh file", downloadTable: "Unduh tabel", exitFullscreen: "Keluar layar penuh",
  openLink: "Buka tautan", openExternalLink: "Buka tautan eksternal", viewFullscreen: "Layar penuh",
  externalLinkWarning: "Tautan ini akan membuka situs eksternal.",
} satisfies Partial<StreamdownTranslations>;

interface Editing { id: string; index: number; text: string }

function MsgButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
      className="grid size-7 place-items-center rounded-md text-mu transition-colors hover:bg-el hover:text-tx disabled:pointer-events-none disabled:opacity-35">
      {children}
    </button>
  );
}

function MsgEditor({ text, dark, onChange, onCancel, onSave }: { text: string; dark?: boolean; onChange: (v: string) => void; onCancel: () => void; onSave: () => void }) {
  return (
    <div className={`w-full rounded-[14px] border p-2 ${dark ? "border-ln2 bg-el" : "border-transparent bg-[#f4f4f4] text-[#111]"}`}>
      <textarea autoFocus value={text} rows={Math.min(8, text.split("\n").length + 1)} onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSave(); }
          if (e.key === "Escape") onCancel();
        }}
        className={`w-full resize-none bg-transparent px-1.5 py-1 outline-none ${dark ? "font-mono text-[13px]" : ""}`} />
      <div className="mt-1 flex justify-end gap-1.5">
        <button type="button" onClick={onCancel} className={`rounded-lg px-2.5 py-1 text-xs ${dark ? "text-mu hover:bg-[#262626] hover:text-tx" : "text-[#555] hover:bg-black/10"}`}>Batal</button>
        <button type="button" onClick={onSave} disabled={!text.trim()} className={`rounded-lg px-2.5 py-1 text-xs disabled:opacity-40 ${dark ? "bg-tx text-bg hover:bg-white" : "bg-[#111] text-white hover:bg-black"}`}>Simpan</button>
      </div>
    </div>
  );
}

export default function ChatApp() {
  const [mounted, setMounted] = useState(false);
  const s = useApp();
  const [vs, setVs] = useState<VState>("idle");
  const [busy, setBusy] = useState(false), [input, setInput] = useState(""), [q, setQ] = useState("");
  const [side, setSide] = useState(true), [openS, setOpenS] = useState(false), [askDel, setAskDel] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const player = useRef<TTSPlayer | null>(null), rec = useRef<{ stop: () => void } | null>(null), micGen = useRef(0);
  const streaming = useRef(false), thread = useRef<HTMLDivElement>(null);
  const prevMsgs = useRef<{ id: string | null; count: number }>({ id: null, count: 0 });

  useEffect(() => {
    setMounted(true);
    setSide(innerWidth >= 768);
    const a = useApp.getState();
    if (!a.convos.length) a.newConvo(); else if (!a.currentId) a.select(a.convos[0].id);

    if (!a.apiKey.trim()) return;
    a.setCfg({ apiKey: "" });
    toast.error("API key lama dihapus dari browser. Masukkan key baru di Pengaturan.");
    setOpenS(true);
  }, []);
  useEffect(() => { thread.current?.scrollTo({ top: thread.current.scrollHeight }); }, [s.convos, vs]);
  useEffect(() => { setEditing(null); }, [s.currentId]);

  const getPlayer = () => (player.current ??= new TTSPlayer(
    () => useApp.getState(),
    (st) => setVs(st === "speaking" ? "speaking" : streaming.current ? "thinking" : "idle"),
  ));

  const cur = s.convos.find((c) => c.id === s.currentId);

  useEffect(() => {
    const root = thread.current;
    if (!root || !cur) return;
    const count = cur.msgs.length;
    const before = prevMsgs.current;
    prevMsgs.current = { id: cur.id, count };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-msg]"));
    if (before.id !== cur.id) {
      const empty = root.querySelector<HTMLElement>("[data-empty]");
      if (empty) gsap.fromTo(empty, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out", clearProps: "opacity,transform" });
      if (rows.length) gsap.fromTo(rows, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out", stagger: 0.035, clearProps: "opacity,transform" });
    } else if (count > before.count && rows.length) {
      gsap.fromTo(rows[rows.length - 1], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.28, ease: "power2.out", clearProps: "opacity,transform" });
    }
  }, [cur?.id, cur?.msgs.length]);

  if (!mounted || !cur) return <div className="h-dvh bg-bg" />;

  const tokens = Math.round(cur.msgs.reduce((n, m) => n + m.content.length, 0) / 4);
  const lastA = [...cur.msgs].reverse().find((m) => m.role === "assistant");

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    const st = useApp.getState();
    if (!st.model) { setOpenS(true); toast.error("Pilih provider dan model dulu."); return; }
    const id = st.currentId!;
    const history = [...(st.convos.find((c) => c.id === id)?.msgs ?? []), { role: "user", content: text } as Msg]
      .map((m) => ({ role: m.role, content: m.content }));
    setInput(""); setBusy(true); streaming.current = true; setVs("thinking"); getPlayer().stop();
    st.push(id, { role: "user", content: text, time: hm() });
    st.push(id, { role: "assistant", content: "", time: hm() });

    const t0 = Date.now(); let full = "", first = true;
    const prose = new ProseStream();
    try {
      const p = preset(st.provider);
      const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: { kind: p.kind, baseURL: st.baseURL, modelId: st.model }, system: PERSONA, messages: history }) });
      if (!res.ok || !res.body) throw new Error((await res.text()) || "Gagal memanggil model.");
      const reader = res.body.getReader(), dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        full += chunk;
        const patch: Partial<Msg> = { content: full };
        if (first) { patch.thought = ((Date.now() - t0) / 1000).toFixed(1); first = false; if (!st.voiceOn) setVs("idle"); }
        useApp.getState().patchLast(id, patch);
        if (st.voiceOn) prose.push(chunk).forEach((x) => getPlayer().say(x));
      }
      if (!full.trim()) throw new Error("Model tidak mengirim balasan. Cek API key dan nama model.");
      if (st.voiceOn) prose.flush().forEach((x) => getPlayer().say(x));
    } catch (e: any) {
      useApp.getState().patchLast(id, { content: full || `⚠ ${e.message}`, thought: undefined });
      setVs("idle");
    } finally {
      streaming.current = false; setBusy(false);
      if (!st.voiceOn) setVs("idle");
    }
  }

  async function toggleMic() {
    if (vs === "listening") {
      if (rec.current) { rec.current.stop(); rec.current = null; setVs("thinking"); }
      else { micGen.current++; setVs("idle"); }
      return;
    }
    if (busy) return;
    getPlayer().stop();
    const gen = ++micGen.current;
    let sent = false;
    setVs("listening");
    const r = await startMic({
      cfg: () => useApp.getState(),
      onText: (t) => { sent = true; if (gen === micGen.current) send(t); },
      onEnd: () => {
        if (gen !== micGen.current) return;
        rec.current = null;
        setVs((v) => (sent ? v : "idle"));
      },
      onError: (e) => {
        if (gen !== micGen.current) return;
        const msg = micMessage(e);
        if (msg) toast.error(msg);
      },
      onRecord: () => {
        if (gen === micGen.current) toast("Bicara, lalu tekan mikrofon lagi untuk mengirim.", { duration: 5000 });
      },
    });
    if (gen !== micGen.current) { r?.stop(); return; }
    if (!r) { setVs("idle"); return; }
    rec.current = r;
  }

  async function copyMsg(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Pesan disalin");
    } catch {
      toast.error("Gagal menyalin pesan");
    }
  }

  function replay(text: string) {
    const prose = new ProseStream();
    const chunks = [...prose.push(text), ...prose.flush()];
    if (!chunks.length) return;
    getPlayer().stop();
    chunks.forEach((x) => getPlayer().say(x));
  }

  function saveEdit() {
    if (!editing) return;
    const text = editing.text.trim();
    if (!text) return;
    useApp.getState().edit(editing.id, editing.index, text);
    setEditing(null);
    toast.success("Pesan diperbarui");
  }

  const list = s.convos.filter((c) => c.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-20 flex w-[271px] shrink-0 flex-col border-r border-ln bg-sb transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform md:static ${side ? "translate-x-0" : "-translate-x-full md:-ml-[271px]"}`}>
        <div className="flex items-center gap-2.5 px-4 pb-3.5 pt-[18px]">
          <Avatar src={REZE} size={22} />
          <b className="flex-1 text-sm font-medium">Talk With Reze</b>
          <button onClick={() => setSide(false)} aria-label="Tutup sidebar" className="grid size-8 place-items-center rounded-lg text-mu hover:bg-el hover:text-tx"><PanelLeft size={18} /></button>
        </div>
        <div className="flex flex-col gap-2.5 px-3">
          <button onClick={() => !busy && s.newConvo()} className="flex h-10 items-center gap-2 rounded-xl border border-ln2 px-3.5 font-medium hover:bg-el"><Plus size={16} />Obrolan baru</button>
          <label className="flex h-[38px] items-center gap-2 rounded-[10px] bg-el px-3 text-mu"><Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari obrolan" className="min-w-0 flex-1 bg-transparent text-tx outline-none" /></label>
        </div>
        <div className="flex-1 overflow-auto px-3 py-3.5">
          <div className="mb-1.5 px-2 text-[11px] uppercase text-mu">Hari ini</div>
          <div className="flex flex-col gap-1">
            {list.map((c) => (
              <div key={c.id} className={`group flex items-center rounded-lg ${c.id === cur.id ? "bg-act" : "hover:bg-act"}`}>
                <button onClick={() => { s.select(c.id); if (innerWidth < 768) setSide(false); }}
                  className="min-w-0 flex-1 truncate rounded-lg p-2 text-left">{c.title}</button>
                <button onClick={(e) => { e.stopPropagation(); setAskDel(c.id); }}
                  aria-label={`Hapus ${c.title}`}
                  className="mr-1 grid size-7 shrink-0 place-items-center rounded-md text-mu hover:bg-el hover:text-tx md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2.5 border-t border-ln px-4 py-3.5">
          <Avatar src={DENJI} size={32} />
          <div className="flex-1 leading-tight"><b className="font-medium">Wibu</b><small className="block text-xs text-mu">Mode lokal</small></div>
          <button onClick={() => setOpenS(true)} aria-label="Pengaturan" className="grid size-8 place-items-center rounded-lg text-mu hover:bg-el hover:text-tx"><SlidersHorizontal size={18} /></button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-ln px-4">
          {!side && <button onClick={() => setSide(true)} aria-label="Buka sidebar" className="-ml-2 grid size-8 place-items-center rounded-lg text-mu hover:bg-el hover:text-tx"><PanelLeft size={18} /></button>}
          <span className="flex-1 truncate font-medium">{cur.title}</span>
          <span className="flex items-center gap-2 text-xs text-mu">
            <i className="size-3.5 rounded-full" style={{ background: `conic-gradient(var(--color-tx) ${Math.min(100, tokens / 2000)}%, var(--color-ln2) 0)`, mask: "radial-gradient(circle,#0000 4px,#000 5px)" }} />
            {tokens >= 1000 ? (tokens / 1000).toFixed(1) + "k" : tokens}/200k
          </span>
        </div>

        <div ref={thread} className="flex-1 overflow-auto">
          <div className="mx-auto flex min-h-full flex-col gap-7 px-4 py-6" style={{ maxWidth: layout.thread }}>
            {cur.msgs.length === 0 ? (
              <div data-empty className="m-auto flex flex-col items-center gap-3.5 py-10 text-center">
                <Avatar src={REZE} size={64} live state={vs} />
                <div>Ngobrol, tanya, atau minta ide apa saja.</div>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGEST.map((t) => <button key={t} onClick={() => send(t)} className="rounded-full border border-ln2 px-3.5 py-1.5 hover:bg-el">{t}</button>)}
                </div>
              </div>
            ) : cur.msgs.map((m, i) => {
              const edit = editing && editing.id === cur.id && editing.index === i ? editing : null;
              if (m.role === "user") return (
                <div key={i} data-msg className="flex flex-col items-end gap-1.5 self-end" style={{ maxWidth: layout.bubble }}>
                  {edit ? (
                    <MsgEditor text={edit.text} onChange={(text) => setEditing((e) => e && { ...e, text })} onCancel={() => setEditing(null)} onSave={saveEdit} />
                  ) : (
                    <div className="whitespace-pre-wrap break-words rounded-[14px] bg-[#f4f4f4] px-3.5 py-2.5 text-[#111]">{m.content}</div>
                  )}
                  {!edit && (
                    <div className="flex items-center gap-0.5">
                      <span className="mr-1 text-xs text-mu">{m.time}</span>
                      <MsgButton label="Salin pesan" onClick={() => copyMsg(m.content)}><Copy size={13} /></MsgButton>
                      <MsgButton label="Edit pesan" onClick={() => setEditing({ id: cur.id, index: i, text: m.content })}><Pencil size={13} /></MsgButton>
                    </div>
                  )}
                </div>
              );
              const speakable = segments(m.content).some((g) => !g.code && g.text.trim());
              const streamingThis = busy && m === lastA;
              return (
                <div key={i} data-msg className="flex items-start gap-3">
                  <Avatar src={REZE} size={28} live={m === lastA} state={vs} />
                  <div className="flex min-w-0 flex-1 flex-col gap-3" style={{ "--chat-code-width": layout.code } as CSSProperties}>
                    <details className="group text-mu" style={{ maxWidth: layout.thought }}>
                      <summary className="flex cursor-pointer list-none items-center gap-1.5 hover:text-tx">
                        <ChevronRight size={14} className="transition-transform group-open:rotate-90" />
                        {m.thought ? `Berpikir selama ${m.thought}s` : "Berpikir…"}
                      </summary>
                      <p className="pl-5 pt-1 text-[13px]">Menyesuaikan nada dengan karakter Reze dan memilih jawaban yang singkat.</p>
                    </details>
                    {s.voiceOn && speakable && (
                      <div className="flex items-center gap-2.5 rounded-[10px] border border-ln2 px-3.5 py-2 text-xs text-mu" style={{ maxWidth: layout.tts }}>
                        <CircleCheck size={16} className="text-emerald-500" />
                        <code className="flex-1 font-mono font-medium text-tx">tts.speak</code>
                      </div>
                    )}
                    <div className="flex min-h-[22px] flex-col gap-3" style={{ maxWidth: layout.text }}>
                      {edit ? (
                        <MsgEditor dark text={edit.text} onChange={(text) => setEditing((e) => e && { ...e, text })} onCancel={() => setEditing(null)} onSave={saveEdit} />
                      ) : (
                        <Streamdown mode={streamingThis ? "streaming" : "static"} plugins={SD_PLUGINS} shikiTheme={SD_THEME} controls={SD_CONTROLS} translations={SD_TRANSLATIONS}>
                          {m.content}
                        </Streamdown>
                      )}
                    </div>
                    {m.content && !edit && (
                      <div className="flex items-center gap-0.5">
                        <span className="mr-1 text-xs text-mu">{m.time}</span>
                        <MsgButton label="Salin pesan" onClick={() => copyMsg(m.content)}><Copy size={13} /></MsgButton>
                        <MsgButton label="Ulangi suara" disabled={!speakable || streamingThis} onClick={() => replay(m.content)}><Volume2 size={13} /></MsgButton>
                        <MsgButton label="Edit pesan" disabled={streamingThis} onClick={() => setEditing({ id: cur.id, index: i, text: m.content })}><Pencil size={13} /></MsgButton>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {!busy && lastA?.content && cur.msgs[cur.msgs.length - 1] === lastA && (
              <div className="flex flex-col gap-3 md:pl-10" style={{ maxWidth: layout.followUp }}>
                <div className="text-[11px] uppercase text-mu">Tindak lanjut</div>
                <div className="flex flex-wrap gap-2">
                  {FOLLOW.map((t) => <button key={t} onClick={() => send(t)} className="rounded-full border border-ln2 px-3.5 py-1.5 hover:bg-el">{t}</button>)}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-ln px-4 pb-2 pt-3">
          <div className="mx-auto rounded-[20px] border border-ln2 bg-bg py-3 pl-4 pr-3 focus-within:border-mu" style={{ maxWidth: layout.composer }}>
            <textarea value={input} rows={1} placeholder={PLACEHOLDER[vs]}
              onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px"; }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              className="min-h-6 w-full resize-none bg-transparent py-0.5 outline-none" />
            <div className="-ml-2 mt-2 flex items-center gap-1">
              <button onClick={() => setOpenS(true)} className="flex max-w-[50%] items-center gap-1.5 rounded-lg px-2.5 py-1 text-mu hover:bg-el hover:text-tx">
                <span className="truncate">{s.model || "Pilih model"}</span><ChevronDown size={16} /></button>
              <span className="flex-1" />
              <button onClick={() => { if (s.voiceOn) getPlayer().stop(); s.setCfg({ voiceOn: !s.voiceOn }); }} aria-label="Suara balasan" className="grid size-8 place-items-center rounded-lg text-mu hover:bg-el hover:text-tx">{s.voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
              <button onClick={toggleMic} aria-label="Bicara" className={`grid size-8 place-items-center rounded-lg ${vs === "listening" ? "bg-tx text-bg" : "text-mu hover:bg-el hover:text-tx"}`}><Mic size={18} /></button>
              <button onClick={() => send(input)} aria-label="Kirim" className={`ml-1 grid size-9 place-items-center rounded-full ${input.trim() ? "bg-tx text-bg" : "bg-[#262626] text-mu"}`}><ArrowUp size={18} /></button>
            </div>
          </div>
          <div className="pt-2 text-center text-xs text-mu">Jawaban AI bisa keliru. Periksa informasi penting.</div>
        </div>
      </main>

      <SettingsDialog open={openS} onClose={() => setOpenS(false)} />
      <ConfirmDialog
        open={!!askDel}
        title="Hapus obrolan?"
        message={askDel ? `"${s.convos.find((c) => c.id === askDel)?.title ?? "Obrolan"}" akan dihapus permanen.` : ""}
        onCancel={() => setAskDel(null)}
        onConfirm={() => { if (askDel) { s.del(askDel); setAskDel(null); toast.success("Obrolan dihapus"); } }}
      />
      <Toaster
        position="bottom-center"
        containerStyle={{ bottom: 108 }}
        toastOptions={{
          duration: 2600,
          style: {
            background: "var(--color-el)", color: "var(--color-tx)", border: "1px solid var(--color-ln2)",
            borderRadius: "10px", fontSize: "13px", padding: "8px 12px", boxShadow: "0 8px 24px #0007",
          },
          success: { iconTheme: { primary: "#34d399", secondary: "var(--color-el)" } },
          error: { iconTheme: { primary: "#f87171", secondary: "var(--color-el)" } },
        }}
      />
    </div>
  );
}
