"use client";
export function Greeting({ name }: { name: string }) {
  // Rendered on the client so it reflects the viewer's local time of day.
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return <span suppressHydrationWarning>{part}, {name}</span>;
}
