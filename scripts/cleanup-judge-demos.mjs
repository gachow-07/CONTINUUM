// Run from a trusted scheduler with a service-role key; never run in a browser.
// Deletes only anonymous judge sessions older than 48 hours. Remove storage first
// because the storage policy depends on the project membership being present.
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

async function removeFolder(prefix) {
  for (;;) {
    const { data, error } = await supabase.storage.from("project-files").list(prefix, { limit: 100 });
    if (error) throw error;
    if (!data?.length) return;
    const files = [];
    for (const entry of data) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id) files.push(path); else await removeFolder(path);
    }
    if (files.length) {
      const { error: removeError } = await supabase.storage.from("project-files").remove(files);
      if (removeError) throw removeError;
    }
    // Empty folder entries are virtual and should disappear with their contents.
  }
}

let failed = false;
const { data: sessions, error } = await supabase.from("judge_demo_sessions").select("user_id, project_id").lt("created_at", cutoff).order("created_at").limit(100);
if (error) throw error;
for (const session of sessions ?? []) {
  try {
    const { data, error: userError } = await supabase.auth.admin.getUserById(session.user_id);
    if (userError) throw userError;
    if (!data.user?.is_anonymous) throw new Error("Refusing to delete a non-anonymous user");
    const { data: project, error: projectError } = await supabase.from("projects").select("owner_id").eq("id", session.project_id).maybeSingle();
    if (projectError) throw projectError;
    if (!project || project.owner_id !== session.user_id) throw new Error("Project ownership does not match the anonymous user");
    const { data: ownedProjects, error: ownedError } = await supabase.from("projects").select("id").eq("owner_id", session.user_id);
    if (ownedError) throw ownedError;
    for (const owned of ownedProjects ?? []) await removeFolder(owned.id);
    const { error: deleteError } = await supabase.auth.admin.deleteUser(session.user_id);
    if (deleteError) throw deleteError;
    console.log(`Cleaned judge demo ${session.project_id}`);
  } catch (e) { failed = true; console.error(`Could not clean judge demo ${session.project_id}:`, e); }
}
if (failed) process.exitCode = 1;
