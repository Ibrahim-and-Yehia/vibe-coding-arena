import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { VenueProvider } from "@/components/dashboard/venue-context";
import { KitchenDisplay } from "@/components/orders/kitchen-display";
import { Button } from "@/components/ui/button";

// Standalone fullscreen kitchen display for a second monitor — same auth
// guarantee as the dashboard (enforced again in proxy.ts) but none of its
// chrome: no sidebar, no topbar, just tickets.
export default async function KdsPage() {
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
      <div className="dark min-h-screen bg-background text-foreground">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{venue.kitchen_label}</h1>
            <p className="text-sm text-muted-foreground">{venue.name}</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <LayoutDashboard className="size-4" />
              Dashboard
            </Link>
          </Button>
        </header>
        <main className="p-6">
          <KitchenDisplay />
        </main>
      </div>
    </VenueProvider>
  );
}
