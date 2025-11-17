"use client";
import Image from "next/image";
import React from "react";
import { useRouter } from "next/navigation";
import { ArrowBigLeft, ShieldPlus } from "lucide-react";
import { toast, Toaster } from 'sonner';
import { useTheme } from '@/lib/theme-context';
import type { DateRange } from "react-day-picker";
import Combobox from "@/components/ui/combobox";
import TiltedCard from '@/components/ui/TiltedCard';
import { DatePicker, DateRangePicker } from "@/components/ui/datepicker";
import { Button } from "@/components/ui/button";
import Shimmer from "@/components/ui/Shimmer";
import { usePageTheme } from "@/lib/use-page-theme";

type Option = { value: string; label: string; logo?: string };

export default function ReservationClient() {
  // Apply per-page theme from localStorage (default: light for /reservation)
  usePageTheme('/reservation');
  const router = useRouter();
  const { theme } = useTheme();
  const [selected, setSelected] = React.useState<string | undefined>();
  const [restaurants, setRestaurants] = React.useState<Option[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [date, setDate] = React.useState<Date | undefined>();
  const [range, setRange] = React.useState<DateRange | undefined>();
  const [sizes, setSizes] = React.useState<Record<string, number> | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = React.useState(false);
  const [chosenSize, setChosenSize] = React.useState<number | null>(null);
  // time input: from (HH:MM). We removed explicit `toTime` and rely on duration.
  const [fromTime, setFromTime] = React.useState<string>("12:00");
  // duration selector (minutes): 30min steps up to 12 hours (720 min)
  const durationOptions = React.useMemo(() => {
    const opts: number[] = [];
    for (let m = 30; m <= 720; m += 30) opts.push(m);
    return opts;
  }, []);
  const [durationMinutes, setDurationMinutes] = React.useState<number>(60);
  // earliest-availability helpers
  const [searchingEarliest, setSearchingEarliest] = React.useState<boolean>(false);
  const [earliestAvailable, setEarliestAvailable] = React.useState<string | null>(null); // ISO time string
  const [suggestedDurations, setSuggestedDurations] = React.useState<number[]>([]);
  // per-size table counts (2,4,6,8)
  const [sizeCounts, setSizeCounts] = React.useState<Record<string, number>>({ "2": 0, "4": 0, "6": 0, "8": 0 });
  const [submitLoading, setSubmitLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
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
  }, [selected, date, range]);

  function applyTimeToDate(base: Date, timeStr: string) {
    const d = new Date(base);
    if (!timeStr) return d;
    const [hhStr, mmStr] = timeStr.split(":");
    const hh = parseInt(hhStr || "0", 10);
    const mm = parseInt(mmStr || "0", 10);
    if (!Number.isNaN(hh)) d.setHours(hh);
    if (!Number.isNaN(mm)) d.setMinutes(mm);
    d.setSeconds(0, 0);
    return d;
  }

  // Check availability for a specific window and return sizes object or null on error
  async function fetchWindowSizes(restaurantId: string, fromIso: string, toIso?: string) {
    try {
      const qs = new URLSearchParams({ from: fromIso, ...(toIso ? { to: toIso } : {}) });
      const res = await fetch(`/api/restaurants/${restaurantId}/availability?` + qs.toString(), { cache: 'no-store' });
      if (!res.ok) return null;
      const j = await res.json().catch(() => null);
      return j?.sizes ?? null;
    } catch {
      return null;
    }
  }

  // Find earliest available start time for the selected day (scans from open to close in 30m steps)
  async function findEarliestAvailable() {
    if (!selected) return;
    const baseDate = date ?? range?.from;
    if (!baseDate) return;
    setSearchingEarliest(true);
    setEarliestAvailable(null);
    setSuggestedDurations([]);
    try {
      // Business hours (defaults) - could be made configurable per-restaurant later
      const openHour = 9;
      const closeHour = 21;
      const stepMinutes = 30;
      // Start at opening of baseDate
      const open = new Date(baseDate);
      open.setHours(openHour, 0, 0, 0);
      const close = new Date(baseDate);
      close.setHours(closeHour, 0, 0, 0);

      // iterate start times
      for (let t = new Date(open); t.getTime() + 1 <= close.getTime(); t.setMinutes(t.getMinutes() + stepMinutes)) {
        const startIso = t.toISOString();
        // check for at least one duration option to be available
        let anyAvailable = false;
        const availableDurations: number[] = [];
        for (const d of durationOptions) {
          const end = new Date(t.getTime() + d * 60_000);
          if (end.getTime() > close.getTime()) continue; // can't exceed close
          const endIso = end.toISOString();
          const sizesObj = await fetchWindowSizes(selected, startIso, endIso) as Record<string, number> | null;
          if (sizesObj) {
            // sum available tables (coerce types for TS)
            const vals = Object.values(sizesObj) as number[];
            const totalAvailable = vals.reduce((s, v) => s + (Number(v) || 0), 0);
            if (totalAvailable > 0) {
              anyAvailable = true;
              availableDurations.push(d);
            }
          }
        }
        if (anyAvailable) {
          setEarliestAvailable(startIso);
          setSuggestedDurations(availableDurations);
          // set fromTime to the found time's HH:MM for convenience
          const hh = String(t.getHours()).padStart(2, '0');
          const mm = String(t.getMinutes()).padStart(2, '0');
          setFromTime(`${hh}:${mm}`);
          break;
        }
      }
    } finally {
      setSearchingEarliest(false);
    }
  }

  const selectedOption = React.useMemo(
    () => restaurants.find((r) => r.value === selected),
    [restaurants, selected],
  );

  // Fetch availability when we have a restaurant and a time window
  React.useEffect(() => {
    if (!selected) return;
    const baseFrom = date ?? range?.from;
    const baseTo = range?.to;
    if (!baseFrom) return;
    // apply times if present
    const from = applyTimeToDate(baseFrom, fromTime).toISOString();
    // If there is an explicit range end (baseTo), use that date with the same time as `fromTime`.
    // Otherwise compute `to` from `from` + selected durationMinutes.
    const toComputed = baseTo
      ? applyTimeToDate(baseTo, fromTime).toISOString()
      : new Date(applyTimeToDate(baseFrom, fromTime).getTime() + durationMinutes * 60_000).toISOString();
    if (!from) return;
    setAvailabilityLoading(true);
    setSizes(null);
    setChosenSize(null);
    setError(null);
    const qs = new URLSearchParams({ from, ...(toComputed ? { to: toComputed } : {}) });
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
  }, [selected, date, range?.from, range?.to, fromTime, durationMinutes]);

  const totalTablesSelected = React.useMemo(() => Object.values(sizeCounts).reduce((s, v) => s + (v || 0), 0), [sizeCounts]);
  const totalPeople = React.useMemo(() => {
    let sum = 0;
    for (const key of Object.keys(sizeCounts)) {
      const cnt = sizeCounts[key] || 0;
      const sizeNum = parseInt(key, 10) || 0;
      sum += cnt * sizeNum;
    }
    return sum;
  }, [sizeCounts]);

  const canSubmit = React.useMemo(() => {
    const baseFrom = date ?? range?.from;
    return Boolean(selected && baseFrom && totalTablesSelected > 0 && totalPeople > 0 && !submitLoading);
  }, [selected, date, range?.from, totalTablesSelected, totalPeople, submitLoading]);

  const submitReservation = async () => {
    if (!selected) return;
    const baseFrom = date ?? range?.from;
    const baseTo = range?.to;
    if (!baseFrom || totalTablesSelected <= 0) return;
    setSubmitLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const fromIso = applyTimeToDate(baseFrom, fromTime).toISOString();
      // Always compute reservation end (`toDate`) from the chosen start time + duration.
      // The `range` is used only for availability filtering and should not drive the
      // actual booking end time unless we add an explicit 'booking range' UI.
      const toIso = new Date(applyTimeToDate(baseFrom, fromTime).getTime() + durationMinutes * 60_000).toISOString();
      const payload = {
        restaurantId: selected,
        fromDate: fromIso,
        toDate: toIso,
        partySize: totalPeople,
        tablesCount: totalTablesSelected,
        tableBreakdown: sizeCounts,
      } as any;
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Server error");
      setSuccess("Buyurtma qabul qilindi! Bron muvaffaqiyatli yaratildi.");
      // show toast with link to orders page
      try {
        toast.success("Bron muvaffaqiyatli yaratildi.", {
          description: "Buyurtmalar sahifasida ko'rishingiz mumkin.",
          action: {
            label: "Orders-ga o'tish",
            onClick: () => {
              try {
                router.push('/orders');
              } catch { }
            },
          },
        });
      } catch { }
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
    <main className="mx-auto max-w-6xl p-6">
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

      <h1 className="mb-4 text-2xl font-bold flex items-center gap-2">
        <ShieldPlus className="h-6 w-6" />
        <span>Bron</span>
      </h1>

      <Toaster position="top-right" />

      <div className="mb-6">
        <Combobox
          mode="input"
          options={restaurants.map((r) => ({ value: r.value, label: r.label }))}
          value={selected}
          onChange={(v) => setSelected(v || undefined)}
          inputPlaceholder="Restoran nomini kiriting"
          loading={loading}
        />
      </div>

      {/* Restaurants grid (card view). Click a card to pick a restaurant and open reservation modal. */}
      {!loading && restaurants && restaurants.length > 0 ? (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {restaurants.map((r) => (
            <div
              key={r.value}
              role="button"
              tabIndex={0}
              className="flex flex-col overflow-hidden rounded-lg border bg-linear-to-br from-gray-50 to-gray-100 shadow-md hover:shadow-lg hover:scale-105 transition-transform duration-200 cursor-pointer text-left"
              onClick={() => setSelected(r.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelected(r.value); }}
            >
              <div className="w-full">
                <TiltedCard
                  imageSrc={r.logo}
                  altText={r.label}
                  captionText={r.label}
                  containerHeight="12rem"
                  imageHeight="12rem"
                  rotateAmplitude={6}
                  scaleOnHover={1.03}
                  displayOverlayContent={false}
                  className="rounded-t-lg"
                />
              </div>
              <div className="p-3">
                <div className="text-sm font-semibold text-gray-800">{r.label}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        loading ? (
          <div className="space-y-6" aria-busy>
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-4 bg-white/80 rounded shadow">
                  <Shimmer className="h-40 w-full rounded" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-600">Hech qanday restoran topilmadi.</div>
        )
      )}


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

      {/* When a restaurant is selected, show a modal with image and reservation controls */}
      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSelected(undefined)}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="relative mx-4 max-w-4xl transform overflow-hidden rounded-lg bg-white shadow-xl transition-all duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
            role="document"
          >
            <button
              type="button"
              onClick={() => setSelected(undefined)}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 rounded bg-white/80 px-2 py-1 text-sm shadow hover:bg-gray-200"
            >
              ✕
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="relative h-80 md:h-[560px] w-full bg-gray-100">
                {selectedOption?.logo ? (
                  <Image
                    src={selectedOption.logo}
                    alt={selectedOption.label}
                    fill
                    className="object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-500">Rasm yo'q</div>
                )}
              </div>
              <div className="p-6">
                <h2 className="mb-2 text-2xl font-bold text-gray-800">{selectedOption?.label}</h2>

                <section className="space-y-2">
                  <div className="text-sm font-medium">Sana tanlash</div>
                  <DatePicker
                    date={date}
                    onDateChange={setDate}
                    fromDate={today}
                    toDate={inOneYear}
                  />
                  <div className="text-sm text-gray-600">{date ? date.toDateString() : '—'}</div>
                </section>

                <section className="space-y-2 mt-4">
                  <div className="text-sm font-medium">Sana oralig'i</div>
                  <DateRangePicker
                    range={range}
                    onRangeChange={setRange}
                    fromDate={today}
                    toDate={inOneYear}
                  />
                  <div className="text-sm text-gray-600">{range?.from ? range.from.toDateString() : '—'} — {range?.to ? range.to.toDateString() : '—'}</div>
                </section>

                <section className="space-y-2 mt-4">
                  <div className="text-sm font-medium">Vaqt oralig'i (soat)</div>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2">
                        <span className="text-sm">Boshlanish:</span>
                        <input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} className="rounded border px-2 py-1 text-sm" />
                      </label>
                      {/* `toTime` removed; duration controls drive the end time */}
                      <label className="flex items-center gap-2">
                        <span className="text-sm">Davomiylik:</span>
                        <select value={String(durationMinutes)} onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))} className="rounded border px-2 py-1 text-sm">
                          {durationOptions.map((d) => (
                            <option key={d} value={String(d)}>{d % 60 === 0 ? `${d / 60} soat` : `${d} min`}</option>
                          ))}
                        </select>
                      </label>
                      <button type="button" onClick={findEarliestAvailable} className="rounded border px-3 py-1 text-sm bg-white hover:bg-gray-50">
                        {searchingEarliest ? 'Qidirilmoqda…' : 'Eng erta bo‘sh vaqtni top'}
                      </button>
                    </div>
                    <div className="text-sm text-gray-600">(Tugash vaqti avtomatik: davomiylik tanlovi bo'yicha hisoblanadi.)</div>

                    {earliestAvailable ? (
                      <div className="mt-2 p-3 rounded border bg-gray-50">
                        <div className="text-sm">Eng erta mavjud start: <span className="font-medium">{new Date(earliestAvailable).toLocaleString()}</span></div>
                        <div className="mt-2 flex gap-2">
                          {suggestedDurations.length > 0 ? suggestedDurations.map((d) => (
                            <button key={d} type="button" onClick={() => { setDurationMinutes(d); const dt = new Date(earliestAvailable); const hh = String(dt.getHours()).padStart(2, '0'); const mm = String(dt.getMinutes()).padStart(2, '0'); setFromTime(`${hh}:${mm}`); }} className="rounded border px-2 py-1 text-sm bg-white hover:bg-gray-50">{d % 60 === 0 ? `${d / 60} soat` : `${d} min`}</button>
                          )) : <div className="text-sm text-gray-500">Variant topilmadi.</div>}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="text-sm font-medium mt-3">Bo'sh stol o'lchamlari va miqdori</div>
                  {availabilityLoading ? (
                    <div className="flex flex-wrap gap-2" aria-busy>
                      {[2, 4, 6, 8].map((s) => (<Shimmer key={s} className="h-9 w-28 rounded" />))}
                    </div>
                  ) : sizes ? (
                    <div className="space-y-3">
                      {[2, 4, 6, 8].map((s) => {
                        const left = sizes[String(s)] ?? 0;
                        const count = sizeCounts[String(s)] ?? 0;
                        return (
                          <div key={s} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="text-sm font-medium">{s} kishilik</div>
                              <div className="text-sm text-gray-500">{left} ta mavjud</div>
                            </div>
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSizeCounts((prev) => ({ ...prev, [String(s)]: Math.max(0, (prev[String(s)] || 0) - 1) }))}
                                className="rounded border px-3 py-1 text-sm"
                                aria-label={`Kamaytir ${s}`}
                              >
                                -
                              </button>
                              <div className="w-10 text-center text-sm">{count}</div>
                              <button
                                type="button"
                                onClick={() => setSizeCounts((prev) => ({ ...prev, [String(s)]: Math.min(left, (prev[String(s)] || 0) + 1) }))}
                                className="rounded border px-3 py-1 text-sm"
                                disabled={left <= 0 || (count >= left)}
                                aria-label={`Ko'paytir ${s}`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      <div className="pt-2 text-sm">
                        Tanlangan stol soni: <span className="font-medium">{totalTablesSelected}</span> — Umumiy odamlar: <span className="font-medium">{totalPeople}</span>
                      </div>
                    </div>
                  ) : null}
                  {error && <div className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
                  {success && <div className="mt-2 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>}
                </section>

                <div className="mt-6">
                  <Button
                    onClick={submitReservation}
                    disabled={!canSubmit || submitLoading}
                    className="bg-[#C8FF00] hover:bg-[#B8EF00] text-black font-semibold"
                    aria-busy={submitLoading}
                  >
                    {submitLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                        Yuborilmoqda…
                      </span>
                    ) : (
                      'Joy band qilish'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
