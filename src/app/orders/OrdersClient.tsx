"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast, Toaster } from 'sonner';
import { useTheme } from '@/lib/theme-context';
import { usePageTheme } from "@/lib/use-page-theme";
import type { CartItem } from '@/lib/cart';
import { RefreshCw, ArrowLeft, ShoppingBasket, ArrowBigLeft, Trash, ShieldPlus } from "lucide-react";
import Shimmer from "@/components/ui/Shimmer";

export default function OrdersClient() {
    usePageTheme('/orders');
    const router = useRouter();
    const { theme } = useTheme();
    const subtleText = theme === 'light' ? 'text-gray-700' : 'text-gray-300';
    const mutedText = theme === 'light' ? 'text-gray-500' : 'text-gray-400';
    const controlBg = theme === 'light' ? 'bg-gray-100' : 'bg-gray-800/60';
    const cardBase = theme === 'light' ? 'bg-white' : 'bg-gray-800/60';

    type LocalItem = CartItem & { paid?: boolean; orderId?: string; logoUrl?: string };

    const [items, setItems] = useState<LocalItem[] | null>(null);
    const [reservations, setReservations] = useState<any[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    // track per-item removal state to show spinner while deleting
    const [removingMap, setRemovingMap] = useState<Record<string, boolean>>({});
    const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
    const [selectedResMap, setSelectedResMap] = useState<Record<string, boolean>>({});
    const [removingResMap, setRemovingResMap] = useState<Record<string, boolean>>({});
    const [updatingMap, setUpdatingMap] = useState<Record<string, boolean>>({});
    // fallback/compat: also keep a Set of selected ids for reliable multi-select
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const fetchCart = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/orders", { credentials: "same-origin" });
            if (res.status === 401) {
                setItems([]);
                setError("Siz tizimga kirmagansiz. Iltimos ");
                setLoading(false);
                return;
            }
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "Server error");
            setItems(data.items ?? []);
            setReservations(data.reservations ?? []);
            setSelectedMap({});
            setSelectedIds(new Set());
        } catch (e: unknown) {
            const m = e instanceof Error ? e.message : String(e);
            setError(m);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchCart();
        // listen for cross-tab order updates
        let bc: BroadcastChannel | null = null;
        try {
            bc = new BroadcastChannel("orders");
            bc.addEventListener("message", (ev) => {
                if (ev.data && ev.data.type === "orders:update") void fetchCart();
            });
        } catch { }
        return () => {
            if (bc) bc.close();
        };
    }, []);

    // Split items into paid vs unpaid and group paid items by date (YYYY-MM-DD)
    const paidItems = (items ?? []).filter((x) => Boolean((x as LocalItem).paid));
    const unpaidItems = (items ?? []).filter((x) => !x.paid);

    const groupedPaid = useMemo(() => {
        const m: Record<string, LocalItem[]> = {};
        for (const it of paidItems) {
            const ts = (it as any).addedAt || (it as any).createdAt || Date.now();
            const d = new Date(typeof ts === 'number' ? ts : String(ts));
            const key = d.toISOString().slice(0, 10);
            if (!m[key]) m[key] = [];
            m[key].push(it);
        }
        return m;
    }, [paidItems]);

    return (
        <div className="p-4 max-w-3xl mx-auto">
            {/* Desktop-only fixed back button (top-left). Visible on md+ screens, stays while scrolling. */}
            <Button
                onClick={() => router.push('/home')}
                className={
                    `fixed top-4 left-4 z-50 hidden md:flex h-10 w-10 p-0 items-center justify-center shadow-md cursor-pointer hover:opacity-90 ` +
                    (theme === 'light' ? 'bg-white text-black border border-gray-200' : 'bg-black text-white')
                }
                aria-label="Orqaga"
                title="Orqaga"
            >
                <ArrowBigLeft className="h-5 w-5" />
            </Button>
            <Toaster position="top-right" />
            <div className="flex gap-2 items-center">
                <Button
                    onClick={() => void fetchCart()}
                    className="h-10 w-10 p-0 flex items-center justify-center bg-gray-200 text-black cursor-pointer"
                    aria-label="Yangilash"
                    title="Yangilash"
                    disabled={loading}
                >
                    <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
                </Button>

                <Link href="/menu">
                    <Button
                        className="h-10 px-3 py-0 flex items-center justify-center bg-[#C8FF00] text-black gap-2 cursor-pointer"
                        aria-label="Menyuga qaytish"
                        title="Menyuga qaytish"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="text-sm font-medium">Menyuga qaytish</span>
                    </Button>
                </Link>
            </div>

            {loading && (
                <div className="space-y-6" aria-busy>
                    <div className="animate-pulse space-y-4">
                        {[1, 2, 3].map((n) => (
                            <div key={n} className={`p-4 rounded shadow flex items-start gap-4 ${cardBase}`}>
                                <Shimmer className="h-12 w-12 rounded" />
                                <div className="flex-1 space-y-2">
                                    <Shimmer className="h-4 w-1/3 rounded" />
                                    <Shimmer className="h-3 w-1/2 rounded" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Shimmer className="h-8 w-20 rounded" />
                                    <Shimmer className="h-8 w-24 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6">
                        <div className="space-y-3">
                            {[1, 2].map((r) => (
                                <div key={r} className={`p-3 rounded shadow flex justify-between items-center ${cardBase}`}>
                                    <div className="flex items-center gap-3">
                                        <Shimmer className="h-4 w-4 rounded" />
                                        <Shimmer className="h-4 w-48 rounded" />
                                        <Shimmer className="h-3 w-24 rounded" />
                                    </div>
                                    <Shimmer className="h-4 w-20 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Paid items grouped by date (shown after reservations) */}
            {(items ?? []).some((x) => x.paid) && (
                <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-3">To'langanlar</h2>
                    <div className="space-y-4">
                        {Object.keys(groupedPaid).sort((a, b) => b.localeCompare(a)).map((dateKey) => (
                            <div key={dateKey} className="rounded p-3 bg-gray-50 dark:bg-gray-900">
                                <div className="text-sm text-gray-500 mb-2">{new Date(dateKey).toLocaleDateString()}</div>
                                <div className="space-y-2">
                                    {groupedPaid[dateKey].map((it) => (
                                        <div key={it.id} className={`p-2 rounded flex items-center justify-between ${cardBase}`}>
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                                                    {it.logoUrl ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={it.logoUrl as string} alt={it.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <ShoppingBasket className="h-5 w-5 text-gray-400" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-medium truncate">{it.name}</div>
                                                    <div className={`text-sm ${subtleText}`}>x{it.quantity} • {it.price ? `${it.price} so'm` : '-'}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {it.orderId ? <a href={`/orders?orderId=${it.orderId}`} className="text-sm underline">Buyurtma</a> : <span className="text-sm text-gray-500">—</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-4 text-red-600">
                    {error} {error.includes("tizimga") ? <Link href="/login" className="underline">Kirish</Link> : null}
                </div>
            )}

            {items && items.length === 0 && !loading && (
                <div className={`text-center ${mutedText}`}>Savat bo'sh. / Hech qanday element qo'shilmagan.</div>
            )}

            {/* Orders section */}
            {/* (paid items will be rendered below after reservations) */}

            {unpaidItems && unpaidItems.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={
                                    unpaidItems.length > 0 && unpaidItems.every((x) => selectedIds.has(x.id))
                                }
                                onChange={(e) => {
                                    const checked = (e.target as HTMLInputElement).checked;
                                    if (checked) {
                                        const s = new Set<string>();
                                        for (const it of unpaidItems) s.add(it.id);
                                        setSelectedIds(s);
                                    } else {
                                        setSelectedIds(new Set());
                                    }
                                }}
                            />
                            <span>Hammasini tanlash (faqat savat bo'limi)</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={async () => {
                                    const ids = unpaidItems.filter((x) => selectedIds.has(x.id)).map((x) => x.id);
                                    if (ids.length === 0) return;
                                    setRemovingMap((m) => {
                                        const next = { ...m };
                                        for (const id of ids) next[id] = true;
                                        return next;
                                    });
                                    try {
                                        for (const id of ids) {
                                            await fetch("/api/cart/remove", {
                                                method: "DELETE",
                                                headers: { "Content-Type": "application/json" },
                                                credentials: "same-origin",
                                                body: JSON.stringify({ id }),
                                            });
                                        }
                                    } finally {
                                        await fetchCart();
                                        setRemovingMap({});
                                    }
                                }}
                                className="h-10 px-3 py-0 flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white"
                            >
                                <Trash className="h-4 w-4" />
                                <span className="text-sm">Tanlanganlarni o'chirish</span>
                            </Button>
                            <Button
                                onClick={async () => {
                                    // simple Pay-at-Counter checkout for selected items or whole cart
                                    const ids = unpaidItems.filter((x) => selectedIds.has(x.id)).map((x) => x.id);
                                    try {
                                        const res = await fetch('/api/cart/checkout', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            credentials: 'same-origin',
                                            body: JSON.stringify({ ids: ids.length > 0 ? ids : undefined, paymentMethod: 'counter' }),
                                        });
                                        const data = await res.json().catch(() => ({}));
                                        if (!res.ok) throw new Error(data?.error || 'Checkout failed');
                                        try { toast.success("Buyurtma qabul qilindi. Menedjerga ko‘rinadi."); } catch { }
                                        await fetchCart();
                                    } catch (e) {
                                        try { toast.error(String((e as Error).message || e)); } catch { }
                                        await fetchCart();
                                    }
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                Tanlanganlarni to'lash (Joyida to'lash)
                            </Button>
                        </div>
                    </div>
                    {unpaidItems.map((it) => (
                        <div key={it.id} className={`p-4 rounded shadow flex items-start gap-4 ${cardBase}`}>
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(it.id)}
                                    onChange={(e) => {
                                        const checked = (e.target as HTMLInputElement).checked;
                                        setSelectedIds((prev) => {
                                            const next = new Set(prev);
                                            if (checked) next.add(it.id);
                                            else next.delete(it.id);
                                            return next;
                                        });
                                    }}
                                    className="mt-1 shrink-0"
                                />
                                <div className={`relative h-12 w-12 shrink-0 overflow-hidden rounded ${theme === 'light' ? 'bg-gray-100' : 'bg-gray-800/60'} flex items-center justify-center`}>
                                    {it.logoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={it.logoUrl as string}
                                            alt={it.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <ShoppingBasket className={`h-6 w-6 ${mutedText}`} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-lg">{it.name}</div>
                                    {it.ingredients && it.ingredients.length > 0 && (
                                        <div className={`text-sm ${subtleText} mt-1`}>Tarkibi: {it.ingredients.map((ing) => ing.name).join(", ")}</div>
                                    )}
                                    {it.addedAt && <div className={`text-xs ${mutedText} mt-1`}>{new Date(it.addedAt).toLocaleString()}</div>}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className={`flex items-center gap-2 rounded px-2 py-1 ${controlBg}`}>
                                    <button
                                        type="button"
                                        disabled={Boolean(updatingMap[it.id]) || Boolean(it.paid)}
                                        className={`px-2 py-1 rounded ${theme === 'light' ? 'bg-gray-100' : 'bg-gray-700'} ${updatingMap[it.id] ? 'opacity-70 cursor-wait' : ''}`}
                                        onClick={async () => {
                                            const newQty = Math.max(0, it.quantity - 1);
                                            // optimistic update
                                            setUpdatingMap((m) => ({ ...m, [it.id]: true }));
                                            setItems((prev) => (prev ? prev.map((x) => (x.id === it.id ? { ...x, quantity: newQty } : x)) : prev));
                                            try {
                                                const res = await fetch("/api/cart/update", {
                                                    method: "PATCH",
                                                    headers: { "Content-Type": "application/json" },
                                                    credentials: "same-origin",
                                                    body: JSON.stringify({ id: it.id, quantity: newQty }),
                                                });
                                                if (!res.ok) throw new Error("update-failed");
                                                const data = await res.json().catch(() => ({}));
                                                if (data.removed) {
                                                    setItems((prev) => (prev ? prev.filter((x) => x.id !== it.id) : prev));
                                                } else if (data.item) {
                                                    setItems((prev) => (prev ? prev.map((x) => (x.id === it.id ? { ...x, quantity: data.item.quantity } : x)) : prev));
                                                }
                                            } catch (e) {
                                                // rollback by refetching
                                                await fetchCart();
                                            } finally {
                                                setUpdatingMap((m) => ({ ...m, [it.id]: false }));
                                            }
                                        }}
                                    >
                                        -
                                    </button>

                                    <div className="px-3 font-medium">{it.quantity}</div>

                                    <button
                                        type="button"
                                        disabled={Boolean(updatingMap[it.id]) || Boolean(it.paid)}
                                        className={`px-2 py-1 rounded ${theme === 'light' ? 'bg-gray-100' : 'bg-gray-700'} ${updatingMap[it.id] ? 'opacity-70 cursor-wait' : ''}`}
                                        onClick={async () => {
                                            const newQty = it.quantity + 1;
                                            // optimistic update
                                            setUpdatingMap((m) => ({ ...m, [it.id]: true }));
                                            setItems((prev) => (prev ? prev.map((x) => (x.id === it.id ? { ...x, quantity: newQty } : x)) : prev));
                                            try {
                                                const res = await fetch("/api/cart/update", {
                                                    method: "PATCH",
                                                    headers: { "Content-Type": "application/json" },
                                                    credentials: "same-origin",
                                                    body: JSON.stringify({ id: it.id, quantity: newQty }),
                                                });
                                                if (!res.ok) throw new Error("update-failed");
                                                const data = await res.json().catch(() => ({}));
                                                if (data.item) {
                                                    setItems((prev) => (prev ? prev.map((x) => (x.id === it.id ? { ...x, quantity: data.item.quantity } : x)) : prev));
                                                }
                                            } catch (e) {
                                                await fetchCart();
                                            } finally {
                                                setUpdatingMap((m) => ({ ...m, [it.id]: false }));
                                            }
                                        }}
                                    >
                                        +
                                    </button>
                                </div>

                                <div className="text-right mr-2">
                                    <div className="font-bold">{it.price ? `${it.price} so'm` : "-"}</div>
                                </div>

                                {it.paid ? (
                                    <div className="inline-flex items-center gap-2">
                                        <span className="inline-block px-3 py-1 rounded bg-emerald-600 text-white text-sm">To'langan</span>
                                        {it.orderId ? (
                                            <a href={`/orders?orderId=${it.orderId}`} className="text-sm underline">Buyurtma</a>
                                        ) : null}
                                    </div>
                                ) : (
                                    <Button
                                        onClick={async () => {
                                            try {
                                                const res = await fetch('/api/cart/checkout', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    credentials: 'same-origin',
                                                    body: JSON.stringify({ ids: [it.id], paymentMethod: 'counter' }),
                                                });
                                                const data = await res.json().catch(() => ({}));
                                                if (!res.ok) throw new Error(data?.error || 'Checkout failed');
                                                try { toast.success("To'landi"); } catch { }
                                                await fetchCart();
                                            } catch (e) {
                                                try { toast.error(String((e as Error).message || e)); } catch { }
                                                await fetchCart();
                                            }
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                        To'lash
                                    </Button>
                                )}

                                <button
                                    className={
                                        `px-3 py-1 rounded text-white transition-colors duration-150 focus:outline-none ` +
                                        (removingMap[it.id] ? "bg-red-600 opacity-80 cursor-wait" : "bg-red-500 hover:bg-red-600")
                                    }
                                    onClick={async () => {
                                        // mark as removing
                                        setRemovingMap((m) => ({ ...m, [it.id]: true }));
                                        try {
                                            const res = await fetch("/api/cart/remove", {
                                                method: "DELETE",
                                                headers: { "Content-Type": "application/json" },
                                                credentials: "same-origin",
                                                body: JSON.stringify({ id: it.id }),
                                            });
                                            if (!res.ok) throw new Error("remove-failed");
                                            setItems((prev) => (prev ? prev.filter((x) => x.id !== it.id) : prev));
                                        } catch (e) {
                                            await fetchCart();
                                        } finally {
                                            setRemovingMap((m) => ({ ...m, [it.id]: false }));
                                        }
                                    }}
                                    disabled={Boolean(removingMap[it.id])}
                                    aria-busy={Boolean(removingMap[it.id])}
                                >
                                    {removingMap[it.id] ? (
                                        <span className="inline-flex items-center gap-2">
                                            <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                            </svg>
                                            O'chirilmoqda...
                                        </span>
                                    ) : (
                                        "O'chirish"
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reservations section */}
            {reservations && reservations.length > 0 && (
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <ShieldPlus className="h-5 w-5" />
                            <span>Bronlar</span>
                        </h2>
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={reservations.every((x) => selectedResMap[x.id])}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        const next: Record<string, boolean> = {};
                                        for (const r of reservations) next[r.id] = checked;
                                        setSelectedResMap(next);
                                    }}
                                />
                                <span>Hammasini tanlash</span>
                            </label>
                            <Button
                                onClick={async () => {
                                    const ids = reservations.filter((x) => selectedResMap[x.id]).map((x) => x.id);
                                    if (ids.length === 0) return;
                                    setRemovingResMap((m) => {
                                        const next = { ...m };
                                        for (const id of ids) next[id] = true;
                                        return next;
                                    });
                                    try {
                                        for (const id of ids) {
                                            await fetch("/api/reservations/remove", {
                                                method: "DELETE",
                                                headers: { "Content-Type": "application/json" },
                                                credentials: "same-origin",
                                                body: JSON.stringify({ id }),
                                            });
                                        }
                                    } finally {
                                        await fetchCart();
                                        setRemovingResMap({});
                                        setSelectedResMap({});
                                    }
                                }}
                                className="h-10 px-3 py-0 flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white"
                            >
                                <Trash className="h-4 w-4" />
                                <span className="text-sm">Tanlanganlarni o'chirish</span>
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {reservations.map((r) => (
                            <div key={r.id} className={`p-4 rounded shadow flex items-start justify-between gap-4 ${cardBase}`}>
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(selectedResMap[r.id])}
                                        onChange={(e) => setSelectedResMap((m) => ({ ...m, [r.id]: e.target.checked }))}
                                        className="mt-1 shrink-0"
                                    />
                                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-gray-100 flex items-center justify-center">
                                        {r.logoUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={r.logoUrl} alt={r.restaurantName ?? "Bron"} className="h-full w-full object-cover" />
                                        ) : (
                                            <ShoppingBasket className="h-6 w-6 text-gray-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-lg">{r.restaurantName ?? "Bron"}</div>
                                        <div className={`text-sm ${subtleText} mt-1`}>
                                            {r.fromDate ? (
                                                (() => {
                                                    const from = new Date(r.fromDate);
                                                    const to = r.toDate ? new Date(r.toDate) : null;
                                                    const dateStr = from.toLocaleDateString();
                                                    const timeFrom = from.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                    const timeTo = to ? to.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
                                                    const rangeStr = timeTo ? `${timeFrom} - ${timeTo}` : `${timeFrom}`;
                                                    let durationText = '';
                                                    if (to) {
                                                        const diffMin = Math.round((to.getTime() - from.getTime()) / 60000);
                                                        if (diffMin % 60 === 0) durationText = `${diffMin / 60} soat`;
                                                        else durationText = `${diffMin} min`;
                                                    }
                                                    return (
                                                        <div>
                                                            <div>Sana: <span className="font-medium">{dateStr}</span></div>
                                                            <div>Vaqt: <span className="font-medium">{rangeStr}{durationText ? ` (${durationText})` : ''}</span></div>
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                'Sana: —'
                                            )}
                                        </div>
                                        {r.partySize && <div className={`text-sm ${subtleText} mt-1`}>Odamlar: {r.partySize}</div>}
                                        {r.tableBreakdown && (
                                            <div className={`text-sm ${subtleText} mt-1`}>
                                                Stollar: {Object.entries(r.tableBreakdown as Record<string, number>).filter(([, c]) => Number(c) > 0).map(([size, cnt]) => `${Number(cnt)}×${size}`).join(', ')}{r.tablesCount ? ` — Jami stol: ${r.tablesCount}` : ''}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className={`text-right mr-2 text-sm ${mutedText}`}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</div>
                                    <Button onClick={() => alert('Yaqinda qo`shiladi: bron uchun to`lov')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                        To'lash
                                    </Button>
                                    <button
                                        className={
                                            `px-3 py-1 rounded text-white transition-colors duration-150 focus:outline-none ` +
                                            (removingResMap[r.id] ? "bg-red-600 opacity-80 cursor-wait" : "bg-red-500 hover:bg-red-600")
                                        }
                                        onClick={async () => {
                                            setRemovingResMap((m) => ({ ...m, [r.id]: true }));
                                            try {
                                                await fetch("/api/reservations/remove", {
                                                    method: "DELETE",
                                                    headers: { "Content-Type": "application/json" },
                                                    credentials: "same-origin",
                                                    body: JSON.stringify({ id: r.id }),
                                                });
                                                await fetchCart();
                                            } finally {
                                                setRemovingResMap((m) => ({ ...m, [r.id]: false }));
                                            }
                                        }}
                                        disabled={Boolean(removingResMap[r.id])}
                                        aria-busy={Boolean(removingResMap[r.id])}
                                    >
                                        {removingResMap[r.id] ? "O'chirilmoqda..." : "O'chirish"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
