"use client";
import Image from "next/image";
import * as React from "react";
import Combobox from "@/components/ui/combobox";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowBigLeft } from "lucide-react";
import { useTheme } from '@/lib/theme-context';

type Option = { value: string; label: string; logo?: string };

export default function ExplorerClient({
  onQueryChange,
  items: initialItems,
  loading: initialLoading,
}: {
  onQueryChange?: (q: string) => void;
  items?: Option[];
  loading?: boolean;
}) {
  const [selected, setSelected] = React.useState<string | undefined>();
  const [meals, setMeals] = React.useState<Option[]>([]);
  const [loading, setLoading] = React.useState<boolean>(
    Boolean(initialLoading),
  );
  const router = useRouter();
  const { theme } = useTheme();

  React.useEffect(() => {
    let mounted = true;
    const MIN_SKELETON_MS = 600; // minimum shimmer visibility
    const start = Date.now();

    if (initialItems) {
      setMeals(initialItems);
      setLoading(Boolean(initialLoading));
      return () => {
        mounted = false;
      };
    }

    fetch("/api/menu")
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        const items = (d.items || []) as Array<{
          id: string;
          name: string;
          logoUrl?: string;
        }>;
        const opts: Option[] = items.map((it) => ({
          value: it.id,
          label: it.name,
          logo: it.logoUrl,
        }));
        setMeals(opts);
      })
      .catch(() => { })
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
  }, [initialItems, initialLoading]);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      {/* Desktop-only fixed back button (top-left). Visible on md+ screens, stays while scrolling. */}
      <Button
        onClick={() => router.back()}
        className={
          `fixed top-4 left-4 z-50 hidden md:flex h-10 w-10 p-0 items-center justify-center shadow-md cursor-pointer hover:opacity-90 ` +
          (theme === 'light'
            ? 'bg-white text-black border border-gray-200'
            : 'bg-black text-white')
        }
        aria-label="Orqaga"
        title="Orqaga"
      >
        <ArrowBigLeft className="h-5 w-5" />
      </Button>
      <div className="relative h-40 w-full overflow-hidden rounded-md">
        <Image
          src="/dashboard.png"
          alt="Food background"
          fill
          className="object-cover"
          priority={true}
        />
        <div className="absolute inset-0 bg-black/10" />
      </div>
      <div>
        <Combobox
          mode="input"
          options={meals}
          value={selected}
          onChange={setSelected}
          onQueryChange={onQueryChange}
          inputPlaceholder="Taom nomini kiriting"
          loading={loading}
          inputClassName={
            "w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 text-black dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:ring-2 dark:focus:ring-gray-700"
          }
        />
      </div>

      {selected && (
        <div
          key={selected}
          className="flex items-center gap-2 text-sm text-gray-700"
        >
          <Image
            src={meals.find((r) => r.value === selected)?.logo || ""}
            alt="Logo"
            width={50}
            height={50}
            className="rounded"
          />
          {meals.find((r) => r.value === selected)?.label}
        </div>
      )}
    </div>
  );
}
