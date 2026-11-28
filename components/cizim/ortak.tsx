"use client";

import { Fragment, useId, useMemo } from "react";
import rough from "roughjs";
import type { Drawable, Options } from "roughjs/bin/core";
import type { AkisDugumSekli, Aksiyon } from "@/lib/types";

export const EL_YAZISI = "Virgil, Excalifont, 'Comic Sans MS', 'Segoe Print', cursive";
export const gen = rough.generator();

export const PASTEL_DOLGULAR = ["#e7f5ff", "#fff3bf", "#ebfbee", "#fff0f6", "#f3f0ff", "#fff4e6"] as const;
export const VURGU_RENKLERI = ["#1971c2", "#e03131", "#2f9e44", "#7048e8", "#f08c00", "#0c8599"] as const;

export const sinirla = (v: number) => Math.max(0, Math.min(1, v));
export const aralikta = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export const azHareket = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export type Sinir = { x0: number; y0: number; x1: number; y1: number };
export type Hizalama = "start" | "middle" | "end";
export type Parca<T extends Aksiyon = Aksiyon> = { aksiyon: T; p: number };
export type Akis = { sure: number; yon: 1 | -1; gecikme: number };
export type Nokta = { x: number; y: number };
export type KutuSekli = AkisDugumSekli;

let olcumBaglami: CanvasRenderingContext2D | null | undefined;
const birimGenislik = new Map<string, number>();
if (typeof document !== "undefined") document.fonts?.addEventListener?.("loadingdone", () => birimGenislik.clear());

export function yaziGenisligi(metin: string, boyut: number): number {
  let birim = birimGenislik.get(metin);
  if (birim === undefined) {
    if (olcumBaglami === undefined) olcumBaglami = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;
    if (olcumBaglami) {
      olcumBaglami.font = `100px ${EL_YAZISI}`;
      birim = olcumBaglami.measureText(metin).width / 100;
    } else {
      birim = metin.length * 0.56;
    }
    if (birimGenislik.size > 3000) birimGenislik.clear();
    birimGenislik.set(metin, birim);
  }
  return birim * boyut;
}

export function yaziSol(x: number, w: number, hizala: Hizalama): number {
  return hizala === "middle" ? x - w / 2 : hizala === "end" ? x - w : x;
}

export function sinirIcineAl(x: number, y: number, metin: string, boyut: number, hizala: Hizalama, s: Sinir) {
  const w = yaziGenisligi(metin, boyut);
  const sol = yaziSol(x, w, hizala);
  const yeniSol = w >= s.x1 - s.x0 ? s.x0 : aralikta(sol, s.x0, s.x1 - w);
  return { x: x + yeniSol - sol, y: aralikta(y, s.y0 + boyut * 0.9, s.y1 - boyut * 0.3) };
}

export function etiketKutusu(x: number, y: number, metin: string, boyut: number, hizala: Hizalama): Sinir {
  const w = yaziGenisligi(metin, boyut);
  const x0 = yaziSol(x, w, hizala);
  return { x0, y0: y - boyut * 0.9, x1: x0 + w, y1: y + boyut * 0.3 };
}

export const kesisir = (a: Sinir, b: Sinir) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

export function bosYereYerlestir(x: number, y: number, metin: string, boyut: number, hizala: Hizalama, s: Sinir, dolu: Sinir[]) {
  let ilk: { x: number; y: number } | null = null;
  for (const kat of [0, 1.3, -1.3, 2.6, -2.6]) {
    const konum = sinirIcineAl(x, y + kat * boyut, metin, boyut, hizala, s);
    ilk ??= konum;
    const kutu = etiketKutusu(konum.x, konum.y, metin, boyut, hizala);
    if (!dolu.some((d) => kesisir(d, kutu))) return { ...konum, kutu };
  }
  return { ...ilk!, kutu: etiketKutusu(ilk!.x, ilk!.y, metin, boyut, hizala) };
}

export function satirlaraBol(metin: string, genislik: number, boyut: number): string[] {
  const maks = Math.max(boyut * 3, genislik);
  const satirlar: string[] = [];
  let mevcut = "";
  for (const kelime of metin.split(/\s+/).filter(Boolean)) {
    if (!mevcut) mevcut = kelime;
    else if (yaziGenisligi(`${mevcut} ${kelime}`, boyut) <= maks) mevcut += " " + kelime;
    else {
      satirlar.push(mevcut);
      mevcut = kelime;
    }
  }
  if (mevcut) satirlar.push(mevcut);
  return satirlar;
}

