"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpen, ClipboardCheck, FileText, FolderKanban, LayoutDashboard, LogOut, Menu, Scale, Settings, Sparkles, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, initials } from "@/lib/utils";
import { Logo } from "./logo";

export function AppShell({ user, children }: { user: { name: string; email: string; role: string | null; workspace: string }; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const projectId = pathname.match(/^\/projects\/([0-9a-f-]{36})/)?.[1];

  const nav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: (p: string) => p === "/dashboard" },
    { href: "/projects", label: "My Projects", icon: FolderKanban, match: (p: string) => p.startsWith("/projects") && !p.endsWith("/assistant") },
    { href: "/research", label: "Research Library", icon: BookOpen, match: (p: string) => p.startsWith("/research") },
    { href: "/decisions", label: "Design Decisions", icon: Scale, match: (p: string) => p.startsWith("/decisions") },
    { href: "/reviews", label: "Reviews", icon: ClipboardCheck, match: (p: string) => p.startsWith("/reviews") },
    { href: projectId ? `/projects/${projectId}/assistant` : "/assistant", label: "AI Assistant", icon: Sparkles, match: (p: string) => p.startsWith("/assistant") || p.endsWith("/assistant") },
    { href: "/documentation", label: "Documentation", icon: FileText, match: (p: string) => p.startsWith("/documentation") },
  ];
  const bottom = [
    { href: "/team", label: "Team management", icon: Users },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const Item = ({ href, label, icon: Icon, active }: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; active: boolean }) => (
    <Link href={href} onClick={() => setOpen(false)}
      className={cn("group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
        active ? "bg-sidebar-hover text-white" : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-white")}>
      <Icon className={cn("h-4 w-4 transition-colors", active ? "text-[#7aa2ff]" : "text-[#7b8597] group-hover:text-white")} />
      {label}
    </Link>
  );

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-white">
      <div className="flex h-14 items-center justify-between px-4"><Logo /><button className="rounded p-1 text-sidebar-foreground lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button></div>
      <div className="px-4 pb-2 pt-1 text-[11px] font-medium uppercase tracking-wider text-[#6b7587]">{user.workspace}</div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5" aria-label="Main">
        {nav.map((n) => <Item key={n.label} href={n.href} label={n.label} icon={n.icon} active={n.match(pathname)} />)}
      </nav>
      <div className="space-y-0.5 border-t border-sidebar-border px-2.5 pb-2 pt-3">
        {bottom.map((n) => <Item key={n.label} href={n.href} label={n.label} icon={n.icon} active={pathname.startsWith(n.href)} />)}
        <div className="mt-2 flex items-center gap-2.5 rounded-md px-2.5 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#27304a] text-[11px] font-semibold text-[#9db8ff]">{initials(user.name)}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium">{user.name}</p><p className="truncate text-[11px] text-[#7b8597]">{user.role || user.email}</p></div>
          <button onClick={signOut} title="Sign out" aria-label="Sign out" className="rounded p-1.5 text-[#7b8597] transition-colors hover:bg-sidebar-hover hover:text-white"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] lg:block">{sidebar}</aside>
      {open && <div className="fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} /><div className="absolute inset-y-0 left-0 w-[260px]">{sidebar}</div></div>}
      <div className="lg:pl-[240px]">
        <header className="sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded p-1.5 hover:bg-muted"><Menu className="h-5 w-5" /></button>
          <Logo />
        </header>
        <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
