"use client";
import Image from "next/image";
import React from "react";
import Combobox from "@/components/ui/combobox";

type Item = { id: string; name: string; logoUrl?: string };

export default function RestaurantsPage() {
  const [items, setItems] = React.useState<Item[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<string | undefined>();

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch("/api/restaurants")
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        setItems((d.items || []) as Item[]);
      })
      .catch((e) => setError(String(e?.message || e)))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Restoranlar</h1>

      <div>
        <Combobox
          mode="input"
          options={items.map((r) => ({
            value: r.id,
            label: r.name,
            logo: r.logoUrl,
          }))}
          value={selected}
          onChange={setSelected}
          inputPlaceholder="Restoran nomini qidiring"
        />
      </div>
      {loading && <div className="text-sm text-gray-600">Yuklanmoqda…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {!loading && items.length === 0 && (
        <div className="text-sm text-gray-600">Hozircha ma'lumot yo'q.</div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {(selected ? items.filter((r) => r.id === selected) : items).map(
          (r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 border rounded-lg p-3 bg-white"
            >
              <div className="relative size-12 overflow-hidden rounded">
                {r.logoUrl ? (
                  <Image
                    src={r.logoUrl}
                    alt={r.name}
                    fill
                    className="object-contain"
                  />
                ) : (
                  <div className="size-full grid place-items-center bg-gray-100 text-gray-500 text-xs">
                    No logo
                  </div>
                )}
              </div>
              <div className="font-medium">{r.name}</div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
