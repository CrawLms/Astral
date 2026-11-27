"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardList, PencilLine, X, XCircle } from "lucide-react";
import type { TestSorusu } from "@/lib/types";

type Props = {
  baslik: string;
  sorular: TestSorusu[];
  onKapat: () => void;
  onTahtadaAcikla: (soru: TestSorusu, verilenCevap: number) => void;
};

const HARFLER = ["A", "B", "C", "D", "E"];

export function MiniTest({ baslik, sorular, onKapat, onTahtadaAcikla }: Props) {
  const [cevaplar, setCevaplar] = useState<(number | null)[]>(() => sorular.map(() => null));
  const dogruSayisi = cevaplar.filter((c, i) => c === sorular[i].dogruIndex).length;
  const hepsiCevaplandi = cevaplar.every((c) => c !== null);

  return (
    <section
      aria-label="Ünite sonu mini test"
      className="absolute inset-x-3 bottom-3 top-3 z-20 mx-auto flex max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl md:inset-x-6"
    >
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="flex size-8 items-center justify-center rounded-md bg-accent/30 text-accent-foreground">
          <ClipboardList className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">Mini Pekiştirme Testi</h2>
          <p className="truncate text-xs text-muted-foreground">{baslik}</p>
        </div>
        {hepsiCevaplandi && (
          <p className="rounded-md bg-muted px-2 py-1 text-xs font-medium" role="status">
            {dogruSayisi} / {sorular.length} doğru
          </p>
        )}
        <button type="button" onClick={onKapat} aria-label="Testi kapat" className="rounded-md p-1.5 hover:bg-muted">
          <X className="size-4" />
        </button>
      </header>

      <ol className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        {sorular.map((s, si) => {
          const verilen = cevaplar[si];
          const cevaplandi = verilen !== null;
          const dogru = verilen === s.dogruIndex;
          return (
            <li key={si} className="flex flex-col gap-2">
              <p className="text-pretty text-sm font-medium leading-relaxed">
                {si + 1}. {s.soru}
              </p>
              <div className="flex flex-col gap-1.5" role="radiogroup" aria-label={`${si + 1}. soru seçenekleri`}>
                {s.secenekler.map((secenek, i) => {
                  const secili = verilen === i;
                  const dogruSecenek = cevaplandi && i === s.dogruIndex;
                  const yanlisSecim = cevaplandi && secili && !dogru;
                  return (
                    <button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={secili}
                      disabled={cevaplandi}
                      onClick={() => setCevaplar((c) => c.map((x, k) => (k === si ? i : x)))}
                      className={`flex items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors disabled:cursor-default ${
                        dogruSecenek
                          ? "border-success/50 bg-success/10"
                          : yanlisSecim
                            ? "border-destructive/50 bg-destructive/10"
                            : "border-border hover:bg-muted"
                      }`}
                    >
                      <span className="font-mono text-xs font-semibold text-muted-foreground">{HARFLER[i]})</span>
                      <span className="flex-1">{secenek}</span>
                      {dogruSecenek && <CheckCircle2 className="size-4 shrink-0 text-success" aria-label="Doğru cevap" />}
                      {yanlisSecim && <XCircle className="size-4 shrink-0 text-destructive" aria-label="Yanlış cevap" />}
                    </button>
                  );
                })}
              </div>
              {cevaplandi && (
                <div
                  className={`flex flex-col gap-2 rounded-md p-2.5 text-xs leading-relaxed ${
                    dogru ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  }`}
                >
                  <p>
                    <span className="font-semibold">{dogru ? "Doğru! " : "Yanlış. "}</span>
                    {s.aciklama}
                  </p>
                  {!dogru && (
                    <button
                      type="button"
                      onClick={() => onTahtadaAcikla(s, verilen)}
                      className="flex items-center justify-center gap-2 self-start rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                    >
                      <PencilLine className="size-3.5" aria-hidden />
                      Tahtada Çizerek Açıkla
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
