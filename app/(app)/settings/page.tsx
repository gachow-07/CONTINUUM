import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { ProfileForm } from "@/components/views/profile-form";
import { anthropicConfigured } from "@/lib/env";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Settings" };
export default async function Page() {
  const { profile, user } = await requireSession();
  const ai = anthropicConfigured();
  return (
    <div className="animate-fade-in max-w-2xl">
      <PageHeader title="Settings" />
      <div className="space-y-6">
        <Card><CardHeader title="Profile" /><ProfileForm name={profile.full_name ?? ""} role={profile.role_title ?? ""} email={user.email ?? ""} /></Card>
        <Card>
          <CardHeader title="Integrations" description="Configured through environment variables; secrets never reach the browser." />
          <ul className="divide-y divide-border text-[13px]">
            <li className="flex items-center justify-between px-5 py-3"><span>Supabase (database, auth, storage)</span><span className="inline-flex items-center gap-1.5 text-success"><CheckCircle2 className="h-4 w-4" />Connected</span></li>
            <li className="flex items-center justify-between px-5 py-3"><span>Anthropic Claude (assistant, decision help, documents)</span>{ai ? <span className="inline-flex items-center gap-1.5 text-success"><CheckCircle2 className="h-4 w-4" />Key detected</span> : <span className="inline-flex items-center gap-1.5 text-warning"><XCircle className="h-4 w-4" />Not configured — set ANTHROPIC_API_KEY</span>}</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
