"use client";
import Image from "next/image";
import React from "react";
import type { DateRange } from "react-day-picker";
import Combobox from "@/components/ui/combobox";
import { DatePicker, DateRangePicker } from "@/components/ui/datepicker";
import { Button } from "@/components/ui/button";

type Option = { value: string; label: string; logo?: string };

export default function ReservationClient() {
  const [selected, setSelected] = React.useState<string | undefined>();
  const [restaurants, setRestaurants] = React.useState<Option[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [date, setDate] = React.useState<Date | undefined>();
  const [range, setRange] = React.useState<DateRange | undefined>();
  const [sizes, setSizes] = React.useState<Record<string, number> | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = React.useState(false);
  const [chosenSize, setChosenSize] = React.useState<number | null>(null);
  const [submitLoading, setSubmitLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
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
  }, [selected, date, range]);

  const selectedOption = React.useMemo(
    () => restaurants.find((r) => r.value === selected),
    [restaurants, selected],
  );

  // Fetch availability when we have a restaurant and a time window
  React.useEffect(() => {
    if (!selected) return;
    const from = date ?? range?.from;
    const to = range?.to;
    if (!from) return;
    setAvailabilityLoading(true);
    setSizes(null);
    setChosenSize(null);
    setError(null);
    const qs = new URLSearchParams({ from: from.toISOString(), ...(to ? { to: to.toISOString() } : {}) });
    fetch(`/api/restaurants/${selected}/availability?` + qs.toString())
      .then((r) => r.json())
      .then((d) => {
        if (d?.sizes) setSizes(d.sizes as Record<string, number>);
        else setSizes({ "2": 0, "4": 0, "6": 0, "8": 0 });
      })
      .catch((e) => {
        setError(String(e?.message || e));
        setSizes({ "2": 0, "4": 0, "6": 0, "8": 0 });
      })
      .finally(() => setAvailabilityLoading(false));
  }, [selected, date, range?.from, range?.to]);

  const canSubmit = React.useMemo(() => {
    const from = date ?? range?.from;
    return Boolean(selected && from && chosenSize && (sizes && (sizes[String(chosenSize)] ?? 0) > 0));
  }, [selected, date, range?.from, chosenSize, sizes]);

  const submitReservation = async () => {
    if (!selected) return;
    const from = date ?? range?.from;
    const to = range?.to;
    if (!from || !chosenSize) return;
    setSubmitLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          restaurantId: selected,
          fromDate: from.toISOString(),
          toDate: to ? to.toISOString() : undefined,
          partySize: chosenSize,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Server error");
      // notify orders page to refresh
      try {
        const bc = new BroadcastChannel("orders");
        bc.postMessage({ type: "orders:update" });
        bc.close();
      } catch { }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitLoading(false);
    }
  };

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
              {range?.from ? range.from.toDateString() : "—"} — {range?.to ? range.to.toDateString() : "—"}
            </div>
          </section>

          {/* Availability & table size selection */}
          <section className="space-y-2">
            <div className="text-sm font-medium">Bo'sh stol o'lchamlarini tanlang</div>
            {availabilityLoading ? (
              <div className="text-sm text-gray-600">Mavjudlik yuklanmoqda…</div>
            ) : sizes ? (
              <div className="flex flex-wrap gap-2">
                {[2, 4, 6, 8].map((s) => {
                  const left = sizes[String(s)] ?? 0;
                  const disabled = left <= 0;
                  const active = chosenSize === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={disabled}
                      onClick={() => setChosenSize(s)}
                      className={
                        "rounded border px-3 py-1 text-sm " +
                        (disabled
                          ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                          : active
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white hover:bg-gray-50")
                      }
                      title={left > 0 ? `${left} ta stol mavjud` : "Mavjud emas"}
                    >
                      {s} kishilik {left > 0 ? `(${left} ta)` : "(yo'q)"}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {error ? <div className="text-sm text-red-600">{error}</div> : null}
          </section>

          <div className="pt-2">
            <Button
              onClick={submitReservation}
              disabled={!canSubmit || submitLoading}
              className="bg-[#C8FF00] hover:bg-[#B8EF00] text-black font-semibold"
            >
              {submitLoading ? "Yuborilmoqda…" : "Joy band qilish"}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
