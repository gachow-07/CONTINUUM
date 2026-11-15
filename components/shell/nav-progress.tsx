"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Thin bar at the top of the window that starts as soon as an internal link is clicked
 * and finishes when the new route renders, so every navigation gets instant feedback.
 */
export function NavProgress() {
  const route = `${usePathname()}?${useSearchParams().toString()}`;
  // The route the user was on when they clicked. Loading until the route changes.
  const [from, setFrom] = useState<string | null>(null);
  const routeRef = useRef(route);
  useEffect(() => { routeRef.current = route; }, [route]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setFrom(routeRef.current);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const done = from !== null && from !== route;
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setFrom(null), 450);
    return () => clearTimeout(t);
  }, [done]);

  if (from === null) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px]">
      <div
        className="h-full origin-left bg-gradient-to-r from-[#3d8bff] via-[#6aa8ff] to-[#9cc7ff] shadow-[0_0_10px_rgb(61_139_255/0.9)] [animation:grow-x_8s_cubic-bezier(0.1,0.8,0.2,1)_both]"
        style={done
          ? { transform: "scaleX(1)", opacity: 0, transition: "transform 200ms ease-out, opacity 300ms ease 150ms", animation: "none" }
          : { transform: "scaleX(0.85)" }}
      />
    </div>
  );
}
