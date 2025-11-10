// app/dashboard/page.tsx (yoki app/page.tsx)

"use client";

import { Button } from "@/components/ui/button";
import Galaxy from "@/components/ui/Galaxy"; // Galaxy komponentini import qilish

export default function Dashboard() {
  const actions = [
    { label: "🍔 Menyu", href: "/menu" },
    { label: "🍽️ Joy band qilish", href: "/reservation" },
    { label: "📅 Buyurtmalarim", href: "/orders" },
    { label: "️⚙️ Profil", href: "/profile" },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* Galaxy background */}
      <div className="absolute inset-0 z-0">
      <Galaxy mouseRepulsion={true} mouseInteraction={true} />

      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center gap-4">
            {actions.map((a) => (
              <Button
                key={a.label}
                href={a.href}
                className="h-14 w-full max-w-xs bg-[#C8FF00] hover:bg-[#B8EF00] text-black text-xl font-bold shadow-xl rounded-lg flex justify-start items-center leading-none text-left pl-5 md:pl-10"
              >
                {a.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
