import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  const p: Profile = (profile as Profile | null) ?? {
    id: data.user.id, email: data.user.email ?? null, full_name: data.user.email?.split("@")[0] ?? "You", role_title: null, org_id: null,
  };
  return { supabase, user: data.user, profile: p };
});

export async function requireSession() {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}
