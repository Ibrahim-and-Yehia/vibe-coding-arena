import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Shared by dashboard server actions/pages: resolves the signed-in owner's
// venue once instead of every call site repeating the getUser + profile join.
export async function requireVenue() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("venue_id").eq("id", user.id).single();
  if (!profile?.venue_id) redirect("/onboarding");

  return { supabase, venueId: profile.venue_id, userId: user.id };
}
