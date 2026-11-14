import { Box, Cog, Disc3, RectangleHorizontal, Waves } from "lucide-react";

/** Icon by component name keyword. Purely presentational; unknown names get a generic part icon. */
export function ComponentIcon({ name, className }: { name: string; className?: string }) {
  const n = name.toLowerCase();
  const I = n.includes("susp") ? Waves : n.includes("steer") ? Disc3 : n.includes("chassis") || n.includes("frame") ? RectangleHorizontal : n.includes("drive") || n.includes("motor") || n.includes("gear") ? Cog : Box;
  return <I className={className} aria-hidden />;
}
