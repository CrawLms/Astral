"use client";

import { Fragment, useId, useMemo } from "react";
import dagre from "@dagrejs/dagre";
import type { Drawable, Options } from "roughjs/bin/core";
import { duzYaziyaCevir } from "@/lib/metin-temizle";
import { renkCoz, type Blok } from "@/lib/ogretmen-cizim";
import type {
  AkisBaglantisi,
  AkisDugum,
  AkisDugumSekli,
  AkisGrubu,
  AkisSemasiAksiyonu,
  AkisYon,
  TabloAksiyonu,
  TabloVurgusu,
  ZamanCizelgesiAksiyonu,
  ZamanCizelgesiYon,
  ZamanOlayi,
} from "@/lib/types";
import {
  aralikta,
  bosYereYerlestir,
  Cizgi,
  CokSatirliYazi,
  etiketBirlestir,
  etiketNormal,
  gen,
  Kaba,
  kesisir,
  Ok,
  parcaIlerlemesi,
  PASTEL_DOLGULAR,
  satirlaraBol,
  sinirla,
  tohum,
  VURGU_RENKLERI,
  yaziGenisligi,
  Yazi,
  yuvarlakKutuYolu,
  type Nokta,
  type Parca,
  type Sinir,
} from "./ortak";
import { IkonCiz, ikonAdiniCoz, type IkonAdi } from "./ikonlar";

const MAKS_OLCEK = 1.28;

const RENK_DOLGU_ESLEME: Record<string, string> = {
  "#1971c2": "#e7f5ff",
  "#e03131": "#fff0f6",
  "#2f9e44": "#ebfbee",
  "#7048e8": "#f3f0ff",
  "#f08c00": "#fff4e6",
  "#0c8599": "#e3fafc",
};

function metinTemizle(metin?: string): string {
  return duzYaziyaCevir(metin ?? "").replace(/\s+/g, " ").trim();
}

function gecerliIkonCoz(nesne: { ikon?: unknown }): IkonAdi | null {
  return typeof nesne.ikon === "string" && nesne.ikon.trim() ? ikonAdiniCoz(nesne.ikon) : null;
}

function dolguSec(renk: string, dolgu: string | undefined, sira: number): string {
  if (dolgu && dolgu !== "none" && dolgu !== "transparent") return renkCoz(dolgu, PASTEL_DOLGULAR[sira % PASTEL_DOLGULAR.length]);
  return RENK_DOLGU_ESLEME[renk.toLowerCase()] ?? PASTEL_DOLGULAR[sira % PASTEL_DOLGULAR.length];
}

function koyuRenkMi(renk: string): boolean {
  const m = renk.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return false;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 142;
}

function parcaAdimP(parcalar: { p: number }[], vurusSira: number, adim: number, toplam: number): number {
  const ap = parcalar[vurusSira]?.p ?? 0;
  if (ap >= 1) return 1;
  if (ap <= 0) return 0;
  return parcaIlerlemesi(ap, adim, Math.max(1, toplam));
}

function sinirGenislet(a: Sinir | null, b: Sinir): Sinir {
  if (!a) return { ...b };
  return {
    x0: Math.min(a.x0, b.x0),
    y0: Math.min(a.y0, b.y0),
    x1: Math.max(a.x1, b.x1),
    y1: Math.max(a.y1, b.y1),
  };
}

function viewBoxHesapla(sinir: Sinir | null, kutu: Blok["kutu"], pay = 18): string {
  if (!sinir) return "0 0 100 100";
  const x0 = sinir.x0 - pay;
  const y0 = sinir.y0 - pay;
  const cw = Math.max(40, sinir.x1 - sinir.x0 + pay * 2);
  const ch = Math.max(40, sinir.y1 - sinir.y0 + pay * 2);
  const kw = Math.max(120, kutu.w);
  const kh = Math.max(120, kutu.h);
  const olcek = Math.min(kw / cw, kh / ch);
  if (olcek <= MAKS_OLCEK) return `${x0.toFixed(1)} ${y0.toFixed(1)} ${cw.toFixed(1)} ${ch.toFixed(1)}`;
  const vbW = Math.max(cw, kw / MAKS_OLCEK);
  const vbH = Math.max(ch, kh / MAKS_OLCEK);
  const vbX = x0 + cw / 2 - vbW / 2;
  const vbY = y0 - Math.min(32, (vbH - ch) * 0.22);
  return `${vbX.toFixed(1)} ${vbY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`;
}

function olculuSatirlar(metin: string, hedefGenislik: number, boyut: number): { satirlar: string[]; genislik: number } {
  if (!metin) return { satirlar: [], genislik: 0 };
  const satirlar = satirlaraBol(metin, hedefGenislik, boyut);
  const genislik = satirlar.reduce((m, s) => Math.max(m, yaziGenisligi(s, boyut)), 0);
  return { satirlar, genislik };
}

function duzSekilSecenek(renk: string, dolgu: string | undefined, kalinlik: number, roughness: number, seed: number): Options {
  return {
    seed,
    roughness,
    bowing: 0.2,
    preserveVertices: true,
    disableMultiStroke: true,
    stroke: renk,
    strokeWidth: kalinlik,
    fill: dolgu && dolgu !== "none" && dolgu !== "transparent" ? dolgu : undefined,
    fillStyle: "solid",
  };
}

// --- 1. AKIŞ ŞEMASI / KAVRAM HARİTASI ---

const AKIS_ANA_BOYUT = 16;
const AKIS_ALT_BOYUT = 13;
const AKIS_ANA_ADIM = AKIS_ANA_BOYUT * 1.25;
const AKIS_ALT_ADIM = AKIS_ALT_BOYUT * 1.25;
const AKIS_ETIKET_BOYUT = 13.5;
const AKIS_IKON_BOYUT = 28;
const AKIS_IKON_ARA = 10;

type SekilGenis = AkisDugumSekli | "bulut";

function bulutYolu(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2;
  const ry = h / 2;
  return [
    `M ${(cx - rx * 0.62).toFixed(1)} ${(cy + ry * 0.64).toFixed(1)}`,
    `C ${(cx - rx * 1.04).toFixed(1)} ${(cy + ry * 0.62).toFixed(1)}, ${(cx - rx * 1.06).toFixed(1)} ${(cy - ry * 0.14).toFixed(1)}, ${(cx - rx * 0.68).toFixed(1)} ${(cy - ry * 0.34).toFixed(1)}`,
    `C ${(cx - rx * 0.62).toFixed(1)} ${(cy - ry * 0.92).toFixed(1)}, ${(cx - rx * 0.08).toFixed(1)} ${(cy - ry * 1.02).toFixed(1)}, ${(cx + rx * 0.14).toFixed(1)} ${(cy - ry * 0.72).toFixed(1)}`,
    `C ${(cx + rx * 0.42).toFixed(1)} ${(cy - ry * 0.98).toFixed(1)}, ${(cx + rx * 0.96).toFixed(1)} ${(cy - ry * 0.68).toFixed(1)}, ${(cx + rx * 0.84).toFixed(1)} ${(cy - ry * 0.14).toFixed(1)}`,
    `C ${(cx + rx * 1.06).toFixed(1)} ${(cy + ry * 0.12).toFixed(1)}, ${(cx + rx * 0.96).toFixed(1)} ${(cy + ry * 0.68).toFixed(1)}, ${(cx + rx * 0.52).toFixed(1)} ${(cy + ry * 0.66).toFixed(1)}`,
    `C ${(cx + rx * 0.24).toFixed(1)} ${(cy + ry * 0.88).toFixed(1)}, ${(cx - rx * 0.28).toFixed(1)} ${(cy + ry * 0.88).toFixed(1)}, ${(cx - rx * 0.62).toFixed(1)} ${(cy + ry * 0.64).toFixed(1)}`,
    "Z",
  ].join(" ");
}

function sekilBoyutuOlc(etiket: string, altEtiket: string, sekil: SekilGenis, ikon: IkonAdi | null) {
  const hamGenislik = yaziGenisligi(etiket, AKIS_ANA_BOYUT);
  const hedefIcW = sekil === "daire" ? 132 : sekil === "elmas" ? 148 : hamGenislik <= 175 && !altEtiket ? 185 : 196;
  const ana = olculuSatirlar(etiket, hedefIcW, AKIS_ANA_BOYUT);
  const alt = olculuSatirlar(altEtiket, hedefIcW, AKIS_ALT_BOYUT);
  const metinW = Math.max(40, ana.genislik, alt.genislik);
  const ara = ana.satirlar.length && alt.satirlar.length ? 5 : 0;
  const metinH = ana.satirlar.length * AKIS_ANA_ADIM + ara + alt.satirlar.length * AKIS_ALT_ADIM;

  const ustteIkon = Boolean(ikon && (sekil === "daire" || sekil === "elmas"));
  const icerikW = !ikon ? metinW : ustteIkon ? Math.max(AKIS_IKON_BOYUT, metinW) : AKIS_IKON_BOYUT + AKIS_IKON_ARA + metinW;
  const icerikH = !ikon ? metinH : ustteIkon ? AKIS_IKON_BOYUT + 6 + metinH : Math.max(AKIS_IKON_BOYUT, metinH);

  let w: number;
  let h: number;
  switch (sekil) {
    case "daire": {
      const cap = Math.max(ikon ? 88 : 78, Math.ceil(Math.hypot(icerikW + 28, icerikH + 24)));
      w = cap;
      h = cap;
      break;
    }
    case "elmas":
      w = Math.max(ikon ? 142 : 134, Math.ceil((icerikW + 22) * 1.82));
      h = Math.max(ikon ? 86 : 76, Math.ceil((icerikH + 18) * 2.12));
      break;
    case "oval":
      w = Math.max(122, Math.ceil(icerikW + 48));
      h = Math.max(48, Math.ceil(icerikH + 26));
      break;
    case "paralelkenar":
      w = Math.max(128, Math.ceil(icerikW + 66));
      h = Math.max(48, Math.ceil(icerikH + 24));
      break;
    case "bulut":
      w = Math.max(132, Math.ceil(icerikW + 52));
      h = Math.max(68, Math.ceil(icerikH + 34));
      break;
    case "kutu":
    case "yuvarlak":
    default:
      w = Math.max(110, Math.ceil(icerikW + 34));
      h = Math.max(48, Math.ceil(icerikH + 24));
      break;
  }

  return {
    w,
    h,
    anaSatirlar: ana.satirlar,
    altSatirlar: alt.satirlar,
    metinW,
    metinH,
    icerikW,
    icerikH,
    ustteIkon,
    ara,
  };
}

