"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { CaptureUpdateAction, convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import {
  baslikIskeleti,
  cizimPlaniOlustur,
  elemanlarinSiniri,
  iskeletiDonustur,
  planiUygula,
  sahneAlaniAc,
  sahneAlaninaOdaklan,
  sahneyeOdaklan,
  vurusuHazirla,
  type SahneBaglami,
} from "@/lib/tahta-cizim";
import type { Sahne, Vurus } from "@/lib/types";

export type CanliKatman = {
  kalem: { x: number; y: number } | null;
  vurgu: { x: number; y: number; w: number; h: number; bitis: number } | null;
};

type Secenekler = {
  apiRef: RefObject<ExcalidrawImperativeAPI | null>;
  sesAcik: boolean;
  hiz: number;
  onSahne: (sahne: Sahne, sira: number) => void;
  onVurus: (sahne: Sahne, vurus: Vurus, sira: number) => void;
};

type SahneDurumu = {
  baglam: SahneBaglami;
  cizilen: number;
  idler: string[];
};

const KELIME_MS = 430;

function cumlelereBol(metin: string) {
  const parcalar = metin.match(/[^.!?…]+[.!?…]*\s*/g) ?? [metin];
  const sonuc: string[] = [];
  let tampon = "";
  for (const p of parcalar) {
    if ((tampon + p).length > 200 && tampon) {
      sonuc.push(tampon);
      tampon = "";
    }
    tampon += p;
  }
  if (tampon.trim()) sonuc.push(tampon);
  return sonuc;
}

function turkceSes() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const sesler = window.speechSynthesis.getVoices();
  return sesler.find((s) => s.lang === "tr-TR") ?? sesler.find((s) => s.lang.startsWith("tr")) ?? null;
}

const tahminiSure = (metin: string, hiz: number) =>
  (Math.max(1, metin.trim().split(/\s+/).filter(Boolean).length) * KELIME_MS) / hiz;

const bekle = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

