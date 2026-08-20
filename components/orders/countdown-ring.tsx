"use client";

import { useEffect, useState } from "react";
import { computeWaitState, formatMinutesSeconds, type WaitLevel } from "@/lib/sla";
import { cn } from "@/lib/utils";

const RING_COLOR: Record<WaitLevel, string> = {
  green: "var(--status-free)",
  amber: "var(--status-amber)",
  red: "var(--status-red)",
};

/** Ticking clock shared by every countdown on screen (one interval, not N). */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function CountdownRing({
  placedAt,
  targetMinutes,
  amberPct,
  redPct,
  now,
  size = 44,
}: {
  placedAt: string;
  targetMinutes: number;
  amberPct: number;
  redPct: number;
  now: Date;
  size?: number;
}) {
  const state = computeWaitState({ placedAt, targetMinutes, amberPct, redPct, now });
  const r = size / 2 - 4;
  const circumference = 2 * Math.PI * r;
  const progress = Math.min(state.pct, 1);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={RING_COLOR[state.level]}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center text-[10px] font-semibold tabular-nums",
          state.level === "red" && "text-status-red",
          state.level === "amber" && "text-status-amber"
        )}
      >
        {formatMinutesSeconds(state.remainingMinutes)}
      </span>
    </div>
  );
}

export function waitLevelFor(
  placedAt: string,
  targetMinutes: number,
  amberPct: number,
  redPct: number,
  now: Date
): WaitLevel {
  return computeWaitState({ placedAt, targetMinutes, amberPct, redPct, now }).level;
}
