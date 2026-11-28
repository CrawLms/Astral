"use client";

import { BookOpenText, Loader2, PencilLine, Sparkles } from "lucide-react";

export function BosTahtaIpucu({ kitapVar }: { kitapVar: boolean }) {
  const adimlar = kitapVar
    ? [
        { ikon: BookOpenText, metin: "Soldan bir ünite seç" },
        { ikon: Sparkles, metin: "“Bu Konuyu Tahtada Anlat”a bas" },
        { ikon: PencilLine, metin: "Anlatım sırasında tahtaya çiz, soru sor" },
      ]
    : [
        { ikon: BookOpenText, metin: "Ders kitabı PDF'ini yükle" },
        { ikon: Sparkles, metin: "Yapay zekâ ünite planını çıkarsın" },
        { ikon: PencilLine, metin: "Tahtada canlı anlatımı izle ve soru sor" },
      ];
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[38%] z-[1] flex justify-center px-4" aria-hidden="true">
      <div className="flex w-full max-w-2xl flex-col items-center gap-4 text-center">
        <p className="text-balance text-lg font-semibold text-foreground/80">Tahta hazır</p>
        <ol className="grid w-full gap-3 text-sm text-muted-foreground sm:grid-cols-3">
          {adimlar.map(({ ikon: Ikon, metin }, i) => (
            <li key={metin} className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/80 px-3 py-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                {i + 1}
              </span>
              <Ikon className="size-4 shrink-0" aria-hidden />
              <span className="text-pretty text-left">{metin}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function TahtaYukleniyor({ metin }: { metin: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
      <div role="status" className="kart-giris flex max-w-sm items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-lg">
        <Loader2 className="size-5 shrink-0 animate-spin text-primary" aria-hidden />
        <span className="text-pretty">{metin}</span>
      </div>
    </div>
  );
}
