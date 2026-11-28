"use client";

import { Fragment, useMemo } from "react";
import type { Drawable, Options } from "roughjs/bin/core";
import { guzelAdim } from "@/lib/matematik";
import { renkCoz, type Blok } from "@/lib/ogretmen-cizim";
import type {
  GeometriAci,
  GeometriAksiyonu,
  GeometriCember,
  GeometriCokgen,
  GeometriDogru,
  GeometriEtiket,
  GeometriNokta,
  GeometriYukseklik,
} from "@/lib/types";
import {
  EL_YAZISI,
  Kaba,
  Ok,
  PASTEL_DOLGULAR,
  Yazi,
  aralikta,
  bosYereYerlestir,
  etiketBirlestir,
  etiketKutusu,
  etiketNormal,
  gen,
  kesisir,
  parcaIlerlemesi,
  sinirIcineAl,
  sinirla,
  tohum,
  yaziGenisligi,
  type Hizalama,
  type Nokta,
  type Parca,
  type Sinir,
} from "@/components/cizim/ortak";

/**
 * Varsayilan koordinat konvansiyonu: matematiksel Kartezyen (+x saga, +y yukari, acilar +x'ten saat yonunun tersine derece).
 * SVG ekrani (+y asagi) gerekiyorsa `yYukari={false}` ile gecersiz kilinabilir.
 */
export const GEOMETRI_Y_KONVANSIYONU = "kartezyen" as const;

const TEKNIK_SECENEK = {
  roughness: 0.14,
  bowing: 0.2,
  disableMultiStroke: true,
  preserveVertices: true,
  curveStepCount: 24,
} as const;

const EPS = 1e-6;
const DERECE_RADYAN = Math.PI / 180;

type HamNoktaKaydi = {
  veri: GeometriNokta;
  ilkBeat: number;
  sentetik?: boolean;
};

type EkranNokta = {
  ad: string;
  x: number;
  y: number;
  renk: string;
  etiketMetni: string;
  gizli: boolean;
  konum: NonNullable<GeometriNokta["konum"]>;
  ilkBeat: number;
  guncelBeat: number;
};

type EtiketYerlesimi = {
  x: number;
  y: number;
  hizala: Hizalama;
  metin: string;
  boyut: number;
  renk: string;
};

type HazirCokgen = {
  beatIdx: number;
  stepIdx: number;
  toplam: number;
  cizim: Drawable;
  dolguOpaklik?: number;
  etiket?: EtiketYerlesimi;
};

type HazirCember = {
  beatIdx: number;
  stepIdx: number;
  toplam: number;
  cizim: Drawable;
  kesikli: boolean;
  dolguOpaklik?: number;
  merkez: Nokta;
  merkezNoktaGoster: boolean;
  renk: string;
  etiket?: EtiketYerlesimi;
};

type HazirDogru = {
  beatIdx: number;
  stepIdx: number;
  toplam: number;
  tur: NonNullable<GeometriDogru["tur"]>;
  bas: Nokta;
  son: Nokta;
  cizim?: Drawable;
  tikCizimler: Drawable[];
  renk: string;
  kalinlik: number;
  kesikli: boolean;
  seed: number;
  etiket?: EtiketYerlesimi;
};

type HazirYukseklik = {
  beatIdx: number;
  stepIdx: number;
  toplam: number;
  tepe: Nokta;
  ayak: Nokta;
  cizim: Drawable;
  uzatmaCizim?: Drawable;
  dikKareCizim?: Drawable;
  dikNokta?: Nokta;
  renk: string;
  kesikli: boolean;
  ayakEtiketi?: EtiketYerlesimi;
  etiket?: EtiketYerlesimi;
};

type HazirAci = {
  beatIdx: number;
  stepIdx: number;
  toplam: number;
  dik: boolean;
  cizimler: Drawable[];
  dilimYolu?: string;
  dikNokta?: Nokta;
  renk: string;
  etiket?: EtiketYerlesimi;
};

type HazirNokta = {
  beatIdx: number;
  stepIdx: number;
  toplam: number;
  x: number;
  y: number;
  renk: string;
  etiket?: EtiketYerlesimi;
};

type HazirEtiket = {
  beatIdx: number;
  stepIdx: number;
  toplam: number;
  etiket: EtiketYerlesimi;
};

type EksenKisit = {
  ex: number;
  ey: number;
  gX0: number;
  gX1: number;
  gY0: number;
  gY1: number;
};

type EksenVerisi = EksenKisit & {
  xEksen: Drawable;
  yEksen: Drawable;
  xIzgara: { x: number; deger: number }[];
  yIzgara: { y: number; deger: number }[];
  sinir: Sinir;
};

type HazirSahne = {
  cokgenler: HazirCokgen[];
  cemberler: HazirCember[];
  dogrular: HazirDogru[];
  yukseklikler: HazirYukseklik[];
  acilar: HazirAci[];
  noktalar: HazirNokta[];
  etiketler: HazirEtiket[];
  eksenler: EksenVerisi | null;
  ilkBeatOgeSayisi: number;
};

function gecerliSayi(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function birimVektor(dx: number, dy: number): Nokta | null {
  const len = Math.hypot(dx, dy);
  return len > EPS ? { x: dx / len, y: dy / len } : null;
}

function dikAyakHesapla(tepe: Nokta, tabanA: Nokta, tabanB: Nokta): { ayak: Nokta; t: number } | null {
  const vx = tabanB.x - tabanA.x;
  const vy = tabanB.y - tabanA.y;
  const len2 = vx * vx + vy * vy;
  if (len2 <= EPS) return null;
  const t = ((tepe.x - tabanA.x) * vx + (tepe.y - tabanA.y) * vy) / len2;
  return {
    ayak: { x: tabanA.x + t * vx, y: tabanA.y + t * vy },
    t,
  };
}

function noktaCokgenIcindeMi(p: Nokta, poly: Nokta[]): boolean {
  if (poly.length < 3) return false;
  let icinde = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const kesisiyor = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi || EPS) + xi;
    if (kesisiyor) icinde = !icinde;
  }
  return icinde;
}

function cokgenAlaniVeMerkezi(poly: Nokta[]): Nokta {
  if (!poly.length) return { x: 0, y: 0 };
  let alan2 = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const capraz = a.x * b.y - b.x * a.y;
    alan2 += capraz;
    cx += (a.x + b.x) * capraz;
    cy += (a.y + b.y) * capraz;
  }
  if (Math.abs(alan2) <= EPS) {
    return {
      x: poly.reduce((s, p) => s + p.x, 0) / poly.length,
      y: poly.reduce((s, p) => s + p.y, 0) / poly.length,
    };
  }
  return { x: cx / (3 * alan2), y: cy / (3 * alan2) };
}

function uzatNokta(bas: Nokta, hedef: Nokta, uzatma: number, sinir: Sinir): Nokta {
  const u = birimVektor(hedef.x - bas.x, hedef.y - bas.y);
  if (!u) return hedef;
  let maxT = uzatma;
  if (u.x > EPS) maxT = Math.min(maxT, (sinir.x1 - hedef.x) / u.x);
  else if (u.x < -EPS) maxT = Math.min(maxT, (sinir.x0 - hedef.x) / u.x);
  if (u.y > EPS) maxT = Math.min(maxT, (sinir.y1 - hedef.y) / u.y);
  else if (u.y < -EPS) maxT = Math.min(maxT, (sinir.y0 - hedef.y) / u.y);
  const t = Math.max(0, maxT);
  return { x: hedef.x + u.x * t, y: hedef.y + u.y * t };
}

function etiketMetniOlustur(ad: string, etiket?: string): string {
  const temizAd = ad.trim();
  const temizEtiket = (etiket ?? "").trim();
  if (!temizEtiket) return temizAd;
  if (!temizAd) return temizEtiket;
  if (temizEtiket.startsWith("(")) return `${temizAd}${temizEtiket}`;
  const normAd = etiketNormal(temizAd);
  const normEt = etiketNormal(temizEtiket);
  if (normEt === normAd || normEt.startsWith(`${normAd}(`) || normEt.startsWith(`${normAd} `) || normEt.startsWith(`${normAd}'`)) {
    return temizEtiket;
  }
  if (temizAd.length > 2 && temizAd === temizAd.toLocaleLowerCase("tr") && temizEtiket.length <= 4) {
    return temizEtiket;
  }
  return etiketBirlestir(temizAd, temizEtiket);
}

