"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChefHat, CheckCheck, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { advanceOrder } from "@/app/dashboard/orders/actions";
import { useInvalidateLive } from "@/hooks/use-live-venue";
import type { OrderStatus } from "@/lib/types";

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string; icon: React.ElementType }>> = {
  queued: { to: "preparing", label: "Start preparing", icon: ChefHat },
  preparing: { to: "ready", label: "Mark ready", icon: BellRing },
  ready: { to: "delivered", label: "Mark delivered", icon: CheckCheck },
};

export function OrderStatusButton({
  orderId,
  status,
  size = "sm",
  className,
}: {
  orderId: string;
  status: OrderStatus;
  size?: "sm" | "default";
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const invalidate = useInvalidateLive();
  const next = NEXT[status];
  if (!next) return null;
  const Icon = next.icon;

  async function handleClick() {
    setBusy(true);
    const result = await advanceOrder(orderId, next!.to);
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    invalidate();
  }

  return (
    <Button size={size} onClick={handleClick} disabled={busy} className={className}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
      {next.label}
    </Button>
  );
}
