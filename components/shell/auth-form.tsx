"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Logo } from "./logo";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setInfo("");
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")).trim();
    const password = String(f.get("password"));
    const name = String(f.get("name") ?? "").trim();
    if (mode === "signup" && !name) return setError("Please enter your name.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    setBusy(true);
    const supabase = createClient();
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setBusy(false); return setError(error.message); }
      router.replace(params.get("next") || "/dashboard");
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name, continuum_sample_pending: true }, emailRedirectTo: `${location.origin}/auth/callback` } });
      if (error) { setBusy(false); return setError(error.message); }
      if (!data.session) { setBusy(false); return setInfo("Account created. Check your email to confirm your address, then sign in."); }
      router.replace("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[380px] animate-fade-in">
        <Logo className="mb-8 justify-center" />
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h1 className="text-lg font-semibold tracking-tight">{mode === "login" ? "Sign in to your workspace" : "Create your workspace"}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {mode === "login" ? "Pick up where your team left off." : "Preserve the knowledge behind your engineering projects."}
          </p>
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            {mode === "signup" && <Field label="Full name" required><Input name="name" autoComplete="name" placeholder="Alex Rivera" /></Field>}
            <Field label="Email" required><Input name="email" type="email" autoComplete="email" required placeholder="you@school.edu" /></Field>
            <Field label="Password" required hint={mode === "signup" ? "At least 8 characters." : undefined}>
              <Input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required />
            </Field>
            {error && <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}
            {info && <p role="status" className="rounded-md bg-success-soft px-3 py-2 text-xs text-success">{info}</p>}
            <Button type="submit" variant="accent" size="lg" className="w-full" loading={busy}>{mode === "login" ? "Sign in" : "Create account"}</Button>
          </form>
        </div>
        {mode === "login" && process.env.NEXT_PUBLIC_JUDGE_DEMO_ENABLED === "true" && <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-center"><p className="text-sm font-medium">Here for the presentation?</p><p className="mt-1 text-xs text-muted-foreground">Explore an editable demo without creating an account.</p><Link href="/judge-demo" className="mt-3 inline-flex h-9 items-center justify-center rounded-md border border-border-strong px-4 text-sm font-medium hover:bg-muted">Open judge demo</Link></div>}
        <p className="mt-4 text-center text-[13px] text-muted-foreground">
          {mode === "login" ? <>New here? <Link href="/signup" className="font-medium text-accent hover:underline">Create an account</Link></>
            : <>Already have an account? <Link href="/login" className="font-medium text-accent hover:underline">Sign in</Link></>}
        </p>
      </div>
    </div>
  );
}
