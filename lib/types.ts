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

// --- Parametrik Geometri ---

export type GeometriNokta = {
  ad: string;
  x: number;
  y: number;
  etiket?: string;
  renk?: string;
  gizli?: boolean;
  konum?: "ust" | "alt" | "sol" | "sag" | "otomatik";
};

export type GeometriDogru = {
  a: string;
  b: string;
  etiket?: string;
  tur?: "dogru_parcasi" | "dogru" | "isin";
  kesikli?: boolean;
  renk?: string;
  kalinlik?: number;
  esitlik?: 1 | 2 | 3;
};

export type GeometriCember = {
  merkez: string;
  r: number;
  renk?: string;
  dolgu?: string;
  kesikli?: boolean;
  etiket?: string;
  baslangicAci?: number;
  bitisAci?: number;
};

export type GeometriAci = {
  a: string;
  kose: string;
  c: string;
  dik?: boolean;
  etiket?: string;
  renk?: string;
  yaySayisi?: 1 | 2 | 3;
  yaricap?: number;
};

export type GeometriYukseklik = {
  tepe: string;
  tabanA: string;
  tabanB: string;
  ayak?: string;
  etiket?: string;
  dikIsareti?: boolean;
  kesikli?: boolean;
  renk?: string;
};

export type GeometriEtiket = {
  metin: string;
  x: number;
  y: number;
  renk?: string;
  boyut?: number;
};

export type GeometriCokgen = {
  noktalar: string[];
  dolgu?: string;
  renk?: string;
  etiket?: string;
};

export type GeometriAksiyonu = {
  tip: "geometri";
  gorsel: string;
  noktalar?: GeometriNokta[];
  dogrular?: GeometriDogru[];
  cemberler?: GeometriCember[];
  acilar?: GeometriAci[];
  yukseklikler?: GeometriYukseklik[];
  etiketler?: GeometriEtiket[];
  cokgenler?: GeometriCokgen[];
  koordinatGoster?: boolean;
};

// --- Akış Şeması / Kavram Haritası ---

export type AkisYon = "TB" | "LR";
export type AkisDugumSekli = "kutu" | "yuvarlak" | "oval" | "elmas" | "daire" | "paralelkenar";

export type AkisDugum = {
  id: string;
  etiket: string;
  altEtiket?: string;
  sekil?: AkisDugumSekli;
  ikon?: string;
  renk?: string;
  dolgu?: string;
  grup?: string;
};

export type AkisBaglantisi = {
  kaynak: string;
  hedef: string;
  etiket?: string;
  kesikli?: boolean;
  ciftYon?: boolean;
  akis?: boolean;
  renk?: string;
};

export type AkisGrubu = {
  id: string;
  baslik: string;
  renk?: string;
  dolgu?: string;
  dugumler?: string[];
};

export type AkisSemasiAksiyonu = {
  tip: "akis_semasi";
  gorsel: string;
  yon?: AkisYon;
  dugumler?: AkisDugum[];
  baglantilar?: AkisBaglantisi[];
  gruplar?: AkisGrubu[];
};

// --- Zaman Çizelgesi ---

export type ZamanCizelgesiYon = "yatay" | "dikey";

export type ZamanOlayi = {
  tarih: string;
  baslik: string;
  aciklama?: string;
  ikon?: string;
  renk?: string;
  vurgulu?: boolean;
  aralik?: string;
};

export type ZamanCizelgesiAksiyonu = {
  tip: "zaman_cizelgesi";
  gorsel: string;
  baslik?: string;
  yon?: ZamanCizelgesiYon;
  olaylar?: ZamanOlayi[];
};

// --- Karşılaştırma / Veri Tablosu ---

export type TabloVurgusu = {
  satir?: number;
  sutun?: number;
  renk?: string;
  not?: string;
};

export type TabloAksiyonu = {
  tip: "tablo";
  gorsel: string;
  baslik?: string;
  basliklar?: string[];
  satirlar?: string[][];
  vurgular?: TabloVurgusu[];
  sutunRenkleri?: string[];
};

// --- Hazır Sahne Şablonları ---

export type EgikDuzlemKuvvet = {
  yon: "yukari" | "asagi" | "normal" | "yatay" | "agirlik" | "surtunme";
  etiket: string;
  renk?: string;
};

