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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* Decorative background: slow-drifting light and a fading engineering grid. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgb(61_139_255/0.07)_1px,transparent_1px),linear-gradient(90deg,rgb(61_139_255/0.07)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        <div className="absolute left-[12%] top-[8%] h-[420px] w-[420px] rounded-full bg-[#3d8bff]/20 blur-[110px] [animation:drift-a_18s_var(--ease-in-out)_infinite]" />
        <div className="absolute bottom-[4%] right-[10%] h-[380px] w-[380px] rounded-full bg-[#38bdf8]/12 blur-[110px] [animation:drift-b_22s_var(--ease-in-out)_infinite]" />
      </div>
      <div className="relative w-full max-w-[380px]">
        <Logo className="animate-fade-in mb-8 justify-center" />
        <div className="animate-rise rounded-xl border border-white/[0.08] bg-surface/75 p-6 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8),0_0_0_1px_rgb(61_139_255/0.06)] backdrop-blur-xl [animation-delay:80ms]">
          <h1 className="text-gradient text-xl font-semibold tracking-tight">{mode === "login" ? "Sign in to your workspace" : "Create your workspace"}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {mode === "login" ? "Pick up where your team left off." : "Preserve the knowledge behind your engineering projects."}
          </p>
          <form onSubmit={onSubmit} className="stagger mt-5 space-y-4">
            {mode === "signup" && <Field label="Full name" required><Input name="name" autoComplete="name" placeholder="Alex Rivera" /></Field>}
            <Field label="Email" required><Input name="email" type="email" autoComplete="email" required placeholder="you@school.edu" /></Field>
            <Field label="Password" required hint={mode === "signup" ? "At least 8 characters." : undefined}>
              <Input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required />
            </Field>
            {error && <p role="alert" className="animate-pop rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}
            {info && <p role="status" className="animate-pop rounded-md bg-success-soft px-3 py-2 text-xs text-success">{info}</p>}
            <Button type="submit" variant="accent" size="lg" className="w-full" loading={busy}>{mode === "login" ? "Sign in" : "Create account"}</Button>
          </form>
        </div>
        <p className="animate-fade-in mt-4 text-center text-[13px] text-muted-foreground [animation-delay:300ms]">
          {mode === "login" ? <>New here? <Link href="/signup" className="font-medium text-accent hover:underline">Create an account</Link></>
            : <>Already have an account? <Link href="/login" className="font-medium text-accent hover:underline">Sign in</Link></>}
        </p>
      </div>
    </div>
  );
}
