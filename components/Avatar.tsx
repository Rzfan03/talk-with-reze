"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { level } from "@/lib/voice";

export type VState = "idle" | "listening" | "thinking" | "speaking";

// Avatar
export function Avatar({ src, size = 28, state = "idle", live = false }: { src: string; size?: number; state?: VState; live?: boolean }) {
  const root = useRef<HTMLSpanElement>(null);
  const ring = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!live || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      if (state === "listening")
        gsap.fromTo(ring.current, { scale: 1, opacity: 0.6 }, { scale: 2, opacity: 0, duration: 1.4, repeat: -1, ease: "power1.out", overwrite: true });
      if (state === "thinking")
        gsap.to(root.current, { opacity: 0.5, scale: 0.93, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut", overwrite: true });
      if (state === "speaking") {
        gsap.fromTo(ring.current, { scale: 1, opacity: 0.5 }, { scale: 1.9, opacity: 0, duration: 1.1, repeat: -1, ease: "power1.out", overwrite: true });
        let v = 0;
        const tick = () => {
          v += (level.v - v) * 0.22;
          gsap.set(root.current, { scale: 1 + v * 0.25 });
        };
        gsap.ticker.add(tick);
        return () => gsap.ticker.remove(tick);
      }
    }, root);
    return () => ctx.revert();
  }, [state, live]);

  return (
    <span ref={root} className="relative inline-block shrink-0" style={{ width: size, height: size, willChange: "transform, opacity" }}>
      <span ref={ring} className="absolute inset-0 rounded-full border-[1.5px] border-cyan-300 opacity-0" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="size-full rounded-full border border-ln2 object-cover" />
    </span>
  );
}
