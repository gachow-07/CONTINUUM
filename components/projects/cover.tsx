import { cn } from "@/lib/utils";

const fileUrl = (path: string) => `/api/storage?path=${encodeURIComponent(path)}`;

// Deterministic blueprint-style thumbnail used when a project has no cover image.
export function ProjectCover({ path, name, className }: { path: string | null; name: string; className?: string }) {
  if (path) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={fileUrl(path)} alt={`${name} cover`} className={cn("h-full w-full object-cover", className)} loading="lazy" />;
  }
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)} style={{ background: `linear-gradient(135deg, hsl(${215 + (h % 30)} 45% 16%), hsl(${220 + (h % 20)} 40% 24%))` }}>
      <svg className="absolute inset-0 h-full w-full opacity-30" aria-hidden><defs><pattern id={`g${h}`} width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="#8be9f7" strokeOpacity=".35" /></pattern></defs><rect width="100%" height="100%" fill={`url(#g${h})`} /></svg>
      <span className="absolute bottom-2 left-3 text-2xl font-semibold tracking-tight text-white/80">{name.slice(0, 2).toUpperCase()}</span>
    </div>
  );
}
