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

export type ElemanTipi =
  | "kutu"
  | "ok"
  | "metin"
  | "vurgu"
  | "freedraw"
  | "ellipse"
  | "line"
  | "arrow"
  | "svg"
  | "latex";

export type Nokta = [number, number];

export type TahtaElemani = {
  tip: ElemanTipi;
  id?: string;
  x?: number;
  y?: number;
  genislik?: number;
  yukseklik?: number;
  metin?: string;
  renk?: string;
  arkaPlan?: string;
  kaynak?: string;
  hedef?: string;
  boyut?: number;
  noktalar?: Nokta[];
  egri?: boolean;
  kapali?: boolean;
  kalinlik?: number;
  svg?: string;
  latex?: string;
};

export type Vurus = {
  konusmaMetni: string;
  vurgulananId?: string | null;
  animasyonSuresiMs?: number;
  elemanlar: TahtaElemani[];
};

export type Sahne = {
  baslik: string;
  miniSoru?: string | null;
  vuruslar: Vurus[];
};

export type OgretmenModu = "anlatim" | "sokratik";

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
  return sahne.vuruslar.map((v) => v.konusmaMetni).join(" ");
}
