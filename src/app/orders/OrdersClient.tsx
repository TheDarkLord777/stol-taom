"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePageTheme } from "@/lib/use-page-theme";

type CartItem = {
    id: string;
    menuItemId: string;
    name: string;
    clientItemId?: string | null;
    ingredients?: Array<{ id?: string; name: string }> | null;
    quantity: number;
    price?: number | null;
    addedAt?: string | null;
    logoUrl?: string | null;
};

export default function OrdersClient() {
    // Apply per-page theme from localStorage (default: dark for /orders)
    usePageTheme('/orders');
    const [items, setItems] = useState<CartItem[] | null>(null);
    const [reservations, setReservations] = useState<any[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    // track per-item removal state to show spinner while deleting
    const [removingMap, setRemovingMap] = useState<Record<string, boolean>>({});
    const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
    const [selectedResMap, setSelectedResMap] = useState<Record<string, boolean>>({});
    const [removingResMap, setRemovingResMap] = useState<Record<string, boolean>>({});

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

    return (
        <div className="p-4 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">Savat / Orders</h1>
                <div className="flex gap-2">
                    <Button onClick={() => void fetchCart()} className="bg-gray-200 text-black">Yangilash</Button>
                    <Link href="/menu">
                        <Button className="bg-[#C8FF00] text-black">Menyuga qaytish</Button>
                    </Link>
                </div>
            </div>

            {loading && <p>Yuklanmoqda...</p>}

            {error && (
                <div className="mb-4 text-red-600">
                    {error} {error.includes("tizimga") ? <Link href="/login" className="underline">Kirish</Link> : null}
                </div>
            )}

            {items && items.length === 0 && !loading && (
                <div className="text-center text-gray-600">Savat bo'sh. / Hech qanday element qo'shilmagan.</div>
            )}

            {/* Orders section */}
            {items && items.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={items.every((x) => selectedMap[x.id])}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    const next: Record<string, boolean> = {};
                                    for (const it of items) next[it.id] = checked;
                                    setSelectedMap(next);
                                }}
                            />
                            <span>Hammasini tanlash (faqat savat bo'limi)</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={async () => {
                                    const ids = items.filter((x) => selectedMap[x.id]).map((x) => x.id);
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
                            >
                                Tanlanganlarni o'chirish
                            </Button>
                            <Button
                                onClick={() => {
                                    const ids = items.filter((x) => selectedMap[x.id]).map((x) => x.id);
                                    if (ids.length === 0) return;
                                    alert(`Yaqinda qo'shiladi: ${ids.length} ta element uchun to'lov.`);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                Tanlanganlarni to'lash
                            </Button>
                        </div>
                    </div>
                    {items.map((it) => (
                        <div key={it.id} className="p-4 bg-white/80 rounded shadow flex items-start gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                <input
                                    type="checkbox"
                                    checked={Boolean(selectedMap[it.id])}
                                    onChange={(e) =>
                                        setSelectedMap((m) => ({ ...m, [it.id]: e.target.checked }))
                                    }
                                    className="mt-1 shrink-0"
                                />
                                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-gray-100 flex items-center justify-center">
                                    {it.logoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={it.logoUrl as string}
                                            alt={it.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-xs text-gray-500">No image</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-lg">{it.name}</div>
                                    {it.ingredients && it.ingredients.length > 0 && (
                                        <div className="text-sm text-gray-700 mt-1">Tarkibi: {it.ingredients.map((ing) => ing.name).join(", ")}</div>
                                    )}
                                    {it.addedAt && <div className="text-xs text-gray-500 mt-1">{new Date(it.addedAt).toLocaleString()}</div>}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-white rounded px-2 py-1">
                                    <button
                                        className="px-2 py-1 rounded bg-gray-100"
                                        onClick={async () => {
                                            const newQty = Math.max(0, it.quantity - 1);
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
                                                // fallback: refetch
                                                await fetchCart();
                                            }
                                        }}
                                    >
                                        -
                                    </button>

                                    <div className="px-3 font-medium">{it.quantity}</div>

                                    <button
                                        className="px-2 py-1 rounded bg-gray-100"
                                        onClick={async () => {
                                            const newQty = it.quantity + 1;
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
                                            }
                                        }}
                                    >
                                        +
                                    </button>
                                </div>

                                <div className="text-right mr-2">
                                    <div className="font-bold">{it.price ? `${it.price} so'm` : "-"}</div>
                                </div>

                                <Button
                                    onClick={() => alert("Yaqinda qo'shiladi: ushbu element uchun to'lov.")}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    To'lash
                                </Button>

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
                        <h2 className="text-xl font-semibold">Bronlar</h2>
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
                                <span>Hammasini tanlash (faqat bronlar bo'limi)</span>
                            </label>
                            <Button
                                variant="outline"
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
                            >
                                Tanlanganlarni o'chirish
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {reservations.map((r) => (
                            <div key={r.id} className="p-3 bg-white/80 rounded shadow flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(selectedResMap[r.id])}
                                        onChange={(e) =>
                                            setSelectedResMap((m) => ({ ...m, [r.id]: e.target.checked }))
                                        }
                                    />
                                    <div className="font-medium">{r.restaurantName ? `Restoran: ${r.restaurantName}` : "Bron"}</div>
                                    <div className="text-sm text-gray-600">Sana: {r.fromDate ? new Date(r.fromDate).toLocaleString() : "—"}</div>
                                    {r.partySize && <div className="text-sm text-gray-600">Odamlar: {r.partySize}</div>}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-sm text-gray-500">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</div>
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
