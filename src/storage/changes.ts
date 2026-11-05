"use client";

/** Tells open screens (in this tab and other tabs) that data changed, so they reload. */
const listeners = new Set<() => void>();
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("gold-vault") : null;
channel?.addEventListener("message", () => listeners.forEach((l) => l()));

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function notifyChanged() {
  listeners.forEach((l) => l());
  channel?.postMessage("changed");
}
