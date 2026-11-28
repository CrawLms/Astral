"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { KenarCubugu } from "./kenar-cubugu";
import { UstCubuk } from "./ust-cubuk";
import { AltPanel } from "./alt-panel";
import { KalemKatmani } from "./kalem-katmani";
import { MiniTest } from "./mini-test";
import { useOynatici } from "@/hooks/use-oynatici";
import { ANAHTARLAR, oku, sil, yaz } from "@/lib/depolama";
import type { HazirGorsel } from "@/lib/gorsel-donustur";
import { birlesikGorselAl } from "@/lib/ogretmen-cizim";
import { GorevKarti, SahneCizelgesi } from "./sahne-cizelgesi";
import { BosTahtaIpucu, TahtaYukleniyor } from "./tahta-ipuclari";
import type { Tema } from "./beyaz-tahta";
import {
  sahneGecerliMi,
  sahneMetni,
  type AnlatYaniti,
  type OgretmenModu,
  type Seviye,
  type Sahne,
  type SayfaMetni,
  type SoruYaniti,
  type TestSorusu,
  type TestYaniti,
  type Unite,
} from "@/lib/types";

const BeyazTahta = dynamic(() => import("./beyaz-tahta"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Tahta hazırlanıyor…</div>
  ),
});

const OgretmenSahnesi = dynamic(() => import("./ogretmen-sahnesi"), { ssr: false });

type Konu = { baslik: string; uniteId: string | null };
type KayitliDers = { konu: Konu; metin: string; sahneler: Sahne[] };
type SoruIstegi = { metin: string; fotograf?: HazirGorsel | null; tahtaGonder?: boolean };

function mobilMi() {
  return !window.matchMedia("(min-width: 768px)").matches;
}

function vurusYoksay() {}

