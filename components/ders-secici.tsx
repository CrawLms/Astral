"use client";

import { useState } from "react";
import { DERS_ADI_SINIRI, DERSLER } from "@/lib/dersler";

const DIGER = "__diger";

type Props = {
  deger: string;
  onDegis: (ders: string) => void;
  hatali?: boolean;
};

const listedeMi = (ders: string) => (DERSLER as readonly string[]).includes(ders);

export function DersSecici({ deger, onDegis, hatali = false }: Props) {
  const [ozelMod, setOzelMod] = useState(() => deger !== "" && !listedeMi(deger));
  const ozel = ozelMod || (deger !== "" && !listedeMi(deger));
  const alanSinifi = `w-full rounded-md border bg-background px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ring ${
    hatali ? "border-destructive" : "border-border"
  }`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="ders-secimi" className="text-xs font-medium text-muted-foreground">
        Hangi ders?
      </label>
      <select
        id="ders-secimi"
        value={ozel ? DIGER : deger}
        aria-invalid={hatali && !ozel ? true : undefined}
        onChange={(e) => {
          const secim = e.target.value;
          if (secim === DIGER) {
            setOzelMod(true);
            onDegis("");
          } else {
            setOzelMod(false);
            onDegis(secim);
          }
        }}
        className={alanSinifi}
      >
        <option value="" disabled>
          Ders seç…
        </option>
        {DERSLER.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
        <option value={DIGER}>Diğer (kendim yazacağım)</option>
      </select>
      {ozel && (
        <>
          <label htmlFor="ozel-ders" className="sr-only">
            Ders adı
          </label>
          <input
            id="ozel-ders"
            value={deger}
            maxLength={DERS_ADI_SINIRI}
            autoFocus
            aria-invalid={hatali ? true : undefined}
            onChange={(e) => onDegis(e.target.value)}
            placeholder="Ders adını yaz (ör. Müzik, Ekonomi)"
            className={alanSinifi}
          />
        </>
      )}
    </div>
  );
}
