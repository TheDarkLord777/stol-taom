"use client";

import { useEffect } from "react";
import { useTheme } from "@/lib/theme-context";

/**
 * Hook to force light mode for the current page.
 * MUST be called from a client component that is wrapped by ThemeProvider.
 */
export function useLightMode() {
  try {
    const { setTheme } = useTheme();

    useEffect(() => {
      setTheme("light");
      // Cleanup: return to dark when leaving page
      return () => {
        setTheme("dark");
      };
    }, [setTheme]);
  } catch (e) {
    // If ThemeProvider not available, silently fail (hydration safety)
    if (typeof window !== "undefined") {
      console.warn("useLightMode called outside ThemeProvider context");
    }
  }
}
