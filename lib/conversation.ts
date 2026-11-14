import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage } from "./types";

/** Most recent AI conversation this user had in the project (RLS limits conversations to their own). */
export async function loadLatestConversation(supabase: SupabaseClient, projectId: string, userId: string) {
  const { data: conv } = await supabase.from("ai_conversations").select("id").eq("project_id", projectId).eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!conv) return { conversationId: null as string | null, messages: [] as ChatMessage[] };
  const { data } = await supabase.from("ai_messages").select("id,role,content,segments,citations,created_at").eq("conversation_id", conv.id).order("created_at", { ascending: true });
  return { conversationId: conv.id as string, messages: (data ?? []) as ChatMessage[] };
}
