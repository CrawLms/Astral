export type SayfaMetni = {
  sayfaNo: number;
  metin: string;
};

export type Unite = {
  id: string;
  baslik: string;
  sayfaBaslangic: number;
  sayfaBitis: number;
  altKonular: string[];
  tamamlandi: boolean;
};

export type Bolge = "marmara" | "ege" | "akdeniz" | "ic-anadolu" | "karadeniz" | "dogu-anadolu" | "guneydogu-anadolu";

export type VurgulananIl = { plaka: number; ad: string; renk: string; etiket?: string };
export type BaglantiOku = { neredenPlaka: number; nereyePlaka: number; etiket?: string };
export type GrafikFonksiyonu = { ifade: string; renk: string; etiket?: string };
export type GrafikNoktasi = { x: number; y: number; etiket: string };

export type HaritaAksiyonu = {
  tip: "turkiye_haritasi";
  gorsel: string;
  vurgulananIller?: VurgulananIl[];
  bolgeRenkleri?: Partial<Record<Bolge, string>>;
  baglantiOklari?: BaglantiOku[];
};

export type GrafikAksiyonu = {
  tip: "matematik_grafigi";
  gorsel: string;
  xAralik?: [number, number];
  yAralik?: [number, number];
  fonksiyonlar?: GrafikFonksiyonu[];
  noktalar?: GrafikNoktasi[];
};

export type DiyagramAksiyonu = {
  tip: "geometri_ve_diyagram";
  gorsel: string;
  svg: string;
};

export type FormulAksiyonu = {
  tip: "formul_ve_not";
  gorsel: string;
  latex?: string;
  not?: string;
  renk?: string;
  altiCizili?: boolean;
};

export type VurgulaAksiyonu = { tip: "vurgula"; gorsel: string };

export type Aksiyon = HaritaAksiyonu | GrafikAksiyonu | DiyagramAksiyonu | FormulAksiyonu | VurgulaAksiyonu;

export type GorselTipi = Exclude<Aksiyon["tip"], "vurgula"> | "fotograf";

export type Vurus = {
  id: string;
  soz: string;
  aksiyonlar: Aksiyon[];
};

export type MiniGorev =
  | { tur: "il_tikla"; yonerge: string; dogruPlaka: number }
  | { tur: "tahtaya_yaz"; yonerge: string };

export type Sahne = {
  baslik: string;
  miniSoru?: string | null;
  miniGorev?: MiniGorev | null;
  vuruslar: Vurus[];
  ek?: boolean;
  fotograf?: string | null;
};

export type OgretmenModu = "anlatim" | "sokratik";

export const SEVIYELER = [
  { deger: "ilkokul", etiket: "İlkokul" },
  { deger: "ortaokul", etiket: "Ortaokul" },
  { deger: "lise", etiket: "Lise / YKS" },
  { deger: "universite", etiket: "Üniversite" },
] as const;

export type Seviye = (typeof SEVIYELER)[number]["deger"];

export type TestSorusu = {
  soru: string;
  secenekler: string[];
  dogruIndex: number;
  aciklama: string;
};

export type PlanYaniti = { uniteler: Unite[] } | { hata: string };

export type AnlatYaniti = { sahneler: Sahne[] } | { hata: string };

export type SoruYaniti = { aciklama: string; vuruslar: Vurus[] } | { hata: string };

export type TestYaniti = { sorular: TestSorusu[] } | { hata: string };

export function sahneMetni(sahne: Sahne) {
  return sahne.vuruslar.map((v) => v.soz).join(" ");
}

export function sahneGecerliMi(s: unknown): s is Sahne {
  const x = s as Sahne;
  return Boolean(x && Array.isArray(x.vuruslar) && x.vuruslar.every((v) => typeof v.soz === "string" && Array.isArray(v.aksiyonlar)));
}