function dondurVektor(v: Nokta, radyan: number): Nokta {
  const c = Math.cos(radyan);
  const s = Math.sin(radyan);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

function kutuGenislet(k: Sinir, pay: number): Sinir {
  return { x0: k.x0 - pay, y0: k.y0 - pay, x1: k.x1 + pay, y1: k.y1 + pay };
}

function eksenCakisirMi(k: Sinir, eksen: EksenKisit | null): boolean {
  if (!eksen) return false;
  const xCakisir = k.y0 - 2 < eksen.ex && k.y1 + 2 > eksen.ex && k.x1 > eksen.gX0 && k.x0 < eksen.gX1;
  const yCakisir = k.x0 - 2 < eksen.ey && k.x1 + 2 > eksen.ey && k.y1 > eksen.gY0 && k.y0 < eksen.gY1;
  return xCakisir || yCakisir;
}

function yonPuanla(pt: Nokta, yon: Nokta, komsular: Nokta[], cokgenler: Nokta[][], eksen: EksenKisit | null): number {
  let minAci = Math.PI;
  for (const k of komsular) {
    const dot = aralikta(yon.x * k.x + yon.y * k.y, -1, 1);
    minAci = Math.min(minAci, Math.acos(dot));
  }
  const test = { x: pt.x + yon.x * 14, y: pt.y + yon.y * 14 };
  const icinde = cokgenler.some((poly) => noktaCokgenIcindeMi(test, poly));
  let eksenCeza = 0;
  if (eksen) {
    const xUzak = Math.abs(test.y - eksen.ex);
    const yUzak = Math.abs(test.x - eksen.ey);
    if (xUzak < 9 || (pt.y - eksen.ex) * (test.y - eksen.ex) < 0) eksenCeza += 0.75;
    if (yUzak < 9 || (pt.x - eksen.ey) * (test.x - eksen.ey) < 0) eksenCeza += 0.75;
  }
  return minAci - (icinde ? 2.4 : 0) - eksenCeza + (yon.y < 0 ? 0.04 : 0);
}

function enIyiDisYon(pt: Nokta, komsular: Nokta[], cokgenler: Nokta[][], eksen: EksenKisit | null): Nokta {
  if (!komsular.length) return { x: 0.55, y: -0.835 };
  let sx = 0;
  let sy = 0;
  for (const k of komsular) {
    sx += k.x;
    sy += k.y;
  }
  const adaylar: Nokta[] = [];
  const tersToplam = birimVektor(-sx, -sy);
  if (tersToplam && Math.hypot(sx, sy) > 0.25) adaylar.push(tersToplam);
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI * 2) / 16 - Math.PI / 2;
    adaylar.push({ x: Math.cos(a), y: Math.sin(a) });
  }
  let enIyi = adaylar[0];
  let enSkor = -Infinity;
  for (const aday of adaylar) {
    const skor = yonPuanla(pt, aday, komsular, cokgenler, eksen);
    if (skor > enSkor) {
      enSkor = skor;
      enIyi = aday;
    }
  }
  return enIyi;
}

function hizalaYonden(ux: number): Hizalama {
  if (ux > 0.34) return "start";
  if (ux < -0.34) return "end";
  return "middle";
}

function bazKonumYonden(pt: Nokta, yon: Nokta, mesafe: number, boyut: number, hizala: Hizalama): Nokta {
  const x = pt.x + yon.x * mesafe;
  if (hizala !== "middle") {
    return { x, y: pt.y + yon.y * mesafe + boyut * 0.34 };
  }
  return {
    x,
    y: yon.y < -0.2 ? pt.y + yon.y * mesafe - 2 : pt.y + yon.y * mesafe + boyut * 0.82,
  };
}

function akilliEtiketYerlestir(
  pt: Nokta,
  ilkYon: Nokta,
  mesafe: number,
  metin: string,
  boyut: number,
  renk: string,
  sinir: Sinir,
  engeller: Sinir[],
  eksen: EksenKisit | null = null,
  zorunluHizala?: Hizalama,
): EtiketYerlesimi {
  const aciAdimlari = [0, 0.55, -0.55, 1.1, -1.1, 1.75, -1.75, 2.4, -2.4, Math.PI];
  const mesafeler = eksen ? [mesafe, mesafe + 10, mesafe + 20] : [mesafe, mesafe + 8];
  const adaylar: { x: number; y: number; hizala: Hizalama; kutu: Sinir; itildi: boolean; eksenCakisiyor: boolean }[] = [];

  for (const d of mesafeler) {
    for (const aci of aciAdimlari) {
      const yon = aci === 0 ? ilkYon : dondurVektor(ilkYon, aci);
      const hizala = zorunluHizala ?? hizalaYonden(yon.x);
      const ham = bazKonumYonden(pt, yon, d, boyut, hizala);
      const ic = sinirIcineAl(ham.x, ham.y, metin, boyut, hizala, sinir);
      const kutu = etiketKutusu(ic.x, ic.y, metin, boyut, hizala);
      if (engeller.some((e) => kesisir(e, kutu))) continue;
      adaylar.push({
        x: ic.x,
        y: ic.y,
        hizala,
        kutu,
        itildi: Math.hypot(ic.x - ham.x, ic.y - ham.y) > 6,
        eksenCakisiyor: eksenCakisirMi(kutu, eksen),
      });
    }
  }

  const secilen =
    adaylar.find((a) => !a.itildi && !a.eksenCakisiyor) ??
    adaylar.find((a) => !a.eksenCakisiyor) ??
    adaylar.find((a) => !a.itildi) ??
    adaylar[0];

  if (secilen) {
    engeller.push(secilen.kutu);
    return { x: secilen.x, y: secilen.y, hizala: secilen.hizala, metin, boyut, renk };
  }

  const hizala = zorunluHizala ?? hizalaYonden(ilkYon.x);
  const ham = bazKonumYonden(pt, ilkYon, mesafe, boyut, hizala);
  const yer = bosYereYerlestir(ham.x, ham.y, metin, boyut, hizala, sinir, engeller);
  engeller.push(yer.kutu);
  return { x: yer.x, y: yer.y, hizala, metin, boyut, renk };
}

function kenarEtiketYerlestir(
  bas: Nokta,
  son: Nokta,
  ilkNormal: Nokta,
  ikinciNormal: Nokta,
  tekDisVar: boolean,
  bazMesafe: number,
  metin: string,
  boyut: number,
  renk: string,
  sinir: Sinir,
  engeller: Sinir[],
  cokgenPolis: Nokta[][],
  eksen: EksenKisit | null,
): EtiketYerlesimi {
  const u = birimVektor(son.x - bas.x, son.y - bas.y) ?? { x: 1, y: 0 };
  const segLen = Math.hypot(son.x - bas.x, son.y - bas.y);
  const mx = (bas.x + son.x) / 2;
  const my = (bas.y + son.y) / 2;

  const adim = Math.min(Math.max(26, segLen * 0.16), segLen * 0.2);
  const tKaymalar =
    segLen >= 72
      ? [0, adim, -adim, adim * 1.75, -adim * 1.75].filter((t) => Math.abs(t) <= segLen * 0.36)
      : [0];
  const dAdaylari = eksen ? [bazMesafe, bazMesafe + 10, bazMesafe + 19] : [bazMesafe, bazMesafe + 8];

  const dene = (n: Nokta, disKontrol: boolean, eksenEngelli: boolean): EtiketYerlesimi | null => {
    for (const d of dAdaylari) {
      for (const t of tKaymalar) {
        const px = mx + u.x * t;
        const py = my + u.y * t;
        const hizala = hizalaYonden(n.x);
        const ham = bazKonumYonden({ x: px, y: py }, n, d, boyut, hizala);
        const ic = sinirIcineAl(ham.x, ham.y, metin, boyut, hizala, sinir);
        const kutu = etiketKutusu(ic.x, ic.y, metin, boyut, hizala);
        if (engeller.some((e) => kesisir(e, kutu))) continue;
        if (eksenEngelli && eksenCakisirMi(kutu, eksen)) continue;
        if (disKontrol) {
          if (Math.hypot(ic.x - ham.x, ic.y - ham.y) > 6) continue;
          const merkez = { x: (kutu.x0 + kutu.x1) / 2, y: (kutu.y0 + kutu.y1) / 2 };
          if (cokgenPolis.some((poly) => noktaCokgenIcindeMi(merkez, poly))) continue;
        }
        engeller.push(kutu);
        return { x: ic.x, y: ic.y, hizala, metin, boyut, renk };
      }
    }
    return null;
  };

  if (tekDisVar) {
    return (
      dene(ilkNormal, true, true) ??
      dene(ilkNormal, true, false) ??
      dene(ilkNormal, false, false) ??
      dene(ikinciNormal, false, true) ??
      dene(ikinciNormal, false, false) ??
      akilliEtiketYerlestir({ x: mx, y: my }, ilkNormal, bazMesafe, metin, boyut, renk, sinir, engeller, eksen)
    );
  }

  return (
    dene(ilkNormal, false, true) ??
    dene(ikinciNormal, false, true) ??
    dene(ilkNormal, false, false) ??
    dene(ikinciNormal, false, false) ??
    akilliEtiketYerlestir({ x: mx, y: my }, ilkNormal, bazMesafe, metin, boyut, renk, sinir, engeller, eksen)
  );
}

function tekYonEtiketYerlestir(
  x: number,
  y: number,
  metin: string,
  boyut: number,
  hizala: Hizalama,
  renk: string,
  sinir: Sinir,
  engeller: Sinir[],
): EtiketYerlesimi {
  const yer = bosYereYerlestir(x, y, metin, boyut, hizala, sinir, engeller);
  engeller.push(yer.kutu);
  return { x: yer.x, y: yer.y, hizala, metin, boyut, renk };
}

