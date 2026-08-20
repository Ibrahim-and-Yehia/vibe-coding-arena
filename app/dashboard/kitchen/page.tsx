import { KitchenDisplay } from "@/components/orders/kitchen-display";

export default function KitchenPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kitchen display</h1>
        <p className="text-muted-foreground">Tap a ticket to advance it. Borders turn amber then red as orders age.</p>
      </div>
      <KitchenDisplay />
    </div>
  );
}
