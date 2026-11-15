"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { BookOpen, ChevronDown, ClipboardCheck, FileText, Home, Inbox, LogOut, Menu, Scale, Settings, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, initials } from "@/lib/utils";
import { Logo } from "./logo";
import { SearchPalette } from "./search-palette";
import { NavProgress } from "./nav-progress";

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
    { href: "/inbox", label: "Inbox", icon: Inbox, on: pathname.startsWith("/inbox") },
    { href: pid ? `${base}/research` : "/research", label: "Research", icon: BookOpen, on: pathname.startsWith(`${base}/research`) || (!pid && pathname.startsWith("/research")) },
    { href: pid ? `${base}/decisions` : "/decisions", label: "Decisions", icon: Scale, on: pathname.startsWith(`${base}/decisions`) || (!pid && pathname.startsWith("/decisions")) },
    { href: pid ? `${base}/reviews` : "/reviews", label: "Reviews", icon: ClipboardCheck, on: pathname.startsWith(`${base}/reviews`) || (!pid && pathname.startsWith("/reviews")) },
    { href: pid ? `${base}/docs` : "/documentation", label: "Documentation", icon: FileText, on: pid ? ["/docs", "/handoff", "/files", "/assistant"].some((s) => pathname.startsWith(base + s)) : pathname.startsWith("/documentation") },
  ];

  const activeIndex = nav.findIndex((n) => n.on);

  async function signOut() { await createClient().auth.signOut(); router.replace("/login"); router.refresh(); }

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar bg-gradient-to-b from-[#0c111b] to-sidebar text-white">
      <div className="flex h-14 items-center justify-between px-4"><Link href="/projects" aria-label="CONTINUUM — My Projects" onClick={() => setOpen(false)} className="group rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><Logo /></Link><button className="rounded p-1 text-sidebar-foreground lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button></div>
      <nav className="relative flex-1 px-3 pt-3" aria-label="Main">
        {/* One highlight that slides between items instead of each item switching on and off. */}
        {activeIndex >= 0 && <span aria-hidden className="pointer-events-none absolute inset-x-3 top-3 h-9 rounded-md bg-gradient-to-r from-[#3d8bff] to-[#2f74e0] shadow-[0_6px_20px_-6px_rgb(61_139_255/0.7),inset_0_1px_0_rgb(255_255_255/0.15)] transition-transform duration-[420ms] ease-[var(--ease-spring)]" style={{ transform: `translateY(${activeIndex * 40}px)` }} />}
        <div className="relative space-y-1">
          {nav.map((n) => (
            <Link key={n.label} href={n.href} onClick={() => setOpen(false)} aria-current={n.on ? "page" : undefined}
              className={cn("group flex h-9 items-center gap-3 rounded-md px-3 text-[13.5px] font-medium transition-colors duration-200", n.on ? "text-white" : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-white")}>
              <n.icon className={cn("h-4 w-4 transition-transform duration-300 ease-[var(--ease-spring)]", !n.on && "group-hover:scale-110 group-hover:-rotate-6")} />{n.label}{n.label === "Inbox" && pendingInvites > 0 && <span aria-label={`${pendingInvites} pending invitations`} className="animate-pop ml-auto rounded-full bg-accent px-1.5 text-[11px] text-white shadow-[0_0_12px_rgb(61_139_255/0.7)]">{pendingInvites}</span>}
            </Link>
          ))}
        </div>
        {pid && <Link href="/projects" className="group mt-3 flex items-center gap-1 px-3 py-1.5 text-xs text-sidebar-foreground transition-colors hover:text-white"><span className="transition-transform duration-300 ease-[var(--ease-out)] group-hover:-translate-x-1">←</span> All projects</Link>}
      </nav>
      <div className="relative border-t border-sidebar-border p-3">
        {menu && (<>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
          <div className="animate-pop absolute inset-x-3 bottom-[calc(100%-4px)] z-50 origin-bottom rounded-lg border border-border-strong bg-surface/95 p-1 shadow-[var(--shadow-pop)] backdrop-blur-md" role="menu" onClick={() => setMenu(false)}>
            <Link role="menuitem" href="/team" className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-foreground transition-colors duration-150 hover:bg-muted"><Users className="h-4 w-4 text-muted-foreground" />Team management</Link>
            <Link role="menuitem" href="/settings" className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-foreground transition-colors duration-150 hover:bg-muted"><Settings className="h-4 w-4 text-muted-foreground" />Settings</Link>
            <button role="menuitem" onClick={signOut} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-foreground transition-colors duration-150 hover:bg-muted"><LogOut className="h-4 w-4 text-muted-foreground" />Sign out</button>
          </div></>)}
        <button type="button" onClick={() => setMenu((m) => !m)} aria-expanded={menu} className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors duration-200 hover:bg-sidebar-hover">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2a4170] to-[#18233a] text-[11px] font-semibold text-[#b9cdff] ring-1 ring-[#3d8bff]/30">{initials(user.name)}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{user.name}</span><span className="block truncate text-[11px] text-sidebar-foreground">{user.role || user.workspace}</span></span>
          <ChevronDown className={cn("h-4 w-4 text-sidebar-foreground transition-transform duration-300 ease-[var(--ease-spring)]", menu && "rotate-180")} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Suspense fallback={null}><NavProgress /></Suspense>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[216px] border-r border-sidebar-border lg:block">{sidebar}</aside>
      {open && <div className="fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] [animation:overlay-in_240ms_var(--ease-out)]" onClick={() => setOpen(false)} /><div className="absolute inset-y-0 left-0 w-[250px] shadow-[var(--shadow-pop)] [animation:slide-in-left_340ms_var(--ease-out)]">{sidebar}</div></div>}
      <div className="lg:pl-[216px]">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-background/70 px-4 backdrop-blur-xl backdrop-saturate-150 sm:px-8">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded p-1.5 transition-colors hover:bg-muted lg:hidden"><Menu className="h-5 w-5" /></button>
          <div className="flex flex-1 justify-center lg:justify-start"><SearchPalette /></div>
          <Link href="/team" className="btn-sheen flex h-8 items-center gap-1.5 rounded-md bg-gradient-to-b from-[#4f97ff] to-[#2f7cf2] px-3 text-[13px] font-medium text-white shadow-[0_1px_0_rgb(255_255_255/0.18)_inset,0_4px_14px_-4px_rgb(61_139_255/0.55)] transition-[transform,box-shadow] duration-200 hover:-translate-y-px hover:shadow-[0_1px_0_rgb(255_255_255/0.22)_inset,0_10px_26px_-6px_rgb(61_139_255/0.7)] active:scale-[0.97]"><Users className="h-3.5 w-3.5" />Share</Link>
        </header>
        <main className="mx-auto w-full max-w-[1320px] px-4 py-6 sm:px-8 sm:py-7">{children}</main>
      </div>
    </div>
  );
}
