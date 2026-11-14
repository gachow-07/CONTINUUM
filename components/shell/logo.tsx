export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white shadow-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8.5 6h7M6 8.5v4a3 3 0 0 0 3 3h6.5" /></svg>
      </div>
      <span className="text-[15px] font-semibold tracking-tight">Project Memory</span>
    </div>
  );
}
