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

export type ElemanTipi = "kutu" | "ok" | "metin" | "vurgu";

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
};

export type Sahne = {
  baslik: string;
  anlatimMetni: string;
  miniSoru?: string | null;
  elemanlar: TahtaElemani[];
};

export type PlanYaniti = { uniteler: Unite[] } | { hata: string };

export type AnlatYaniti = { sahneler: Sahne[] } | { hata: string };

export type SoruYaniti =
  | { aciklama: string; elemanlar: TahtaElemani[] }
  | { hata: string };
