"use client";

import dynamic from "next/dynamic";

const DersUygulamasi = dynamic(() => import("@/components/ders-uygulamasi"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
      <span className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      Yükleniyor…
    </div>
  ),
});

export function UygulamaYukleyici() {
  return <DersUygulamasi />;
}