export type EgikDuzlemSablonu = {
  sablon: "egik_duzlem";
  aci?: number;
  aciEtiketi?: string;
  cisimEtiketi?: string;
  kuvvetler?: EgikDuzlemKuvvet[];
  surtunme?: boolean | string;
  hareket?: "yukari" | "asagi" | "durgun";
  yukseklikEtiketi?: string;
  uzunlukEtiketi?: string;
};

export type ElektrikDevresiEleman = {
  tur: "direnc" | "ampul" | "anahtar" | "ampermetre" | "voltmetre" | "kondansator" | "pil";
  etiket?: string;
  deger?: string;
  kapali?: boolean;
  kol?: number;
  renk?: string;
};

export type ElektrikDevresiSablonu = {
  sablon: "elektrik_devresi";
  duzen?: "seri" | "paralel" | "karisik";
  kaynak?: { gerilim?: string; etiket?: string };
  elemanlar: ElektrikDevresiEleman[];
  akimYonu?: boolean | "saat" | "ters";
  akimEtiketi?: string;
};

export type OptikDuzenekSablonu = {
  sablon: "optik_duzenek";
  tur: "cukur_ayna" | "tumsek_ayna" | "duz_ayna" | "ince_mercek" | "kalin_mercek";
  odakEtiketi?: string;
  merkezEtiketi?: string;
  cisim?: {
    konum: "merkez_disi" | "merkezde" | "odak_merkez_arasi" | "odakta" | "odak_ayna_arasi" | number;
    boy?: number;
    etiket?: string;
  };
  goruntu?: { goster?: boolean; etiket?: string };
  isinlar?: boolean;
};

export type KuvvetDengesiKuvvet = {
  etiket: string;
  /** Derece cinsinden yön (0: sağ, 90: yukarı, 180: sol, 270: aşağı). */
  aci: number;
  buyukluk?: number;
  renk?: string;
};

export type KuvvetDengesiSablonu = {
  sablon: "kuvvet_dengesi";
  cisim?: { sekil?: "kutu" | "daire" | "nokta"; etiket?: string; dolgu?: string };
  zemin?: "yatay" | "yok" | "ip";
  kuvvetler: KuvvetDengesiKuvvet[];
  bileske?: { etiket?: string; goster?: boolean };
};

export type AtomModeliSablonu = {
  sablon: "atom_modeli";
  sembol: string;
  ad?: string;
  proton?: number;
  notron?: number;
  katmanlar: number[];
  yuk?: string;
  animasyon?: boolean;
};

export type TepkimeKabiTanecik = {
  etiket: string;
  sayi?: number;
  renk?: string;
  faz?: "kati" | "sivi" | "gaz";
};

export type TepkimeKabiSablonu = {
  sablon: "tepkime_kabi";
  kap?: "beher" | "erlen" | "tup" | "iki_kap";
  baslik?: string;
  tanecikler?: TepkimeKabiTanecik[];
  girenler?: TepkimeKabiTanecik[];
  urunler?: TepkimeKabiTanecik[];
  isi?: boolean;
  piston?: boolean;
  etiket?: string;
};

export type HucreOrganeli = {
  id?: string;
  ad: string;
  aciklama?: string;
  vurgulu?: boolean;
  renk?: string;
};

export type HucreKesitiSablonu = {
  sablon: "hucre_kesiti";
  tur: "hayvan" | "bitki" | "prokaryot";
  baslik?: string;
  organeller: HucreOrganeli[];
};

export type TeraziKefe = {
  baslik: string;
  maddeler?: string[];
  agirlik?: number;
  renk?: string;
};

export type TeraziSablonu = {
  sablon: "terazi";
  baslik?: string;
  sol: TeraziKefe;
  sag: TeraziKefe;
  denge?: "esit" | "sol_agir" | "sag_agir";
  merkezEtiket?: string;
};

export type PiramitKatmani = {
  baslik: string;
  altMetin?: string;
  renk?: string;
  vurgulu?: boolean;
};

export type PiramitSablonu = {
  sablon: "piramit";
  baslik?: string;
  yon?: "ustten_alta" | "alttan_uste";
  katmanlar: PiramitKatmani[];
  yanEtiket?: string;
};

