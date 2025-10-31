"use client";
import React from "react";
import Combobox from "@/components/ui/combobox";
import { DatePicker, DateRangePicker } from "@/components/ui/datepicker";
import type { DateRange } from "react-day-picker";
import Image from "next/image";

type Option = { value: string; label: string; logo?: string };

export default function ReservationClient() {
  const [selected, setSelected] = React.useState<string | undefined>();
  const [restaurants, setRestaurants] = React.useState<Option[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [date, setDate] = React.useState<Date | undefined>();
  const [range, setRange] = React.useState<DateRange | undefined>();
  const today = React.useMemo(() => new Date(), []);
  const inOneYear = React.useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d;
  }, []);

  React.useEffect(() => {
    let mounted = true;
    const MIN_SKELETON_MS = 600; // minimum shimmer visibility
    const start = Date.now();
    fetch("/api/restaurants")
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
        setRestaurants(opts);
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

  // When a restaurant is selected, ensure default date/range are pre-filled
  React.useEffect(() => {
    if (!selected) return;
    // Default pick date: today
    if (!date) setDate(new Date());
    // Default range: 1 week (today -> today + 7 days)
    if (!range) {
      const from = new Date();
      const to = new Date(from);
      to.setDate(from.getDate() + 7);
      setRange({ from, to });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const selectedOption = React.useMemo(
    () => restaurants.find((r) => r.value === selected),
    [restaurants, selected],
  );

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
          options={restaurants}
          value={selected}
          onChange={setSelected}
          inputPlaceholder="Restaran nomini kiriting"
          loading={loading}
        />
      </div>

      {selected && (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          {selectedOption?.logo ? (
            <Image
              src={selectedOption.logo}
              alt="Logo"
              width={50}
              height={50}
              className="rounded"
            />
          ) : null}
          <span>{selectedOption?.label}</span>
        </div>
      )}

      {selected ? (
        <>
          <section className="space-y-2">
            <div className="text-sm font-medium">Sana tanlash</div>
            <DatePicker
              date={date}
              onDateChange={setDate}
              fromDate={today}
              toDate={inOneYear}
            />
            <div className="text-sm text-gray-600">
              {date ? date.toDateString() : "—"}
            </div>
          </section>

          <section className="space-y-2">
            <div className="text-sm font-medium">Sana oralig'i</div>
            <DateRangePicker
              range={range}
              onRangeChange={setRange}
              fromDate={today}
              toDate={inOneYear}
            />
            <div className="text-sm text-gray-600">
              {range?.from ? range.from.toDateString() : "—"} —{" "}
              {range?.to ? range.to.toDateString() : "—"}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
