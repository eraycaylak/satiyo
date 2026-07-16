import { Suspense } from "react";
import { Explore } from "@/components/Explore";
import { LocationGate } from "@/components/LocationGate";
import { MobileStoreRedirect } from "@/components/MobileStoreRedirect";

export default function Home() {
  return (
    <Suspense fallback={<div className="empty">Yükleniyor…</div>}>
      <MobileStoreRedirect />
      <LocationGate />
      <Explore />
    </Suspense>
  );
}
