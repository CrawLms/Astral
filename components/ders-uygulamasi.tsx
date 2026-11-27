"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { KenarCubugu } from "./kenar-cubugu";
import { UstCubuk } from "./ust-cubuk";
import { AltPanel, type OgretmenMesaji } from "./alt-panel";
import { KalemKatmani } from "./kalem-katmani";
import { MiniTest } from "./mini-test";
import { useOynatici } from "@/hooks/use-oynatici";
import { ANAHTARLAR, oku, sil, yaz } from "@/lib/depolama";
import type { HazirGorsel } from "@/lib/gorsel-donustur";
import { fotografiYerlestir, tahtaGorseliAl, type SahneBaglami } from "@/lib/tahta-cizim";
import {
  sahneMetni,
  type AnlatYaniti,
  type OgretmenModu,
  type Sahne,
  type SayfaMetni,
  type SoruYaniti,
  type TestSorusu,
  type TestYaniti,
  type Unite,
  type Vurus,
} from "@/lib/types";

const BeyazTahta = dynamic(() => import("./beyaz-tahta"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Tahta hazırlanıyor…</div>
  ),
});

const VARSAYILAN_MODEL = "gpt-6.1-sol";

type Konu = { baslik: string; uniteId: string | null };
type KayitliDers = { konu: Konu; metin: string; sahneler: Sahne[] };
type SoruIstegi = { metin: string; fotograf?: HazirGorsel | null; tahtaGonder?: boolean };

function modelDuzelt(kayitli: string) {
  return kayitli.startsWith("google/") || kayitli.startsWith("openai/") || kayitli.startsWith("anthropic/")
    ? VARSAYILAN_MODEL
    : kayitli;
}

