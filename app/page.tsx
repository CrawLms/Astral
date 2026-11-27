"use client";

import dynamic from "next/dynamic";

const DersUygulamasi = dynamic(() => import("@/components/ders-uygulamasi"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">Yükleniyor…</div>
  ),
});

export default function Page() {
  return <DersUygulamasi />;
}
