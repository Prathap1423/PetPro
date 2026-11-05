"use client";

import { useEffect } from "react";
import { BASE_PATH } from "@/config";

/** Registers public/sw.js, which keeps Slate's year-long cache from serving old pages. */
export function FreshPages() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/`, updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}
