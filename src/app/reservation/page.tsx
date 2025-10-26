"use client";
import React from "react";
import Combobox from "@/components/ui/combobox";
import { DatePicker, DateRangePicker } from "@/components/ui/datepicker";
import type { DateRange } from "react-day-picker";
import Image from "next/image";

const restaurants = [
  { value: "r1", label: "LOOOK", logo: "/logos/loook.svg" },
  { value: "r2", label: "OQTEPA LAVASH", logo: "/logos/oqtepa.svg" },
  { value: "r3", label: "Bellissimo PIZZA", logo: "/logos/bellissimo.svg" },
].sort((a, b) => a.label.localeCompare(b.label));


export default function Page() {
  const [selected, setSelected] = React.useState<string | undefined>();
  const [date, setDate] = React.useState<Date | undefined>();
  const [range, setRange] = React.useState<DateRange | undefined>();
  const today = React.useMemo(() => new Date(), []);
  const inOneYear = React.useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d;
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
          options={restaurants}
          value={selected}
          onChange={setSelected}
          inputPlaceholder="Restaran nomini kiriting"
        />
      </div>

     {selected && (
  <div className="flex items-center gap-2 text-sm text-gray-700">
    <Image
      src={restaurants.find((r) => r.value === selected)?.logo || ""}
      alt="Logo"
      width={50}
      height={50}
      className="rounded"
    />
    <span>{restaurants.find((r) => r.value === selected)?.label}</span>
  </div>
)}


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
    </div>
  );
}
