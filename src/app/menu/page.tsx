"use client";
import React from "react";
import Combobox from "@/components/ui/combobox";
import Image from "next/image";

type Option = { value: string; label: string; logo?: string };

export default function Page() {
  const [selected, setSelected] = React.useState<string | undefined>();
  const [meals, setMeals] = React.useState<Option[]>([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    let mounted = true;
    const MIN_SKELETON_MS = 600; // minimum shimmer visibility
    const start = Date.now();
    fetch("/api/menu")
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        const items = (d.items || []) as Array<{
          id: string;
          name: string;
          slug: string;
          logoUrl?: string;
        }>;
        const opts: Option[] = items.map((it) => ({
          value: it.id,
          label: it.name,
          logo: it.logoUrl,
        }));
        setMeals(opts);
      })
      .catch(() => {})
      .finally(() => {
        if (!mounted) return;
        const elapsed = Date.now() - start;
        const remain = Math.max(0, MIN_SKELETON_MS - elapsed);
        if (remain === 0) setLoading(false);
        else setTimeout(() => mounted && setLoading(false), remain);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div className="relative h-40 w-full overflow-hidden rounded-md">
        <Image
          src="/dashboard.png"
          alt="Food background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/10" />
      </div>
      <div>
        <Combobox
          mode="input"
          options={meals}
          value={selected}
          onChange={setSelected}
          inputPlaceholder="Taom nomini kiriting"
          loading={loading}
        />
      </div>

      {selected && (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Image
            src={meals.find((r) => r.value === selected)?.logo || ""}
            alt="Logo"
            width={50}
            height={50}
            className="rounded"
          />
          <span>{meals.find((r) => r.value === selected)?.label}</span>
        </div>
      )}
    </div>
  );
}
