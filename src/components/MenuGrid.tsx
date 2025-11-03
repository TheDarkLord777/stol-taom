"use client";
import Image from "next/image";
import * as React from "react";

export type MenuItem = {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    price?: string;
    logoUrl?: string;
    createdAt?: number;
};

type Props = {
    items?: MenuItem[];
    // preferred columns on desktop (will be responsive)
    columns?: 1 | 2 | 3 | 4;
    // If provided, the grid will fetch items from this endpoint
    fetchUrl?: string;
    // Optional query to filter displayed items (client-side)
    query?: string;
    // number of loading skeletons to show while fetching
    loadingCount?: number;
    // external loading flag (page can pass its loading state so MenuGrid shows shimmer)
    loading?: boolean;
};

export default function MenuGrid({
    items,
    columns = 3,
    fetchUrl,
    query,
    loadingCount = 6,
    loading = false,
}: Props) {
    const [selected, setSelected] = React.useState<MenuItem | null>(null);
    const [detailLoading, setDetailLoading] = React.useState(false);
    const [detail, setDetail] = React.useState<{
        restaurants?: Array<{ id: string; name: string }>;
        description?: string;
    } | null>(null);
    const [fetched, setFetched] = React.useState<MenuItem[] | null>(null);
    const [internalLoading, setInternalLoading] = React.useState<boolean>(false);

    const loadingKeys = React.useMemo(
        () =>
            Array.from({ length: Math.max(0, loadingCount) }).map(
                (_, i) => `loading-${i}`,
            ),
        [loadingCount],
    );

    React.useEffect(() => {
        if (!fetchUrl) return;
        let mounted = true;
        setInternalLoading(true);
        fetch(fetchUrl)
            .then((r) => r.json())
            .then((d) => {
                if (!mounted) return;
                // Accept either { items: [...] } or an array response
                const list = Array.isArray(d) ? d : (d.items ?? []);
                setFetched(list as MenuItem[]);
            })
            .catch(() => {
                if (!mounted) return;
                setFetched([]);
            })
            .finally(() => {
                if (!mounted) return;
                setInternalLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, [fetchUrl]);
    const colsClass = React.useMemo(() => {
        switch (columns) {
            case 1:
                return "grid-cols-1";
            case 2:
                return "sm:grid-cols-2 md:grid-cols-2";
            case 3:
                return "sm:grid-cols-2 md:grid-cols-3";
            case 4:
                return "sm:grid-cols-2 md:grid-cols-4";
            default:
                return "sm:grid-cols-2 md:grid-cols-3";
        }
    }, [columns]);

    // decide which items to render: explicit prop has priority, otherwise fetched
    const sourceItems = items ?? fetched ?? [];
    const isLoading = (fetchUrl ? internalLoading : false) || Boolean(loading);
    // apply client-side query filtering if provided
    const visibleItems = React.useMemo(() => {
        if (!query?.trim()) return sourceItems;
        const q = query.toLowerCase();
        // Use substring matching so typing any part of the name will match
        return sourceItems.filter((s) => s.name.toLowerCase().includes(q));
    }, [sourceItems, query]);

    // open detail modal for an item
    const openDetail = (it: MenuItem) => {
        setSelected(it);
        setDetail(null);
        setDetailLoading(true);
        // try fetching a detail route; if not present, we'll show fallback
        fetch(`/api/menu/${it.id}`)
            .then((r) => {
                if (!r.ok) throw new Error("no-detail");
                return r.json();
            })
            .then((d) => {
                setDetail(d);
            })
            .catch(() => {
                setDetail(null);
            })
            .finally(() => setDetailLoading(false));
    };

    // close modal and restore state
    const closeDetail = React.useCallback(() => {
        setSelected(null);
        setDetail(null);
        setDetailLoading(false);
    }, []);

    // global key handler for Escape to close modal
    React.useEffect(() => {
        if (!selected) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeDetail();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [selected, closeDetail]);

    return (
        <>
            <div className={`grid gap-6 ${colsClass}`}>
                {isLoading
                    ? loadingKeys.map((k) => (
                        <article
                            key={k}
                            className="flex flex-col overflow-hidden rounded-lg border bg-white/5 shadow-sm"
                        >
                            <div className="relative w-full bg-gray-100/5">
                                <div className="h-56 md:h-64 w-full bg-gray-200 shimmer" />
                            </div>
                            <div className="p-4 flex flex-col gap-2">
                                <div className="h-4 w-1/2 rounded bg-gray-200 shimmer" />
                                <div className="h-3 w-full rounded bg-gray-200 shimmer" />
                                <div className="mt-2 flex items-center justify-between">
                                    <div className="h-3 w-20 rounded bg-gray-200 shimmer" />
                                    <div className="h-8 w-20 rounded bg-gray-200 shimmer" />
                                </div>
                            </div>
                        </article>
                    ))
                    : visibleItems.map((it) => (
                        <button
                            key={it.id}
                            type="button"
                            className="flex flex-col overflow-hidden rounded-lg border bg-white/5 shadow-sm cursor-pointer text-left"
                            onClick={() => openDetail(it)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") openDetail(it);
                            }}
                        >
                            <div className="relative w-full bg-gray-100/5">
                                {it.imageUrl || it.logoUrl ? (
                                    // Keep a consistent aspect ratio so layout doesn't shift
                                    <div className="relative h-56 md:h-64 w-full">
                                        <Image
                                            src={(it.imageUrl ?? it.logoUrl) as string}
                                            alt={it.name}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        />
                                    </div>
                                ) : (
                                    <div className="h-56 md:h-64 w-full bg-white/3 flex items-center justify-center text-sm text-gray-400">
                                        Rasm yo'q
                                    </div>
                                )}
                            </div>

                            <div className="p-4 flex flex-col gap-2">
                                <h3 className="text-base font-semibold">{it.name}</h3>
                                {it.description ? (
                                    <p className="text-sm text-gray-300 line-clamp-3">
                                        {it.description}
                                    </p>
                                ) : null}
                                <div className="mt-2 flex items-center justify-between">
                                    <div className="text-sm text-gray-400">
                                        {it.price ?? ""}
                                    </div>
                                    <button
                                        type="button"
                                        className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90"
                                    >
                                        Buy
                                    </button>
                                </div>
                            </div>
                        </button>
                    ))}
            </div>

            {/* Detail modal (fullscreen) */}
            {selected ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
                    onClick={closeDetail}
                    onKeyDown={(e) => {
                        if (e.key === "Escape" || e.key === "Enter") closeDetail();
                    }}
                    aria-modal="true"
                    role="dialog"
                >
                    <div
                        className="relative mx-4 max-w-4xl transform overflow-hidden rounded bg-white shadow-lg transition-all duration-300 ease-out"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        role="document"
                    >
                        <button
                            type="button"
                            onClick={closeDetail}
                            aria-label="Close"
                            className="absolute right-3 top-3 z-10 rounded bg-white/80 px-2 py-1 text-sm shadow hover:bg-white"
                        >
                            ✕
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2">
                            <div className="relative h-80 md:h-[560px] w-full bg-gray-100">
                                {selected.imageUrl || selected.logoUrl ? (
                                    <Image
                                        src={(selected.imageUrl ?? selected.logoUrl) as string}
                                        alt={selected.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-gray-500">
                                        Rasm yo'q
                                    </div>
                                )}
                            </div>
                            <div className="p-6">
                                <h2 className="mb-2 text-2xl font-bold">{selected.name}</h2>
                                <div className="mb-4 text-sm text-gray-600">
                                    {detailLoading ? (
                                        <span>Yuklanmoqda…</span>
                                    ) : detail?.description ? (
                                        <p>{detail.description}</p>
                                    ) : (
                                        <p>Ta'rif mavjud emas.</p>
                                    )}
                                </div>

                                <h3 className="mb-2 text-lg font-semibold">
                                    Qaysi restoranlarda bor
                                </h3>
                                <div className="space-y-2">
                                    {detailLoading ? (
                                        <div className="h-3 w-40 rounded bg-gray-200 shimmer" />
                                    ) : detail?.restaurants && detail.restaurants.length > 0 ? (
                                        detail.restaurants.map((r) => (
                                            <div key={r.id} className="rounded border px-3 py-2">
                                                {r.name}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-sm text-gray-500">
                                            Bu ovqat qaysi restoranlarda borligi haqida ma'lumot yo'q.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
