"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Check, RefreshCw, X } from "lucide-react";
import { useApp, pickSettings, type Settings } from "@/lib/store";
import { PRESETS, preset } from "@/lib/providers";

const inp = "w-full rounded-[10px] border border-ln2 bg-bg px-3 py-2 outline-none focus:border-mu";
const lab = "mb-1 block text-xs text-mu";

export default function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pane = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState(0);
  const [d, setD] = useState<Settings>(() => pickSettings(useApp.getState()));
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [q, setQ] = useState(""), [st, setSt] = useState(""), [busy, setBusy] = useState(false);
  const up = (p: Partial<Settings>) => setD((x) => ({ ...x, ...p }));

  useEffect(() => {
    const el = ref.current; if (!el) return;
    gsap.killTweensOf(el);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (open) {
      setD(pickSettings(useApp.getState())); setModels([]); setSt(""); setQ("");
      if (!el.open) {
        gsap.set(el, reduce ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, y: 12, scale: 0.98 });
        el.showModal();
      }
      gsap.to(el, { opacity: 1, y: 0, scale: 1, duration: reduce ? 0 : 0.24, ease: "power2.out", overwrite: true });
    } else if (el.open) {
      if (reduce) el.close();
      else gsap.to(el, { opacity: 0, y: 8, scale: 0.98, duration: 0.16, ease: "power2.in", overwrite: true, onComplete: () => el.close() });
    }
  }, [open]);

  useEffect(() => {
    const el = pane.current; if (!el) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.killTweensOf(el);
    gsap.fromTo(el, reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 },
      { opacity: 1, y: 0, duration: reduce ? 0 : 0.18, ease: "power2.out", overwrite: true });
  }, [tab]);

  async function load() {
    const p = preset(d.provider);
    if (p.needKey && !d.apiKey.trim()) return setSt("Isi API key dulu.");
    setBusy(true); setSt("Memuat model…");
    try {
      const r = await fetch("/api/models", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: p.kind, baseURL: d.baseURL, apiKey: d.apiKey }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setModels(j.models); setSt(`${j.models.length} model ditemukan.`);
    } catch (e: any) { setSt(e.message); } finally { setBusy(false); }
  }

  const shown = models.filter((m) => m.id.toLowerCase().includes(q.toLowerCase()) || m.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <dialog ref={ref} onClose={onClose} onCancel={(e) => { e.preventDefault(); onClose(); }} className="m-auto w-[min(540px,94vw)] flex-col overflow-hidden rounded-[14px] border border-ln2 bg-sb p-0 text-tx open:flex max-h-[88vh]">
      <div className="flex items-center justify-between px-4 pb-2 pt-3.5 font-medium">
        Pengaturan
        <button onClick={onClose} aria-label="Tutup" className="grid size-8 place-items-center rounded-lg text-mu hover:bg-el hover:text-tx"><X size={18} /></button>
      </div>
      <div className="flex gap-0.5 border-b border-ln px-3">
        {["Model AI", "Suara"].map((t, i) => (
          <button key={t} onClick={() => setTab(i)} className={`-mb-px border-b-2 px-3 py-2 transition-colors duration-150 ${tab === i ? "border-tx text-tx" : "border-transparent text-mu"}`}>{t}</button>
        ))}
      </div>

      <div ref={pane} className="flex flex-col gap-3 overflow-auto p-4">
        {tab === 0 && (<>
          <div><label className={lab}>Provider</label>
            <select className={inp} value={d.provider} onChange={(e) => { up({ provider: e.target.value, baseURL: preset(e.target.value).baseURL, model: "" }); setModels([]); }}>
              {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div><label className={lab}>Base URL</label><input className={inp} value={d.baseURL} onChange={(e) => up({ baseURL: e.target.value })} spellCheck={false} /></div>
          <div><label className={lab}>API key</label><input className={inp} type="password" autoComplete="off" value={d.apiKey} onChange={(e) => up({ apiKey: e.target.value })} placeholder="Tempel API key di sini" /></div>
          <div className="flex items-center gap-3">
            <button onClick={load} disabled={busy} className="inline-flex items-center gap-2 rounded-[10px] bg-el px-3.5 py-2 font-medium disabled:opacity-60"><RefreshCw size={16} className={busy ? "animate-spin" : ""} />Muat model</button>
            <span className="text-xs text-mu">{st}</span>
          </div>
          {models.length > 0 && (<>
            <input className={inp} placeholder="Cari model" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="flex max-h-48 flex-col overflow-auto rounded-[10px] border border-ln2">
              {shown.map((m) => (
                <button key={m.id} onClick={() => up({ model: m.id })} className={`flex items-center justify-between gap-2 px-3 py-2 text-left font-mono text-[13px] hover:bg-el ${d.model === m.id ? "font-medium" : ""}`}>
                  <span className="truncate">{m.id}</span>{d.model === m.id && <Check size={16} />}
                </button>
              ))}
              {!shown.length && <div className="px-3 py-2 text-xs text-mu">Tidak ada model yang cocok.</div>}
            </div>
          </>)}
          {d.model && <div className="text-xs text-mu">Model terpilih: <span className="font-mono text-tx">{d.model}</span></div>}
        </>)}

        {tab === 1 && (<>
          <div><label className={lab}>Voice ID</label><input className={inp} value={d.voiceId} onChange={(e) => up({ voiceId: e.target.value })} placeholder="Kosongkan untuk memakai voice bawaan server" /></div>
          <div><label className={lab}>Model suara</label>
            <select className={inp} value={d.voiceModel} onChange={(e) => up({ voiceModel: e.target.value })}>
              <option>eleven_flash_v2_5</option><option>eleven_multilingual_v2</option>
            </select></div>
          <p className="text-xs text-mu">API key dan voice default dibaca dari server. Kosongkan Voice ID untuk memakai voice default tersebut.</p>
          <div className="rounded-[10px] border border-ln2 p-3 text-xs text-mu">Mikrofon memakai ElevenLabs untuk transkripsi suara.</div>
        </>)}

      </div>

      <div className="flex justify-end gap-2 border-t border-ln px-4 py-3">
        <button onClick={onClose} className="rounded-[10px] bg-el px-3.5 py-2 font-medium">Batal</button>
        <button onClick={() => { useApp.getState().setCfg(d); onClose(); }} className="rounded-[10px] bg-tx px-3.5 py-2 font-medium text-bg">Simpan</button>
      </div>
    </dialog>
  );
}
