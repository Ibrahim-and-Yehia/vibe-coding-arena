"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Phone, User, DoorOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CountdownRing } from "@/components/orders/countdown-ring";
import { OrderStatusButton } from "@/components/orders/order-status-buttons";
import { freeTable } from "@/app/dashboard/orders/actions";
import { useInvalidateLive } from "@/hooks/use-live-venue";
import type { LiveVenuePayload } from "@/lib/live-types";
import type { FloorObjectRow, OrderStatus } from "@/lib/types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  queued: "In queue",
  preparing: "Preparing",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function TableDrawer({
  table,
  data,
  now,
  onClose,
}: {
  table: FloorObjectRow | null;
  data: LiveVenuePayload;
  now: Date;
  onClose: () => void;
}) {
  const [freeing, setFreeing] = useState(false);
  const [confirmFree, setConfirmFree] = useState(false);
  const invalidate = useInvalidateLive();

  const session = table ? data.sessions.find((s) => s.table_object_id === table.id) ?? null : null;
  const orders = session ? data.orders.filter((o) => o.session_id === session.id) : [];
  const runningTotal = orders.reduce((sum, o) => sum + o.total_amount, 0);

  async function handleFree() {
    if (!session) return;
    setFreeing(true);
    const result = await freeTable(session.id);
    setFreeing(false);
    setConfirmFree(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Table ${table?.label} is now free`);
    invalidate();
    onClose();
  }

  return (
    <>
      <Sheet open={!!table} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Table {table?.label}</SheetTitle>
            <SheetDescription>
              {session ? `Seated ${new Date(session.opened_at).toLocaleTimeString()}` : "This table is free."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4">
            {!session ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No one seated here. Customers claim a table from the ordering page.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <User className="size-4 text-muted-foreground" />
                    {session.customer_name}
                  </span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="size-4" />
                    {session.customer_phone}
                  </span>
                </div>

                {orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Seated, but hasn&apos;t ordered yet.</p>
                ) : (
                  orders.map((order) => {
                    const items = data.orderItems.filter((i) => i.order_id === order.id);
                    return (
                      <div key={order.id} className="flex flex-col gap-3 rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <CountdownRing
                              placedAt={order.placed_at}
                              targetMinutes={order.target_minutes}
                              amberPct={data.slaAmberPct}
                              redPct={data.slaRedPct}
                              now={now}
                            />
                            <div>
                              <div className="font-semibold">Order #{order.order_number}</div>
                              <Badge variant="secondary">{STATUS_LABEL[order.status]}</Badge>
                            </div>
                          </div>
                          <div className="text-right text-sm font-medium">
                            {data.currency} {order.total_amount.toFixed(2)}
                          </div>
                        </div>

                        <ul className="flex flex-col gap-1 text-sm">
                          {items.map((item) => (
                            <li key={item.id} className="flex justify-between gap-2">
                              <span>
                                <span className="text-muted-foreground">{item.qty}×</span> {item.name_snapshot}
                                {item.options_snapshot.length > 0 && (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    ({item.options_snapshot.map((o) => o.option_name).join(", ")})
                                  </span>
                                )}
                                {item.note && <span className="block text-xs text-muted-foreground">“{item.note}”</span>}
                              </span>
                              <span className="text-muted-foreground">
                                {data.currency} {(item.unit_price * item.qty).toFixed(2)}
                              </span>
                            </li>
                          ))}
                        </ul>

                        {order.note && <p className="text-xs text-muted-foreground">Note: {order.note}</p>}

                        <OrderStatusButton orderId={order.id} status={order.status} className="w-full" />
                      </div>
                    );
                  })
                )}

                {orders.length > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Running total</span>
                      <span>
                        {data.currency} {runningTotal.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {session && (
            <SheetFooter>
              <Button variant="outline" onClick={() => setConfirmFree(true)} disabled={freeing}>
                {freeing ? <Loader2 className="size-4 animate-spin" /> : <DoorOpen className="size-4" />}
                Free table
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmFree} onOpenChange={setConfirmFree}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Free table {table?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This closes the sitting and makes the table available again on the ordering page. Any orders still
              in the kitchen stay on the kitchen display.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFree}>Free table</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
