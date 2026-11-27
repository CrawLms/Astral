"use client";

import { convertToExcalidrawElements, exportToBlob } from "@excalidraw/excalidraw";
import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { TahtaElemani } from "./types";

type Kutu = { x: number; y: number; w: number; h: number };

const BASLIK_YUKSEKLIGI = 60;
const SAHNE_ARALIGI = 110;
const RENK_DESENI = /^#[0-9a-f]{3,8}$/i;

const sinirla = (v: unknown, min: number, max: number, varsayilan: number) => {
  const n = typeof v === "number" && Number.isFinite(v) ? v : varsayilan;
  return Math.max(min, Math.min(max, n));
};
const renk = (v: unknown, varsayilan: string) =>
  typeof v === "string" && RENK_DESENI.test(v) ? v : varsayilan;

function kenarNoktasi(kaynak: Kutu, hedef: Kutu) {
  const kx = kaynak.x + kaynak.w / 2;
  const ky = kaynak.y + kaynak.h / 2;
  const hx = hedef.x + hedef.w / 2;
  const hy = hedef.y + hedef.h / 2;
  const dx = hx - kx;
  const dy = hy - ky;
  if (Math.abs(dx) * kaynak.h > Math.abs(dy) * kaynak.w) {
    return { x: dx > 0 ? kaynak.x + kaynak.w : kaynak.x, y: ky };
  }
  return { x: kx, y: dy > 0 ? kaynak.y + kaynak.h : kaynak.y };
}

function iskeletOlustur(
  elemanlar: TahtaElemani[],
  baslangicX: number,
  baslangicY: number,
  baslik?: string,
): ExcalidrawElementSkeleton[] {
  const iskelet: ExcalidrawElementSkeleton[] = [];
  const kutular = new Map<string, Kutu>();
  const ustBosluk = baslik ? BASLIK_YUKSEKLIGI : 0;

  if (baslik) {
    iskelet.push({
      type: "text",
      x: baslangicX,
      y: baslangicY,
      text: baslik,
      fontSize: 28,
      strokeColor: "#1c3d8f",
    });
  }

  const konum = (e: TahtaElemani) => ({
    x: baslangicX + sinirla(e.x, 0, 1400, 0),
    y: baslangicY + ustBosluk + sinirla(e.y, 0, 1200, 0),
  });

  for (const e of elemanlar) {
    if (e.tip === "kutu") {
      const { x, y } = konum(e);
      const w = sinirla(e.genislik, 80, 600, 240);
      const h = sinirla(e.yukseklik, 40, 400, 80);
      if (e.id) kutular.set(e.id, { x, y, w, h });
      iskelet.push({
        type: "rectangle",
        x,
        y,
        width: w,
        height: h,
        strokeColor: renk(e.renk, "#1e1e1e"),
        backgroundColor: renk(e.arkaPlan, "#e7f5ff"),
        fillStyle: "solid",
        roundness: { type: 3 },
        label: e.metin ? { text: e.metin, fontSize: 18 } : undefined,
      });
    } else if (e.tip === "metin" && e.metin) {
      const { x, y } = konum(e);
      iskelet.push({
        type: "text",
        x,
        y,
        text: e.metin,
        fontSize: sinirla(e.boyut, 12, 48, 20),
        strokeColor: renk(e.renk, "#1e1e1e"),
      });
    } else if (e.tip === "vurgu") {
      const { x, y } = konum(e);
      iskelet.push({
        type: "ellipse",
        x,
        y,
        width: sinirla(e.genislik, 40, 800, 220),
        height: sinirla(e.yukseklik, 30, 500, 80),
        strokeColor: renk(e.renk, "#e03131"),
        backgroundColor: "transparent",
        strokeWidth: 2,
      });
    }
  }

  for (const e of elemanlar) {
    if (e.tip !== "ok") continue;
    let bas: { x: number; y: number } | undefined;
    let son: { x: number; y: number } | undefined;
    const kaynak = e.kaynak ? kutular.get(e.kaynak) : undefined;
    const hedef = e.hedef ? kutular.get(e.hedef) : undefined;
    if (kaynak && hedef) {
      bas = kenarNoktasi(kaynak, hedef);
      son = kenarNoktasi(hedef, kaynak);
    } else if (typeof e.x === "number" && typeof e.y === "number") {
      bas = konum(e);
      son = { x: bas.x + sinirla(e.genislik, -800, 800, 120), y: bas.y + sinirla(e.yukseklik, -600, 600, 0) };
    }
    if (!bas || !son) continue;
    iskelet.push({
      type: "arrow",
      x: bas.x,
      y: bas.y,
      width: Math.abs(son.x - bas.x),
      height: Math.abs(son.y - bas.y),
      points: [
        [0, 0],
        [son.x - bas.x, son.y - bas.y],
      ] as unknown as never,
      strokeColor: renk(e.renk, "#1e1e1e"),
      endArrowhead: "arrow",
      label: e.metin ? { text: e.metin, fontSize: 14 } : undefined,
    });
  }

  return iskelet;
}

export function tahtayaEkle(
  api: ExcalidrawImperativeAPI,
  elemanlar: TahtaElemani[],
  baslik?: string,
): string[] {
  const mevcut = api.getSceneElements();
  let baslangicX = 0;
  let baslangicY = 0;
  if (mevcut.length > 0) {
    baslangicX = Math.min(...mevcut.map((e) => e.x));
    baslangicY = Math.max(...mevcut.map((e) => e.y + e.height)) + SAHNE_ARALIGI;
  }

  const yeni = convertToExcalidrawElements(
    iskeletOlustur(elemanlar, baslangicX, baslangicY, baslik),
    { regenerateIds: true },
  );
  if (yeni.length === 0) return [];

  api.updateScene({ elements: [...mevcut, ...yeni] });
  api.scrollToContent(yeni, { fitToContent: true, animate: true, duration: 500 });
  return yeni.map((e) => e.id);
}

export function sahneyeOdaklan(api: ExcalidrawImperativeAPI, idler: string[]) {
  const kume = new Set(idler);
  const hedef = api.getSceneElements().filter((e) => kume.has(e.id));
  if (hedef.length) api.scrollToContent(hedef, { fitToContent: true, animate: true, duration: 400 });
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