function sekilDrawableOlustur(x: number, y: number, w: number, h: number, sekil: SekilGenis, renk: string, dolgu: string, seed: number): Drawable {
  const o = duzSekilSecenek(renk, dolgu, 2.1, 0.16, seed);
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
      const egim = Math.min(18, w * 0.14);
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
    case "bulut":
      return gen.path(bulutYolu(x, y, w, h), o);
    case "yuvarlak":
    default:
      return gen.path(yuvarlakKutuYolu(x, y, w, h, Math.min(13, w / 4, h / 4)), o);
  }
}

function isinCokgenKesisim(cx: number, cy: number, dx: number, dy: number, koseler: [number, number][]): Nokta {
  let enKucukT = Infinity;
  for (let i = 0; i < koseler.length; i++) {
    const [x1, y1] = koseler[i];
    const [x2, y2] = koseler[(i + 1) % koseler.length];
    const sx = x2 - x1;
    const sy = y2 - y1;
    const payda = dx * sy - dy * sx;
    if (Math.abs(payda) < 1e-6) continue;
    const t = ((x1 - cx) * sy - (y1 - cy) * sx) / payda;
    const u = ((x1 - cx) * dy - (y1 - cy) * dx) / payda;
    if (t > 0 && u >= -1e-4 && u <= 1 + 1e-4 && t < enKucukT) enKucukT = t;
  }
  return Number.isFinite(enKucukT) ? { x: cx + dx * enKucukT, y: cy + dy * enKucukT } : { x: cx, y: cy };
}

function sekilSinirNoktasi(cx: number, cy: number, w: number, h: number, sekil: SekilGenis, hedef: Nokta): Nokta {
  const dx = hedef.x - cx;
  const dy = hedef.y - cy;
  const uzunluk = Math.hypot(dx, dy);
  if (uzunluk < 1e-3) return { x: cx, y: cy };
  const rx = w / 2;
  const ry = h / 2;

  switch (sekil) {
    case "daire": {
      const r = Math.min(rx, ry);
      return { x: cx + (dx / uzunluk) * r, y: cy + (dy / uzunluk) * r };
    }
    case "elmas": {
      const t = 1 / (Math.abs(dx) / rx + Math.abs(dy) / ry);
      return { x: cx + dx * t, y: cy + dy * t };
    }
    case "paralelkenar": {
      const egim = Math.min(18, w * 0.14);
      return isinCokgenKesisim(cx, cy, dx, dy, [
        [cx - rx + egim, cy - ry],
        [cx + rx, cy - ry],
        [cx + rx - egim, cy + ry],
        [cx - rx, cy + ry],
      ]);
    }
    case "bulut": {
      const t = 1 / Math.hypot(dx / (rx * 0.92), dy / (ry * 0.84));
      return { x: cx + dx * t, y: cy + dy * t };
    }
    case "oval": {
      const r = Math.min(rx, ry);
      const tKutu = Math.min(Math.abs(dx) > 1e-6 ? rx / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-6 ? ry / Math.abs(dy) : Infinity);
      const kx = dx * tKutu;
      const ky = dy * tKutu;
      const duzYari = Math.max(0, rx - r);
      if (Math.abs(kx) <= duzYari) return { x: cx + kx, y: cy + ky };
      const ucx = kx >= 0 ? duzYari : -duzYari;
      const a = dx * dx + dy * dy;
      const b = -2 * ucx * dx;
      const c = ucx * ucx - r * r;
      const d = Math.max(0, b * b - 4 * a * c);
      const t = (-b + Math.sqrt(d)) / (2 * a);
      return { x: cx + dx * t, y: cy + dy * t };
    }
    case "kutu":
    case "yuvarlak":
    default: {
      const t = Math.min(Math.abs(dx) > 1e-6 ? rx / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-6 ? ry / Math.abs(dy) : Infinity);
      return { x: cx + dx * t, y: cy + dy * t };
    }
  }
}

function ardisikNoktalariTemizle(noktalar: Nokta[]): Nokta[] {
  if (noktalar.length <= 2) return noktalar;
  const sonuc: Nokta[] = [noktalar[0]];
  for (let i = 1; i < noktalar.length - 1; i++) {
    const onceki = sonuc[sonuc.length - 1];
    if (Math.hypot(noktalar[i].x - onceki.x, noktalar[i].y - onceki.y) >= 4) sonuc.push(noktalar[i]);
  }
  const son = noktalar[noktalar.length - 1];
  const sondanOnce = sonuc[sonuc.length - 1];
  if (Math.hypot(son.x - sondanOnce.x, son.y - sondanOnce.y) < 3 && sonuc.length > 1) sonuc[sonuc.length - 1] = son;
  else sonuc.push(son);
  return sonuc;
}

type DugumGirdi = AkisDugum & { ikon?: string };

type DugumPlan = {
  id: string;
  etiket: string;
  altEtiket: string;
  ikon: IkonAdi | null;
  sekil: SekilGenis;
  renk: string;
  dolgu: string;
  yaziRenk: string;
  grup?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  anaSatirlar: string[];
  altSatirlar: string[];
  metinW: number;
  metinH: number;
  icerikW: number;
  icerikH: number;
  ustteIkon: boolean;
  ara: number;
  cizim: Drawable;
  vurusSira: number;
  adim: number;
  toplam: number;
};

type GrupPlan = {
  id: string;
  baslik: string;
  renk: string;
  dolgu: string;
  x: number;
  y: number;
  w: number;
  h: number;
  cizim: Drawable;
  vurusSira: number;
  adim: number;
  toplam: number;
};

type BaglantiPlan = {
  anahtar: string;
  noktalar: Nokta[];
  renk: string;
  kesikli: boolean;
  ciftYon: boolean;
  akis: boolean;
  etiket: string;
  etiketSatirlari: string[];
  rozet: { x: number; y: number; w: number; h: number } | null;
  vurusSira: number;
  adim: number;
  toplam: number;
};

function sekilNormalize(ham?: string): SekilGenis {
  const k = (ham ?? "").trim().toLocaleLowerCase("tr");
  if (k === "bulut" || k === "cloud") return "bulut";
  if (k === "kutu" || k === "yuvarlak" || k === "oval" || k === "elmas" || k === "daire" || k === "paralelkenar") return k;
  return "yuvarlak";
}

