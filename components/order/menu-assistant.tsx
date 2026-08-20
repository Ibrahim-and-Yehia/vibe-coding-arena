"use client";

import { useState } from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { suggestItems } from "@/app/order/[slug]/actions";
import type { MenuItemRow } from "@/lib/types";

export function MenuAssistant({
  venueId,
  sessionId,
  items,
  currency,
  onPick,
}: {
  venueId: string;
  sessionId: string;
  /** Same menu rows the category tabs render from — a pick that has since sold out
   *  or gone unavailable is filtered out below before it can be shown. */
  items: MenuItemRow[];
  currency: string;
  onPick: (item: MenuItemRow) => void;
}) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picks, setPicks] = useState<{ id: string; reason: string }[] | null>(null);

  async function ask() {
    const q = question.trim();
    if (q.length < 3 || loading) return;
    setLoading(true);
    setError(null);
    const result = await suggestItems(venueId, sessionId, q);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      setPicks(null);
      return;
    }
    setPicks(result.picks ?? []);
  }

  // Resolved on every render against the current menu, so an item that has gone
  // unavailable or sold out since the answer was generated is dropped here.
  const suggested = (picks ?? []).flatMap((p) => {
    const item = items.find((i) => i.id === p.id);
    if (!item || !item.is_available) return [];
    if (item.track_stock && item.stock_qty <= 0) return [];
    return [{ item, reason: p.reason }];
  });

  return (
    <div className="flex flex-col gap-3 border-b px-5 py-3">
      <div className="flex gap-2">
        <Input
          value={question}
          maxLength={200}
          placeholder="Something light and vegetarian…"
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
        />
        <Button onClick={ask} disabled={loading || question.trim().length < 3}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Ask
        </Button>
      </div>

      {error && <p className="text-xs text-muted-foreground">{error}</p>}

      {picks !== null && suggested.length === 0 && !error && (
        <p className="text-xs text-muted-foreground">
          Nothing on the menu quite matches — try describing it differently, or ask your server.
        </p>
      )}

      {suggested.map(({ item, reason }) => (
        <div key={item.id} className="flex items-center gap-3 rounded-xl border bg-accent/40 p-3">
          <div className="min-w-0 flex-1">
            <div className="font-medium">{item.name}</div>
            <div className="text-xs text-muted-foreground">{reason}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm font-semibold">
              {currency} {item.price.toFixed(2)}
            </span>
            <Button size="sm" onClick={() => onPick(item)}>
              <Plus className="size-3" />
              Add
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
