"use client";

import React, { useEffect, useState } from "react";
import { ThemeContext, type ThemeMode } from "@/lib/theme-context";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [mounted, setMounted] = useState(false);

  // Hydration-safe initialization
  useEffect(() => {
    // Client-side only: apply theme to <html> element
    const applyTheme = (mode: ThemeMode) => {
      const root = document.documentElement;
      if (mode === "light") {
        root.classList.remove("dark");
        root.classList.add("light");
      } else {
        root.classList.remove("light");
        root.classList.add("dark");
      }
    };

    // Check if there's a stored preference
    const stored = localStorage.getItem("app-theme") as ThemeMode | null;
    if (stored) {
      setThemeState(stored);
      applyTheme(stored);
    } else {
      // Default to dark - ensure dark class is applied
      applyTheme("dark");
    }

    setMounted(true);
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem("app-theme", newTheme);
    // Apply to DOM immediately
    const root = document.documentElement;
    if (newTheme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
  };

  // Hydration: ensure dark class is present on mount before rendering children
  // This prevents flash of light mode and ensures Tailwind dark: classes work
  useEffect(() => {
    // Double-check dark class is set on initial mount
    const root = document.documentElement;
    if (!root.classList.contains("dark") && !root.classList.contains("light")) {
      root.classList.add("dark");
    }
  }, [mounted]);

  // Prevent rendering until client-side hydration
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
