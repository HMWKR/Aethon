import { SupabaseAiControlRepository } from "@aethon/db";
import { createAethonSupabaseServerClient } from "../supabase/server";

export async function createAiControlRepository() {
  const supabase = await createAethonSupabaseServerClient();

  return new SupabaseAiControlRepository(supabase);
}
