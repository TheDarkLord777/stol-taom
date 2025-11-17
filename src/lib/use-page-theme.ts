'use client';

import { useLayoutEffect } from 'react';
import { useTheme } from './theme-context';

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
        const saved = localStorage.getItem('page-themes');
        if (!saved) {
            console.log(`[usePageTheme] No page-themes config found for ${pagePath}`);
            return;
        }

        try {
            const pages = JSON.parse(saved) as Array<{ path: string; currentTheme: 'dark' | 'light' }>;
            const pageConfig = pages.find(p => pagePath.includes(p.path));

            if (pageConfig) {
                console.log(`[usePageTheme] Applying theme for ${pagePath}: ${pageConfig.currentTheme}`);
                setTheme(pageConfig.currentTheme);
            } else {
                console.log(`[usePageTheme] No config found for ${pagePath}, using default dark`);
                setTheme('dark');
            }
        } catch (e) {
            console.error(`[usePageTheme] Error parsing page-themes:`, e);
            setTheme('dark');
        }
    }, [pagePath, setTheme]);
}
