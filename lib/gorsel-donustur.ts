"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { latexKacisOnar } from "@/lib/metin-temizle";

export type HazirGorsel = {
  dataURL: string;
  mimeType: "image/png" | "image/svg+xml" | "image/jpeg" | "image/webp" | "image/gif";
  genislik: number;
  yukseklik: number;
};

const OLCEK = 2;
let katexCssSozu: Promise<string> | null = null;

function blobuDataUrlYap(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const okuyucu = new FileReader();
    okuyucu.onload = () => resolve(String(okuyucu.result));
    okuyucu.onerror = () => reject(okuyucu.error);
    okuyucu.readAsDataURL(blob);
  });
}

function gomuluKatexCss(): Promise<string> {
  katexCssSozu ??= (async () => {
    const css = await fetch("/katex/katex.min.css").then((r) => r.text());
    const fontlar = [...new Set([...css.matchAll(/url\(fonts\/([\w-]+)\.woff2\)/g)].map((m) => m[1]))];
    const veriler = new Map<string, string>();
    await Promise.all(
      fontlar.map(async (ad) => {
        const blob = await fetch(`/katex/fonts/${ad}.woff2`).then((r) => r.blob());
        veriler.set(ad, await blobuDataUrlYap(blob));
      }),
    );
    return css.replace(/src:url\(fonts\/([\w-]+)\.woff2\)[^;}]*/g, (_, ad: string) =>
      veriler.has(ad) ? `src:url(${veriler.get(ad)}) format("woff2")` : "",
    );
  })().catch((hata) => {
    katexCssSozu = null;
    throw hata;
  });
  return katexCssSozu;
}

function resimYukle(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const resim = new Image();
    resim.crossOrigin = "anonymous";
    resim.onload = () => resolve(resim);
    resim.onerror = () => reject(new Error("Görsel yüklenemedi"));
    resim.src = src;
  });
}

async function pngYap(svgDataUrl: string, genislik: number, yukseklik: number): Promise<string> {
  const resim = await resimYukle(svgDataUrl);
  await new Promise((r) => requestAnimationFrame(() => r(null)));
  const tuval = document.createElement("canvas");
  tuval.width = Math.ceil(genislik * OLCEK);
  tuval.height = Math.ceil(yukseklik * OLCEK);
  const ctx = tuval.getContext("2d");
  if (!ctx) throw new Error("Canvas desteklenmiyor");
  ctx.drawImage(resim, 0, 0, tuval.width, tuval.height);
  return tuval.toDataURL("image/png");
}

const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

async function svgdenGorsel(svg: string, genislik: number, yukseklik: number): Promise<HazirGorsel> {
  const url = svgUrl(svg);
  try {
    return { dataURL: await pngYap(url, genislik, yukseklik), mimeType: "image/png", genislik, yukseklik };
  } catch {
    return { dataURL: url, mimeType: "image/svg+xml", genislik, yukseklik };
  }
}

export async function svgGorseli(hamSvg: string, istenenGenislik?: number): Promise<HazirGorsel | null> {
  const belge = new DOMParser().parseFromString(hamSvg, "image/svg+xml");
  const kok = belge.documentElement;
  if (kok.nodeName.toLowerCase() !== "svg" || belge.querySelector("parsererror")) return null;
  kok.querySelectorAll("script, foreignObject, image, use[href^='http']").forEach((n) => n.remove());
  kok.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const viewBox = kok.getAttribute("viewBox")?.split(/[\s,]+/).map(Number);
  let w = parseFloat(kok.getAttribute("width") ?? "") || (viewBox?.[2] ?? 0);
  let h = parseFloat(kok.getAttribute("height") ?? "") || (viewBox?.[3] ?? 0);
  if (!w || !h) {
    w = 400;
    h = 300;
  }
  if (!viewBox || viewBox.length !== 4 || viewBox.some((n) => !Number.isFinite(n))) {
    kok.setAttribute("viewBox", `0 0 ${w} ${h}`);
  }
  const hedefW = Math.max(80, Math.min(900, istenenGenislik ?? w));
  const hedefH = (hedefW / w) * h;
  kok.setAttribute("width", String(hedefW));
  kok.setAttribute("height", String(hedefH));
  return svgdenGorsel(new XMLSerializer().serializeToString(kok), hedefW, hedefH);
}

export async function latexGorseli(latex: string, boyut = 32, renk = "#7048e8"): Promise<HazirGorsel | null> {
  let html: string;
  try {
    html = katex.renderToString(latexKacisOnar(latex), { throwOnError: true, displayMode: true, output: "html", strict: "ignore" });
  } catch {
    // Hatalı LaTeX'in kırmızı ham kaynağı tahtaya basılmasın; çağıran taraf düz yazıya döner.
    return null;
  }
  const kap = document.createElement("div");
  kap.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  kap.style.cssText = `position:fixed;left:-10000px;top:0;display:inline-block;padding:6px 10px;font-size:${boyut}px;color:${renk};background:transparent;white-space:nowrap;`;
  kap.innerHTML = html;
  const ic = kap.querySelector<HTMLElement>(".katex-display");
  if (ic) ic.style.margin = "0";
  document.body.appendChild(kap);
  try {
    await document.fonts?.ready;
    const kutu = kap.getBoundingClientRect();
    const w = Math.ceil(kutu.width);
    const h = Math.ceil(kutu.height);
    if (!w || !h) return null;
    kap.style.position = "static";
    kap.style.left = "0";
    const css = await gomuluKatexCss().catch(() => "");
    const xhtml = new XMLSerializer().serializeToString(kap);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><style>${css.replace(/</g, "\\3c ")}</style><foreignObject x="0" y="0" width="${w}" height="${h}">${xhtml}</foreignObject></svg>`;
    return await svgdenGorsel(svg, w, h);
  } finally {
    kap.remove();
  }
}

export async function dosyadanGorsel(dosya: File, maxKenar = 1600): Promise<HazirGorsel | null> {
  if (!dosya.type.startsWith("image/")) return null;
  const ham = await blobuDataUrlYap(dosya);
  const resim = await resimYukle(ham);
  const oran = Math.min(1, maxKenar / Math.max(resim.naturalWidth, resim.naturalHeight));
  const w = Math.round(resim.naturalWidth * oran);
  const h = Math.round(resim.naturalHeight * oran);
  const tuval = document.createElement("canvas");
  tuval.width = w;
  tuval.height = h;
  const ctx = tuval.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(resim, 0, 0, w, h);
  return { dataURL: tuval.toDataURL("image/jpeg", 0.88), mimeType: "image/jpeg", genislik: w, yukseklik: h };
}
