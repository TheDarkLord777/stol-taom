'use client';

import React from 'react';
import { usePageTheme } from '@/lib/use-page-theme';
import MenuGrid, { type MenuItem } from '@/components/MenuGrid';
import ExplorerClient from './ExplorerClient';

export default function MenuPageClient() {
    // Apply per-page theme from localStorage (default: light for /menu)
    usePageTheme('/menu');

    const [query, setQuery] = React.useState('');
    const [items, setItems] = React.useState<MenuItem[] | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        let mounted = true;
        setLoading(true);
        fetch('/api/menu')
            .then((r) => r.json())
            .then((d) => {
                if (!mounted) return;
                const list = (d.items || []) as Array<{
                    id: string;
                    name: string;
                    slug?: string;
                    logoUrl?: string;
                    createdAt?: number;
                }>;
                const mapped: MenuItem[] = list.map((it) => ({
                    id: it.id,
                    name: it.name,
                    slug: it.slug,
                    logoUrl: it.logoUrl,
                    createdAt: it.createdAt,
                }));
                setItems(mapped);
            })
            .catch(() => {
                if (!mounted) return;
                setItems([]);
            })
            .finally(() => {
                if (!mounted) return;
                setLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, []);

    return (
        <main className="mx-auto max-w-6xl p-6">
            <h1 className="mb-6 text-2xl font-bold">Menyu</h1>
            {/* Show the previous explorer/search UI first so it's visible at the top */}
            <ExplorerClient
                onQueryChange={setQuery}
                items={items?.map((it) => ({
                    value: it.id,
                    label: it.name,
                    logo: it.logoUrl,
                }))}
                loading={loading}
            />
            <MenuGrid
                items={items ?? undefined}
                query={query}
                loading={loading}
                columns={3}
            />
        </main>
    );
}
