import ClientOnly from "@/components/ClientOnly";
import MenuPageClient from "./MenuPageClient";

export default function MenuPage() {
  return (
    <ClientOnly
      fallback={
        <div
          suppressHydrationWarning
          className="relative min-h-screen w-full overflow-hidden bg-white flex items-center justify-center"
        >
          <div className="animate-pulse text-gray-600">Loading...</div>
        </div>
      }
    >
      <MenuPageClient />
    </ClientOnly>
  );
}
