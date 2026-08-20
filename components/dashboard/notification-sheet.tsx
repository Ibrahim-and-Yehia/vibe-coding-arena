"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, AlertTriangle, Package, ConciergeBell, ShoppingBag, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLiveVenue, useInvalidateLive } from "@/hooks/use-live-venue";
import { useVenue } from "@/components/dashboard/venue-context";
import { markAlertRead, markAllAlertsRead } from "@/app/dashboard/orders/actions";
import { cn } from "@/lib/utils";
import type { AlertKind, AlertSeverity } from "@/lib/types";

const KIND_ICON: Record<AlertKind, React.ElementType> = {
  new_order: ShoppingBag,
  order_ready: ConciergeBell,
  order_late: Clock,
  low_stock: Package,
  call_waiter: AlertTriangle,
};

const SEVERITY_CLASS: Record<AlertSeverity, string> = {
  info: "text-status-active",
  warning: "text-status-amber",
  critical: "text-status-red",
};

export function NotificationSheet() {
  const venue = useVenue();
  const { data } = useLiveVenue(venue.id);
  const invalidate = useInvalidateLive();
  const [open, setOpen] = useState(false);

  const alerts = data?.alerts ?? [];
  const unread = alerts.filter((a) => !a.is_read);

  async function handleRead(id: string) {
    await markAlertRead(id);
    invalidate();
  }

  async function handleReadAll() {
    await markAllAlertsRead();
    invalidate();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {unread.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-status-red text-[10px] font-bold text-status-red-foreground">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-sm">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            Notifications
            {unread.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleReadAll}>
                <CheckCheck className="size-4" />
                Mark all read
              </Button>
            )}
          </SheetTitle>
          <SheetDescription>New orders, late warnings, waiter calls, and low stock.</SheetDescription>
        </SheetHeader>

        {alerts.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Nothing yet — alerts appear the moment something needs attention.
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="flex flex-col">
              {alerts.map((alert) => {
                const Icon = KIND_ICON[alert.kind];
                return (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => !alert.is_read && handleRead(alert.id)}
                    className={cn(
                      "flex items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-accent",
                      !alert.is_read && "bg-accent/40"
                    )}
                  >
                    <Icon className={cn("mt-0.5 size-4 shrink-0", SEVERITY_CLASS[alert.severity])} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px] tabular-nums">
                          {alert.alert_number}
                        </Badge>
                        <span className="text-sm leading-snug">{alert.message}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {!alert.is_read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-status-active" />}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
