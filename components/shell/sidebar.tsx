"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpen, ChevronDown, ClipboardCheck, FileText, Home, Inbox, LogOut, Menu, Scale, Settings, Sparkles, Users, X, ArrowRightLeft } from "lucide-react";
import { AskAiLink } from "@/components/ai/ask-ai-link";
import { createClient } from "@/lib/supabase/client";
import { cn, initials } from "@/lib/utils";
import { Logo } from "./logo";
import { SearchPalette } from "./search-palette";

export function AppShell({ user, pendingInvites, children }: { user: { name: string; email: string; role: string | null; workspace: string }; pendingInvites: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const pid = pathname.match(/^\/projects\/([0-9a-f-]{36})/)?.[1];
  const base = pid ? `/projects/${pid}` : "";
  const isHome = pid ? pathname === base || pathname.startsWith(`${base}/components`) || pathname.startsWith(`${base}/subsystems`) : pathname === "/dashboard" || pathname === "/projects";
  const nav = [
    { href: pid ? base : "/dashboard", label: "Home", icon: Home, on: isHome },
    { href: pid ? `${base}/assistant` : "/assistant", label: "Ask AI", icon: Sparkles, on: pathname.startsWith(pid ? `${base}/assistant` : "/assistant"), ai: true },
    { href: "/inbox", label: "Inbox", icon: Inbox, on: pathname.startsWith("/inbox") },
    { href: pid ? `${base}/research` : "/research", label: "Research", icon: BookOpen, on: pathname.startsWith(`${base}/research`) || (!pid && pathname.startsWith("/research")) },
    { href: pid ? `${base}/decisions` : "/decisions", label: "Decisions", icon: Scale, on: pathname.startsWith(`${base}/decisions`) || (!pid && pathname.startsWith("/decisions")) },
    { href: pid ? `${base}/reviews` : "/reviews", label: "Reviews", icon: ClipboardCheck, on: pathname.startsWith(`${base}/reviews`) || (!pid && pathname.startsWith("/reviews")) },
    ...(pid ? [{ href: `${base}/handoff`, label: "Handoff", icon: ArrowRightLeft, on: pathname.startsWith(`${base}/handoff`) }] : []),
    { href: pid ? `${base}/docs` : "/documentation", label: "Documentation", icon: FileText, on: pid ? ["/docs", "/files"].some((s) => pathname.startsWith(base + s)) : pathname.startsWith("/documentation") },
  ];

  async function signOut() { await createClient().auth.signOut(); router.replace("/login"); router.refresh(); }

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-white">
      <div className="flex h-14 items-center justify-between px-4"><Link href="/projects" aria-label="CONTINUUM — My Projects" onClick={() => setOpen(false)} className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><Logo /></Link><button className="rounded p-1 text-sidebar-foreground lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button></div>
      <nav className="flex-1 space-y-1 px-3 pt-3" aria-label="Main">
        {nav.map((n) => (
          <Link key={n.label} href={n.href} onClick={() => setOpen(false)} aria-current={n.on ? "page" : undefined}
            className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors", "ai" in n
              ? (n.on ? "ai-gradient ai-glow" : "ai-ring [--ai-fill:var(--sidebar)] hover:[--ai-fill:var(--sidebar-hover)]")
              : n.on ? "bg-accent text-[#031317]" : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-white")}>
            <n.icon className={cn("h-4 w-4", "ai" in n && !n.on && "text-[#a5b4fc]")} />{"ai" in n && !n.on ? <span className="ai-text">{n.label}</span> : n.label}{n.label === "Inbox" && pendingInvites > 0 && <span aria-label={`${pendingInvites} pending invitations`} className="ml-auto rounded-full bg-accent px-1.5 text-[11px] text-[#031317]">{pendingInvites}</span>}
          </Link>
        ))}
        {pid && <Link href="/projects" className="mt-3 block px-3 py-1.5 text-xs text-sidebar-foreground hover:text-white">← All projects</Link>}
      </nav>
      <div className="relative border-t border-sidebar-border p-3">
        {menu && (<>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
          <div className="absolute inset-x-3 bottom-[calc(100%-4px)] z-50 rounded-lg border border-border-strong bg-surface p-1 shadow-[var(--shadow-pop)]" role="menu" onClick={() => setMenu(false)}>
            <Link role="menuitem" href="/team" className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-foreground hover:bg-muted"><Users className="h-4 w-4 text-muted-foreground" />Team management</Link>
            <Link role="menuitem" href="/settings" className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-foreground hover:bg-muted"><Settings className="h-4 w-4 text-muted-foreground" />Settings</Link>
            <button role="menuitem" onClick={signOut} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-foreground hover:bg-muted"><LogOut className="h-4 w-4 text-muted-foreground" />Sign out</button>
          </div></>)}
        <button type="button" onClick={() => setMenu((m) => !m)} aria-expanded={menu} className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left hover:bg-sidebar-hover">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1d2a2f] text-[11px] font-semibold text-[#8be9f7]">{initials(user.name)}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{user.name}</span><span className="block truncate text-[11px] text-sidebar-foreground">{user.role || user.workspace}</span></span>
          <ChevronDown className="h-4 w-4 text-sidebar-foreground" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside data-shell="sidebar" className="fixed inset-y-0 left-0 z-30 hidden w-[216px] border-r border-sidebar-border transition-colors lg:block">{sidebar}</aside>
      {open && <div className="fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} /><div className="absolute inset-y-0 left-0 w-[250px]">{sidebar}</div></div>}
      <div className="lg:pl-[216px]">
        <header data-shell="header" className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-8">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded p-1.5 hover:bg-muted lg:hidden"><Menu className="h-5 w-5" /></button>
          <div className="flex flex-1 justify-center lg:justify-start"><SearchPalette /></div>
          {!pid && !pathname.startsWith("/assistant") && <AskAiLink href="/assistant" size="sm" />}
          <Link href="/team" className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-[13px] font-medium text-[#031317] hover:bg-accent/85"><Users className="h-3.5 w-3.5" />Share</Link>
        </header>
        <main className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-8 sm:py-7">{children}</main>
      </div>
    </div>
  );
}
