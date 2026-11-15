# Judge demo: draft setup and review

This change is **not ready to enable in production**. The login link is hidden unless `NEXT_PUBLIC_JUDGE_DEMO_ENABLED=true` at build time, and the database template is disabled until an administrator configures it.

The judge entry signs in with a distinct Supabase anonymous user, calls `create_judge_demo()` to copy the administrator-approved project into a project owned by that user, and uploads the packaged GLB into the new project's private storage path. Calling the function repeatedly for the same anonymous user returns the same copy. Each browser session uses its own Supabase session; refresh keeps changes, but signing out, clearing site data, or using another browser loses access to that anonymous user. The ordinary account signup flow and its RC sample are unchanged.

## Before enabling

1. Review the Aero template's data and model for public disclosure. Anyone who can open the judge demo can copy its data, and `public/judge-demo/aero.glb` is a public build asset. The SQL copies component descriptions, research text and URLs, revisions, decisions, research/revision evidence, notes and model assignments. It replaces personal author names with `Demo team`, does not copy members, chat, reviews, generated documents, attachments or original storage paths, and labels copied data as sample. Confirm those omissions are appropriate for the presentation.
2. In a non-production Supabase project, review and apply `0010_judge_demo.sql`. Enable Supabase anonymous sign-ins only after reviewing **all existing authenticated-user policies and security-definer functions**: anonymous users get the `authenticated` role, not the `anon` role. In particular review invitations, user lookup, uploads, project creation, and AI endpoints. Add abuse protection and limits appropriate for a public entry point, including AI usage. Do not rely on the hidden UI flag as an access control.
3. Confirm the approved template uses the exact packaged GLB and that its stored file size is 2,374,144 bytes. A size comparison catches obvious mismatches but is not a cryptographic verification; compare hashes separately before approving. Re-export/repackage and update the guard if the model changes. The model's part paths and the template's assignments must match.
4. Using an administrator-only SQL session, explicitly configure a reviewed template:

   ```sql
   insert into public.judge_demo_config(singleton, template_project_id, enabled)
   values (true, '<approved-template-project-uuid>', true)
   on conflict (singleton) do update set template_project_id = excluded.template_project_id, enabled = excluded.enabled;
   ```

5. Review and test `scripts/cleanup-judge-demos.mjs` in development, then configure a trusted scheduler to run it regularly with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` stored as server-only secrets. It selects judge sessions older than 48 hours, checks the account is anonymous and owns the copied project, deletes storage for that guest's owned projects, then deletes the guest user (which cascades to its projects). Process at most 100 sessions per run. **No scheduler is configured by this PR**, so cleanup and expiry are not automatic until that deployment step is complete. Test mixed guest/permanent users, failures and retry behavior; Supabase does not automatically clean up anonymous users. Until scheduling is confirmed, don't promise a specific expiration time.
6. Test in the development Supabase project from two independent browser profiles: create two demos, confirm each receives the actual Aero model and expected research/decisions/notes/links, edit one, refresh and confirm persistence, verify the other demo and source project are unchanged, and verify neither user can read or change the other's project or files. Test a retry after interrupting the initial upload and ensure it doesn't create another project. Test AI, citations, and handoff with the actual demo data and credit configuration.
7. Only after those tests pass, set `NEXT_PUBLIC_JUDGE_DEMO_ENABLED=true` in the target deployment and redeploy. Check the actual login and guest flow in production. Until then leave the flag unset and the template disabled.

The guest flow depends on the existing signed-in project pages and save paths. SQL, policies, real model uploads, AI, and multi-user isolation **have not been tested against a running Supabase instance** in this checkout.
