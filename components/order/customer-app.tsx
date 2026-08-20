"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  BellRing,
  Check,
  ChefHat,
  ConciergeBell,
  ImageOff,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Field, FieldLabel, FieldError, FieldGroup, FieldDescription } from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { claimTable, placeOrder, callWaiter, getOrderingState } from "@/app/order/[slug]/actions";
import { useStoredSession, storeSession, clearStoredSession } from "@/components/order/order-session-store";
import { MenuAssistant } from "@/components/order/menu-assistant";
import { computeWaitState, formatMinutesSeconds } from "@/lib/sla";
import { cn } from "@/lib/utils";
import type {
  VenueRow,
  MenuCategoryRow,
  MenuItemRow,
  MenuItemOptionRow,
  OrderOptionSnapshot,
  OrderStatus,
} from "@/lib/types";

interface CartLine {
  key: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  qty: number;
  note: string;
  options: OrderOptionSnapshot[];
}

const STATUS_STEPS: { status: OrderStatus; label: string; icon: React.ElementType }[] = [
  { status: "queued", label: "In queue", icon: ShoppingBag },
  { status: "preparing", label: "Preparing", icon: ChefHat },
  { status: "ready", label: "Ready", icon: BellRing },
  { status: "delivered", label: "Delivered", icon: Check },
];

