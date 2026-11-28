"use client";

import { Check, MapPin, PencilLine, X } from "lucide-react";
import type { MiniGorev, Sahne } from "@/lib/types";

type CizelgeProps = { sahneler: Sahne[]; aktif: number; onSec: (sira: number) => void };

export function SahneCizelgesi({ sahneler, aktif, onSec }: CizelgeProps) {
  if (!sahneler.length) return null;
  return (
    <nav aria-label="Sahne zaman çizelgesi" className="border-b border-border bg-card/60">
      <ol className="flex gap-1.5 overflow-x-auto px-3 py-2 [scrollbar-width:thin]">
        {sahneler.map((s, i) => {
          const durum = i === aktif ? "aktif" : i < aktif ? "bitti" : "sonra";
          return (
            <li key={i} className="shrink-0">
              <button
                type="button"
                onClick={() => onSec(i)}
                aria-current={durum === "aktif" ? "step" : undefined}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  durum === "aktif"
                    ? "border-primary bg-primary text-primary-foreground"
                    : durum === "bitti"
                      ? "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {durum === "bitti" && <Check className="size-3" aria-hidden />}
                <span>{s.ek ? s.baslik : `${i + 1}. ${s.baslik}`}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

type GorevProps = {
  gorev: MiniGorev;
  sonuc: { dogru: boolean; metin: string } | null;
  onGec: () => void;
};

export function GorevKarti({ gorev, sonuc, onGec }: GorevProps) {
  const Ikon = gorev.tur === "il_tikla" ? MapPin : PencilLine;
  return (
    <div
      role="status"
      className="absolute bottom-[72px] right-3 z-[6] w-[min(320px,calc(100%-1.5rem))] rounded-xl border border-border bg-card/95 p-4 text-card-foreground shadow-lg ring-1 ring-primary/10 backdrop-blur-sm kart-giris sm:right-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Ikon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mini görev</p>
          <p className="mt-1 text-sm font-medium leading-relaxed">{gorev.yonerge}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {gorev.tur === "il_tikla"
              ? "Haritada ilin üzerine tıkla."
              : "Tahtaya yaz veya çiz, ardından aşağıdan Tahtayla Birlikte Gönder'e bas."}
          </p>
          {sonuc && (
            <p className={`mt-2 flex items-center gap-1.5 text-sm font-medium ${sonuc.dogru ? "text-green-600" : "text-destructive"}`}>
              {sonuc.dogru ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
              {sonuc.metin}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={onGec} className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
          {sonuc?.dogru ? "Devam et" : "Geç"}
        </button>
      </div>
    </div>
  );
}