export type VennKumesi = {
  ad: string;
  elemanlar?: string[];
  renk?: string;
};

export type VennSablonu = {
  sablon: "venn";
  baslik?: string;
  kumeler: VennKumesi[];
  kesisim?: string[];
  evrensel?: string;
};

export type IkonIzgarasiOge = {
  ikon: string;
  baslik: string;
  altMetin?: string;
  renk?: string;
  vurgulu?: boolean;
};

export type IkonIzgarasiSablonu = {
  sablon: "ikon_izgarasi";
  baslik?: string;
  sutunSayisi?: number;
  ogeler: IkonIzgarasiOge[];
};

export type HazirSahneSablon =
  | EgikDuzlemSablonu
  | ElektrikDevresiSablonu
  | OptikDuzenekSablonu
  | KuvvetDengesiSablonu
  | AtomModeliSablonu
  | TepkimeKabiSablonu
  | HucreKesitiSablonu
  | TeraziSablonu
  | PiramitSablonu
  | VennSablonu
  | IkonIzgarasiSablonu;

export type HazirSahneSablonAdi = HazirSahneSablon["sablon"];

export type HazirSahneAksiyonu = {
  tip: "hazir_sahne";
  gorsel: string;
} & HazirSahneSablon;

export type Aksiyon =
  | HaritaAksiyonu
  | GrafikAksiyonu
  | DiyagramAksiyonu
  | FormulAksiyonu
  | VurgulaAksiyonu
  | GeometriAksiyonu
  | AkisSemasiAksiyonu
  | ZamanCizelgesiAksiyonu
  | TabloAksiyonu
  | HazirSahneAksiyonu;

export type GorselTipi = Exclude<Aksiyon["tip"], "vurgula"> | "fotograf";

export type Vurus = {
  id: string;
  soz: string;
  aksiyonlar: Aksiyon[];
  katman?: number;
};

export type SahneKatmani = { baslik: string; fotograf?: string | null };

export type CevapSonrasi = "gec" | "bekle";

export const vurusKatmani = (v: Vurus | undefined) => v?.katman ?? 0;

export function aktifKatman(sahne: Sahne, vurusSira: number) {
  return vurusKatmani(sahne.vuruslar[Math.min(vurusSira, sahne.vuruslar.length - 1)]);
}

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
  katmanlar?: SahneKatmani[];
  cevaplandi?: CevapSonrasi;
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

const aksiyonTurAnahtari = (a: Aksiyon) => (a.tip === "hazir_sahne" ? `hazir_sahne:${a.sablon}` : a.tip);

// Aynı "gorsel" kimliği farklı blok tipleriyle kullanılırsa tahtada yalnızca ilk tip çizilir ve diğerleri
// kaybolur. Çakışan kimlikleri tip bazında yeniden adlandırır; çakışma yoksa vuruşları aynen döndürür.
export function gorselKimlikleriniAyir(vuruslar: Vurus[]): Vurus[] {
  const ilkTur = new Map<string, string>();
  let degisti = false;
  const sonuc = vuruslar.map((v) => {
    const katman = vurusKatmani(v);
    let vurusDegisti = false;
    const aksiyonlar = v.aksiyonlar.map((a) => {
      if (a.tip === "vurgula") return a;
      const anahtar = `${katman}|${a.gorsel}`;
      const tur = aksiyonTurAnahtari(a);
      const kayitli = ilkTur.get(anahtar);
      if (kayitli === undefined) {
        ilkTur.set(anahtar, tur);
        return a;
      }
      if (kayitli === tur) return a;
      vurusDegisti = true;
      return { ...a, gorsel: `${a.gorsel}~${tur.replace(/[^a-z0-9_]/gi, "")}` };
    });
    if (!vurusDegisti) return v;
    degisti = true;
    return { ...v, aksiyonlar };
  });
  return degisti ? sonuc : vuruslar;
}

export function sahneMetni(sahne: Sahne) {
  return sahne.vuruslar.map((v) => v.soz).join(" ");
}

export function sahneGecerliMi(s: unknown): s is Sahne {
  const x = s as Sahne;
  return Boolean(x && Array.isArray(x.vuruslar) && x.vuruslar.every((v) => typeof v.soz === "string" && Array.isArray(v.aksiyonlar)));
}
