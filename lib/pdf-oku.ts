"use client";

import type { SayfaMetni } from "./types";

type Satir = { metin: string; boy: number };

const BASLIK_ORANI = 1.22;
const TEKRAR_ORANI = 0.4;
const OZEL_KUTU = /^(örnek|çözüm|tanım|uyarı|hatırlatma|dikkat|not|bilgi|etkinlik|kural|teorem|ispat|sonuç|özet|soru)\b/i;

const normal = (s: string) => s.toLocaleLowerCase("tr").replace(/\d+/g, "#").replace(/\s+/g, " ").trim();

function satirlaraAyir(items: unknown[]): Satir[] {
  const satirlar: Satir[] = [];
  let metin = "";
  let boy = 0;
  for (const oge of items as Array<{ str?: string; hasEOL?: boolean; height?: number; transform?: number[] }>) {
    if (typeof oge.str !== "string") continue;
    metin += oge.str;
    if (oge.str.trim()) boy = Math.max(boy, Math.abs(oge.height ?? oge.transform?.[3] ?? 0));
    if (oge.hasEOL) {
      satirlar.push({ metin: metin.replace(/[ \t]+/g, " ").trim(), boy });
      metin = "";
      boy = 0;
    } else {
      metin += " ";
    }
  }
  if (metin.trim()) satirlar.push({ metin: metin.replace(/[ \t]+/g, " ").trim(), boy });
  return satirlar.filter((s) => s.metin);
}

function govdeBoyu(satirlar: Satir[]) {
  const boylar = satirlar.flatMap((s) => (s.boy > 0 ? Array(Math.min(s.metin.length, 200)).fill(s.boy) : [])).sort((a, b) => a - b);
  return boylar.length ? boylar[Math.floor(boylar.length / 2)] : 0;
}

/**
 * Kitap sayfasını öğretmenin okuyacağı yapıya çevirir: tekrarlanan üst/alt bilgiyi ve sayfa numaralarını atar,
 * büyük puntolu satırları "## " başlık, örnek/tanım kutularını "▶ " ile işaretler.
 */
function sayfalariYapilandir(hamSayfalar: Satir[][]): string[] {
  const tumSatirlar = hamSayfalar.flat();
  const govde = govdeBoyu(tumSatirlar);

  const sayac = new Map<string, number>();
  for (const sayfa of hamSayfalar) {
    const kenarlar = [...sayfa.slice(0, 2), ...sayfa.slice(-2)];
    for (const n of new Set(kenarlar.map((s) => normal(s.metin)))) sayac.set(n, (sayac.get(n) ?? 0) + 1);
  }
  const tekrarEsigi = Math.max(3, hamSayfalar.length * TEKRAR_ORANI);

  return hamSayfalar.map((sayfa) =>
    sayfa
      .filter((s) => {
        if (/^[\s\d\-–—|.]*$/.test(s.metin)) return false;
        const n = normal(s.metin);
        return !(s.metin.length < 90 && (sayac.get(n) ?? 0) >= tekrarEsigi);
      })
      .map((s) => {
        if (govde > 0 && s.boy >= govde * BASLIK_ORANI && s.metin.length <= 120) return `## ${s.metin}`;
        if (OZEL_KUTU.test(s.metin)) return `▶ ${s.metin}`;
        return s.metin;
      })
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

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
  const hamSayfalar: Satir[][] = [];

  try {
    for (let sayfaNo = 1; sayfaNo <= toplam; sayfaNo++) {
      const sayfa = await pdf.getPage(sayfaNo);
      const icerik = await sayfa.getTextContent();
      hamSayfalar.push(satirlaraAyir(icerik.items));
      sayfa.cleanup();
      ilerleme(sayfaNo, toplam);
    }
  } finally {
    await yukleme.destroy();
  }

  return sayfalariYapilandir(hamSayfalar).map((metin, i) => ({ sayfaNo: i + 1, metin }));
}

/** Planlayıcıya gönderilen kısa sayfa özeti: önce başlıklar ve kutular, ardından metnin başı. */
export function sayfaOzeti(metin: string, max = 500) {
  const satirlar = metin.split("\n");
  const onemli = satirlar.filter((s) => s.startsWith("## ") || s.startsWith("▶ "));
  const diger = satirlar.filter((s) => !s.startsWith("## ") && !s.startsWith("▶ "));
  return [...onemli, ...diger].join(" ").slice(0, max);
}

export function taranmisMi(sayfalar: SayfaMetni[]) {
  if (sayfalar.length === 0) return true;
  const bos = sayfalar.filter((s) => s.metin.replace(/\s/g, "").length < 20).length;
  return bos / sayfalar.length > 0.6;
}
