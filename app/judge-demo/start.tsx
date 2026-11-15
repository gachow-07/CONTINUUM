"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shell/logo";

type DemoResult = { project_id: string; file_id: string; storage_path: string };
export function JudgeEntry() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function start() {
    setBusy(true); setError("");
    try {
      if (process.env.NEXT_PUBLIC_JUDGE_DEMO_ENABLED !== "true") throw new Error("The judge demo is not available yet.");
      const supabase = createClient();
      const { data: current, error: currentError } = await supabase.auth.getUser();
      if (currentError && currentError.name !== "AuthSessionMissingError") throw currentError;
      if (current.user && !current.user.is_anonymous) throw new Error("You are already signed in. Open the judge demo in a private browser window to keep your account separate.");
      if (!current.user) {
        const { error: authError } = await supabase.auth.signInAnonymously({ options: { data: { full_name: "Judge" } } });
        if (authError) throw authError;
      }
      const { data, error: cloneError } = await supabase.rpc("create_judge_demo");
      if (cloneError) throw cloneError;
      const demo = data as DemoResult | null;
      if (!demo?.project_id || !demo.storage_path) throw new Error("Could not prepare the demo project.");
      const model = await fetch("/judge-demo/aero.glb");
      if (!model.ok) throw new Error("The demo model could not be loaded.");
      const { error: uploadError } = await supabase.storage.from("project-files").upload(demo.storage_path, await model.blob(), { contentType: "model/gltf-binary", upsert: true });
      if (uploadError) throw uploadError;
      router.replace(`/projects/${demo.project_id}`); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not open the judge demo. Please try again."); setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-background px-4"><div className="w-full max-w-[400px]"><Logo className="mb-8 justify-center" /><div className="rounded-xl border border-border bg-surface p-6 shadow-card"><h1 className="text-lg font-semibold">Explore the judge demo</h1><p className="mt-2 text-sm text-muted-foreground">Open your own editable copy of the Formula Aero project. Changes remain in this browser when you refresh and do not affect other judges or the team’s project.</p><p className="mt-2 text-xs text-muted-foreground">Demo workspaces are temporary. Anonymous mode includes 3 AI uses. Project research and design explanations include illustrative examples.</p>{error && <p role="alert" className="mt-4 rounded-md bg-danger-soft p-3 text-xs text-danger">{error}</p>}<Button type="button" variant="accent" size="lg" className="mt-5 w-full" loading={busy} onClick={() => void start()}>Open judge demo</Button><Link href="/login" className="mt-4 block text-center text-sm text-accent hover:underline">Back to sign in</Link></div></div></main>;
}
