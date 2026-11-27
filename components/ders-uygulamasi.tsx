"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { KenarCubugu } from "./kenar-cubugu";
import { UstCubuk } from "./ust-cubuk";
import { AltPanel, type OgretmenMesaji } from "./alt-panel";
import { useOynatici } from "@/hooks/use-oynatici";
import { ANAHTARLAR, oku, sil, yaz } from "@/lib/depolama";
import { tahtaGorseliAl, tahtayaEkle } from "@/lib/tahta-cizim";
import type { AnlatYaniti, Sahne, SayfaMetni, SoruYaniti, Unite } from "@/lib/types";

const BeyazTahta = dynamic(() => import("./beyaz-tahta"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Tahta hazırlanıyor…</div>
  ),
});

const VARSAYILAN_MODEL = "gpt-6.1-sol";

type Konu = { baslik: string; uniteId: string | null };

export default function DersUygulamasi() {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [kenarAcik, setKenarAcik] = useState(true);
  const [uniteler, setUniteler] = useState<Unite[]>(() => oku(ANAHTARLAR.uniteler, []));
  const [aktifUniteId, setAktifUniteId] = useState<string | null>(() => oku(ANAHTARLAR.aktifUnite, null));
  const [sayfalar, setSayfalar] = useState<SayfaMetni[]>(() => oku(ANAHTARLAR.sayfalar, []));
  const [kitapAdi, setKitapAdi] = useState<string | null>(() => oku(ANAHTARLAR.kitapAdi, null));
  const [model, setModel] = useState<string>(() => {
    const kayitli = oku<string>(ANAHTARLAR.model, VARSAYILAN_MODEL);
    return kayitli.startsWith("google/") || kayitli.startsWith("openai/") || kayitli.startsWith("anthropic/")
      ? VARSAYILAN_MODEL
      : kayitli;
  });
  const [sesAcik, setSesAcik] = useState<boolean>(() => oku(ANAHTARLAR.ses, true));

  const [konu, setKonu] = useState<Konu | null>(null);
  const [mesaj, setMesaj] = useState<OgretmenMesaji | null>(null);
  const [yukleniyor, setYukleniyor] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const sahneDegisti = useCallback((sahne: Sahne) => {
    setMesaj({ baslik: sahne.baslik, metin: sahne.anlatimMetni, tur: "anlatim" });
  }, []);

  const oynatici = useOynatici({ apiRef, sesAcik, onSahne: sahneDegisti });
  const aktifSahne = oynatici.aktif >= 0 ? oynatici.sahneler[oynatici.aktif] : null;

  useEffect(() => {
    yaz(ANAHTARLAR.uniteler, uniteler);
  }, [uniteler]);
  useEffect(() => {
    yaz(ANAHTARLAR.aktifUnite, aktifUniteId);
  }, [aktifUniteId]);
  useEffect(() => {
    yaz(ANAHTARLAR.model, model);
  }, [model]);
  useEffect(() => {
    yaz(ANAHTARLAR.ses, sesAcik);
  }, [sesAcik]);

  const anlatimIste = useCallback(
    async (yeniKonu: Konu, metin: string, altKonular: string[] = []) => {
      setHata(null);
      setYukleniyor(`"${yeniKonu.baslik}" için tahta anlatımı hazırlanıyor…`);
      oynatici.duraklat();
      try {
        const yanit = await fetch("/api/tahta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "anlat", model, baslik: yeniKonu.baslik, altKonular, metin }),
        });
        const veri = (await yanit.json()) as AnlatYaniti;
        if ("hata" in veri) {
          setHata(veri.hata);
          return;
        }
        setKonu(yeniKonu);
        oynatici.yukle(veri.sahneler);
      } catch {
        setHata("Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.");
      } finally {
        setYukleniyor(null);
      }
    },
    [model, oynatici],
  );

  const uniteyiAnlat = useCallback(
    (unite: Unite) => {
      const metin = sayfalar
        .filter((s) => s.sayfaNo >= unite.sayfaBaslangic && s.sayfaNo <= unite.sayfaBitis && s.metin.trim())
        .map((s) => `[Sayfa ${s.sayfaNo}]\n${s.metin}`)
        .join("\n\n");
      if (!metin) {
        setHata("Bu ünitenin metni bulunamadı. Kitap PDF'ini yeniden yükleyin.");
        return;
      }
      setAktifUniteId(unite.id);
      anlatimIste({ baslik: unite.baslik, uniteId: unite.id }, metin, unite.altKonular);
    },
    [sayfalar, anlatimIste],
  );

  const kitapHazir = useCallback((ad: string, yeniSayfalar: SayfaMetni[], yeniUniteler: Unite[]) => {
    setKitapAdi(ad);
    setSayfalar(yeniSayfalar);
    setUniteler(yeniUniteler);
    setAktifUniteId(yeniUniteler[0]?.id ?? null);
    yaz(ANAHTARLAR.kitapAdi, ad);
    if (!yaz(ANAHTARLAR.sayfalar, yeniSayfalar)) {
      setHata("Kitap metni tarayıcıya kaydedilemedi (depolama dolu). Sayfa yenilenirse PDF'i tekrar yüklemeniz gerekir.");
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
    setMesaj(null);
    sil(ANAHTARLAR.sayfalar);
    sil(ANAHTARLAR.kitapAdi);
  }, [oynatici]);

  const soruGonder = useCallback(
    async (metin: string) => {
      const api = apiRef.current;
      if (!api) return false;
      setHata(null);
      setGonderiliyor(true);
      oynatici.duraklat();
      try {
        const gorsel = await tahtaGorseliAl(api);
        if (!metin && !gorsel) {
          setHata("Göndermek için bir şey yazın veya tahtaya çizin.");
          return false;
        }
        const yanit = await fetch("/api/tahta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "soru",
            model,
            soru: metin,
            gorsel,
            uniteBaslik: konu?.baslik,
            sonAnlatim: aktifSahne?.anlatimMetni,
            miniSoru: aktifSahne?.miniSoru ?? null,
          }),
        });
        const veri = (await yanit.json()) as SoruYaniti;
        if ("hata" in veri) {
          setHata(veri.hata);
          return false;
        }
        setMesaj({ baslik: "Öğretmenin cevabı", metin: veri.aciklama, tur: "cevap" });
        if (veri.elemanlar.length) tahtayaEkle(api, veri.elemanlar, "Öğretmenin açıklaması");
        oynatici.konus(veri.aciklama);
        return true;
      } catch {
        setHata("Soru gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin.");
        return false;
      } finally {
        setGonderiliyor(false);
      }
    },
    [model, konu, aktifSahne, oynatici],
  );

  const tamamlaVeGec = useCallback(() => {
    if (!konu?.uniteId) return;
    const sira = uniteler.findIndex((u) => u.id === konu.uniteId);
    const guncel = uniteler.map((u) => (u.id === konu.uniteId ? { ...u, tamamlandi: true } : u));
    setUniteler(guncel);
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
          oynatiliyor={oynatici.oynatiliyor}
          sesAcik={sesAcik}
          model={model}
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
          onGonder={soruGonder}
          tamamlaGorunur={Boolean(konu?.uniteId) && oynatici.sahneler.length > 0}
          onTamamla={tamamlaVeGec}
        />
      </main>
    </div>
  );
}
