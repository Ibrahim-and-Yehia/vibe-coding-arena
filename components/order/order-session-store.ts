"use client";

import { useSyncExternalStore } from "react";

// Session identity lives in sessionStorage, NOT localStorage, on purpose:
// the demo runs the owner dashboard and the customer site side by side in
// one browser. localStorage is shared across tabs of the same origin, so two
// customer tabs (or a stale one) would clobber each other's sitting.
// sessionStorage is per-tab, so each window is an independent "customer".
//
// Exposed as a proper external store so components read it via
// useSyncExternalStore — no setState-in-effect, no hydration mismatch.

const key = (slug: string) => `serva:session:${slug}`;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getStoredSession(slug: string): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(key(slug));
}

export function storeSession(slug: string, sessionId: string) {
  window.sessionStorage.setItem(key(slug), sessionId);
  emit();
}

export function clearStoredSession(slug: string) {
  window.sessionStorage.removeItem(key(slug));
  emit();
}

/**
 * Returns the stored session id, or `undefined` while still server-rendering
 * (so callers can distinguish "not hydrated yet" from "no session").
 */
export function useStoredSession(slug: string): string | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => getStoredSession(slug),
    () => undefined
  );
}
