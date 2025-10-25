"use client"
import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import type { DayPickerProps } from 'react-day-picker'

type Props = DayPickerProps & { className?: string }

export function Calendar({ className, ...props }: Props) {
  return (
    <DayPicker
      showOutsideDays
      {...props}
      className={className}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium',
        nav: 'space-x-1 flex items-center',
        button_previous: 'absolute left-1 p-1.5 rounded hover:bg-gray-100',
        button_next: 'absolute right-1 p-1.5 rounded hover:bg-gray-100',
        table: 'w-full border-collapse space-y-1',
        head_row: 'grid grid-cols-7',
        head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center',
        row: 'grid grid-cols-7 mt-1',
        cell: 'h-9 w-9 text-center text-sm p-0 relative',
        day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-gray-100 focus:outline-none',
        day_selected:
          'bg-black text-white hover:bg-black focus:bg-black aria-selected:bg-black rounded-md',
        // Make today stand out clearly (Windows-style): blue ring and stronger text
        day_today:
          'relative font-semibold text-blue-600 ring-1 ring-blue-500 ring-offset-0 rounded-md',
        day_outside: 'text-gray-300 opacity-50',
        day_disabled: 'opacity-50 pointer-events-none',
        day_range_middle: 'aria-selected:bg-gray-200 rounded-none',
        day_range_start: 'aria-selected:rounded-l-md',
        day_range_end: 'aria-selected:rounded-r-md',
      }}
    />
  )
}

export default Calendar
