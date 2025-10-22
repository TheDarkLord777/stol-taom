"use client"
import * as React from 'react'
import * as RadixSwitch from '@radix-ui/react-switch'

type Props = {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  disabled?: boolean
  id?: string
}

export function Switch({ checked, onCheckedChange, disabled, id }: Props) {
  return (
    <RadixSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className="inline-flex h-6 w-11 items-center rounded-full bg-gray-300 data-[state=checked]:bg-green-500 transition-colors focus:outline-none"
    >
      <RadixSwitch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-6" />
    </RadixSwitch.Root>
  )
}
