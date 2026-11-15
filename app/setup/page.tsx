import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Logo } from "@/components/shell/logo";
import { anthropicConfigured, supabaseConfigured } from "@/lib/env";

export const metadata = { title: "Setup" };
export const dynamic = "force-dynamic";

function Row({ ok, title, children }: { ok: boolean; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-surface p-4">
      {ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />}
      <div className="text-[13px]"><p className="font-semibold">{title}</p><div className="mt-1 text-muted-foreground">{children}</div></div>
    </div>
  );
}

export default function SetupPage() {
  const sb = supabaseConfigured();
  const ai = anthropicConfigured();
  const code = "rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground";
  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <Logo className="mb-8" />
      <h1 className="text-xl font-semibold tracking-tight">Finish setting up CONTINUUM</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">The app needs a Supabase project (database, auth, file storage) and an Anthropic API key for the AI features. Nothing here is mocked — until these are configured, the related features stay off.</p>
      <div className="mt-6 space-y-3">
        <Row ok={sb} title="Supabase — database, authentication, storage">
          {sb ? "Connected." : (<ol className="list-decimal space-y-1 pl-4">
            <li>Create a project at supabase.com.</li>
            <li>Open the SQL editor and run <code className={code}>supabase/migrations/0001_schema.sql</code>, then <code className={code}>0002_model.sql</code>.</li>
            <li>For quick demos, turn off “Confirm email” under Authentication → Providers → Email.</li>
            <li>Copy <code className={code}>.env.example</code> to <code className={code}>.env.local</code> and set <code className={code}>NEXT_PUBLIC_SUPABASE_URL</code> and <code className={code}>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then restart.</li>
          </ol>)}
        </Row>
        <Row ok={ai} title="Anthropic Claude — assistant, decision help, documentation generation">
          {ai ? "API key detected (server-side only)." : <>Set <code className={code}>ANTHROPIC_API_KEY</code> in <code className={code}>.env.local</code> (and as a Vercel environment variable). Optionally set <code className={code}>ANTHROPIC_MODEL</code>. Claude Pro/Max subscriptions do not provide API credits. The rest of the app works without it; AI buttons will say so.</>}
        </Row>
      </div>
      {sb && <Link href="/login" className="mt-6 inline-flex h-9 items-center rounded-md bg-primary px-4 text-[13px] font-medium text-white">Continue to sign in</Link>}
    </div>
  );
}
