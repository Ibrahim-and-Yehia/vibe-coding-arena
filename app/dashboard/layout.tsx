import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VenueProvider } from "@/components/dashboard/venue-context";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("venue_id").eq("id", user.id).maybeSingle();
  if (!profile?.venue_id) redirect("/onboarding");

  const { data: venue } = await supabase.from("venues").select("*").eq("id", profile.venue_id).single();
  if (!venue) redirect("/onboarding");

  return (
    <VenueProvider venue={venue}>
      <div className="dark flex min-h-screen bg-background text-foreground">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Topbar email={user.email ?? ""} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </VenueProvider>
  );
}
