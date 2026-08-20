// Mirrors the target_minutes formula computed once in place_order() (see
// supabase/migrations/0001_init.sql). Only the elapsed/level math happens
// client-side — target_minutes itself is always the value stored on the
// order, so the countdown never drifts from what was promised at placement.

export type WaitLevel = "green" | "amber" | "red";

export interface WaitState {
  elapsedMinutes: number;
  remainingMinutes: number;
  pct: number;
  level: WaitLevel;
}

export function computeWaitState(params: {
  placedAt: string | Date;
  targetMinutes: number;
  amberPct?: number;
  redPct?: number;
  now?: Date;
}): WaitState {
  const { placedAt, targetMinutes, amberPct = 0.7, redPct = 1.0, now = new Date() } = params;
  const placed = typeof placedAt === "string" ? new Date(placedAt) : placedAt;
  const elapsedMinutes = Math.max((now.getTime() - placed.getTime()) / 60000, 0);
  const pct = targetMinutes > 0 ? elapsedMinutes / targetMinutes : 0;
  const level: WaitLevel = pct >= redPct ? "red" : pct >= amberPct ? "amber" : "green";
  return { elapsedMinutes, remainingMinutes: targetMinutes - elapsedMinutes, pct, level };
}

export function formatMinutesSeconds(minutes: number): string {
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);
  const m = Math.floor(abs);
  const s = Math.round((abs - m) * 60);
  return `${sign}${m}:${s.toString().padStart(2, "0")}`;
}

export const waitLevelTokens: Record<WaitLevel, { bg: string; fg: string; text: string }> = {
  green: { bg: "bg-status-free", fg: "text-status-free-foreground", text: "text-status-free" },
  amber: { bg: "bg-status-amber", fg: "text-status-amber-foreground", text: "text-status-amber" },
  red: { bg: "bg-status-red", fg: "text-status-red-foreground", text: "text-status-red" },
};