function aciRadlari(a0Deg: number, a1Deg: number, yYukari: boolean): { start: number; stop: number; spanDeg: number } {
  let span = (((a1Deg - a0Deg) % 360) + 360) % 360;
  if (span < 1e-3 && Math.abs(a1Deg - a0Deg) >= 359.9) span = 360;
  if (yYukari) {
    return { start: (-a0Deg - span) * DERECE_RADYAN, stop: -a0Deg * DERECE_RADYAN, spanDeg: span };
  }
  return { start: a0Deg * DERECE_RADYAN, stop: (a0Deg + span) * DERECE_RADYAN, spanDeg: span };
}

function yaySiniraEkle(
  cx: number,
  cy: number,
  r: number,
  a0Deg: number,
  a1Deg: number,
  kapali: boolean,
  yYukari: boolean,
  genislet: (x: number, y: number) => void,
) {
  let span = (((a1Deg - a0Deg) % 360) + 360) % 360;
  if (span < 1e-3 && Math.abs(a1Deg - a0Deg) >= 359.9) span = 360;
  if (span >= 359.9) {
    genislet(cx - r, cy - r);
    genislet(cx + r, cy + r);
    return;
  }
  const yIsaret = yYukari ? 1 : -1;
  const aciNoktasi = (deg: number) => {
    const rad = deg * DERECE_RADYAN;
    genislet(cx + r * Math.cos(rad), cy + yIsaret * r * Math.sin(rad));
  };
  aciNoktasi(a0Deg);
  aciNoktasi(a0Deg + span);
  for (const kardinal of [0, 90, 180, 270]) {
    const fark = (((kardinal - a0Deg) % 360) + 360) % 360;
    if (fark <= span + 1e-3) aciNoktasi(kardinal);
  }
  if (kapali) genislet(cx, cy);
}

function teknikSecenekler(seed: number, stroke: string, strokeWidth: number, fill?: string): Options {
  return {
    ...TEKNIK_SECENEK,
    seed,
    stroke,
    strokeWidth,
    fill: fill && fill !== "none" && fill !== "transparent" ? fill : undefined,
    fillStyle: fill && fill !== "none" && fill !== "transparent" ? "solid" : undefined,
  };
}

function komsuEkle(harita: Map<string, Nokta[]>, ad: string, v: Nokta | null) {
  if (!v) return;
  const liste = harita.get(ad) ?? [];
  if (!liste.some((x) => Math.hypot(x.x - v.x, x.y - v.y) < 1e-3)) liste.push(v);
  harita.set(ad, liste);
}

