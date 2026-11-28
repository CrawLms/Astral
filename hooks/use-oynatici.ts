"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { CaptureUpdateAction } from "@excalidraw/excalidraw";
import { alanY, ilerlemeDeposuOlustur, renkCoz, sahneyeOdaklan, yerlesim } from "@/lib/ogretmen-cizim";
import { vurusKatmani, type CevapSonrasi, type MiniGorev, type Sahne, type Vurus } from "@/lib/types";

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

const KELIME_MS = 400;
const bekle = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
const tahminiSure = (metin: string, hiz: number) => Math.max(1400, metin.trim().split(/\s+/).filter(Boolean).length * KELIME_MS) / hiz;

function turkceSes() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const sesler = window.speechSynthesis.getVoices();
  return sesler.find((s) => s.lang === "tr-TR") ?? sesler.find((s) => s.lang.startsWith("tr")) ?? null;
}

function latexOnYukle(vurus: Vurus | undefined) {
  for (const a of vurus?.aksiyonlar ?? []) {
    if (a.tip === "formul_ve_not" && a.latex) void import("@/components/ogretmen-sahnesi").then((m) => m.latexHazirla(a.latex!, renkCoz(a.renk, "#7048e8")));
  }
}

export function useOynatici({ apiRef, sesAcik, hiz, onSahne, onVurus }: Secenekler) {
  const [sahneler, setSahneler] = useState<Sahne[]>([]);
  const [aktif, setAktif] = useState(-1);
  const [aktifVurus, setAktifVurus] = useState(0);
  const [oynatiliyor, setOynatiliyor] = useState(false);
  const [soruBekliyor, setSoruBekliyor] = useState(false);
  const [gorev, setGorev] = useState<MiniGorev | null>(null);
  const [konusuyor, setKonusuyor] = useState(false);
  const [bitti, setBitti] = useState(false);
  const [ilerleme] = useState(ilerlemeDeposuOlustur);

  const canliRef = useRef<CanliKatman>({ kalem: null, vurgu: null });
  const playbackTokenRef = useRef(0);
  const rafRef = useRef(0);
  const sahnelerRef = useRef<Sahne[]>([]);
  const aktifRef = useRef(-1);
  const aktifVurusRef = useRef(0);
  const sahneBittiRef = useRef(false);
  const sesAcikRef = useRef(sesAcik);
  const hizRef = useRef(hiz);
  const onSahneRef = useRef(onSahne);
  const onVurusRef = useRef(onVurus);
  const sahneyiOynatRef = useRef<(sira: number, baslangic?: number) => void>(() => {});

  useEffect(() => {
    onSahneRef.current = onSahne;
    onVurusRef.current = onVurus;
  }, [onSahne, onVurus]);
  useEffect(() => {
    hizRef.current = hiz;
  }, [hiz]);
  useEffect(() => {
    sesAcikRef.current = sesAcik;
    if (!sesAcik && typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, [sesAcik]);

  const durdur = useCallback(() => {
    playbackTokenRef.current++;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    cancelAnimationFrame(rafRef.current);
    canliRef.current.kalem = null;
    setKonusuyor(false);
  }, []);

  const seslendir = useCallback((metin: string, token: number, onIlerleme: (oran: number) => void) => {
    return new Promise<void>((resolve) => {
      let bitti = false;
      const tamam = () => {
        if (bitti) return;
        bitti = true;
        window.clearTimeout(guvenlik);
        resolve();
      };
      const sure = tahminiSure(metin, hizRef.current);
      const guvenlik = window.setTimeout(tamam, sure * 2.5 + 5000);
      if (!metin.trim() || token !== playbackTokenRef.current) return tamam();
      const soz = new SpeechSynthesisUtterance(metin);
      soz.lang = "tr-TR";
      const ses = turkceSes();
      if (ses) soz.voice = ses;
      soz.rate = hizRef.current;
      soz.onboundary = (e) => {
        if (token === playbackTokenRef.current) onIlerleme((e.charIndex + (e.charLength || 0)) / metin.length);
      };
      soz.onend = tamam;
      soz.onerror = tamam;
      window.speechSynthesis.speak(soz);
    });
  }, []);

  const konus = useCallback(
    async (metin: string, token: number) => {
      if (!sesAcikRef.current || !("speechSynthesis" in window)) return;
      setKonusuyor(true);
      await seslendir(metin, token, () => {});
      if (token === playbackTokenRef.current) setKonusuyor(false);
    },
    [seslendir],
  );

  const vurusuOynat = useCallback(
    async (vurus: Vurus, token: number) => {
      const sesli = sesAcikRef.current && "speechSynthesis" in window && Boolean(vurus.soz.trim());
      const sure = tahminiSure(vurus.soz, hizRef.current);
      const baslangic = performance.now();
      let sinir = 0;
      let konusmaBitti = !sesli;
      let bitisZamani = 0;
      let bitisP = 0;
      let sonP = 0;
      setKonusuyor(sesli);

      const konusma = sesli
        ? seslendir(vurus.soz, token, (oran) => {
            sinir = Math.max(sinir, oran);
          }).then(() => {
            konusmaBitti = true;
            bitisZamani = performance.now();
            bitisP = sonP;
          })
        : Promise.resolve();

      const cizim = new Promise<void>((resolve) => {
        const kare = (simdi: number) => {
          if (token !== playbackTokenRef.current) return resolve();
          const zaman = (simdi - baslangic) / sure;
          let p: number;
          if (!sesli) p = zaman;
          else if (!konusmaBitti) p = Math.min(0.96, Math.max(zaman * 0.92, sinir * 1.04));
          else p = Math.max(bitisP, bitisP + (simdi - bitisZamani) / 350);
          p = Math.min(1, p);
          sonP = p;
          ilerleme.ayarla(p);
          if (p >= 1) return resolve();
          rafRef.current = requestAnimationFrame(kare);
        };
        rafRef.current = requestAnimationFrame(kare);
      });

      await Promise.all([cizim, konusma]);
      if (token === playbackTokenRef.current) setKonusuyor(false);
    },
    [ilerleme, seslendir],
  );

  const vurgula = useCallback((sahne: Sahne, sira: number, vurus: Vurus) => {
    const hedef = vurus.aksiyonlar.find((a) => a.tip === "vurgula");
    if (!hedef) return;
    const blok = yerlesim(sahne, { katman: vurusKatmani(vurus) }).get(hedef.gorsel);
    if (blok) canliRef.current.vurgu = { x: blok.kutu.x, y: alanY(sira) + blok.kutu.y, w: blok.kutu.w, h: blok.kutu.h, bitis: performance.now() + 2600 / hizRef.current };
  }, []);

  const sahneyiOynat = useCallback(
    async (sira: number, baslangicVurus = 0) => {
      const sahne = sahnelerRef.current[sira];
      if (!sahne) return;
      durdur();
      const token = playbackTokenRef.current;
      aktifRef.current = sira;
      aktifVurusRef.current = baslangicVurus;
      sahneBittiRef.current = false;
      setAktif(sira);
      setAktifVurus(baslangicVurus);
      ilerleme.ayarla(0);
      setSoruBekliyor(false);
      setGorev(null);
      setBitti(false);
      setOynatiliyor(true);
      if (apiRef.current) sahneyeOdaklan(apiRef.current, sira);
      onSahneRef.current(sahne, sira);
      latexOnYukle(sahne.vuruslar[baslangicVurus]);

      for (let i = baslangicVurus; i < sahne.vuruslar.length; i++) {
        if (token !== playbackTokenRef.current) return;
        const vurus = sahne.vuruslar[i];
        aktifVurusRef.current = i;
        setAktifVurus(i);
        ilerleme.ayarla(0);
        onVurusRef.current(sahne, vurus, sahne.ek ? -1 : sira);
        latexOnYukle(sahne.vuruslar[i + 1]);
        vurgula(sahne, sira, vurus);
        await vurusuOynat(vurus, token);
      }
      if (token !== playbackTokenRef.current) return;

      aktifVurusRef.current = sahne.vuruslar.length;
      setAktifVurus(sahne.vuruslar.length);
      ilerleme.ayarla(0);
      sahneBittiRef.current = true;
      const son = sira === sahnelerRef.current.length - 1;

      if (sahne.cevaplandi === "bekle") {
        setOynatiliyor(false);
        setSoruBekliyor(Boolean(sahne.miniSoru));
        if (son) setBitti(true);
        return;
      }
      if (sahne.cevaplandi === "gec") {
        if (!son && !sahne.ek) {
          await bekle(700 / hizRef.current);
          if (token === playbackTokenRef.current) sahneyiOynatRef.current(sira + 1);
          return;
        }
        setOynatiliyor(false);
        setBitti(true);
        return;
      }
      if (sahne.miniGorev) {
        setGorev(sahne.miniGorev);
        await konus(`Mini görev: ${sahne.miniGorev.yonerge}`, token);
        if (token !== playbackTokenRef.current) return;
        setOynatiliyor(false);
        return;
      }
      if (sahne.miniSoru) {
        await konus(`Şimdi sana bir soru: ${sahne.miniSoru}`, token);
        if (token !== playbackTokenRef.current) return;
        setOynatiliyor(false);
        setSoruBekliyor(true);
        if (son) setBitti(true);
        return;
      }
      const sonraki = sahnelerRef.current[sira + 1];
      if (sonraki && !sahne.ek) {
        await bekle(450 / hizRef.current);
        if (token === playbackTokenRef.current) sahneyiOynatRef.current(sira + 1);
        return;
      }
      setOynatiliyor(false);
      if (!sahne.ek) setBitti(true);
    },
    [apiRef, durdur, ilerleme, konus, vurgula, vurusuOynat],
  );

  useEffect(() => {
    sahneyiOynatRef.current = sahneyiOynat;
  }, [sahneyiOynat]);

  const duraklat = useCallback(() => {
    durdur();
    setOynatiliyor(false);
  }, [durdur]);

  const oynat = useCallback(() => {
    const liste = sahnelerRef.current;
    if (!liste.length) return;
    const mevcut = aktifRef.current;
    if (mevcut < 0) return void sahneyiOynat(0);
    if (sahneBittiRef.current) return void sahneyiOynat(mevcut + 1 < liste.length ? mevcut + 1 : mevcut);
    void sahneyiOynat(mevcut, aktifVurusRef.current);
  }, [sahneyiOynat]);

  const sahneyeGit = useCallback((sira: number) => void sahneyiOynat(Math.max(0, Math.min(sahnelerRef.current.length - 1, sira))), [sahneyiOynat]);

  const sonraki = useCallback(() => {
    if (aktifRef.current + 1 < sahnelerRef.current.length) void sahneyiOynat(aktifRef.current + 1);
  }, [sahneyiOynat]);

  const onceki = useCallback(() => {
    if (sahnelerRef.current.length) void sahneyiOynat(Math.max(0, aktifRef.current - 1));
  }, [sahneyiOynat]);

  const gorevTamamla = useCallback(() => {
    setGorev(null);
    if (aktifRef.current + 1 < sahnelerRef.current.length) void sahneyiOynat(aktifRef.current + 1);
    else setBitti(true);
  }, [sahneyiOynat]);

  const yukle = useCallback(
    (yeni: Sahne[], hemenOynat = true) => {
      durdur();
      sahnelerRef.current = yeni;
      aktifRef.current = -1;
      aktifVurusRef.current = 0;
      sahneBittiRef.current = false;
      setSahneler(yeni);
      setAktif(-1);
      setAktifVurus(0);
      setSoruBekliyor(false);
      setGorev(null);
      setBitti(false);
      setOynatiliyor(false);
      ilerleme.ayarla(0);
      if (yeni.length && hemenOynat) void sahneyiOynat(0);
    },
    [durdur, ilerleme, sahneyiOynat],
  );

  const ekSahneOynat = useCallback(
    (sahne: Sahne) => {
      const yeni = [...sahnelerRef.current, { ...sahne, ek: true }];
      sahnelerRef.current = yeni;
      setSahneler(yeni);
      void sahneyiOynat(yeni.length - 1);
    },
    [sahneyiOynat],
  );

  const cevabiAnlat = useCallback(
    (cevap: { baslik: string; vuruslar: Vurus[]; fotograf?: string | null }, sonra: CevapSonrasi) => {
      const sira = aktifRef.current;
      const sahne = sahnelerRef.current[sira];
      if (!sahne) {
        ekSahneOynat({ baslik: cevap.baslik, miniSoru: null, vuruslar: cevap.vuruslar, fotograf: cevap.fotograf ?? null });
        return;
      }
      const katman = (sahne.katmanlar?.length ?? 0) + 1;
      const sahneBitti = sahneBittiRef.current;
      const ekleme = sahneBitti ? sahne.vuruslar.length : Math.min(sahne.vuruslar.length, aktifVurusRef.current + 1);
      const cevapVuruslari: Vurus[] = cevap.vuruslar.map((v) => ({
        ...v,
        id: `${v.id}-k${katman}`,
        katman,
        aksiyonlar: v.aksiyonlar.map((a) => ({ ...a, gorsel: `k${katman}-${a.gorsel}` })),
      }));
      const guncel: Sahne = {
        ...sahne,
        vuruslar: [...sahne.vuruslar.slice(0, ekleme), ...cevapVuruslari, ...sahne.vuruslar.slice(ekleme)],
        katmanlar: [...(sahne.katmanlar ?? []), { baslik: cevap.baslik, fotograf: cevap.fotograf ?? null }],
        cevaplandi: sahneBitti ? sonra : sahne.cevaplandi,
      };
      const yeni = sahnelerRef.current.map((s, i) => (i === sira ? guncel : s));
      sahnelerRef.current = yeni;
      setSahneler(yeni);
      void sahneyiOynat(sira, ekleme);
    },
    [ekSahneOynat, sahneyiOynat],
  );

  // Arka planda gelen çizim güncellemelerini uygular. Oynatılmakta olan sahne yarıda değişmesin diye ilk vuruşu
  // geçildiyse atlanır; çağıran taraf sahne değişiminde yeniden dener.
  const sahneleriGuncelle = useCallback((guncelle: (sahne: Sahne, sira: number) => Sahne): Sahne[] | null => {
    let degisti = false;
    const yeni = sahnelerRef.current.map((s, i) => {
      if (i === aktifRef.current && !sahneBittiRef.current && aktifVurusRef.current > 0) return s;
      const g = guncelle(s, i);
      if (g !== s) degisti = true;
      return g;
    });
    if (!degisti) return null;
    sahnelerRef.current = yeni;
    setSahneler(yeni);
    return yeni;
  }, []);

  const tahtayiTemizle = useCallback(() => {
    apiRef.current?.updateScene({ elements: [], captureUpdate: CaptureUpdateAction.IMMEDIATELY });
  }, [apiRef]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.getVoices();
    return () => window.speechSynthesis.cancel();
  }, []);

  return {
    canliRef,
    ilerleme,
    sahneler,
    aktif,
    aktifVurus,
    oynatiliyor,
    soruBekliyor,
    gorev,
    konusuyor,
    bitti,
    yukle,
    oynat,
    duraklat,
    sonraki,
    onceki,
    sahneyeGit,
    gorevTamamla,
    tahtayiTemizle,
    ekSahneOynat,
    cevabiAnlat,
    sahneleriGuncelle,
  };
}
