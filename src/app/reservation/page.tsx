import ClientOnly from "@/components/ClientOnly";
import ReservationClient from "./ReservationClient";

export default function Page() {
  return (
    <ClientOnly
      fallback={
        <div className="max-w-3xl mx-auto p-6 space-y-8">
          <div className="relative h-40 w-full overflow-hidden rounded-md">
            <div className="absolute inset-0 bg-white/20" />
          </div>
          <div className="h-10 w-full max-w-xl bg-white/30 rounded" />
          <div className="h-8 w-48 bg-white/20 rounded" />
          <div className="h-24 w-full max-w-xl bg-white/20 rounded" />
        </div>
      }
    >
      <ReservationClient />
    </ClientOnly>
  );
}
