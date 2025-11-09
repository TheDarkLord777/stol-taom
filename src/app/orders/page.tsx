"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type CartItem = {
  id: string;
  menuItemId: string;
  name: string;
  clientItemId?: string | null;
  ingredients?: Array<{ id?: string; name: string }> | null;
  quantity: number;
  price?: number | null;
  addedAt?: string | null;
};

export default function OrdersPage() {
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCart = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cart", { credentials: "same-origin" });
      if (res.status === 401) {
        setItems([]);
        setError("Siz tizimga kirmagansiz. Iltimos ");
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Server error");
      setItems(data.items ?? []);
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      setError(m);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCart();
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

      {items && items.length > 0 && (
        <div className="space-y-4">
          {items.map((it) => (
            <div key={it.id} className="p-4 bg-white/80 rounded shadow">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-lg">{it.name}</div>
                  <div className="text-sm text-gray-600">Soni: {it.quantity}</div>
                  {it.ingredients && it.ingredients.length > 0 && (
                    <div className="text-sm text-gray-700 mt-2">
                      Tarkibi: {it.ingredients.map((ing) => ing.name).join(", ")}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold">{it.price ? `${it.price} so'm` : "-"}</div>
                  {it.addedAt && <div className="text-xs text-gray-500">{new Date(it.addedAt).toLocaleString()}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
