"use client";
import { useEffect, useRef, useState } from "react";

/** Animates a number from what is currently shown (0 on first load) to `value`. */
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    const from = current.current;
    if (from === value) return;
    const ms = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : duration;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = ms ? Math.min(1, (t - t0) / ms) : 1;
      const v = Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3)));
      current.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className="tabular-nums">{shown}</span>;
}
