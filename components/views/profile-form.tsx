"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { act } from "@/lib/client";
import { updateProfile } from "@/app/actions/projects";

export function ProfileForm({ name, role, email }: { name: string; role: string; email: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <form className="space-y-4 p-5" onSubmit={async (e) => {
      e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true);
      const r = await act(updateProfile({ full_name: String(f.get("name")), role_title: String(f.get("role")) }), "Profile updated");
      setBusy(false); if (r.ok) router.refresh();
    }}>
      <Field label="Full name" required><Input name="name" defaultValue={name} /></Field>
      <Field label="Role / title" hint="Shown under your name, e.g. “Mechanical engineering student”."><Input name="role" defaultValue={role} /></Field>
      <Field label="Email"><Input value={email} disabled readOnly /></Field>
      <Button type="submit" variant="accent" loading={busy}>Save profile</Button>
    </form>
  );
}