export function useOynatici({ apiRef, sesAcik, hiz, onSahne, onVurus }: Secenekler) {
  const [sahneler, setSahneler] = useState<Sahne[]>([]);
  const [aktif, setAktif] = useState(-1);
  const [aktifVurus, setAktifVurus] = useState(-1);
  const [oynatiliyor, setOynatiliyor] = useState(false);
  const [soruBekliyor, setSoruBekliyor] = useState(false);
  const [konusuyor, setKonusuyor] = useState(false);
  const [bitti, setBitti] = useState(false);

  const canliRef = useRef<CanliKatman>({ kalem: null, vurgu: null });
  const sahnelerRef = useRef<Sahne[]>([]);
  const aktifRef = useRef(-1);
  const aktifVurusRef = useRef(0);
  const oynatiliyorRef = useRef(false);
  const sesAcikRef = useRef(sesAcik);
  const hizRef = useRef(hiz);
  const oturumRef = useRef(0);
  const nesilRef = useRef(0);
  const durumlarRef = useRef(new Map<number, SahneDurumu>());
  const hazirlikRef = useRef(new WeakMap<Vurus, ReturnType<typeof vurusuHazirla>>());
  const sahneBittiRef = useRef(false);
  const onSahneRef = useRef(onSahne);
  const onVurusRef = useRef(onVurus);
  const sahneyiOynatRef = useRef<(sira: number) => void>(() => {});

  useEffect(() => {
    onSahneRef.current = onSahne;
    onVurusRef.current = onVurus;
  }, [onSahne, onVurus]);

  useEffect(() => {
    hizRef.current = hiz;
  }, [hiz]);

  const sesiKes = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    canliRef.current.kalem = null;
    setKonusuyor(false);
  }, []);

  const seslendir = useCallback((metin: string, oturum: number, onIlerleme: (oran: number) => void) => {
    return new Promise<void>((resolve) => {
      const gecerli = () => oturum === oturumRef.current;
      const sure = tahminiSure(metin, hizRef.current);
      let bittiMi = false;
      const tamam = () => {
        if (bittiMi) return;
        bittiMi = true;
        window.clearTimeout(guvenlik);
        resolve();
      };
      const guvenlik = window.setTimeout(tamam, sure * 2.5 + 6000);

      if (!metin.trim()) return tamam();
      if (!sesAcikRef.current || !("speechSynthesis" in window)) {
        window.clearTimeout(guvenlik);
        window.setTimeout(tamam, sure);
        return;
      }

      const parcalar = cumlelereBol(metin);
      const ses = turkceSes();
      const toplam = metin.length;
      let ofset = 0;
      let sira = 0;
      const sonraki = () => {
        if (!gecerli()) return tamam();
        if (sira >= parcalar.length) return tamam();
        const parca = parcalar[sira++];
        const baslangic = ofset;
        ofset += parca.length;
        const soz = new SpeechSynthesisUtterance(parca);
        soz.lang = "tr-TR";
        if (ses) soz.voice = ses;
        soz.rate = hizRef.current;
        soz.onboundary = (e) => {
          if (gecerli()) onIlerleme((baslangic + e.charIndex + (e.charLength || 0)) / toplam);
        };
        soz.onend = sonraki;
        soz.onerror = (e) => {
          if (e.error === "interrupted" || e.error === "canceled") return tamam();
          sonraki();
        };
        window.speechSynthesis.speak(soz);
      };
      sonraki();
    });
  }, []);

  const hazirla = useCallback((vurus: Vurus, baglam: SahneBaglami) => {
    let soz = hazirlikRef.current.get(vurus);
    if (!soz) {
      soz = vurusuHazirla(vurus.elemanlar, baglam);
      hazirlikRef.current.set(vurus, soz);
    }
    return soz;
  }, []);

  const vurguGoster = useCallback(
    (vurus: Vurus, baglam: SahneBaglami) => {
      const api = apiRef.current;
      if (!api || !vurus.vurgulananId) return;
      const idler = baglam.idHaritasi.get(vurus.vurgulananId);
      const sinir = idler ? elemanlarinSiniri(api, idler) : null;
      if (sinir) canliRef.current.vurgu = { ...sinir, bitis: performance.now() + 2600 / hizRef.current };
    },
    [apiRef],
  );

  const gorunumuAyarla = useCallback((api: ExcalidrawImperativeAPI, durum: SahneDurumu, yeni: ExcalidrawElement[]) => {
    if (!yeni.length) return;
    const st = api.getAppState();
    const z = st.zoom.value;
    const sol = -st.scrollX;
    const ust = -st.scrollY;
    const sag = sol + st.width / z;
    const alt = ust + st.height / z;
    const disarida = yeni.some((e) => e.x < sol || e.y < ust || e.x + e.width > sag || e.y + e.height > alt);
    if (!disarida) return;
    const kume = new Set(durum.idler);
    sahneAlaninaOdaklan(api, durum.baglam, [...api.getSceneElements().filter((e) => kume.has(e.id)), ...yeni]);
  }, []);

  const vurusuCiz = useCallback(
    async (vurus: Vurus, durum: SahneDurumu, oturum: number, sesli: boolean) => {
      const api = apiRef.current;
      if (!api) return;
      const nesil = nesilRef.current;
      const hazir = await hazirla(vurus, durum.baglam);
      if (nesil !== nesilRef.current) return;
      if (hazir.dosyalar.length) api.addFiles(hazir.dosyalar);
      const elemanlar = iskeletiDonustur(hazir, durum.baglam);
      durum.idler.push(...elemanlar.map((e) => e.id));
      const plan = cizimPlaniOlustur(elemanlar);
      gorunumuAyarla(api, durum, elemanlar);
      vurguGoster(vurus, durum.baglam);

      if (!sesli || oturum !== oturumRef.current) {
        if (plan.parcalar.length) planiUygula(api, plan, 1);
        return;
      }

      setKonusuyor(true);
      const sure = Math.max(vurus.animasyonSuresiMs ?? 0, tahminiSure(vurus.konusmaMetni, 1)) / hizRef.current;
      let sinirIlerleme = 0;
      let konusmaBitti = false;
      let konusmaBitisZamani = 0;
      const baslangic = performance.now();

      const cizim = new Promise<void>((resolve) => {
        if (!plan.parcalar.length) return resolve();
        const kare = (simdi: number) => {
          if (oturum !== oturumRef.current) {
            planiUygula(api, plan, 1);
            canliRef.current.kalem = null;
            return resolve();
          }
          const zamanIlerleme = (simdi - baslangic) / (sure * 0.85);
          let p = Math.max(zamanIlerleme, sinirIlerleme * 1.08);
          if (konusmaBitti) p = Math.max(p, (simdi - konusmaBitisZamani) / 350);
          p = Math.min(1, p);
          const uc = planiUygula(api, plan, p);
          canliRef.current.kalem = uc;
          if (p >= 1) {
            canliRef.current.kalem = null;
            return resolve();
          }
          requestAnimationFrame(kare);
        };
        requestAnimationFrame(kare);
      });

      const konusma = seslendir(vurus.konusmaMetni, oturum, (oran) => {
        sinirIlerleme = Math.max(sinirIlerleme, oran);
      }).then(() => {
        konusmaBitti = true;
        konusmaBitisZamani = performance.now();
      });

      await Promise.all([cizim, konusma]);
      if (oturum === oturumRef.current) setKonusuyor(false);
    },
    [apiRef, hazirla, seslendir, vurguGoster, gorunumuAyarla],
  );

  const sahneDurumuAl = useCallback(
    (sahne: Sahne, sira: number, baslik: string, hazirBaglam?: SahneBaglami): SahneDurumu | null => {
      const api = apiRef.current;
      if (!api) return null;
      const mevcut = sira >= 0 ? durumlarRef.current.get(sira) : undefined;
      if (mevcut) return mevcut;
      const baglam = hazirBaglam ?? sahneAlaniAc(api, baslik);
      const baslikElemanlari = hazirBaglam
        ? []
        : (convertToExcalidrawElements([baslikIskeleti(baglam, baslik)], { regenerateIds: true }) as ExcalidrawElement[]);
      if (baslikElemanlari.length) {
        api.updateScene({
          elements: [...api.getSceneElements(), ...baslikElemanlari],
          captureUpdate: CaptureUpdateAction.IMMEDIATELY,
        });
        sahneAlaninaOdaklan(api, baglam, baslikElemanlari);
      }
      const durum: SahneDurumu = { baglam, cizilen: 0, idler: baslikElemanlari.map((e) => e.id) };
      if (sira >= 0) durumlarRef.current.set(sira, durum);
      for (const v of sahne.vuruslar.slice(0, 2)) hazirla(v, baglam);
      return durum;
    },
    [apiRef, hazirla],
  );

  const vuruslariOynat = useCallback(
    async (sahne: Sahne, durum: SahneDurumu, baslangicVurus: number, oturum: number, sira: number) => {
      for (let i = baslangicVurus; i < sahne.vuruslar.length; i++) {
        if (oturum !== oturumRef.current) return false;
        const vurus = sahne.vuruslar[i];
        aktifVurusRef.current = i;
        setAktifVurus(i);
        onVurusRef.current(sahne, vurus, sira);
        const sonrakiVurus = sahne.vuruslar[i + 1];
        if (sonrakiVurus) hazirla(sonrakiVurus, durum.baglam);
        if (i < durum.cizilen) {
          vurguGoster(vurus, durum.baglam);
          setKonusuyor(true);
          await seslendir(vurus.konusmaMetni, oturum, () => {});
          if (oturum === oturumRef.current) setKonusuyor(false);
        } else {
          await vurusuCiz(vurus, durum, oturum, true);
          durum.cizilen = Math.max(durum.cizilen, i + 1);
        }
      }
      return oturum === oturumRef.current;
    },
    [hazirla, seslendir, vurguGoster, vurusuCiz],
  );

  const sessizCiz = useCallback(
    async (sahne: Sahne, durum: SahneDurumu, oturum: number) => {
      for (let i = durum.cizilen; i < sahne.vuruslar.length; i++) {
        await vurusuCiz(sahne.vuruslar[i], durum, oturum, false);
        if (oturum !== oturumRef.current) return;
        durum.cizilen = i + 1;
      }
    },
    [vurusuCiz],
  );

  const sahneyiOynat = useCallback(
    async (sira: number, baslangicVurus = 0) => {
      const sahne = sahnelerRef.current[sira];
      const api = apiRef.current;
      if (!sahne || !api) return;
      const oturum = ++oturumRef.current;
      sesiKes();
      aktifRef.current = sira;
      setAktif(sira);
      setSoruBekliyor(false);
      setBitti(false);
      sahneBittiRef.current = false;
      onSahneRef.current(sahne, sira);

      const durum = sahneDurumuAl(sahne, sira, `${sira + 1}. ${sahne.baslik}`);
      if (!durum) return;

      if (!oynatiliyorRef.current) {
        aktifVurusRef.current = 0;
        setAktifVurus(-1);
        if (durum.cizilen >= sahne.vuruslar.length) sahneyeOdaklan(api, durum.idler);
        else await sessizCiz(sahne, durum, oturum);
        return;
      }

      const tamam = await vuruslariOynat(sahne, durum, baslangicVurus, oturum, sira);
      if (!tamam) return;
      sahneBittiRef.current = true;
      aktifVurusRef.current = 0;

      if (sahne.miniSoru) {
        setKonusuyor(true);
        await seslendir(`Şimdi sana bir soru: ${sahne.miniSoru}`, oturum, () => {});
        if (oturum !== oturumRef.current) return;
        setKonusuyor(false);
        oynatiliyorRef.current = false;
        setOynatiliyor(false);
        setSoruBekliyor(true);
        if (sira === sahnelerRef.current.length - 1) setBitti(true);
        return;
      }
      if (sira + 1 < sahnelerRef.current.length) {
        await bekle(350 / hizRef.current);
        if (oturum === oturumRef.current) sahneyiOynatRef.current(sira + 1);
      } else {
        oynatiliyorRef.current = false;
        setOynatiliyor(false);
        setBitti(true);
      }
    },
    [apiRef, sesiKes, sahneDurumuAl, sessizCiz, vuruslariOynat, seslendir],
  );

  useEffect(() => {
    sahneyiOynatRef.current = sahneyiOynat;
  }, [sahneyiOynat]);

  const duraklat = useCallback(() => {
    oturumRef.current++;
    oynatiliyorRef.current = false;
    setOynatiliyor(false);
    sesiKes();
  }, [sesiKes]);

  const oynat = useCallback(() => {
    const liste = sahnelerRef.current;
    if (liste.length === 0) return;
    oynatiliyorRef.current = true;
    setOynatiliyor(true);
    const mevcut = aktifRef.current;
    if (mevcut < 0) return void sahneyiOynat(0);
    if (sahneBittiRef.current) {
      if (mevcut + 1 < liste.length) return void sahneyiOynat(mevcut + 1);
      return void sahneyiOynat(mevcut, 0);
    }
    void sahneyiOynat(mevcut, aktifVurusRef.current);
  }, [sahneyiOynat]);

  const sonraki = useCallback(() => {
    if (aktifRef.current + 1 < sahnelerRef.current.length) void sahneyiOynat(aktifRef.current + 1);
  }, [sahneyiOynat]);

  const onceki = useCallback(() => {
    if (aktifRef.current > 0) void sahneyiOynat(aktifRef.current - 1);
  }, [sahneyiOynat]);

  const sifirlaDurum = useCallback(() => {
    nesilRef.current++;
    durumlarRef.current = new Map();
    hazirlikRef.current = new WeakMap();
    aktifRef.current = -1;
    aktifVurusRef.current = 0;
    sahneBittiRef.current = false;
    setAktif(-1);
    setAktifVurus(-1);
    setSoruBekliyor(false);
    setBitti(false);
  }, []);

  const yukle = useCallback(
    (yeni: Sahne[], hemenOynat = true) => {
      duraklat();
      sifirlaDurum();
      sahnelerRef.current = yeni;
      setSahneler(yeni);
      if (yeni.length && hemenOynat) {
        oynatiliyorRef.current = true;
        setOynatiliyor(true);
        void sahneyiOynat(0);
      }
    },
    [duraklat, sifirlaDurum, sahneyiOynat],
  );

  const tahtayiTemizle = useCallback(() => {
    duraklat();
    apiRef.current?.updateScene({ elements: [], captureUpdate: CaptureUpdateAction.IMMEDIATELY });
    sifirlaDurum();
  }, [apiRef, duraklat, sifirlaDurum]);

  const ekSahneOynat = useCallback(
    async (sahne: Sahne, hazirBaglam?: SahneBaglami) => {
      duraklat();
      const oturum = oturumRef.current;
      const durum = sahneDurumuAl(sahne, -1, sahne.baslik, hazirBaglam);
      if (!durum) return;
      for (const v of sahne.vuruslar.slice(0, 2)) hazirla(v, durum.baglam);
      for (let i = 0; i < sahne.vuruslar.length; i++) {
        if (oturum !== oturumRef.current) {
          await sessizCiz(sahne, durum, oturumRef.current);
          return;
        }
        onVurusRef.current(sahne, sahne.vuruslar[i], -1);
        if (sahne.vuruslar[i + 1]) hazirla(sahne.vuruslar[i + 1], durum.baglam);
        await vurusuCiz(sahne.vuruslar[i], durum, oturum, true);
        durum.cizilen = i + 1;
      }
    },
    [duraklat, sahneDurumuAl, hazirla, vurusuCiz, sessizCiz],
  );

  useEffect(() => {
    sesAcikRef.current = sesAcik;
    if (!sesAcik && typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, [sesAcik]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.getVoices();
    return () => window.speechSynthesis.cancel();
  }, []);

  return {
    canliRef,
    sahneler,
    aktif,
    aktifVurus,
    oynatiliyor,
    soruBekliyor,
    konusuyor,
    bitti,
    yukle,
    oynat,
    duraklat,
    sonraki,
    onceki,
    tahtayiTemizle,
    ekSahneOynat,
  };
}