export function CustomerApp({
  venue,
  categories,
  items,
  options,
  assistantEnabled,
}: {
  venue: VenueRow;
  categories: MenuCategoryRow[];
  items: MenuItemRow[];
  options: MenuItemOptionRow[];
  assistantEnabled: boolean;
}) {
  const storedSession = useStoredSession(venue.slug);
  const hydrated = storedSession !== undefined;
  const sessionId = storedSession ?? null;

  const [view, setView] = useState<"menu" | "review" | "track">("menu");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");
  const [configuring, setConfiguring] = useState<MenuItemRow | null>(null);
  const [orderNote, setOrderNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Claim form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tableId, setTableId] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const { data: state, refetch } = useQuery({
    queryKey: ["ordering-state", venue.id, sessionId],
    queryFn: () => getOrderingState(venue.id, sessionId),
    refetchInterval: 2000,
    enabled: hydrated,
  });

  // Staff freed the table out from under us. Detected during render rather
  // than in an effect: clearing the store notifies useStoredSession, which
  // re-renders us straight onto the claim screen.
  const tableWasClosed = !!sessionId && !!state && !state.session;
  if (tableWasClosed) {
    clearStoredSession(venue.slug);
    setCart([]);
    setView("menu");
    toast.info("Your table was closed by staff.");
  }

  const cartTotal = cart.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
  const cartCount = cart.reduce((sum, l) => sum + l.qty, 0);

  const optionsByItem = useMemo(() => {
    const map: Record<string, MenuItemOptionRow[]> = {};
    for (const o of options) {
      (map[o.menu_item_id] ??= []).push(o);
    }
    return map;
  }, [options]);

  async function handleClaim() {
    setClaimError(null);
    if (!name.trim()) return setClaimError("Please enter your name.");
    if (!phone.trim()) return setClaimError("Please enter your phone number.");
    if (!tableId) return setClaimError("Please choose a table.");

    setClaiming(true);
    const result = await claimTable(venue.id, tableId, name.trim(), phone.trim());
    setClaiming(false);

    if (result.error) {
      setClaimError(result.error);
      refetch();
      return;
    }
    storeSession(venue.slug, result.sessionId!);
    toast.success("You're seated — browse the menu");
  }

  function addToCart(item: MenuItemRow, chosen: OrderOptionSnapshot[], note: string) {
    const unitPrice = item.price + chosen.reduce((s, o) => s + o.price_delta, 0);
    const key = `${item.id}|${chosen.map((o) => o.option_name).join(",")}|${note}`;
    setCart((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { key, menuItemId: item.id, name: item.name, unitPrice, qty: 1, note, options: chosen }];
    });
    toast.success(`${item.name} added`);
  }

  function changeQty(key: string, delta: number) {
    setCart((prev) =>
      prev.flatMap((l) => {
        if (l.key !== key) return [l];
        const qty = l.qty + delta;
        return qty <= 0 ? [] : [{ ...l, qty }];
      })
    );
  }

  async function handlePlaceOrder() {
    if (!sessionId || cart.length === 0) return;
    setSubmitting(true);
    const result = await placeOrder(
      sessionId,
      cart.map((l) => ({ menu_item_id: l.menuItemId, qty: l.qty, note: l.note || undefined, options: l.options })),
      orderNote || null
    );
    setSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Order #${result.orderNumber} placed`);
    setCart([]);
    setOrderNote("");
    setView("track");
    refetch();
  }

  async function handleCallWaiter() {
    if (!sessionId) return;
    const result = await callWaiter(sessionId);
    if (result.error) toast.error(result.error);
    else toast.success("A waiter is on the way");
  }

  // ---- Claim screen ------------------------------------------------------
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sessionId || !state?.session) {
    const tables = state?.tables ?? [];
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{venue.name}</h1>
          <p className="text-muted-foreground">Order from your table</p>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="c-name">Your name</FieldLabel>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" />
          </Field>
          <Field>
            <FieldLabel htmlFor="c-phone">Phone number</FieldLabel>
            <Input
              id="c-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="555-0100"
            />
          </Field>
          <Field>
            <FieldLabel>Your table</FieldLabel>
            <FieldDescription>Greyed-out tables are already taken.</FieldDescription>
            <div className="grid grid-cols-4 gap-2 pt-1">
              {tables.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={t.occupied}
                  onClick={() => setTableId(t.id)}
                  className={cn(
                    "flex flex-col items-center rounded-lg border py-2.5 text-sm transition-colors",
                    t.occupied && "cursor-not-allowed opacity-40",
                    !t.occupied && "hover:border-primary",
                    tableId === t.id && "border-primary bg-accent font-semibold"
                  )}
                >
                  <span>{t.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {t.occupied ? "Taken" : `${t.seats} seats`}
                  </span>
                </button>
              ))}
            </div>
            {tables.length === 0 && (
              <p className="text-sm text-muted-foreground">No tables set up yet.</p>
            )}
          </Field>
          {claimError && <FieldError>{claimError}</FieldError>}
          <Button size="lg" onClick={handleClaim} disabled={claiming}>
            {claiming && <Loader2 className="size-4 animate-spin" />}
            Start ordering
          </Button>
        </FieldGroup>
      </div>
    );
  }

  // ---- Seated -----------------------------------------------------------
  const session = state.session;
  const orders = state.orders ?? [];
  const myTable = state.tables.find((t) => t.id === session.table_object_id);
  const visibleItems = items.filter((i) => i.category_id === activeCategory && i.is_available);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-28">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-5 py-3 backdrop-blur">
        <div>
          <div className="font-semibold">{venue.name}</div>
          <div className="text-xs text-muted-foreground">
            Table {myTable?.label} · {session.customer_name}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCallWaiter}>
          <ConciergeBell className="size-4" />
          Waiter
        </Button>
      </header>

      {view === "menu" && (
        <>
          {assistantEnabled && (
            <MenuAssistant
              venueId={venue.id}
              sessionId={session.id}
              items={items}
              currency={venue.currency}
              onPick={(item) =>
                (optionsByItem[item.id] ?? []).length > 0 ? setConfiguring(item) : addToCart(item, [], "")
              }
            />
          )}

          <div className="overflow-x-auto border-b px-5 py-2">
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <TabsList>
                {categories.map((c) => (
                  <TabsTrigger key={c.id} value={c.id}>
                    {c.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-col gap-3 px-5 py-4">
            {visibleItems.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">Nothing in this section right now.</p>
            )}
            {visibleItems.map((item) => {
              const soldOut = item.track_stock && item.stock_qty <= 0;
              const hasOptions = (optionsByItem[item.id] ?? []).length > 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={soldOut}
                  onClick={() => (hasOptions ? setConfiguring(item) : addToCart(item, [], ""))}
                  className={cn(
                    "flex gap-3 rounded-xl border p-3 text-left transition-colors",
                    soldOut ? "opacity-50" : "hover:border-primary"
                  )}
                >
                  <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt="" className="size-full object-cover" />
                    ) : (
                      <ImageOff className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                    <div className="font-medium">{item.name}</div>
                    {item.description && (
                      <div className="line-clamp-2 text-sm text-muted-foreground">{item.description}</div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {venue.currency} {item.price.toFixed(2)}
                      </span>
                      {soldOut && <Badge variant="destructive">Sold out</Badge>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {view === "review" && (
        <div className="flex flex-col gap-4 px-5 py-4">
          <Button variant="ghost" size="sm" className="w-fit" onClick={() => setView("menu")}>
            <ArrowLeft className="size-4" />
            Back to menu
          </Button>
          <h2 className="text-lg font-semibold">Review your order</h2>

          {cart.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
          ) : (
            <>
              {cart.map((line) => (
                <div key={line.key} className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{line.name}</div>
                    {line.options.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {line.options.map((o) => o.option_name).join(", ")}
                      </div>
                    )}
                    {line.note && <div className="text-xs italic text-muted-foreground">“{line.note}”</div>}
                    <div className="text-sm text-muted-foreground">
                      {venue.currency} {line.unitPrice.toFixed(2)} each
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="size-7" onClick={() => changeQty(line.key, -1)}>
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-5 text-center tabular-nums">{line.qty}</span>
                    <Button variant="outline" size="icon" className="size-7" onClick={() => changeQty(line.key, 1)}>
                      <Plus className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}

              <Field>
                <FieldLabel htmlFor="order-note">Anything else? (optional)</FieldLabel>
                <Textarea
                  id="order-note"
                  rows={2}
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Allergies, timing, anything the kitchen should know"
                />
              </Field>

              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>
                  {venue.currency} {cartTotal.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">You&apos;ll pay your server — no payment needed here.</p>
              <Button size="lg" onClick={handlePlaceOrder} disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Place order
              </Button>
            </>
          )}
        </div>
      )}

      {view === "track" && (
        <div className="flex flex-col gap-4 px-5 py-4">
          <h2 className="text-lg font-semibold">Your orders</h2>
          {orders.length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
          {orders.map((order) => {
            const wait = computeWaitState({
              placedAt: order.placed_at,
              targetMinutes: order.target_minutes,
              amberPct: venue.sla_amber_pct,
              redPct: venue.sla_red_pct,
            });
            const currentStep = STATUS_STEPS.findIndex((s) => s.status === order.status);
            return (
              <div key={order.id} className="flex flex-col gap-3 rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Order #{order.order_number}</span>
                  <span className="text-sm text-muted-foreground">
                    {venue.currency} {order.total_amount.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {STATUS_STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const done = i <= currentStep;
                    return (
                      <div key={step.status} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className={cn(
                            "flex size-8 items-center justify-center rounded-full border-2 transition-colors",
                            done ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                        <span className={cn("text-[10px]", done ? "font-medium" : "text-muted-foreground")}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {order.status !== "delivered" && order.status !== "cancelled" && (
                  <p className="text-center text-sm text-muted-foreground">
                    {wait.remainingMinutes > 0
                      ? `About ${formatMinutesSeconds(wait.remainingMinutes)} to go`
                      : "Taking a little longer than expected — thanks for your patience"}
                  </p>
                )}

                <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.qty}× {item.name_snapshot}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <Button variant="outline" onClick={() => setView("menu")}>
            <Utensils className="size-4" />
            Order more
          </Button>
        </div>
      )}

      {/* Bottom bar */}
      <div className="fixed inset-x-0 bottom-0 mx-auto flex w-full max-w-md gap-2 border-t bg-background/95 p-4 backdrop-blur">
        {view !== "track" && cartCount > 0 && (
          <Button className="flex-1" size="lg" onClick={() => setView("review")}>
            <ShoppingBag className="size-4" />
            {view === "review" ? "Keep editing" : `Review ${cartCount} item${cartCount === 1 ? "" : "s"}`}
            <span className="ml-auto">
              {venue.currency} {cartTotal.toFixed(2)}
            </span>
          </Button>
        )}
        {(cartCount === 0 || view === "track") && (
          <>
            <Button variant={view === "menu" ? "default" : "outline"} className="flex-1" onClick={() => setView("menu")}>
              <Utensils className="size-4" />
              Menu
            </Button>
            <Button
              variant={view === "track" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setView("track")}
            >
              <BellRing className="size-4" />
              Orders {orders.length > 0 && `(${orders.length})`}
            </Button>
          </>
        )}
      </div>

      <OptionPicker
        item={configuring}
        options={configuring ? optionsByItem[configuring.id] ?? [] : []}
        currency={venue.currency}
        onClose={() => setConfiguring(null)}
        onAdd={(chosen, note) => {
          if (configuring) addToCart(configuring, chosen, note);
          setConfiguring(null);
        }}
      />
    </div>
  );
}

function OptionPicker({
  item,
  options,
  currency,
  onClose,
  onAdd,
}: {
  item: MenuItemRow | null;
  options: MenuItemOptionRow[];
  currency: string;
  onClose: () => void;
  onAdd: (chosen: OrderOptionSnapshot[], note: string) => void;
}) {
  const groups = useMemo(() => {
    const map: Record<string, MenuItemOptionRow[]> = {};
    for (const o of options) (map[o.group_name] ??= []).push(o);
    return map;
  }, [options]);

  const [selected, setSelected] = useState<Record<string, MenuItemOptionRow>>({});
  const [note, setNote] = useState("");
  const [seededFor, setSeededFor] = useState<string | null>(null);

  // Seed defaults during render when a new item opens (not in an effect).
  if (item && seededFor !== item.id) {
    setSeededFor(item.id);
    const defaults: Record<string, MenuItemOptionRow> = {};
    for (const [group, opts] of Object.entries(groups)) {
      const def = opts.find((o) => o.is_default);
      if (def) defaults[group] = def;
    }
    setSelected(defaults);
    setNote("");
  }

  if (!item) return null;

  const chosen = Object.values(selected).map((o) => ({
    group_name: o.group_name,
    option_name: o.option_name,
    price_delta: o.price_delta,
  }));
  const total = item.price + chosen.reduce((s, o) => s + o.price_delta, 0);

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          {item.description && <DialogDescription>{item.description}</DialogDescription>}
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {Object.entries(groups).map(([group, opts]) => (
            <div key={group} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{group}</span>
              <div className="flex flex-col gap-1.5">
                {opts.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelected((prev) => ({ ...prev, [group]: opt }))}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                      selected[group]?.id === opt.id ? "border-primary bg-accent" : "hover:border-primary"
                    )}
                  >
                    <span>{opt.option_name}</span>
                    {opt.price_delta !== 0 && (
                      <span className="text-muted-foreground">
                        {opt.price_delta > 0 ? "+" : ""}
                        {currency} {opt.price_delta.toFixed(2)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <Field>
            <FieldLabel htmlFor="item-note">Special request</FieldLabel>
            <Input
              id="item-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="No onions, extra crispy…"
            />
          </Field>

          <Button size="lg" onClick={() => onAdd(chosen, note)}>
            Add · {currency} {total.toFixed(2)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
