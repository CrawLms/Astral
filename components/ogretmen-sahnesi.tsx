"use client";

import { memo, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import rough from "roughjs";
import type { Drawable, Options } from "roughjs/bin/core";
import { cities } from "turkey-map-react/data";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { CanliKatman } from "@/hooks/use-oynatici";
import { latexGorseli, type HazirGorsel } from "@/lib/gorsel-donustur";
import { guzelAdim, ifadeDerle } from "@/lib/matematik";
import { ALAN_H, ALAN_W, FOTO_BLOK, alanY, renkCoz, yerlesim, type Blok, type IlerlemeDeposu } from "@/lib/ogretmen-cizim";
import type { Aksiyon, Bolge, DiyagramAksiyonu, FormulAksiyonu, GrafikAksiyonu, HaritaAksiyonu, Sahne } from "@/lib/types";

const EL_YAZISI = "Virgil, Excalifont, 'Comic Sans MS', 'Segoe Print', cursive";
const gen = rough.generator();
const IL = new Map(cities.map((c) => [c.plateNumber, c]));
const sinirla = (v: number) => Math.max(0, Math.min(1, v));

function tohum(metin: string) {
  let h = 2166136261;
  for (let i = 0; i < metin.length; i++) h = Math.imul(h ^ metin.charCodeAt(i), 16777619);
  return (Math.abs(h) % 2_000_000) + 1;
}

const etiketNormal = (m?: string) => (m ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("tr");

export function etiketBirlestir(ana?: string, yardimci?: string, ayrac = " — ") {
  const a = (ana ?? "").trim();
  const y = (yardimci ?? "").trim();
  if (!a) return y;
  if (!y || etiketNormal(a) === etiketNormal(y)) return a;
  return `${a}${ayrac}${y}`;
}

const parcaIlerlemesi = (p: number, sira: number, toplam: number) => sinirla(p * toplam - sira);

type Parca<T extends Aksiyon = Aksiyon> = { aksiyon: T; p: number };

function Cizgi({ d, renk, kalinlik = 2, p, dolgu, kesikli }: { d: string; renk: string; kalinlik?: number; p: number; dolgu?: string; kesikli?: boolean }) {
  if (p <= 0) return null;
  const animasyon = p < 1;
  return (
    <path
      d={d}
      fill={dolgu ?? "none"}
      stroke={renk}
      strokeWidth={kalinlik}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={animasyon && !kesikli ? 1 : undefined}
      strokeDasharray={kesikli ? "6 6" : animasyon ? "1 1" : undefined}
      strokeDashoffset={animasyon && !kesikli ? 1 - p : undefined}
      opacity={kesikli ? p : undefined}
      data-kalem={animasyon ? "" : undefined}
      data-p={animasyon ? p : undefined}
    />
  );
}

function Kaba({ cizim, p }: { cizim: Drawable; p: number }) {
  const yollar = useMemo(() => gen.toPaths(cizim), [cizim]);
  return (
    <g>
      {yollar.map((y, i) => (
        <Cizgi key={i} d={y.d} renk={y.stroke} kalinlik={y.strokeWidth} dolgu={y.fill && y.fill !== "none" ? y.fill : undefined} p={p} />
      ))}
    </g>
  );
}

function Yazi({
  x,
  y,
  metin,
  boyut = 20,
  renk = "#1e1e1e",
  p,
  hizala = "start",
}: {
  x: number;
  y: number;
  metin: string;
  boyut?: number;
  renk?: string;
  p: number;
  hizala?: "start" | "middle" | "end";
}) {
  const id = `y${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  if (p <= 0 || !metin) return null;
  const w = metin.length * boyut * 0.56;
  const x0 = hizala === "middle" ? x - w / 2 : hizala === "end" ? x - w : x;
  return (
    <g>
      {p < 1 && (
        <clipPath id={id}>
          <rect x={x0 - 6} y={y - boyut * 1.2} width={(w + 12) * p} height={boyut * 1.7} />
        </clipPath>
      )}
      <text
        x={x}
        y={y}
        fontSize={boyut}
        fill={renk}
        fontFamily={EL_YAZISI}
        textAnchor={hizala}
        stroke="#ffffff"
        strokeWidth={4}
        strokeLinejoin="round"
        paintOrder="stroke"
        clipPath={p < 1 ? `url(#${id})` : undefined}
      >
        {metin}
      </text>
      {p < 1 && <path d={`M${x0} ${y} L${x0 + w} ${y}`} stroke="none" fill="none" data-kalem="" data-p={p} />}
    </g>
  );
}

const BOLGE_VARSAYILAN = "#fcfcfb";

const TemelHarita = memo(function TemelHarita({
  p,
  bolgeler,
  ilTiklama,
}: {
  p: number;
  bolgeler: string;
  ilTiklama?: (plaka: number, ad: string) => void;
}) {
  const renkler = JSON.parse(bolgeler) as Record<string, [string, number]>;
  return (
    <g>
      {cities.map((c, i) => {
        const br = c.region ? renkler[c.region] : undefined;
        return (
          <path
            key={c.id}
            d={c.path}
            fill={br ? br[0] : BOLGE_VARSAYILAN}
            fillOpacity={br ? 0.25 + br[1] * 0.6 : 1}
            stroke="#495057"
            strokeWidth={0.9}
            strokeLinejoin="round"
            pathLength={p < 1 ? 1 : undefined}
            strokeDasharray={p < 1 ? "1 1" : undefined}
            strokeDashoffset={p < 1 ? 1 - p : undefined}
            data-kalem={p < 1 && i === 40 ? "" : undefined}
            data-p={p < 1 && i === 40 ? p : undefined}
            className={ilTiklama ? "cursor-pointer transition-opacity hover:opacity-60" : undefined}
            style={{ pointerEvents: ilTiklama ? "visiblePainted" : "none" }}
            onClick={ilTiklama ? () => ilTiklama(c.plateNumber, c.name) : undefined}
          >
            <title>{c.name}</title>
          </path>
        );
      })}
    </g>
  );
});

function HaritaBlok({ parcalar, ilTiklama }: { parcalar: Parca<HaritaAksiyonu>[]; ilTiklama?: (plaka: number, ad: string) => void }) {
  const ilk = parcalar[0];
  const ilkOgeVar = Boolean(
    ilk && ((ilk.aksiyon.vurgulananIller?.length ?? 0) + (ilk.aksiyon.baglantiOklari?.length ?? 0) + Object.keys(ilk.aksiyon.bolgeRenkleri ?? {}).length),
  );
  const temelP = ilk ? sinirla(ilk.p * (ilkOgeVar ? 3 : 1)) : 0;

  const bolgeler: Record<string, [string, number]> = {};
  const iller: { plaka: number; ad: string; renk: string; etiket?: string; p: number }[] = [];
  const oklar: { a: number; b: number; etiket?: string; p: number }[] = [];
  parcalar.forEach(({ aksiyon, p }, ai) => {
    const ap = ai === 0 && ilkOgeVar ? sinirla((p - 1 / 3) * 1.5) : p;
    const bolgeListesi = Object.entries(aksiyon.bolgeRenkleri ?? {});
    const toplam = bolgeListesi.length + (aksiyon.vurgulananIller?.length ?? 0) + (aksiyon.baglantiOklari?.length ?? 0);
    let j = 0;
    for (const [b, r] of bolgeListesi) bolgeler[b] = [renkCoz(r, "#fff3bf"), parcaIlerlemesi(ap, j++, toplam)];
    for (const il of aksiyon.vurgulananIller ?? []) iller.push({ ...il, p: parcaIlerlemesi(ap, j++, toplam) });
    for (const o of aksiyon.baglantiOklari ?? []) oklar.push({ a: o.neredenPlaka, b: o.nereyePlaka, etiket: o.etiket, p: parcaIlerlemesi(ap, j++, toplam) });
  });
  const bolgeAnahtari = JSON.stringify(
    Object.fromEntries(Object.entries(bolgeler).map(([k, [r, p]]) => [k as Bolge, [r, Math.round(p * 20) / 20]])),
  );

  return (
    <svg viewBox="10 135 1030 465" preserveAspectRatio="xMidYMid meet" overflow="visible">
      <TemelHarita p={Math.round(temelP * 50) / 50} bolgeler={bolgeAnahtari} ilTiklama={ilTiklama} />
      {iller.map((il) => {
        const c = IL.get(il.plaka);
        if (!c || il.p <= 0) return null;
        const renk = renkCoz(il.renk, "#e03131");
        return (
          <g key={`il-${il.plaka}`} style={{ pointerEvents: "none" }}>
            <path d={c.path} fill={renk} fillOpacity={0.7 * il.p} stroke="none" />
            <Cizgi d={c.path} renk={renk} kalinlik={2.6} p={sinirla(il.p * 1.4)} />
          </g>
        );
      })}
      {oklar.map((o, i) => {
        const a = IL.get(o.a)?.centroid;
        const b = IL.get(o.b)?.centroid;
        if (!a || !b || o.p <= 0) return null;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const cx = (a.x + b.x) / 2 - dy * 0.25;
        const cy = (a.y + b.y) / 2 + dx * 0.25 - 20;
        const aci = Math.atan2(b.y - cy, b.x - cx);
        const uc = (s: number) => `${b.x - 16 * Math.cos(aci + s)} ${b.y - 16 * Math.sin(aci + s)}`;
        return (
          <g key={`ok-${i}`} style={{ pointerEvents: "none" }}>
            <Cizgi d={`M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}`} renk="#1971c2" kalinlik={3} p={sinirla(o.p * 1.15)} />
            {o.p > 0.9 && <Cizgi d={`M${uc(0.45)} L${b.x} ${b.y} L${uc(-0.45)}`} renk="#1971c2" kalinlik={3} p={1} />}
            {o.etiket && (
              <Yazi x={0.25 * a.x + 0.5 * cx + 0.25 * b.x} y={0.25 * a.y + 0.5 * cy + 0.25 * b.y - 8} metin={o.etiket} boyut={17} renk="#1971c2" hizala="middle" p={sinirla((o.p - 0.5) * 2)} />
            )}
          </g>
        );
      })}
      {iller.map((il) => {
        const c = IL.get(il.plaka)?.centroid;
        if (!c || il.p <= 0) return null;
        const renk = renkCoz(il.renk, "#e03131");
        const ad = il.ad || IL.get(il.plaka)?.name || "";
        return (
          <g key={`pin-${il.plaka}`} style={{ pointerEvents: "none" }}>
            <circle cx={c.x} cy={c.y} r={6 * sinirla(il.p * 2)} fill={renk} stroke="#ffffff" strokeWidth={2} />
            <Yazi x={c.x} y={c.y - 14} metin={etiketBirlestir(ad, il.etiket)} boyut={18} renk="#1e1e1e" hizala="middle" p={sinirla((il.p - 0.4) * 1.7)} />
          </g>
        );
      })}
    </svg>
  );
}

const GW = 600;
const GH = 420;
const M = { l: 52, r: 22, t: 22, b: 44 };

function GrafikBlok({ parcalar, blokId }: { parcalar: Parca<GrafikAksiyonu>[]; blokId: string }) {
  const tanim = parcalar.find((x) => x.aksiyon.xAralik && x.aksiyon.yAralik)?.aksiyon;
  const [x0, x1] = tanim?.xAralik ?? [-5, 5];
  const [y0, y1] = tanim?.yAralik ?? [-5, 5];
  const sx = (x: number) => M.l + ((x - x0) / (x1 - x0)) * (GW - M.l - M.r);
  const sy = (y: number) => GH - M.b - ((y - y0) / (y1 - y0)) * (GH - M.t - M.b);
  const ilk = parcalar[0];
  const ilkOge = (ilk?.aksiyon.fonksiyonlar?.length ?? 0) + (ilk?.aksiyon.noktalar?.length ?? 0);
  const eksenP = ilk ? sinirla(ilk.p * (ilkOge ? 3 : 1)) : 0;

  const eksenler = useMemo(() => {
    const ex = y0 <= 0 && y1 >= 0 ? sy(0) : GH - M.b;
    const ey = x0 <= 0 && x1 >= 0 ? sx(0) : M.l;
    const o: Options = { seed: tohum(blokId), roughness: 0.8, stroke: "#343a40", strokeWidth: 2 };
    return {
      ex,
      ey,
      x: gen.line(M.l - 8, ex, GW - M.r + 6, ex, o),
      y: gen.line(ey, GH - M.b + 8, ey, M.t - 6, o),
      xAdim: guzelAdim(x1 - x0),
      yAdim: guzelAdim(y1 - y0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blokId, x0, x1, y0, y1]);

  const ogeler: { tur: "f" | "n"; veri: GrafikAksiyonu["fonksiyonlar"] extends (infer F)[] | undefined ? F : never; p: number; nokta?: { x: number; y: number; etiket: string } }[] = [];
  parcalar.forEach(({ aksiyon, p }, ai) => {
    const ap = ai === 0 && ilkOge ? sinirla((p - 1 / 3) * 1.5) : p;
    const toplam = (aksiyon.fonksiyonlar?.length ?? 0) + (aksiyon.noktalar?.length ?? 0);
    let j = 0;
    for (const f of aksiyon.fonksiyonlar ?? []) ogeler.push({ tur: "f", veri: f, p: parcaIlerlemesi(ap, j++, toplam) });
    for (const n of aksiyon.noktalar ?? []) ogeler.push({ tur: "n", veri: { ifade: "", renk: "#e03131" }, nokta: n, p: parcaIlerlemesi(ap, j++, toplam) });
  });

  const isaretler = (bas: number, son: number, adim: number) => {
    const s: number[] = [];
    for (let v = Math.ceil(bas / adim) * adim; v <= son + 1e-9 && s.length < 30; v += adim) if (Math.abs(v) > 1e-9) s.push(Number(v.toFixed(6)));
    return s;
  };

  return (
    <svg viewBox={`0 0 ${GW} ${GH}`} preserveAspectRatio="xMidYMid meet" overflow="visible">
      <Kaba cizim={eksenler.x} p={eksenP} />
      <Kaba cizim={eksenler.y} p={eksenP} />
      {eksenP > 0.6 && (
        <g fontFamily={EL_YAZISI} fontSize={13} fill="#495057" opacity={sinirla((eksenP - 0.6) * 2.5)}>
          {isaretler(x0, x1, eksenler.xAdim).map((v) => (
            <g key={`x${v}`}>
              <line x1={sx(v)} x2={sx(v)} y1={eksenler.ex - 4} y2={eksenler.ex + 4} stroke="#495057" />
              <text x={sx(v)} y={eksenler.ex + 18} textAnchor="middle">{v}</text>
            </g>
          ))}
          {isaretler(y0, y1, eksenler.yAdim).map((v) => (
            <g key={`y${v}`}>
              <line x1={eksenler.ey - 4} x2={eksenler.ey + 4} y1={sy(v)} y2={sy(v)} stroke="#495057" />
              <text x={eksenler.ey - 8} y={sy(v) + 4} textAnchor="end">{v}</text>
            </g>
          ))}
          <text x={GW - M.r + 4} y={eksenler.ex - 8} fontSize={16}>x</text>
          <text x={eksenler.ey + 8} y={M.t} fontSize={16}>y</text>
        </g>
      )}
      {ogeler.map((o, i) => {
        if (o.p <= 0) return null;
        if (o.tur === "n" && o.nokta) {
          const { x, y, etiket } = o.nokta;
          return (
            <g key={i}>
              <Cizgi d={`M${sx(x)} ${eksenler.ex} L${sx(x)} ${sy(y)} L${eksenler.ey} ${sy(y)}`} renk="#adb5bd" kalinlik={1.5} p={o.p} kesikli />
              <circle cx={sx(x)} cy={sy(y)} r={6 * sinirla(o.p * 2)} fill="#e03131" stroke="#fff" strokeWidth={2} />
              <Yazi x={sx(x) + 10} y={sy(y) - 10} metin={etiketBirlestir(etiket || `(${x}, ${y})`)} boyut={16} renk="#e03131" p={sinirla((o.p - 0.3) * 1.5)} />
            </g>
          );
        }
        return <FonksiyonEgrisi key={i} ifade={o.veri.ifade} renk={renkCoz(o.veri.renk, "#1971c2")} etiket={o.veri.etiket} p={o.p} x0={x0} x1={x1} y0={y0} y1={y1} sx={sx} sy={sy} />;
      })}
    </svg>
  );
}

function FonksiyonEgrisi({
  ifade,
  renk,
  etiket,
  p,
  x0,
  x1,
  y0,
  y1,
  sx,
  sy,
}: {
  ifade: string;
  renk: string;
  etiket?: string;
  p: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  sx: (x: number) => number;
  sy: (y: number) => number;
}) {
  const { d, son } = useMemo(() => {
    const f = ifadeDerle(ifade);
    if (!f) return { d: "", son: null as null | [number, number] };
    const pay = (y1 - y0) * 0.6;
    let yol = "";
    let ciziliyor = false;
    let sonNokta: [number, number] | null = null;
    for (let i = 0; i <= 320; i++) {
      const x = x0 + ((x1 - x0) * i) / 320;
      const y = f(x);
      if (!Number.isFinite(y) || y < y0 - pay || y > y1 + pay) {
        ciziliyor = false;
        continue;
      }
      const yk = Math.max(y0 - pay, Math.min(y1 + pay, y));
      yol += `${ciziliyor ? "L" : "M"}${sx(x).toFixed(1)} ${sy(yk).toFixed(1)} `;
      ciziliyor = true;
      if (y >= y0 && y <= y1) sonNokta = [sx(x), sy(y)];
    }
    return { d: yol, son: sonNokta };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ifade, x0, x1, y0, y1]);
  if (!d) return <Yazi x={GW / 2} y={GH / 2} metin={`Çizilemedi: ${ifade}`} boyut={14} renk="#e03131" p={p} hizala="middle" />;
  return (
    <g>
      <clipPath id={`k${tohum(ifade)}`}>
        <rect x={M.l} y={M.t - 4} width={GW - M.l - M.r + 4} height={GH - M.t - M.b + 8} />
      </clipPath>
      <g clipPath={`url(#k${tohum(ifade)})`}>
        <Cizgi d={d} renk={renk} kalinlik={3} p={p} />
      </g>
      {son && <Yazi x={son[0] - 6} y={son[1] - 12} metin={etiket || `y = ${ifade}`} boyut={16} renk={renk} hizala="end" p={sinirla((p - 0.85) * 6.6)} />}
    </g>
  );
}

const IZINLI = new Set(["path", "circle", "ellipse", "rect", "line", "polyline", "polygon", "text", "g"]);
const RENK_DESENI = /^(#[0-9a-f]{3,8}|[a-z]{3,20}|rgba?\([\d\s.,%]+\))$/i;
const DONUSUM_DESENI = /^[a-z0-9\s(),.\-]+$/i;
const YOL_DESENI = /^[MmLlHhVvCcSsQqTtAaZz\d\s.,\-eE]+$/;

type DiyagramOgesi =
  | { tur: "sekil"; cizim: Drawable; donusum?: string }
  | { tur: "yazi"; x: number; y: number; metin: string; boyut: number; renk: string; hizala: "start" | "middle" | "end"; donusum?: string };

function diyagramCoz(svg: string, anahtar: string): { viewBox: string; ogeler: DiyagramOgesi[] } {
  const belge = new DOMParser().parseFromString(svg, "image/svg+xml");
  const kok = belge.documentElement;
  if (kok.nodeName.toLowerCase() !== "svg" || belge.querySelector("parsererror")) return { viewBox: "0 0 800 460", ogeler: [] };
  const vb = kok.getAttribute("viewBox")?.trim() ?? "";
  const viewBox = /^-?[\d.]+([\s,]+-?[\d.]+){3}$/.test(vb) ? vb : "0 0 800 460";
  const ogeler: DiyagramOgesi[] = [];
  const sayi = (el: Element, ad: string, v = 0) => {
    const n = parseFloat(el.getAttribute(ad) ?? "");
    return Number.isFinite(n) ? n : v;
  };
  const renkAl = (el: Element, ad: string) => {
    const r = el.getAttribute(ad)?.trim();
    return r && RENK_DESENI.test(r) ? r : undefined;
  };
  const noktalar = (el: Element) =>
    (el.getAttribute("points") ?? "")
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .reduce<[number, number][]>((acc, v, i, a) => (i % 2 === 0 && Number.isFinite(v) && Number.isFinite(a[i + 1]) ? [...acc, [v, a[i + 1]]] : acc), []);

  const gez = (el: Element, ustDonusum: string, ustRenk?: string, ustDolgu?: string) => {
    for (const cocuk of Array.from(el.children)) {
      const ad = cocuk.nodeName.toLowerCase();
      if (!IZINLI.has(ad) || ogeler.length > 120) continue;
      const t = cocuk.getAttribute("transform")?.trim();
      const donusum = [ustDonusum, t && DONUSUM_DESENI.test(t) ? t : ""].filter(Boolean).join(" ");
      const stroke = renkAl(cocuk, "stroke") ?? ustRenk;
      const fill = renkAl(cocuk, "fill") ?? ustDolgu;
      if (ad === "g") {
        gez(cocuk, donusum, stroke, fill);
        continue;
      }
      if (ad === "text") {
        const metin = cocuk.textContent?.trim().slice(0, 80);
        if (!metin) continue;
        const anchor = cocuk.getAttribute("text-anchor");
        const x = sayi(cocuk, "x");
        const y = sayi(cocuk, "y");
        const tekrar = ogeler.some(
          (o) => o.tur === "yazi" && etiketNormal(o.metin) === etiketNormal(metin) && Math.hypot(o.x - x, o.y - y) < 60,
        );
        if (tekrar) continue;
        ogeler.push({
          tur: "yazi",
          x,
          y,
          metin,
          boyut: Math.max(10, Math.min(48, sayi(cocuk, "font-size", 20))),
          renk: fill && fill !== "none" ? fill : "#1e1e1e",
          hizala: anchor === "middle" || anchor === "end" ? anchor : "start",
          donusum: donusum || undefined,
        });
        continue;
      }
      const o: Options = {
        seed: tohum(`${anahtar}-${ogeler.length}`),
        roughness: 0.9,
        bowing: 0.8,
        stroke: stroke && stroke !== "none" ? stroke : "#1e1e1e",
        strokeWidth: Math.max(1, Math.min(6, sayi(cocuk, "stroke-width", 2.2))),
        fill: fill && fill !== "none" && fill !== "transparent" ? fill : undefined,
        fillStyle: "hachure",
        hachureGap: 7,
        fillWeight: 1.2,
      };
      let cizim: Drawable | null = null;
      if (ad === "line") cizim = gen.line(sayi(cocuk, "x1"), sayi(cocuk, "y1"), sayi(cocuk, "x2"), sayi(cocuk, "y2"), o);
      else if (ad === "rect") cizim = gen.rectangle(sayi(cocuk, "x"), sayi(cocuk, "y"), sayi(cocuk, "width"), sayi(cocuk, "height"), o);
      else if (ad === "circle") cizim = gen.circle(sayi(cocuk, "cx"), sayi(cocuk, "cy"), sayi(cocuk, "r") * 2, o);
      else if (ad === "ellipse") cizim = gen.ellipse(sayi(cocuk, "cx"), sayi(cocuk, "cy"), sayi(cocuk, "rx") * 2, sayi(cocuk, "ry") * 2, o);
      else if (ad === "polyline" && noktalar(cocuk).length > 1) cizim = gen.linearPath(noktalar(cocuk), o);
      else if (ad === "polygon" && noktalar(cocuk).length > 2) cizim = gen.polygon(noktalar(cocuk), o);
      else if (ad === "path") {
        const d = cocuk.getAttribute("d")?.trim() ?? "";
        if (d && d.length < 6000 && YOL_DESENI.test(d)) cizim = gen.path(d, o);
      }
      if (cizim) ogeler.push({ tur: "sekil", cizim, donusum: donusum || undefined });
    }
  };
  gez(kok, "");
  return { viewBox, ogeler };
}

function DiyagramBlok({ parcalar, blokId }: { parcalar: Parca<DiyagramAksiyonu>[]; blokId: string }) {
  const svgAnahtari = parcalar.map((x) => x.aksiyon.svg).join("\u0000");
  const cozumler = useMemo(
    () => svgAnahtari.split("\u0000").map((svg, i) => diyagramCoz(svg, `${blokId}-${i}`)),
    [blokId, svgAnahtari],
  );
  return (
    <svg viewBox={cozumler[0]?.viewBox ?? "0 0 800 460"} preserveAspectRatio="xMidYMid meet" overflow="visible">
      {cozumler.map((c, ai) =>
        c.ogeler.map((o, j) => {
          const p = parcaIlerlemesi(parcalar[ai].p, j, c.ogeler.length);
          if (p <= 0) return null;
          return (
            <g key={`${ai}-${j}`} transform={o.donusum}>
              {o.tur === "sekil" ? <Kaba cizim={o.cizim} p={p} /> : <Yazi x={o.x} y={o.y} metin={o.metin} boyut={o.boyut} renk={o.renk} hizala={o.hizala} p={p} />}
            </g>
          );
        }),
      )}
    </svg>
  );
}

const latexOnbellek = new Map<string, Promise<HazirGorsel | null>>();
export function latexHazirla(latex: string, renk: string) {
  const anahtar = `${renk}|${latex}`;
  let s = latexOnbellek.get(anahtar);
  if (!s) {
    s = latexGorseli(latex, 30, renk).catch(() => null);
    latexOnbellek.set(anahtar, s);
  }
  return s;
}

function useLatex(latex: string | undefined, renk: string) {
  const [sonuc, setSonuc] = useState<{ anahtar: string; g: HazirGorsel | null } | null>(null);
  const anahtar = `${renk}|${latex}`;
  useEffect(() => {
    if (!latex) return;
    let iptal = false;
    latexHazirla(latex, renk).then((g) => {
      if (!iptal) setSonuc({ anahtar, g });
    });
    return () => {
      iptal = true;
    };
  }, [latex, renk, anahtar]);
  return sonuc?.anahtar === anahtar ? sonuc.g : null;
}

function FormulSatiri({ aksiyon, p, y, genislik, yukseklikBildir }: { aksiyon: FormulAksiyonu; p: number; y: number; genislik: number; yukseklikBildir: number }) {
  const renk = renkCoz(aksiyon.renk, "#7048e8");
  const g = useLatex(aksiyon.latex, renk);
  const id = `f${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const olcek = g ? Math.min(1, (genislik - 24) / g.genislik, 64 / g.yukseklik) : 1;
  const fw = g ? g.genislik * olcek : 0;
  const fh = g ? g.yukseklik * olcek : 0;
  const latexP = aksiyon.not ? sinirla(p * 1.6) : p;
  const notY = y + (aksiyon.latex ? Math.max(fh, 40) + 26 : 26);
  const cizgiY = y + Math.max(fh, 40) + 4;
  return (
    <g data-satir={yukseklikBildir}>
      {aksiyon.latex && g && (
        <g>
          <clipPath id={id}>
            <rect x={8} y={y - 4} width={(fw + 8) * latexP} height={fh + 8} />
          </clipPath>
          <image href={g.dataURL} x={12} y={y} width={fw} height={fh} clipPath={latexP < 1 ? `url(#${id})` : undefined} />
          {latexP < 1 && <path d={`M12 ${y + fh * 0.6} L${12 + fw} ${y + fh * 0.6}`} stroke="none" fill="none" data-kalem="" data-p={latexP} />}
          {aksiyon.altiCizili && (
            <Cizgi d={`M10 ${cizgiY} Q${12 + fw / 2} ${cizgiY + 7} ${16 + fw} ${cizgiY - 2}`} renk="#e03131" kalinlik={2.5} p={sinirla((latexP - 0.7) * 3.3)} />
          )}
        </g>
      )}
      {aksiyon.latex && !g && p > 0 && <Yazi x={12} y={y + 30} metin={aksiyon.latex} boyut={18} renk={renk} p={latexP} />}
      {aksiyon.not && (
        <Yazi x={12} y={notY} metin={aksiyon.not} boyut={19} renk={aksiyon.latex ? "#1e1e1e" : renk} p={aksiyon.latex ? sinirla((p - 0.55) * 2.2) : p} />
      )}
    </g>
  );
}

function FormulBlok({ parcalar, kutu }: { parcalar: Parca<FormulAksiyonu>[]; kutu: Blok["kutu"] }) {
  const satirH = Math.max(56, Math.min(120, kutu.h / Math.max(1, parcalar.length)));
  return (
    <svg viewBox={`0 0 ${kutu.w} ${kutu.h}`} overflow="visible">
      {parcalar.map((x, i) => {
        const y = 8 + i * satirH;
        return <FormulSatiri key={i} aksiyon={x.aksiyon} p={x.p} y={y} genislik={kutu.w} yukseklikBildir={satirH} />;
      })}
    </svg>
  );
}

function aksiyonParcalari(sahne: Sahne, vurusSira: number, p: number) {
  const gruplar = new Map<string, Parca[]>();
  sahne.vuruslar.forEach((v, vi) => {
    if (vi > vurusSira) return;
    const n = v.aksiyonlar.length;
    v.aksiyonlar.forEach((a, k) => {
      if (a.tip === "vurgula") return;
      const ap = vi < vurusSira ? 1 : parcaIlerlemesi(p, k, n);
      if (ap <= 0) return;
      const liste = gruplar.get(a.gorsel) ?? [];
      liste.push({ aksiyon: a, p: ap });
      gruplar.set(a.gorsel, liste);
    });
  });
  return gruplar;
}

type SahneProps = {
  sahne: Sahne;
  sira: number;
  vurusSira: number;
  p: number;
  ilTiklama?: (plaka: number, ad: string) => void;
};

const SahneKatmani = memo(function SahneKatmani({ sahne, sira, vurusSira, p, ilTiklama }: SahneProps) {
  const bloklar = useMemo(() => yerlesim(sahne), [sahne]);
  const parcalar = aksiyonParcalari(sahne, vurusSira, p);
  const baslikCizgi = useMemo(() => gen.line(0, 50, Math.min(ALAN_W, 40 + sahne.baslik.length * 17), 54, { seed: tohum(sahne.baslik), stroke: "#1971c2", strokeWidth: 2.5, roughness: 1.1 }), [sahne.baslik]);
  return (
    <g transform={`translate(0 ${alanY(sira)})`}>
      <rect x={-24} y={-14} width={ALAN_W + 48} height={ALAN_H + 28} rx={18} fill="#ffffff" stroke="#e9ecef" strokeWidth={2} strokeDasharray="10 8" />
      <Yazi x={0} y={38} metin={sahne.ek ? sahne.baslik : `${sira + 1}. ${sahne.baslik}`} boyut={30} renk="#1971c2" p={1} />
      <Kaba cizim={baslikCizgi} p={1} />
      {[...bloklar.values()].map((b) => {
        if (b.tip === "fotograf") {
          return sahne.fotograf ? (
            <g key={b.id} data-blok={b.id}>
              <image href={sahne.fotograf} x={b.kutu.x} y={b.kutu.y} width={b.kutu.w} height={b.kutu.h} preserveAspectRatio="xMidYMid meet" />
            </g>
          ) : null;
        }
        const liste = parcalar.get(b.id);
        if (!liste?.length) return null;
        const ic =
          b.tip === "turkiye_haritasi" ? (
            <HaritaBlok parcalar={liste as Parca<HaritaAksiyonu>[]} ilTiklama={ilTiklama} />
          ) : b.tip === "matematik_grafigi" ? (
            <GrafikBlok parcalar={liste as Parca<GrafikAksiyonu>[]} blokId={`${sira}-${b.id}`} />
          ) : b.tip === "geometri_ve_diyagram" ? (
            <DiyagramBlok parcalar={liste as Parca<DiyagramAksiyonu>[]} blokId={`${sira}-${b.id}`} />
          ) : (
            <FormulBlok parcalar={liste as Parca<FormulAksiyonu>[]} kutu={b.kutu} />
          );
        return (
          <svg key={b.id} data-blok={b.id} x={b.kutu.x} y={b.kutu.y} width={b.kutu.w} height={b.kutu.h} overflow="visible">
            {ic}
          </svg>
        );
      })}
    </g>
  );
});

type Props = {
  api: ExcalidrawImperativeAPI | null;
  svgRef: RefObject<SVGSVGElement | null>;
  canliRef: RefObject<CanliKatman>;
  sahneler: Sahne[];
  aktif: number;
  aktifVurus: number;
  ilerleme: IlerlemeDeposu;
  ilTiklama?: (plaka: number, ad: string) => void;
};

export default function OgretmenSahnesi({ api, svgRef, canliRef, sahneler, aktif, aktifVurus, ilerleme, ilTiklama }: Props) {
  const tasiyiciRef = useRef<HTMLDivElement>(null);
  const p = useSyncExternalStore(ilerleme.abone, ilerleme.al, ilerleme.al);

  useEffect(() => {
    if (!api) return;
    const uygula = (sx: number, sy: number, z: number) => {
      if (tasiyiciRef.current) tasiyiciRef.current.style.transform = `translate(${sx * z}px, ${sy * z}px) scale(${z})`;
    };
    const st = api.getAppState();
    uygula(st.scrollX, st.scrollY, st.zoom.value);
    return api.onScrollChange((sx, sy, zoom) => uygula(sx, sy, zoom.value));
  }, [api]);

  useLayoutEffect(() => {
    const kok = svgRef.current;
    if (!kok) return;
    const adaylar = kok.querySelectorAll<SVGGeometryElement>("[data-kalem]");
    const el = adaylar[adaylar.length - 1];
    if (!el) {
      canliRef.current.kalem = null;
      return;
    }
    try {
      const oran = Number(el.dataset.p ?? 0);
      const nokta = el.getPointAtLength(el.getTotalLength() * oran);
      const m = el.getScreenCTM();
      const km = kok.getScreenCTM();
      if (!m || !km) return;
      const dunya = new DOMPoint(nokta.x, nokta.y).matrixTransform(m).matrixTransform(km.inverse());
      canliRef.current.kalem = { x: dunya.x, y: dunya.y };
    } catch {
      canliRef.current.kalem = null;
    }
  });

  const aktifSahne = aktif >= 0 ? sahneler[aktif] : undefined;
  return (
    <div data-ogretmen-katmani className={`pointer-events-none absolute inset-0 overflow-hidden ${ilTiklama ? "z-[4]" : ""}`} aria-hidden={!ilTiklama}>
      <div ref={tasiyiciRef} className="absolute left-0 top-0 origin-top-left">
        <svg
          ref={svgRef}
          width={ALAN_W}
          height={Math.max(1, sahneler.length) * (ALAN_H + 120)}
          overflow="visible"
          className="block"
          style={{ overflow: "visible" }}
        >
          {aktifSahne && (
            <SahneKatmani key={aktif} sahne={aktifSahne} sira={aktif} vurusSira={aktifVurus} p={p} ilTiklama={ilTiklama} />
          )}
        </svg>
      </div>
    </div>
  );
}

export { FOTO_BLOK };
