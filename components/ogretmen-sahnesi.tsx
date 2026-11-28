"use client";

import {
  Fragment,
  memo,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import type { Drawable, Options } from "roughjs/bin/core";
import { cities } from "turkey-map-react/data";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { CanliKatman } from "@/hooks/use-oynatici";
import {
  EL_YAZISI,
  Cizgi,
  Kaba,
  Yazi,
  aralikta,
  azHareket,
  bosYereYerlestir,
  etiketBirlestir,
  etiketNormal,
  gen,
  kesisir,
  parcaIlerlemesi,
  satirlaraBol,
  sinirIcineAl,
  sinirla,
  tohum,
  yaziGenisligi,
  yaziSol,
  type Akis,
  type Hizalama,
  type Parca,
  type Sinir,
} from "@/components/cizim/ortak";
import { GeometriBlok } from "@/components/cizim/geometri-blok";
import { AkisSemasiBlok, TabloBlok, ZamanCizelgesiBlok } from "@/components/cizim/akis-ve-tablo";
import { HazirSahneBlok } from "@/components/cizim/sablon-blok";
import { latexGorseli, type HazirGorsel } from "@/lib/gorsel-donustur";
import { guzelAdim, ifadeDerle } from "@/lib/matematik";
import { duzYaziyaCevir } from "@/lib/metin-temizle";
import { ALAN_H, ALAN_W, FOTO_BLOK, alanY, katmanFotografi, renkCoz, yerlesim, type Blok, type IlerlemeDeposu } from "@/lib/ogretmen-cizim";
import {
  aktifKatman,
  gorselKimlikleriniAyir,
  vurusKatmani,
  type AkisSemasiAksiyonu,
  type Aksiyon,
  type Bolge,
  type DiyagramAksiyonu,
  type FormulAksiyonu,
  type GeometriAksiyonu,
  type GrafikAksiyonu,
  type HaritaAksiyonu,
  type HazirSahneAksiyonu,
  type Sahne,
  type TabloAksiyonu,
  type ZamanCizelgesiAksiyonu,
} from "@/lib/types";

const IL = new Map(cities.map((c) => [c.plateNumber, c]));

export { etiketBirlestir };

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

const HARITA_VB = { x: 10, y: 135, w: 1030, h: 465 };
const HARITA_SINIR: Sinir = { x0: HARITA_VB.x + 4, y0: HARITA_VB.y + 4, x1: HARITA_VB.x + HARITA_VB.w - 4, y1: HARITA_VB.y + HARITA_VB.h - 4 };

function HaritaBlok({
  parcalar,
  ilTiklama,
  kutu,
}: {
  parcalar: Parca<HaritaAksiyonu>[];
  ilTiklama?: (plaka: number, ad: string) => void;
  kutu: Blok["kutu"];
}) {
  const olcek = Math.min(kutu.w / HARITA_VB.w, kutu.h / HARITA_VB.h);
  const etiketBoyut = aralikta(18 / olcek, 14, 34);
  const okBoyut = aralikta(17 / olcek, 13, 32);
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
    <svg viewBox={`${HARITA_VB.x} ${HARITA_VB.y} ${HARITA_VB.w} ${HARITA_VB.h}`} preserveAspectRatio="xMidYMin meet" overflow="hidden">
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
        const okEtiket = o.etiket
          ? sinirIcineAl(0.25 * a.x + 0.5 * cx + 0.25 * b.x, 0.25 * a.y + 0.5 * cy + 0.25 * b.y - 8, o.etiket, okBoyut, "middle", HARITA_SINIR)
          : null;
        return (
          <g key={`ok-${i}`} style={{ pointerEvents: "none" }}>
            <Cizgi d={`M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}`} renk="#1971c2" kalinlik={3} p={sinirla(o.p * 1.15)} />
            {o.p > 0.9 && <Cizgi d={`M${uc(0.45)} L${b.x} ${b.y} L${uc(-0.45)}`} renk="#1971c2" kalinlik={3} p={1} />}
            {o.etiket && okEtiket && (
              <Yazi x={okEtiket.x} y={okEtiket.y} metin={o.etiket} boyut={okBoyut} renk="#1971c2" hizala="middle" p={sinirla((o.p - 0.5) * 2)} />
            )}
          </g>
        );
      })}
      {iller.map((il) => {
        const c = IL.get(il.plaka)?.centroid;
        if (!c || il.p <= 0) return null;
        const renk = renkCoz(il.renk, "#e03131");
        const ad = il.ad || IL.get(il.plaka)?.name || "";
        const metin = etiketBirlestir(ad, il.etiket);
        const konum = sinirIcineAl(c.x, c.y - 14, metin, etiketBoyut, "middle", HARITA_SINIR);
        return (
          <g key={`pin-${il.plaka}`} style={{ pointerEvents: "none" }}>
            <circle cx={c.x} cy={c.y} r={6 * sinirla(il.p * 2)} fill={renk} stroke="#ffffff" strokeWidth={2} />
            <Yazi x={konum.x} y={konum.y} metin={metin} boyut={etiketBoyut} renk="#1e1e1e" hizala="middle" p={sinirla((il.p - 0.4) * 1.7)} />
          </g>
        );
      })}
    </svg>
  );
}

const GW = 600;
const GH = 420;
const M = { l: 52, r: 22, t: 22, b: 44 };

const GRAFIK_SINIR: Sinir = { x0: 4, y0: 4, x1: GW - 4, y1: GH - 4 };

function GrafikBlok({ parcalar, blokId, kutu }: { parcalar: Parca<GrafikAksiyonu>[]; blokId: string; kutu: Blok["kutu"] }) {
  const olcek = Math.min(kutu.w / GW, kutu.h / GH);
  const tikBoyut = aralikta(13 / olcek, 10, 16);
  const etiketBoyut = aralikta(17 / olcek, 13, 22);
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

  const noktaEtiketleri = new Map<number, { x: number; y: number; metin: string }>();
  const engeller: Sinir[] = [];
  ogeler.forEach((o, i) => {
    if (o.tur !== "n" || !o.nokta) return;
    const metin = etiketBirlestir(o.nokta.etiket || `(${o.nokta.x}, ${o.nokta.y})`);
    const yer = bosYereYerlestir(sx(o.nokta.x) + 10, sy(o.nokta.y) - 10, metin, etiketBoyut, "start", GRAFIK_SINIR, engeller);
    engeller.push(yer.kutu);
    noktaEtiketleri.set(i, { x: yer.x, y: yer.y, metin });
  });

  const isaretler = (bas: number, son: number, adim: number) => {
    const s: number[] = [];
    for (let v = Math.ceil(bas / adim) * adim; v <= son + 1e-9 && s.length < 30; v += adim) if (Math.abs(v) > 1e-9) s.push(Number(v.toFixed(6)));
    return s;
  };

  return (
    <svg viewBox={`0 0 ${GW} ${GH}`} preserveAspectRatio="xMidYMin meet" overflow="hidden">
      <Kaba cizim={eksenler.x} p={eksenP} />
      <Kaba cizim={eksenler.y} p={eksenP} />
      {eksenP > 0.6 && (
        <g fontFamily={EL_YAZISI} fontSize={tikBoyut} fill="#495057" opacity={sinirla((eksenP - 0.6) * 2.5)}>
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
          <text x={GW - M.r - 2} y={eksenler.ex - 8} fontSize={tikBoyut + 3} textAnchor="end">x</text>
          <text x={eksenler.ey + 8} y={M.t + 4} fontSize={tikBoyut + 3}>y</text>
        </g>
      )}
      {ogeler.map((o, i) => {
        if (o.p <= 0) return null;
        if (o.tur === "n" && o.nokta) {
          const { x, y } = o.nokta;
          const konum = noktaEtiketleri.get(i)!;
          const metin = konum.metin;
          return (
            <g key={i}>
              <Cizgi d={`M${sx(x)} ${eksenler.ex} L${sx(x)} ${sy(y)} L${eksenler.ey} ${sy(y)}`} renk="#adb5bd" kalinlik={1.5} p={o.p} kesikli />
              <circle cx={sx(x)} cy={sy(y)} r={6 * sinirla(o.p * 2)} fill="#e03131" stroke="#fff" strokeWidth={2} />
              <Yazi x={konum.x} y={konum.y} metin={metin} boyut={etiketBoyut} renk="#e03131" p={sinirla((o.p - 0.3) * 1.5)} />
            </g>
          );
        }
        return (
          <FonksiyonEgrisi
            key={i}
            ifade={o.veri.ifade}
            renk={renkCoz(o.veri.renk, "#1971c2")}
            etiket={o.veri.etiket}
            etiketBoyut={etiketBoyut}
            engeller={engeller}
            p={o.p}
            x0={x0}
            x1={x1}
            y0={y0}
            y1={y1}
            sx={sx}
            sy={sy}
          />
        );
      })}
    </svg>
  );
}