function akisPlanla(aksiyonlar: AkisSemasiAksiyonu[], blokId: string, kutu: Blok["kutu"]) {
  const yon: AkisYon = aksiyonlar.find((a) => a.yon)?.yon === "LR" ? "LR" : "TB";

  const grupKayit = new Map<string, AkisGrubu & { vurusSira: number }>();
  const dugumKayit = new Map<string, DugumGirdi & { vurusSira: number; sira: number }>();
  const grupUyelik = new Map<string, string>();
  const baglantiKayit: (AkisBaglantisi & { vurusSira: number; anahtar: string })[] = [];
  const gorulenBaglanti = new Set<string>();
  const vurusAdimlari = aksiyonlar.map(() => ({ gruplar: 0, dugumler: 0, baglantilar: 0 }));

  const dugumEkle = (d: DugumGirdi, vurusSira: number) => {
    const id = d.id.trim();
    if (!id) return;
    const eski = dugumKayit.get(id);
    if (!eski) {
      dugumKayit.set(id, { ...d, id, vurusSira, sira: dugumKayit.size });
    } else {
      dugumKayit.set(id, {
        ...eski,
        ...d,
        id,
        etiket: d.etiket || eski.etiket,
        altEtiket: d.altEtiket ?? eski.altEtiket,
        ikon: d.ikon ?? eski.ikon,
        grup: d.grup ?? eski.grup,
        vurusSira: eski.vurusSira,
        sira: eski.sira,
      });
    }
    if (d.grup?.trim()) grupUyelik.set(id, d.grup.trim());
  };

  aksiyonlar.forEach((a, ai) => {
    for (const g of a.gruplar ?? []) {
      const gid = g.id?.trim();
      if (!gid) continue;
      const eski = grupKayit.get(gid);
      if (!eski) grupKayit.set(gid, { ...g, id: gid, vurusSira: ai });
      else grupKayit.set(gid, { ...eski, ...g, id: gid, vurusSira: eski.vurusSira });
      for (const did of g.dugumler ?? []) {
        const temizDid = did.trim();
        if (temizDid) grupUyelik.set(temizDid, gid);
      }
    }
    for (const d of a.dugumler ?? []) dugumEkle(d, ai);
    for (const b of a.baglantilar ?? []) {
      const kaynak = b.kaynak?.trim();
      const hedef = b.hedef?.trim();
      if (!kaynak || !hedef) continue;
      if (!dugumKayit.has(kaynak)) dugumEkle({ id: kaynak, etiket: kaynak }, ai);
      if (!dugumKayit.has(hedef)) dugumEkle({ id: hedef, etiket: hedef }, ai);
      const temelAnahtar = `${kaynak}=>${hedef}|${etiketNormal(b.etiket)}`;
      let anahtar = temelAnahtar;
      let kopya = 1;
      while (gorulenBaglanti.has(anahtar)) {
        // Önceki vuruşta birebir aynı bağlantı eklendiyse tekrarlama.
        if (baglantiKayit.some((x) => x.anahtar === temelAnahtar && x.vurusSira < ai)) {
          anahtar = "";
          break;
        }
        anahtar = `${temelAnahtar}#${kopya++}`;
      }
      if (!anahtar) continue;
      gorulenBaglanti.add(anahtar);
      baglantiKayit.push({ ...b, kaynak, hedef, vurusSira: ai, anahtar });
    }
  });

  if (dugumKayit.size === 0) {
    return { gruplar: [] as GrupPlan[], dugumler: [] as DugumPlan[], baglantilar: [] as BaglantiPlan[], viewBox: "0 0 100 100" };
  }

  // Eksik tanımlanmış grup kimliklerini otomatik tamamla
  for (const [, gid] of grupUyelik) {
    if (!grupKayit.has(gid)) {
      grupKayit.set(gid, { id: gid, baslik: gid, vurusSira: 0 });
    }
  }

  const g = new dagre.graphlib.Graph({ compound: true, multigraph: true });
  g.setGraph({
    rankdir: yon,
    nodesep: yon === "TB" ? 48 : 42,
    ranksep: yon === "TB" ? 68 : 82,
    edgesep: 30,
    marginx: 34,
    marginy: 34,
    ranker: "network-simplex",
  });
  g.setDefaultEdgeLabel(() => ({}));

  const aktifGruplar = new Map<string, AkisGrubu & { vurusSira: number; cocuklar: string[] }>();
  for (const [gid, gr] of grupKayit) aktifGruplar.set(gid, { ...gr, cocuklar: [] });
  for (const [did, gid] of grupUyelik) {
    if (dugumKayit.has(did)) aktifGruplar.get(gid)?.cocuklar.push(did);
  }
  for (const [gid, gr] of aktifGruplar) {
    if (gr.cocuklar.length === 0) continue;
    g.setNode(`__grup:${gid}`, { label: metinTemizle(gr.baslik) });
  }

  const olculer = new Map<string, ReturnType<typeof sekilBoyutuOlc> & { sekil: SekilGenis; etiket: string; altEtiket: string; ikon: IkonAdi | null }>();
  for (const d of dugumKayit.values()) {
    const sekil = sekilNormalize(d.sekil);
    const etiket = metinTemizle(d.etiket) || d.id;
    const hamAlt = metinTemizle(d.altEtiket);
    const altEtiket = hamAlt && etiketNormal(hamAlt) !== etiketNormal(etiket) ? hamAlt : "";
    const ikon = gecerliIkonCoz(d);
    const olcu = sekilBoyutuOlc(etiket, altEtiket, sekil, ikon);
    olculer.set(d.id, { ...olcu, sekil, etiket, altEtiket, ikon });
    g.setNode(`__dugum:${d.id}`, { width: olcu.w, height: olcu.h });
    const gid = grupUyelik.get(d.id);
    if (gid && (aktifGruplar.get(gid)?.cocuklar.length ?? 0) > 0) {
      g.setParent(`__dugum:${d.id}`, `__grup:${gid}`);
    }
  }

  const kenarMetinleri = baglantiKayit.map((b, i) => {
    const etiket = metinTemizle(b.etiket);
    const sat = olculuSatirlar(etiket, 140, AKIS_ETIKET_BOYUT);
    const ew = etiket ? Math.ceil(sat.genislik + 22) : 0;
    const eh = etiket ? Math.ceil(sat.satirlar.length * (AKIS_ETIKET_BOYUT * 1.24) + 12) : 0;
    if (b.kaynak !== b.hedef) {
      g.setEdge(`__dugum:${b.kaynak}`, `__dugum:${b.hedef}`, { width: ew, height: eh, labelpos: "c" }, `e-${i}`);
    }
    return { etiket, satirlar: sat.satirlar, ew, eh };
  });

  dagre.layout(g);

  // Vuruş adım sayılarını hesapla
  for (const gr of aktifGruplar.values()) {
    if (gr.cocuklar.length > 0) vurusAdimlari[gr.vurusSira].gruplar++;
  }
  for (const d of dugumKayit.values()) vurusAdimlari[d.vurusSira].dugumler++;
  for (const b of baglantiKayit) vurusAdimlari[b.vurusSira].baglantilar++;

  const vurusToplamlari = vurusAdimlari.map((v) => v.gruplar + v.dugumler + v.baglantilar);
  const vurusSayaci = vurusAdimlari.map(() => 0);

  // Düğümler
  const dugumler: DugumPlan[] = [];
  const dugumHarita = new Map<string, DugumPlan>();
  const doluEngeller: Sinir[] = [];

  for (const d of dugumKayit.values()) {
    const pos = g.node(`__dugum:${d.id}`);
    const olcu = olculer.get(d.id)!;
    const cx = Number.isFinite(pos?.x) ? pos.x : 100 + d.sira * 160;
    const cy = Number.isFinite(pos?.y) ? pos.y : 80;
    const x = cx - olcu.w / 2;
    const y = cy - olcu.h / 2;
    const renk = renkCoz(d.renk, VURGU_RENKLERI[d.sira % VURGU_RENKLERI.length]);
    const dolgu = dolguSec(renk, d.dolgu, d.sira);
    const yaziRenk = koyuRenkMi(dolgu) ? "#ffffff" : "#1e1e1e";
    const cizim = sekilDrawableOlustur(x, y, olcu.w, olcu.h, olcu.sekil, renk, dolgu, tohum(`${blokId}-n-${d.id}`));

    doluEngeller.push({ x0: x - 6, y0: y - 6, x1: x + olcu.w + 6, y1: y + olcu.h + 6 });

    const plan: DugumPlan = {
      id: d.id,
      etiket: olcu.etiket,
      altEtiket: olcu.altEtiket,
      ikon: olcu.ikon,
      sekil: olcu.sekil,
      renk,
      dolgu,
      yaziRenk,
      grup: grupUyelik.get(d.id),
      x,
      y,
      w: olcu.w,
      h: olcu.h,
      anaSatirlar: olcu.anaSatirlar,
      altSatirlar: olcu.altSatirlar,
      metinW: olcu.metinW,
      metinH: olcu.metinH,
      icerikW: olcu.icerikW,
      icerikH: olcu.icerikH,
      ustteIkon: olcu.ustteIkon,
      ara: olcu.ara,
      cizim,
      vurusSira: d.vurusSira,
      adim: 0,
      toplam: vurusToplamlari[d.vurusSira],
    };
    dugumler.push(plan);
    dugumHarita.set(d.id, plan);
  }

  // Sıraları belirle: önce gruplar, sonra düğümler, sonra bağlantılar
  const gruplar: GrupPlan[] = [];
  let gIdx = 0;
  for (const gr of aktifGruplar.values()) {
    if (gr.cocuklar.length === 0) continue;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const did of gr.cocuklar) {
      const dn = dugumHarita.get(did);
      if (!dn) continue;
      minX = Math.min(minX, dn.x);
      minY = Math.min(minY, dn.y);
      maxX = Math.max(maxX, dn.x + dn.w);
      maxY = Math.max(maxY, dn.y + dn.h);
    }
    if (!Number.isFinite(minX)) continue;
    const baslik = metinTemizle(gr.baslik);
    const baslikW = baslik ? yaziGenisligi(baslik, 14) + 32 : 0;
    const padX = 22;
    const padUst = baslik ? 38 : 20;
    const padAlt = 20;
    const icW = maxX - minX + padX * 2;
    const w = Math.max(icW, baslikW);
    const x = (minX + maxX) / 2 - w / 2;
    const y = minY - padUst;
    const h = maxY - minY + padUst + padAlt;
    const renk = renkCoz(gr.renk, VURGU_RENKLERI[(gIdx + 3) % VURGU_RENKLERI.length]);
    const dolgu = dolguSec(renk, gr.dolgu, gIdx + 3);
    const cizim = gen.path(
      yuvarlakKutuYolu(x, y, w, h, 16),
      duzSekilSecenek(renk, dolgu, 1.7, 0.16, tohum(`${blokId}-g-${gr.id}`)),
    );
    gruplar.push({
      id: gr.id,
      baslik,
      renk,
      dolgu,
      x,
      y,
      w,
      h,
      cizim,
      vurusSira: gr.vurusSira,
      adim: vurusSayaci[gr.vurusSira]++,
      toplam: vurusToplamlari[gr.vurusSira],
    });
    gIdx++;
  }

  for (const dn of dugumler) {
    dn.adim = vurusSayaci[dn.vurusSira]++;
  }

  // Ön sınırları oluştur (edge etiket yerleşimi için)
  let genelSinir: Sinir | null = null;
  for (const gr of gruplar) genelSinir = sinirGenislet(genelSinir, { x0: gr.x, y0: gr.y, x1: gr.x + gr.w, y1: gr.y + gr.h });
  for (const dn of dugumler) genelSinir = sinirGenislet(genelSinir, { x0: dn.x, y0: dn.y, x1: dn.x + dn.w, y1: dn.y + dn.h });

  // Bağlantılar
  const baglantilar: BaglantiPlan[] = [];
  const etiketSiniriBase = genelSinir ?? { x0: 0, y0: 0, x1: 600, y1: 400 };
  const etiketAlan: Sinir = {
    x0: etiketSiniriBase.x0 - 48,
    y0: etiketSiniriBase.y0 - 40,
    x1: etiketSiniriBase.x1 + 48,
    y1: etiketSiniriBase.y1 + 40,
  };

  baglantiKayit.forEach((b, i) => {
    const kaynakD = dugumHarita.get(b.kaynak)!;
    const hedefD = dugumHarita.get(b.hedef)!;
    const renk = renkCoz(b.renk, "#343a40");
    const km = kenarMetinleri[i];

    let noktalar: Nokta[];
    let hamOrta: Nokta;

    if (b.kaynak === b.hedef) {
      const sag = kaynakD.x + kaynakD.w;
      const cy = kaynakD.y + kaynakD.h / 2;
      const aciklik = 42;
      const bas = sekilSinirNoktasi(kaynakD.x + kaynakD.w / 2, cy, kaynakD.w, kaynakD.h, kaynakD.sekil, { x: sag + 20, y: cy - 12 });
      const son = sekilSinirNoktasi(kaynakD.x + kaynakD.w / 2, cy, kaynakD.w, kaynakD.h, kaynakD.sekil, { x: sag + 20, y: cy + 12 });
      noktalar = [bas, { x: sag + aciklik, y: cy - 26 }, { x: sag + aciklik, y: cy + 26 }, son];
      hamOrta = { x: sag + aciklik + 18, y: cy };
    } else {
      const e = g.edge(`__dugum:${b.kaynak}`, `__dugum:${b.hedef}`, `e-${i}`) as { points?: Nokta[]; x?: number; y?: number } | undefined;
      const hamNoktalar = e?.points?.length ? e.points.map((p) => ({ x: p.x, y: p.y })) : [
        { x: kaynakD.x + kaynakD.w / 2, y: kaynakD.y + kaynakD.h / 2 },
        { x: hedefD.x + hedefD.w / 2, y: hedefD.y + hedefD.h / 2 },
      ];
      const temizNoktalar = ardisikNoktalariTemizle(hamNoktalar);
      const kCx = kaynakD.x + kaynakD.w / 2;
      const kCy = kaynakD.y + kaynakD.h / 2;
      const hCx = hedefD.x + hedefD.w / 2;
      const hCy = hedefD.y + hedefD.h / 2;
      const ilkYon = temizNoktalar[0] && Math.hypot(temizNoktalar[0].x - kCx, temizNoktalar[0].y - kCy) > 2 ? temizNoktalar[0] : (temizNoktalar[1] ?? { x: hCx, y: hCy });
      const sonYon =
        temizNoktalar[temizNoktalar.length - 1] &&
        Math.hypot(temizNoktalar[temizNoktalar.length - 1].x - hCx, temizNoktalar[temizNoktalar.length - 1].y - hCy) > 2
          ? temizNoktalar[temizNoktalar.length - 1]
          : (temizNoktalar[temizNoktalar.length - 2] ?? { x: kCx, y: kCy });

      temizNoktalar[0] = sekilSinirNoktasi(kCx, kCy, kaynakD.w, kaynakD.h, kaynakD.sekil, ilkYon);
      temizNoktalar[temizNoktalar.length - 1] = sekilSinirNoktasi(hCx, hCy, hedefD.w, hedefD.h, hedefD.sekil, sonYon);
      noktalar = ardisikNoktalariTemizle(temizNoktalar);

      const ortaIdx = Math.floor(noktalar.length / 2);
      const pA = noktalar[Math.max(0, ortaIdx - 1)];
      const pB = noktalar[Math.min(noktalar.length - 1, ortaIdx)];
      hamOrta =
        Number.isFinite(e?.x) && Number.isFinite(e?.y)
          ? { x: e!.x!, y: e!.y! }
          : noktalar.length % 2 === 1
            ? noktalar[ortaIdx]
            : { x: (pA.x + pB.x) / 2, y: (pA.y + pB.y) / 2 };
    }

    for (const pt of noktalar) genelSinir = sinirGenislet(genelSinir, { x0: pt.x, y0: pt.y, x1: pt.x, y1: pt.y });

    let rozet: BaglantiPlan["rozet"] = null;
    if (km.etiket) {
      const enGenisSatir = km.satirlar.reduce((a, s) => (yaziGenisligi(s, AKIS_ETIKET_BOYUT) > yaziGenisligi(a, AKIS_ETIKET_BOYUT) ? s : a), km.satirlar[0] ?? km.etiket);
      const rw = km.ew;
      const rh = km.eh;
      const yer = bosYereYerlestir(hamOrta.x, hamOrta.y + 4, enGenisSatir, AKIS_ETIKET_BOYUT, "middle", etiketAlan, doluEngeller);
      let rx = yer.x - rw / 2;
      let ry = yer.y - AKIS_ETIKET_BOYUT * 0.35 - rh / 2;
      const cakisir = (x: number, y: number) => {
        const s: Sinir = { x0: x - 4, y0: y - 4, x1: x + rw + 4, y1: y + rh + 4 };
        return doluEngeller.some((d) => kesisir(d, s));
      };
      if (cakisir(rx, ry)) {
        const adaylar: [number, number][] = [
          [rw * 0.65, 0],
          [-rw * 0.65, 0],
          [0, rh * 1.15],
          [0, -rh * 1.15],
          [rw * 0.85, rh * 0.9],
          [-rw * 0.85, -rh * 0.9],
        ];
        for (const [dx, dy] of adaylar) {
          if (!cakisir(rx + dx, ry + dy)) {
            rx += dx;
            ry += dy;
            break;
          }
        }
      }
      doluEngeller.push({ x0: rx - 4, y0: ry - 4, x1: rx + rw + 4, y1: ry + rh + 4 });
      genelSinir = sinirGenislet(genelSinir, { x0: rx, y0: ry, x1: rx + rw, y1: ry + rh });
      rozet = { x: rx, y: ry, w: rw, h: rh };
    }

    baglantilar.push({
      anahtar: b.anahtar,
      noktalar,
      renk,
      kesikli: Boolean(b.kesikli),
      ciftYon: Boolean(b.ciftYon),
      akis: Boolean(b.akis),
      etiket: km.etiket,
      etiketSatirlari: km.satirlar,
      rozet,
      vurusSira: b.vurusSira,
      adim: vurusSayaci[b.vurusSira]++,
      toplam: vurusToplamlari[b.vurusSira],
    });
  });

  return {
    gruplar,
    dugumler,
    baglantilar,
    viewBox: viewBoxHesapla(genelSinir, kutu, 20),
  };
}

