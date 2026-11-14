export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* The team’s original symbol includes transparent padding. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/continuum-symbol-white.png" alt="" width={36} height={36} className="h-9 w-9 shrink-0 object-contain" />
      <span className="text-[15px] font-semibold tracking-tight">CONTINUUM</span>
    </div>
  );
}
