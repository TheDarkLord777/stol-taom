// app/home/page.tsx

import ClientOnly from "@/components/ClientOnly";
import HomeClient from "./HomeClient";

export default function HomePage() {
  return (
    <ClientOnly
      fallback={
        <div
          suppressHydrationWarning
          className="relative min-h-screen w-full overflow-hidden bg-black flex items-center justify-center"
        >
          <div className="animate-pulse text-white">Loading...</div>
        </div>
      }
    >
      <HomeClient />
    </ClientOnly>
  );
}
