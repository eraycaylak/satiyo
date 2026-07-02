import { Suspense } from "react";
import { Explore } from "@/components/Explore";

export default function Home() {
  return (
    <Suspense fallback={<div className="empty">Yükleniyor…</div>}>
      <Explore />
    </Suspense>
  );
}
