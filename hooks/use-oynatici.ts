"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { sahneyeOdaklan, tahtayaEkle } from "@/lib/tahta-cizim";
import type { Sahne } from "@/lib/types";

type Secenekler = {
  apiRef: RefObject<ExcalidrawImperativeAPI | null>;
  sesAcik: boolean;
  onSahne: (sahne: Sahne, sira: number) => void;
};

function cumlelereBol(metin: string) {
  const parcalar = metin.match(/[^.!?…]+[.!?…]*\s*/g) ?? [metin];
  const sonuc: string[] = [];
  let tampon = "";
  for (const p of parcalar) {
    if ((tampon + p).length > 220 && tampon) {
      sonuc.push(tampon.trim());
      tampon = "";
    }
    tampon += p;
  }
  if (tampon.trim()) sonuc.push(tampon.trim());
  return sonuc;
}

function turkceSes() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const sesler = window.speechSynthesis.getVoices();
  return sesler.find((s) => s.lang === "tr-TR") ?? sesler.find((s) => s.lang.startsWith("tr")) ?? null;
}

export function useOynatici({ apiRef, sesAcik, onSahne }: Secenekler) {
  const [sahneler, setSahneler] = useState<Sahne[]>([]);
  const [aktif, setAktif] = useState(-1);
  const [oynatiliyor, setOynatiliyor] = useState(false);
  const [soruBekliyor, setSoruBekliyor] = useState(false);
  const [konusuyor, setKonusuyor] = useState(false);

  const sahnelerRef = useRef<Sahne[]>([]);
  const aktifRef = useRef(-1);
  const oynatiliyorRef = useRef(false);
  const sesAcikRef = useRef(sesAcik);
  const oturumRef = useRef(0);
  const zamanlayiciRef = useRef<number | null>(null);
  const cizilenRef = useRef(new Map<number, string[]>());
  const onSahneRef = useRef(onSahne);
  const sahneBittiRef = useRef(false);
  const sahneyeGitRef = useRef<(sira: number) => void>(() => {});

  useEffect(() => {
    onSahneRef.current = onSahne;
  }, [onSahne]);

  const sesiKes = useCallback(() => {
    if (zamanlayiciRef.current !== null) {
      window.clearTimeout(zamanlayiciRef.current);
      zamanlayiciRef.current = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setKonusuyor(false);
  }, []);

  const seslendir = useCallback(
    (metin: string, bitti: () => void) => {
      const oturum = oturumRef.current;
      const gecerli = () => oturum === oturumRef.current;
      setKonusuyor(true);
      const tamam = () => {
        if (!gecerli()) return;
        setKonusuyor(false);
        bitti();
      };

      if (sesAcikRef.current && "speechSynthesis" in window) {
        const parcalar = cumlelereBol(metin);
        const ses = turkceSes();
        let sira = 0;
        const sonraki = () => {
          if (!gecerli()) return;
          if (sira >= parcalar.length) return tamam();
          const soz = new SpeechSynthesisUtterance(parcalar[sira++]);
          soz.lang = "tr-TR";
          if (ses) soz.voice = ses;
          soz.rate = 1;
          soz.onend = sonraki;
          soz.onerror = (e) => {
            if (e.error === "interrupted" || e.error === "canceled") return;
            sonraki();
          };
          window.speechSynthesis.speak(soz);
        };
        sonraki();
        return;
      }

      const kelime = metin.split(/\s+/).length;
      zamanlayiciRef.current = window.setTimeout(tamam, Math.max(3500, kelime * 380));
    },
    [],
  );

  const sahneyeGit = useCallback(
    (sira: number) => {
      const liste = sahnelerRef.current;
      const sahne = liste[sira];
      if (!sahne) return;
      oturumRef.current++;
      sesiKes();
      aktifRef.current = sira;
      setAktif(sira);
      setSoruBekliyor(false);
      sahneBittiRef.current = false;
      onSahneRef.current(sahne, sira);

      const api = apiRef.current;
      if (api) {
        const cizilen = cizilenRef.current.get(sira);
        if (cizilen) sahneyeOdaklan(api, cizilen);
        else cizilenRef.current.set(sira, tahtayaEkle(api, sahne.elemanlar, `${sira + 1}. ${sahne.baslik}`));
      }

      if (!oynatiliyorRef.current) return;
      const okunacak = sahne.miniSoru
        ? `${sahne.anlatimMetni} Şimdi sana bir soru: ${sahne.miniSoru}`
        : sahne.anlatimMetni;
      seslendir(okunacak, () => {
        sahneBittiRef.current = true;
        if (sahne.miniSoru) {
          oynatiliyorRef.current = false;
          setOynatiliyor(false);
          setSoruBekliyor(true);
          return;
        }
        if (sira + 1 < sahnelerRef.current.length) {
          sahneyeGitRef.current(sira + 1);
        } else {
          oynatiliyorRef.current = false;
          setOynatiliyor(false);
        }
      });
    },
    [apiRef, seslendir, sesiKes],
  );

  useEffect(() => {
    sahneyeGitRef.current = sahneyeGit;
  }, [sahneyeGit]);

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
    if (mevcut < 0) return sahneyeGit(0);
    if (sahneBittiRef.current && mevcut + 1 < liste.length) return sahneyeGit(mevcut + 1);
    sahneyeGit(mevcut);
  }, [sahneyeGit]);

  const sonraki = useCallback(() => {
    if (aktifRef.current + 1 < sahnelerRef.current.length) sahneyeGit(aktifRef.current + 1);
  }, [sahneyeGit]);

  const onceki = useCallback(() => {
    if (aktifRef.current > 0) sahneyeGit(aktifRef.current - 1);
  }, [sahneyeGit]);

  const yukle = useCallback(
    (yeni: Sahne[], hemenOynat = true) => {
      duraklat();
      cizilenRef.current = new Map();
      sahnelerRef.current = yeni;
      setSahneler(yeni);
      aktifRef.current = -1;
      setAktif(-1);
      setSoruBekliyor(false);
      if (yeni.length && hemenOynat) {
        oynatiliyorRef.current = true;
        setOynatiliyor(true);
        sahneyeGit(0);
      }
    },
    [duraklat, sahneyeGit],
  );

  const tahtayiTemizle = useCallback(() => {
    duraklat();
    apiRef.current?.updateScene({ elements: [] });
    cizilenRef.current = new Map();
    aktifRef.current = -1;
    setAktif(-1);
    setSoruBekliyor(false);
  }, [apiRef, duraklat]);

  const konus = useCallback(
    (metin: string) => {
      duraklat();
      if (sesAcikRef.current) seslendir(metin, () => {});
    },
    [duraklat, seslendir],
  );

  useEffect(() => {
    sesAcikRef.current = sesAcik;
    if (!sesAcik) {
      if (oynatiliyorRef.current && aktifRef.current >= 0) sahneyeGit(aktifRef.current);
      else sesiKes();
    }
  }, [sesAcik, sahneyeGit, sesiKes]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.getVoices();
    return () => window.speechSynthesis.cancel();
  }, []);

  return {
    sahneler,
    aktif,
    oynatiliyor,
    soruBekliyor,
    konusuyor,
    yukle,
    oynat,
    duraklat,
    sonraki,
    onceki,
    tahtayiTemizle,
    konus,
  };
}
