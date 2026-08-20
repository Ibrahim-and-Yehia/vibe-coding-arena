"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { LiveVenuePayload } from "@/lib/live-types";

export const LIVE_QUERY_KEY = ["venue-live"];

/**
 * Live venue state, with a deliberate belt-and-braces strategy:
 *
 *  - Polling every 2s is the BASELINE. It works on every host, through every
 *    proxy, with no websocket support required.
 *  - Supabase Realtime is layered on top purely as an accelerator: any change
 *    event just invalidates the query so the next render is immediate.
 *
 * If websockets are blocked or throttled (some sandboxed hosts do this), the
 * UI silently degrades to a 2s refresh instead of going stale — which matters
 * a great deal when this is running live in front of an audience.
 */
export function useLiveVenue(venueId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<LiveVenuePayload>({
    queryKey: LIVE_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/venue/live", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load live venue state");
      return res.json();
    },
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    const supabase = createClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: LIVE_QUERY_KEY });

    // The channel name MUST be unique per mount. createBrowserClient returns a
    // singleton, so its Realtime client outlives this effect. With a fixed name,
    // React's double-invoked development effects call supabase.channel() again
    // before the first removeChannel() has finished — which hands back the SAME
    // already-subscribed channel, and .on() then throws
    // "cannot add postgres_changes callbacks ... after subscribe()".
    const channel = supabase
      .channel(`venue-${venueId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `venue_id=eq.${venueId}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "table_sessions", filter: `venue_id=eq.${venueId}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts", filter: `venue_id=eq.${venueId}` }, invalidate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, queryClient]);

  return query;
}

export function useInvalidateLive() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: LIVE_QUERY_KEY });
}
