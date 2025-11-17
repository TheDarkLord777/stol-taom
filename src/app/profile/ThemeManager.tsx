'use client';

import React from 'react';
import { useTheme, type ThemeMode } from '@/lib/theme-context';

type PageThemeConfig = {
    name: string;
    path: string;
    currentTheme: 'dark' | 'light';
};

export default function ThemeManager() {
    let themeContext;
    try {
        themeContext = useTheme();
    } catch (e) {
        console.error('ThemeManager: useTheme hook failed', e);
        return (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-xs text-red-300">
                <p><strong>Xato:</strong> Tema sozlamasi mavjud emas. ThemeProvider qayta yuklang.</p>
            </div>
        );
    }

    const { theme, setTheme: setThemeFromContext } = themeContext;

    const setTheme = (newTheme: ThemeMode) => {
        try {
            setThemeFromContext(newTheme);
            console.log(`[ThemeManager] Theme changed to: ${newTheme}`);
        } catch (e) {
            console.error(`[ThemeManager] Error setting theme to ${newTheme}:`, e);
        }
    };
    const [pages, setPages] = React.useState<PageThemeConfig[]>([
        { name: 'Home', path: '/home', currentTheme: 'dark' },
        { name: 'Login', path: '/login', currentTheme: 'dark' },
        { name: 'Register', path: '/register', currentTheme: 'dark' },
        { name: 'Menu', path: '/menu', currentTheme: 'light' },
        { name: 'Reservation', path: '/reservation', currentTheme: 'light' },
        { name: 'Profile', path: '/profile', currentTheme: 'dark' },
        { name: 'Orders', path: '/orders', currentTheme: 'dark' },
    ]);

    // Load and save per-page themes from localStorage
    React.useEffect(() => {
        const saved = localStorage.getItem('page-themes');
        if (saved) {
            try {
                setPages(JSON.parse(saved));
            } catch (e) {
                console.error('[ThemeManager] Failed to load page-themes from localStorage:', e);
            }
        }
    }, []);

    // Save per-page themes whenever they change
    React.useEffect(() => {
        localStorage.setItem('page-themes', JSON.stringify(pages));
        console.log('[ThemeManager] Saved page-themes to localStorage:', pages);
    }, [pages]);

    const togglePageTheme = (path: string) => {
        setPages(prev => {
            const next = prev.map(p =>
                p.path === path
                    ? { ...p, currentTheme: p.currentTheme === 'dark' ? 'light' : 'dark' }
                    : p
            );
            // If we're toggling the current page, apply the theme immediately
            try {
                const cfg = next.find((pp) => currentPath.includes(pp.path));
                if (cfg) {
                    setThemeFromContext(cfg.currentTheme as ThemeMode);
                }
            } catch (e) {
                // ignore
            }
            return next;
        });
    };

    const currentPath = React.useMemo(() => {
        if (typeof window === 'undefined') return '';
        return window.location.pathname;
    }, []);

    const getCurrentPageConfig = () => {
        return pages.find(p => currentPath.includes(p.path));
    };

    return (
        <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3">Joriy sahifa tema: <span className="text-blue-400">{theme === 'dark' ? '🌙 Dark' : '☀️ Light'}</span></h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setTheme('dark')}
                        className={`px-4 py-2 rounded text-sm font-medium transition ${theme === 'dark'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                            }`}
                    >
                        🌙 Dark
                    </button>
                    <button
                        onClick={() => setTheme('light')}
                        className={`px-4 py-2 rounded text-sm font-medium transition ${theme === 'light'
                            ? 'bg-yellow-500 text-black'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                            }`}
                    >
                        ☀️ Light
                    </button>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3">Barcha sahifalar tema sozlamalari</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {pages.map((page) => (
                        <div key={page.path} className="flex items-center justify-between p-2 bg-white/5 rounded">
                            <span className="text-sm">{page.name}</span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => togglePageTheme(page.path)}
                                    className={`px-2 py-1 rounded text-xs font-medium transition ${page.currentTheme === 'dark'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-yellow-500 text-black'
                                        }`}
                                >
                                    {page.currentTheme === 'dark' ? '🌙' : '☀️'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-300">
                <p><strong>Eslatma:</strong> Sahifa tema sozlamalari `localStorage` ga saqlanadi va qayta yuklanganda tiklanadi. Agar siz sahifa uchun tema o'rnatsangiz, u darhol joriy sahifaga tatbiq etiladi.</p>
            </div>
        </div>
    );
}
