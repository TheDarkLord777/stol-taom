"use client";
import React from "react";
import Combobox from "@/components/ui/combobox";
import Image from "next/image";

const meals = [
  { value: "r1", label: "Somsa", logo: "/logos/loook.svg" },
  { value: "r2", label: "Osh", logo: "/logos/oqtepa.svg" },
  { value: "r3", label: "Mastava", logo: "/logos/bellissimo.svg" },
  { value: "r4", label: "Sho'rva", logo: "/logos/loook.svg" },
  { value: "r5", label: "Chuchvara", logo: "/logos/oqtepa.svg" },
  { value: "r6", label: "Lag'mon", logo: "/logos/bellissimo.svg" },
  { value: "r7", label: "Shashlik", logo: "/logos/loook.svg" },
  { value: "r8", label: "Osh", logo: "/logos/oqtepa.svg" },
  { value: "r9", label: "Manti", logo: "/logos/bellissimo.svg" },
  { value: "r10", label: "Xonim", logo: "/logos/loook.svg" },
  { value: "r11", label: "Beshbarmoq", logo: "/logos/oqtepa.svg" },
  { value: "r12", label: "Norin", logo: "/logos/bellissimo.svg" },
  { value: "r13", label: "Hasb", logo: "/logos/bellissimo.svg" },
  { value: "r14", label: "Tandir go'shti", logo: "/logos/bellissimo.svg" },
  { value: "r15", label: "Grill", logo: "/logos/bellissimo.svg" },
  { value: "r16", label: "Mampar", logo: "/logos/bellissimo.svg" },

].sort((a, b) => a.label.localeCompare(b.label));


export default function Page() {
  const [selected, setSelected] = React.useState<string | undefined>();

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
          options={meals}
          value={selected}
          onChange={setSelected}
          inputPlaceholder="Taom nomini kiriting"
        />
      </div>

     {selected && (
  <div className="flex items-center gap-2 text-sm text-gray-700">
    <Image
      src={meals.find((r) => r.value === selected)?.logo || ""}
      alt="Logo"
      width={50}
      height={50}
      className="rounded"
    />
    <span>{meals.find((r) => r.value === selected)?.label}</span>
  </div>
)}


      
    </div>
  );
}
