// src/components/ui/calendar.tsx

"use client";
import * as React from "react";
import { DayPicker } from "react-day-picker";
import { uz } from 'date-fns/locale';
import type { DayPickerProps } from "react-day-picker";

type Props = DayPickerProps & { className?: string };

export function Calendar({ className, locale = uz, ...props }: Props) {
  // Bugungi sanani hisoblash
  const today = React.useMemo(() => new Date(), []);

  // Modifikatorlar (modifiers) orqali bugungi sanani aniqlash
  const modifiers = {
    today: (date: Date) => date.toDateString() === today.toDateString(),
  };

  // Modifikatorlarga mos stil berish
  const modifiersStyles = {
    today: {
      fontWeight: "bold",
      color: "black", // mavi
      borderRadius: "15px",
      backgroundColor: '#62c7dc',
    },
    // Tanlangan kundagi (selected) ranglar
    selected: {
      backgroundColor: '#b0fb37',
      color: 'black',
      borderRadius: '15px',
    },
    // Oralig' (range) holatlari uchun bir xil yashil fon
    range_middle: {
      backgroundColor: '#b0fb37',
      color: 'black',
      borderRadius: '0',
    },
    range_start: {
      backgroundColor: '#b0fb37',
      color: 'black',
      borderRadius: '15px 0 0 15px',
    },
    range_end: {
      backgroundColor: '#b0fb37',
      color: 'black',
      borderRadius: '0 15px 15px 0',
    },
    disabled: {
      cursor: 'not-allowed',
      backgroundColor: '#f3f4f6', // gray-100
      borderRadius: '15px',
    },
  };

  return (
    <div className="px-[40px]">
      <DayPicker
      showOutsideDays
      {...props}
      locale={locale}
      modifiers={modifiers}
      modifiersStyles={modifiersStyles}
      className={className}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
  button_previous: "absolute left-1 p-1.5 rounded cursor-pointer",
  button_next: "absolute right-1 p-1.5 rounded cursor-pointer",
        table: "w-full border-collapse space-y-1",
        head_row: "grid grid-cols-7",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center",
        row: "grid grid-cols-7 mt-1",
        cell: "h-9 w-9 text-center text-sm p-0 relative",
        day: `
  relative h-9 w-9 p-0 text-center text-sm font-normal
  aria-selected:opacity-100 rounded-md focus:outline-none 
  leading-9
`,

        day_selected:
          "rounded-md cursor-pointer",
        // day_today olib tashlandi — endi modifiers bilan ishlaymiz
        day_outside: "text-gray-300 opacity-50",
  day_disabled: "opacity-50 bg-gray-100 cursor-not-allowed",
        day_range_middle: "rounded-none",
        day_range_start: "aria-selected:rounded-l-md",
        day_range_end: "aria-selected:rounded-r-md",
      }}
      />
    </div>
  );
}

export default Calendar;
