import ClientOnly from "@/components/ClientOnly";
import OrdersClient from "./OrdersClient";

export default function OrdersPage() {
  return (
    <ClientOnly
      fallback={
        <div suppressHydrationWarning className="p-4 max-w-3xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-40 rounded bg-white/10" />
            <div className="h-6 w-full rounded bg-white/10" />
            <div className="h-6 w-2/3 rounded bg-white/10" />
          </div>
        </div>
      }
    >
      <OrdersClient />
    </ClientOnly>
  );
}
