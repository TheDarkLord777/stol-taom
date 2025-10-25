"use client";
import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { format } from "date-fns";
import { uz } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import type { DateRange } from "react-day-picker";

type CommonProps = {
  fromDate?: Date;
  toDate?: Date;
  disabled?: (date: Date) => boolean;
  popoverClassName?: string;
};

type DatePickerProps = CommonProps & {
  date?: Date;
  onDateChange?: (date?: Date) => void;
  placeholder?: string;
  buttonClassName?: string;
  formatString?: string;
};

export function DatePicker({
  date,
  onDateChange,
  fromDate,
  toDate,
  disabled,
  placeholder = "Pick a date",
  buttonClassName,
  popoverClassName,
  formatString = "MMM d, yyyy",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const today = React.useMemo(() => new Date(), []);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          type="button"
          className={
            buttonClassName ||
            "inline-flex items-center justify-between gap-2 min-w-[220px] bg-white text-gray-900 hover:bg-gray-100 border border-gray-200"
          }
        >
          <span className="truncate">
            {date ? (
              format(date, formatString, { locale: uz })
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </Button>
      </Popover.Trigger>
      <Popover.Content
        sideOffset={8}
        className={
          popoverClassName ||
          "z-50 rounded-md border border-gray-200 bg-white p-2 shadow-lg"
        }
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onDateChange?.(d);
            setOpen(false);
          }}
          defaultMonth={date ?? today}
          fromDate={fromDate}
          toDate={toDate}
          disabled={disabled}
          initialFocus
        />
        <div className="flex justify-between gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDateChange?.(undefined)}
          >
            Clear
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDateChange?.(today)}
            >
              Bugun
            </Button>
          </div>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}

type DateRangePickerProps = CommonProps & {
  range?: DateRange;
  onRangeChange?: (range?: DateRange) => void;
  placeholder?: string;
  buttonClassName?: string;
  formatString?: string;
};

export function DateRangePicker({
  range,
  onRangeChange,
  fromDate,
  toDate,
  disabled,
  placeholder = "Pick a date range",
  buttonClassName,
  popoverClassName,
  formatString = "MMM d, yyyy",
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const today = React.useMemo(() => new Date(), []);
  function label() {
    if (range?.from && range?.to)
      return `${format(range.from, formatString, { locale: uz })} — ${format(range.to, formatString, { locale: uz })}`;
    if (range?.from) return `${format(range.from, formatString, { locale: uz })} — …`;
    return "";
  }
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          type="button"
          className={
            buttonClassName ||
            "inline-flex items-center justify-between gap-2 min-w-[260px] bg-white text-gray-900 hover:bg-gray-100 border border-gray-200"
          }
        >
          <span className="truncate">
            {label() || <span className="text-gray-500">{placeholder}</span>}
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </Button>
      </Popover.Trigger>
      <Popover.Content
        sideOffset={8}
        className={
          popoverClassName ||
          "z-50 rounded-md border border-gray-200 bg-white p-2 shadow-lg"
        }
      >
        <Calendar
          mode="range"
          selected={range}
          onSelect={(r) => onRangeChange?.(r)}
          numberOfMonths={2}
          defaultMonth={range?.from ?? today}
          fromDate={fromDate}
          toDate={toDate}
          disabled={disabled}
          initialFocus
        />
        <div className="flex justify-between gap-2 pt-2">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRangeChange?.(undefined)}
            >
              Clear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRangeChange?.({ from: today, to: today })}
            >
              Bugun
            </Button>
          </div>
          <Button size="sm" onClick={() => setOpen(false)}>
            Apply
          </Button>
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}

export default DatePicker;
