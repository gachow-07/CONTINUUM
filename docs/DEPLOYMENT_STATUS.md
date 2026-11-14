# Shared setup and deployment status

Last verified: 2026-11-14

This is the team handoff for Gabe's setup, shared-data, and deployment work. It intentionally contains no passwords, API keys, database connection strings, or other secrets.

## Use the shared app

- Production: <https://continuum-seven-self.vercel.app>
- Production branch: `claude/focused-keller-vaxrr2`
- Hosting: Vercel project `continuum`, currently owned by Gabe's Vercel account
- Database, authentication, and file storage: one shared Supabase project, currently owned by Gabe's Supabase organization

Create an account in the production app to use shared data. Gabe can then use the app's **Share** control to add that registered teammate to a project. App project membership and Supabase dashboard access are separate permissions.

## Verified working

- All three SQL migrations have been applied to the shared Supabase project:
  - `supabase/migrations/0001_schema.sql`
  - `supabase/migrations/0002_model.sql`
  - `supabase/migrations/0003_markers.sql`
- The expected tables are present in Supabase.
- Email/password registration and sign-in work against the production deployment.
- Email confirmation is disabled for the hackathon demo.
- Vercel has the production Supabase URL and browser-safe public/anonymous key configured as environment variables. Their values are not stored in GitHub.
- The authenticated dashboard loads successfully.
- The RC Car Design sample can be loaded into the shared database.
- The RC car project hub and 3D model render in a normal desktop browser.
- Sebastian and Hudson have GitHub push access.

## Not yet verified or configured

- `supabase/migrations/0005_disable_project_deletion.sql` has not yet been applied to the shared Supabase project. Apply it before deploying this change so authenticated clients cannot delete projects directly; archiving remains available.
- Teammate sign-up, project sharing, and simultaneous access from separate accounts.
- The complete demo path: Suspension component -> reasoning -> linked source -> decision -> handoff.
- Source URLs in the sample are placeholder `example.com` links and should be replaced with real sources before judging.
- OpenAI is not yet confirmed in production. AI features need `OPENAI_API_KEY` in Vercel; never put this key in GitHub or prefix it with `NEXT_PUBLIC_`.
- Teammate access to the Supabase and Vercel administrative dashboards.
- File upload/storage behavior and generated-document export in production.

## Deployment workflow

1. Work on a personal branch and open a pull request into `claude/focused-keller-vaxrr2`.
2. Run `npm run lint` and `npm run build` before merging.
3. Merging into the production branch automatically starts a Vercel deployment.
4. Wait for the Vercel status on the GitHub commit to say **Deployment has completed**.
5. Test the production URL while signed in.

Do not commit `.env.local`, Supabase service-role keys, database passwords, OpenAI keys, or values copied from Vercel's secret environment variables.

## Immediate team checklist

1. Sebastian and Hudson each create an account at the production URL.
2. Gabe opens the RC Car Design project, selects **Share**, and adds both registered teammates.
3. Each teammate confirms that the shared RC Car project opens from their own account.
4. Gabe invites teammates to the Supabase organization from the Supabase organization/team settings if they need to inspect the database directly.
5. Add the OpenAI key directly in Vercel, redeploy, and test one grounded AI question.
6. Replace the placeholder research links and run the full three-minute demo from start to finish.
