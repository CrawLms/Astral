"use client";

import { useState } from "react";
import { SEVIYELER, type OgretmenModu, type Seviye } from "@/lib/types";
import {
  Eraser,
  Lightbulb,
  MessagesSquare,
  PanelLeftOpen,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

type Props = {
  kenarAcik: boolean;
  onKenarAc: () => void;
  baslik: string | null;
  sahneSayisi: number;
  aktif: number;
  oynatiliyor: boolean;
  sesAcik: boolean;
  hiz: number;
  ogretmenModu: OgretmenModu;
  vurusSayisi: number;
  aktifVurus: number;
  onHiz: (hiz: number) => void;
  seviye: Seviye;
  onSeviye: (seviye: Seviye) => void;
  onMod: (mod: OgretmenModu) => void;
  onOynat: () => void;
  onDuraklat: () => void;
  onOnceki: () => void;
  onSonraki: () => void;
  onSes: () => void;
  onTemizle: () => void;
};

export const HIZLAR = [0.75, 1, 1.25, 1.5] as const;

function AracButonu({
  etiket,
  onClick,
  disabled,
  vurgulu,
  className = "",
  children,
}: {
  etiket: string;
  onClick: () => void;
  disabled?: boolean;
  vurgulu?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={etiket}
      title={etiket}
      className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-35 ${
        vurgulu ? "bg-primary text-primary-foreground shadow-sm hover:opacity-90" : "text-foreground hover:bg-muted"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function AyarBasligi({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>;
}

const secimSinifi =
  "h-10 w-full rounded-lg border border-border bg-background px-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring";

export function UstCubuk(p: Props) {
  const [ayarAcik, setAyarAcik] = useState(false);
  const sahneVar = p.sahneSayisi > 0;

  function temizle() {
    if (window.confirm("Tahtadaki tüm çizimler silinsin mi?")) p.onTemizle();
  }

  const toplamAdim = Math.max(1, p.vurusSayisi);
  const sahneIlerleme = sahneVar
    ? Math.min(1, (Math.max(0, p.aktif) + Math.min(p.aktifVurus, toplamAdim) / toplamAdim) / p.sahneSayisi)
    : 0;

  const altBaslik = sahneVar
    ? `Sahne ${Math.max(p.aktif + 1, 0)}/${p.sahneSayisi}${
        p.aktifVurus >= 0 && p.vurusSayisi > 0 ? ` · Adım ${Math.min(p.aktifVurus + 1, p.vurusSayisi)}/${p.vurusSayisi}` : ""
      }`
    : "Ünite seç ya da serbestçe çiz";

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-1 border-b border-border bg-background px-2 sm:gap-2 sm:px-3">
      {sahneVar && (
        <div
          role="progressbar"
          aria-label="Ders ilerlemesi"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(sahneIlerleme * 100)}
          className="absolute inset-x-0 bottom-0 h-0.5 translate-y-px"
        >
          <div className="h-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${sahneIlerleme * 100}%` }} />
        </div>
      )}

      {!p.kenarAcik && (
        <AracButonu etiket="Ders planını aç" onClick={p.onKenarAc}>
          <PanelLeftOpen className="size-[18px]" />
        </AracButonu>
      )}

      <div className="min-w-0 flex-1 px-1">
        <h1 className="truncate text-sm font-semibold leading-tight" title={p.baslik ?? undefined}>
          {p.baslik ?? "Beyaz Tahta"}
        </h1>
        <p className="truncate text-xs tabular-nums text-muted-foreground">{altBaslik}</p>
      </div>

      <div className="flex items-center gap-0.5" role="toolbar" aria-label="Anlatım kontrolleri">
        <AracButonu etiket="Önceki sahne" onClick={p.onOnceki} disabled={!sahneVar || p.aktif <= 0}>
          <SkipBack className="size-4" />
        </AracButonu>
        {p.oynatiliyor ? (
          <AracButonu etiket="Duraklat" onClick={p.onDuraklat} vurgulu className="size-10">
            <Pause className="size-4" />
          </AracButonu>
        ) : (
          <AracButonu etiket="Oynat" onClick={p.onOynat} disabled={!sahneVar} vurgulu className="size-10">
            <Play className="size-4 translate-x-px" />
          </AracButonu>
        )}
        <AracButonu etiket="Sonraki sahne" onClick={p.onSonraki} disabled={!sahneVar || p.aktif >= p.sahneSayisi - 1}>
          <SkipForward className="size-4" />
        </AracButonu>
      </div>

      <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
      <AracButonu etiket={p.sesAcik ? "Sesi kapat" : "Sesi aç"} onClick={p.onSes} className="hidden sm:flex">
        {p.sesAcik ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
      </AracButonu>
      <AracButonu etiket="Tahtayı temizle" onClick={temizle} className="hidden sm:flex">
        <Eraser className="size-4" />
      </AracButonu>

      <button
        type="button"
        onClick={() => setAyarAcik((a) => !a)}
        aria-expanded={ayarAcik}
        aria-controls="ders-ayarlari"
        aria-label="Ders ayarları"
        title="Ders ayarları"
        className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-colors ${
          ayarAcik ? "bg-muted text-foreground" : "text-foreground hover:bg-muted"
        }`}
      >
        <SlidersHorizontal className="size-4" />
      </button>

      {ayarAcik && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={() => setAyarAcik(false)}
            className="fixed inset-0 z-10 cursor-default bg-foreground/10 sm:bg-transparent"
          />
          <div
            id="ders-ayarlari"
            role="dialog"
            aria-label="Ders ayarları"
            onKeyDown={(e) => e.key === "Escape" && setAyarAcik(false)}
            className="kart-giris absolute right-2 top-[calc(100%+0.5rem)] z-20 flex w-[min(22rem,calc(100vw-1rem))] flex-col gap-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-xl sm:right-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Ders ayarları</p>
              <button
                type="button"
                onClick={() => setAyarAcik(false)}
                aria-label="Ayarları kapat"
                className="-mr-1 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div>
              <AyarBasligi>Öğretmen modu</AyarBasligi>
              <div role="radiogroup" aria-label="Öğretmen modu" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                {(
                  [
                    { mod: "anlatim", etiket: "Anlatım", ikon: MessagesSquare, ipucu: "Konuyu baştan sona çizerek anlatır" },
                    { mod: "sokratik", etiket: "Sokratik", ikon: Lightbulb, ipucu: "Cevabı vermez, sorularla çözdürür" },
                  ] as const
                ).map(({ mod, etiket, ikon: Ikon, ipucu }) => {
                  const secili = p.ogretmenModu === mod;
                  return (
                    <button
                      key={mod}
                      type="button"
                      role="radio"
                      aria-checked={secili}
                      title={ipucu}
                      onClick={() => p.onMod(mod)}
                      className={`flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors ${
                        secili ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Ikon className="size-4" aria-hidden />
                      {etiket}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <AyarBasligi>Hız</AyarBasligi>
                <select value={p.hiz} onChange={(e) => p.onHiz(Number(e.target.value))} className={secimSinifi}>
                  {HIZLAR.map((h) => (
                    <option key={h} value={h}>
                      {h}x
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <AyarBasligi>Seviye</AyarBasligi>
                <select value={p.seviye} onChange={(e) => p.onSeviye(e.target.value as Seviye)} className={secimSinifi}>
                  {SEVIYELER.map((s) => (
                    <option key={s.deger} value={s.deger}>
                      {s.etiket}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:hidden">
              <button
                type="button"
                onClick={p.onSes}
                className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium hover:bg-muted"
              >
                {p.sesAcik ? <Volume2 className="size-4" aria-hidden /> : <VolumeX className="size-4" aria-hidden />}
                {p.sesAcik ? "Ses açık" : "Ses kapalı"}
              </button>
              <button
                type="button"
                onClick={temizle}
                className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium hover:bg-muted"
              >
                <Eraser className="size-4" aria-hidden />
                Temizle
              </button>
            </div>

          </div>
        </>
      )}
    </header>
  );
}