export default function DersUygulamasi() {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [hazir, setHazir] = useState(false);
  const [kenarAcik, setKenarAcik] = useState(true);
  const [uniteler, setUniteler] = useState<Unite[]>([]);
  const [aktifUniteId, setAktifUniteId] = useState<string | null>(null);
  const [sayfalar, setSayfalar] = useState<SayfaMetni[]>([]);
  const [kitapAdi, setKitapAdi] = useState<string | null>(null);
  const [model, setModel] = useState<string>(VARSAYILAN_MODEL);
  const [sesAcik, setSesAcik] = useState(true);
  const [hiz, setHiz] = useState(1);
  const [ogretmenModu, setOgretmenModu] = useState<OgretmenModu>("anlatim");

  const [konu, setKonu] = useState<Konu | null>(null);
  const [konuMetni, setKonuMetni] = useState("");
  const [mesaj, setMesaj] = useState<OgretmenMesaji | null>(null);
  const [yukleniyor, setYukleniyor] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [test, setTest] = useState<TestSorusu[] | null>(null);
  const [testYukleniyor, setTestYukleniyor] = useState(false);

  const sahneDegisti = useCallback((sahne: Sahne) => {
    setMesaj({ baslik: sahne.baslik, metin: sahne.vuruslar[0]?.konusmaMetni ?? "", tur: "anlatim" });
  }, []);

  const vurusDegisti = useCallback((sahne: Sahne, vurus: Vurus, sira: number) => {
    setMesaj({ baslik: sahne.baslik, metin: vurus.konusmaMetni, tur: sira < 0 ? "cevap" : "anlatim" });
  }, []);

  const oynatici = useOynatici({ apiRef, sesAcik, hiz, onSahne: sahneDegisti, onVurus: vurusDegisti });
  const aktifSahne = oynatici.aktif >= 0 ? oynatici.sahneler[oynatici.aktif] : null;
  const yukleRef = useRef(oynatici.yukle);
  useEffect(() => {
    yukleRef.current = oynatici.yukle;
  }, [oynatici.yukle]);

  useEffect(() => {
    let iptal = false;
    (async () => {
      const [u, a, s, k, m, ses, h, mod, ders] = await Promise.all([
        oku<Unite[]>(ANAHTARLAR.uniteler, []),
        oku<string | null>(ANAHTARLAR.aktifUnite, null),
        oku<SayfaMetni[]>(ANAHTARLAR.sayfalar, []),
        oku<string | null>(ANAHTARLAR.kitapAdi, null),
        oku<string>(ANAHTARLAR.model, VARSAYILAN_MODEL),
        oku<boolean>(ANAHTARLAR.ses, true),
        oku<number>(ANAHTARLAR.hiz, 1),
        oku<OgretmenModu>(ANAHTARLAR.mod, "anlatim"),
        oku<KayitliDers | null>(ANAHTARLAR.ders, null),
      ]);
      if (iptal) return;
      setUniteler(u);
      setAktifUniteId(a);
      setSayfalar(s);
      setKitapAdi(k);
      setModel(modelDuzelt(m));
      setSesAcik(ses);
      setHiz(h);
      setOgretmenModu(mod);
      if (ders?.sahneler?.length && ders.sahneler.every((x) => Array.isArray(x.vuruslar))) {
        setKonu(ders.konu);
        setKonuMetni(ders.metin);
        yukleRef.current(ders.sahneler, false);
        setMesaj({ baslik: ders.konu.baslik, metin: "Kaldığın dersten devam etmek için Oynat'a bas.", tur: "bilgi" });
      }
      setHazir(true);
    })();
    return () => {
      iptal = true;
    };
  }, []);

  useEffect(() => {
    if (hazir) yaz(ANAHTARLAR.uniteler, uniteler);
  }, [hazir, uniteler]);
  useEffect(() => {
    if (hazir) yaz(ANAHTARLAR.aktifUnite, aktifUniteId);
  }, [hazir, aktifUniteId]);
  useEffect(() => {
    if (hazir) yaz(ANAHTARLAR.model, model);
  }, [hazir, model]);
  useEffect(() => {
    if (hazir) yaz(ANAHTARLAR.ses, sesAcik);
  }, [hazir, sesAcik]);
  useEffect(() => {
    if (hazir) yaz(ANAHTARLAR.hiz, hiz);
  }, [hazir, hiz]);
  useEffect(() => {
    if (hazir) yaz(ANAHTARLAR.mod, ogretmenModu);
  }, [hazir, ogretmenModu]);

  const uniteMetni = useCallback(
    (unite: Unite) =>
      sayfalar
        .filter((s) => s.sayfaNo >= unite.sayfaBaslangic && s.sayfaNo <= unite.sayfaBitis && s.metin.trim())
        .map((s) => `[Sayfa ${s.sayfaNo}]\n${s.metin}`)
        .join("\n\n"),
    [sayfalar],
  );

  const anlatimIste = useCallback(
    async (yeniKonu: Konu, metin: string, altKonular: string[] = []) => {
      setHata(null);
      setTest(null);
      setYukleniyor(
        `"${yeniKonu.baslik}" için ${ogretmenModu === "sokratik" ? "Sokratik soru akışı" : "canlı tahta anlatımı"} hazırlanıyor…`,
      );
      oynatici.duraklat();
      try {
        const yanit = await fetch("/api/tahta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "anlat", model, ogretmenModu, baslik: yeniKonu.baslik, altKonular, metin }),
        });
        const veri = (await yanit.json()) as AnlatYaniti;
        if ("hata" in veri) {
          setHata(veri.hata);
          return;
        }
        setKonu(yeniKonu);
        setKonuMetni(metin);
        yaz(ANAHTARLAR.ders, { konu: yeniKonu, metin, sahneler: veri.sahneler } satisfies KayitliDers);
        oynatici.yukle(veri.sahneler);
      } catch {
        setHata("Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.");
      } finally {
        setYukleniyor(null);
      }
    },
    [model, ogretmenModu, oynatici],
  );

  const uniteyiAnlat = useCallback(
    (unite: Unite) => {
      const metin = uniteMetni(unite);
      if (!metin) {
        setHata("Bu ünitenin metni bulunamadı. Kitap PDF'ini yeniden yükleyin.");
        return;
      }
      setAktifUniteId(unite.id);
      anlatimIste({ baslik: unite.baslik, uniteId: unite.id }, metin, unite.altKonular);
    },
    [uniteMetni, anlatimIste],
  );

  const kitapHazir = useCallback(async (ad: string, yeniSayfalar: SayfaMetni[], yeniUniteler: Unite[]) => {
    setKitapAdi(ad);
    setSayfalar(yeniSayfalar);
    setUniteler(yeniUniteler);
    setAktifUniteId(yeniUniteler[0]?.id ?? null);
    yaz(ANAHTARLAR.kitapAdi, ad);
    if (!(await yaz(ANAHTARLAR.sayfalar, yeniSayfalar))) {
      setHata("Kitap metni tarayıcıya kaydedilemedi. Sayfa yenilenirse PDF'i tekrar yüklemeniz gerekir.");
    }
    setMesaj({
      baslik: "Ders planı hazır",
      metin: `${yeniSayfalar.length} sayfalık kitaptan ${yeniUniteler.length} ünite çıkarıldı. Soldan bir üniteye tıklayıp anlatımı başlatın.`,
      tur: "bilgi",
    });
  }, []);

  const sifirla = useCallback(() => {
    oynatici.yukle([], false);
    setUniteler([]);
    setSayfalar([]);
    setKitapAdi(null);
    setAktifUniteId(null);
    setKonu(null);
    setKonuMetni("");
    setMesaj(null);
    setTest(null);
    sil(ANAHTARLAR.sayfalar);
    sil(ANAHTARLAR.kitapAdi);
    sil(ANAHTARLAR.ders);
  }, [oynatici]);

  const ogretmeneSor = useCallback(
    async ({ metin, fotograf = null, tahtaGonder = true }: SoruIstegi) => {
      const api = apiRef.current;
      if (!api) return false;
      setHata(null);
      setGonderiliyor(true);
      oynatici.duraklat();
      try {
        const gorsel = tahtaGonder ? await tahtaGorseliAl(api) : null;
        if (!metin && !gorsel && !fotograf) {
          setHata("Göndermek için bir şey yazın, fotoğraf ekleyin veya tahtaya çizin.");
          return false;
        }
        let baglam: SahneBaglami | undefined;
        if (fotograf) baglam = fotografiYerlestir(api, fotograf).baglam;

        const yanit = await fetch("/api/tahta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "soru",
            model,
            ogretmenModu,
            soru: metin,
            gorsel: fotograf ? null : gorsel,
            fotograf: fotograf?.dataURL ?? null,
            uniteBaslik: konu?.baslik,
            sonAnlatim: aktifSahne ? sahneMetni(aktifSahne) : undefined,
            miniSoru: aktifSahne?.miniSoru ?? null,
          }),
        });
        const veri = (await yanit.json()) as SoruYaniti;
        if ("hata" in veri) {
          setHata(veri.hata);
          return false;
        }
        setMesaj({ baslik: "Öğretmenin cevabı", metin: veri.aciklama, tur: "cevap" });
        void oynatici.ekSahneOynat(
          { baslik: fotograf ? "Adım adım çözüm" : "Öğretmenin açıklaması", miniSoru: null, vuruslar: veri.vuruslar },
          baglam,
        );
        return true;
      } catch {
        setHata("Soru gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin.");
        return false;
      } finally {
        setGonderiliyor(false);
      }
    },
    [model, ogretmenModu, konu, aktifSahne, oynatici],
  );

  const testOlustur = useCallback(async () => {
    if (!konu || !konuMetni) return;
    setHata(null);
    setTestYukleniyor(true);
    try {
      const yanit = await fetch("/api/tahta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "test", model, baslik: konu.baslik, metin: konuMetni }),
      });
      const veri = (await yanit.json()) as TestYaniti;
      if ("hata" in veri) setHata(veri.hata);
      else setTest(veri.sorular);
    } catch {
      setHata("Mini test oluşturulamadı. Bağlantınızı kontrol edin.");
    } finally {
      setTestYukleniyor(false);
    }
  }, [konu, konuMetni, model]);

  const testiTahtadaAcikla = useCallback(
    (soru: TestSorusu, verilen: number) => {
      setTest(null);
      const harf = (i: number) => String.fromCharCode(65 + i);
      void ogretmeneSor({
        tahtaGonder: false,
        metin: `Mini testteki şu soruyu yanlış cevapladım, lütfen tahtada çizerek açıkla.\nSoru: ${soru.soru}\nSeçenekler: ${soru.secenekler
          .map((s, i) => `${harf(i)}) ${s}`)
          .join(" | ")}\nBenim cevabım: ${harf(verilen)}) ${soru.secenekler[verilen]}\nDoğru cevap: ${harf(soru.dogruIndex)}) ${
          soru.secenekler[soru.dogruIndex]
        }`,
      });
    },
    [ogretmeneSor],
  );

  const tamamlaVeGec = useCallback(() => {
    if (!konu?.uniteId) return;
    const sira = uniteler.findIndex((u) => u.id === konu.uniteId);
    const guncel = uniteler.map((u) => (u.id === konu.uniteId ? { ...u, tamamlandi: true } : u));
    setUniteler(guncel);
    setTest(null);
    const sonraki = guncel.slice(sira + 1).find((u) => !u.tamamlandi) ?? guncel.find((u) => !u.tamamlandi);
    if (sonraki) {
      uniteyiAnlat(sonraki);
    } else {
      oynatici.duraklat();
      setMesaj({ baslik: "Tebrikler", metin: "Tüm üniteleri tamamladınız. Harika bir çalışmaydı!", tur: "bilgi" });
    }
  }, [konu, uniteler, uniteyiAnlat, oynatici]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      {kenarAcik && (
        <div className="fixed inset-y-0 left-0 z-30 w-[300px] shadow-xl md:static md:z-auto md:shadow-none">
          <KenarCubugu
            model={model}
            kitapAdi={kitapAdi}
            uniteler={uniteler}
            aktifUniteId={aktifUniteId}
            anlatimYukleniyor={yukleniyor !== null}
            onKapat={() => setKenarAcik(false)}
            onKitapHazir={kitapHazir}
            onUniteSec={setAktifUniteId}
            onUniteAnlat={uniteyiAnlat}
            onMetinAnlat={(metin) =>
              anlatimIste({ baslik: metin.length > 60 ? `${metin.slice(0, 57)}…` : metin, uniteId: null }, metin)
            }
            onSifirla={sifirla}
          />
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <UstCubuk
          kenarAcik={kenarAcik}
          onKenarAc={() => setKenarAcik(true)}
          baslik={konu?.baslik ?? null}
          sahneSayisi={oynatici.sahneler.length}
          aktif={oynatici.aktif}
          vurusSayisi={aktifSahne?.vuruslar.length ?? 0}
          aktifVurus={oynatici.aktifVurus}
          oynatiliyor={oynatici.oynatiliyor}
          sesAcik={sesAcik}
          model={model}
          hiz={hiz}
          ogretmenModu={ogretmenModu}
          onHiz={setHiz}
          onMod={setOgretmenModu}
          onOynat={oynatici.oynat}
          onDuraklat={oynatici.duraklat}
          onOnceki={oynatici.onceki}
          onSonraki={oynatici.sonraki}
          onSes={() => setSesAcik((s) => !s)}
          onTemizle={oynatici.tahtayiTemizle}
          onModel={setModel}
        />
        <div className="relative min-h-0 flex-1">
          <BeyazTahta
            onApi={(api) => {
              apiRef.current = api;
            }}
          />
          <KalemKatmani apiRef={apiRef} canliRef={oynatici.canliRef} />
          {test && konu && (
            <MiniTest baslik={konu.baslik} sorular={test} onKapat={() => setTest(null)} onTahtadaAcikla={testiTahtadaAcikla} />
          )}
        </div>
        <AltPanel
          mesaj={mesaj}
          miniSoru={aktifSahne?.miniSoru ?? null}
          soruBekliyor={oynatici.soruBekliyor}
          konusuyor={oynatici.konusuyor}
          yukleniyor={yukleniyor}
          hata={hata}
          onHataKapat={() => setHata(null)}
          gonderiliyor={gonderiliyor}
          onGonder={(metin, fotograf) => ogretmeneSor({ metin, fotograf })}
          tamamlaGorunur={Boolean(konu?.uniteId) && oynatici.sahneler.length > 0}
          onTamamla={tamamlaVeGec}
          testGorunur={Boolean(konu && konuMetni) && oynatici.bitti}
          testYukleniyor={testYukleniyor}
          onTestOlustur={testOlustur}
        />
      </main>
    </div>
  );
}
