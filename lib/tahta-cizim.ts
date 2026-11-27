"use client";

import { CaptureUpdateAction, convertToExcalidrawElements, exportToBlob } from "@excalidraw/excalidraw";
import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import type { ExcalidrawElement, FileId } from "@excalidraw/excalidraw/element/types";
import type { BinaryFileData, DataURL, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { latexGorseli, svgGorseli, type HazirGorsel } from "./gorsel-donustur";
import type { Nokta, TahtaElemani } from "./types";

type Kutu = { x: number; y: number; w: number; h: number };
type Konum = { x: number; y: number };

export type SahneBaglami = {
  x0: number;
  y0: number;
  kutular: Map<string, Kutu>;
  idHaritasi: Map<string, string[]>;
};

const SAHNE_ARALIGI = 110;
const BASLIK_YUKSEKLIGI = 64;
const RENK_DESENI = /^#[0-9a-f]{3,8}$/i;
const VIRGIL = 1;

export const PALET = {
  baslik: "#1c3d8f",
  formul: "#7048e8",
  vurgu: "#e03131",
  sonuc: "#2f9e44",
  normal: "#1e1e1e",
} as const;

const sinirla = (v: unknown, min: number, max: number, varsayilan: number) => {
  const n = typeof v === "number" && Number.isFinite(v) ? v : varsayilan;
  return Math.max(min, Math.min(max, n));
};

export function renk(v: unknown, varsayilan: string = PALET.normal): string {
  if (typeof v !== "string") return varsayilan;
  const ad = v.trim().toLowerCase();
  if (ad in PALET) return PALET[ad as keyof typeof PALET];
  return RENK_DESENI.test(ad) ? ad : varsayilan;
}

function kenarNoktasi(kaynak: Kutu, hedef: Kutu) {
  const kx = kaynak.x + kaynak.w / 2;
  const ky = kaynak.y + kaynak.h / 2;
  const dx = hedef.x + hedef.w / 2 - kx;
  const dy = hedef.y + hedef.h / 2 - ky;
  if (Math.abs(dx) * kaynak.h > Math.abs(dy) * kaynak.w) {
    return { x: dx > 0 ? kaynak.x + kaynak.w : kaynak.x, y: ky };
  }
  return { x: kx, y: dy > 0 ? kaynak.y + kaynak.h : kaynak.y };
}

export function sahneAlaniAc(api: ExcalidrawImperativeAPI, baslik?: string, xKaydirma = 0): SahneBaglami {
  const mevcut = api.getSceneElements();
  let x0 = 0;
  let y0 = 0;
  if (mevcut.length > 0) {
    x0 = Math.min(...mevcut.map((e) => e.x));
    y0 = Math.max(...mevcut.map((e) => e.y + e.height)) + SAHNE_ARALIGI;
  }
  return { x0: x0 + xKaydirma, y0: baslik ? y0 + BASLIK_YUKSEKLIGI : y0, kutular: new Map(), idHaritasi: new Map() };
}

export function baslikIskeleti(baglam: SahneBaglami, baslik: string): ExcalidrawElementSkeleton {
  return {
    type: "text",
    x: baglam.x0,
    y: baglam.y0 - BASLIK_YUKSEKLIGI,
    text: baslik,
    fontSize: 30,
    fontFamily: VIRGIL,
    strokeColor: PALET.baslik,
  };
}

type HazirVurus = {
  iskelet: ExcalidrawElementSkeleton[];
  dosyalar: BinaryFileData[];
  aiIdleri: (string | undefined)[];
};

const dosyaKimligi = () => `gorsel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}` as FileId;

export function gorseliDosyayaCevir(g: HazirGorsel): BinaryFileData {
  return {
    id: dosyaKimligi(),
    dataURL: g.dataURL as DataURL,
    mimeType: g.mimeType,
    created: Date.now(),
  };
}

async function gorselHazirla(e: TahtaElemani): Promise<HazirGorsel | null> {
  try {
    if (e.tip === "latex" && e.latex) return await latexGorseli(e.latex, sinirla(e.boyut, 16, 72, 32), renk(e.renk, PALET.formul));
    if (e.tip === "svg" && e.svg) return await svgGorseli(e.svg, e.genislik);
  } catch (hata) {
    console.error("[tahta] görsel hazırlanamadı", hata);
  }
  return null;
}

function noktalarGoreli(noktalar: Nokta[], baglam: SahneBaglami) {
  const mutlak = noktalar.map(([x, y]) => [baglam.x0 + sinirla(x, -200, 1600, 0), baglam.y0 + sinirla(y, -200, 1400, 0)] as const);
  const [bx, by] = mutlak[0];
  const goreli = mutlak.map(([x, y]) => [x - bx, y - by] as [number, number]);
  const xs = goreli.map((p) => p[0]);
  const ys = goreli.map((p) => p[1]);
  return {
    x: bx,
    y: by,
    points: goreli,
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

export async function vurusuHazirla(elemanlar: TahtaElemani[], baglam: SahneBaglami): Promise<HazirVurus> {
  const sirali: { sira: number; s: ExcalidrawElementSkeleton; aiId?: string }[] = [];
  const dosyalar: BinaryFileData[] = [];
  let sira = 0;
  const konum = (e: TahtaElemani): Konum => ({
    x: baglam.x0 + sinirla(e.x, -100, 1400, 0),
    y: baglam.y0 + sinirla(e.y, -100, 1200, 0),
  });
  const ekle = (s: ExcalidrawElementSkeleton, aiId?: string, kutu?: Kutu) => {
    sirali.push({ sira, s, aiId });
    if (aiId && kutu) baglam.kutular.set(aiId, kutu);
  };

  const gorseller = await Promise.all(elemanlar.map((e) => (e.tip === "svg" || e.tip === "latex" ? gorselHazirla(e) : null)));

  for (const [i, e] of elemanlar.entries()) {
    sira = i;
    const kalinlik = sinirla(e.kalinlik, 1, 6, 2);
    if (e.tip === "kutu" || e.tip === "ellipse") {
      const { x, y } = konum(e);
      const w = sinirla(e.genislik, 30, 700, e.tip === "kutu" ? 240 : 140);
      const h = sinirla(e.yukseklik, 30, 500, e.tip === "kutu" ? 80 : 140);
      ekle(
        {
          type: e.tip === "kutu" ? "rectangle" : "ellipse",
          x,
          y,
          width: w,
          height: h,
          strokeColor: renk(e.renk),
          backgroundColor: e.arkaPlan ? renk(e.arkaPlan, "transparent") : e.tip === "kutu" ? "#e7f5ff" : "transparent",
          fillStyle: e.tip === "kutu" ? "solid" : "hachure",
          strokeWidth: kalinlik,
          roughness: 1,
          roundness: e.tip === "kutu" ? { type: 3 } : null,
          label: e.metin ? { text: e.metin, fontSize: 18, fontFamily: VIRGIL } : undefined,
        },
        e.id,
        { x, y, w, h },
      );
    } else if (e.tip === "metin" && e.metin) {
      const { x, y } = konum(e);
      const boyut = sinirla(e.boyut, 12, 56, 22);
      ekle(
        { type: "text", x, y, text: e.metin, fontSize: boyut, fontFamily: VIRGIL, strokeColor: renk(e.renk) },
        e.id,
        { x, y, w: e.metin.length * boyut * 0.55, h: boyut * 1.3 },
      );
    } else if (e.tip === "vurgu") {
      const { x, y } = konum(e);
      ekle({
        type: "ellipse",
        x,
        y,
        width: sinirla(e.genislik, 40, 800, 220),
        height: sinirla(e.yukseklik, 30, 500, 80),
        strokeColor: renk(e.renk, PALET.vurgu),
        backgroundColor: "transparent",
        strokeWidth: 2,
      }, e.id);
    } else if ((e.tip === "line" || e.tip === "freedraw") && e.noktalar) {
      const noktalar = e.kapali && e.tip === "line" ? [...e.noktalar, e.noktalar[0]] : e.noktalar;
      const g = noktalarGoreli(noktalar, baglam);
      ekle(
        {
          type: "line",
          ...g,
          strokeColor: renk(e.renk),
          strokeWidth: kalinlik,
          roughness: e.tip === "freedraw" ? 0 : 1,
          roundness: e.egri ? { type: 2 } : null,
          customData: e.tip === "freedraw" ? { serbestCizim: true } : undefined,
        } as ExcalidrawElementSkeleton,
        e.id,
        { x: g.x, y: g.y, w: g.width, h: g.height },
      );
    }
  }

  for (const [i, e] of elemanlar.entries()) {
    if (e.tip === "svg" || e.tip === "latex") {
      sira = i;
      const g = gorseller[i];
      if (!g) {
        if (e.tip === "latex" && e.latex) {
          const { x, y } = konum(e);
          ekle({ type: "text", x, y, text: e.latex, fontSize: 24, fontFamily: VIRGIL, strokeColor: renk(e.renk, PALET.formul) }, e.id);
        }
        continue;
      }
      const dosya = gorseliDosyayaCevir(g);
      dosyalar.push(dosya);
      const { x, y } = konum(e);
      const w = g.genislik;
      ekle(
        { type: "image", x, y, width: w, height: g.yukseklik, fileId: dosya.id, status: "saved", scale: [1, 1] },
        e.id,
        { x, y, w, h: g.yukseklik },
      );
    }
  }

  for (const [i, e] of elemanlar.entries()) {
    if (e.tip !== "ok" && e.tip !== "arrow") continue;
    sira = i;
    let noktalar: [number, number][] | undefined;
    const kaynak = e.kaynak ? baglam.kutular.get(e.kaynak) : undefined;
    const hedef = e.hedef ? baglam.kutular.get(e.hedef) : undefined;
    if (kaynak && hedef) {
      const b = kenarNoktasi(kaynak, hedef);
      const s = kenarNoktasi(hedef, kaynak);
      if (e.egri) {
        const ox = (b.x + s.x) / 2 - (s.y - b.y) * 0.2;
        const oy = (b.y + s.y) / 2 + (s.x - b.x) * 0.2;
        noktalar = [[b.x, b.y], [ox, oy], [s.x, s.y]];
      } else {
        noktalar = [[b.x, b.y], [s.x, s.y]];
      }
    } else if (e.noktalar) {
      noktalar = e.noktalar.map(([x, y]) => [baglam.x0 + sinirla(x, -200, 1600, 0), baglam.y0 + sinirla(y, -200, 1400, 0)]);
    } else if (typeof e.x === "number" && typeof e.y === "number") {
      const b = konum(e);
      noktalar = [[b.x, b.y], [b.x + sinirla(e.genislik, -800, 800, 120), b.y + sinirla(e.yukseklik, -600, 600, 0)]];
    }
    if (!noktalar || noktalar.length < 2) continue;
    const [bx, by] = noktalar[0];
    const points = noktalar.map(([x, y]) => [x - bx, y - by] as [number, number]);
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    ekle(
      {
        type: "arrow",
        x: bx,
        y: by,
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
        points: points as unknown as never,
        strokeColor: renk(e.renk),
        strokeWidth: sinirla(e.kalinlik, 1, 6, 2),
        roundness: e.egri || points.length > 2 ? { type: 2 } : null,
        endArrowhead: "arrow",
        label: e.metin ? { text: e.metin, fontSize: 16, fontFamily: VIRGIL } : undefined,
      } as ExcalidrawElementSkeleton,
      e.id,
    );
  }

  sirali.sort((a, b) => a.sira - b.sira);
  return { iskelet: sirali.map((x) => x.s), dosyalar, aiIdleri: sirali.map((x) => x.aiId) };
}

export function iskeletiDonustur(hazir: HazirVurus, baglam: SahneBaglami): ExcalidrawElement[] {
  const sonuc: ExcalidrawElement[] = [];
  hazir.iskelet.forEach((s, i) => {
    const donusen = convertToExcalidrawElements([s], { regenerateIds: true }) as ExcalidrawElement[];
    const aiId = hazir.aiIdleri[i];
    const islenmis = donusen.map((el) =>
      el.type === "line" && el.customData?.serbestCizim
        ? ({ ...el, type: "freedraw", pressures: [], simulatePressure: true, lastCommittedPoint: null } as unknown as ExcalidrawElement)
        : el,
    );
    if (aiId) baglam.idHaritasi.set(aiId, islenmis.map((el) => el.id));
    sonuc.push(...islenmis);
  });
  return sonuc;
}

// ---------- Kademeli el çizimi animasyonu ----------

type PlanParcasi = { eleman: ExcalidrawElement; bas: number; son: number };

export type CizimPlani = {
  parcalar: PlanParcasi[];
  idler: Set<string>;
};

function yolUzunlugu(points: readonly (readonly [number, number])[]) {
  let t = 0;
  for (let i = 1; i < points.length; i++) t += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return t;
}

function maliyet(el: ExcalidrawElement) {
  if (el.type === "line" || el.type === "arrow" || el.type === "freedraw") {
    return 0.25 + yolUzunlugu(el.points as unknown as [number, number][]) / 320;
  }
  if (el.type === "text") return el.containerId ? 0.25 : 0.2 + el.text.length / 22;
  if (el.type === "image") return 0.9;
  return 0.6 + (el.width + el.height) / 900;
}

export function cizimPlaniOlustur(elemanlar: ExcalidrawElement[]): CizimPlani {
  const maliyetler = elemanlar.map(maliyet);
  const toplam = maliyetler.reduce((a, b) => a + b, 0) || 1;
  let birikim = 0;
  const parcalar = elemanlar.map((eleman, i) => {
    const bas = birikim / toplam;
    birikim += maliyetler[i];
    return { eleman, bas, son: birikim / toplam };
  });
  return { parcalar, idler: new Set(elemanlar.map((e) => e.id)) };
}

const yerel = (p: number, parca: PlanParcasi) =>
  parca.son <= parca.bas ? (p >= parca.son ? 1 : 0) : Math.max(0, Math.min(1, (p - parca.bas) / (parca.son - parca.bas)));

function yolUzerindeNokta(points: readonly (readonly [number, number])[], t: number) {
  const uzunluk = yolUzunlugu(points);
  if (uzunluk === 0 || points.length < 2) return { kesit: points.slice(0, 1) as [number, number][], uc: points[0] };
  const hedef = uzunluk * t;
  let gidilen = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const parca = Math.hypot(bx - ax, by - ay);
    if (gidilen + parca >= hedef) {
      const k = parca === 0 ? 0 : (hedef - gidilen) / parca;
      const uc: [number, number] = [ax + (bx - ax) * k, ay + (by - ay) * k];
      return { kesit: [...(points.slice(0, i) as [number, number][]), uc], uc };
    }
    gidilen += parca;
  }
  return { kesit: points as [number, number][], uc: points[points.length - 1] };
}

function surumArttir<T extends ExcalidrawElement>(el: T, degisiklik: Partial<T>): T {
  return {
    ...el,
    ...degisiklik,
    version: el.version + 1,
    versionNonce: Math.floor(Math.random() * 2 ** 31),
    updated: Date.now(),
  };
}

function kismiEleman(el: ExcalidrawElement, t: number): { eleman: ExcalidrawElement; uc: Konum } {
  if (t >= 1) {
    return { eleman: surumArttir(el, {}), uc: { x: el.x + el.width, y: el.y + el.height } };
  }
  if (el.type === "line" || el.type === "arrow" || el.type === "freedraw") {
    const { kesit, uc } = yolUzerindeNokta(el.points as unknown as [number, number][], t);
    const noktalar = kesit.length >= 2 ? kesit : [kesit[0], kesit[0]];
    const degisiklik: Record<string, unknown> = { points: noktalar };
    if (el.type === "arrow") degisiklik.endArrowhead = null;
    if (el.type === "freedraw") degisiklik.pressures = [];
    return {
      eleman: surumArttir(el, degisiklik as Partial<ExcalidrawElement>),
      uc: { x: el.x + uc[0], y: el.y + uc[1] },
    };
  }
  if (el.type === "text") {
    if (el.containerId) {
      return { eleman: surumArttir(el, { opacity: Math.round(100 * t) }), uc: { x: el.x + el.width * t, y: el.y + el.height } };
    }
    const kac = Math.max(1, Math.ceil(el.originalText.length * t));
    const parca = el.originalText.slice(0, kac);
    const satirlar = parca.split("\n");
    const sonSatir = satirlar[satirlar.length - 1];
    const tumSatirlar = el.originalText.split("\n").length;
    const enUzun = Math.max(...el.originalText.split("\n").map((s) => s.length), 1);
    return {
      eleman: surumArttir(el, { text: parca, originalText: el.originalText }),
      uc: {
        x: el.x + (sonSatir.length / enUzun) * el.width,
        y: el.y + (satirlar.length / tumSatirlar) * el.height,
      },
    };
  }
  if (el.type === "ellipse") {
    const aci = -Math.PI / 2 + t * Math.PI * 2;
    return {
      eleman: surumArttir(el, { opacity: Math.round(20 + 80 * t) }),
      uc: { x: el.x + el.width / 2 + (Math.cos(aci) * el.width) / 2, y: el.y + el.height / 2 + (Math.sin(aci) * el.height) / 2 },
    };
  }
  if (el.type === "rectangle" || el.type === "diamond") {
    const cevre = 2 * (el.width + el.height);
    let d = cevre * t;
    let ux = el.x;
    let uy = el.y;
    if (d <= el.width) ux += d;
    else if ((d -= el.width) <= el.height) {
      ux += el.width;
      uy += d;
    } else if ((d -= el.height) <= el.width) {
      ux += el.width - d;
      uy += el.height;
    } else {
      d -= el.width;
      uy += el.height - d;
    }
    return { eleman: surumArttir(el, { opacity: Math.round(20 + 80 * t) }), uc: { x: ux, y: uy } };
  }
  return {
    eleman: surumArttir(el, { opacity: Math.round(100 * t) }),
    uc: { x: el.x + el.width * t, y: el.y + el.height * t },
  };
}

export function planiUygula(api: ExcalidrawImperativeAPI, plan: CizimPlani, p: number): Konum | null {
  const mevcut = api.getSceneElements();
  const kismi = new Map<string, ExcalidrawElement>();
  let uc: Konum | null = null;
  for (const parca of plan.parcalar) {
    const t = yerel(p, parca);
    if (t <= 0) continue;
    const sonuc = kismiEleman(parca.eleman, t);
    kismi.set(parca.eleman.id, sonuc.eleman);
    if (t < 1 || !uc) uc = sonuc.uc;
    if (t < 1) break;
  }
  const yeni: ExcalidrawElement[] = [];
  const gorulen = new Set<string>();
  for (const el of mevcut) {
    if (plan.idler.has(el.id)) {
      gorulen.add(el.id);
      const k = kismi.get(el.id);
      if (k) yeni.push(k);
    } else {
      yeni.push(el);
    }
  }
  for (const parca of plan.parcalar) {
    const k = kismi.get(parca.eleman.id);
    if (k && !gorulen.has(parca.eleman.id)) yeni.push(k);
  }
  api.updateScene({ elements: yeni, captureUpdate: p >= 1 ? CaptureUpdateAction.IMMEDIATELY : CaptureUpdateAction.NEVER });
  return p >= 1 ? null : uc;
}

export function elemanlarinSiniri(api: ExcalidrawImperativeAPI, idler: string[]) {
  const kume = new Set(idler);
  const hedef = api.getSceneElements().filter((e) => kume.has(e.id));
  if (!hedef.length) return null;
  const x1 = Math.min(...hedef.map((e) => e.x));
  const y1 = Math.min(...hedef.map((e) => e.y));
  const x2 = Math.max(...hedef.map((e) => e.x + e.width));
  const y2 = Math.max(...hedef.map((e) => e.y + e.height));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

export function alanaOdaklan(api: ExcalidrawImperativeAPI, elemanlar: readonly ExcalidrawElement[]) {
  if (elemanlar.length) {
    api.scrollToContent(elemanlar, { fitToViewport: true, viewportZoomFactor: 0.85, animate: true, duration: 450 });
  }
}

export function sahneAlaninaOdaklan(api: ExcalidrawImperativeAPI, baglam: SahneBaglami, ekler: readonly ExcalidrawElement[] = []) {
  const alan = {
    ...(ekler[0] ?? {}),
    id: "sahne-alani",
    type: "rectangle",
    x: baglam.x0,
    y: baglam.y0 - BASLIK_YUKSEKLIGI,
    width: 1000,
    height: 600 + BASLIK_YUKSEKLIGI,
    angle: 0,
    isDeleted: false,
  } as unknown as ExcalidrawElement;
  alanaOdaklan(api, [alan, ...ekler]);
}

export function sahneyeOdaklan(api: ExcalidrawImperativeAPI, idler: string[]) {
  const kume = new Set(idler);
  alanaOdaklan(api, api.getSceneElements().filter((e) => kume.has(e.id)));
}

export function fotografiYerlestir(api: ExcalidrawImperativeAPI, gorsel: HazirGorsel, genislik = 420) {
  const baglam = sahneAlaniAc(api, "Soru");
  const dosya = gorseliDosyayaCevir(gorsel);
  api.addFiles([dosya]);
  const h = (genislik / gorsel.genislik) * gorsel.yukseklik;
  const yeni = convertToExcalidrawElements(
    [
      baslikIskeleti(baglam, "Soru fotoğrafı"),
      { type: "image", x: baglam.x0, y: baglam.y0, width: genislik, height: h, fileId: dosya.id, status: "saved", scale: [1, 1] },
    ],
    { regenerateIds: true },
  );
  api.updateScene({ elements: [...api.getSceneElements(), ...yeni], captureUpdate: CaptureUpdateAction.IMMEDIATELY });
  alanaOdaklan(api, yeni);
  return { baglam: { ...baglam, x0: baglam.x0 + genislik + 60 }, yukseklik: h };
}

export async function tahtaGorseliAl(api: ExcalidrawImperativeAPI): Promise<string | null> {
  const elemanlar = api.getSceneElements();
  if (elemanlar.length === 0) return null;
  const blob = await exportToBlob({
    elements: elemanlar,
    appState: { ...api.getAppState(), exportWithDarkMode: false, exportBackground: true },
    files: api.getFiles(),
    mimeType: "image/png",
    exportPadding: 24,
    maxWidthOrHeight: 2000,
  });
  return new Promise((resolve, reject) => {
    const okuyucu = new FileReader();
    okuyucu.onload = () => resolve(String(okuyucu.result).split(",")[1] ?? null);
    okuyucu.onerror = () => reject(okuyucu.error);
    okuyucu.readAsDataURL(blob);
  });
}
