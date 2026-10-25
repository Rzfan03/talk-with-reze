"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmDialog({ open, title, message, confirmLabel = "Hapus", onConfirm, onCancel }: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.killTweensOf(el);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (open) {
      if (!el.open) {
        gsap.set(el, reduce ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, y: 10, scale: 0.98 });
        el.showModal();
      }
      gsap.to(el, { opacity: 1, y: 0, scale: 1, duration: reduce ? 0 : 0.22, ease: "power2.out", overwrite: true });
    } else if (el.open) {
      if (reduce) el.close();
      else gsap.to(el, { opacity: 0, y: 6, scale: 0.98, duration: 0.15, ease: "power2.in", overwrite: true, onComplete: () => el.close() });
    }
  }, [open]);

  return (
    <dialog ref={ref} onClose={onCancel} onCancel={(e) => { e.preventDefault(); onCancel(); }} role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-desc"
      className="m-auto w-[min(420px,92vw)] rounded-[14px] border border-ln2 bg-sb p-0 text-tx">
      <div className="flex items-start gap-3 p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-red-500/10 text-red-400"><AlertTriangle size={18} /></span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 id="confirm-title" className="font-medium">{title}</h2>
          {message && <p id="confirm-desc" className="mt-1 text-[13px] leading-relaxed text-mu">{message}</p>}
        </div>
        <button onClick={onCancel} aria-label="Tutup" className="grid size-8 shrink-0 place-items-center rounded-lg text-mu hover:bg-el hover:text-tx"><X size={18} /></button>
      </div>
      <div className="flex justify-end gap-2 border-t border-ln px-4 py-3">
        <button onClick={onCancel} className="rounded-[10px] bg-el px-3.5 py-2 font-medium hover:bg-ln">Batal</button>
        <button onClick={onConfirm} className="rounded-[10px] bg-red-500 px-3.5 py-2 font-medium text-white hover:bg-red-400">{confirmLabel}</button>
      </div>
    </dialog>
  );
}
