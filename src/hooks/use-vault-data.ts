"use client";

import { useEffect, useState } from "react";
import { subscribe } from "@/storage/vault";

/** Loads data from the vault and reloads it whenever the vault changes. Undefined while loading. */
export function useVaultData<T>(load: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const [data, setData] = useState<T>();
  useEffect(() => {
    let live = true;
    const run = () => { load().then((d) => { if (live) setData(d); }); };
    run();
    const unsubscribe = subscribe(run);
    return () => { live = false; unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return data;
}
