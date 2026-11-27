"use client";

import type { SayfaMetni } from "./types";

export async function pdfMetinleriniCikar(
  dosya: File,
  ilerleme: (okunan: number, toplam: number) => void,
): Promise<SayfaMetni[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const veri = new Uint8Array(await dosya.arrayBuffer());
  const yukleme = pdfjsLib.getDocument({ data: veri });
  const pdf = await yukleme.promise;
  const toplam = pdf.numPages;
  const sayfalar: SayfaMetni[] = [];

  try {
    for (let sayfaNo = 1; sayfaNo <= toplam; sayfaNo++) {
      const sayfa = await pdf.getPage(sayfaNo);
      const icerik = await sayfa.getTextContent();
      let metin = "";
      for (const oge of icerik.items) {
        if (!("str" in oge)) continue;
        metin += oge.str;
        metin += oge.hasEOL ? "\n" : " ";
      }
      sayfalar.push({
        sayfaNo,
        metin: metin.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim(),
      });
      sayfa.cleanup();
      ilerleme(sayfaNo, toplam);
    }
  } finally {
    await yukleme.destroy();
  }

  return sayfalar;
}

export function taranmisMi(sayfalar: SayfaMetni[]) {
  if (sayfalar.length === 0) return true;
  const bos = sayfalar.filter((s) => s.metin.replace(/\s/g, "").length < 20).length;
  return bos / sayfalar.length > 0.6;
}