function FonksiyonEgrisi({
  ifade,
  renk,
  etiket,
  etiketBoyut,
  engeller,
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
  etiketBoyut: number;
  engeller: Sinir[];
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
  const egriEtiketi = etiket || `y = ${ifade}`;
  const etiketKonum = son ? bosYereYerlestir(son[0] - 6, son[1] - 12, egriEtiketi, etiketBoyut, "end", GRAFIK_SINIR, engeller) : null;
  return (
    <g>
      <clipPath id={`k${tohum(ifade)}`}>
        <rect x={M.l} y={M.t - 4} width={GW - M.l - M.r + 4} height={GH - M.t - M.b + 8} />
      </clipPath>
      <g clipPath={`url(#k${tohum(ifade)})`}>
        <Cizgi d={d} renk={renk} kalinlik={3} p={p} />
      </g>
      {etiketKonum && (
        <Yazi x={etiketKonum.x} y={etiketKonum.y} metin={egriEtiketi} boyut={etiketBoyut} renk={renk} hizala="end" p={sinirla((p - 0.85) * 6.6)} />
      )}
    </g>
  );
}

const IZINLI = new Set(["path", "circle", "ellipse", "rect", "line", "polyline", "polygon", "text", "g"]);
const RENK_DESENI = /^(#[0-9a-f]{3,8}|[a-z]{3,20}|rgba?\([\d\s.,%]+\))$/i;
const DONUSUM_DESENI = /^[a-z0-9\s(),.\-]+$/i;
const YOL_DESENI = /^[MmLlHhVvCcSsQqTtAaZz\d\s.,\-eE]+$/;

type HareketTuru = "kay" | "gidipgel" | "yol" | "don" | "salin" | "nabiz";
type Ivme = "sabit" | "hizlan" | "yavasla" | "yumusak";

type Canlandirma = {
  tur: HareketTuru;
  dx: number;
  dy: number;
  yol?: string;
  yolSinir: Sinir | null;
  merkez?: [number, number];
  aci: number;
  sure: number;
  gecikme: number;
  tekrar: boolean;
  ivme: Ivme;
  yonelim: boolean;
  yon: 1 | -1;
};

type GrupHareketi = { spec: Canlandirma; grup: number };

const VARSAYILAN_SURE: Record<HareketTuru, number> = { kay: 2.5, gidipgel: 1.6, yol: 3, don: 4, salin: 2, nabiz: 1.2 };

function animOku(el: Element): { hareket?: Canlandirma; akis?: Akis } | null {
  const tur = el.getAttribute("data-anim")?.trim().toLowerCase();
  if (!tur) return null;
  const deger = (ad: string, v: number, min: number, max: number) => {
    const n = parseFloat(el.getAttribute(ad) ?? "");
    return aralikta(Number.isFinite(n) ? n : v, min, max);
  };
  const yon = el.getAttribute("data-yon")?.trim() === "-1" ? -1 : 1;
  const gecikme = deger("data-gecikme", 0, 0, 10);
  if (tur === "akis") return { akis: { sure: deger("data-sure", 1, 0.2, 10), yon, gecikme } };
  if (!(tur in VARSAYILAN_SURE)) return null;
  const t = tur as HareketTuru;
  const dx = deger("data-dx", 0, -2000, 2000);
  const dy = deger("data-dy", 0, -2000, 2000);
  if ((t === "kay" || t === "gidipgel") && !dx && !dy) return null;
  const yolHam = el.getAttribute("data-yol")?.trim() ?? "";
  const yol = yolHam && yolHam.length < 2000 && YOL_DESENI.test(yolHam) ? yolHam : undefined;
  if (t === "yol" && !yol) return null;
  const m = (el.getAttribute("data-merkez") ?? "").split(/[\s,]+/).filter(Boolean).map(Number);
  const ivme = el.getAttribute("data-ivme")?.trim();
  return {
    hareket: {
      tur: t,
      dx,
      dy,
      yol,
      yolSinir: yol ? cizimSiniri(gen.path(yol, { roughness: 0 })) : null,
      merkez: m.length === 2 && m.every(Number.isFinite) ? [m[0], m[1]] : undefined,
      aci: deger("data-aci", 25, 1, 90),
      sure: deger("data-sure", VARSAYILAN_SURE[t], 0.3, 20),
      gecikme,
      tekrar: el.getAttribute("data-tekrar")?.trim() !== "1",
      ivme: ivme === "sabit" || ivme === "hizlan" || ivme === "yavasla" ? ivme : "yumusak",
      yonelim: el.getAttribute("data-yonelim")?.trim() === "evet",
      yon,
    },
  };
}

type MarkerSekil =
  | { tur: "path"; d: string; fill?: string; stroke?: string; strokeWidth?: number }
  | { tur: "polygon"; points: string; fill?: string; stroke?: string; strokeWidth?: number }
  | { tur: "polyline"; points: string; fill?: string; stroke?: string; strokeWidth?: number }
  | { tur: "circle"; cx: number; cy: number; r: number; fill?: string; stroke?: string; strokeWidth?: number }
  | { tur: "ellipse"; cx: number; cy: number; rx: number; ry: number; fill?: string; stroke?: string; strokeWidth?: number }
  | { tur: "rect"; x: number; y: number; width: number; height: number; rx?: number; ry?: number; fill?: string; stroke?: string; strokeWidth?: number }
  | { tur: "line"; x1: number; y1: number; x2: number; y2: number; stroke?: string; strokeWidth?: number };

type MarkerTanimi = {
  id: string;
  viewBox: string;
  refX: number;
  refY: number;
  markerWidth: number;
  markerHeight: number;
  orient: string;
  markerUnits: "strokeWidth" | "userSpaceOnUse";
  sekiller: MarkerSekil[];
};

const MARKER_ID_DESENI = /^[a-zA-Z_][\w:-]*$/;
const MARKER_URL_DESENI = /^url\(\s*#([a-zA-Z_][\w:-]*)\s*\)$/;

type DiyagramOgesi =
  | {
      tur: "sekil";
      cizim: Drawable;
      donusum?: string;
      kapali: boolean;
      kesikli: boolean;
      sinir: Sinir | null;
      hareket?: GrupHareketi;
      akis?: Akis;
      renk: string;
      kalinlik: number;
      markerYol?: string;
      markerDonusum?: string;
      markerStart?: string;
      markerEnd?: string;
      markerMid?: string;
    }
  | {
      tur: "yazi";
      x: number;
      y: number;
      ozgunY: number;
      metin: string;
      boyut: number;
      ozgunBoyut: number;
      renk: string;
      hizala: Hizalama;
      donusum?: string;
      hareket?: GrupHareketi;
    };

const birlestir = (a: Sinir, b: Sinir): Sinir => ({
  x0: Math.min(a.x0, b.x0),
  y0: Math.min(a.y0, b.y0),
  x1: Math.max(a.x1, b.x1),
  y1: Math.max(a.y1, b.y1),
});

function ogeSiniri(o: DiyagramOgesi): Sinir | null {
  return o.tur === "yazi" ? yaziSiniri(o) : o.sinir;
}

function grupSinirlari(ogeler: DiyagramOgesi[]) {
  const m = new Map<number, Sinir>();
  for (const o of ogeler) {
    const s = o.hareket ? ogeSiniri(o) : null;
    if (!o.hareket || !s) continue;
    const onceki = m.get(o.hareket.grup);
    m.set(o.hareket.grup, onceki ? birlestir(onceki, s) : s);
  }
  return m;
}

function hareketMerkezi(h: Canlandirma, s: Sinir): [number, number] {
  if (h.merkez) return h.merkez;
  const cx = (s.x0 + s.x1) / 2;
  return h.tur === "salin" ? [cx, s.y0] : [cx, (s.y0 + s.y1) / 2];
}

function dondur(x: number, y: number, mx: number, my: number, derece: number): [number, number] {
  const r = (derece * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [mx + (x - mx) * c - (y - my) * s, my + (x - mx) * s + (y - my) * c];
}

function hareketKapsami(s: Sinir, h: Canlandirma, [mx, my]: [number, number]): Sinir {
  const koseler: [number, number][] = [
    [s.x0, s.y0],
    [s.x1, s.y0],
    [s.x0, s.y1],
    [s.x1, s.y1],
  ];
  const noktalardan = (n: [number, number][]) => n.reduce<Sinir>((a, [x, y]) => birlestir(a, { x0: x, y0: y, x1: x, y1: y }), s);
  switch (h.tur) {
    case "kay":
    case "gidipgel":
      return birlestir(s, { x0: s.x0 + h.dx, y0: s.y0 + h.dy, x1: s.x1 + h.dx, y1: s.y1 + h.dy });
    case "yol":
      return h.yolSinir
        ? birlestir(s, { x0: s.x0 + h.yolSinir.x0, y0: s.y0 + h.yolSinir.y0, x1: s.x1 + h.yolSinir.x1, y1: s.y1 + h.yolSinir.y1 })
        : s;
    case "nabiz":
      return noktalardan(koseler.map(([x, y]) => [mx + (x - mx) * 1.15, my + (y - my) * 1.15]));
    case "don": {
      const r = Math.max(...koseler.map(([x, y]) => Math.hypot(x - mx, y - my)));
      return birlestir(s, { x0: mx - r, y0: my - r, x1: mx + r, y1: my + r });
    }
    case "salin":
      return noktalardan(koseler.flatMap(([x, y]) => [dondur(x, y, mx, my, h.aci), dondur(x, y, mx, my, -h.aci)]));
  }
}

type Matris = [number, number, number, number, number, number];

const carp = (m: Matris, n: Matris): Matris => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];

function donusumMatrisi(metin: string): Matris | null {
  const desen = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/gi;
  let m: Matris = [1, 0, 0, 1, 0, 0];
  let bulundu = false;
  for (let e = desen.exec(metin); e; e = desen.exec(metin)) {
    bulundu = true;
    const a = e[2].split(/[\s,]+/).filter(Boolean).map(Number);
    if (a.some((v) => !Number.isFinite(v))) return null;
    const derece = ((a[0] ?? 0) * Math.PI) / 180;
    let n: Matris;
    switch (e[1].toLowerCase()) {
      case "matrix":
        if (a.length !== 6) return null;
        n = a as Matris;
        break;
      case "translate":
        n = [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0];
        break;
      case "scale":
        n = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0];
        break;
      case "rotate":
        n = [Math.cos(derece), Math.sin(derece), -Math.sin(derece), Math.cos(derece), 0, 0];
        if (a.length === 3) n = carp(carp([1, 0, 0, 1, a[1], a[2]], n), [1, 0, 0, 1, -a[1], -a[2]]);
        break;
      case "skewx":
        n = [1, 0, Math.tan(derece), 1, 0, 0];
        break;
      default:
        n = [1, Math.tan(derece), 0, 1, 0, 0];
    }
    m = carp(m, n);
  }
  return bulundu ? m : null;
}

function cizimDonustur(c: Drawable, m: Matris): Drawable {
  return {
    ...c,
    sets: c.sets.map((set) => ({
      ...set,
      ops: set.ops.map((op) => ({
        ...op,
        data: op.data.map((v, i) => (i % 2 === 0 ? m[0] * v + m[2] * op.data[i + 1] + m[4] : m[1] * op.data[i - 1] + m[3] * v + m[5])),
      })),
    })),
  };
}

const VARSAYILAN_VB = "0 0 800 460";

function cizimSiniri(c: Drawable): Sinir | null {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const set of c.sets) {
    for (const op of set.ops) {
      for (let i = 0; i + 1 < op.data.length; i += 2) {
        const x = op.data[i];
        const y = op.data[i + 1];
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    }
  }
  return Number.isFinite(x0) ? { x0, y0, x1, y1 } : null;
}

function yaziSiniri(o: Extract<DiyagramOgesi, { tur: "yazi" }>): Sinir {
  const w = yaziGenisligi(o.metin, o.boyut);
  const x0 = yaziSol(o.x, w, o.hizala);
  return { x0, y0: o.y - o.boyut * 0.9, x1: x0 + w, y1: o.y + o.boyut * 0.3 };
}

function viewBoxCoz(vb: string) {
  const [x, y, w, h] = vb.split(/[\s,]+/).map(Number);
  return { x, y, w, h };
}

function sinirIcindeMi(ic: Sinir, dis: Sinir) {
  const icx = (ic.x0 + ic.x1) / 2;
  const icy = (ic.y0 + ic.y1) / 2;
  return icx > dis.x0 && icx < dis.x1 && icy > dis.y0 && icy < dis.y1;
}

function diyagramDuzenle(parcalar: DiyagramOgesi[][], viewBox: string): string {
  const vb = viewBoxCoz(viewBox);
  const grupAnahtari = (li: number, o: DiyagramOgesi) => (o.hareket ? `${li}:${o.hareket.grup}` : "");
  const sekiller = parcalar
    .flatMap((liste, li) =>
      liste
        .filter((o): o is Extract<DiyagramOgesi, { tur: "sekil" }> => o.tur === "sekil" && o.kapali && !o.donusum && Boolean(o.sinir))
        .map((o) => ({ s: o.sinir as Sinir, g: grupAnahtari(li, o) })),
    )
    .filter(({ s }) => s.x1 - s.x0 < vb.w * 0.65 && s.y1 - s.y0 < vb.h * 0.7);
  const etiketler = parcalar.flatMap((liste, li) =>
    liste
      .filter((o): o is Extract<DiyagramOgesi, { tur: "yazi" }> => o.tur === "yazi" && !o.donusum)
      .map((t) => ({ t, g: grupAnahtari(li, t) })),
  );

  for (const { t } of etiketler) t.y = t.ozgunY;

  const yerlesenSinirlar: Sinir[] = [];
  for (const { t, g } of etiketler) {
    const grupSekilleri = sekiller.filter((x) => x.g === g).map((x) => x.s);
    const basSinir = yaziSiniri(t);
    const carpisiyor = (kutu: Sinir) =>
      yerlesenSinirlar.some((d) => kesisir(d, kutu)) ||
      grupSekilleri.some((s) => kesisir(kutu, s) && !sinirIcindeMi(kutu, s));

    if (carpisiyor(basSinir)) {
      const adayYler = new Set<number>();
      for (const s of grupSekilleri) {
        if (kesisir(basSinir, s) && !sinirIcindeMi(basSinir, s)) {
          const sOrtaY = (s.y0 + s.y1) / 2;
          const bOrtaY = (basSinir.y0 + basSinir.y1) / 2;
          adayYler.add(bOrtaY >= sOrtaY ? s.y1 + 6 + t.boyut * 0.9 : s.y0 - 6 - t.boyut * 0.3);
        }
      }
      for (const kat of [1.15, -1.15, 2.3, -2.3, 3.5, -3.5]) adayYler.add(t.ozgunY + kat * t.boyut);
      for (const adayY of adayYler) {
        const adayKutu = yaziSiniri({ ...t, y: adayY });
        if (!carpisiyor(adayKutu)) {
          t.y = adayY;
          break;
        }
      }
    }
    yerlesenSinirlar.push(yaziSiniri(t));
  }

  const donusumluVar = parcalar.flat().some((o) => o.donusum);
  let x0 = donusumluVar ? vb.x : Infinity;
  let y0 = donusumluVar ? vb.y : Infinity;
  let x1 = donusumluVar ? vb.x + vb.w : -Infinity;
  let y1 = donusumluVar ? vb.y + vb.h : -Infinity;
  for (const liste of parcalar) {
    const gruplar = grupSinirlari(liste);
    for (const o of liste) {
      if (o.donusum) continue;
      let s = ogeSiniri(o);
      if (!s) continue;
      if (o.hareket) s = hareketKapsami(s, o.hareket.spec, hareketMerkezi(o.hareket.spec, gruplar.get(o.hareket.grup) ?? s));
      x0 = Math.min(x0, s.x0 - 24);
      y0 = Math.min(y0, s.y0 - 24);
      x1 = Math.max(x1, s.x1 + 24);
      y1 = Math.max(y1, s.y1 + 24);
    }
  }
  if (!Number.isFinite(x0)) return viewBox;
  return `${x0} ${y0} ${x1 - x0} ${y1 - y0}`;
}

function markerRenkAl(el: Element, ad: string): string | undefined {
  const r = el.getAttribute(ad)?.trim();
  if (!r) return undefined;
  if (r === "context-stroke" || r === "context-fill" || r === "none" || r === "transparent" || RENK_DESENI.test(r)) return r;
  return undefined;
}

function markerleriOku(kok: Element): MarkerTanimi[] {
  const liste: MarkerTanimi[] = [];
  const sayi = (el: Element, ad: string, v = 0) => {
    const n = parseFloat(el.getAttribute(ad) ?? "");
    return Number.isFinite(n) ? n : v;
  };
  const noktalarMetni = (el: Element) =>
    (el.getAttribute("points") ?? "")
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .reduce<[number, number][]>((acc, v, i, a) => (i % 2 === 0 && Number.isFinite(v) && Number.isFinite(a[i + 1]) ? [...acc, [v, a[i + 1]]] : acc), [])
      .map(([x, y]) => `${x} ${y}`)
      .join(" ");

  const sekilTopla = (kap: Element, out: MarkerSekil[]) => {
    for (const cocuk of Array.from(kap.children)) {
      if (out.length >= 16) break;
      const ad = cocuk.nodeName.toLowerCase();
      if (ad === "g") {
        sekilTopla(cocuk, out);
        continue;
      }
      const fill = markerRenkAl(cocuk, "fill");
      const stroke = markerRenkAl(cocuk, "stroke");
      const sw = cocuk.hasAttribute("stroke-width") ? aralikta(sayi(cocuk, "stroke-width", 1.5), 0.5, 6) : undefined;
      if (ad === "path") {
        const d = cocuk.getAttribute("d")?.trim() ?? "";
        if (d && d.length < 2000 && YOL_DESENI.test(d)) out.push({ tur: "path", d, fill, stroke, strokeWidth: sw });
      } else if (ad === "polygon" || ad === "polyline") {
        const pts = noktalarMetni(cocuk);
        if (pts) out.push({ tur: ad, points: pts, fill, stroke, strokeWidth: sw });
      } else if (ad === "circle") {
        out.push({ tur: "circle", cx: sayi(cocuk, "cx"), cy: sayi(cocuk, "cy"), r: aralikta(sayi(cocuk, "r", 3), 0.5, 50), fill, stroke, strokeWidth: sw });
      } else if (ad === "ellipse") {
        out.push({
          tur: "ellipse",
          cx: sayi(cocuk, "cx"),
          cy: sayi(cocuk, "cy"),
          rx: aralikta(sayi(cocuk, "rx", 3), 0.5, 50),
          ry: aralikta(sayi(cocuk, "ry", 3), 0.5, 50),
          fill,
          stroke,
          strokeWidth: sw,
        });
      } else if (ad === "rect") {
        out.push({
          tur: "rect",
          x: sayi(cocuk, "x"),
          y: sayi(cocuk, "y"),
          width: aralikta(sayi(cocuk, "width", 6), 0.5, 100),
          height: aralikta(sayi(cocuk, "height", 6), 0.5, 100),
          rx: cocuk.hasAttribute("rx") ? sayi(cocuk, "rx") : undefined,
          ry: cocuk.hasAttribute("ry") ? sayi(cocuk, "ry") : undefined,
          fill,
          stroke,
          strokeWidth: sw,
        });
      } else if (ad === "line") {
        out.push({
          tur: "line",
          x1: sayi(cocuk, "x1"),
          y1: sayi(cocuk, "y1"),
          x2: sayi(cocuk, "x2"),
          y2: sayi(cocuk, "y2"),
          stroke,
          strokeWidth: sw,
        });
      }
    }
  };

  for (const el of Array.from(kok.querySelectorAll("defs marker, marker"))) {
    if (liste.length >= 24) break;
    const id = el.getAttribute("id")?.trim() ?? "";
    if (!MARKER_ID_DESENI.test(id)) continue;
    const vbHam = el.getAttribute("viewBox")?.trim() ?? "";
    const vbGecerli = /^-?[\d.]+([\s,]+-?[\d.]+){3}$/.test(vbHam) && viewBoxCoz(vbHam).w > 0 && viewBoxCoz(vbHam).h > 0;
    const orientHam = el.getAttribute("orient")?.trim() ?? "auto";
    const orient =
      orientHam === "auto" || orientHam === "auto-start-reverse" || /^-?\d+(?:\.\d+)?$/.test(orientHam) ? orientHam : "auto";
    const markerUnits = el.getAttribute("markerUnits")?.trim() === "userSpaceOnUse" ? "userSpaceOnUse" : "strokeWidth";
    const sekiller: MarkerSekil[] = [];
    sekilTopla(el, sekiller);
    if (!sekiller.length) continue;
    liste.push({
      id,
      viewBox: vbGecerli ? vbHam : "0 0 10 10",
      refX: sayi(el, "refX", 0),
      refY: sayi(el, "refY", 0),
      markerWidth: aralikta(sayi(el, "markerWidth", 6), 1, 40),
      markerHeight: aralikta(sayi(el, "markerHeight", 6), 1, 40),
      orient,
      markerUnits,
      sekiller,
    });
  }
  return liste;
}

function markerIdAl(el: Element, ad: string): string | undefined {
  const ham = el.getAttribute(ad)?.trim() ?? "";
  const eslesme = ham.match(MARKER_URL_DESENI);
  return eslesme ? eslesme[1] : undefined;
}

function markerSekliCiz(s: MarkerSekil, key: number): ReactNode {
  switch (s.tur) {
    case "path":
      return <path key={key} d={s.d} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
    case "polygon":
      return <polygon key={key} points={s.points} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
    case "polyline":
      return <polyline key={key} points={s.points} fill={s.fill ?? "none"} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
    case "circle":
      return <circle key={key} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
    case "ellipse":
      return <ellipse key={key} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
    case "rect":
      return <rect key={key} x={s.x} y={s.y} width={s.width} height={s.height} rx={s.rx} ry={s.ry} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
    case "line":
      return <line key={key} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
  }
}

function diyagramCoz(svg: string, anahtar: string): { viewBox: string; ogeler: DiyagramOgesi[]; markerler: MarkerTanimi[] } {
  const belge = new DOMParser().parseFromString(svg, "image/svg+xml");
  const kok = belge.documentElement;
  if (kok.nodeName.toLowerCase() !== "svg" || belge.querySelector("parsererror")) {
    return { viewBox: VARSAYILAN_VB, ogeler: [], markerler: [] };
  }
  const vb = kok.getAttribute("viewBox")?.trim() ?? "";
  const viewBox = /^-?[\d.]+([\s,]+-?[\d.]+){3}$/.test(vb) && viewBoxCoz(vb).w > 0 && viewBoxCoz(vb).h > 0 ? vb : VARSAYILAN_VB;
  const markerler = markerleriOku(kok);
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

  let grupSayaci = 0;
  const gez = (el: Element, ustDonusum: string, ustRenk?: string, ustDolgu?: string, ustHareket?: GrupHareketi, ustAkis?: Akis) => {
    for (const cocuk of Array.from(el.children)) {
      const ad = cocuk.nodeName.toLowerCase();
      if (!IZINLI.has(ad) || ogeler.length > 120) continue;
      const t = cocuk.getAttribute("transform")?.trim();
      const donusum = [ustDonusum, t && DONUSUM_DESENI.test(t) ? t : ""].filter(Boolean).join(" ");
      const stroke = renkAl(cocuk, "stroke") ?? ustRenk;
      const fill = renkAl(cocuk, "fill") ?? ustDolgu;
      const anim = animOku(cocuk);
      const hareket = ustHareket ?? (anim?.hareket ? { spec: anim.hareket, grup: grupSayaci++ } : undefined);
      const akis = anim?.akis ?? ustAkis;
      if (ad === "g") {
        gez(cocuk, donusum, stroke, fill, hareket, akis);
        continue;
      }
      const matris = donusum ? donusumMatrisi(donusum) : null;
      if (ad === "text") {
        const metin = duzYaziyaCevir(cocuk.textContent?.trim() ?? "").replace(/\s+/g, " ").slice(0, 80);
        if (!metin) continue;
        const anchor = cocuk.getAttribute("text-anchor");
        let x = sayi(cocuk, "x");
        let y = sayi(cocuk, "y");
        let boyut = sayi(cocuk, "font-size", 20);
        let yaziDonusumu = donusum || undefined;
        if (matris && Math.abs(matris[1]) < 1e-6 && Math.abs(matris[2]) < 1e-6) {
          x = matris[0] * x + matris[4];
          y = matris[3] * y + matris[5];
          boyut *= Math.abs(matris[3]);
          yaziDonusumu = undefined;
        }
        boyut = aralikta(boyut, 10, 48);
        const tekrar = ogeler.some(
          (o) => o.tur === "yazi" && etiketNormal(o.metin) === etiketNormal(metin) && Math.hypot(o.x - x, o.y - y) < 60,
        );
        if (tekrar) continue;
        ogeler.push({
          tur: "yazi",
          x,
          y,
          ozgunY: y,
          metin,
          boyut,
          ozgunBoyut: boyut,
          renk: fill && fill !== "none" ? fill : "#1e1e1e",
          hizala: anchor === "middle" || anchor === "end" ? anchor : "start",
          donusum: yaziDonusumu,
          hareket,
        });
        continue;
      }
      const kesikli = Boolean(cocuk.getAttribute("stroke-dasharray")?.trim().match(/^[\d.]+/));
      const kalemRenk = stroke && stroke !== "none" ? stroke : "#1e1e1e";
      const kalemKalinlik = Math.max(1, Math.min(6, sayi(cocuk, "stroke-width", 2.4)));
      const o: Options = {
        seed: tohum(`${anahtar}-${ogeler.length}`),
        roughness: 0.2,
        bowing: 0.22,
        preserveVertices: true,
        disableMultiStroke: true,
        stroke: kalemRenk,
        strokeWidth: kalemKalinlik,
        fill: fill && fill !== "none" && fill !== "transparent" ? fill : undefined,
        fillStyle: "solid",
      };
      let cizim: Drawable | null = null;
      let markerYol: string | undefined;
      if (ad === "line") {
        const x1 = sayi(cocuk, "x1");
        const y1 = sayi(cocuk, "y1");
        const x2 = sayi(cocuk, "x2");
        const y2 = sayi(cocuk, "y2");
        cizim = gen.line(x1, y1, x2, y2, o);
        markerYol = `M${x1} ${y1} L${x2} ${y2}`;
      } else if (ad === "rect") {
        cizim = gen.rectangle(sayi(cocuk, "x"), sayi(cocuk, "y"), sayi(cocuk, "width"), sayi(cocuk, "height"), o);
      } else if (ad === "circle") {
        cizim = gen.circle(sayi(cocuk, "cx"), sayi(cocuk, "cy"), sayi(cocuk, "r") * 2, o);
      } else if (ad === "ellipse") {
        cizim = gen.ellipse(sayi(cocuk, "cx"), sayi(cocuk, "cy"), sayi(cocuk, "rx") * 2, sayi(cocuk, "ry") * 2, o);
      } else if (ad === "polyline") {
        const pts = noktalar(cocuk);
        if (pts.length > 1) {
          cizim = gen.linearPath(pts, o);
          markerYol = `M${pts[0][0]} ${pts[0][1]} ${pts.slice(1).map(([px, py]) => `L${px} ${py}`).join(" ")}`;
        }
      } else if (ad === "polygon" && noktalar(cocuk).length > 2) {
        cizim = gen.polygon(noktalar(cocuk), o);
      } else if (ad === "path") {
        const d = cocuk.getAttribute("d")?.trim() ?? "";
        if (d && d.length < 6000 && YOL_DESENI.test(d)) {
          cizim = gen.path(d, o);
          markerYol = d;
        }
      }
      if (cizim) {
        const kapali = ad === "rect" || ad === "circle" || ad === "ellipse" || ad === "polygon";
        const markerStart = markerYol ? markerIdAl(cocuk, "marker-start") : undefined;
        const markerEnd = markerYol ? markerIdAl(cocuk, "marker-end") : undefined;
        const markerMid = markerYol ? markerIdAl(cocuk, "marker-mid") : undefined;
        const markerVar = Boolean(markerStart || markerEnd || markerMid);
        const sonCizim = matris ? cizimDonustur(cizim, matris) : cizim;
        const sekilDonusumu = matris ? undefined : donusum || undefined;
        const hamSinir = cizimSiniri(sonCizim);
        const sinir =
          hamSinir && markerVar
            ? { x0: hamSinir.x0 - 10, y0: hamSinir.y0 - 10, x1: hamSinir.x1 + 10, y1: hamSinir.y1 + 10 }
            : hamSinir;
        ogeler.push({
          tur: "sekil",
          cizim: sonCizim,
          donusum: sekilDonusumu,
          kapali,
          kesikli,
          sinir,
          hareket,
          akis,
          renk: kalemRenk,
          kalinlik: kalemKalinlik,
          markerYol: markerVar ? markerYol : undefined,
          markerDonusum: matris && markerVar && donusum ? donusum : undefined,
          markerStart,
          markerEnd,
          markerMid,
        });
      }
    }
  };
  gez(kok, "");
  return { viewBox, ogeler, markerler };
}

const DIYAGRAM_MAKS_OLCEK = 1.25;
const YAZI_KADEMESI = { normal: 20, buyuk: 26 };

function diyagramHazirla(parcalar: DiyagramOgesi[][], ilkViewBox: string, kutuW: number, kutuH: number) {
  const yazilar = parcalar.flat().filter((o): o is Extract<DiyagramOgesi, { tur: "yazi" }> => o.tur === "yazi");
  let viewBox = diyagramDuzenle(parcalar, ilkViewBox);
  for (let tur = 0; tur < 2; tur++) {
    const v = viewBoxCoz(viewBox);
    const olcek = Math.min(DIYAGRAM_MAKS_OLCEK, kutuW / v.w, kutuH / v.h);
    for (const t of yazilar) {
      const ekrandaki = t.ozgunBoyut * olcek;
      t.boyut = (ekrandaki >= 25 ? YAZI_KADEMESI.buyuk : YAZI_KADEMESI.normal) / olcek;
    }
    const sirali = [...yazilar].sort((a, b) => a.y - b.y);
    for (let i = 0; i < sirali.length; ) {
      let j = i + 1;
      while (j < sirali.length && sirali[j].y - sirali[i].y < 20) j++;
      const ortak = Math.min(...sirali.slice(i, j).map((t) => t.boyut));
      for (let k = i; k < j; k++) sirali[k].boyut = ortak;
      i = j;
    }
    viewBox = diyagramDuzenle(parcalar, ilkViewBox);
  }
  const v = viewBoxCoz(viewBox);
  if (Math.min(kutuW / v.w, kutuH / v.h) > DIYAGRAM_MAKS_OLCEK) {
    const w = kutuW / DIYAGRAM_MAKS_OLCEK;
    const h = kutuH / DIYAGRAM_MAKS_OLCEK;
    viewBox = `${v.x + v.w / 2 - w / 2} ${v.y} ${w} ${h}`;
  }
  return viewBox;
}

function DiyagramBlok({
  parcalar,
  tumSvgler,
  blokId,
  kutu,
}: {
  parcalar: Parca<DiyagramAksiyonu>[];
  tumSvgler: string[];
  blokId: string;
  kutu: Blok["kutu"];
}) {
  const markerOnEk = `m${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const svgAnahtari = tumSvgler.join("\u0000");
  const { cozumler, viewBox, gruplar, tumMarkerler } = useMemo(() => {
    const c = svgAnahtari.split("\u0000").map((svg, i) => diyagramCoz(svg, `${blokId}-${i}`));
    const vb = diyagramHazirla(c.map((x) => x.ogeler), c[0]?.viewBox ?? VARSAYILAN_VB, kutu.w, kutu.h);
    const markerHaritasi = new Map<string, MarkerTanimi>();
    for (const x of c) {
      for (const m of x.markerler) markerHaritasi.set(m.id, m);
    }
    return { cozumler: c, viewBox: vb, gruplar: c.map((x) => grupSinirlari(x.ogeler)), tumMarkerler: markerHaritasi };
  }, [blokId, svgAnahtari, kutu.w, kutu.h]);
  return (
    <svg viewBox={viewBox} preserveAspectRatio="xMidYMin meet" overflow="hidden">
      {tumMarkerler.size > 0 && (
        <defs>
          {[...tumMarkerler.values()].map((m) => (
            <marker
              key={m.id}
              id={`${markerOnEk}-${m.id}`}
              viewBox={m.viewBox}
              refX={m.refX}
              refY={m.refY}
              markerWidth={m.markerWidth}
              markerHeight={m.markerHeight}
              orient={m.orient}
              markerUnits={m.markerUnits}
            >
              {m.sekiller.map((s, si) => markerSekliCiz(s, si))}
            </marker>
          ))}
        </defs>
      )}
      {cozumler.slice(0, parcalar.length).map((c, ai) => {
        const ilerleme = c.ogeler.map((_, j) => parcaIlerlemesi(parcalar[ai].p, j, c.ogeler.length));
        const ogeCiz = (o: DiyagramOgesi, j: number) => {
          const p = ilerleme[j];
          if (p <= 0) return null;
          if (o.tur === "yazi") {
            return (
              <g key={`${ai}-${j}`} transform={o.donusum}>
                <Yazi x={o.x} y={o.y} metin={o.metin} boyut={o.boyut} renk={o.renk} hizala={o.hizala} p={p} />
              </g>
            );
          }
          const basId = o.markerStart && tumMarkerler.has(o.markerStart) ? o.markerStart : undefined;
          const sonId = o.markerEnd && tumMarkerler.has(o.markerEnd) ? o.markerEnd : undefined;
          const ortaId = o.markerMid && tumMarkerler.has(o.markerMid) ? o.markerMid : undefined;
          return (
            <g key={`${ai}-${j}`} transform={o.donusum}>
              <Kaba cizim={o.cizim} p={p} kesikli={o.kesikli} akis={o.akis} />
              {o.markerYol && basId && (
                <path
                  d={o.markerYol}
                  transform={o.markerDonusum}
                  fill="none"
                  stroke={o.renk}
                  strokeOpacity={0}
                  strokeWidth={o.kalinlik}
                  opacity={sinirla(p * 4)}
                  markerStart={`url(#${markerOnEk}-${basId})`}
                />
              )}
              {o.markerYol && (sonId || ortaId) && p >= 0.8 && (
                <path
                  d={o.markerYol}
                  transform={o.markerDonusum}
                  fill="none"
                  stroke={o.renk}
                  strokeOpacity={0}
                  strokeWidth={o.kalinlik}
                  opacity={sinirla((p - 0.8) * 5)}
                  markerEnd={sonId ? `url(#${markerOnEk}-${sonId})` : undefined}
                  markerMid={ortaId ? `url(#${markerOnEk}-${ortaId})` : undefined}
                />
              )}
            </g>
          );
        };
        const dugumler: ReactNode[] = [];
        for (let j = 0; j < c.ogeler.length; ) {
          const h = c.ogeler[j].hareket;
          if (!h) {
            dugumler.push(ogeCiz(c.ogeler[j], j));
            j++;
            continue;
          }
          let k = j;
          while (k < c.ogeler.length && c.ogeler[k].hareket?.grup === h.grup) k++;
          const sinir = gruplar[ai].get(h.grup);
          if (ilerleme[j] > 0 && sinir) {
            dugumler.push(
              <Canlandirici key={`${ai}-h${h.grup}`} hareket={h.spec} merkez={hareketMerkezi(h.spec, sinir)} aktif={ilerleme[k - 1] >= 1}>
                {c.ogeler.slice(j, k).map((o, i) => ogeCiz(o, j + i))}
              </Canlandirici>,
            );
          }
          j = k;
        }
        return <Fragment key={ai}>{dugumler}</Fragment>;
      })}
    </svg>
  );
}

