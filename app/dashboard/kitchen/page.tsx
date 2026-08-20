import Link from "next/link";
import { Maximize2 } from "lucide-react";
import { KitchenDisplay } from "@/components/orders/kitchen-display";
import { Button } from "@/components/ui/button";

export default function KitchenPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kitchen display</h1>
          <p className="text-muted-foreground">Tap a ticket to advance it. Borders turn amber then red as orders age.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/kds" target="_blank">
            <Maximize2 className="size-4" />
            Open fullscreen
          </Link>
        </Button>
      </div>
      <KitchenDisplay />
    </div>
  );
}