export function tohum(metin: string): number {
  let h = 2166136261;
  for (let i = 0; i < metin.length; i++) h = Math.imul(h ^ metin.charCodeAt(i), 16777619);
  return (Math.abs(h) % 2_000_000) + 1;
}

export const etiketNormal = (m?: string) => (m ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("tr");

export function etiketBirlestir(ana?: string, yardimci?: string, ayrac = " — "): string {
  const a = (ana ?? "").trim();
  const y = (yardimci ?? "").trim();
  if (!a) return y;
  if (!y || etiketNormal(a) === etiketNormal(y)) return a;
  return `${a}${ayrac}${y}`;
}

export const parcaIlerlemesi = (p: number, sira: number, toplam: number) => sinirla(p * toplam - sira);

export function Cizgi({
  d,
  renk,
  kalinlik = 2,
  p,
  dolgu,
  dolguOpaklik,
  kesikli,
  akis,
  kalem = true,
}: {
  d: string;
  renk: string;
  kalinlik?: number;
  p: number;
  dolgu?: string;
  dolguOpaklik?: number;
  kesikli?: boolean;
  akis?: Akis;
  kalem?: boolean;
}) {
  const oran = sinirla(p);
  if (oran <= 0 || !d) return null;
  const animasyon = oran < 1;
  const akiyor = Boolean(akis && !animasyon && !dolgu);
  const fillOpacity = dolgu ? (dolguOpaklik ?? 1) * (animasyon ? sinirla(oran * 1.4) : 1) : undefined;
  return (
    <path
      d={d}
      fill={dolgu ?? "none"}
      fillOpacity={fillOpacity}
      stroke={renk}
      strokeWidth={kalinlik}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={animasyon && !kesikli ? 1 : undefined}
      strokeDasharray={akiyor ? "10 8" : kesikli ? "6 6" : animasyon ? "1 1" : undefined}
      strokeDashoffset={animasyon && !kesikli ? 1 - oran : undefined}
      opacity={kesikli && !akiyor ? oran : undefined}
      data-kalem={animasyon && kalem ? "" : undefined}
      data-p={animasyon && kalem ? oran : undefined}
    >
      {akiyor && akis && !azHareket() && (
        <animate
          attributeName="stroke-dashoffset"
          values={akis.yon < 0 ? "0;36" : "0;-36"}
          dur={`${akis.sure}s`}
          begin={`${akis.gecikme}s`}
          repeatCount="indefinite"
        />
      )}
    </path>
  );
}

export function Kaba({
  cizim,
  p,
  kesikli,
  akis,
  dolguOpaklik,
  kalem = true,
}: {
  cizim: Drawable;
  p: number;
  kesikli?: boolean;
  akis?: Akis;
  dolguOpaklik?: number;
  kalem?: boolean;
}) {
  const yollar = useMemo(() => gen.toPaths(cizim), [cizim]);
  const oran = sinirla(p);
  if (oran <= 0) return null;
  return (
    <g>
      {yollar.map((y, i) => {
        const dolgu = y.fill && y.fill !== "none" ? y.fill : undefined;
        return (
          <Cizgi
            key={i}
            d={y.d}
            renk={y.stroke}
            kalinlik={y.strokeWidth}
            dolgu={dolgu}
            dolguOpaklik={dolguOpaklik}
            p={oran}
            kesikli={kesikli && !dolgu}
            akis={akis}
            kalem={kalem && i === yollar.length - 1}
          />
        );
      })}
    </g>
  );
}

export function Yazi({
  x,
  y,
  metin,
  boyut = 20,
  renk = "#1e1e1e",
  p,
  hizala = "start",
  konturRenk = "#ffffff",
  konturKalinlik = 4,
  kalin = false,
  kalem = true,
}: {
  x: number;
  y: number;
  metin: string;
  boyut?: number;
  renk?: string;
  p: number;
  hizala?: Hizalama;
  konturRenk?: string;
  konturKalinlik?: number;
  kalin?: boolean;
  kalem?: boolean;
}) {
  const id = `y${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const oran = sinirla(p);
  if (oran <= 0 || !metin) return null;
  const w = yaziGenisligi(metin, boyut);
  const x0 = yaziSol(x, w, hizala);
  return (
    <g>
      {oran < 1 && (
        <clipPath id={id}>
          <rect x={x0 - 6} y={y - boyut * 1.2} width={(w + 12) * oran} height={boyut * 1.7} />
        </clipPath>
      )}
      <text
        x={x}
        y={y}
        fontSize={boyut}
        fontWeight={kalin ? 600 : undefined}
        fill={renk}
        fontFamily={EL_YAZISI}
        textAnchor={hizala}
        stroke={konturKalinlik > 0 ? konturRenk : undefined}
        strokeWidth={konturKalinlik > 0 ? konturKalinlik : undefined}
        strokeLinejoin="round"
        paintOrder="stroke"
        clipPath={oran < 1 ? `url(#${id})` : undefined}
      >
        {metin}
      </text>
      {oran < 1 && kalem && <path d={`M${x0} ${y} L${x0 + w} ${y}`} stroke="none" fill="none" data-kalem="" data-p={oran} />}
    </g>
  );
}

export function CokSatirliYazi({
  x,
  y,
  metin,
  maksGenislik,
  boyut = 16,
  satirYuksekligi,
  renk = "#1e1e1e",
  hizala = "middle",
  dikeyHizala = "ortali",
  konturKalinlik = 3,
  kalin = false,
  kalem = true,
  p,
}: {
  x: number;
  y: number;
  metin: string;
  maksGenislik: number;
  boyut?: number;
  satirYuksekligi?: number;
  renk?: string;
  hizala?: Hizalama;
  dikeyHizala?: "ust" | "ortali";
  konturKalinlik?: number;
  kalin?: boolean;
  kalem?: boolean;
  p: number;
}) {
  const oran = sinirla(p);
  const satirlar = useMemo(() => satirlaraBol(metin, maksGenislik, boyut), [metin, maksGenislik, boyut]);
  if (oran <= 0 || !satirlar.length) return null;
  const adim = satirYuksekligi ?? boyut * 1.28;
  const basY = dikeyHizala === "ortali" ? y - ((satirlar.length - 1) * adim) / 2 + boyut * 0.34 : y;
  return (
    <g>
      {satirlar.map((s, i) => (
        <Yazi
          key={i}
          x={x}
          y={basY + i * adim}
          metin={s}
          boyut={boyut}
          renk={renk}
          hizala={hizala}
          konturKalinlik={konturKalinlik}
          kalin={kalin}
          kalem={kalem}
          p={parcaIlerlemesi(oran, i, satirlar.length)}
        />
      ))}
    </g>
  );
}

function okUcuYolu(uc: Nokta, gelis: Nokta, boyut: number): string | null {
  const dx = uc.x - gelis.x;
  const dy = uc.y - gelis.y;
  const uzunluk = Math.hypot(dx, dy);
  if (uzunluk < 1e-3) return null;
  const aci = Math.atan2(dy, dx);
  const yay = 0.44;
  const x1 = uc.x - boyut * Math.cos(aci - yay);
  const y1 = uc.y - boyut * Math.sin(aci - yay);
  const x2 = uc.x - boyut * Math.cos(aci + yay);
  const y2 = uc.y - boyut * Math.sin(aci + yay);
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} L${uc.x.toFixed(1)} ${uc.y.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
}

function yumusakYol(noktalar: Nokta[]): string {
  if (noktalar.length < 2) return "";
  if (noktalar.length === 2) {
    return `M${noktalar[0].x.toFixed(1)} ${noktalar[0].y.toFixed(1)} L${noktalar[1].x.toFixed(1)} ${noktalar[1].y.toFixed(1)}`;
  }
  let yol = `M${noktalar[0].x.toFixed(1)} ${noktalar[0].y.toFixed(1)}`;
  for (let i = 1; i < noktalar.length - 1; i++) {
    const ortaX = (noktalar[i].x + noktalar[i + 1].x) / 2;
    const ortaY = (noktalar[i].y + noktalar[i + 1].y) / 2;
    yol += ` Q${noktalar[i].x.toFixed(1)} ${noktalar[i].y.toFixed(1)} ${ortaX.toFixed(1)} ${ortaY.toFixed(1)}`;
  }
  const son = noktalar[noktalar.length - 1];
  yol += ` L${son.x.toFixed(1)} ${son.y.toFixed(1)}`;
  return yol;
}

export function Ok({
  x1 = 0,
  y1 = 0,
  x2 = 0,
  y2 = 0,
  noktalar,
  cx,
  cy,
  renk = "#1e1e1e",
  kalinlik = 2.4,
  ucBoyutu = 12,
  kesikli = false,
  akis,
  ciftYon = false,
  kaba = false,
  seed,
  etiket,
  etiketBoyut = 15,
  kalem = true,
  p,
}: {
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  noktalar?: Nokta[];
  cx?: number;
  cy?: number;
  renk?: string;
  kalinlik?: number;
  ucBoyutu?: number;
  kesikli?: boolean;
  akis?: Akis;
  ciftYon?: boolean;
  kaba?: boolean;
  seed?: number;
  etiket?: string;
  etiketBoyut?: number;
  kalem?: boolean;
  p: number;
}) {
  const oran = sinirla(p);
  const rota = useMemo(() => {
    if (noktalar && noktalar.length >= 2) {
      const yol = yumusakYol(noktalar);
      const ilk = noktalar[0];
      const ikinci = noktalar[1];
      const sondanOnce = noktalar[noktalar.length - 2];
      const son = noktalar[noktalar.length - 1];
      const orta = noktalar[Math.floor(noktalar.length / 2)];
      return {
        yol,
        cizim: null as Drawable | null,
        bas: ilk,
        basYonu: ikinci,
        son,
        sonYonu: sondanOnce,
        orta,
      };
    }
    const bas = { x: x1, y: y1 };
    const son = { x: x2, y: y2 };
    if (cx !== undefined && cy !== undefined) {
      const kontrol = { x: cx, y: cy };
      return {
        yol: `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
        cizim: null as Drawable | null,
        bas,
        basYonu: kontrol,
        son,
        sonYonu: kontrol,
        orta: { x: 0.25 * x1 + 0.5 * cx + 0.25 * x2, y: 0.25 * y1 + 0.5 * cy + 0.25 * y2 },
      };
    }
    const yol = `M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`;
    const cizim = kaba
      ? gen.line(x1, y1, x2, y2, {
          seed: seed ?? tohum(`ok-${x1}-${y1}-${x2}-${y2}`),
          roughness: 0.55,
          bowing: 0.4,
          disableMultiStroke: true,
          stroke: renk,
          strokeWidth: kalinlik,
        })
      : null;
    return {
      yol,
      cizim,
      bas,
      basYonu: son,
      son,
      sonYonu: bas,
      orta: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 },
    };
  }, [noktalar, x1, y1, x2, y2, cx, cy, kaba, seed, renk, kalinlik]);

  if (oran <= 0) return null;
  const govdeP = sinirla(oran * 1.15);
  const ucP = sinirla((oran - 0.78) * 4.5);
  const basUcP = sinirla(oran * 3);
  const bitisUcYol = okUcuYolu(rota.son, rota.sonYonu, ucBoyutu);
  const basUcYol = ciftYon ? okUcuYolu(rota.bas, rota.basYonu, ucBoyutu) : null;

  return (
    <g>
      {rota.cizim ? (
        <Kaba cizim={rota.cizim} p={govdeP} kesikli={kesikli} akis={akis} kalem={kalem} />
      ) : (
        <Cizgi d={rota.yol} renk={renk} kalinlik={kalinlik} p={govdeP} kesikli={kesikli} akis={akis} kalem={kalem} />
      )}
      {ucP > 0 && bitisUcYol && (
        <path d={bitisUcYol} fill={renk} stroke={renk} strokeWidth={1.2} strokeLinejoin="round" opacity={ucP} />
      )}
      {basUcP > 0 && basUcYol && (
        <path d={basUcYol} fill={renk} stroke={renk} strokeWidth={1.2} strokeLinejoin="round" opacity={basUcP} />
      )}
      {etiket && (
        <Yazi
          x={rota.orta.x}
          y={rota.orta.y - 6}
          metin={etiket}
          boyut={etiketBoyut}
          renk={renk}
          hizala="middle"
          p={sinirla((oran - 0.45) * 1.9)}
          kalem={kalem}
        />
      )}
    </g>
  );
}

export function yuvarlakKutuYolu(x: number, y: number, w: number, h: number, r = 12): string {
  const rx = Math.max(0, Math.min(r, w / 2, h / 2));
  if (rx <= 0) return `M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h} Z`;
  return [
    `M${x + rx} ${y}`,
    `L${x + w - rx} ${y}`,
    `Q${x + w} ${y} ${x + w} ${y + rx}`,
    `L${x + w} ${y + h - rx}`,
    `Q${x + w} ${y + h} ${x + w - rx} ${y + h}`,
    `L${x + rx} ${y + h}`,
    `Q${x} ${y + h} ${x} ${y + h - rx}`,
    `L${x} ${y + rx}`,
    `Q${x} ${y} ${x + rx} ${y}`,
    "Z",
  ].join(" ");
}

export function KutuCizim({
  x,
  y,
  w,
  h,
  sekil = "yuvarlak",
  renk = "#1e1e1e",
  dolgu,
  dolguOpaklik,
  kalinlik = 2.2,
  kesikli = false,
  roughness = 0.55,
  seed,
  metin,
  altMetin,
  yaziRenk,
  boyut = 17,
  altBoyut,
  kalin = false,
  kalem = true,
  p,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  sekil?: KutuSekli;
  renk?: string;
  dolgu?: string;
  dolguOpaklik?: number;
  kalinlik?: number;
  kesikli?: boolean;
  roughness?: number;
  seed?: number;
  metin?: string;
  altMetin?: string;
  yaziRenk?: string;
  boyut?: number;
  altBoyut?: number;
  kalin?: boolean;
  kalem?: boolean;
  p: number;
}) {
  const oran = sinirla(p);
  const cizim = useMemo(() => {
    const o: Options = {
      seed: seed ?? tohum(`${x}-${y}-${w}-${h}-${sekil}-${metin ?? ""}`),
      roughness,
      bowing: 0.45,
      preserveVertices: true,
      disableMultiStroke: kesikli,
      stroke: renk,
      strokeWidth: kalinlik,
      fill: dolgu && dolgu !== "none" && dolgu !== "transparent" ? dolgu : undefined,
      fillStyle: "solid",
    };
    switch (sekil) {
      case "kutu":
        return gen.rectangle(x, y, w, h, o);
      case "oval":
        return gen.path(yuvarlakKutuYolu(x, y, w, h, Math.min(h / 2, w / 2)), o);
      case "daire":
        return gen.circle(x + w / 2, y + h / 2, Math.min(w, h), o);
      case "elmas":
        return gen.polygon(
          [
            [x + w / 2, y],
            [x + w, y + h / 2],
            [x + w / 2, y + h],
            [x, y + h / 2],
          ],
          o,
        );
      case "paralelkenar": {
        const egim = Math.min(18, w * 0.16);
        return gen.polygon(
          [
            [x + egim, y],
            [x + w, y],
            [x + w - egim, y + h],
            [x, y + h],
          ],
          o,
        );
      }
      case "yuvarlak":
      default:
        return gen.path(yuvarlakKutuYolu(x, y, w, h, Math.min(14, w / 4, h / 4)), o);
    }
  }, [x, y, w, h, sekil, renk, dolgu, kalinlik, kesikli, roughness, seed, metin]);

  if (oran <= 0) return null;
  const yaziVar = Boolean(metin || altMetin);
  const sekilP = yaziVar ? sinirla(oran * 1.55) : oran;
  const yaziP = sinirla((oran - 0.42) * 1.8);
  const icGenislik = Math.max(36, sekil === "elmas" ? w * 0.62 : w - 18);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const anaRenk = yaziRenk ?? "#1e1e1e";
  const ikincilBoyut = altBoyut ?? Math.max(12, boyut - 3);
  const anaSatirlar = metin ? satirlaraBol(metin, icGenislik, boyut) : [];
  const altSatirlar = altMetin ? satirlaraBol(altMetin, icGenislik, ikincilBoyut) : [];
  const anaAdim = boyut * 1.24;
  const altAdim = ikincilBoyut * 1.24;
  const araBosluk = anaSatirlar.length && altSatirlar.length ? 4 : 0;
  const toplamH = anaSatirlar.length * anaAdim + altSatirlar.length * altAdim + araBosluk;
  const basY = cy - toplamH / 2;
  const anaY = basY + (anaSatirlar.length * anaAdim) / 2;
  const altY = basY + anaSatirlar.length * anaAdim + araBosluk + (altSatirlar.length * altAdim) / 2;

  return (
    <Fragment>
      <Kaba cizim={cizim} p={sekilP} kesikli={kesikli} dolguOpaklik={dolguOpaklik} kalem={kalem} />
      {yaziP > 0 && anaSatirlar.length > 0 && (
        <CokSatirliYazi
          x={cx}
          y={anaY}
          metin={metin!}
          maksGenislik={icGenislik}
          boyut={boyut}
          satirYuksekligi={anaAdim}
          renk={anaRenk}
          hizala="middle"
          dikeyHizala="ortali"
          konturKalinlik={0}
          kalin={kalin}
          kalem={kalem}
          p={altSatirlar.length ? sinirla(yaziP * 1.4) : yaziP}
        />
      )}
      {yaziP > 0 && altSatirlar.length > 0 && (
        <CokSatirliYazi
          x={cx}
          y={altY}
          metin={altMetin!}
          maksGenislik={icGenislik}
          boyut={ikincilBoyut}
          satirYuksekligi={altAdim}
          renk="#495057"
          hizala="middle"
          dikeyHizala="ortali"
          konturKalinlik={0}
          kalem={kalem}
          p={anaSatirlar.length ? sinirla((yaziP - 0.3) * 1.5) : yaziP}
        />
      )}
    </Fragment>
  );
}
