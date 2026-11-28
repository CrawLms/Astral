"use client";

import { CaptureUpdateAction, exportToCanvas, getCommonBounds } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI, NormalizedZoomValue } from "@excalidraw/excalidraw/types";
import type { GorselTipi, Sahne } from "@/lib/types";

export const ALAN_W = 1000;
export const ALAN_H = 640;
export const ICERIK_Y = 76;
export const ICERIK_H = 550;
const ARALIK = 120;
export const alanY = (sira: number) => sira * (ALAN_H + ARALIK);

const RENKLER: Record<string, string> = {
  baslik: "#1971c2",
  formul: "#7048e8",
  vurgu: "#e03131",
  sonuc: "#2f9e44",
  normal: "#1e1e1e",
};

export function renkCoz(r: string | undefined, varsayilan = "#1e1e1e") {
  if (!r) return varsayilan;
  if (RENKLER[r]) return RENKLER[r];
  return /^(#[0-9a-f]{3,8}|[a-z]{3,20}|rgba?\([\d\s.,%]+\))$/i.test(r) ? r : varsayilan;
}

export type Kutu = { x: number; y: number; w: number; h: number };
export type Blok = { id: string; tip: GorselTipi; kutu: Kutu };

export const FOTO_BLOK = "__foto";

export const SAHNE_UST_BOSLUK = 10;

export function yerlesim(sahne: Sahne, { topInset = SAHNE_UST_BOSLUK }: { topInset?: number } = {}): Map<string, Blok> {
  const icerikY = ICERIK_Y + topInset;
  const icerikH = ICERIK_H - topInset;
  const sirali: { id: string; tip: GorselTipi }[] = [];
  if (sahne.fotograf) sirali.push({ id: FOTO_BLOK, tip: "fotograf" });
  for (const v of sahne.vuruslar) {
    for (const a of v.aksiyonlar) {
      if (a.tip !== "vurgula" && !sirali.some((b) => b.id === a.gorsel)) sirali.push({ id: a.gorsel, tip: a.tip });
    }
  }
  const buyuk = sirali.filter((b) => b.tip !== "formul_ve_not");
  const kucuk = sirali.filter((b) => b.tip === "formul_ve_not");
  const G = 24;
  const solW = buyuk.length && kucuk.length ? 620 : ALAN_W;
  const sonuc = new Map<string, Blok>();

  const sutun = buyuk.length <= 1 ? 1 : solW >= ALAN_W ? 2 : buyuk.length > 2 ? 2 : 1;
  const satir = Math.ceil(buyuk.length / sutun) || 1;
  const bw = (solW - G * (sutun - 1)) / sutun;
  const bh = (icerikH - G * (satir - 1)) / satir;
  buyuk.forEach((b, i) => {
    const c = i % sutun;
    const r = Math.floor(i / sutun);
    sonuc.set(b.id, { ...b, kutu: { x: c * (bw + G), y: icerikY + r * (bh + G), w: bw, h: bh } });
  });

  const kx = buyuk.length ? solW + G : 0;
  const kw = ALAN_W - kx;
  const kh = (icerikH - G * (kucuk.length - 1)) / (kucuk.length || 1);
  kucuk.forEach((b, i) => sonuc.set(b.id, { ...b, kutu: { x: kx, y: icerikY + i * (kh + G), w: kw, h: kh } }));
  return sonuc;
}

export const UST_GUVENLI_BOSLUK = 96;
const ALT_GUVENLI_BOSLUK = 56;
const CERCEVE_PAYI = 14;

export function sahneyeOdaklan(
  api: ExcalidrawImperativeAPI,
  sira: number,
  { topInset = UST_GUVENLI_BOSLUK, bottomInset = ALT_GUVENLI_BOSLUK }: { topInset?: number; bottomInset?: number } = {},
) {
  const st = api.getAppState();
  if (!st.width || !st.height) return;
  const ust = Math.min(topInset, st.height * 0.25);
  const kullanilabilirH = Math.max(120, st.height - ust - bottomInset);
  const sahneH = ALAN_H + CERCEVE_PAYI * 2;
  const z = Math.max(0.25, Math.min(1.4, st.width / (ALAN_W + 60), kullanilabilirH / sahneH));
  const ekranUst = ust + (kullanilabilirH - sahneH * z) / 2;
  api.updateScene({
    appState: {
      zoom: { value: z as NormalizedZoomValue },
      scrollX: (st.width / z - ALAN_W) / 2,
      scrollY: ekranUst / z + CERCEVE_PAYI - alanY(sira),
    },
    captureUpdate: CaptureUpdateAction.NEVER,
  });
}

function resimYukle(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const r = new Image();
    r.crossOrigin = "anonymous";
    r.onload = () => resolve(r);
    r.onerror = () => reject(new Error("Öğretmen katmanı görüntüye çevrilemedi"));
    r.src = src;
  });
}

const OLCEK = 2;

export async function birlesikGorselAl(api: ExcalidrawImperativeAPI, katman: SVGSVGElement | null): Promise<string | null> {
  const st = api.getAppState();
  const z = st.zoom.value;
  const w = st.width;
  const h = st.height;
  const rx = -st.scrollX;
  const ry = -st.scrollY;
  const elemanlar = api.getSceneElements().filter((e) => !e.isDeleted);
  const ogretmenVar = Boolean(katman?.querySelector("[data-blok]"));
  if (!elemanlar.length && !ogretmenVar) return null;

  const tuval = document.createElement("canvas");
  tuval.width = Math.ceil(w * OLCEK);
  tuval.height = Math.ceil(h * OLCEK);
  const ctx = tuval.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, tuval.width, tuval.height);

  if (katman && ogretmenVar) {
    const kopya = katman.cloneNode(true) as SVGSVGElement;
    kopya.removeAttribute("style");
    kopya.removeAttribute("class");
    kopya.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    kopya.setAttribute("viewBox", `${rx} ${ry} ${w / z} ${h / z}`);
    kopya.setAttribute("width", String(tuval.width));
    kopya.setAttribute("height", String(tuval.height));
    const metin = new XMLSerializer().serializeToString(kopya);
    try {
      const resim = await resimYukle(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(metin)}`);
      ctx.drawImage(resim, 0, 0, tuval.width, tuval.height);
    } catch (hata) {
      console.error("[tahta] Öğretmen katmanı aktarılamadı:", hata);
    }
  }

  if (elemanlar.length) {
    const [minX, minY] = getCommonBounds(elemanlar);
    const ust = await exportToCanvas({
      elements: elemanlar,
      appState: { ...st, exportBackground: false, exportWithDarkMode: false },
      files: api.getFiles(),
      exportPadding: 0,
      getDimensions: (ew: number, eh: number) => ({ width: ew * z * OLCEK, height: eh * z * OLCEK, scale: z * OLCEK }),
    });
    ctx.drawImage(ust, (minX - rx) * z * OLCEK, (minY - ry) * z * OLCEK);
  }
  return tuval.toDataURL("image/png");
}

export type IlerlemeDeposu = {
  al: () => number;
  ayarla: (p: number) => void;
  abone: (dinleyici: () => void) => () => void;
};

export function ilerlemeDeposuOlustur(): IlerlemeDeposu {
  let deger = 0;
  const dinleyiciler = new Set<() => void>();
  return {
    al: () => deger,
    ayarla: (p) => {
      if (p === deger) return;
      deger = p;
      dinleyiciler.forEach((d) => d());
    },
    abone: (d) => {
      dinleyiciler.add(d);
      return () => dinleyiciler.delete(d);
    },
  };
}
