"use client";

import { createContext, useContext } from "react";
import type { VenueRow } from "@/lib/types";

const VenueContext = createContext<VenueRow | null>(null);

export function VenueProvider({ venue, children }: { venue: VenueRow; children: React.ReactNode }) {
  return <VenueContext.Provider value={venue}>{children}</VenueContext.Provider>;
}

export function useVenue(): VenueRow {
  const venue = useContext(VenueContext);
  if (!venue) throw new Error("useVenue must be used within a VenueProvider");
  return venue;
}
