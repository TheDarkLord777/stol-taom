"use client";

import { useLayoutEffect } from "react";
import { useTheme } from "./theme-context";

/**
 * Hook to apply per-page theme based on localStorage page-themes config.
 * Call this in any page component to automatically apply the stored theme for that page.
 *
 * Example usage in /menu/page.tsx client component:
 * ```tsx
 * usePageTheme('/menu');
 * ```
 */
export function usePageTheme(pagePath: string) {
  const { setTheme } = useTheme();

  // Apply theme before paint to avoid input/dropdown mismatches on mount
  useLayoutEffect(() => {
    const saved = localStorage.getItem("page-themes");

    // If no config exists yet, apply a sensible default for this page.
    if (!saved) {
      if (pagePath.includes("/orders")) {
        setTheme("light");
      }
      return;
    }

    try {
      const pages = JSON.parse(saved) as Array<{
        path: string;
        currentTheme: "dark" | "light";
      }>;
      const pageConfig = pages.find((p) => pagePath.includes(p.path));

      if (pageConfig) {
        setTheme(pageConfig.currentTheme);
      } else if (pagePath.includes("/orders")) {
        // Fallback default for orders when not listed
        setTheme("light");
      }
      // otherwise preserve current theme
    } catch (e) {
      console.error(`[usePageTheme] Error parsing page-themes:`, e);
      if (pagePath.includes("/orders")) setTheme("light");
    }
  }, [pagePath, setTheme]);
}