const EGRILER: Record<Ivme, string> = {
  sabit: "0 0 1 1",
  hizlan: "0.55 0 1 0.45",
  yavasla: "0 0.55 0.45 1",
  yumusak: "0.45 0 0.55 1",
};

function Canlandirici({
  hareket: h,
  merkez: [mx, my],
  aktif,
  children,
}: {
  hareket: Canlandirma;
  merkez: [number, number];
  aktif: boolean;
  children: ReactNode;
}) {
  const ref = useRef<SVGGElement>(null);
  useEffect(() => {
    if (!aktif || azHareket()) return;
    ref.current?.querySelectorAll<SVGAnimationElement>("[data-canlandir]").forEach((a) => a.beginElementAt(h.gecikme));
  }, [aktif, h.gecikme]);

  const tekrarSayisi = h.tekrar ? "indefinite" : "1";
  const egri = EGRILER[h.ivme];
  const ortak = { "data-canlandir": "", begin: "indefinite", repeatCount: tekrarSayisi, fill: "freeze" as const };
  const bekleyerek = h.tekrar;
  const gidisSuresi = `${bekleyerek ? h.sure / 0.8 : h.sure}s`;

  let anim: ReactNode = null;
  if (aktif) {
    switch (h.tur) {
      case "kay":
        anim = (
          <animateTransform
            {...ortak}
            attributeName="transform"
            type="translate"
            values={bekleyerek ? `0 0;${h.dx} ${h.dy};${h.dx} ${h.dy}` : `0 0;${h.dx} ${h.dy}`}
            keyTimes={bekleyerek ? "0;0.8;1" : "0;1"}
            keySplines={bekleyerek ? `${egri};0 0 1 1` : egri}
            calcMode="spline"
            dur={gidisSuresi}
          />
        );
        break;
      case "gidipgel":
        anim = (
          <animateTransform
            {...ortak}
            attributeName="transform"
            type="translate"
            values={`0 0;${h.dx} ${h.dy};0 0`}
            keyTimes="0;0.5;1"
            keySplines={`${EGRILER.yumusak};${EGRILER.yumusak}`}
            calcMode="spline"
            dur={`${h.sure}s`}
          />
        );
        break;
      case "yol":
        anim = (
          <animateMotion
            {...ortak}
            path={h.yol}
            rotate={h.yonelim ? "auto" : "0"}
            keyPoints={bekleyerek ? "0;1;1" : "0;1"}
            keyTimes={bekleyerek ? "0;0.8;1" : "0;1"}
            keySplines={bekleyerek ? `${egri};0 0 1 1` : egri}
            calcMode="spline"
            dur={gidisSuresi}
          />
        );
        break;
      case "don":
        anim = (
          <animateTransform
            {...ortak}
            attributeName="transform"
            type="rotate"
            values={`0 ${mx} ${my};${360 * h.yon} ${mx} ${my}`}
            calcMode="linear"
            dur={`${h.sure}s`}
          />
        );
        break;
      case "salin": {
        const a = h.aci * h.yon;
        anim = (
          <animateTransform
            {...ortak}
            attributeName="transform"
            type="rotate"
            values={`0 ${mx} ${my};${a} ${mx} ${my};0 ${mx} ${my};${-a} ${mx} ${my};0 ${mx} ${my}`}
            keyTimes="0;0.25;0.5;0.75;1"
            keySplines={[EGRILER.yavasla, EGRILER.hizlan, EGRILER.yavasla, EGRILER.hizlan].join(";")}
            calcMode="spline"
            dur={`${h.sure}s`}
          />
        );
        break;
      }
      case "nabiz":
        anim = (
          <animateTransform
            {...ortak}
            attributeName="transform"
            type="scale"
            values="1;1.15;1"
            keyTimes="0;0.5;1"
            keySplines={`${EGRILER.yumusak};${EGRILER.yumusak}`}
            calcMode="spline"
            dur={`${h.sure}s`}
          />
        );
        break;
    }
  }

  if (h.tur === "nabiz") {
    return (
      <g ref={ref}>
        <g transform={`translate(${mx} ${my})`}>
          <g>
            {anim}
            <g transform={`translate(${-mx} ${-my})`}>{children}</g>
          </g>
        </g>
      </g>
    );
  }
  const tasinan = h.tur === "kay" || h.tur === "yol";
  const izGoster = aktif && tasinan && !azHareket();
  return (
    <g ref={ref}>
      {izGoster && <g opacity={0.18}>{children}</g>}
      <g>
        {anim}
        {izGoster && bekleyerek && (
          <animate {...ortak} attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.05;0.88;0.97;1" dur={gidisSuresi} />
        )}
        {children}
      </g>
    </g>
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

const NOT_BOYUT = 22;
const NOT_SATIR = 31;
const LATEX_H = 60;
const SATIR_BOSLUK = 18;

function formulDuzeni(aksiyonlar: FormulAksiyonu[], kutuW: number, kutuH: number) {
  const hesapla = (w: number) => {
    let y = 6;
    const satirlar = aksiyonlar.map((a) => {
      const notlar = a.not ? satirlaraBol(duzYaziyaCevir(a.not), Math.max(NOT_BOYUT * 4, w - 24), NOT_BOYUT) : [];
      const satir = { y, notlar };
      y += (a.latex ? LATEX_H + 12 : 0) + notlar.length * NOT_SATIR + SATIR_BOSLUK;
      return satir;
    });
    return { satirlar, h: y };
  };
  let w = kutuW;
  let sonuc = hesapla(w);
  for (let i = 0; i < 3 && sonuc.h > kutuH; i++) {
    w = (kutuW * sonuc.h) / kutuH;
    sonuc = hesapla(w);
  }
  return { ...sonuc, w, h: Math.max(kutuH, sonuc.h, (w * kutuH) / kutuW) };
}

function FormulSatiri({ aksiyon, p, y, genislik, notlar }: { aksiyon: FormulAksiyonu; p: number; y: number; genislik: number; notlar: string[] }) {
  const renk = renkCoz(aksiyon.renk, "#7048e8");
  const g = useLatex(aksiyon.latex, renk);
  const id = `f${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const olcek = g ? Math.min(1.2, (genislik - 24) / g.genislik, LATEX_H / g.yukseklik) : 1;
  const fw = g ? g.genislik * olcek : 0;
  const fh = g ? g.yukseklik * olcek : 0;
  const latexP = aksiyon.not ? sinirla(p * 1.6) : p;
  const notP = aksiyon.latex ? sinirla((p - 0.55) * 2.2) : p;
  const notY = y + (aksiyon.latex ? LATEX_H + 12 : 0) + NOT_BOYUT + 2;
  const cizgiY = y + Math.max(fh, 40) + 4;
  return (
    <g>
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
      {aksiyon.latex && !g && p > 0 && <Yazi x={12} y={y + 34} metin={duzYaziyaCevir(aksiyon.latex)} boyut={26} renk={renk} p={latexP} />}
      {notlar.map((satir, k) => (
        <Yazi
          key={k}
          x={12}
          y={notY + k * NOT_SATIR}
          metin={satir}
          boyut={NOT_BOYUT}
          renk={aksiyon.latex ? "#1e1e1e" : renk}
          p={parcaIlerlemesi(notP, k, notlar.length)}
        />
      ))}
    </g>
  );
}

function FormulBlok({ parcalar, tumAksiyonlar, kutu }: { parcalar: Parca<FormulAksiyonu>[]; tumAksiyonlar: FormulAksiyonu[]; kutu: Blok["kutu"] }) {
  const duzen = useMemo(() => formulDuzeni(tumAksiyonlar, kutu.w, kutu.h), [tumAksiyonlar, kutu.w, kutu.h]);
  return (
    <svg viewBox={`0 0 ${duzen.w} ${duzen.h}`} preserveAspectRatio="xMinYMin meet" overflow="hidden">
      {parcalar.map((x, i) => {
        const satir = duzen.satirlar[i];
        if (!satir) return null;
        return <FormulSatiri key={i} aksiyon={x.aksiyon} p={x.p} y={satir.y} genislik={duzen.w} notlar={satir.notlar} />;
      })}
    </svg>
  );
}

function aksiyonParcalari(sahne: Sahne, vurusSira: number, p: number, katman: number) {
  const gruplar = new Map<string, Parca[]>();
  sahne.vuruslar.forEach((v, vi) => {
    if (vi > vurusSira || vurusKatmani(v) !== katman) return;
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

const BASLIK_Y = 38;
const BASLIK_MAKS = 30;
const BUYUK_BASLIK_MAKS = 64;

type SahneProps = {
  sahne: Sahne;
  sira: number;
  vurusSira: number;
  p: number;
  ilTiklama?: (plaka: number, ad: string) => void;
};

function blokIcerigi({
  blok,
  liste,
  tumBlokAksiyonlari,
  blokId,
  ilTiklama,
}: {
  blok: Blok;
  liste: Parca[];
  tumBlokAksiyonlari: Aksiyon[];
  blokId: string;
  ilTiklama?: (plaka: number, ad: string) => void;
}): ReactNode {
  switch (blok.tip) {
    case "turkiye_haritasi":
      return <HaritaBlok parcalar={liste as Parca<HaritaAksiyonu>[]} ilTiklama={ilTiklama} kutu={blok.kutu} />;
    case "matematik_grafigi":
      return <GrafikBlok parcalar={liste as Parca<GrafikAksiyonu>[]} blokId={blokId} kutu={blok.kutu} />;
    case "geometri_ve_diyagram":
      return (
        <DiyagramBlok
          parcalar={liste as Parca<DiyagramAksiyonu>[]}
          tumSvgler={(tumBlokAksiyonlari as DiyagramAksiyonu[]).map((a) => a.svg)}
          blokId={blokId}
          kutu={blok.kutu}
        />
      );
    case "geometri":
      return <GeometriBlok parcalar={liste as Parca<GeometriAksiyonu>[]} blokId={blokId} kutu={blok.kutu} />;
    case "akis_semasi":
      return <AkisSemasiBlok parcalar={liste as Parca<AkisSemasiAksiyonu>[]} blokId={blokId} kutu={blok.kutu} />;
    case "zaman_cizelgesi":
      return <ZamanCizelgesiBlok parcalar={liste as Parca<ZamanCizelgesiAksiyonu>[]} blokId={blokId} kutu={blok.kutu} />;
    case "tablo":
      return <TabloBlok parcalar={liste as Parca<TabloAksiyonu>[]} blokId={blokId} kutu={blok.kutu} />;
    case "hazir_sahne":
      return <HazirSahneBlok parcalar={liste as Parca<HazirSahneAksiyonu>[]} blokId={blokId} kutu={blok.kutu} />;
    case "formul_ve_not":
      return <FormulBlok parcalar={liste as Parca<FormulAksiyonu>[]} tumAksiyonlar={tumBlokAksiyonlari as FormulAksiyonu[]} kutu={blok.kutu} />;
    case "fotograf":
      return null;
  }
}

const SahneKatmani = memo(function SahneKatmani({ sahne: hamSahne, sira, vurusSira, p, ilTiklama }: SahneProps) {
  const sahne = useMemo(() => {
    const vuruslar = gorselKimlikleriniAyir(hamSahne.vuruslar);
    return vuruslar === hamSahne.vuruslar ? hamSahne : { ...hamSahne, vuruslar };
  }, [hamSahne]);
  const katman = aktifKatman(sahne, vurusSira);
  const bloklar = useMemo(() => yerlesim(sahne, { katman }), [sahne, katman]);
  const tumAksiyonlar = useMemo(() => {
    const m = new Map<string, Aksiyon[]>();
    for (const v of sahne.vuruslar) {
      if (vurusKatmani(v) !== katman) continue;
      for (const a of v.aksiyonlar) {
        if (a.tip === "vurgula") continue;
        m.set(a.gorsel, [...(m.get(a.gorsel) ?? []), a]);
      }
    }
    return m;
  }, [sahne, katman]);
  const parcalar = aksiyonParcalari(sahne, vurusSira, p, katman);
  const fotograf = katmanFotografi(sahne, katman);

  const sonVurus = Math.min(vurusSira, sahne.vuruslar.length - 1);
  const icerikVar = sahne.vuruslar.some(
    (v, i) => i <= sonVurus && vurusKatmani(v) === katman && v.aksiyonlar.some((a) => a.tip !== "vurgula"),
  );
  const sadeceBaslik = !icerikVar && !fotograf;
  const katmaninIlkVurusu = sahne.vuruslar.findIndex((v) => vurusKatmani(v) === katman) === vurusSira;
  const baslikYaziliyor = sadeceBaslik && katmaninIlkVurusu;
  const baslikP = baslikYaziliyor ? sinirla(p * 1.8) : 1;
  const cizgiP = baslikYaziliyor ? sinirla((p * 1.8 - 1) * 3) : 1;

  const anaBaslik = sahne.ek ? sahne.baslik : `${sira + 1}. ${sahne.baslik}`;
  const baslikMetni = etiketBirlestir(anaBaslik, katman > 0 ? sahne.katmanlar?.[katman - 1]?.baslik : undefined);
  const birim = Math.max(1, yaziGenisligi(baslikMetni, 1));
  const baslikBoyut = Math.min(BASLIK_MAKS, (ALAN_W - 20) / birim);
  const baslikW = birim * baslikBoyut;
  const buyutme = Math.min(BUYUK_BASLIK_MAKS, (ALAN_W - 120) / birim) / baslikBoyut;
  const baslikDonusumu = sadeceBaslik
    ? `translate(${(ALAN_W - baslikW * buyutme) / 2}px, ${ALAN_H / 2 + baslikBoyut * buyutme * 0.3}px) scale(${buyutme})`
    : `translate(0px, ${BASLIK_Y}px) scale(1)`;
  const baslikCizgi = useMemo(
    () => gen.line(0, 12, Math.min(ALAN_W, baslikW + 24), 16, { seed: tohum(sahne.baslik), stroke: "#1971c2", strokeWidth: 2.5, roughness: 1.1 }),
    [sahne.baslik, baslikW],
  );
  const kirpId = `t${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <g transform={`translate(0 ${alanY(sira)})`}>
      <defs>
        <clipPath id={kirpId}>
          <rect x={-20} y={-10} width={ALAN_W + 40} height={ALAN_H + 20} rx={14} />
        </clipPath>
      </defs>
      <rect x={-24} y={-14} width={ALAN_W + 48} height={ALAN_H + 28} rx={18} fill="#ffffff" stroke="#adb5bd" strokeWidth={3} />
      <rect x={-18} y={-8} width={ALAN_W + 36} height={ALAN_H + 16} rx={13} fill="none" stroke="#e9ecef" strokeWidth={1.5} />
      <g clipPath={`url(#${kirpId})`}>
        <g className="tahta-baslik" style={{ transform: baslikDonusumu }}>
          <Yazi x={0} y={0} metin={baslikMetni} boyut={baslikBoyut} renk="#1971c2" p={baslikP} />
          <Kaba cizim={baslikCizgi} p={cizgiP} />
        </g>
        {[...bloklar.values()].map((b) => {
          if (b.tip === "fotograf") {
            return fotograf ? (
              <g key={b.id} data-blok={b.id}>
                <image href={fotograf} x={b.kutu.x} y={b.kutu.y} width={b.kutu.w} height={b.kutu.h} preserveAspectRatio="xMidYMid meet" />
              </g>
            ) : null;
          }
          const liste = parcalar.get(b.id)?.filter((x) => x.aksiyon.tip === b.tip);
          if (!liste?.length) return null;
          const tumBlokAksiyonlari = (tumAksiyonlar.get(b.id) ?? []).filter((a) => a.tip === b.tip);
          const ic = blokIcerigi({
            blok: b,
            liste,
            tumBlokAksiyonlari,
            blokId: `${sira}-${b.id}`,
            ilTiklama,
          });
          if (!ic) return null;
          return (
            <svg key={b.id} data-blok={b.id} x={b.kutu.x} y={b.kutu.y} width={b.kutu.w} height={b.kutu.h} overflow="hidden">
              {ic}
            </svg>
          );
        })}
      </g>
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
