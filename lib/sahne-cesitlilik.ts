import { vurusKatmani, type Aksiyon, type Sahne, type Vurus } from "@/lib/types";

export const YEDEK_SEMA_GORSEL = "yedek_sema";
export const OZEL_ILLUSTRASYON_GORSEL = "il_ozel";
export const ILLUSTRASYON_PAKETI = 3;
const MAKS_ZENGINLESTIRME = 9;
const MAKS_ANA_BLOK = 2;

export type IllustrasyonKatmani = { vurus: string; svg: string };
export type SahneIllustrasyonu = { sira: number; katmanlar: IllustrasyonKatmani[] };
export type IllustrasyonYaniti = { cizimler: SahneIllustrasyonu[] } | { hata: string };
export type IllustrasyonIstegiSahnesi = { sira: number; baslik: string; vuruslar: { id: string; soz: string }[] };

const KESIN_TIPLER = new Set<Aksiyon["tip"]>(["turkiye_haritasi", "matematik_grafigi", "geometri"]);
const KESIN_SABLONLAR = new Set([
  "egik_duzlem",
  "elektrik_devresi",
  "optik_duzenek",
  "kuvvet_dengesi",
  "atom_modeli",
  "tepkime_kabi",
  "hucre_kesiti",
]);
const GENEL_KALIPLAR = new Set([
  "akis_semasi",
  "hazir_sahne:ikon_izgarasi",
  "hazir_sahne:piramit",
  "hazir_sahne:venn",
  "hazir_sahne:terazi",
]);

function anaGorselAnahtari(a: Aksiyon): string | undefined {
  switch (a.tip) {
    case "vurgula":
    case "formul_ve_not":
      return undefined;
    case "hazir_sahne":
      return `hazir_sahne:${a.sablon}`;
    default:
      return a.tip;
  }
}

function anaBloklar(sahne: Sahne) {
  const bloklar = new Map<string, { anahtar: string; aksiyon: Aksiyon }>();
  for (const v of sahne.vuruslar) {
    if (vurusKatmani(v) !== 0) continue;
    for (const a of v.aksiyonlar) {
      const anahtar = anaGorselAnahtari(a);
      if (anahtar && !bloklar.has(a.gorsel)) bloklar.set(a.gorsel, { anahtar, aksiyon: a });
    }
  }
  return bloklar;
}

const kesinMi = (a: Aksiyon) => KESIN_TIPLER.has(a.tip) || (a.tip === "hazir_sahne" && KESIN_SABLONLAR.has(a.sablon));
const genelMi = (gorsel: string, anahtar: string) => gorsel === YEDEK_SEMA_GORSEL || GENEL_KALIPLAR.has(anahtar);

// Sahneleri sırayla tarar ve ana görseli önceki sahnelerin kalıbını tekrar eden, yalnızca otomatik yedek şema
// içeren ya da hiç ana görseli olmayan sahneleri bulur. Kesin düzenek/harita/grafik içeren veya zaten özel
// illüstrasyonu olan sahnelere dokunmaz.
export function illustrasyonGerekenSahneler(sahneler: Sahne[]): number[] {
  const gorulenKaliplar = new Set<string>();
  let oncekiImza = "";
  const sonuc: number[] = [];
  sahneler.forEach((sahne, sira) => {
    const bloklar = [...anaBloklar(sahne)];
    const anahtarlar = bloklar.map(([, b]) => b.anahtar);
    const imza = [...new Set(anahtarlar)].sort().join("|");
    const ozelVar = anahtarlar.includes("geometri_ve_diyagram");
    const kesinVar = bloklar.some(([, b]) => kesinMi(b.aksiyon));
    const icerikliVurus = sahne.vuruslar.filter((v) => vurusKatmani(v) === 0 && v.soz.trim()).length;
    if (!sahne.ek && !ozelVar && !kesinVar && icerikliVurus >= 3) {
      const tekrar =
        bloklar.length === 0 ||
        bloklar.some(([gorsel, b]) => gorsel === YEDEK_SEMA_GORSEL || (GENEL_KALIPLAR.has(b.anahtar) && gorulenKaliplar.has(b.anahtar))) ||
        (imza !== "" && imza === oncekiImza);
      if (tekrar) sonuc.push(sira);
    }
    for (const a of anahtarlar) gorulenKaliplar.add(a);
    oncekiImza = imza;
  });
  return sonuc.slice(0, MAKS_ZENGINLESTIRME);
}

export function illustrasyonIstegiHazirla(sahne: Sahne, sira: number): IllustrasyonIstegiSahnesi {
  return {
    sira,
    baslik: sahne.baslik,
    vuruslar: sahne.vuruslar.filter((v) => vurusKatmani(v) === 0).map((v) => ({ id: v.id, soz: v.soz })),
  };
}

// Tekrar eden kalıp bloklarını (ve otomatik yedek şemayı) sahneye özel illüstrasyon katmanlarıyla değiştirir.
// Kalıp dışı bloklar (tablo, zaman çizelgesi vb.) korunur; tahta kalabalıklaşacaksa sahne olduğu gibi bırakılır.
export function illustrasyonuUygula(sahne: Sahne, katmanlar: IllustrasyonKatmani[]): Sahne {
  const katmanVurusu = new Map<string, string>();
  for (const k of katmanlar) if (!katmanVurusu.has(k.vurus)) katmanVurusu.set(k.vurus, k.svg);
  const hedefVuruslar = sahne.vuruslar.filter((v) => vurusKatmani(v) === 0 && katmanVurusu.has(v.id));
  if (hedefVuruslar.length === 0) return sahne;

  const bloklar = anaBloklar(sahne);
  const kaldirilacak = new Set([...bloklar].filter(([gorsel, b]) => genelMi(gorsel, b.anahtar)).map(([gorsel]) => gorsel));
  if (bloklar.size - kaldirilacak.size + 1 > MAKS_ANA_BLOK) return sahne;

  const vuruslar: Vurus[] = sahne.vuruslar.map((v) => {
    if (vurusKatmani(v) !== 0) return v;
    const aksiyonlar: Aksiyon[] = v.aksiyonlar.flatMap((a): Aksiyon[] => {
      if (!kaldirilacak.has(a.gorsel)) return [a];
      return a.tip === "vurgula" ? [{ tip: "vurgula", gorsel: OZEL_ILLUSTRASYON_GORSEL }] : [];
    });
    const svg = katmanVurusu.get(v.id);
    if (svg) aksiyonlar.push({ tip: "geometri_ve_diyagram", gorsel: OZEL_ILLUSTRASYON_GORSEL, svg });
    return { ...v, aksiyonlar };
  });
  return { ...sahne, vuruslar };
}
