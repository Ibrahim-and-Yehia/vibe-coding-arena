"use client";

import { useState } from "react";
import { Loader2, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askMenu } from "@/app/order/[slug]/actions";
import type { MenuItemRow } from "@/lib/types";

/** Shown until the guest asks something, to make it obvious what this accepts. */
const EXAMPLES = ["What drinks do you have?", "Something light", "What's quick?", "Surprise me"];

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
  const [answer, setAnswer] = useState<string | null>(null);
  const [picks, setPicks] = useState<{ id: string; reason: string }[] | null>(null);

  async function ask(text?: string) {
    const q = (text ?? question).trim();
    if (q.length < 3 || loading) return;
    if (text) setQuestion(text);
    setLoading(true);
    setError(null);
    const result = await askMenu(venueId, sessionId, q);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      setAnswer(null);
      setPicks(null);
      return;
    }
    setAnswer(result.answer ?? null);
    setPicks(result.picks ?? []);
  }

  function reset() {
    setQuestion("");
    setAnswer(null);
    setPicks(null);
    setError(null);
  }

  // Resolved on every render against the current menu, so an item that has gone
  // unavailable or sold out since the answer was generated is dropped here.
  const suggested = (picks ?? []).flatMap((p) => {
    const item = items.find((i) => i.id === p.id);
    if (!item || !item.is_available) return [];
    if (item.track_stock && item.stock_qty <= 0) return [];
    return [{ item, reason: p.reason }];
  });

  const hasResult = answer !== null || picks !== null;

  return (
    <div className="px-5 pt-4">
      <div className="overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-sm">
        <div className="flex items-center gap-2 px-4 pt-3.5">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="size-3.5" />
          </span>
          <span className="text-sm font-semibold">Ask the menu</span>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            AI
          </span>
          {hasResult && (
            <button
              type="button"
              onClick={reset}
              aria-label="Clear"
              className="ml-auto text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <p className="px-4 pt-1 text-xs text-muted-foreground">
          Anything about the food or drinks here — we&apos;ll point you at the right thing.
        </p>

        <div className="flex gap-2 px-4 pb-3 pt-3">
          <Input
            value={question}
            maxLength={200}
            placeholder="What are you in the mood for?"
            className="bg-background"
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
          />
          <Button onClick={() => ask()} disabled={loading || question.trim().length < 3}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Ask
          </Button>
        </div>

        {!hasResult && !loading && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-3.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => ask(ex)}
                className="rounded-full border border-primary/25 bg-background/70 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <p className="flex items-center gap-2 px-4 pb-3.5 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Reading the menu…
          </p>
        )}

        {error && !loading && <p className="px-4 pb-3.5 text-xs text-muted-foreground">{error}</p>}

        {answer && !loading && (
          <p className="px-4 pb-3.5 text-sm leading-relaxed">{answer}</p>
        )}

        {suggested.length > 0 && !loading && (
          <div className="flex flex-col gap-2 border-t border-primary/15 bg-background/60 p-3">
            {suggested.map(({ item, reason }) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{item.name}</div>
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
        )}
      </div>
    </div>
  );
}
