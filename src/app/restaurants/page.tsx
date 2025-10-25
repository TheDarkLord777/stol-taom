"use client"
import React from 'react'
import Combobox from '@/components/ui/combobox'
import { DatePicker, DateRangePicker } from '@/components/ui/datepicker'
import type { DateRange } from 'react-day-picker'
import Image from 'next/image'

const restaurants = [
    { value: 'r1', label: 'Besh qozon' },
    { value: 'r2', label: 'Caravan' },
    { value: 'r3', label: 'Forn Lebnen' },
]

export default function Page() {
    const [selected, setSelected] = React.useState<string | undefined>()
    const [date, setDate] = React.useState<Date | undefined>()
    const [range, setRange] = React.useState<DateRange | undefined>()
    const today = React.useMemo(() => new Date(), [])
    const inOneYear = React.useMemo(() => {
        const d = new Date()
        d.setFullYear(d.getFullYear() + 1)
        return d
    }, [])
    

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
                <div className="text-sm text-gray-700">Selected: {restaurants.find((r) => r.value === selected)?.label}</div>
            )}

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

            <section className="space-y-2">
                <div className="text-sm font-medium">Sana oralig'i</div>
                <DateRangePicker
                    range={range}
                    onRangeChange={setRange}
                    fromDate={today}
                    toDate={inOneYear}
                />
                <div className="text-sm text-gray-600">
                    {range?.from ? range.from.toDateString() : '—'} — {range?.to ? range.to.toDateString() : '—'}
                </div>
            </section>
        </div>
    )
}
