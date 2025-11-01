"use client";
import * as React from "react";

export default function CLSObserver() {
  React.useEffect(() => {
    if (typeof window === "undefined" || !(window as any).PerformanceObserver)
      return;
    try {
      let cumulative = 0;
      const obs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as PerformanceEntry[]) {
          // @ts-ignore - layout shift entry
          if ((entry as any).value) {
            const e = entry as any;
            cumulative += e.value || 0;
            console.info("[CLS] layout-shift", {
              value: e.value,
              hadRecentInput: e.hadRecentInput,
              sources: e.sources && e.sources.length ? e.sources.map((s: any) => ({ node: s.node && s.node.nodeName, previousRect: s.previousRect, currentRect: s.currentRect })) : undefined,
              cumulative,
            });
          }
        }
      });
      // Observe layout-shift entries
      (obs as any).observe({ type: "layout-shift", buffered: true });
      return () => {
        try {
          obs.disconnect();
        } catch {}
      };
    } catch (e) {
      // ignore
    }
  }, []);

  return null;
}