function geometriHazirla(
  aksiyonlar: GeometriAksiyonu[],
  blokId: string,
  W: number,
  H: number,
  yYukari: boolean,
  olcek: number,
): HazirSahne | null {
  if (!aksiyonlar.length) return null;

  const hamNoktalar = new Map<string, HamNoktaKaydi>();
  const hamAyaklar = new Map<string, Nokta>();
  const noktaSonBeat = new Map<string, number>();

  aksiyonlar.forEach((a, ai) => {
    for (const n of a.noktalar ?? []) {
      const ad = n.ad?.trim();
      if (!ad || !gecerliSayi(n.x) || !gecerliSayi(n.y)) continue;
      const onceki = hamNoktalar.get(ad);
      const birlesik: GeometriNokta = onceki ? { ...onceki.veri, ...n, ad } : { ...n, ad };
      const ilkBeat = onceki && !onceki.sentetik && !onceki.veri.gizli ? onceki.ilkBeat : ai;
      hamNoktalar.set(ad, { veri: birlesik, ilkBeat, sentetik: false });
      noktaSonBeat.set(ad, ai);
    }
    for (const y of a.yukseklikler ?? []) {
      const tepe = hamNoktalar.get(y.tepe?.trim())?.veri;
      const tabanA = hamNoktalar.get(y.tabanA?.trim())?.veri;
      const tabanB = hamNoktalar.get(y.tabanB?.trim())?.veri;
      if (!tepe || !tabanA || !tabanB) continue;
      const sonuc = dikAyakHesapla(tepe, tabanA, tabanB);
      if (!sonuc) continue;
      const anahtar = `${ai}:${y.tepe}:${y.tabanA}:${y.tabanB}`;
      hamAyaklar.set(anahtar, sonuc.ayak);
      const ayakAd = y.ayak?.trim();
      if (ayakAd && !hamNoktalar.has(ayakAd)) {
        hamNoktalar.set(ayakAd, {
          veri: { ad: ayakAd, x: sonuc.ayak.x, y: sonuc.ayak.y, gizli: true },
          ilkBeat: ai,
          sentetik: true,
        });
      }
    }
  });

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const genislet = (x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  };

  for (const kayit of hamNoktalar.values()) genislet(kayit.veri.x, kayit.veri.y);
  for (const ayak of hamAyaklar.values()) genislet(ayak.x, ayak.y);
  for (const a of aksiyonlar) {
    for (const c of a.cemberler ?? []) {
      const m = hamNoktalar.get(c.merkez?.trim())?.veri;
      if (!m || !gecerliSayi(c.r) || c.r <= 0) continue;
      if (c.baslangicAci !== undefined || c.bitisAci !== undefined) {
        yaySiniraEkle(m.x, m.y, c.r, c.baslangicAci ?? 0, c.bitisAci ?? 360, Boolean(c.dolgu), yYukari, genislet);
      } else {
        genislet(m.x - c.r, m.y - c.r);
        genislet(m.x + c.r, m.y + c.r);
      }
    }
    for (const e of a.etiketler ?? []) {
      if (gecerliSayi(e.x) && gecerliSayi(e.y)) genislet(e.x, e.y);
    }
  }

  if (!Number.isFinite(minX)) return null;

  if (maxX - minX < EPS && maxY - minY < EPS) {
    minX -= 2;
    maxX += 2;
    minY -= 2;
    maxY += 2;
  } else if (maxX - minX < EPS) {
    const yarim = (maxY - minY) * 0.35;
    minX -= yarim;
    maxX += yarim;
  } else if (maxY - minY < EPS) {
    const yarim = (maxX - minX) * 0.35;
    minY -= yarim;
    maxY += yarim;
  }

  const koordinatGoster = aksiyonlar.some((a) => a.koordinatGoster);
  if (koordinatGoster) {
    const sxHam = maxX - minX;
    const syHam = maxY - minY;
    if (minX > 0 && minX <= sxHam * 0.7) minX = 0;
    else if (maxX < 0 && -maxX <= sxHam * 0.7) maxX = 0;
    if (minY > 0 && minY <= syHam * 0.7) minY = 0;
    else if (maxY < 0 && -maxY <= syHam * 0.7) maxY = 0;
  }

  const spanX = Math.max(EPS, maxX - minX);
  const spanY = Math.max(EPS, maxY - minY);
  const padBazX = Math.max(46, Math.min(68, W * 0.11));
  const padBazY = Math.max(42, Math.min(60, H * 0.11));
  const padL = koordinatGoster ? Math.max(padBazX, 68) : padBazX;
  const padR = koordinatGoster ? Math.max(padBazX, 58) : padBazX;
  const padT = koordinatGoster ? Math.max(padBazY, 50) : padBazY;
  const padB = koordinatGoster ? Math.max(padBazY, 60) : padBazY;
  const availW = Math.max(60, W - padL - padR);
  const availH = Math.max(60, H - padT - padB);
  const scale = Math.min(availW / spanX, availH / spanY);
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const cxCanvas = padL + availW / 2;
  const cyCanvas = padT + availH / 2;
  const sx = (x: number) => cxCanvas + (x - midX) * scale;
  const sy = (y: number) => (yYukari ? cyCanvas - (y - midY) * scale : cyCanvas + (y - midY) * scale);

  const SINIR: Sinir = { x0: 8, y0: 8, x1: W - 8, y1: H - 8 };
  const OK_SINIR: Sinir = { x0: 12, y0: 12, x1: W - 12, y1: H - 12 };
  const noktaYaziBoyut = aralikta(18 / olcek, 14, 23);
  const etiketBoyut = aralikta(15.5 / olcek, 13, 20);
  const kucukBoyut = aralikta(12.5 / olcek, 10, 15);

  const ekranNoktalar = new Map<string, EkranNokta>();
  for (const [ad, kayit] of hamNoktalar.entries()) {
    const v = kayit.veri;
    ekranNoktalar.set(ad, {
      ad,
      x: sx(v.x),
      y: sy(v.y),
      renk: renkCoz(v.renk, "#1e1e1e"),
      etiketMetni: etiketMetniOlustur(ad, v.etiket),
      gizli: Boolean(v.gizli),
      konum: v.konum ?? "otomatik",
      ilkBeat: kayit.ilkBeat,
      guncelBeat: noktaSonBeat.get(ad) ?? kayit.ilkBeat,
    });
  }

  const cokgenPolis: Nokta[][] = [];
  const komsular = new Map<string, Nokta[]>();

  for (const a of aksiyonlar) {
    for (const c of a.cokgenler ?? []) {
      const pts = (c.noktalar ?? []).map((ad) => ekranNoktalar.get(ad.trim())).filter((n): n is EkranNokta => Boolean(n));
      if (pts.length < 3) continue;
      cokgenPolis.push(pts.map((p) => ({ x: p.x, y: p.y })));
      for (let i = 0; i < pts.length; i++) {
        const onceki = pts[(i - 1 + pts.length) % pts.length];
        const simdi = pts[i];
        const sonraki = pts[(i + 1) % pts.length];
        komsuEkle(komsular, simdi.ad, birimVektor(onceki.x - simdi.x, onceki.y - simdi.y));
        komsuEkle(komsular, simdi.ad, birimVektor(sonraki.x - simdi.x, sonraki.y - simdi.y));
      }
    }
    for (const d of a.dogrular ?? []) {
      const pA = ekranNoktalar.get(d.a?.trim());
      const pB = ekranNoktalar.get(d.b?.trim());
      if (!pA || !pB) continue;
      const uAB = birimVektor(pB.x - pA.x, pB.y - pA.y);
      const uBA = birimVektor(pA.x - pB.x, pA.y - pB.y);
      if (!uAB || !uBA) continue;
      const tur = d.tur ?? "dogru_parcasi";
      komsuEkle(komsular, pA.ad, uAB);
      komsuEkle(komsular, pB.ad, uBA);
      if (tur === "dogru") {
        komsuEkle(komsular, pA.ad, uBA);
        komsuEkle(komsular, pB.ad, uAB);
      } else if (tur === "isin") {
        komsuEkle(komsular, pB.ad, uAB);
      }
    }
    for (const y of a.yukseklikler ?? []) {
      const tepe = ekranNoktalar.get(y.tepe?.trim());
      const tA = ekranNoktalar.get(y.tabanA?.trim());
      const tB = ekranNoktalar.get(y.tabanB?.trim());
      if (!tepe || !tA || !tB) continue;
      const sonuc = dikAyakHesapla(tepe, tA, tB);
      if (!sonuc) continue;
      komsuEkle(komsular, tepe.ad, birimVektor(sonuc.ayak.x - tepe.x, sonuc.ayak.y - tepe.y));
      komsuEkle(komsular, tA.ad, birimVektor(tB.x - tA.x, tB.y - tA.y));
      komsuEkle(komsular, tB.ad, birimVektor(tA.x - tB.x, tB.y - tB.y));
    }
    for (const c of a.cemberler ?? []) {
      const m = ekranNoktalar.get(c.merkez?.trim());
      if (!m || !gecerliSayi(c.r) || c.r <= 0) continue;
      const rSvg = c.r * scale;
      for (const n of ekranNoktalar.values()) {
        if (n.ad === m.ad || n.gizli) continue;
        if (Math.abs(Math.hypot(n.x - m.x, n.y - m.y) - rSvg) <= 3.5) {
          komsuEkle(komsular, n.ad, birimVektor(m.x - n.x, m.y - n.y));
        }
      }
    }
  }

  // Gorunur nokta kutularini basta rezerve ederek hicbir etiketin nokta isaretinin ustune gelmesini onle
  const engeller: Sinir[] = [];
  for (const n of ekranNoktalar.values()) {
    if (!n.gizli) engeller.push({ x0: n.x - 8, y0: n.y - 8, x1: n.x + 8, y1: n.y + 8 });
  }

  let eksenler: EksenVerisi | null = null;
  if (koordinatGoster) {
    const xAdim = guzelAdim(spanX, 7);
    const yAdim = guzelAdim(spanY, 6);
    const ex = yYukari
      ? minY <= spanY * 0.08 && maxY >= -spanY * 0.08
        ? sy(0)
        : H - padB
      : minY <= spanY * 0.08 && maxY >= -spanY * 0.08
        ? sy(0)
        : padT;
    const ey = minX <= spanX * 0.08 && maxX >= -spanX * 0.08 ? sx(0) : padL;
    const gX0 = padL - 16;
    const gX1 = W - padR + 16;
    const gY0 = padT - 16;
    const gY1 = H - padB + 16;
    const eksenOpts = teknikSecenekler(tohum(`${blokId}-eksen`), "#495057", 1.8);
    const xEksen = gen.line(gX0, ex, gX1, ex, eksenOpts);
    const yEksen = gen.line(ey, yYukari ? gY1 : gY0, ey, yYukari ? gY0 : gY1, eksenOpts);

    const xMinGorunur = midX + (gX0 + 10 - cxCanvas) / scale;
    const xMaxGorunur = midX + (gX1 - 16 - cxCanvas) / scale;
    const xIzgara: { x: number; deger: number }[] = [];
    for (let v = Math.ceil(xMinGorunur / xAdim) * xAdim; v <= xMaxGorunur + EPS && xIzgara.length < 32; v += xAdim) {
      const temiz = Number(v.toFixed(6));
      const tx = sx(temiz);
      if (Math.abs(temiz) > EPS && Math.abs(tx - ey) >= 14) {
        xIzgara.push({ x: tx, deger: temiz });
        engeller.push(kutuGenislet(etiketKutusu(tx, ex + kucukBoyut + 3, String(temiz), kucukBoyut, "middle"), 2));
      }
    }

    const yHamA = midY + (yYukari ? -(gY1 - 12 - cyCanvas) : gY0 + 12 - cyCanvas) / scale;
    const yHamB = midY + (yYukari ? -(gY0 + 16 - cyCanvas) : gY1 - 16 - cyCanvas) / scale;
    const yMinGorunur = Math.min(yHamA, yHamB);
    const yMaxGorunur = Math.max(yHamA, yHamB);
    const yIzgara: { y: number; deger: number }[] = [];
    for (let v = Math.ceil(yMinGorunur / yAdim) * yAdim; v <= yMaxGorunur + EPS && yIzgara.length < 32; v += yAdim) {
      const temiz = Number(v.toFixed(6));
      const ty = sy(temiz);
      if (Math.abs(temiz) > EPS && Math.abs(ty - ex) >= 14) {
        yIzgara.push({ y: ty, deger: temiz });
        engeller.push(kutuGenislet(etiketKutusu(ey - 7, ty + kucukBoyut * 0.34, String(temiz), kucukBoyut, "end"), 2));
      }
    }

    engeller.push(kutuGenislet(etiketKutusu(gX1 - 2, ex - 7, "x", kucukBoyut + 2, "end"), 2));
    engeller.push(kutuGenislet(etiketKutusu(ey + 8, yYukari ? gY0 + kucukBoyut : gY1 - 4, "y", kucukBoyut + 2, "start"), 2));

    eksenler = {
      ex,
      ey,
      gX0,
      gX1,
      gY0,
      gY1,
      xEksen,
      yEksen,
      xIzgara,
      yIzgara,
      sinir: { x0: gX0, y0: gY0, x1: gX1, y1: gY1 },
    };
  }

  // Adimlar beat basina hesaplanir; etiket yerlesimi oncelik sirasina gore yapilir
  const cokgenler: HazirCokgen[] = [];
  const cemberler: HazirCember[] = [];
  const dogrular: HazirDogru[] = [];
  const yukseklikler: HazirYukseklik[] = [];
  const acilar: HazirAci[] = [];
  const noktalar: HazirNokta[] = [];
  const etiketler: HazirEtiket[] = [];

  type BekleyenNoktaEtiketi = { hedef: HazirNokta; nokta: EkranNokta };
  type BekleyenAyakEtiketi = { hedef: HazirYukseklik; ayak: Nokta; tepe: Nokta; metin: string; renk: string };
  type BekleyenAciEtiketi = { hedef: HazirAci; kose: Nokta; bis: Nokta; mesafe: number; metin: string; renk: string };
  type BekleyenDogruEtiketi = { hedef: HazirDogru; bas: Nokta; son: Nokta; esitlik: number; metin: string; renk: string };
  type BekleyenYukseklikEtiketi = { hedef: HazirYukseklik; tepe: Nokta; ayak: Nokta; uTaban: Nokta; metin: string; renk: string };
  type BekleyenCemberEtiketi = { hedef: HazirCember; m: Nokta; rSvg: number; aciMerkezRad: number; tam: boolean; metin: string; renk: string };
  type BekleyenCokgenEtiketi = { hedef: HazirCokgen; merkez: Nokta; metin: string; renk: string };
  type BekleyenSerbestEtiket = { hedef: HazirEtiket; x: number; y: number; metin: string; boyut: number; renk: string };

  const bNoktalar: BekleyenNoktaEtiketi[] = [];
  const bAyaklar: BekleyenAyakEtiketi[] = [];
  const bAcilar: BekleyenAciEtiketi[] = [];
  const bDogrular: BekleyenDogruEtiketi[] = [];
  const bYukseklikler: BekleyenYukseklikEtiketi[] = [];
  const bCemberler: BekleyenCemberEtiketi[] = [];
  const bCokgenler: BekleyenCokgenEtiketi[] = [];
  const bSerbest: BekleyenSerbestEtiket[] = [];

  const gorunenCizilmisNoktalar = new Set<string>();
  let ilkBeatOgeSayisi = 0;

  aksiyonlar.forEach((a, ai) => {
    let adimSayaci = 0;
    const adimListesi: { ayarla: (toplam: number) => void }[] = [];
    const kaydet = (ek: (toplam: number) => void) => {
      adimListesi.push({ ayarla: ek });
      adimSayaci++;
    };

    (a.cokgenler ?? []).forEach((c: GeometriCokgen, ci: number) => {
      const pts = (c.noktalar ?? []).map((ad) => ekranNoktalar.get(ad.trim())).filter((n): n is EkranNokta => Boolean(n));
      if (pts.length < 3) return;
      const dolgu = c.dolgu === "none" || c.dolgu === "transparent" ? undefined : renkCoz(c.dolgu, PASTEL_DOLGULAR[ci % PASTEL_DOLGULAR.length]);
      const konturYok = c.renk === "none" || c.renk === "transparent";
      const renk = konturYok ? "none" : renkCoz(c.renk, "#1e1e1e");
      const cizim = gen.polygon(
        pts.map((p) => [p.x, p.y] as [number, number]),
        teknikSecenekler(tohum(`${blokId}-poly-${ai}-${ci}`), renk, konturYok ? 0 : 2.2, dolgu),
      );
      const stepIdx = adimSayaci;
      const oge: HazirCokgen = { beatIdx: ai, stepIdx, toplam: 1, cizim, dolguOpaklik: dolgu ? 0.48 : undefined };
      cokgenler.push(oge);
      if (c.etiket?.trim()) {
        const merkez = cokgenAlaniVeMerkezi(pts.map((p) => ({ x: p.x, y: p.y })));
        bCokgenler.push({ hedef: oge, merkez, metin: c.etiket.trim(), renk: renk === "none" ? "#1e1e1e" : renk });
      }
      kaydet((t) => {
        oge.toplam = t;
      });
    });

    (a.cemberler ?? []).forEach((c: GeometriCember, ci: number) => {
      const m = ekranNoktalar.get(c.merkez?.trim());
      if (!m || !gecerliSayi(c.r) || c.r <= 0) return;
      const rSvg = c.r * scale;
      const renk = renkCoz(c.renk, "#1e1e1e");
      const dolgu = c.dolgu && c.dolgu !== "none" && c.dolgu !== "transparent" ? renkCoz(c.dolgu, PASTEL_DOLGULAR[ci % PASTEL_DOLGULAR.length]) : undefined;
      const kismi = c.baslangicAci !== undefined || c.bitisAci !== undefined;
      const a0 = c.baslangicAci ?? 0;
      const a1 = c.bitisAci ?? 360;
      const { start, stop, spanDeg } = aciRadlari(a0, a1, yYukari);
      const tam = !kismi || spanDeg >= 359.9;
      const opts = teknikSecenekler(tohum(`${blokId}-cember-${ai}-${ci}`), renk, 2.2, dolgu);
      const cizim = tam ? gen.circle(m.x, m.y, rSvg * 2, opts) : gen.arc(m.x, m.y, rSvg * 2, rSvg * 2, start, stop, Boolean(dolgu), opts);
      const stepIdx = adimSayaci;
      const oge: HazirCember = {
        beatIdx: ai,
        stepIdx,
        toplam: 1,
        cizim,
        kesikli: Boolean(c.kesikli),
        dolguOpaklik: dolgu ? 0.36 : undefined,
        merkez: { x: m.x, y: m.y },
        merkezNoktaGoster: tam && m.gizli,
        renk,
      };
      cemberler.push(oge);
      if (c.etiket?.trim()) {
        const ortaAciRad = tam ? -Math.PI / 4 : (start + stop) / 2;
        bCemberler.push({ hedef: oge, m: { x: m.x, y: m.y }, rSvg, aciMerkezRad: ortaAciRad, tam, metin: c.etiket.trim(), renk });
      }
      kaydet((t) => {
        oge.toplam = t;
      });
    });

    (a.dogrular ?? []).forEach((d: GeometriDogru, di: number) => {
      const pA = ekranNoktalar.get(d.a?.trim());
      const pB = ekranNoktalar.get(d.b?.trim());
      if (!pA || !pB) return;
      const uzunluk = Math.hypot(pB.x - pA.x, pB.y - pA.y);
      if (uzunluk < 1) return;
      const tur = d.tur ?? "dogru_parcasi";
      const renk = renkCoz(d.renk, "#1e1e1e");
      const kalinlik = aralikta(d.kalinlik ?? 2.2, 1.2, 5);
      const seed = tohum(`${blokId}-dogru-${ai}-${di}`);
      const uzatma = Math.min(34, Math.max(20, uzunluk * 0.16));
      const bas = tur === "dogru" ? uzatNokta(pB, pA, uzatma, OK_SINIR) : { x: pA.x, y: pA.y };
      const son = tur === "dogru" || tur === "isin" ? uzatNokta(pA, pB, uzatma, OK_SINIR) : { x: pB.x, y: pB.y };
      const cizim = tur === "dogru_parcasi" ? gen.line(bas.x, bas.y, son.x, son.y, teknikSecenekler(seed, renk, kalinlik)) : undefined;

      const tikCizimler: Drawable[] = [];
      const esitlik = d.esitlik ?? 0;
      if (esitlik >= 1 && esitlik <= 3) {
        const u = birimVektor(pB.x - pA.x, pB.y - pA.y)!;
        const n = { x: -u.y, y: u.x };
        const mx = (pA.x + pB.x) / 2;
        const my = (pA.y + pB.y) / 2;
        for (let k = 0; k < esitlik; k++) {
          const kaydir = (k - (esitlik - 1) / 2) * 5;
          const cx = mx + u.x * kaydir;
          const cy = my + u.y * kaydir;
          tikCizimler.push(
            gen.line(cx - n.x * 6, cy - n.y * 6, cx + n.x * 6, cy + n.y * 6, teknikSecenekler(seed + k + 1, renk, Math.max(1.8, kalinlik * 0.88))),
          );
        }
      }

      const stepIdx = adimSayaci;
      const oge: HazirDogru = {
        beatIdx: ai,
        stepIdx,
        toplam: 1,
        tur,
        bas,
        son,
        cizim,
        tikCizimler,
        renk,
        kalinlik,
        kesikli: Boolean(d.kesikli),
        seed,
      };
      dogrular.push(oge);
      if (d.etiket?.trim()) {
        bDogrular.push({ hedef: oge, bas: { x: pA.x, y: pA.y }, son: { x: pB.x, y: pB.y }, esitlik, metin: d.etiket.trim(), renk });
      }
      kaydet((t) => {
        oge.toplam = t;
      });
    });

    (a.yukseklikler ?? []).forEach((y: GeometriYukseklik, yi: number) => {
      const tepe = ekranNoktalar.get(y.tepe?.trim());
      const tA = ekranNoktalar.get(y.tabanA?.trim());
      const tB = ekranNoktalar.get(y.tabanB?.trim());
      if (!tepe || !tA || !tB) return;
      const sonuc = dikAyakHesapla(tepe, tA, tB);
      if (!sonuc) return;
      const { ayak, t } = sonuc;
      const altLen = Math.hypot(tepe.x - ayak.x, tepe.y - ayak.y);
      if (altLen < 2) return;

      const renk = renkCoz(y.renk, "#1971c2");
      const seed = tohum(`${blokId}-yuk-${ai}-${yi}`);
      const cizim = gen.line(tepe.x, tepe.y, ayak.x, ayak.y, teknikSecenekler(seed, renk, 2));

      let uzatmaCizim: Drawable | undefined;
      if (t < -0.02) {
        uzatmaCizim = gen.line(tA.x, tA.y, ayak.x, ayak.y, teknikSecenekler(seed + 1, "#868e96", 1.7));
      } else if (t > 1.02) {
        uzatmaCizim = gen.line(tB.x, tB.y, ayak.x, ayak.y, teknikSecenekler(seed + 1, "#868e96", 1.7));
      }

      const uAlt = birimVektor(tepe.x - ayak.x, tepe.y - ayak.y)!;
      const uTaban = t < 0.5 ? birimVektor(tB.x - tA.x, tB.y - tA.y)! : birimVektor(tA.x - tB.x, tA.y - tB.y)!;
      const dikGoster = y.dikIsareti ?? true;
      let dikKareCizim: Drawable | undefined;
      let dikNokta: Nokta | undefined;
      if (dikGoster) {
        const tabanMesafe = t < 0 ? Math.hypot(tB.x - ayak.x, tB.y - ayak.y) : t > 1 ? Math.hypot(tA.x - ayak.x, tA.y - ayak.y) : Math.max(Math.hypot(tA.x - ayak.x, tA.y - ayak.y), Math.hypot(tB.x - ayak.x, tB.y - ayak.y));
        const sq = aralikta(Math.min(altLen, tabanMesafe) * 0.22, 10, 16);
        const p1: [number, number] = [ayak.x + uTaban.x * sq, ayak.y + uTaban.y * sq];
        const p2: [number, number] = [ayak.x + (uTaban.x + uAlt.x) * sq, ayak.y + (uTaban.y + uAlt.y) * sq];
        const p3: [number, number] = [ayak.x + uAlt.x * sq, ayak.y + uAlt.y * sq];
        dikKareCizim = gen.linearPath([p1, p2, p3], teknikSecenekler(seed + 2, renk, 1.8));
        dikNokta = { x: ayak.x + (uTaban.x + uAlt.x) * sq * 0.5, y: ayak.y + (uTaban.y + uAlt.y) * sq * 0.5 };
      }

      const stepIdx = adimSayaci;
      const oge: HazirYukseklik = {
        beatIdx: ai,
        stepIdx,
        toplam: 1,
        tepe: { x: tepe.x, y: tepe.y },
        ayak,
        cizim,
        uzatmaCizim,
        dikKareCizim,
        dikNokta,
        renk,
        kesikli: y.kesikli ?? true,
      };
      yukseklikler.push(oge);

      const ayakAd = y.ayak?.trim();
      const ayakKayit = ayakAd ? ekranNoktalar.get(ayakAd) : undefined;
      if (ayakAd && (!ayakKayit || ayakKayit.gizli)) {
        gorunenCizilmisNoktalar.add(ayakAd);
        engeller.push({ x0: ayak.x - 6, y0: ayak.y - 6, x1: ayak.x + 6, y1: ayak.y + 6 });
        bAyaklar.push({ hedef: oge, ayak, tepe: { x: tepe.x, y: tepe.y }, metin: ayakAd, renk });
      }
      if (y.etiket?.trim()) {
        bYukseklikler.push({ hedef: oge, tepe: { x: tepe.x, y: tepe.y }, ayak, uTaban, metin: y.etiket.trim(), renk });
      }
      kaydet((tot) => {
        oge.toplam = tot;
      });
    });

    (a.acilar ?? []).forEach((aci: GeometriAci, aciIdx: number) => {
      const pA = ekranNoktalar.get(aci.a?.trim());
      const pV = ekranNoktalar.get(aci.kose?.trim());
      const pC = ekranNoktalar.get(aci.c?.trim());
      if (!pA || !pV || !pC) return;
      const u1 = birimVektor(pA.x - pV.x, pA.y - pV.y);
      const u2 = birimVektor(pC.x - pV.x, pC.y - pV.y);
      if (!u1 || !u2) return;

      const len1 = Math.hypot(pA.x - pV.x, pA.y - pV.y);
      const len2 = Math.hypot(pC.x - pV.x, pC.y - pV.y);
      const minKenar = Math.min(len1, len2);
      const renk = renkCoz(aci.renk, "#e03131");
      const seed = tohum(`${blokId}-aci-${ai}-${aciIdx}`);

      const dot = aralikta(u1.x * u2.x + u1.y * u2.y, -1, 1);
      const theta = Math.acos(dot);
      if (theta < 1e-3) return;
      const cross = u1.x * u2.y - u1.y * u2.x;
      const ang1 = Math.atan2(u1.y, u1.x);
      const ang2 = Math.atan2(u2.y, u2.x);
      const startSvg = cross >= 0 ? ang1 : ang2;
      const stopSvg = startSvg + theta;
      const midAng = (startSvg + stopSvg) / 2;
      const bis = { x: Math.cos(midAng), y: Math.sin(midAng) };

      let rBaz: number;
      if (aci.yaricap && aci.yaricap > 0) {
        const olcekli = aci.yaricap * scale;
        rBaz = olcekli <= minKenar * 0.65 && olcekli >= 10 ? olcekli : aralikta(aci.yaricap, 12, minKenar * 0.6);
      } else {
        const standart = aralikta(minKenar * 0.24, 18, 34);
        rBaz = theta < 0.6 ? Math.min(minKenar * 0.45, standart * (0.78 / Math.max(0.35, theta))) : standart;
      }

      const cizimler: Drawable[] = [];
      let dilimYolu: string | undefined;
      let dikNokta: Nokta | undefined;
      let etiketMesafe = rBaz + 14;

      if (aci.dik) {
        const sq = aci.yaricap ? aralikta(rBaz, 10, 24) : aralikta(minKenar * 0.2, 11, 18);
        const d1 = u1;
        const d2 = Math.abs(cross) < 1e-2 ? { x: -u1.y, y: u1.x } : u2;
        const p1: [number, number] = [pV.x + d1.x * sq, pV.y + d1.y * sq];
        const p2: [number, number] = [pV.x + (d1.x + d2.x) * sq, pV.y + (d1.y + d2.y) * sq];
        const p3: [number, number] = [pV.x + d2.x * sq, pV.y + d2.y * sq];
        cizimler.push(gen.linearPath([p1, p2, p3], teknikSecenekler(seed, renk, 2)));
        dilimYolu = `M${pV.x.toFixed(1)} ${pV.y.toFixed(1)} L${p1[0].toFixed(1)} ${p1[1].toFixed(1)} L${p2[0].toFixed(1)} ${p2[1].toFixed(1)} L${p3[0].toFixed(1)} ${p3[1].toFixed(1)} Z`;
        dikNokta = { x: pV.x + (d1.x + d2.x) * sq * 0.5, y: pV.y + (d1.y + d2.y) * sq * 0.5 };
        etiketMesafe = sq * 1.45 + 14;
      } else {
        const yaySayisi = aci.yaySayisi ?? 1;
        let sonR = rBaz;
        for (let k = 0; k < yaySayisi; k++) {
          const ri = Math.min(minKenar * 0.72, rBaz + k * 5);
          sonR = ri;
          cizimler.push(gen.arc(pV.x, pV.y, ri * 2, ri * 2, startSvg, stopSvg, false, teknikSecenekler(seed + k, renk, 2)));
        }
        const sX = pV.x + rBaz * Math.cos(startSvg);
        const sY = pV.y + rBaz * Math.sin(startSvg);
        const eX = pV.x + rBaz * Math.cos(stopSvg);
        const eY = pV.y + rBaz * Math.sin(stopSvg);
        dilimYolu = `M${pV.x.toFixed(1)} ${pV.y.toFixed(1)} L${sX.toFixed(1)} ${sY.toFixed(1)} A${rBaz.toFixed(1)} ${rBaz.toFixed(1)} 0 0 1 ${eX.toFixed(1)} ${eY.toFixed(1)} Z`;
        etiketMesafe = sonR + (theta < 0.65 ? 19 : 14);
      }

      const stepIdx = adimSayaci;
      const oge: HazirAci = { beatIdx: ai, stepIdx, toplam: 1, dik: Boolean(aci.dik), cizimler, dilimYolu, dikNokta, renk };
      acilar.push(oge);

      if (aci.etiket?.trim()) {
        const minTemiz = (etiketBoyut * 0.65) / Math.max(0.28, Math.sin(theta / 2));
        const mesafe = Math.min(Math.max(etiketMesafe, minTemiz), Math.max(etiketMesafe, minKenar * 0.72));
        bAcilar.push({ hedef: oge, kose: { x: pV.x, y: pV.y }, bis, mesafe, metin: aci.etiket.trim(), renk });
      }
      kaydet((t) => {
        oge.toplam = t;
      });
    });

    (a.noktalar ?? []).forEach((n: GeometriNokta) => {
      const ad = n.ad?.trim();
      const kayit = ad ? ekranNoktalar.get(ad) : undefined;
      if (!kayit || kayit.gizli || gorunenCizilmisNoktalar.has(kayit.ad)) return;
      gorunenCizilmisNoktalar.add(kayit.ad);
      const stepIdx = adimSayaci;
      const oge: HazirNokta = { beatIdx: ai, stepIdx, toplam: 1, x: kayit.x, y: kayit.y, renk: kayit.renk };
      noktalar.push(oge);
      if (kayit.etiketMetni) {
        bNoktalar.push({ hedef: oge, nokta: kayit });
      }
      kaydet((t) => {
        oge.toplam = t;
      });
    });

    (a.etiketler ?? []).forEach((e: GeometriEtiket) => {
      if (!e.metin?.trim() || !gecerliSayi(e.x) || !gecerliSayi(e.y)) return;
      const boyut = e.boyut ? aralikta(e.boyut / olcek, 12, 24) : etiketBoyut;
      const renk = renkCoz(e.renk, "#1e1e1e");
      const stepIdx = adimSayaci;
      const oge: HazirEtiket = {
        beatIdx: ai,
        stepIdx,
        toplam: 1,
        etiket: { x: sx(e.x), y: sy(e.y), hizala: "middle", metin: e.metin.trim(), boyut, renk },
      };
      etiketler.push(oge);
      bSerbest.push({ hedef: oge, x: sx(e.x), y: sy(e.y), metin: e.metin.trim(), boyut, renk });
      kaydet((t) => {
        oge.toplam = t;
      });
    });

    if (ai === 0) ilkBeatOgeSayisi = adimSayaci;
    for (const kayit of adimListesi) kayit.ayarla(Math.max(1, adimSayaci));
  });

  // Etiketleri oncelik sirasina gore cakismasiz yerlestir:
  // 1) Koseler & yukseklik ayaklari -> 2) Acilar -> 3) Yukseklik & dogrular -> 4) Cember, cokgen & serbest etiketler
  for (const b of bNoktalar) {
    const n = b.nokta;
    const zorunlu = n.konum;
    const yon =
      zorunlu === "ust"
        ? { x: 0, y: -1 }
        : zorunlu === "alt"
          ? { x: 0, y: 1 }
          : zorunlu === "sol"
            ? { x: -1, y: 0 }
            : zorunlu === "sag"
              ? { x: 1, y: 0 }
              : enIyiDisYon({ x: n.x, y: n.y }, komsular.get(n.ad) ?? [], cokgenPolis, eksenler);
    b.hedef.etiket = akilliEtiketYerlestir({ x: n.x, y: n.y }, yon, 14, n.etiketMetni, noktaYaziBoyut, n.renk, SINIR, engeller, eksenler);
  }

  for (const b of bAyaklar) {
    const uAlt = birimVektor(b.tepe.x - b.ayak.x, b.tepe.y - b.ayak.y) ?? { x: 0, y: -1 };
    const disYon = { x: -uAlt.x, y: -uAlt.y };
    b.hedef.ayakEtiketi = akilliEtiketYerlestir(b.ayak, disYon, 13, b.metin, noktaYaziBoyut * 0.92, b.renk, SINIR, engeller, eksenler);
  }

  for (const b of bAcilar) {
    const hamX = b.kose.x + b.bis.x * b.mesafe;
    const hamY = b.kose.y + b.bis.y * b.mesafe + etiketBoyut * 0.34;
    b.hedef.etiket = tekYonEtiketYerlestir(hamX, hamY, b.metin, etiketBoyut, "middle", b.renk, SINIR, engeller);
  }

  for (const b of bYukseklikler) {
    const u1 = { x: -b.uTaban.x, y: -b.uTaban.y };
    const u2 = { x: b.uTaban.x, y: b.uTaban.y };
    b.hedef.etiket = kenarEtiketYerlestir(b.tepe, b.ayak, u1, u2, false, 13, b.metin, etiketBoyut, b.renk, SINIR, engeller, cokgenPolis, eksenler);
  }

  for (const b of bDogrular) {
    const u = birimVektor(b.son.x - b.bas.x, b.son.y - b.bas.y)!;
    const n1 = { x: -u.y, y: u.x };
    const n2 = { x: u.y, y: -u.x };
    const mx = (b.bas.x + b.son.x) / 2;
    const my = (b.bas.y + b.son.y) / 2;
    const p1Icinde = cokgenPolis.some((poly) => noktaCokgenIcindeMi({ x: mx + n1.x * 14, y: my + n1.y * 14 }, poly));
    const p2Icinde = cokgenPolis.some((poly) => noktaCokgenIcindeMi({ x: mx + n2.x * 14, y: my + n2.y * 14 }, poly));
    const tekDisVar = p1Icinde !== p2Icinde;
    const ilkN = tekDisVar ? (p1Icinde ? n2 : n1) : n1.y < n2.y - 0.05 ? n1 : n2.y < n1.y - 0.05 ? n2 : n1.x < 0 ? n1 : n2;
    const ikinciN = ilkN === n1 ? n2 : n1;
    const mesafe = (b.esitlik ? 18 : 13) + (Math.abs(ilkN.x) < 0.35 ? 2 : 4);
    b.hedef.etiket = kenarEtiketYerlestir(b.bas, b.son, ilkN, ikinciN, tekDisVar, mesafe, b.metin, etiketBoyut, b.renk, SINIR, engeller, cokgenPolis, eksenler);
  }

  for (const b of bCemberler) {
    const basYon = { x: Math.cos(b.aciMerkezRad), y: Math.sin(b.aciMerkezRad) };
    const konum = { x: b.m.x + basYon.x * b.rSvg, y: b.m.y + basYon.y * b.rSvg };
    if (b.tam) {
      b.hedef.etiket = akilliEtiketYerlestir(konum, basYon, 14, b.metin, etiketBoyut, b.renk, SINIR, engeller, eksenler);
    } else {
      const hizala = hizalaYonden(basYon.x);
      const ham = bazKonumYonden(konum, basYon, 13, etiketBoyut, hizala);
      b.hedef.etiket = tekYonEtiketYerlestir(ham.x, ham.y, b.metin, etiketBoyut, hizala, b.renk, SINIR, engeller);
    }
  }

  for (const b of bCokgenler) {
    b.hedef.etiket = tekYonEtiketYerlestir(b.merkez.x, b.merkez.y + etiketBoyut * 0.34, b.metin, etiketBoyut, "middle", b.renk, SINIR, engeller);
  }

  for (const b of bSerbest) {
    const y = b.y + b.boyut * 0.34;
    const k = etiketKutusu(b.x, y, b.metin, b.boyut, "middle");
    const cakisiyor = engeller.some((e) => kesisir(e, k));
    if (!cakisiyor && y >= SINIR.y0 + b.boyut && y <= SINIR.y1 - 4 && yaziGenisligi(b.metin, b.boyut) <= SINIR.x1 - SINIR.x0) {
      const ic = sinirIcineAl(b.x, y, b.metin, b.boyut, "middle", SINIR);
      engeller.push(etiketKutusu(ic.x, ic.y, b.metin, b.boyut, "middle"));
      b.hedef.etiket = { x: ic.x, y: ic.y, hizala: "middle", metin: b.metin, boyut: b.boyut, renk: b.renk };
    } else {
      b.hedef.etiket = tekYonEtiketYerlestir(b.x, y, b.metin, b.boyut, "middle", b.renk, SINIR, engeller);
    }
  }

  return {
    cokgenler,
    cemberler,
    dogrular,
    yukseklikler,
    acilar,
    noktalar,
    etiketler,
    eksenler,
    ilkBeatOgeSayisi,
  };
}

