"use client";
import * as React from "react";
import { DatePicker, DateRangePicker } from "@/components/ui/datepicker";
import type { DateRange } from "react-day-picker";

export default function DevDatepickerPage() {
  const [date, setDate] = React.useState<Date | undefined>();
  const [range, setRange] = React.useState<DateRange | undefined>();

  const today = new Date();
  const inOneYear = new Date();
  inOneYear.setFullYear(today.getFullYear() + 1);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Date pickers (dev)</h1>

      <div className="space-y-2">
        <div className="text-sm font-medium">Single date</div>
        <DatePicker
          date={date}
          onDateChange={setDate}
          fromDate={today}
          toDate={inOneYear}
        />
        <div className="text-sm text-gray-600">
          {date ? date.toDateString() : "—"}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Date range (2 months)</div>
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
      </div>
    </div>
  );
}
