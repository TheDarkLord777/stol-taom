"use client";
import * as React from "react";

export default function CLSObserver() {
  React.useEffect(() => {
    if (
      typeof window === "undefined" ||
      !(window as unknown as { PerformanceObserver?: unknown })
        .PerformanceObserver
    )
      return;
    try {
      let cumulative = 0;
      const obs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as PerformanceEntry[]) {
          const e = entry as unknown as {
            value?: number;
            hadRecentInput?: boolean;
            sources?: unknown[];
          };
          if (e.value) {
            cumulative += e.value || 0;
            console.info("[CLS] layout-shift", {
              value: e.value,
              hadRecentInput: e.hadRecentInput,
              sources:
                Array.isArray(e.sources) && e.sources.length
                  ? (e.sources as unknown[]).map((s) => {
                      const so = s as Record<string, unknown>;
                      return {
                        node: (so.node as { nodeName?: string } | undefined)
                          ?.nodeName,
                        previousRect: so.previousRect,
                        currentRect: so.currentRect,
                      };
                    })
                  : undefined,
              cumulative,
            });
          }
        }
      });
      // Observe layout-shift entries
      (
        obs as unknown as {
          observe: (o: { type: string; buffered?: boolean }) => void;
        }
      ).observe({ type: "layout-shift", buffered: true });
      return () => {
        try {
          obs.disconnect();
        } catch {}
      };
    } catch (_e) {
      // ignore
    }
  }, []);

  return null;
}