/**
 * Parametrik geometri sahnesi bileseni.
 * Noktalari otomatik sinir kutusu ile normalize eder, cokgen/dogru/yukseklik/aci/cemberleri cizer,
 * etiket cakismalarini engeller ve ilerleme (`p`) ile kalem imleci (`data-kalem`/`data-p`) destegi saglar.
 */
export function GeometriBlok({
  parcalar,
  blokId,
  kutu,
  yYukari = true,
}: {
  parcalar: Parca<GeometriAksiyonu>[];
  blokId: string;
  kutu: Blok["kutu"];
  yYukari?: boolean;
}) {
  const kutuW = Number.isFinite(kutu.w) && kutu.w > 0 ? kutu.w : 600;
  const kutuH = Number.isFinite(kutu.h) && kutu.h > 0 ? kutu.h : 460;
  const carpan = Math.min(kutuW, kutuH) < 360 ? 360 / Math.max(80, Math.min(kutuW, kutuH)) : 1;
  const W = Math.round(kutuW * carpan);
  const H = Math.round(kutuH * carpan);
  const olcek = Math.min(kutuW / W, kutuH / H);
  const kucukBoyut = aralikta(12.5 / olcek, 10, 15);

  const aksiyonAnahtari = JSON.stringify(parcalar.map((x) => x.aksiyon));
  const sahne = useMemo(() => {
    const aksiyonlar = JSON.parse(aksiyonAnahtari) as GeometriAksiyonu[];
    return geometriHazirla(aksiyonlar, blokId, W, H, yYukari, olcek);
  }, [aksiyonAnahtari, blokId, W, H, yYukari, olcek]);

  if (!sahne) {
    return <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin meet" overflow="hidden" />;
  }

  const ilkBeatP = parcalar[0]?.p ?? 0;
  const eksenP = sahne.eksenler ? sinirla(ilkBeatP * (sahne.ilkBeatOgeSayisi > 0 ? 3.2 : 1)) : 0;

  const beatIlerlemesi = (beatIdx: number, stepIdx: number, toplam: number) => {
    const hamP = parcalar[beatIdx]?.p ?? 0;
    const ap = beatIdx === 0 && sahne.eksenler && sahne.ilkBeatOgeSayisi > 0 ? sinirla((hamP - 0.25) / 0.75) : hamP;
    return parcaIlerlemesi(ap, stepIdx, toplam);
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin meet" overflow="hidden">
      {sahne.eksenler && eksenP > 0 && (
        <g>
          <g opacity={sinirla(eksenP * 1.4)}>
            {sahne.eksenler.xIzgara.map((g) => (
              <line
                key={`gx-${g.deger}`}
                x1={g.x}
                x2={g.x}
                y1={sahne.eksenler!.sinir.y0}
                y2={sahne.eksenler!.sinir.y1}
                stroke="#f1f3f5"
                strokeWidth={1}
              />
            ))}
            {sahne.eksenler.yIzgara.map((g) => (
              <line
                key={`gy-${g.deger}`}
                x1={sahne.eksenler!.sinir.x0}
                x2={sahne.eksenler!.sinir.x1}
                y1={g.y}
                y2={g.y}
                stroke="#f1f3f5"
                strokeWidth={1}
              />
            ))}
          </g>
          <Kaba cizim={sahne.eksenler.xEksen} p={eksenP} kalem={sahne.ilkBeatOgeSayisi === 0} />
          <Kaba cizim={sahne.eksenler.yEksen} p={eksenP} kalem={sahne.ilkBeatOgeSayisi === 0} />
          {eksenP > 0.55 && (
            <g fontFamily={EL_YAZISI} fontSize={kucukBoyut} fill="#868e96" opacity={sinirla((eksenP - 0.55) * 2.2)}>
              {sahne.eksenler.xIzgara.map((g) => (
                <g key={`tx-${g.deger}`}>
                  <line x1={g.x} x2={g.x} y1={sahne.eksenler!.ex - 3.5} y2={sahne.eksenler!.ex + 3.5} stroke="#868e96" strokeWidth={1.2} />
                  <text x={g.x} y={sahne.eksenler!.ex + kucukBoyut + 3} textAnchor="middle">
                    {g.deger}
                  </text>
                </g>
              ))}
              {sahne.eksenler.yIzgara.map((g) => (
                <g key={`ty-${g.deger}`}>
                  <line x1={sahne.eksenler!.ey - 3.5} x2={sahne.eksenler!.ey + 3.5} y1={g.y} y2={g.y} stroke="#868e96" strokeWidth={1.2} />
                  <text x={sahne.eksenler!.ey - 7} y={g.y + kucukBoyut * 0.34} textAnchor="end">
                    {g.deger}
                  </text>
                </g>
              ))}
              <text x={sahne.eksenler.sinir.x1 - 2} y={sahne.eksenler.ex - 7} fontSize={kucukBoyut + 2} textAnchor="end" fill="#495057">
                x
              </text>
              <text
                x={sahne.eksenler.ey + 8}
                y={yYukari ? sahne.eksenler.sinir.y0 + kucukBoyut : sahne.eksenler.sinir.y1 - 4}
                fontSize={kucukBoyut + 2}
                fill="#495057"
              >
                y
              </text>
            </g>
          )}
        </g>
      )}

      {sahne.cokgenler.map((c, i) => {
        const p = beatIlerlemesi(c.beatIdx, c.stepIdx, c.toplam);
        if (p <= 0) return null;
        const sekilP = c.etiket ? sinirla(p * 1.45) : p;
        const yaziP = sinirla((p - 0.5) * 2);
        return (
          <g key={`cokgen-${i}`}>
            <Kaba cizim={c.cizim} p={sekilP} dolguOpaklik={c.dolguOpaklik} />
            {c.etiket && yaziP > 0 && (
              <Yazi
                x={c.etiket.x}
                y={c.etiket.y}
                metin={c.etiket.metin}
                boyut={c.etiket.boyut}
                renk={c.etiket.renk}
                hizala={c.etiket.hizala}
                p={yaziP}
              />
            )}
          </g>
        );
      })}

      {sahne.cemberler.map((c, i) => {
        const p = beatIlerlemesi(c.beatIdx, c.stepIdx, c.toplam);
        if (p <= 0) return null;
        const sekilP = c.etiket ? sinirla(p * 1.45) : p;
        const yaziP = sinirla((p - 0.5) * 2);
        return (
          <g key={`cember-${i}`}>
            <Kaba cizim={c.cizim} p={sekilP} kesikli={c.kesikli} dolguOpaklik={c.dolguOpaklik} />
            {c.merkezNoktaGoster && <circle cx={c.merkez.x} cy={c.merkez.y} r={3.5 * sinirla(p * 2)} fill={c.renk} stroke="#ffffff" strokeWidth={1.5} />}
            {c.etiket && yaziP > 0 && (
              <Yazi
                x={c.etiket.x}
                y={c.etiket.y}
                metin={c.etiket.metin}
                boyut={c.etiket.boyut}
                renk={c.etiket.renk}
                hizala={c.etiket.hizala}
                p={yaziP}
              />
            )}
          </g>
        );
      })}

      {sahne.dogrular.map((d, i) => {
        const p = beatIlerlemesi(d.beatIdx, d.stepIdx, d.toplam);
        if (p <= 0) return null;
        const ekVar = Boolean(d.etiket) || d.tikCizimler.length > 0;
        const cizgiP = ekVar ? sinirla(p * 1.4) : p;
        const tikP = sinirla((p - 0.45) * 2.2);
        const yaziP = sinirla((p - 0.52) * 2.1);
        return (
          <g key={`dogru-${i}`}>
            {d.tur === "dogru_parcasi" && d.cizim ? (
              <Kaba cizim={d.cizim} p={cizgiP} kesikli={d.kesikli} />
            ) : (
              <Ok
                x1={d.bas.x}
                y1={d.bas.y}
                x2={d.son.x}
                y2={d.son.y}
                renk={d.renk}
                kalinlik={d.kalinlik}
                ucBoyutu={10}
                kesikli={d.kesikli}
                ciftYon={d.tur === "dogru"}
                seed={d.seed}
                p={cizgiP}
              />
            )}
            {tikP > 0 && d.tikCizimler.map((tk, ti) => <Kaba key={ti} cizim={tk} p={tikP} kalem={false} />)}
            {d.etiket && yaziP > 0 && (
              <Yazi
                x={d.etiket.x}
                y={d.etiket.y}
                metin={d.etiket.metin}
                boyut={d.etiket.boyut}
                renk={d.etiket.renk}
                hizala={d.etiket.hizala}
                p={yaziP}
              />
            )}
          </g>
        );
      })}

      {sahne.yukseklikler.map((y, i) => {
        const p = beatIlerlemesi(y.beatIdx, y.stepIdx, y.toplam);
        if (p <= 0) return null;
        const uzatmaP = sinirla(p * 1.6);
        const cizgiP = sinirla(p * 1.35);
        const dikP = sinirla((p - 0.45) * 2.2);
        const ayakP = sinirla((p - 0.52) * 2.3);
        const yaziP = sinirla((p - 0.58) * 2.4);
        return (
          <g key={`yuk-${i}`}>
            {y.uzatmaCizim && <Kaba cizim={y.uzatmaCizim} p={uzatmaP} kesikli kalem={false} />}
            <Kaba cizim={y.cizim} p={cizgiP} kesikli={y.kesikli} />
            {y.dikKareCizim && dikP > 0 && <Kaba cizim={y.dikKareCizim} p={dikP} kalem={!y.etiket && !y.ayakEtiketi} />}
            {y.dikNokta && dikP > 0.5 && (
              <circle cx={y.dikNokta.x} cy={y.dikNokta.y} r={1.8 * sinirla((dikP - 0.5) * 2)} fill={y.renk} />
            )}
            {y.ayakEtiketi && ayakP > 0 && (
              <Fragment>
                <circle cx={y.ayak.x} cy={y.ayak.y} r={4 * sinirla(ayakP * 2)} fill={y.renk} stroke="#ffffff" strokeWidth={1.8} />
                <Yazi
                  x={y.ayakEtiketi.x}
                  y={y.ayakEtiketi.y}
                  metin={y.ayakEtiketi.metin}
                  boyut={y.ayakEtiketi.boyut}
                  renk={y.ayakEtiketi.renk}
                  hizala={y.ayakEtiketi.hizala}
                  p={ayakP}
                />
              </Fragment>
            )}
            {y.etiket && yaziP > 0 && (
              <Yazi
                x={y.etiket.x}
                y={y.etiket.y}
                metin={y.etiket.metin}
                boyut={y.etiket.boyut}
                renk={y.etiket.renk}
                hizala={y.etiket.hizala}
                p={yaziP}
              />
            )}
          </g>
        );
      })}

      {sahne.acilar.map((a, i) => {
        const p = beatIlerlemesi(a.beatIdx, a.stepIdx, a.toplam);
        if (p <= 0) return null;
        const yayP = a.etiket ? sinirla(p * 1.45) : p;
        const yaziP = sinirla((p - 0.52) * 2.1);
        return (
          <g key={`aci-${i}`}>
            {a.dilimYolu && <path d={a.dilimYolu} fill={a.renk} fillOpacity={0.11 * sinirla(yayP * 1.4)} stroke="none" />}
            {a.cizimler.map((cz, ci) => (
              <Kaba key={ci} cizim={cz} p={yayP} kalem={ci === a.cizimler.length - 1 && !a.etiket} />
            ))}
            {a.dikNokta && yayP > 0.5 && (
              <circle cx={a.dikNokta.x} cy={a.dikNokta.y} r={1.8 * sinirla((yayP - 0.5) * 2)} fill={a.renk} />
            )}
            {a.etiket && yaziP > 0 && (
              <Yazi
                x={a.etiket.x}
                y={a.etiket.y}
                metin={a.etiket.metin}
                boyut={a.etiket.boyut}
                renk={a.etiket.renk}
                hizala={a.etiket.hizala}
                p={yaziP}
              />
            )}
          </g>
        );
      })}

      {sahne.noktalar.map((n, i) => {
        const p = beatIlerlemesi(n.beatIdx, n.stepIdx, n.toplam);
        if (p <= 0) return null;
        const yaziP = sinirla((p - 0.2) * 1.3);
        return (
          <g key={`nokta-${i}`}>
            <circle cx={n.x} cy={n.y} r={4.8 * sinirla(p * 2.2)} fill={n.renk} stroke="#ffffff" strokeWidth={2} />
            {n.etiket ? (
              yaziP > 0 && (
                <Yazi
                  x={n.etiket.x}
                  y={n.etiket.y}
                  metin={n.etiket.metin}
                  boyut={n.etiket.boyut}
                  renk={n.etiket.renk}
                  hizala={n.etiket.hizala}
                  kalin
                  p={yaziP}
                />
              )
            ) : (
              p < 1 && <path d={`M${n.x} ${n.y} L${n.x + 0.1} ${n.y}`} stroke="none" fill="none" data-kalem="" data-p={p} />
            )}
          </g>
        );
      })}

      {sahne.etiketler.map((e, i) => {
        const p = beatIlerlemesi(e.beatIdx, e.stepIdx, e.toplam);
        if (p <= 0) return null;
        return (
          <Yazi
            key={`etiket-${i}`}
            x={e.etiket.x}
            y={e.etiket.y}
            metin={e.etiket.metin}
            boyut={e.etiket.boyut}
            renk={e.etiket.renk}
            hizala={e.etiket.hizala}
            p={p}
          />
        );
      })}
    </svg>
  );
}
