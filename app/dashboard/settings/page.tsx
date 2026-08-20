import { QrCode } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { VenueQr } from "@/components/dashboard/venue-qr";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("venue_id").eq("id", user!.id).single();
  const { data: venue } = await supabase.from("venues").select("*").eq("id", profile!.venue_id!).single();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Venue details used across the dashboard and customer menu.</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Venue</CardTitle>
          <CardDescription>Changes apply immediately, everywhere.</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm venue={venue!} />
        </CardContent>
      </Card>

      <Card className="max-w-lg">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <QrCode className="size-5" />
          </div>
          <div>
            <CardTitle>Ordering QR code</CardTitle>
            <CardDescription>Put this on your tables — customers scan it to order.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <VenueQr slug={venue!.slug} venueName={venue!.name} />
        </CardContent>
      </Card>
    </div>
  );
}