export default function DersUygulamasi() {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const katmanRef = useRef<SVGSVGElement | null>(null);
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [seviye, setSeviye] = useState<Seviye>("lise");
  const [gorevSonuc, setGorevSonuc] = useState<{ dogru: boolean; metin: string } | null>(null);
  const [hazir, setHazir] = useState(false);
  const [kenarAcik, setKenarAcik] = useState(() => !mobilMi());
  const [uniteler, setUniteler] = useState<Unite[]>([]);
  const [aktifUniteId, setAktifUniteId] = useState<string | null>(null);
  const [sayfalar, setSayfalar] = useState<SayfaMetni[]>([]);
  const [kitapAdi, setKitapAdi] = useState<string | null>(null);
  const [sesAcik, setSesAcik] = useState(true);
  const [hiz, setHiz] = useState(1);
  const [ogretmenModu, setOgretmenModu] = useState<OgretmenModu>("anlatim");
  const [tema, setTema] = useState<Tema>(() => (document.documentElement.dataset.tema === "dark" ? "dark" : "light"));

  const [konu, setKonu] = useState<Konu | null>(null);
  const [konuMetni, setKonuMetni] = useState("");
  const [yukleniyor, setYukleniyor] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [test, setTest] = useState<TestSorusu[] | null>(null);
  const [testYukleniyor, setTestYukleniyor] = useState(false);

  const sahneDegisti = useCallback(() => setGorevSonuc(null), []);

  const oynatici = useOynatici({ apiRef, sesAcik, hiz, onSahne: sahneDegisti, onVurus: vurusYoksay });
  const aktifSahne = oynatici.aktif >= 0 ? oynatici.sahneler[oynatici.aktif] : null;
  const yukleRef = useRef(oynatici.yukle);
  useEffect(() => {
    yukleRef.current = oynatici.yukle;
  }, [oynatici.yukle]);

  useEffect(() => {
    let iptal = false;
    (async () => {
      oku<Seviye>(ANAHTARLAR.seviye, "lise").then((sv) => {
        if (!iptal) setSeviye(sv);
      });
      oku<Tema | null>(ANAHTARLAR.tema, null).then((t) => {
        if (!iptal && t) setTema(t);
      });
      const [u, a, s, k, ses, h, mod, ders] = await Promise.all([
        oku<Unite[]>(ANAHTARLAR.uniteler, []),
        oku<string | null>(ANAHTARLAR.aktifUnite, null),
        oku<SayfaMetni[]>(ANAHTARLAR.sayfalar, []),
        oku<string | null>(ANAHTARLAR.kitapAdi, null),
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
      setSesAcik(ses);
      setHiz(h);
      setOgretmenModu(mod);
      if (ders?.sahneler?.length && ders.sahneler.every(sahneGecerliMi)) {
        setKonu(ders.konu);
        setKonuMetni(ders.metin);
        yukleRef.current(ders.sahneler, false);
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
    if (hazir) yaz(ANAHTARLAR.ses, sesAcik);
  }, [hazir, sesAcik]);
  useEffect(() => {
    if (hazir) yaz(ANAHTARLAR.hiz, hiz);
  }, [hazir, hiz]);
  useEffect(() => {
    if (hazir) yaz(ANAHTARLAR.mod, ogretmenModu);
  }, [hazir, ogretmenModu]);
  useEffect(() => {
    if (hazir) yaz(ANAHTARLAR.seviye, seviye);
  }, [hazir, seviye]);
  useEffect(() => {
    const kok = document.documentElement;
    kok.dataset.tema = tema;
    kok.style.colorScheme = tema;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", tema === "dark" ? "#121212" : "#ffffff");
    if (hazir) yaz(ANAHTARLAR.tema, tema);
  }, [hazir, tema]);

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
      if (mobilMi()) setKenarAcik(false);
      setYukleniyor(
        `"${yeniKonu.baslik}" için ${ogretmenModu === "sokratik" ? "Sokratik soru akışı" : "canlı tahta anlatımı"} hazırlanıyor…`,
      );
      oynatici.duraklat();
      try {
        const yanit = await fetch("/api/tahta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "anlat", ogretmenModu, seviye, baslik: yeniKonu.baslik, altKonular, metin }),
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
    [ogretmenModu, seviye, oynatici],
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
  }, []);

  const sifirla = useCallback(() => {
    oynatici.yukle([], false);
    setUniteler([]);
    setSayfalar([]);
    setKitapAdi(null);
    setAktifUniteId(null);
    setKonu(null);
    setKonuMetni("");
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
        const gorsel = tahtaGonder && !fotograf ? await birlesikGorselAl(api, katmanRef.current) : null;
        if (!metin && !gorsel && !fotograf) {
          setHata("Göndermek için bir şey yazın, fotoğraf ekleyin veya tahtaya çizin.");
          return false;
        }

        const yanit = await fetch("/api/tahta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "soru",
            ogretmenModu,
            seviye,
            soru: metin,
            gorsel,
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
        oynatici.cevabiAnlat(
          {
            baslik: fotograf ? "Adım adım çözüm" : "Öğretmenin açıklaması",
            vuruslar: veri.vuruslar,
            fotograf: fotograf?.dataURL ?? null,
          },
          ogretmenModu === "sokratik" ? "bekle" : "gec",
        );
        return true;
      } catch {
        setHata("Soru gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin.");
        return false;
      } finally {
        setGonderiliyor(false);
      }
    },
    [ogretmenModu, seviye, konu, aktifSahne, oynatici],
  );

  const ilTiklandi = useCallback(
    (plaka: number, ad: string) => {
      const g = oynatici.gorev;
      if (g?.tur !== "il_tikla") return;
      setGorevSonuc(plaka === g.dogruPlaka ? { dogru: true, metin: `Doğru! Bu ${ad}.` } : { dogru: false, metin: `${ad} değil, tekrar dene.` });
    },
    [oynatici.gorev],
  );

  const testOlustur = useCallback(async () => {
    if (!konu || !konuMetni) return;
    setHata(null);
    setTestYukleniyor(true);
    try {
      const yanit = await fetch("/api/tahta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "test", baslik: konu.baslik, metin: konuMetni }),
      });
      const veri = (await yanit.json()) as TestYaniti;
      if ("hata" in veri) setHata(veri.hata);
      else setTest(veri.sorular);
    } catch {
      setHata("Mini test oluşturulamadı. Bağlantınızı kontrol edin.");
    } finally {
      setTestYukleniyor(false);
    }
  }, [konu, konuMetni]);

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
    }
  }, [konu, uniteler, uniteyiAnlat, oynatici]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      {kenarAcik && (
        <button
          type="button"
          aria-label="Ders planını kapat"
          onClick={() => setKenarAcik(false)}
          className="fixed inset-0 z-30 bg-foreground/30 backdrop-blur-[2px] md:hidden"
        />
      )}
      {kenarAcik && (
        <div className="kenar-giris fixed inset-y-0 left-0 z-40 w-[min(320px,86vw)] shadow-2xl md:static md:z-auto md:w-[300px] md:shadow-none">
          <KenarCubugu
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
          hiz={hiz}
          ogretmenModu={ogretmenModu}
          onHiz={setHiz}
          seviye={seviye}
          onSeviye={setSeviye}
          onMod={setOgretmenModu}
          onOynat={oynatici.oynat}
          onDuraklat={oynatici.duraklat}
          onOnceki={oynatici.onceki}
          onSonraki={oynatici.sonraki}
          onSes={() => setSesAcik((s) => !s)}
          onTemizle={oynatici.tahtayiTemizle}
        />
        <SahneCizelgesi sahneler={oynatici.sahneler} aktif={oynatici.aktif} onSec={oynatici.sahneyeGit} />
        <div className={`relative isolate min-h-0 flex-1 ${tema === "dark" ? "bg-[#121212]" : "bg-white"}`}>
          <OgretmenSahnesi
            api={api}
            svgRef={katmanRef}
            canliRef={oynatici.canliRef}
            sahneler={oynatici.sahneler}
            aktif={oynatici.aktif}
            aktifVurus={oynatici.aktifVurus}
            ilerleme={oynatici.ilerleme}
            ilTiklama={oynatici.gorev?.tur === "il_tikla" && !gorevSonuc?.dogru ? ilTiklandi : undefined}
          />
          <BeyazTahta
            onApi={(yeniApi) => {
              apiRef.current = yeniApi;
              setApi(yeniApi);
            }}
            tema={tema}
            onTemaDegistir={() => setTema((t) => (t === "dark" ? "light" : "dark"))}
          />
          <KalemKatmani apiRef={apiRef} canliRef={oynatici.canliRef} />
          {!oynatici.sahneler.length && !yukleniyor && <BosTahtaIpucu kitapVar={uniteler.length > 0} />}
          {yukleniyor && <TahtaYukleniyor metin={yukleniyor} />}
          {oynatici.gorev && (
            <GorevKarti
              gorev={oynatici.gorev}
              sonuc={gorevSonuc}
              onGec={() => {
                setGorevSonuc(null);
                oynatici.gorevTamamla();
              }}
            />
          )}
          {test && konu && (
            <MiniTest baslik={konu.baslik} sorular={test} onKapat={() => setTest(null)} onTahtadaAcikla={testiTahtadaAcikla} />
          )}
        </div>
        <AltPanel
          miniSoru={aktifSahne?.miniSoru ?? null}
          soruBekliyor={oynatici.soruBekliyor}
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
