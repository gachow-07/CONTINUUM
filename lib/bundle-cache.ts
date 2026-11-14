import { cache } from "react";
import { loadBundle } from "./bundle";
import { requireSession } from "./session";

/** One bundle load per request, shared by the layout and the page under it. */
export const getBundle = cache(async (projectId: string) => {
  const { supabase } = await requireSession();
  return loadBundle(supabase, projectId);
});