export function AkisSemasiBlok({
  parcalar,
  blokId,
  kutu,
}: {
  parcalar: Parca<AkisSemasiAksiyonu>[];
  blokId: string;
  kutu: Blok["kutu"];
}) {
  const veriAnahtari = JSON.stringify(parcalar.map((x) => x.aksiyon));
  const duzen = useMemo(() => {
    const aksiyonlar = JSON.parse(veriAnahtari) as AkisSemasiAksiyonu[];
    return akisPlanla(aksiyonlar, blokId, kutu);
  }, [veriAnahtari, blokId, kutu]);

  return (
    <svg viewBox={duzen.viewBox} preserveAspectRatio="xMidYMin meet" overflow="hidden">
      {duzen.gruplar.map((gr) => {
        const gp = parcaAdimP(parcalar, gr.vurusSira, gr.adim, gr.toplam);
        if (gp <= 0) return null;
        return (
          <g key={`gr-${gr.id}`}>
            <Kaba cizim={gr.cizim} p={sinirla(gp * 1.35)} kesikli dolguOpaklik={0.34} />
            {gr.baslik && (
              <Yazi
                x={gr.x + 14}
                y={gr.y + 22}
                metin={gr.baslik}
                boyut={14}
                renk={gr.renk}
                kalin
                p={sinirla((gp - 0.25) * 1.4)}
              />
            )}
          </g>
        );
      })}

      {duzen.dugumler.map((d) => {
        const dp = parcaAdimP(parcalar, d.vurusSira, d.adim, d.toplam);
        if (dp <= 0) return null;
        const sekilP = sinirla(dp * 1.55);
        const yaziP = sinirla((dp - 0.38) * 1.75);
        const cx = d.x + d.w / 2;
        const cy = d.y + d.h / 2;
        const anaH = d.anaSatirlar.length * AKIS_ANA_ADIM;
        const altH = d.altSatirlar.length * AKIS_ALT_ADIM;

        const ikonVar = Boolean(d.ikon);
        const grupSol = cx - d.icerikW / 2;
        const icerikTop = cy - d.icerikH / 2;
        const ikonX = d.ustteIkon ? cx - AKIS_IKON_BOYUT / 2 : grupSol;
        const ikonY = d.ustteIkon ? icerikTop : cy - AKIS_IKON_BOYUT / 2;

        const yaziBasY = d.ustteIkon ? icerikTop + AKIS_IKON_BOYUT + 6 : cy - d.metinH / 2;
        const anaY = yaziBasY + anaH / 2;
        const altY = yaziBasY + anaH + d.ara + altH / 2;
        const yaziX = ikonVar && !d.ustteIkon ? grupSol + AKIS_IKON_BOYUT + AKIS_IKON_ARA : cx;
        const yaziHizala = ikonVar && !d.ustteIkon ? "start" : "middle";
        const icMaxW = ikonVar ? d.metinW + 6 : d.w - 16;
        const koyuArka = koyuRenkMi(d.dolgu);

        return (
          <g key={`n-${d.id}`}>
            <Kaba cizim={d.cizim} p={sekilP} />
            {yaziP > 0 && d.ikon && (
              <g>
                {koyuArka && (
                  <circle
                    cx={ikonX + AKIS_IKON_BOYUT / 2}
                    cy={ikonY + AKIS_IKON_BOYUT / 2}
                    r={AKIS_IKON_BOYUT * 0.56}
                    fill="#ffffff"
                    fillOpacity={0.9 * sinirla(yaziP * 1.4)}
                  />
                )}
                <IkonCiz
                  ad={d.ikon}
                  x={ikonX}
                  y={ikonY}
                  boyut={AKIS_IKON_BOYUT}
                  renk={koyuArka ? "#1e293b" : d.renk}
                  p={sinirla(yaziP * 1.35)}
                />
              </g>
            )}
            {yaziP > 0 && d.anaSatirlar.length > 0 && (
              <CokSatirliYazi
                x={yaziX}
                y={anaY}
                metin={d.etiket}
                maksGenislik={icMaxW}
                boyut={AKIS_ANA_BOYUT}
                satirYuksekligi={AKIS_ANA_ADIM}
                renk={d.yaziRenk}
                hizala={yaziHizala}
                dikeyHizala="ortali"
                konturKalinlik={0}
                kalin={Boolean(d.altEtiket)}
                p={d.altSatirlar.length ? sinirla(yaziP * 1.35) : yaziP}
              />
            )}
            {yaziP > 0 && d.altSatirlar.length > 0 && (
              <CokSatirliYazi
                x={yaziX}
                y={altY}
                metin={d.altEtiket}
                maksGenislik={icMaxW}
                boyut={AKIS_ALT_BOYUT}
                satirYuksekligi={AKIS_ALT_ADIM}
                renk={koyuArka ? "#e9ecef" : "#495057"}
                hizala={yaziHizala}
                dikeyHizala="ortali"
                konturKalinlik={0}
                p={sinirla((yaziP - 0.28) * 1.45)}
              />
            )}
          </g>
        );
      })}

      {duzen.baglantilar.map((b) => {
        const bp = parcaAdimP(parcalar, b.vurusSira, b.adim, b.toplam);
        if (bp <= 0) return null;
        const okP = b.rozet ? sinirla(bp * 1.35) : bp;
        const rozetP = sinirla((bp - 0.45) * 1.85);
        return (
          <g key={`e-${b.anahtar}`}>
            <Ok
              noktalar={b.noktalar}
              renk={b.renk}
              kalinlik={2.2}
              ucBoyutu={11}
              kesikli={b.kesikli}
              ciftYon={b.ciftYon}
              akis={b.akis ? { sure: 1.25, yon: 1, gecikme: 0 } : undefined}
              p={okP}
            />
            {b.rozet && rozetP > 0 && (
              <g>
                <Cizgi
                  d={yuvarlakKutuYolu(b.rozet.x, b.rozet.y, b.rozet.w, b.rozet.h, 7)}
                  renk={b.renk}
                  kalinlik={1.2}
                  dolgu="#ffffff"
                  dolguOpaklik={0.95}
                  p={rozetP}
                  kalem={false}
                />
                <CokSatirliYazi
                  x={b.rozet.x + b.rozet.w / 2}
                  y={b.rozet.y + b.rozet.h / 2}
                  metin={b.etiket}
                  maksGenislik={b.rozet.w - 12}
                  boyut={AKIS_ETIKET_BOYUT}
                  satirYuksekligi={AKIS_ETIKET_BOYUT * 1.24}
                  renk={b.renk}
                  hizala="middle"
                  dikeyHizala="ortali"
                  konturKalinlik={0}
                  kalin
                  p={rozetP}
                />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// --- 2. ZAMAN ÇİZELGESİ ---

const ZAMAN_TARIH_BOYUT = 13.5;
const ZAMAN_BASLIK_BOYUT = 15.5;
const ZAMAN_ACIKLAMA_BOYUT = 13;
const ZAMAN_IKON_BOYUT = 28;

type OlayGirdi = ZamanOlayi & { ikon?: string };

type OlayPlan = {
  sira: number;
  tarihMetni: string;
  baslik: string;
  aciklama: string;
  ikon: IkonAdi | null;
  renk: string;
  dolgu: string;
  vurgulu: boolean;
  nokta: Nokta;
  sapBas: Nokta;
  sapSon: Nokta;
  kart: { x: number; y: number; w: number; h: number };
  rozet: { x: number; y: number; w: number; h: number };
  ikonKonum: Nokta | null;
  baslikY: number;
  aciklamaY: number;
  icMaxW: number;
  kartCizim: Drawable;
  vurusSira: number;
  adim: number;
  toplam: number;
};

function zamanPlanla(aksiyonlar: ZamanCizelgesiAksiyonu[], blokId: string, kutu: Blok["kutu"]) {
  const anaBaslik = metinTemizle(aksiyonlar.find((a) => metinTemizle(a.baslik))?.baslik);
  const hamOlaylar: (ZamanOlayi & { vurusSira: number; sira: number })[] = [];
  const gorulenOlay = new Set<string>();

  aksiyonlar.forEach((a, ai) => {
    for (const ev of a.olaylar ?? []) {
      const t = metinTemizle(ev.tarih);
      const b = metinTemizle(ev.baslik);
      if (!t && !b) continue;
      const imza = `${etiketNormal(t)}|${etiketNormal(b)}`;
      if (gorulenOlay.has(imza)) continue;
      gorulenOlay.add(imza);
      hamOlaylar.push({ ...ev, vurusSira: ai, sira: hamOlaylar.length });
    }
  });

  if (hamOlaylar.length === 0) {
    return {
      yon: "yatay" as ZamanCizelgesiYon,
      anaBaslik,
      baslikKonum: { x: 0, y: 0 },
      eksen: { x1: 0, y1: 0, x2: 100, y2: 0 },
      olaylar: [] as OlayPlan[],
      viewBox: "0 0 100 100",
    };
  }

  const acikYon = aksiyonlar.find((a) => a.yon)?.yon;
  const yon: ZamanCizelgesiYon = acikYon ?? (hamOlaylar.length <= 6 && kutu.w >= 540 ? "yatay" : "dikey");
  const vurusAdimSayisi = aksiyonlar.map(() => 0);
  hamOlaylar.forEach((o) => vurusAdimSayisi[o.vurusSira]++);
  const vurusSayaci = aksiyonlar.map(() => 0);

  const olculer = hamOlaylar.map((ev, i) => {
    const tarih = metinTemizle(ev.tarih);
    const aralik = metinTemizle(ev.aralik);
    const tarihMetni = etiketBirlestir(tarih, aralik, " · ");
    const baslik = metinTemizle(ev.baslik);
    const aciklama = metinTemizle(ev.aciklama);
    const ikon = gecerliIkonCoz(ev as OlayGirdi);
    const hedefIcW = yon === "yatay" ? (hamOlaylar.length <= 4 ? 215 : 184) : kutu.w < 720 ? 190 : 240;

    const bOlcu = olculuSatirlar(baslik, hedefIcW, ZAMAN_BASLIK_BOYUT);
    const aOlcu = olculuSatirlar(aciklama, hedefIcW, ZAMAN_ACIKLAMA_BOYUT);
    const rozetW = Math.max(66, Math.ceil(yaziGenisligi(tarihMetni, ZAMAN_TARIH_BOYUT) + 20));
    const rozetH = 24;
    const ustBantH = ikon ? Math.max(rozetH, ZAMAN_IKON_BOYUT) : rozetH;
    const ustBantW = ikon ? rozetW + 12 + ZAMAN_IKON_BOYUT : rozetW;

    const icMaxW = Math.max(120, bOlcu.genislik, aOlcu.genislik);
    const cardW = Math.max(152, ustBantW + 24, Math.ceil(icMaxW + 28));
    const bH = bOlcu.satirlar.length * (ZAMAN_BASLIK_BOYUT * 1.24);
    const aH = aOlcu.satirlar.length * (ZAMAN_ACIKLAMA_BOYUT * 1.24);
    const ara = bH > 0 && aH > 0 ? 5 : 0;
    const cardH = Math.ceil(10 + ustBantH + 8 + bH + ara + aH + 12);

    const renk = renkCoz(ev.renk, VURGU_RENKLERI[i % VURGU_RENKLERI.length]);
    const dolgu = ev.vurgulu ? dolguSec(renk, undefined, i) : "#ffffff";

    return {
      ev,
      tarihMetni,
      baslik,
      aciklama,
      ikon,
      renk,
      dolgu,
      vurgulu: Boolean(ev.vurgulu),
      rozetW,
      rozetH,
      ustBantH,
      cardW,
      cardH,
      bH,
      aH,
      ara,
    };
  });

  const olaylar: OlayPlan[] = [];
  let genelSinir: Sinir | null = null;
  let eksen = { x1: 0, y1: 0, x2: 100, y2: 0 };
  let baslikKonum = { x: 0, y: 26 };

  const olayEkle = (
    o: (typeof olculer)[number],
    i: number,
    kx: number,
    ky: number,
    nokta: Nokta,
    sapBas: Nokta,
    sapSon: Nokta,
    seedAnahtari: string,
  ) => {
    const rozet = { x: kx + 12, y: ky + 10 + (o.ustBantH - o.rozetH) / 2, w: o.rozetW, h: o.rozetH };
    const ikonKonum = o.ikon
      ? { x: kx + o.cardW - 12 - ZAMAN_IKON_BOYUT, y: ky + 10 + (o.ustBantH - ZAMAN_IKON_BOYUT) / 2 }
      : null;
    const icBasY = ky + 10 + o.ustBantH + 8;
    const baslikY = icBasY + o.bH / 2;
    const aciklamaY = icBasY + o.bH + o.ara + o.aH / 2;
    const kartCizim = gen.path(
      yuvarlakKutuYolu(kx, ky, o.cardW, o.cardH, 11),
      duzSekilSecenek(o.renk, o.dolgu, o.vurgulu ? 2.6 : 1.9, 0.14, tohum(seedAnahtari)),
    );
    genelSinir = sinirGenislet(genelSinir, { x0: kx, y0: ky, x1: kx + o.cardW, y1: ky + o.cardH });
    olaylar.push({
      sira: i,
      tarihMetni: o.tarihMetni,
      baslik: o.baslik,
      aciklama: o.aciklama,
      ikon: o.ikon,
      renk: o.renk,
      dolgu: o.dolgu,
      vurgulu: o.vurgulu,
      nokta,
      sapBas,
      sapSon,
      kart: { x: kx, y: ky, w: o.cardW, h: o.cardH },
      rozet,
      ikonKonum,
      baslikY,
      aciklamaY,
      icMaxW: o.cardW - 24,
      kartCizim,
      vurusSira: o.ev.vurusSira,
      adim: vurusSayaci[o.ev.vurusSira]++,
      toplam: vurusAdimSayisi[o.ev.vurusSira],
    });
  };

  if (yon === "yatay") {
    const maksUstH = olculer.reduce((m, o, i) => (i % 2 === 0 ? Math.max(m, o.cardH) : m), 0);
    const baslikPay = anaBaslik ? 46 : 16;
    const sapPay = 34;
    const axisY = baslikPay + (maksUstH > 0 ? maksUstH + sapPay : 28);

    let sonCx = -Infinity;
    let sonUstSag = -Infinity;
    let sonAltSag = -Infinity;

    const cxList: number[] = [];
    for (let i = 0; i < olculer.length; i++) {
      const o = olculer[i];
      const ust = i % 2 === 0;
      const minNoktaAralik = i === 0 ? 36 + o.cardW / 2 : sonCx + 82;
      const ayniTarafSag = ust ? sonUstSag : sonAltSag;
      const minKartAralik = Number.isFinite(ayniTarafSag) ? ayniTarafSag + 22 + o.cardW / 2 : -Infinity;
      const cx = Math.max(minNoktaAralik, minKartAralik);
      cxList.push(cx);
      sonCx = cx;
      if (ust) sonUstSag = cx + o.cardW / 2;
      else sonAltSag = cx + o.cardW / 2;
    }

    const eksenSol = Math.max(8, cxList[0] - Math.max(58, olculer[0].cardW * 0.56));
    const eksenSag = cxList[cxList.length - 1] + Math.max(64, olculer[olculer.length - 1].cardW * 0.58);
    eksen = { x1: eksenSol, y1: axisY, x2: eksenSag, y2: axisY };
    genelSinir = sinirGenislet(genelSinir, { x0: eksenSol - 10, y0: axisY - 12, x1: eksenSag + 12, y1: axisY + 12 });

    if (anaBaslik) {
      baslikKonum = { x: (eksenSol + eksenSag) / 2, y: 26 };
      const bw = yaziGenisligi(anaBaslik, 20);
      genelSinir = sinirGenislet(genelSinir, { x0: baslikKonum.x - bw / 2, y0: 4, x1: baslikKonum.x + bw / 2, y1: 36 });
    }

    olculer.forEach((o, i) => {
      const ust = i % 2 === 0;
      const cx = cxList[i];
      const kx = cx - o.cardW / 2;
      const ky = ust ? axisY - sapPay - o.cardH : axisY + sapPay;
      olayEkle(
        o,
        i,
        kx,
        ky,
        { x: cx, y: axisY },
        { x: cx, y: ust ? axisY - 9 : axisY + 9 },
        { x: cx, y: ust ? ky + o.cardH : ky },
        `${blokId}-z-${i}`,
      );
    });
  } else {
    const maksSolW = olculer.reduce((m, o, i) => (i % 2 === 0 ? Math.max(m, o.cardW) : m), 0);
    const sapPay = 32;
    const axisX = maksSolW + sapPay + 20;
    const baslikPay = anaBaslik ? 52 : 20;

    let sonAy = -Infinity;
    let sonSolAlt = baslikPay - 18;
    let sonSagAlt = baslikPay - 18;

    const ayList: number[] = [];
    for (let i = 0; i < olculer.length; i++) {
      const o = olculer[i];
      const sol = i % 2 === 0;
      const ayniTarafAlt = sol ? sonSolAlt : sonSagAlt;
      const minAyniTarafMerkez = ayniTarafAlt + 18 + o.cardH / 2;
      const minNoktaMerkez = Number.isFinite(sonAy) ? sonAy + 54 : baslikPay + o.cardH / 2;
      const ay = Math.max(minNoktaMerkez, minAyniTarafMerkez);
      ayList.push(ay);
      sonAy = ay;
      if (sol) sonSolAlt = ay + o.cardH / 2;
      else sonSagAlt = ay + o.cardH / 2;
    }

    const eksenUst = Math.max(baslikPay - 6, ayList[0] - Math.max(36, olculer[0].cardH * 0.45));
    const eksenAlt = ayList[ayList.length - 1] + Math.max(42, olculer[olculer.length - 1].cardH * 0.45);
    eksen = { x1: axisX, y1: eksenUst, x2: axisX, y2: eksenAlt };
    genelSinir = sinirGenislet(genelSinir, { x0: axisX - 12, y0: eksenUst - 10, x1: axisX + 12, y1: eksenAlt + 12 });

    if (anaBaslik) {
      baslikKonum = { x: axisX, y: 26 };
      const bw = yaziGenisligi(anaBaslik, 20);
      genelSinir = sinirGenislet(genelSinir, { x0: baslikKonum.x - bw / 2, y0: 4, x1: baslikKonum.x + bw / 2, y1: 36 });
    }

    olculer.forEach((o, i) => {
      const sol = i % 2 === 0;
      const ay = ayList[i];
      const kx = sol ? axisX - sapPay - o.cardW : axisX + sapPay;
      const ky = ay - o.cardH / 2;
      olayEkle(
        o,
        i,
        kx,
        ky,
        { x: axisX, y: ay },
        { x: sol ? axisX - 9 : axisX + 9, y: ay },
        { x: sol ? kx + o.cardW : kx, y: ay },
        `${blokId}-zd-${i}`,
      );
    });
  }

  return {
    yon,
    anaBaslik,
    baslikKonum,
    eksen,
    olaylar,
    viewBox: viewBoxHesapla(genelSinir, kutu, 22),
  };
}

export function ZamanCizelgesiBlok({
  parcalar,
  blokId,
  kutu,
}: {
  parcalar: Parca<ZamanCizelgesiAksiyonu>[];
  blokId: string;
  kutu: Blok["kutu"];
}) {
  const veriAnahtari = JSON.stringify(parcalar.map((x) => x.aksiyon));
  const duzen = useMemo(() => {
    const aksiyonlar = JSON.parse(veriAnahtari) as ZamanCizelgesiAksiyonu[];
    return zamanPlanla(aksiyonlar, blokId, kutu);
  }, [veriAnahtari, blokId, kutu]);

  const ilkP = parcalar[0]?.p ?? 0;
  const ilkOlayVar = duzen.olaylar.some((o) => o.vurusSira === 0);
  const eksenP = ilkOlayVar ? sinirla(ilkP * 4.5) : ilkP;

  return (
    <svg viewBox={duzen.viewBox} preserveAspectRatio="xMidYMin meet" overflow="hidden">
      {duzen.anaBaslik && eksenP > 0 && (
        <Yazi
          x={duzen.baslikKonum.x}
          y={duzen.baslikKonum.y}
          metin={duzen.anaBaslik}
          boyut={20}
          renk="#1971c2"
          hizala="middle"
          kalin
          p={sinirla(eksenP * 1.4)}
        />
      )}

      {eksenP > 0 && (
        <Ok
          x1={duzen.eksen.x1}
          y1={duzen.eksen.y1}
          x2={duzen.eksen.x2}
          y2={duzen.eksen.y2}
          renk="#495057"
          kalinlik={2.6}
          ucBoyutu={10}
          p={eksenP}
        />
      )}

      {duzen.olaylar.map((o) => {
        const hamP = parcalar[o.vurusSira]?.p ?? 0;
        const vurusP = o.vurusSira === 0 ? sinirla((hamP - 0.14) / 0.86) : hamP;
        const op = vurusP >= 1 ? 1 : vurusP <= 0 ? 0 : parcaIlerlemesi(vurusP, o.adim, Math.max(1, o.toplam));
        if (op <= 0) return null;

        const noktaP = sinirla(op * 3);
        const sapP = sinirla((op - 0.12) * 2.8);
        const kartP = sinirla((op - 0.24) * 1.7);
        const rozetP = sinirla((op - 0.42) * 2.1);
        const icerikP = sinirla((op - 0.5) * 2.0);

        return (
          <g key={`ev-${o.sira}`}>
            {o.vurgulu && (
              <circle
                cx={o.nokta.x}
                cy={o.nokta.y}
                r={12 * noktaP}
                fill={o.renk}
                fillOpacity={0.18}
              />
            )}
            <circle
              cx={o.nokta.x}
              cy={o.nokta.y}
              r={(o.vurgulu ? 8 : 6.5) * noktaP}
              fill={o.renk}
              stroke="#ffffff"
              strokeWidth={2.2}
            />
            {sapP > 0 && (
              <Cizgi
                d={`M${o.sapBas.x.toFixed(1)} ${o.sapBas.y.toFixed(1)} L${o.sapSon.x.toFixed(1)} ${o.sapSon.y.toFixed(1)}`}
                renk={o.renk}
                kalinlik={1.8}
                p={sapP}
                kesikli
              />
            )}
            {kartP > 0 && <Kaba cizim={o.kartCizim} p={kartP} />}
            {rozetP > 0 && (
              <g>
                <Cizgi
                  d={yuvarlakKutuYolu(o.rozet.x, o.rozet.y, o.rozet.w, o.rozet.h, 12)}
                  renk={o.renk}
                  kalinlik={1.2}
                  dolgu={o.renk}
                  dolguOpaklik={0.14}
                  p={rozetP}
                  kalem={false}
                />
                <Yazi
                  x={o.rozet.x + o.rozet.w / 2}
                  y={o.rozet.y + 16.5}
                  metin={o.tarihMetni}
                  boyut={ZAMAN_TARIH_BOYUT}
                  renk={o.renk}
                  hizala="middle"
                  konturKalinlik={0}
                  kalin
                  p={rozetP}
                />
                {o.ikon && o.ikonKonum && (
                  <IkonCiz
                    ad={o.ikon}
                    x={o.ikonKonum.x}
                    y={o.ikonKonum.y}
                    boyut={ZAMAN_IKON_BOYUT}
                    renk={o.renk}
                    p={rozetP}
                  />
                )}
              </g>
            )}
            {icerikP > 0 && o.baslik && (
              <CokSatirliYazi
                x={o.kart.x + 12}
                y={o.baslikY}
                metin={o.baslik}
                maksGenislik={o.icMaxW}
                boyut={ZAMAN_BASLIK_BOYUT}
                satirYuksekligi={ZAMAN_BASLIK_BOYUT * 1.24}
                renk="#1e1e1e"
                hizala="start"
                dikeyHizala="ortali"
                konturKalinlik={0}
                kalin
                p={o.aciklama ? sinirla(icerikP * 1.35) : icerikP}
              />
            )}
            {icerikP > 0 && o.aciklama && (
              <CokSatirliYazi
                x={o.kart.x + 12}
                y={o.aciklamaY}
                metin={o.aciklama}
                maksGenislik={o.icMaxW}
                boyut={ZAMAN_ACIKLAMA_BOYUT}
                satirYuksekligi={ZAMAN_ACIKLAMA_BOYUT * 1.24}
                renk="#495057"
                hizala="start"
                dikeyHizala="ortali"
                konturKalinlik={0}
                p={o.baslik ? sinirla((icerikP - 0.25) * 1.4) : icerikP}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// --- 3. KARŞILAŞTIRMA / VERİ TABLOSU ---

const TABLO_BASLIK_BOYUT = 16;
const TABLO_HUCRE_BOYUT = 14.5;
const TABLO_NOT_BOYUT = 13;

type SatirPlan = {
  sira: number;
  y: number;
  h: number;
  hucreler: string[];
  kenarlikCizim: Drawable[];
  vurusSira: number;
  adim: number;
  toplam: number;
};

type VurguPlan = {
  sira: number;
  x: number;
  y: number;
  w: number;
  h: number;
  renk: string;
  notMetni: string;
  notSatirlar: string[];
  notY: number;
  cizim: Drawable;
  vurusSira: number;
  adim: number;
  toplam: number;
};

function tabloPlanla(aksiyonlar: TabloAksiyonu[], blokId: string, kutu: Blok["kutu"]) {
  const anaBaslik = metinTemizle(aksiyonlar.find((a) => metinTemizle(a.baslik))?.baslik);
  let hamBasliklar: string[] = [];
  for (const a of aksiyonlar) {
    if (a.basliklar?.length) {
      hamBasliklar = a.basliklar.map((b) => metinTemizle(b));
      break;
    }
  }

  let sutunRenkleri: string[] = [];
  for (const a of aksiyonlar) {
    if (a.sutunRenkleri?.length) sutunRenkleri = a.sutunRenkleri;
  }

  const hamSatirlar: { hucreler: string[]; vurusSira: number }[] = [];
  aksiyonlar.forEach((a, ai) => {
    for (const r of a.satirlar ?? []) {
      if (!Array.isArray(r) || r.length === 0) continue;
      const temiz = r.map((c) => metinTemizle(c));
      // Üst başlık satırı yanlışlıkla tekrar gönderildiyse atla
      if (
        hamBasliklar.length > 0 &&
        temiz.length === hamBasliklar.length &&
        temiz.every((c, idx) => etiketNormal(c) === etiketNormal(hamBasliklar[idx]))
      ) {
        continue;
      }
      hamSatirlar.push({ hucreler: temiz, vurusSira: ai });
    }
  });

  const sutunSayisi = Math.max(hamBasliklar.length, ...hamSatirlar.map((r) => r.hucreler.length), 0);
  if (sutunSayisi === 0) {
    return {
      anaBaslik,
      basliklar: [] as string[],
      sutunGenislikleri: [] as number[],
      sutunX: [] as number[],
      sutunDolgulari: [] as (string | undefined)[],
      tabloX: 0,
      tabloY: 0,
      tabloW: 100,
      baslikH: 0,
      baslikCizimler: [] as Drawable[],
      satirlar: [] as SatirPlan[],
      vurgular: [] as VurguPlan[],
      viewBox: "0 0 100 100",
    };
  }

  const basliklar = Array.from({ length: sutunSayisi }, (_, c) => hamBasliklar[c] ?? "");
  const normalizeSatirlar = hamSatirlar.map((r) => ({
    ...r,
    hucreler: Array.from({ length: sutunSayisi }, (_, c) => r.hucreler[c] ?? ""),
  }));

  // Sütun genişliklerini içerik ölçerek hesapla
  const minKelimeW = new Array<number>(sutunSayisi).fill(84);
  const dogalW = new Array<number>(sutunSayisi).fill(96);

  for (let c = 0; c < sutunSayisi; c++) {
    const b = basliklar[c];
    if (b) {
      dogalW[c] = Math.max(dogalW[c], Math.ceil(yaziGenisligi(b, TABLO_BASLIK_BOYUT) + 28));
      for (const k of b.split(/\s+/).filter(Boolean)) {
        minKelimeW[c] = Math.max(minKelimeW[c], Math.ceil(yaziGenisligi(k, TABLO_BASLIK_BOYUT) + 26));
      }
    }
    for (const r of normalizeSatirlar) {
      const m = r.hucreler[c];
      if (!m) continue;
      dogalW[c] = Math.max(dogalW[c], Math.ceil(yaziGenisligi(m, TABLO_HUCRE_BOYUT) + 28));
      for (const k of m.split(/\s+/).filter(Boolean)) {
        minKelimeW[c] = Math.max(minKelimeW[c], Math.ceil(yaziGenisligi(k, TABLO_HUCRE_BOYUT) + 24));
      }
    }
  }

  const hedefToplamW = aralikta(kutu.w - 32, 460, 920);
  const dogalToplam = dogalW.reduce((s, w) => s + w, 0);
  const minToplam = minKelimeW.reduce((s, w) => s + w, 0);

  let sutunGenislikleri: number[];
  if (minToplam >= hedefToplamW) {
    sutunGenislikleri = [...minKelimeW];
  } else if (dogalToplam <= hedefToplamW) {
    const ekPay = Math.min(sutunSayisi * 24, hedefToplamW - dogalToplam);
    sutunGenislikleri = dogalW.map((w) => Math.ceil(w + ekPay / sutunSayisi));
  } else {
    const esnekPay = dogalW.map((w, c) => Math.max(0, w - minKelimeW[c]));
    const toplamEsnek = Math.max(1, esnekPay.reduce((s, e) => s + e, 0));
    const dagitilacak = hedefToplamW - minToplam;
    sutunGenislikleri = minKelimeW.map((mw, c) => Math.floor(mw + (esnekPay[c] / toplamEsnek) * dagitilacak));
  }

  // Sarma sonrası en uzun gerçek satır genişliğini doğrula
  basliklar.forEach((b, c) => {
    const o = olculuSatirlar(b, sutunGenislikleri[c] - 24, TABLO_BASLIK_BOYUT);
    if (o.genislik + 24 > sutunGenislikleri[c]) sutunGenislikleri[c] = Math.ceil(o.genislik + 26);
  });

  normalizeSatirlar.forEach((r) => {
    r.hucreler.forEach((m, c) => {
      const o = olculuSatirlar(m, sutunGenislikleri[c] - 24, TABLO_HUCRE_BOYUT);
      if (o.genislik + 24 > sutunGenislikleri[c]) sutunGenislikleri[c] = Math.ceil(o.genislik + 26);
    });
  });

  // Son sütun genişlikleriyle nihai sarma
  const sonBaslikOlculeri = basliklar.map((b, c) => olculuSatirlar(b, sutunGenislikleri[c] - 24, TABLO_BASLIK_BOYUT));
  const sonHucreOlculeri = normalizeSatirlar.map((r) =>
    r.hucreler.map((m, c) => olculuSatirlar(m, sutunGenislikleri[c] - 24, TABLO_HUCRE_BOYUT)),
  );

  const tabloW = sutunGenislikleri.reduce((s, w) => s + w, 0);
  const tabloX = 20;
  const baslikPay = anaBaslik ? 46 : 16;
  const tabloY = baslikPay;

  const sutunX: number[] = [];
  let accX = tabloX;
  for (const w of sutunGenislikleri) {
    sutunX.push(accX);
    accX += w;
  }

  const sutunDolgulari = Array.from({ length: sutunSayisi }, (_, c) => {
    const r = sutunRenkleri[c];
    return r ? renkCoz(r, PASTEL_DOLGULAR[c % PASTEL_DOLGULAR.length]) : undefined;
  });

  const baslikVar = basliklar.some(Boolean);
  const maksBaslikSatir = Math.max(1, ...sonBaslikOlculeri.map((o) => o.satirlar.length));
  const baslikH = baslikVar ? Math.max(44, Math.ceil(maksBaslikSatir * (TABLO_BASLIK_BOYUT * 1.25) + 18)) : 0;

  const baslikCizimler: Drawable[] = [];
  if (baslikVar) {
    const bOpt = duzSekilSecenek("#343a40", undefined, 2.1, 0.12, tohum(`${blokId}-tb-hdr`));
    const r = 8;
    const x1 = tabloX + tabloW;
    const yb = tabloY + baslikH;
    baslikCizimler.push(
      gen.path(
        `M ${tabloX} ${yb} L ${tabloX} ${tabloY + r} Q ${tabloX} ${tabloY} ${tabloX + r} ${tabloY} L ${x1 - r} ${tabloY} Q ${x1} ${tabloY} ${x1} ${tabloY + r} L ${x1} ${yb} Z`,
        bOpt,
      ),
    );
    for (let c = 1; c < sutunSayisi; c++) {
      baslikCizimler.push(
        gen.line(sutunX[c], tabloY, sutunX[c], yb, duzSekilSecenek("#868e96", undefined, 1.3, 0.12, tohum(`${blokId}-thc-${c}`))),
      );
    }
  }

  // Vuruş adım sayıları (satırlar + vurgular)
  const hamVurgular: (TabloVurgusu & { vurusSira: number })[] = [];
  aksiyonlar.forEach((a, ai) => {
    for (const v of a.vurgular ?? []) hamVurgular.push({ ...v, vurusSira: ai });
  });

  const vurusToplamlari = aksiyonlar.map(() => 0);
  normalizeSatirlar.forEach((r) => vurusToplamlari[r.vurusSira]++);
  hamVurgular.forEach((v) => vurusToplamlari[v.vurusSira]++);
  const vurusSayaci = aksiyonlar.map(() => 0);

  let curY = tabloY + baslikH;
  const satirlar: SatirPlan[] = normalizeSatirlar.map((r, ri) => {
    const maksSatir = Math.max(1, ...sonHucreOlculeri[ri].map((o) => o.satirlar.length));
    const rh = Math.max(40, Math.ceil(maksSatir * (TABLO_HUCRE_BOYUT * 1.25) + 18));
    const y = curY;
    const yb = y + rh;
    const x1 = tabloX + tabloW;
    const kenarlikCizim: Drawable[] = [];
    const disOpt = duzSekilSecenek("#343a40", undefined, 2.0, 0.12, tohum(`${blokId}-sr-${ri}`));
    const icOpt = duzSekilSecenek("#ced4da", undefined, 1.25, 0.12, tohum(`${blokId}-si-${ri}`));

    if (ri === 0 && !baslikVar) {
      kenarlikCizim.push(gen.line(tabloX, y, x1, y, disOpt));
    }
    kenarlikCizim.push(gen.line(tabloX, y, tabloX, yb, disOpt));
    kenarlikCizim.push(gen.line(x1, y, x1, yb, disOpt));
    kenarlikCizim.push(
      gen.line(tabloX, yb, x1, yb, ri === normalizeSatirlar.length - 1 ? disOpt : icOpt),
    );
    for (let c = 1; c < sutunSayisi; c++) {
      kenarlikCizim.push(gen.line(sutunX[c], y, sutunX[c], yb, icOpt));
    }

    curY = yb;
    return {
      sira: ri,
      y,
      h: rh,
      hucreler: r.hucreler,
      kenarlikCizim,
      vurusSira: r.vurusSira,
      adim: vurusSayaci[r.vurusSira]++,
      toplam: vurusToplamlari[r.vurusSira],
    };
  });

  // Vurgular & alt notlar
  let notYCursor = curY + 20;
  const vurgular: VurguPlan[] = [];
  hamVurgular.forEach((v, vi) => {
    const satirGecerli = typeof v.satir === "number" && v.satir >= 0 && v.satir < satirlar.length;
    const sutunGecerli = typeof v.sutun === "number" && v.sutun >= 0 && v.sutun < sutunSayisi;
    if (!satirGecerli && !sutunGecerli) return;

    const x = sutunGecerli ? sutunX[v.sutun!] + 2 : tabloX + 2;
    const w = sutunGecerli ? sutunGenislikleri[v.sutun!] - 4 : tabloW - 4;
    const y = satirGecerli ? satirlar[v.satir!].y + 2 : tabloY + baslikH + 2;
    const h = satirGecerli
      ? satirlar[v.satir!].h - 4
      : Math.max(0, curY - (tabloY + baslikH) - 4);
    if (h <= 0 || w <= 0) return;

    const renk = renkCoz(v.renk, "#e03131");
    const cizim = gen.rectangle(x, y, w, h, duzSekilSecenek(renk, renk, 2.4, 0.12, tohum(`${blokId}-tv-${vi}`)));
    const notMetni = metinTemizle(v.not);
    const notOlcu = olculuSatirlar(notMetni, tabloW - 28, TABLO_NOT_BOYUT);
    const notY = notYCursor;
    if (notMetni) {
      notYCursor += Math.max(22, notOlcu.satirlar.length * (TABLO_NOT_BOYUT * 1.25) + 10);
    }

    vurgular.push({
      sira: vi,
      x,
      y,
      w,
      h,
      renk,
      notMetni,
      notSatirlar: notOlcu.satirlar,
      notY,
      cizim,
      vurusSira: v.vurusSira,
      adim: vurusSayaci[v.vurusSira]++,
      toplam: vurusToplamlari[v.vurusSira],
    });
  });

  const altSinirY = vurgular.some((v) => v.notMetni) ? notYCursor : curY + 6;
  const genelSinir: Sinir = {
    x0: tabloX - 4,
    y0: anaBaslik ? 4 : tabloY - 4,
    x1: tabloX + tabloW + 4,
    y1: Math.max(tabloY + baslikH + 10, altSinirY),
  };

  return {
    anaBaslik,
    basliklar,
    sutunGenislikleri,
    sutunX,
    sutunDolgulari,
    tabloX,
    tabloY,
    tabloW,
    baslikH,
    baslikCizimler,
    satirlar,
    vurgular,
    viewBox: viewBoxHesapla(genelSinir, kutu, 16),
  };
}

export function TabloBlok({
  parcalar,
  blokId,
  kutu,
}: {
  parcalar: Parca<TabloAksiyonu>[];
  blokId: string;
  kutu: Blok["kutu"];
}) {
  const kirpId = `tb${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const veriAnahtari = JSON.stringify(parcalar.map((x) => x.aksiyon));
  const duzen = useMemo(() => {
    const aksiyonlar = JSON.parse(veriAnahtari) as TabloAksiyonu[];
    return tabloPlanla(aksiyonlar, blokId, kutu);
  }, [veriAnahtari, blokId, kutu]);

  const ilkP = parcalar[0]?.p ?? 0;
  const ilkIcerikVar = duzen.satirlar.some((r) => r.vurusSira === 0) || duzen.vurgular.some((v) => v.vurusSira === 0);
  const baslikP = ilkIcerikVar ? sinirla(ilkP * 3.8) : ilkP;

  return (
    <svg viewBox={duzen.viewBox} preserveAspectRatio="xMidYMin meet" overflow="hidden">
      {duzen.anaBaslik && baslikP > 0 && (
        <Yazi
          x={duzen.tabloX + duzen.tabloW / 2}
          y={28}
          metin={duzen.anaBaslik}
          boyut={20}
          renk="#1971c2"
          hizala="middle"
          kalin
          p={baslikP}
        />
      )}

      {duzen.baslikH > 0 && baslikP > 0 && (
        <g>
          <defs>
            <clipPath id={kirpId}>
              <path
                d={`M ${duzen.tabloX} ${duzen.tabloY + duzen.baslikH} L ${duzen.tabloX} ${duzen.tabloY + 8} Q ${duzen.tabloX} ${duzen.tabloY} ${duzen.tabloX + 8} ${duzen.tabloY} L ${duzen.tabloX + duzen.tabloW - 8} ${duzen.tabloY} Q ${duzen.tabloX + duzen.tabloW} ${duzen.tabloY} ${duzen.tabloX + duzen.tabloW} ${duzen.tabloY + 8} L ${duzen.tabloX + duzen.tabloW} ${duzen.tabloY + duzen.baslikH} Z`}
              />
            </clipPath>
          </defs>
          <g clipPath={`url(#${kirpId})`} opacity={sinirla(baslikP * 1.6)}>
            <rect x={duzen.tabloX} y={duzen.tabloY} width={duzen.tabloW} height={duzen.baslikH} fill="#edf2ff" />
            {duzen.sutunDolgulari.map((dolgu, c) =>
              dolgu ? (
                <rect
                  key={`hc-${c}`}
                  x={duzen.sutunX[c]}
                  y={duzen.tabloY}
                  width={duzen.sutunGenislikleri[c]}
                  height={duzen.baslikH}
                  fill={dolgu}
                  fillOpacity={koyuRenkMi(dolgu) ? 0.2 : 0.44}
                />
              ) : null,
            )}
          </g>
          {duzen.baslikCizimler.map((cz, idx) => (
            <Kaba key={`hb-${idx}`} cizim={cz} p={sinirla(baslikP * 1.4)} kalem={idx === 0} />
          ))}
          {duzen.basliklar.map((metin, c) =>
            metin ? (
              <CokSatirliYazi
                key={`ht-${c}`}
                x={duzen.sutunX[c] + duzen.sutunGenislikleri[c] / 2}
                y={duzen.tabloY + duzen.baslikH / 2}
                metin={metin}
                maksGenislik={duzen.sutunGenislikleri[c] - 20}
                boyut={TABLO_BASLIK_BOYUT}
                satirYuksekligi={TABLO_BASLIK_BOYUT * 1.25}
                renk="#1864ab"
                hizala="middle"
                dikeyHizala="ortali"
                konturKalinlik={0}
                kalin
                p={sinirla((baslikP - 0.25) * 1.4)}
              />
            ) : null,
          )}
        </g>
      )}

      {duzen.satirlar.map((r) => {
        const hamP = parcalar[r.vurusSira]?.p ?? 0;
        const vurusP = r.vurusSira === 0 ? sinirla((hamP - 0.18) / 0.82) : hamP;
        const rp = vurusP >= 1 ? 1 : vurusP <= 0 ? 0 : parcaIlerlemesi(vurusP, r.adim, Math.max(1, r.toplam));
        if (rp <= 0) return null;

        const cizgiP = sinirla(rp * 1.8);
        const yaziP = sinirla((rp - 0.22) * 1.4);

        return (
          <g key={`row-${r.sira}`}>
            <g opacity={sinirla(rp * 1.6)}>
              {r.sira % 2 === 1 && (
                <rect x={duzen.tabloX} y={r.y} width={duzen.tabloW} height={r.h} fill="#f8f9fa" />
              )}
              {duzen.sutunDolgulari.map((dolgu, c) =>
                dolgu ? (
                  <rect
                    key={`rc-${r.sira}-${c}`}
                    x={duzen.sutunX[c]}
                    y={r.y}
                    width={duzen.sutunGenislikleri[c]}
                    height={r.h}
                    fill={dolgu}
                    fillOpacity={koyuRenkMi(dolgu) ? 0.13 : 0.34}
                  />
                ) : null,
              )}
            </g>
            {r.kenarlikCizim.map((cz, ci) => (
              <Kaba key={`rb-${r.sira}-${ci}`} cizim={cz} p={cizgiP} kalem={ci === 0} />
            ))}
            {yaziP > 0 &&
              r.hucreler.map((hucre, c) =>
                hucre ? (
                  <CokSatirliYazi
                    key={`rt-${r.sira}-${c}`}
                    x={c === 0 ? duzen.sutunX[c] + 12 : duzen.sutunX[c] + duzen.sutunGenislikleri[c] / 2}
                    y={r.y + r.h / 2}
                    metin={hucre}
                    maksGenislik={duzen.sutunGenislikleri[c] - 20}
                    boyut={TABLO_HUCRE_BOYUT}
                    satirYuksekligi={TABLO_HUCRE_BOYUT * 1.25}
                    renk="#1e1e1e"
                    hizala={c === 0 ? "start" : "middle"}
                    dikeyHizala="ortali"
                    konturKalinlik={0}
                    kalin={c === 0}
                    p={parcaIlerlemesi(yaziP, c, r.hucreler.length)}
                  />
                ) : null,
              )}
          </g>
        );
      })}

      {duzen.vurgular.map((v) => {
        const hamP = parcalar[v.vurusSira]?.p ?? 0;
        const vurusP = v.vurusSira === 0 ? sinirla((hamP - 0.18) / 0.82) : hamP;
        const vp = vurusP >= 1 ? 1 : vurusP <= 0 ? 0 : parcaIlerlemesi(vurusP, v.adim, Math.max(1, v.toplam));
        if (vp <= 0) return null;

        return (
          <Fragment key={`tv-${v.sira}`}>
            <Kaba cizim={v.cizim} p={sinirla(vp * 1.4)} dolguOpaklik={0.14} />
            {v.notMetni && (
              <g>
                <circle cx={duzen.tabloX + 8} cy={v.notY + 8} r={4 * sinirla(vp * 2)} fill={v.renk} />
                <CokSatirliYazi
                  x={duzen.tabloX + 18}
                  y={v.notY + 12}
                  metin={v.notMetni}
                  maksGenislik={duzen.tabloW - 24}
                  boyut={TABLO_NOT_BOYUT}
                  satirYuksekligi={TABLO_NOT_BOYUT * 1.25}
                  renk={v.renk}
                  hizala="start"
                  dikeyHizala="ust"
                  konturKalinlik={0}
                  kalin
                  p={sinirla((vp - 0.3) * 1.5)}
                />
              </g>
            )}
          </Fragment>
        );
      })}
    </svg>
  );
}
