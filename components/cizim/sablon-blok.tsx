"use client";

import { Fragment, useId, useMemo } from "react";
import { IkonCiz } from "@/components/cizim/ikonlar";
import {
  aralikta,
  azHareket,
  bosYereYerlestir,
  Cizgi,
  CokSatirliYazi,
  EL_YAZISI,
  etiketBirlestir,
  etiketNormal,
  Ok,
  parcaIlerlemesi,
  PASTEL_DOLGULAR,
  satirlaraBol,
  sinirla,
  VURGU_RENKLERI,
  Yazi,
  yaziGenisligi,
  yuvarlakKutuYolu,
  type Hizalama,
  type Parca,
  type Sinir,
} from "@/components/cizim/ortak";
import { duzYaziyaCevir } from "@/lib/metin-temizle";
import { renkCoz, type Blok } from "@/lib/ogretmen-cizim";
import type {
  ElektrikDevresiEleman,
  HazirSahneAksiyonu,
  HazirSahneSablon,
  HucreKesitiSablonu,
  HucreOrganeli,
  IkonIzgarasiOge,
  PiramitKatmani,
  TepkimeKabiTanecik,
  TeraziSablonu,
  VennKumesi,
} from "@/lib/types";

const W = 740;

const duz = (m?: string) => duzYaziyaCevir((m ?? "").trim());
const daireYolu = (cx: number, cy: number, r: number) =>
  `M${(cx - r).toFixed(2)} ${cy.toFixed(2)} A${r} ${r} 0 1 0 ${(cx + r).toFixed(2)} ${cy.toFixed(2)} A${r} ${r} 0 1 0 ${(cx - r).toFixed(2)} ${cy.toFixed(2)} Z`;
const cokgenYolu = (noktalar: [number, number][]) =>
  noktalar.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") + " Z";

type Ogeli<T> = { veri: T; p: number };
type SablonAksiyon<S extends HazirSahneSablon["sablon"]> = Extract<HazirSahneAksiyonu, { sablon: S }>;
type SablonParca<S extends HazirSahneSablon["sablon"]> = Parca<SablonAksiyon<S>>;

function parcalariBirlestir<S extends HazirSahneSablon["sablon"]>(parcalar: Parca<HazirSahneAksiyonu>[], sablon: S): SablonParca<S>[] {
  return parcalar.filter((x): x is SablonParca<S> => x.aksiyon.sablon === sablon);
}

function listeIlerlemesi<S extends HazirSahneSablon["sablon"], T>(
  eslesen: SablonParca<S>[],
  al: (s: SablonAksiyon<S>) => T[] | undefined,
  anahtar: (t: T, idx: number) => string,
): Ogeli<T>[] {
  const sonuc: Ogeli<T>[] = [];
  const gorulen = new Set<string>();
  const tekMi = eslesen.length <= 1;

  eslesen.forEach(({ aksiyon, p }, bi) => {
    const bp = sinirla(p);
    const liste = al(aksiyon) ?? [];
    const yeniler: T[] = [];
    liste.forEach((oge, idx) => {
      const k = anahtar(oge, idx);
      if (gorulen.has(k)) return;
      gorulen.add(k);
      yeniler.push(oge);
    });
    const havuzP = bi === 0 && tekMi ? sinirla((bp - 0.22) / 0.78) : bp;
    yeniler.forEach((oge, k) => {
      const op = bi < eslesen.length - 1 ? 1 : parcaIlerlemesi(havuzP, k, yeniler.length);
      sonuc.push({ veri: oge, p: op });
    });
  });

  return sonuc;
}

function nesneBirlestir<T extends Record<string, unknown>>(onceki: T | undefined, sonraki: T | undefined): T | undefined {
  if (!sonraki) return onceki;
  if (!onceki) return { ...sonraki };
  const birlesik: Record<string, unknown> = { ...onceki };
  for (const [k, v] of Object.entries(sonraki)) {
    if (v === undefined) continue;
    if (typeof v === "string" && !v.trim()) continue;
    if (Array.isArray(v)) {
      if (v.length > 0 || !Array.isArray(birlesik[k])) birlesik[k] = v;
      continue;
    }
    if (typeof v === "object" && v !== null && typeof birlesik[k] === "object" && birlesik[k] !== null && !Array.isArray(birlesik[k])) {
      birlesik[k] = nesneBirlestir(birlesik[k] as Record<string, unknown>, v as Record<string, unknown>);
      continue;
    }
    birlesik[k] = v;
  }
  return birlesik as T;
}

function birlesikSablon<S extends HazirSahneSablon["sablon"]>(eslesen: SablonParca<S>[]): SablonAksiyon<S> {
  let sonuc = { ...eslesen[0].aksiyon } as Record<string, unknown>;
  for (let i = 1; i < eslesen.length; i++) {
    sonuc = nesneBirlestir(sonuc, eslesen[i].aksiyon as Record<string, unknown>) ?? sonuc;
  }
  return sonuc as SablonAksiyon<S>;
}

function asamaIlerlemesi<S extends HazirSahneSablon["sablon"]>(eslesen: SablonParca<S>[], ilkOgeSayisi: number) {
  const son = eslesen[eslesen.length - 1];
  const sonP = sinirla(son?.p ?? 0);
  if (eslesen.length > 1) {
    return { temelP: 1, ozetP: sinirla((sonP - 0.35) / 0.65) };
  }
  const ogeVar = ilkOgeSayisi > 0;
  return {
    temelP: ogeVar ? sinirla(sonP * 2.4) : sonP,
    ozetP: sinirla((sonP - 0.68) / 0.32),
  };
}

function sahneBoyutu(kutu: Blok["kutu"], minH = 460) {
  const h = aralikta(Math.round(W * (kutu.h / Math.max(220, kutu.w))), minH, 610);
  const olcek = Math.min(kutu.w / W, kutu.h / h);
  return {
    w: W,
    h,
    olcek,
    baslikBoyut: aralikta(20 / olcek, 17, 25),
    etiketBoyut: aralikta(15.5 / olcek, 13.5, 19.5),
    altBoyut: aralikta(13 / olcek, 11.5, 16),
  };
}

function BaslikSatiri({ baslik, w, boyut, p }: { baslik?: string; w: number; boyut: number; p: number }) {
  const metin = duz(baslik);
  if (!metin || p <= 0) return null;
  const gen = Math.min(w - 60, yaziGenisligi(metin, boyut) + 28);
  return (
    <g>
      <Yazi x={w / 2} y={32} metin={metin} boyut={boyut} renk="#1971c2" hizala="middle" kalin p={p} />
      <Cizgi
        d={`M${(w / 2 - gen / 2).toFixed(1)} 41 L${(w / 2 + gen / 2).toFixed(1)} 41`}
        renk="#a5d8ff"
        kalinlik={2.5}
        p={sinirla((p - 0.25) * 1.4)}
        kalem={false}
      />
    </g>
  );
}

// ============================================================================
// 1. EĞİK DÜZLEM
// ============================================================================

function EgikDuzlemSahne({ parcalar, kutu }: { parcalar: SablonParca<"egik_duzlem">[]; kutu: Blok["kutu"] }) {
  const s = birlesikSablon(parcalar);
  const boyut = sahneBoyutu(kutu, 470);
  const H = boyut.h;
  const aci = aralikta(s.aci ?? 30, 12, 62);
  const rad = (aci * Math.PI) / 180;
  const kuvvetler = listeIlerlemesi(
    parcalar,
    (x) => x.kuvvetler,
    (k, i) => `${k.yon}-${etiketNormal(k.etiket)}-${i}`,
  );
  const { temelP, ozetP } = asamaIlerlemesi(parcalar, kuvvetler.length);

  const yBase = H - 64;
  const maxW = W - 210;
  const maxH = H - 170;
  const rampW = Math.min(maxW, maxH / Math.tan(rad));
  const rampH = rampW * Math.tan(rad);
  const xA = (W - rampW) / 2 - 22;
  const xB = xA + rampW;
  const yC = yBase - rampH;

  const u = { x: Math.cos(rad), y: -Math.sin(rad) };
  const n = { x: -Math.sin(rad), y: -Math.cos(rad) };
  const tBlok = 0.48;
  const pBase = { x: xA + tBlok * rampW, y: yBase - tBlok * rampH };
  const bw = 78;
  const bh = 52;
  const mMerkez = { x: pBase.x + (bh / 2) * n.x, y: pBase.y + (bh / 2) * n.y };

  const blokKoseleri: [number, number][] = [
    [mMerkez.x - (bw / 2) * u.x + (bh / 2) * n.x, mMerkez.y - (bw / 2) * u.y + (bh / 2) * n.y],
    [mMerkez.x + (bw / 2) * u.x + (bh / 2) * n.x, mMerkez.y + (bw / 2) * u.y + (bh / 2) * n.y],
    [mMerkez.x + (bw / 2) * u.x - (bh / 2) * n.x, mMerkez.y + (bw / 2) * u.y - (bh / 2) * n.y],
    [mMerkez.x - (bw / 2) * u.x - (bh / 2) * n.x, mMerkez.y - (bw / 2) * u.y - (bh / 2) * n.y],
  ];

  const rYay = aralikta(rampW * 0.24, 34, 68);
  const yayX = xA + rYay * Math.cos(rad);
  const yayY = yBase - rYay * Math.sin(rad);
  const aciMetni = duz(s.aciEtiketi) || `${aci}°`;

  const sinir: Sinir = { x0: 12, y0: 12, x1: W - 12, y1: H - 12 };
  const engeller: Sinir[] = [
    {
      x0: Math.min(...blokKoseleri.map((c) => c[0])) - 6,
      y0: Math.min(...blokKoseleri.map((c) => c[1])) - 6,
      x1: Math.max(...blokKoseleri.map((c) => c[0])) + 6,
      y1: Math.max(...blokKoseleri.map((c) => c[1])) + 6,
    },
  ];

  const aciEtiketKonum = bosYereYerlestir(
    xA + (rYay + 20) * Math.cos(rad / 2),
    yBase - (rYay + 14) * Math.sin(rad / 2),
    aciMetni,
    boyut.altBoyut,
    "start",
    sinir,
    engeller,
  );
  engeller.push(aciEtiketKonum.kutu);

  const cisimEtiketi = duz(s.cisimEtiketi) || "m";
  const vecLen = aralikta(Math.min(W, H) * 0.23, 84, 114);

  const vektorler = kuvvetler.map(({ veri, p }, i) => {
    let dir = { x: 0, y: 1 };
    let bas = { ...mMerkez };
    let varsayilanRenk: string = VURGU_RENKLERI[0];

    switch (veri.yon) {
      case "agirlik":
        dir = { x: 0, y: 1 };
        varsayilanRenk = "#e03131";
        break;
      case "normal":
        dir = n;
        varsayilanRenk = "#1971c2";
        break;
      case "yukari":
        dir = u;
        varsayilanRenk = "#2f9e44";
        break;
      case "asagi":
        dir = { x: -u.x, y: -u.y };
        varsayilanRenk = "#f08c00";
        break;
      case "surtunme":
        dir = s.hareket === "yukari" ? { x: -u.x, y: -u.y } : u;
        bas = { ...pBase };
        varsayilanRenk = "#7048e8";
        break;
      case "yatay":
        dir = { x: 1, y: 0 };
        varsayilanRenk = "#0c8599";
        break;
    }

    const uzunluk = veri.yon === "agirlik" ? Math.min(vecLen, Math.max(70, yBase + 34 - bas.y)) : vecLen;
    const x2 = bas.x + dir.x * uzunluk;
    const y2 = bas.y + dir.y * uzunluk;
    const renk = renkCoz(veri.renk, varsayilanRenk);
    const etiket = duz(veri.etiket);
    const hizala: Hizalama = dir.x > 0.35 ? "start" : dir.x < -0.35 ? "end" : "middle";
    const yer = etiket
      ? bosYereYerlestir(x2 + dir.x * 16, y2 + dir.y * 16 + (dir.y > 0.5 ? 10 : 0), etiket, boyut.etiketBoyut, hizala, sinir, engeller)
      : null;
    if (yer) engeller.push(yer.kutu);
    return { key: i, x1: bas.x, y1: bas.y, x2, y2, renk, etiket, yer, hizala, p };
  });

  const surtunmeTicks = s.surtunme
    ? Array.from({ length: 10 }, (_, i) => {
        const t = 0.08 + i * 0.09;
        const px = xA + t * rampW;
        const py = yBase - t * rampH;
        return `M${px.toFixed(1)} ${py.toFixed(1)} L${(px - 6 * u.x - 5 * n.x).toFixed(1)} ${(py - 6 * u.y - 5 * n.y).toFixed(1)}`;
      }).join(" ")
    : "";

  const zeminTicks = Array.from({ length: 16 }, (_, i) => {
    const gx = xA - 24 + i * ((rampW + 64) / 15);
    return `M${gx.toFixed(1)} ${yBase} L${(gx - 8).toFixed(1)} ${yBase + 10}`;
  }).join(" ");

  const yukseklikMetni = duz(s.yukseklikEtiketi);
  const uzunlukMetni = duz(s.uzunlukEtiketi);
  const surtunmeMetni = typeof s.surtunme === "string" ? duz(s.surtunme) : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin meet" overflow="hidden">
      <Cizgi
        d={cokgenYolu([
          [xA, yBase],
          [xB, yBase],
          [xB, yC],
        ])}
        renk="#1e293b"
        dolgu="#eef2fb"
        dolguOpaklik={0.85}
        kalinlik={2.6}
        p={temelP}
      />
      <Cizgi d={`M${xA - 32} ${yBase} L${xB + 42} ${yBase} ${zeminTicks}`} renk="#475569" kalinlik={2} p={temelP} kalem={false} />
      <Cizgi d={`M${xB - 14} ${yBase} L${xB - 14} ${yBase - 14} L${xB} ${yBase - 14}`} renk="#475569" kalinlik={1.8} p={temelP} />

      <Cizgi
        d={`M${xA} ${yBase} L${xA + rYay} ${yBase} A${rYay} ${rYay} 0 0 0 ${yayX.toFixed(1)} ${yayY.toFixed(1)} Z`}
        renk="none"
        dolgu="#fff3bf"
        dolguOpaklik={0.85}
        kalinlik={0}
        p={temelP}
        kalem={false}
      />
      <Cizgi d={`M${xA + rYay} ${yBase} A${rYay} ${rYay} 0 0 0 ${yayX.toFixed(1)} ${yayY.toFixed(1)}`} renk="#f08c00" kalinlik={2.2} p={temelP} />
      <Yazi x={aciEtiketKonum.x} y={aciEtiketKonum.y} metin={aciMetni} boyut={boyut.altBoyut} renk="#d97706" kalin p={sinirla((temelP - 0.3) * 1.5)} />

      {surtunmeTicks && <Cizgi d={surtunmeTicks} renk="#7048e8" kalinlik={1.8} p={temelP} kalem={false} />}

      <Cizgi d={cokgenYolu(blokKoseleri)} renk="#1971c2" dolgu="#dbeafe" kalinlik={2.6} p={sinirla((temelP - 0.15) * 1.25)} />

      {yukseklikMetni && temelP > 0.3 && (
        <g>
          <Cizgi d={`M${xB + 26} ${yBase} L${xB + 26} ${yC}`} renk="#64748b" kalinlik={1.8} kesikli p={temelP} />
          <Cizgi d={`M${xB + 20} ${yBase} H${xB + 32} M${xB + 20} ${yC} H${xB + 32}`} renk="#64748b" kalinlik={1.8} p={temelP} kalem={false} />
          <Yazi x={xB + 38} y={(yBase + yC) / 2 + 5} metin={yukseklikMetni} boyut={boyut.altBoyut} renk="#334155" p={ozetP || temelP} />
        </g>
      )}

      {uzunlukMetni && temelP > 0.3 && (
        <g>
          <Cizgi
            d={`M${(xA + 0.16 * rampW - 16 * n.x).toFixed(1)} ${(yBase - 0.16 * rampH - 16 * n.y).toFixed(1)} L${(xA + 0.88 * rampW - 16 * n.x).toFixed(1)} ${(yBase - 0.88 * rampH - 16 * n.y).toFixed(1)}`}
            renk="#64748b"
            kalinlik={1.6}
            kesikli
            p={temelP}
            kalem={false}
          />
          <Yazi
            x={xA + 0.72 * rampW - 30 * n.x}
            y={yBase - 0.72 * rampH - 30 * n.y}
            metin={uzunlukMetni}
            boyut={boyut.altBoyut}
            renk="#334155"
            hizala="middle"
            p={ozetP || temelP}
          />
        </g>
      )}

      {vektorler.map((v) =>
        v.p <= 0 ? null : (
          <g key={v.key}>
            <Ok x1={v.x1} y1={v.y1} x2={v.x2} y2={v.y2} renk={v.renk} kalinlik={2.8} ucBoyutu={11} p={v.p} />
            {v.yer && v.etiket && (
              <Yazi
                x={v.yer.x}
                y={v.yer.y}
                metin={v.etiket}
                boyut={boyut.etiketBoyut}
                renk={v.renk}
                hizala={v.hizala}
                kalin
                p={sinirla((v.p - 0.35) * 1.6)}
              />
            )}
          </g>
        ),
      )}

      <Yazi
        x={mMerkez.x}
        y={mMerkez.y + 5}
        metin={cisimEtiketi}
        boyut={boyut.etiketBoyut}
        renk="#1e293b"
        hizala="middle"
        konturRenk="#dbeafe"
        konturKalinlik={6}
        kalin
        p={sinirla((temelP - 0.45) * 2)}
      />

      {s.hareket && s.hareket !== "durgun" && ozetP > 0 && (
        <g>
          <Ok
            x1={mMerkez.x + 56 * n.x - (s.hareket === "yukari" ? 26 : -26) * u.x}
            y1={mMerkez.y + 56 * n.y - (s.hareket === "yukari" ? 26 : -26) * u.y}
            x2={mMerkez.x + 56 * n.x + (s.hareket === "yukari" ? 30 : -30) * u.x}
            y2={mMerkez.y + 56 * n.y + (s.hareket === "yukari" ? 30 : -30) * u.y}
            renk="#0c8599"
            kalinlik={2.2}
            ucBoyutu={10}
            kesikli
            etiket="v"
            etiketBoyut={boyut.altBoyut}
            p={ozetP}
          />
        </g>
      )}

      {(s.hareket === "durgun" || surtunmeMetni) && ozetP > 0 && (
        <g>
          <Cizgi d={yuvarlakKutuYolu(W - 196, 14, 180, 32, 8)} renk="#ced4da" dolgu="#f8fafc" kalinlik={1.6} p={ozetP} kalem={false} />
          <Yazi
            x={W - 106}
            y={35}
            metin={surtunmeMetni || "Durgun (Dengede)"}
            boyut={boyut.altBoyut}
            renk="#475569"
            hizala="middle"
            konturKalinlik={0}
            p={ozetP}
          />
        </g>
      )}
    </svg>
  );
}

// ============================================================================
// 2. ELEKTRİK DEVRESİ
// ============================================================================

function DevreElemaniCiz({
  eleman,
  cx,
  cy,
  dikey = false,
  ampulYanar,
  varsayilanKapali,
  p,
  boyut,
}: {
  eleman: ElektrikDevresiEleman;
  cx: number;
  cy: number;
  dikey?: boolean;
  ampulYanar: boolean;
  varsayilanKapali: boolean;
  p: number;
  boyut: ReturnType<typeof sahneBoyutu>;
}) {
  if (p <= 0) return null;
  const renk = renkCoz(eleman.renk, "#1e293b");
  const etiket = etiketBirlestir(duz(eleman.etiket), duz(eleman.deger), " = ");
  const kapali = eleman.kapali ?? varsayilanKapali;
  const etiketY = dikey ? cy + 5 : cy - 34;
  const etiketX = dikey ? cx + 34 : cx;
  const etiketHizala = dikey ? "start" : "middle";

  const icerik = (() => {
    switch (eleman.tur) {
      case "pil":
        return (
          <g>
            <Cizgi d="M-28 0 H-6 M6 0 H28" renk="#1e293b" kalinlik={2.4} p={p} />
            <Cizgi d="M-6 -18 V18" renk="#c92a2a" kalinlik={2.6} p={p} />
            <Cizgi d="M6 -10 V10" renk="#1971c2" kalinlik={4.4} p={p} />
            <Yazi x={-16} y={-12} metin="+" boyut={14} renk="#c92a2a" hizala="middle" kalin p={p} kalem={false} />
            <Yazi x={16} y={-12} metin="−" boyut={14} renk="#1971c2" hizala="middle" kalin p={p} kalem={false} />
          </g>
        );
      case "direnc":
        return (
          <g>
            <Cizgi d={yuvarlakKutuYolu(-24, -14, 48, 28, 6)} renk="none" dolgu="#fff4e6" kalinlik={0} p={p} kalem={false} />
            <Cizgi
              d="M-30 0 H-22 L-18 -11 L-10 11 L-2 -11 L6 11 L14 -11 L22 11 L25 0 H30"
              renk={renk}
              kalinlik={2.5}
              p={p}
            />
          </g>
        );
      case "ampul":
        return (
          <g>
            {ampulYanar && (
              <Cizgi
                d="M0 -30 V-24 M-21 -21 L-17 -17 M21 -21 L17 -17 M-30 0 H-24 M30 0 H24"
                renk="#f59f00"
                kalinlik={2.1}
                p={sinirla((p - 0.4) * 1.7)}
                kalem={false}
              />
            )}
            <Cizgi
              d={daireYolu(0, 0, 20)}
              renk={renk}
              dolgu={ampulYanar ? "#fff3bf" : "#f8fafc"}
              kalinlik={2.4}
              p={p}
            />
            <Cizgi d="M-13 -13 L13 13 M-13 13 L13 -13" renk={ampulYanar ? "#e67700" : "#64748b"} kalinlik={2.1} p={p} />
          </g>
        );
      case "anahtar":
        return (
          <g>
            <Cizgi d="M-30 0 H-18 M18 0 H30" renk="#1e293b" kalinlik={2.4} p={p} />
            <Cizgi d={kapali ? "M-18 0 L18 0" : "M-18 -2 L14 -19"} renk="#1971c2" kalinlik={2.8} p={p} />
            <Cizgi d={daireYolu(-18, 0, 4)} renk="#1e293b" dolgu="#ffffff" kalinlik={2.1} p={p} />
            <Cizgi d={daireYolu(18, 0, 4)} renk="#1e293b" dolgu="#ffffff" kalinlik={2.1} p={p} />
          </g>
        );
      case "ampermetre":
      case "voltmetre": {
        const harf = eleman.tur === "ampermetre" ? "A" : "V";
        const dolgu = eleman.tur === "ampermetre" ? "#e7f5ff" : "#f3f0ff";
        const yRenk = eleman.tur === "ampermetre" ? "#1971c2" : "#7048e8";
        return (
          <g>
            <Cizgi d={daireYolu(0, 0, 19)} renk={yRenk} dolgu={dolgu} kalinlik={2.4} p={p} />
            <Yazi x={0} y={6} metin={harf} boyut={18} renk={yRenk} hizala="middle" konturKalinlik={0} kalin p={p} />
          </g>
        );
      }
      case "kondansator":
        return (
          <g>
            <Cizgi d="M-30 0 H-6 M6 0 H30" renk="#1e293b" kalinlik={2.4} p={p} />
            <Cizgi d="M-6 -16 V16 M6 -16 V16" renk={renk} kalinlik={3} p={p} />
          </g>
        );
    }
  })();

  return (
    <g>
      <g transform={`translate(${cx} ${cy})${dikey ? " rotate(90)" : ""}`}>{icerik}</g>
      {etiket && (
        <Yazi
          x={etiketX}
          y={etiketY}
          metin={etiket}
          boyut={boyut.altBoyut}
          renk={renk}
          hizala={etiketHizala}
          kalin
          p={sinirla((p - 0.35) * 1.6)}
        />
      )}
    </g>
  );
}

function ElektrikDevresiSahne({ parcalar, kutu }: { parcalar: SablonParca<"elektrik_devresi">[]; kutu: Blok["kutu"] }) {
  const s = birlesikSablon(parcalar);
  const boyut = sahneBoyutu(kutu, 470);
  const H = boyut.h;
  const elemanlar = listeIlerlemesi(
    parcalar,
    (x) => x.elemanlar,
    (e, i) => `${e.tur}-${e.kol ?? 0}-${etiketNormal(e.etiket)}-${i}`,
  );
  const { temelP, ozetP } = asamaIlerlemesi(parcalar, elemanlar.length);

  const duzen = s.duzen ?? "seri";
  const acikAnahtar = elemanlar.some((e) => e.veri.tur === "anahtar" && e.veri.kapali === false);
  const akimVar = Boolean(s.akimYonu) && !acikAnahtar;
  const akisYon: 1 | -1 = s.akimYonu === "ters" ? -1 : 1;
  const ampulYanar = !acikAnahtar;
  const varsayilanKapali = Boolean(s.akimYonu);

  const leftX = 118;
  const rightX = W - 118;
  const topY = 92;
  const botY = H - 88;
  const kaynakMetni = etiketBirlestir(duz(s.kaynak?.etiket), duz(s.kaynak?.gerilim), " = ");

  const paralelMi = duzen === "paralel" || duzen === "karisik" || elemanlar.some((e) => (e.veri.kol ?? 0) > 0);

  if (paralelMi) {
    const anaKol = elemanlar.filter((e) => duzen === "karisik" && (e.veri.kol ?? 0) === 0 && (e.veri.tur === "anahtar" || e.veri.tur === "ampermetre"));
    const digerleri = elemanlar.filter((e) => !anaKol.includes(e));
    const kolHaritasi = new Map<number, Ogeli<ElektrikDevresiEleman>[]>();
    digerleri.forEach((e, idx) => {
      const k = e.veri.kol ?? idx + 1;
      kolHaritasi.set(k, [...(kolHaritasi.get(k) ?? []), e]);
    });
    const kollar = [...kolHaritasi.values()];
    const splitX = anaKol.length ? leftX + 190 : leftX + 80;
    const endX = rightX - 60;
    const rungSayisi = Math.max(1, kollar.length);
    const rungY = (i: number) => (rungSayisi === 1 ? topY : topY + (i * (botY - topY - 80)) / (rungSayisi - 1));
    const pilY = (topY + botY) / 2;

    const telYol = (x0: number, y0: number, x1: number, y1: number, bosluklar: number[], yatay: boolean) => {
      if (yatay) {
        const sirali = [...bosluklar].sort((a, b) => a - b);
        let cx = x0;
        let d = "";
        for (const bx of sirali) {
          if (bx - 28 > cx) d += `M${cx} ${y0} H${bx - 28} `;
          cx = bx + 28;
        }
        if (x1 > cx) d += `M${cx} ${y0} H${x1}`;
        return d;
      }
      const sirali = [...bosluklar].sort((a, b) => a - b);
      let cy = y0;
      let d = "";
      for (const by of sirali) {
        if (by - 28 > cy) d += `M${x0} ${cy} V${by - 28} `;
        cy = by + 28;
      }
      if (y1 > cy) d += `M${x0} ${cy} V${y1}`;
      return d;
    };

    const anaBosluk = anaKol.map((_, i) => leftX + 55 + ((i + 1) * (splitX - leftX - 70)) / (anaKol.length + 1));
    const altRungY = rungY(rungSayisi - 1);
    const kolTelYollari = kollar.map((liste, ki) => {
      const y = rungY(ki);
      const xs = liste.map((_, j) => splitX + ((j + 1) * (endX - splitX)) / (liste.length + 1));
      return { y, xs, yol: telYol(splitX, y, endX, y, xs, true) };
    });
    const akisTeliYolu = [
      `M${leftX} ${botY} V${pilY + 28} M${leftX} ${pilY - 28} V${topY}`,
      telYol(leftX, topY, splitX, topY, anaBosluk, true),
      rungSayisi > 1 ? `M${splitX} ${topY} V${altRungY}` : "",
      ...kolTelYollari.map((k) => k.yol),
      `M${endX} ${topY} V${botY} H${leftX}`,
    ]
      .filter(Boolean)
      .join(" ");
    const okOrtaX = (splitX + endX) / 2;

    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin meet" overflow="hidden">
        <Cizgi d={telYol(leftX, topY, splitX, topY, anaBosluk, true)} renk="#1e293b" kalinlik={2.6} p={temelP} />
        <Cizgi d={`M${leftX} ${topY} V${pilY - 28} M${leftX} ${pilY + 28} V${botY} H${endX} V${altRungY}`} renk="#1e293b" kalinlik={2.6} p={temelP} />
        {rungSayisi > 1 && (
          <Cizgi d={`M${splitX} ${topY} V${altRungY} M${endX} ${topY} V${altRungY}`} renk="#1e293b" kalinlik={2.6} p={temelP} />
        )}

        <g transform={`translate(${leftX} ${pilY}) rotate(-90)`}>
          <Cizgi d="M-28 0 H-6 M6 0 H28" renk="#1e293b" kalinlik={2.4} p={temelP} />
          <Cizgi d="M6 -18 V18" renk="#c92a2a" kalinlik={2.6} p={temelP} />
          <Cizgi d="M-6 -10 V10" renk="#1971c2" kalinlik={4.4} p={temelP} />
        </g>
        {kaynakMetni && <Yazi x={leftX - 24} y={pilY + 5} metin={kaynakMetni} boyut={boyut.altBoyut} renk="#c92a2a" hizala="end" kalin p={temelP} />}

        {anaKol.map((e, i) => (
          <DevreElemaniCiz
            key={`ana-${i}`}
            eleman={e.veri}
            cx={anaBosluk[i]}
            cy={topY}
            ampulYanar={ampulYanar}
            varsayilanKapali={varsayilanKapali}
            p={e.p}
            boyut={boyut}
          />
        ))}

        {kollar.map((liste, ki) => {
          const { y, xs, yol } = kolTelYollari[ki];
          return (
            <g key={`kol-${ki}`}>
              <Cizgi d={yol} renk="#1e293b" kalinlik={2.6} p={temelP} />
              {rungSayisi > 1 && (
                <>
                  <Cizgi d={daireYolu(splitX, y, 4.2)} renk="#1e293b" dolgu="#1e293b" kalinlik={1} p={temelP} kalem={false} />
                  <Cizgi d={daireYolu(endX, y, 4.2)} renk="#1e293b" dolgu="#1e293b" kalinlik={1} p={temelP} kalem={false} />
                </>
              )}
              {liste.map((e, j) => (
                <DevreElemaniCiz
                  key={`k${ki}-${j}`}
                  eleman={e.veri}
                  cx={xs[j]}
                  cy={y}
                  ampulYanar={ampulYanar}
                  varsayilanKapali={varsayilanKapali}
                  p={e.p}
                  boyut={boyut}
                />
              ))}
            </g>
          );
        })}

        {akimVar && ozetP > 0 && (
          <g>
            <Cizgi
              d={akisTeliYolu}
              renk="#1971c2"
              kalinlik={2.2}
              p={ozetP}
              akis={{ sure: 1.6, yon: akisYon, gecikme: 0 }}
              kalem={false}
            />
            <Ok
              x1={akisYon < 0 ? okOrtaX - 34 : okOrtaX + 34}
              y1={botY + 22}
              x2={akisYon < 0 ? okOrtaX + 34 : okOrtaX - 34}
              y2={botY + 22}
              renk="#1971c2"
              kalinlik={2.4}
              ucBoyutu={9}
              p={ozetP}
            />
            <Yazi x={okOrtaX} y={botY + 42} metin={duz(s.akimEtiketi) || "I"} boyut={boyut.altBoyut} renk="#1971c2" hizala="middle" kalin p={ozetP} />
          </g>
        )}
      </svg>
    );
  }

  // Seri düzen (opsiyonel paralel voltmetre köprüsü destekli)
  const voltmetreler = elemanlar.filter((e) => e.veri.tur === "voltmetre");
  const seriElemanlar = elemanlar.filter((e) => e.veri.tur !== "voltmetre" || elemanlar.length === voltmetreler.length);
  const ustSayi = Math.min(3, seriElemanlar.length);
  const ustListe = seriElemanlar.slice(0, ustSayi);
  const sagListe = seriElemanlar.slice(ustSayi, ustSayi + 1);
  const solListe = seriElemanlar.slice(ustSayi + 1);

  const ustXs = ustListe.map((_, i) => leftX + ((i + 1) * (rightX - leftX)) / (ustListe.length + 1));
  const pilX = W / 2;

  const ustTel = (() => {
    let x = leftX;
    let d = "";
    for (const ux of ustXs) {
      d += `M${x} ${topY} H${ux - 28} `;
      x = ux + 28;
    }
    d += `M${x} ${topY} H${rightX}`;
    return d;
  })();

  const sagTel = sagListe.length
    ? `M${rightX} ${topY} V${(topY + botY) / 2 - 28} M${rightX} ${(topY + botY) / 2 + 28} V${botY}`
    : `M${rightX} ${topY} V${botY}`;
  const solTel = solListe.length
    ? `M${leftX} ${botY} V${(topY + botY) / 2 + 28} M${leftX} ${(topY + botY) / 2 - 28} V${topY}`
    : `M${leftX} ${botY} V${topY}`;
  const altTel = `M${rightX} ${botY} H${pilX + 28} M${pilX - 28} ${botY} H${leftX}`;

  const kaynakPil: ElektrikDevresiEleman = { tur: "pil", etiket: s.kaynak?.etiket, deger: s.kaynak?.gerilim };
  const vHedefX = ustXs[0] ?? W / 2;
  const vBridgeY = topY + 72;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin meet" overflow="hidden">
      <Cizgi d={`${ustTel} ${sagTel} ${altTel} ${solTel}`} renk="#1e293b" kalinlik={2.6} p={temelP} />

      <DevreElemaniCiz eleman={kaynakPil} cx={pilX} cy={botY} ampulYanar={ampulYanar} varsayilanKapali={varsayilanKapali} p={temelP} boyut={boyut} />
      {kaynakMetni && <Yazi x={pilX} y={botY + 34} metin={kaynakMetni} boyut={boyut.altBoyut} renk="#c92a2a" hizala="middle" kalin p={temelP} />}

      {ustListe.map((e, i) => (
        <DevreElemaniCiz
          key={`u-${i}`}
          eleman={e.veri}
          cx={ustXs[i]}
          cy={topY}
          ampulYanar={ampulYanar}
          varsayilanKapali={varsayilanKapali}
          p={e.p}
          boyut={boyut}
        />
      ))}

      {sagListe.map((e, i) => (
        <DevreElemaniCiz
          key={`r-${i}`}
          eleman={e.veri}
          cx={rightX}
          cy={(topY + botY) / 2}
          dikey
          ampulYanar={ampulYanar}
          varsayilanKapali={varsayilanKapali}
          p={e.p}
          boyut={boyut}
        />
      ))}

      {solListe.map((e, i) => (
        <DevreElemaniCiz
          key={`l-${i}`}
          eleman={e.veri}
          cx={leftX}
          cy={(topY + botY) / 2}
          dikey
          ampulYanar={ampulYanar}
          varsayilanKapali={varsayilanKapali}
          p={e.p}
          boyut={boyut}
        />
      ))}

      {voltmetreler.length > 0 && seriElemanlar.length > 0 && (
        <g>
          <Cizgi
            d={`M${vHedefX - 58} ${topY} V${vBridgeY} H${vHedefX - 24} M${vHedefX + 24} ${vBridgeY} H${vHedefX + 58} V${topY}`}
            renk="#7048e8"
            kalinlik={2}
            p={voltmetreler[0].p}
          />
          <Cizgi d={daireYolu(vHedefX - 58, topY, 4)} renk="#7048e8" dolgu="#7048e8" kalinlik={1} p={voltmetreler[0].p} kalem={false} />
          <Cizgi d={daireYolu(vHedefX + 58, topY, 4)} renk="#7048e8" dolgu="#7048e8" kalinlik={1} p={voltmetreler[0].p} kalem={false} />
          <DevreElemaniCiz
            eleman={voltmetreler[0].veri}
            cx={vHedefX}
            cy={vBridgeY}
            ampulYanar={ampulYanar}
            varsayilanKapali={varsayilanKapali}
            p={voltmetreler[0].p}
            boyut={boyut}
          />
        </g>
      )}

      {akimVar && ozetP > 0 && (
        <g>
          <Cizgi
            d={`${ustTel} ${sagTel} ${altTel} ${solTel}`}
            renk="#1971c2"
            kalinlik={2}
            p={ozetP}
            akis={{ sure: 1.6, yon: akisYon, gecikme: 0 }}
            kalem={false}
          />
          <Ok
            x1={akisYon < 0 ? leftX + 76 : leftX + 18}
            y1={(ustXs[0] ?? rightX) - leftX >= 120 ? topY - 22 : botY + 24}
            x2={akisYon < 0 ? leftX + 18 : leftX + 76}
            y2={(ustXs[0] ?? rightX) - leftX >= 120 ? topY - 22 : botY + 24}
            renk="#1971c2"
            kalinlik={2.3}
            ucBoyutu={9}
            etiket={duz(s.akimEtiketi) || "I"}
            etiketBoyut={boyut.altBoyut}
            p={ozetP}
          />
        </g>
      )}
    </svg>
  );
}

// ============================================================================
// 3. OPTİK DÜZENEK
// ============================================================================

function OptikDuzenekSahne({ parcalar, kutu }: { parcalar: SablonParca<"optik_duzenek">[]; kutu: Blok["kutu"] }) {
  const s = birlesikSablon(parcalar);
  const boyut = sahneBoyutu(kutu, 470);
  const H = boyut.h;
  const { temelP, ozetP } = asamaIlerlemesi(parcalar, s.isinlar === false ? 0 : 1);
  const cisimP = parcalar.length > 1 ? 1 : sinirla((parcalar[0].p - 0.18) * 1.4);
  const isinP = parcalar.length > 1 ? sinirla(parcalar[parcalar.length - 1].p) : sinirla((parcalar[0].p - 0.35) * 1.6);

  const axisY = Math.round(H * 0.54);
  const aynaMi = s.tur === "cukur_ayna" || s.tur === "tumsek_ayna" || s.tur === "duz_ayna";
  const duzAyna = s.tur === "duz_ayna";

  const konumDegeri = (() => {
    const k = s.cisim?.konum;
    if (typeof k === "number" && Number.isFinite(k)) return k > 6 ? aralikta(k / 20, 0.55, 3.2) : aralikta(k, 0.45, 3.4);
    switch (k) {
      case "merkez_disi":
        return 2.6;
      case "merkezde":
        return 2.0;
      case "odak_merkez_arasi":
        return 1.45;
      case "odakta":
        return 1.0;
      case "odak_ayna_arasi":
        return 0.58;
      default:
        return 2.4;
    }
  })();

  const yakinsak = s.tur === "ince_mercek" || s.tur === "cukur_ayna";
  const vKat = duzAyna
    ? -konumDegeri
    : yakinsak
      ? Math.abs(konumDegeri - 1) < 0.05
        ? Infinity
        : konumDegeri / (konumDegeri - 1)
      : -konumDegeri / (konumDegeri + 1);

  const optX = duzAyna ? W * 0.5 : s.tur === "cukur_ayna" ? W * (vKat < 0 ? 0.56 : 0.68) : W * 0.48;
  const fPx = duzAyna
    ? 85
    : Math.min(
        96,
        (optX - 68) / Math.max(2.15, konumDegeri, s.tur === "cukur_ayna" && Number.isFinite(vKat) && vKat > 0 ? vKat : 0),
        (W - 68 - optX) / Math.max(2.15, !aynaMi && Number.isFinite(vKat) && vKat > 0 ? vKat : Number.isFinite(vKat) && vKat < 0 ? Math.abs(vKat) : 0),
      );

  const objX = duzAyna ? optX - aralikta(konumDegeri * 65, 85, 200) : optX - konumDegeri * fPx;
  const goruntuVar = !duzAyna && !Number.isFinite(vKat) ? false : s.goruntu?.goster !== false;
  const sanalMi = vKat < 0;
  const buyutme = Number.isFinite(vKat) ? Math.abs(vKat) / konumDegeri : 1;
  const tersMi = Number.isFinite(vKat) && vKat > 0;
  const istenenObjH = aralikta((s.cisim?.boy ?? 1) * 54, 34, 76);
  const maksHedefH = tersMi ? H - axisY - 62 : axisY - 42;
  const objH = Math.min(istenenObjH, Math.max(26, maksHedefH / Math.max(1, buyutme)));
  const imgH = objH * buyutme;
  const imgX = duzAyna
    ? optX + (optX - objX)
    : aynaMi
      ? optX - vKat * fPx
      : optX + vKat * fPx;
  const imgTipY = tersMi ? axisY + imgH : axisY - imgH;
  const objTipY = axisY - objH;

  const elemH = 128;
  const optikElemanYolu = (() => {
    if (s.tur === "ince_mercek") {
      return `M${optX} ${axisY - elemH} Q${optX + 28} ${axisY} ${optX} ${axisY + elemH} Q${optX - 28} ${axisY} ${optX} ${axisY - elemH} Z`;
    }
    if (s.tur === "kalin_mercek") {
      return `M${optX - 18} ${axisY - elemH} H${optX + 18} Q${optX + 4} ${axisY} ${optX + 18} ${axisY + elemH} H${optX - 18} Q${optX - 4} ${axisY} ${optX - 18} ${axisY - elemH} Z`;
    }
    if (s.tur === "cukur_ayna") {
      return `M${optX - 24} ${axisY - elemH} Q${optX + 20} ${axisY} ${optX - 24} ${axisY + elemH}`;
    }
    if (s.tur === "tumsek_ayna") {
      return `M${optX + 24} ${axisY - elemH} Q${optX - 20} ${axisY} ${optX + 24} ${axisY + elemH}`;
    }
    return `M${optX} ${axisY - elemH} V${axisY + elemH}`;
  })();

  const aynaTarama = aynaMi
    ? Array.from({ length: 14 }, (_, i) => {
        const y = axisY - elemH + 10 + (i * (elemH * 2 - 20)) / 13;
        const t = (y - axisY) / elemH;
        const xOff = s.tur === "cukur_ayna" ? -2 - 22 * t * t : s.tur === "tumsek_ayna" ? 2 + 22 * t * t : 0;
        const bx = optX + xOff;
        return `M${bx.toFixed(1)} ${y.toFixed(1)} L${(bx + 9).toFixed(1)} ${(y - 7).toFixed(1)}`;
      }).join(" ")
    : "";

  const odakEt = duz(s.odakEtiketi) || "F";
  const merkezEt = duz(s.merkezEtiketi) || (aynaMi ? "M" : "2F");
  const noktalar: { x: number; label: string }[] = [];
  if (!duzAyna) {
    if (s.tur === "cukur_ayna") {
      noktalar.push({ x: optX - fPx, label: odakEt }, { x: optX - 2 * fPx, label: merkezEt });
    } else if (s.tur === "tumsek_ayna") {
      noktalar.push({ x: optX + fPx, label: odakEt }, { x: optX + 2 * fPx, label: merkezEt });
    } else {
      noktalar.push(
        { x: optX - fPx, label: odakEt },
        { x: optX - 2 * fPx, label: merkezEt },
        { x: optX + fPx, label: `${odakEt}'` },
        { x: optX + 2 * fPx, label: `${merkezEt}'` },
      );
    }
  }

  // Principal rays
  const tHit = aralikta((objTipY - axisY) / elemH, -0.95, 0.95);
  const hit1X =
    s.tur === "cukur_ayna"
      ? optX - 2 - 22 * tHit * tHit
      : s.tur === "tumsek_ayna"
        ? optX + 2 + 22 * tHit * tHit
        : optX;
  const hit1Y = objTipY;

  const isin1Yollari = (() => {
    if (duzAyna) {
      return { gercek: `M${objX} ${objTipY} H${optX} M${optX} ${objTipY} H${Math.max(40, objX - 50)}`, sanal: `M${optX} ${objTipY} H${imgX}` };
    }
    if (!aynaMi) {
      if (s.tur === "ince_mercek") {
        if (!Number.isFinite(vKat)) {
          return { gercek: `M${objX} ${objTipY} H${hit1X} L${W - 36} ${axisY + ((objTipY - axisY) * (W - 36 - optX)) / -fPx}`, sanal: "" };
        }
        const farX = sanalMi ? W - 40 : imgX + (imgX - hit1X) * 0.18;
        const farY = sanalMi ? hit1Y + ((axisY - hit1Y) / fPx) * (farX - hit1X) : imgTipY + (imgTipY - hit1Y) * 0.18;
        return {
          gercek: `M${objX} ${objTipY} H${hit1X} L${farX.toFixed(1)} ${farY.toFixed(1)}`,
          sanal: sanalMi ? `M${hit1X} ${hit1Y} L${imgX.toFixed(1)} ${imgTipY.toFixed(1)}` : "",
        };
      }
      // kalin_mercek
      const farX = W - 40;
      const farY = hit1Y + ((hit1Y - axisY) / fPx) * (farX - hit1X);
      return {
        gercek: `M${objX} ${objTipY} H${hit1X} L${farX.toFixed(1)} ${farY.toFixed(1)}`,
        sanal: `M${hit1X} ${hit1Y} L${(optX - fPx).toFixed(1)} ${axisY}`,
      };
    }
    if (s.tur === "cukur_ayna") {
      const odakX = optX - fPx;
      if (!Number.isFinite(vKat)) {
        const farX = optX - fPx * 2.1;
        const farY = hit1Y + ((axisY - hit1Y) / (odakX - hit1X)) * (farX - hit1X);
        return { gercek: `M${objX} ${objTipY} H${hit1X.toFixed(1)} L${farX.toFixed(1)} ${farY.toFixed(1)}`, sanal: "" };
      }
      const farX = sanalMi ? 40 : imgX - (hit1X - imgX) * 0.18;
      const farY = sanalMi ? hit1Y + ((axisY - hit1Y) / (odakX - hit1X)) * (farX - hit1X) : imgTipY + (imgTipY - hit1Y) * 0.18;
      return {
        gercek: `M${objX} ${objTipY} H${hit1X.toFixed(1)} L${farX.toFixed(1)} ${farY.toFixed(1)}`,
        sanal: sanalMi ? `M${hit1X.toFixed(1)} ${hit1Y} L${imgX.toFixed(1)} ${imgTipY.toFixed(1)}` : "",
      };
    }
    // tumsek_ayna
    const farX = 48;
    const farY = hit1Y + ((hit1Y - axisY) / (hit1X - (optX + fPx))) * (farX - hit1X);
    return {
      gercek: `M${objX} ${objTipY} H${hit1X.toFixed(1)} L${farX.toFixed(1)} ${farY.toFixed(1)}`,
      sanal: `M${hit1X.toFixed(1)} ${hit1Y} L${(optX + fPx).toFixed(1)} ${axisY}`,
    };
  })();

  const isin2Yollari = (() => {
    if (!aynaMi) {
      if (!Number.isFinite(vKat)) {
        const farX = W - 36;
        const farY = axisY + ((axisY - objTipY) / (optX - objX)) * (farX - optX);
        return { gercek: `M${objX} ${objTipY} L${farX.toFixed(1)} ${farY.toFixed(1)}`, sanal: "" };
      }
      const farX = sanalMi ? W - 40 : imgX + (imgX - optX) * 0.18;
      const farY = sanalMi ? axisY + ((axisY - objTipY) / (optX - objX)) * (farX - optX) : imgTipY + (imgTipY - axisY) * 0.18;
      return {
        gercek: `M${objX} ${objTipY} L${farX.toFixed(1)} ${farY.toFixed(1)}`,
        sanal: sanalMi ? `M${optX} ${axisY} L${imgX.toFixed(1)} ${imgTipY.toFixed(1)}` : "",
      };
    }
    // Mirrors: ray to vertex (optX, axisY) reflecting at symmetric slope
    const dx = optX - objX;
    const dy = axisY - objTipY; // +objH
    if (!Number.isFinite(vKat)) {
      const farX = 48;
      const farY = axisY + (dy / dx) * (optX - farX);
      return { gercek: `M${objX} ${objTipY} L${optX} ${axisY} L${farX.toFixed(1)} ${farY.toFixed(1)}`, sanal: "" };
    }
    const farX = sanalMi ? 48 : imgX - (optX - imgX) * 0.18;
    const farY = sanalMi ? axisY + (dy / dx) * (optX - farX) : imgTipY + (imgTipY - axisY) * 0.18;
    return {
      gercek: `M${objX} ${objTipY} L${optX} ${axisY} L${farX.toFixed(1)} ${farY.toFixed(1)}`,
      sanal: sanalMi ? `M${optX} ${axisY} L${imgX.toFixed(1)} ${imgTipY.toFixed(1)}` : "",
    };
  })();

  const ozetMetin = !Number.isFinite(vKat)
    ? "Görüntü: Sonsuzda (Işınlar paralel)"
    : `${sanalMi ? "Sanal" : "Gerçek"} • ${tersMi ? "Ters" : "Düz"} • ${Math.abs(buyutme - 1) < 0.08 ? "Eşit Boy" : buyutme > 1 ? "Büyük" : "Küçük"}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin meet" overflow="hidden">
      <Cizgi d={`M30 ${axisY} H${W - 30}`} renk="#64748b" kalinlik={1.8} kesikli p={temelP} />

      <Cizgi
        d={optikElemanYolu}
        renk="#0c8599"
        dolgu={aynaMi ? undefined : "#e7f5ff"}
        dolguOpaklik={0.7}
        kalinlik={aynaMi ? 3.4 : 2.4}
        p={temelP}
      />
      {aynaTarama && <Cizgi d={aynaTarama} renk="#64748b" kalinlik={1.4} p={temelP} kalem={false} />}

      {noktalar.map((n, i) => (
        <g key={i}>
          <Cizgi d={daireYolu(n.x, axisY, 3.8)} renk="#1e293b" dolgu="#1e293b" kalinlik={1} p={temelP} kalem={false} />
          <Yazi x={n.x} y={axisY + 20} metin={n.label} boyut={boyut.altBoyut} renk="#334155" hizala="middle" kalin p={temelP} />
        </g>
      ))}

      {cisimP > 0 && (
        <g>
          <Ok x1={objX} y1={axisY} x2={objX} y2={objTipY} renk="#1971c2" kalinlik={3.2} ucBoyutu={11} p={cisimP} />
          <Yazi
            x={objX}
            y={objTipY - 12}
            metin={duz(s.cisim?.etiket) || "Cisim"}
            boyut={boyut.altBoyut}
            renk="#1971c2"
            hizala="middle"
            kalin
            p={cisimP}
          />
        </g>
      )}

      {s.isinlar !== false && isinP > 0 && (
        <g>
          <Cizgi d={isin1Yollari.gercek} renk="#f08c00" kalinlik={2.1} p={isinP} />
          {isin1Yollari.sanal && <Cizgi d={isin1Yollari.sanal} renk="#f08c00" kalinlik={1.8} kesikli p={sinirla((isinP - 0.3) * 1.5)} />}
          <Cizgi d={isin2Yollari.gercek} renk="#2f9e44" kalinlik={2.1} p={sinirla((isinP - 0.15) * 1.25)} />
          {isin2Yollari.sanal && <Cizgi d={isin2Yollari.sanal} renk="#2f9e44" kalinlik={1.8} kesikli p={sinirla((isinP - 0.4) * 1.6)} />}
        </g>
      )}

      {goruntuVar && ozetP > 0 && (
        <g>
          <Ok
            x1={imgX}
            y1={axisY}
            x2={imgX}
            y2={imgTipY}
            renk="#7048e8"
            kalinlik={3}
            ucBoyutu={11}
            kesikli={sanalMi}
            p={ozetP}
          />
          <Yazi
            x={imgX}
            y={tersMi ? imgTipY + 20 : imgTipY - 12}
            metin={duz(s.goruntu?.etiket) || "Görüntü"}
            boyut={boyut.altBoyut}
            renk="#7048e8"
            hizala="middle"
            kalin
            p={ozetP}
          />
        </g>
      )}

      {ozetP > 0 && (
        <g>
          <Cizgi d={yuvarlakKutuYolu(W / 2 - 145, H - 44, 290, 30, 10)} renk="#d0bfff" dolgu="#f3f0ff" kalinlik={1.6} p={ozetP} kalem={false} />
          <Yazi x={W / 2} y={H - 24} metin={ozetMetin} boyut={boyut.altBoyut} renk="#5f3dc4" hizala="middle" konturKalinlik={0} kalin p={ozetP} />
        </g>
      )}
    </svg>
  );
}

// ============================================================================
// 4. KUVVET DENGESİ
// ============================================================================

function KuvvetDengesiSahne({ parcalar, kutu }: { parcalar: SablonParca<"kuvvet_dengesi">[]; kutu: Blok["kutu"] }) {
  const s = birlesikSablon(parcalar);
  const boyut = sahneBoyutu(kutu, 470);
  const H = boyut.h;
  const kuvvetler = listeIlerlemesi(
    parcalar,
    (x) => x.kuvvetler,
    (k, i) => `${etiketNormal(k.etiket)}-${Math.round(k.aci)}-${i}`,
  );
  const { temelP, ozetP } = asamaIlerlemesi(parcalar, kuvvetler.length);

  const cx = W / 2;
  const cy = Math.round(H * 0.52);
  const sekil = s.cisim?.sekil ?? "kutu";
  const cisimDolgu = renkCoz(s.cisim?.dolgu, "#e7f5ff");
  const cisimEtiket = duz(s.cisim?.etiket);

  const yarimW = sekil === "kutu" ? 44 : sekil === "daire" ? 34 : 9;
  const yarimH = sekil === "kutu" ? 30 : sekil === "daire" ? 34 : 9;
  const sinir: Sinir = { x0: 14, y0: 14, x1: W - 14, y1: H - 14 };
  const engeller: Sinir[] = [{ x0: cx - yarimW - 8, y0: cy - yarimH - 8, x1: cx + yarimW + 8, y1: cy + yarimH + 8 }];

  const maksBuyukluk = Math.max(1, ...kuvvetler.map((k) => Math.abs(k.veri.buyukluk ?? 1)));
  const minBuyukluk = Math.min(...kuvvetler.map((k) => Math.abs(k.veri.buyukluk ?? 1)));
  const esitMi = maksBuyukluk - minBuyukluk < 1e-6;

  const { topX, topY } = kuvvetler.reduce(
    (acc, { veri }) => {
      const rad = (veri.aci * Math.PI) / 180;
      const b = Math.abs(veri.buyukluk ?? 1);
      return { topX: acc.topX + Math.cos(rad) * b, topY: acc.topY - Math.sin(rad) * b };
    },
    { topX: 0, topY: 0 },
  );
  const aciSayaci = new Map<number, number>();

  const oklar = kuvvetler.map(({ veri, p }, i) => {
    const rad = (veri.aci * Math.PI) / 180;
    const ux = Math.cos(rad);
    const uy = -Math.sin(rad);
    const b = Math.abs(veri.buyukluk ?? 1);

    const aciAnahtari = Math.round(((veri.aci % 360) + 360) % 360 / 8);
    const sira = aciSayaci.get(aciAnahtari) ?? 0;
    aciSayaci.set(aciAnahtari, sira + 1);
    const yanOfset = sira === 0 ? 0 : (sira % 2 === 1 ? 1 : -1) * Math.ceil(sira / 2) * 14;

    const px = -uy * yanOfset;
    const py = ux * yanOfset;

    const rBas =
      sekil === "kutu"
        ? Math.min(Math.abs(ux) > 1e-3 ? yarimW / Math.abs(ux) : 999, Math.abs(uy) > 1e-3 ? yarimH / Math.abs(uy) : 999)
        : yarimW;
    const len = esitMi ? 108 : aralikta(64 + (b / maksBuyukluk) * 86, 64, 152);
    const maksX = ux > 0.05 ? (W - 76 - cx) / ux : ux < -0.05 ? (cx - 76) / -ux : 999;
    const maksY = uy > 0.05 ? (H - 54 - cy) / uy : uy < -0.05 ? (cy - 44) / -uy : 999;
    const sonLen = Math.min(len, Math.max(46, Math.min(maksX, maksY) - rBas));

    const x1 = cx + ux * rBas + px;
    const y1 = cy + uy * rBas + py;
    const x2 = x1 + ux * sonLen;
    const y2 = y1 + uy * sonLen;
    const renk = renkCoz(veri.renk, VURGU_RENKLERI[i % VURGU_RENKLERI.length]);
    const etiket = duz(veri.etiket);
    const hizala: Hizalama = ux > 0.35 ? "start" : ux < -0.35 ? "end" : "middle";
    const yer = etiket
      ? bosYereYerlestir(x2 + ux * 14, y2 + uy * 14 + (uy > 0.5 ? 10 : 0), etiket, boyut.etiketBoyut, hizala, sinir, engeller)
      : null;
    if (yer) engeller.push(yer.kutu);
    return { key: i, x1, y1, x2, y2, renk, etiket, yer, hizala, p };
  });

  const netBuyukluk = Math.hypot(topX, topY);
  const bileskeGoster = Boolean(s.bileske?.goster || s.bileske?.etiket);
  const bileskeMetni = duz(s.bileske?.etiket) || (netBuyukluk < 0.05 ? "Dengede (F_net = 0)" : "Bileşke Kuvvet");

  const zeminY = cy + yarimH;
  const zeminTicks =
    s.zemin === "yatay"
      ? Array.from({ length: 14 }, (_, i) => {
          const x = cx - 180 + i * 28;
          return `M${x} ${zeminY} L${x - 8} ${zeminY + 10}`;
        }).join(" ")
      : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin meet" overflow="hidden">
      {s.zemin === "yatay" && (
        <Cizgi d={`M${cx - 200} ${zeminY} H${cx + 200} ${zeminTicks}`} renk="#475569" kalinlik={2.2} p={temelP} kalem={false} />
      )}
      {s.zemin === "ip" && (
        <g>
          <Cizgi d={`M${cx - 70} 34 H${cx + 70}`} renk="#475569" kalinlik={3} p={temelP} />
          <Cizgi d={`M${cx} 34 V${cy - yarimH}`} renk="#1e293b" kalinlik={2} p={temelP} />
        </g>
      )}
      {(!s.zemin || s.zemin === "yok") && (
        <Cizgi d={`M${cx - 190} ${cy} H${cx + 190} M${cx} ${cy - 140} V${cy + 140}`} renk="#cbd5e1" kalinlik={1.3} kesikli p={temelP} kalem={false} />
      )}

      {sekil === "kutu" && (
        <Cizgi d={yuvarlakKutuYolu(cx - yarimW, cy - yarimH, yarimW * 2, yarimH * 2, 8)} renk="#1971c2" dolgu={cisimDolgu} kalinlik={2.6} p={temelP} />
      )}
      {sekil === "daire" && <Cizgi d={daireYolu(cx, cy, yarimW)} renk="#1971c2" dolgu={cisimDolgu} kalinlik={2.6} p={temelP} />}
      {sekil === "nokta" && <Cizgi d={daireYolu(cx, cy, yarimW)} renk="#1e293b" dolgu="#1971c2" kalinlik={2.2} p={temelP} />}

      {oklar.map((o) =>
        o.p <= 0 ? null : (
          <g key={o.key}>
            <Ok x1={o.x1} y1={o.y1} x2={o.x2} y2={o.y2} renk={o.renk} kalinlik={2.8} ucBoyutu={11} p={o.p} />
            {o.yer && o.etiket && (
              <Yazi
                x={o.yer.x}
                y={o.yer.y}
                metin={o.etiket}
                boyut={boyut.etiketBoyut}
                renk={o.renk}
                hizala={o.hizala}
                kalin
                p={sinirla((o.p - 0.35) * 1.6)}
              />
            )}
          </g>
        ),
      )}

      {bileskeGoster && ozetP > 0 && (
        <g>
          {netBuyukluk >= 0.05 && kuvvetler.length > 1 && (() => {
            const bux = topX / netBuyukluk;
            const buy = topY / netBuyukluk;
            const rBileske =
              sekil === "kutu"
                ? Math.min(Math.abs(bux) > 1e-3 ? yarimW / Math.abs(bux) : 999, Math.abs(buy) > 1e-3 ? yarimH / Math.abs(buy) : 999)
                : yarimW;
            return (
              <Ok
                x1={cx + bux * rBileske}
                y1={cy + buy * rBileske}
                x2={cx + bux * (rBileske + 96)}
                y2={cy + buy * (rBileske + 96)}
                renk="#7048e8"
                kalinlik={3}
                ucBoyutu={11}
                kesikli
                p={ozetP}
              />
            );
          })()}
          <Cizgi
            d={yuvarlakKutuYolu(W - 224, H - 46, 208, 32, 9)}
            renk={netBuyukluk < 0.05 ? "#2f9e44" : "#7048e8"}
            dolgu={netBuyukluk < 0.05 ? "#ebfbee" : "#f3f0ff"}
            kalinlik={1.8}
            p={ozetP}
            kalem={false}
          />
          <Yazi
            x={W - 120}
            y={H - 25}
            metin={bileskeMetni}
            boyut={boyut.altBoyut}
            renk={netBuyukluk < 0.05 ? "#2b8a3e" : "#5f3dc4"}
            hizala="middle"
            konturKalinlik={0}
            kalin
            p={ozetP}
          />
        </g>
      )}

      {cisimEtiket && (
        <Yazi
          x={sekil === "nokta" ? cx + 16 : cx}
          y={sekil === "nokta" ? cy - 12 : cy + 5}
          metin={cisimEtiket}
          boyut={boyut.etiketBoyut}
          renk="#1e293b"
          hizala={sekil === "nokta" ? "start" : "middle"}
          konturRenk={sekil === "nokta" ? "#ffffff" : cisimDolgu}
          konturKalinlik={sekil === "nokta" ? 3 : 6}
          kalin
          p={temelP}
        />
      )}
    </svg>
  );
}

// ============================================================================
// 5. ATOM MODELİ
// ============================================================================

function AtomModeliSahne({ parcalar, kutu }: { parcalar: SablonParca<"atom_modeli">[]; kutu: Blok["kutu"] }) {
  const s = birlesikSablon(parcalar);
  const boyut = sahneBoyutu(kutu, 470);
  const H = boyut.h;
  const { temelP, ozetP } = asamaIlerlemesi(parcalar, s.katmanlar.length);

  const cx = Math.round(W * 0.35);
  const cy = Math.round(H * 0.5);
  const katmanlar = s.katmanlar.slice(0, 7);
  const protonSayisi = Math.max(0, Math.round(s.proton ?? katmanlar.reduce((a, b) => a + b, 0)));
  const notronSayisi = Math.max(0, Math.round(s.notron ?? protonSayisi));
  const elektronSayisi = katmanlar.reduce((a, b) => a + Math.max(0, Math.round(b)), 0);

  const nGorsel = Math.min(20, Math.max(2, protonSayisi + notronSayisi));
  const cekirdekR = nGorsel <= 4 ? 14 : nGorsel <= 12 ? 22 : 28;
  const maksR = Math.min(W * 0.31, H * 0.44);
  const icR = cekirdekR + 28;
  const adimR = katmanlar.length > 1 ? Math.min(46, (maksR - icR) / (katmanlar.length - 1)) : 0;

  const nukleonlar = useMemo(() => {
    const sonuc: { x: number; y: number; proton: boolean }[] = [];
    for (let i = 0; i < nGorsel; i++) {
      const r = i === 0 ? 0 : Math.min(cekirdekR - 6, 6.2 * Math.sqrt(i));
      const aci = i * 2.39996;
      sonuc.push({ x: cx + r * Math.cos(aci), y: cy + r * Math.sin(aci), proton: i % 2 === 0 });
    }
    return sonuc;
  }, [cx, cy, cekirdekR, nGorsel]);

  const canli = s.animasyon !== false && !azHareket();
  const kabukAdlari = ["K", "L", "M", "N", "O", "P", "Q"];
  const kartX = Math.round(W * 0.68);
  const kartW = W - kartX - 24;
  const kartY = Math.round(H * 0.16);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin meet" overflow="hidden">
      <Cizgi d={daireYolu(cx, cy, cekirdekR + 8)} renk="none" dolgu="#fff0f6" dolguOpaklik={0.8} kalinlik={0} p={temelP} kalem={false} />

      {nukleonlar.map((n, i) => (
        <Cizgi
          key={`n-${i}`}
          d={daireYolu(n.x, n.y, 5.2)}
          renk="#1e293b"
          dolgu={n.proton ? "#ff6b6b" : "#ced4da"}
          kalinlik={1.4}
          p={temelP}
          kalem={false}
        />
      ))}

      {katmanlar.map((sayi, ki) => {
        const r = icR + ki * adimR;
        const halkaP = parcalar.length > 1 ? 1 : parcaIlerlemesi(sinirla((parcalar[0].p - 0.12) * 1.15), ki, katmanlar.length);
        if (halkaP <= 0) return null;
        const adet = Math.max(0, Math.min(32, Math.round(sayi)));
        const sure = 8 + ki * 4.5;
        const yon = ki % 2 === 0 ? 1 : -1;
        return (
          <g key={`k-${ki}`}>
            <Cizgi d={daireYolu(cx, cy, r)} renk="#94a3b8" kalinlik={1.7} kesikli p={halkaP} />
            <Yazi
              x={cx + r * 0.72}
              y={cy + r * 0.72 + 4}
              metin={kabukAdlari[ki] ?? ""}
              boyut={11.5}
              renk="#64748b"
              hizala="middle"
              p={halkaP}
              kalem={false}
            />
            <g>
              {canli && halkaP >= 0.98 && (
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from={`0 ${cx} ${cy}`}
                  to={`${yon * 360} ${cx} ${cy}`}
                  dur={`${sure}s`}
                  repeatCount="indefinite"
                />
              )}
              {Array.from({ length: adet }, (_, ei) => {
                const a = (ei * Math.PI * 2) / adet - Math.PI / 2;
                const ex = cx + r * Math.cos(a);
                const ey = cy + r * Math.sin(a);
                return (
                  <g key={`e-${ei}`}>
                    <Cizgi d={daireYolu(ex, ey, 6.2)} renk="#1971c2" dolgu="#74c0fc" kalinlik={1.8} p={halkaP} kalem={false} />
                  </g>
                );
              })}
            </g>
          </g>
        );
      })}

      {/* Periyodik Kart ve Bilgi Paneli */}
      {ozetP > 0 && (
        <g>
          <Cizgi d={yuvarlakKutuYolu(kartX, kartY, kartW, 134, 14)} renk="#1971c2" dolgu="#e7f5ff" kalinlik={2.4} p={ozetP} />
          <Yazi x={kartX + 16} y={kartY + 28} metin={String(protonSayisi)} boyut={18} renk="#1971c2" kalin konturKalinlik={0} p={ozetP} />
          <Yazi
            x={kartX + kartW / 2}
            y={kartY + 84}
            metin={`${duz(s.sembol)}${s.yuk ? ` ${duz(s.yuk)}` : ""}`}
            boyut={42}
            renk="#1e293b"
            hizala="middle"
            konturKalinlik={0}
            kalin
            p={ozetP}
          />
          {s.ad && (
            <Yazi
              x={kartX + kartW / 2}
              y={kartY + 118}
              metin={duz(s.ad)}
              boyut={boyut.etiketBoyut}
              renk="#334155"
              hizala="middle"
              konturKalinlik={0}
              p={ozetP}
            />
          )}

          <Cizgi d={yuvarlakKutuYolu(kartX, kartY + 150, kartW, 136, 12)} renk="#cbd5e1" dolgu="#f8fafc" kalinlik={1.8} p={ozetP} kalem={false} />
          <Cizgi d={daireYolu(kartX + 22, kartY + 177, 6)} renk="#1e293b" dolgu="#ff6b6b" kalinlik={1.4} p={ozetP} kalem={false} />
          <Yazi x={kartX + 36} y={kartY + 182} metin={`Proton (p⁺): ${protonSayisi}`} boyut={boyut.altBoyut} renk="#1e293b" konturKalinlik={0} p={ozetP} />

          <Cizgi d={daireYolu(kartX + 22, kartY + 206, 6)} renk="#1e293b" dolgu="#ced4da" kalinlik={1.4} p={ozetP} kalem={false} />
          <Yazi x={kartX + 36} y={kartY + 211} metin={`Nötron (n⁰): ${notronSayisi}`} boyut={boyut.altBoyut} renk="#1e293b" konturKalinlik={0} p={ozetP} />

          <Cizgi d={daireYolu(kartX + 22, kartY + 235, 6)} renk="#1971c2" dolgu="#74c0fc" kalinlik={1.4} p={ozetP} kalem={false} />
          <Yazi x={kartX + 36} y={kartY + 240} metin={`Elektron (e⁻): ${elektronSayisi}`} boyut={boyut.altBoyut} renk="#1e293b" konturKalinlik={0} p={ozetP} />

          <Yazi
            x={kartX + kartW / 2}
            y={kartY + 271}
            metin={`Katmanlar: ${katmanlar.join(" - ")}`}
            boyut={boyut.altBoyut}
            renk="#1971c2"
            hizala="middle"
            konturKalinlik={0}
            kalin
            p={ozetP}
          />
        </g>
      )}
    </svg>
  );
}

// ============================================================================
// 6. TEPKİME KABI
// ============================================================================

function KapIciCiz({
  kap,
  cx,
  topY,
  w,
  h,
  tanecikler,
  piston,
  isi,
  temelP,
  altEtiket,
  boyut,
}: {
  kap: "beher" | "erlen" | "tup";
  cx: number;
  topY: number;
  w: number;
  h: number;
  tanecikler: Ogeli<TepkimeKabiTanecik>[];
  piston?: boolean;
  isi?: boolean;
  temelP: number;
  altEtiket?: string;
  boyut: ReturnType<typeof sahneBoyutu>;
}) {
  const botY = topY + h;
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;

  const siviVar = tanecikler.some((t) => t.veri.faz === "sivi" || !t.veri.faz);
  const kapYolu = (() => {
    if (kap === "erlen") {
      const boyunW = w * 0.36;
      return `M${cx - boyunW / 2} ${topY} H${cx + boyunW / 2} V${topY + h * 0.28} L${x1} ${botY - 14} Q${x1} ${botY} ${x1 - 14} ${botY} H${x0 + 14} Q${x0} ${botY} ${x0} ${botY - 14} L${cx - boyunW / 2} ${topY + h * 0.28} Z`;
    }
    if (kap === "tup") {
      const rw = w * 0.56;
      return `M${cx - rw / 2 - 6} ${topY} H${cx + rw / 2 + 6} L${cx + rw / 2} ${topY + 10} V${botY - rw / 2} A${rw / 2} ${rw / 2} 0 0 1 ${cx - rw / 2} ${botY - rw / 2} V${topY + 10} Z`;
    }
    return `M${x0 - 8} ${topY} H${x1 + 8} L${x1} ${topY + 12} V${botY - 14} Q${x1} ${botY} ${x1 - 14} ${botY} H${x0 + 14} Q${x0} ${botY} ${x0} ${botY - 14} V${topY + 12} Z`;
  })();

  const siviY = topY + h * 0.45;
  const siviYolu = (() => {
    if (!siviVar) return "";
    if (kap === "erlen") {
      const t = 0.45;
      const boyunW = w * 0.36;
      const hw = boyunW / 2 + ((t - 0.28) / 0.72) * (w / 2 - boyunW / 2);
      return `M${cx - hw} ${siviY} Q${cx} ${siviY + 6} ${cx + hw} ${siviY} L${x1} ${botY - 14} Q${x1} ${botY} ${x1 - 14} ${botY} H${x0 + 14} Q${x0} ${botY} ${x0} ${botY - 14} Z`;
    }
    if (kap === "tup") {
      const rw = w * 0.56;
      return `M${cx - rw / 2} ${siviY} Q${cx} ${siviY + 5} ${cx + rw / 2} ${siviY} V${botY - rw / 2} A${rw / 2} ${rw / 2} 0 0 1 ${cx - rw / 2} ${botY - rw / 2} Z`;
    }
    return `M${x0 + 1} ${siviY} Q${cx} ${siviY + 6} ${x1 - 1} ${siviY} V${botY - 14} Q${x1 - 1} ${botY - 1} ${x1 - 14} ${botY - 1} H${x0 + 14} Q${x0 + 1} ${botY - 1} ${x0 + 1} ${botY - 14} Z`;
  })();

  let katiIdx = 0;
  let siviIdx = 0;
  let gazIdx = 0;

  const tanecikNoktalari = tanecikler.flatMap((t, ti) => {
    const adet = aralikta(Math.round(t.veri.sayi ?? 3), 1, 8);
    const renk = renkCoz(t.veri.renk, VURGU_RENKLERI[ti % VURGU_RENKLERI.length]);
    const faz = t.veri.faz ?? "sivi";
    const icYarimW = kap === "tup" ? w * 0.2 : w * 0.34;
    return Array.from({ length: adet }, (_, k) => {
      let px = cx;
      let py = siviY + 30;
      if (faz === "kati") {
        const sira = katiIdx++;
        px = cx + ((sira % 5) - 2) * (icYarimW * 0.42);
        py = botY - 15 - Math.floor(sira / 5) * 14;
      } else if (faz === "gaz") {
        const sira = gazIdx++;
        px = cx + (((sira * 37) % 100) / 100 - 0.5) * icYarimW * 1.5;
        py = topY + 26 + ((sira * 23) % Math.max(24, Math.round(h * 0.28)));
      } else {
        const sira = siviIdx++;
        px = cx + (((sira * 43) % 100) / 100 - 0.5) * icYarimW * 1.6;
        py = siviY + 18 + ((sira * 29) % Math.max(24, Math.round(h * 0.36)));
      }
      return { key: `${ti}-${k}`, px, py, renk, faz, p: t.p };
    });
  });

  return (
    <g>
      {siviYolu && <Cizgi d={siviYolu} renk="#74c0fc" dolgu="#e7f5ff" dolguOpaklik={0.8} kalinlik={1.6} p={temelP} kalem={false} />}
      <Cizgi d={kapYolu} renk="#1e293b" kalinlik={2.6} p={temelP} />
      {kap === "beher" && (
        <Cizgi
          d={`M${x0 + 8} ${topY + 40} H${x0 + 18} M${x0 + 8} ${topY + 75} H${x0 + 22} M${x0 + 8} ${topY + 110} H${x0 + 18}`}
          renk="#64748b"
          kalinlik={1.5}
          p={temelP}
          kalem={false}
        />
      )}

      {piston && (
        <g>
          <Cizgi d={yuvarlakKutuYolu(x0 + 6, topY + 26, w - 12, 12, 3)} renk="#334155" dolgu="#cbd5e1" kalinlik={2} p={temelP} />
          <Cizgi d={`M${cx} ${topY + 26} V${topY - 20} M${cx - 18} ${topY - 20} H${cx + 18}`} renk="#334155" kalinlik={2.6} p={temelP} />
        </g>
      )}

      {tanecikNoktalari.map((n) =>
        n.p <= 0 ? null : (
          <g key={n.key}>
            <Cizgi
              d={n.faz === "kati" ? yuvarlakKutuYolu(n.px - 6, n.py - 6, 12, 12, 2) : daireYolu(n.px, n.py, 6.2)}
              renk="#1e293b"
              dolgu={n.renk}
              kalinlik={1.6}
              p={n.p}
              kalem={false}
            />
            {n.faz === "gaz" && (
              <Cizgi d={`M${(n.px - 9).toFixed(1)} ${(n.py + 9).toFixed(1)} L${(n.px - 4).toFixed(1)} ${(n.py + 5).toFixed(1)}`} renk={n.renk} kalinlik={1.5} p={n.p} kalem={false} />
            )}
          </g>
        ),
      )}

      {isi && (
        <g>
          <Cizgi
            d={`M${cx} ${botY + 8} C${cx + 16} ${botY + 22} ${cx + 14} ${botY + 38} ${cx} ${botY + 42} C${cx - 14} ${botY + 38} ${cx - 16} ${botY + 22} ${cx} ${botY + 8} Z`}
            renk="#e67700"
            dolgu="#ffa94d"
            kalinlik={1.8}
            p={temelP}
          />
          <Cizgi
            d={`M${cx} ${botY + 18} C${cx + 7} ${botY + 26} ${cx + 6} ${botY + 36} ${cx} ${botY + 39} C${cx - 6} ${botY + 36} ${cx - 7} ${botY + 26} ${cx} ${botY + 18} Z`}
            renk="none"
            dolgu="#ffe066"
            kalinlik={0}
            p={temelP}
            kalem={false}
          />
        </g>
      )}

      {altEtiket && <Yazi x={cx} y={botY + (isi ? 62 : 26)} metin={altEtiket} boyut={boyut.altBoyut} renk="#1e293b" hizala="middle" kalin p={temelP} />}
    </g>
  );
}

function TepkimeKabiSahne({ parcalar, kutu }: { parcalar: SablonParca<"tepkime_kabi">[]; kutu: Blok["kutu"] }) {
  const s = birlesikSablon(parcalar);
  const boyut = sahneBoyutu(kutu, 470);
  const H = boyut.h;
  const icerikUstY = s.baslik ? 58 : 22;

  const girenler = listeIlerlemesi(parcalar, (x) => x.girenler, (t, i) => `g-${etiketNormal(t.etiket)}-${i}`);
  const urunler = listeIlerlemesi(parcalar, (x) => x.urunler, (t, i) => `u-${etiketNormal(t.etiket)}-${i}`);
  const tanecikler = listeIlerlemesi(parcalar, (x) => x.tanecikler, (t, i) => `t-${etiketNormal(t.etiket)}-${i}`);

  const ikiKapMi = s.kap === "iki_kap" || (girenler.length > 0 && urunler.length > 0);
  const { temelP, ozetP } = asamaIlerlemesi(parcalar, girenler.length + urunler.length + tanecikler.length);

  if (ikiKapMi) {
    const kapW = 164;
    const kapH = 186;
    const kapY = icerikUstY + 26;
    const solX = W * 0.24;
    const sagX = W * 0.76;
    const etiketY = kapY + kapH + (s.isi ? 82 : 44);
    const solGoster = girenler.length ? girenler : tanecikler;

    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin meet" overflow="hidden">
        <BaslikSatiri baslik={s.baslik} w={W} boyut={boyut.baslikBoyut} p={temelP} />

        <KapIciCiz
          kap="beher"
          cx={solX}
          topY={kapY}
          w={kapW}
          h={kapH}
          tanecikler={solGoster}
          piston={s.piston}
          temelP={temelP}
          altEtiket="Girenler"
          boyut={boyut}
        />

        <Ok
          x1={solX + kapW / 2 + 24}
          y1={kapY + kapH / 2}
          x2={sagX - kapW / 2 - 24}
          y2={kapY + kapH / 2}
          renk="#1971c2"
          kalinlik={3.2}
          ucBoyutu={12}
          etiket={duz(s.etiket) || (s.isi ? "Δ (Isı)" : undefined)}
          etiketBoyut={boyut.altBoyut}
          p={ozetP || temelP}
        />

        <KapIciCiz
          kap="beher"
          cx={sagX}
          topY={kapY}
          w={kapW}
          h={kapH}
          tanecikler={urunler}
          piston={s.piston}
          temelP={temelP}
          altEtiket="Ürünler"
          boyut={boyut}
        />

        {solGoster.map((t, i) => (
          <g key={`lg-${i}`}>
            <Cizgi
              d={daireYolu(solX - 70, etiketY + i * 24 - 4, 6)}
              renk="#1e293b"
              dolgu={renkCoz(t.veri.renk, VURGU_RENKLERI[i % VURGU_RENKLERI.length])}
              kalinlik={1.4}
              p={t.p}
              kalem={false}
            />
            <Yazi x={solX - 56} y={etiketY + i * 24} metin={duz(t.veri.etiket)} boyut={boyut.altBoyut} renk="#334155" p={t.p} />
          </g>
        ))}

        {urunler.map((t, i) => (
          <g key={`lu-${i}`}>
            <Cizgi
              d={daireYolu(sagX - 70, etiketY + i * 24 - 4, 6)}
              renk="#1e293b"
              dolgu={renkCoz(t.veri.renk, VURGU_RENKLERI[i % VURGU_RENKLERI.length])}
              kalinlik={1.4}
              p={t.p}
              kalem={false}
            />
            <Yazi x={sagX - 56} y={etiketY + i * 24} metin={duz(t.veri.etiket)} boyut={boyut.altBoyut} renk="#334155" p={t.p} />
          </g>
        ))}
      </svg>
    );
  }

  const liste = tanecikler.length ? tanecikler : girenler.length ? girenler : urunler;
  const kapTipi = s.kap === "erlen" || s.kap === "tup" ? s.kap : "beher";
  const kapCx = liste.length ? W * 0.36 : W * 0.5;
  const kapY = icerikUstY + (s.piston ? 38 : 18);
  const kapH = H - kapY - (s.isi ? 84 : 44);
  const kapW = Math.min(220, kapH * 0.92);
  const legendX = W * 0.62;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin meet" overflow="hidden">
      <BaslikSatiri baslik={s.baslik} w={W} boyut={boyut.baslikBoyut} p={temelP} />

      <KapIciCiz
        kap={kapTipi}
        cx={kapCx}
        topY={kapY}
        w={kapW}
        h={kapH}
        tanecikler={liste}
        piston={s.piston}
        isi={s.isi}
        temelP={temelP}
        altEtiket={duz(s.etiket) || undefined}
        boyut={boyut}
      />

      {liste.map((t, i) => {
        const y = icerikUstY + 46 + i * 36;
        const renk = renkCoz(t.veri.renk, VURGU_RENKLERI[i % VURGU_RENKLERI.length]);
        const fazMetni = t.veri.faz === "kati" ? " (k)" : t.veri.faz === "sivi" ? " (s)" : t.veri.faz === "gaz" ? " (g)" : "";
        return (
          <g key={`t-${i}`}>
            <Cizgi d={yuvarlakKutuYolu(legendX, y - 16, 224, 30, 8)} renk="#e2e8f0" dolgu="#f8fafc" kalinlik={1.4} p={t.p} kalem={false} />
            <Cizgi d={daireYolu(legendX + 18, y - 1, 7)} renk="#1e293b" dolgu={renk} kalinlik={1.5} p={t.p} kalem={false} />
            <Yazi x={legendX + 34} y={y + 4} metin={`${duz(t.veri.etiket)}${fazMetni}`} boyut={boyut.altBoyut} renk="#1e293b" konturKalinlik={0} kalin p={t.p} />
          </g>
        );
      })}
    </svg>
  );
}

// ============================================================================
// 7. HÜCRE KESİTİ
// ============================================================================

function organelKonumu(organel: HucreOrganeli, tur: HucreKesitiSablonu["tur"], cx: number, cy: number, idx: number): { ax: number; ay: number } {
  const anahtar = `${organel.id ?? ""} ${organel.ad}`
    .toLocaleLowerCase("tr")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");

  if (anahtar.includes("duvar") || anahtar.includes("ceper") || anahtar.includes("kapsul")) {
    return tur === "prokaryot" ? { ax: cx - 126, ay: cy - 42 } : { ax: cx - 138, ay: cy - 74 };
  }
  if (anahtar.includes("zar")) {
    return tur === "prokaryot" ? { ax: cx + 118, ay: cy + 34 } : { ax: cx + 128, ay: cy + 54 };
  }
  if (anahtar.includes("cekirdekcik")) return { ax: cx - 20, ay: cy - 14 };
  if (anahtar.includes("cekirdek") || anahtar.includes("nukleus")) return { ax: cx - 44, ay: cy - 28 };
  if (anahtar.includes("nukleoit") || anahtar.includes("dna") || anahtar.includes("halkasal")) return { ax: cx - 10, ay: cy };
  if (anahtar.includes("plazmit")) return { ax: cx + 52, ay: cy + 28 };
  if (anahtar.includes("kamci") || anahtar.includes("flagel")) return { ax: cx + 160, ay: cy + 6 };
  if (anahtar.includes("endoplazmik") || anahtar.includes("retikulum") || /\ber\b/.test(anahtar)) return { ax: cx - 84, ay: cy - 22 };
  if (anahtar.includes("golgi")) return { ax: cx - 72, ay: cy + 56 };
  if (anahtar.includes("mitokondri")) return { ax: cx + 76, ay: cy - 52 };
  if (anahtar.includes("kloroplast")) return { ax: cx - 82, ay: cy - 74 };
  if (anahtar.includes("koful") || anahtar.includes("vakuol")) return tur === "bitki" ? { ax: cx + 44, ay: cy + 16 } : { ax: cx + 78, ay: cy + 26 };
  if (anahtar.includes("ribozom")) return tur === "prokaryot" ? { ax: cx + 18, ay: cy + 42 } : { ax: cx + 24, ay: cy + 54 };
  if (anahtar.includes("lizozom")) return { ax: cx - 84, ay: cy + 8 };
  if (anahtar.includes("sentrozom") || anahtar.includes("sentriol")) return { ax: cx + 38, ay: cy - 18 };
  if (anahtar.includes("sitoplazma")) return { ax: cx + 8, ay: cy + 42 };
  const ofsetX = ((idx % 2 === 0 ? -1 : 1) * (34 + (idx % 3) * 20));
  const ofsetY = ((idx % 3) - 1) * 32;
  return { ax: cx + ofsetX, ay: cy + ofsetY };
}

function HucreKesitiSahne({ parcalar, kutu }: { parcalar: SablonParca<"hucre_kesiti">[]; kutu: Blok["kutu"] }) {
  const s = birlesikSablon(parcalar);
  const boyut = sahneBoyutu(kutu, 490);
  const organeller = listeIlerlemesi(
    parcalar,
    (x) => x.organeller,
    (o, i) => `${etiketNormal(o.id || o.ad)}-${i}`,
  );
  const { temelP } = asamaIlerlemesi(parcalar, organeller.length);

  const icerikUstY = s.baslik ? 56 : 18;
  const cx = W / 2;

  const sutunW = 168;
  const icW = sutunW - 18;
  const adBoyut = boyut.altBoyut;
  const aciklamaBoyut = Math.max(11, adBoyut - 1.5);
  const adSatirH = adBoyut * 1.28;
  const aciklamaSatirH = aciklamaBoyut * 1.28;
  const padY = 8;
  const araBosluk = 5;
  const kartAralik = 10;

  const eslesmis = organeller.map((o, idx) => {
    const hamKonum = organelKonumu(o.veri, s.tur, cx, 0, idx);
    const adMetni = duz(o.veri.ad);
    const aciklamaMetni = duz(o.veri.aciklama);
    const adSatirlar = satirlaraBol(adMetni, icW, adBoyut);
    const aciklamaSatirlar = aciklamaMetni ? satirlaraBol(aciklamaMetni, icW, aciklamaBoyut) : [];
    const adH = Math.max(adSatirH, adSatirlar.length * adSatirH);
    const aciklamaH = aciklamaSatirlar.length * aciklamaSatirH;
    const kartH = Math.max(34, padY * 2 + adH + (aciklamaSatirlar.length ? araBosluk + aciklamaH : 0));
    return { ...o, idx, relX: hamKonum.ax, relY: hamKonum.ay, adMetni, aciklamaMetni, adH, aciklamaH, kartH };
  });

  const sol = eslesmis.filter((e) => e.relX < cx).sort((a, b) => a.relY - b.relY);
  const sag = eslesmis.filter((e) => e.relX >= cx).sort((a, b) => a.relY - b.relY);
  while (sol.length > sag.length + 2) sag.unshift(sol.pop()!);
  while (sag.length > sol.length + 2) sol.unshift(sag.pop()!);

  const sutunToplamH = (liste: typeof sol) =>
    liste.reduce((t, item) => t + item.kartH, 0) + kartAralik * Math.max(0, liste.length - 1);

  const gereksinH = Math.max(sutunToplamH(sol), sutunToplamH(sag)) + 26;
  const viewH = Math.max(boyut.h, icerikUstY + gereksinH);
  const cy = icerikUstY + (viewH - icerikUstY) * 0.5;

  const yerlestirSutun = (liste: typeof sol, solMu: boolean) => {
    const n = liste.length;
    if (!n) return [];
    const topH = sutunToplamH(liste);
    const usableH = viewH - icerikUstY - 22;
    const ekstraBosluk = Math.max(kartAralik, (usableH - liste.reduce((t, item) => t + item.kartH, 0)) / Math.max(1, n));
    const basY = topH >= usableH ? icerikUstY + 10 : icerikUstY + 10 + ekstraBosluk * 0.5;
    let yImlec = basY;
    return liste.map((item) => {
      const kartX = solMu ? 12 : W - sutunW - 12;
      const kartY = yImlec;
      const cyKart = kartY + item.kartH / 2;
      yImlec += item.kartH + (topH >= usableH ? kartAralik : ekstraBosluk);
      return {
        ...item,
        ax: item.relX,
        ay: cy + item.relY,
        kartX,
        kartY,
        kartW: sutunW,
        cyKart,
        solMu,
        adY: kartY + padY + item.adH / 2,
        aciklamaY: kartY + padY + item.adH + araBosluk + item.aciklamaH / 2,
      };
    });
  };

  const kartlar = [...yerlestirSutun(sol, true), ...yerlestirSutun(sag, false)];

  return (
    <svg viewBox={`0 0 ${W} ${viewH}`} preserveAspectRatio="xMidYMin meet" overflow="hidden">
      <BaslikSatiri baslik={s.baslik} w={W} boyut={boyut.baslikBoyut} p={temelP} />

      {/* Hücre Çizimi */}
      {s.tur === "bitki" && (
        <g>
          <Cizgi
            d={yuvarlakKutuYolu(cx - 144, cy - 120, 288, 240, 34)}
            renk="#2f9e44"
            dolgu="#b2f2bb"
            kalinlik={4}
            p={temelP}
          />
          <Cizgi
            d={yuvarlakKutuYolu(cx - 130, cy - 106, 260, 212, 26)}
            renk="#51cf66"
            dolgu="#f4fce3"
            kalinlik={2.2}
            p={temelP}
          />
          {/* Büyük Merkezi Koful */}
          <Cizgi
            d={`M${cx - 4} ${cy - 48} C${cx + 58} ${cy - 68} ${cx + 104} ${cy - 22} ${cx + 98} ${cy + 36} C${cx + 94} ${cy + 80} ${cx + 18} ${cy + 84} ${cx - 8} ${cy + 46} C${cx - 26} ${cy + 14} ${cx - 32} ${cy - 34} ${cx - 4} ${cy - 48} Z`}
            renk="#1971c2"
            dolgu="#d0ebff"
            dolguOpaklik={0.8}
            kalinlik={2}
            p={temelP}
          />
          {/* Kloroplastlar */}
          {[
            [cx - 82, cy - 74, -22],
            [cx + 76, cy - 72, 16],
            [cx - 16, cy + 78, 8],
          ].map(([kx, ky, rot], i) => (
            <g key={`kl-${i}`} transform={`translate(${kx} ${ky}) rotate(${rot})`}>
              <Cizgi d={`M-24 0 A24 12 0 1 0 24 0 A24 12 0 1 0 -24 0 Z`} renk="#2b8a3e" dolgu="#8ce99a" kalinlik={1.8} p={temelP} />
              <Cizgi d="M-12 -3 H-4 M-12 2 H-4 M4 -3 H12 M4 2 H12" renk="#1b5e20" kalinlik={2} p={temelP} kalem={false} />
            </g>
          ))}
        </g>
      )}

      {s.tur === "hayvan" && (
        <g>
          <Cizgi
            d={`M${cx - 138} ${cy - 18} C${cx - 142} ${cy - 92} ${cx - 56} ${cy - 122} ${cx + 18} ${cy - 114} C${cx + 98} ${cy - 106} ${cx + 146} ${cy - 54} ${cx + 140} ${cy + 14} C${cx + 134} ${cy + 88} ${cx + 66} ${cy + 118} ${cx - 16} ${cy + 114} C${cx - 98} ${cy + 110} ${cx - 136} ${cy + 56} ${cx - 138} ${cy - 18} Z`}
            renk="#d97706"
            dolgu="#fff9db"
            kalinlik={3}
            p={temelP}
          />
          {/* Lizozom & Sentrozom & Küçük Koful */}
          <Cizgi d={daireYolu(cx - 84, cy - 8, 12)} renk="#e67700" dolgu="#ffe8cc" kalinlik={1.8} p={temelP} />
          <Cizgi d={daireYolu(cx + 78, cy + 26, 15)} renk="#1971c2" dolgu="#e7f5ff" kalinlik={1.8} p={temelP} />
          <Cizgi d={`M${cx + 32} ${cy - 22} H${cx + 46} M${cx + 38} ${cy - 28} V${cy - 14}`} renk="#7048e8" kalinlik={3} p={temelP} kalem={false} />
        </g>
      )}

      {s.tur === "prokaryot" && (
        <g>
          <Cizgi
            d={`M${cx + 128} ${cy + 6} Q${cx + 158} ${cy - 18} ${cx + 174} ${cy + 6} T${cx + 210} ${cy}`}
            renk="#2f9e44"
            kalinlik={3}
            p={temelP}
          />
          <Cizgi d={yuvarlakKutuYolu(cx - 134, cy - 72, 268, 144, 72)} renk="#2f9e44" dolgu="#ebfbee" kalinlik={3.5} p={temelP} />
          <Cizgi d={yuvarlakKutuYolu(cx - 122, cy - 60, 244, 120, 60)} renk="#f08c00" dolgu="#fff9db" kalinlik={2} p={temelP} />
          <Cizgi
            d={`M${cx - 48} ${cy - 10} C${cx - 28} ${cy - 34} ${cx + 12} ${cy - 28} ${cx + 4} ${cy - 4} C${cx - 4} ${cy + 20} ${cx + 32} ${cy + 22} ${cx + 22} ${cy - 8} C${cx + 14} ${cy - 30} ${cx - 28} ${cy + 28} ${cx - 42} ${cy + 8} Z`}
            renk="#7048e8"
            kalinlik={2.4}
            p={temelP}
          />
          <Cizgi d={daireYolu(cx + 52, cy + 28, 12)} renk="#1971c2" kalinlik={2} p={temelP} />
        </g>
      )}

      {/* Ökaryot ortak organeller: Çekirdek, ER, Golgi, Mitokondri, Ribozom */}
      {s.tur !== "prokaryot" && (
        <g>
          {/* ER kıvrımları */}
          <Cizgi
            d={`M${cx - 64} ${cy - 54} C${cx - 88} ${cy - 42} ${cx - 88} ${cy - 16} ${cx - 66} ${cy - 6} M${cx - 72} ${cy - 64} C${cx - 98} ${cy - 48} ${cx - 98} ${cy - 12} ${cx - 72} ${cy + 4}`}
            renk="#1971c2"
            kalinlik={2.6}
            p={temelP}
          />
          {/* Çekirdek + Çekirdekçik */}
          <Cizgi d={daireYolu(cx - 28, cy - 16, 36)} renk="#5f3dc4" dolgu="#e5dbff" kalinlik={2.4} p={temelP} />
          <Cizgi d={daireYolu(cx - 22, cy - 16, 12)} renk="#5f3dc4" dolgu="#b197fc" kalinlik={1.6} p={temelP} />

          {/* Golgi Aygıtı */}
          <Cizgi
            d={`M${cx - 90} ${cy + 46} Q${cx - 72} ${cy + 38} ${cx - 56} ${cy + 46} M${cx - 92} ${cy + 55} Q${cx - 72} ${cy + 47} ${cx - 54} ${cy + 55} M${cx - 88} ${cy + 64} Q${cx - 72} ${cy + 56} ${cx - 58} ${cy + 64}`}
            renk="#0c8599"
            kalinlik={3}
            p={temelP}
          />

          {/* Mitokondriler (Krista kıvrımlı) */}
          {[
            [cx + 76, cy - 52, -22],
            [cx + 26, cy + 72, 14],
          ].map(([mx, my, rot], i) => (
            <g key={`mit-${i}`} transform={`translate(${mx} ${my}) rotate(${rot})`}>
              <Cizgi d="M-24 0 A24 12 0 1 0 24 0 A24 12 0 1 0 -24 0 Z" renk="#c92a2a" dolgu="#ffc9c9" kalinlik={2} p={temelP} />
              <Cizgi d="M-16 0 L-10 -6 L-4 6 L2 -6 L8 6 L14 -5 L18 0" renk="#c92a2a" kalinlik={1.6} p={temelP} />
            </g>
          ))}
        </g>
      )}

      {/* Ribozom noktaları */}
      {[
        [cx + 14, cy + 44],
        [cx + 24, cy + 54],
        [cx - 38, cy + 68],
        [cx + 58, cy - 18],
        [cx - 6, cy - 72],
      ].map(([rx, ry], i) => (
        <Cizgi key={`rib-${i}`} d={daireYolu(rx, ry, 2.5)} renk="#1e293b" dolgu="#1e293b" kalinlik={1} p={temelP} kalem={false} />
      ))}

      {/* İşaretçi Okları ve Etiket Kartları */}
      {kartlar.map((k) => {
        if (k.p <= 0) return null;
        const vurgulu = Boolean(k.veri.vurgulu);
        const renk = renkCoz(k.veri.renk, vurgulu ? "#e03131" : "#1971c2");
        const dolgu = vurgulu ? "#fff5f5" : "#f8fafc";
        const ucX = k.solMu ? k.kartX + k.kartW : k.kartX;
        const dirsekX = k.solMu ? k.kartX + k.kartW + 18 : k.kartX - 18;
        const kartMerkezX = k.kartX + k.kartW / 2;
        return (
          <g key={`org-${k.idx}`}>
            {vurgulu && (
              <Cizgi d={daireYolu(k.ax, k.ay, 16)} renk={renk} dolgu={renk} dolguOpaklik={0.14} kalinlik={2} kesikli p={k.p} kalem={false} />
            )}
            <Cizgi
              d={`M${k.ax} ${k.ay} L${dirsekX} ${k.cyKart} L${ucX} ${k.cyKart}`}
              renk={renk}
              kalinlik={vurgulu ? 2.4 : 1.7}
              p={k.p}
            />
            <Cizgi d={daireYolu(k.ax, k.ay, 3.8)} renk={renk} dolgu={renk} kalinlik={1} p={k.p} kalem={false} />
            <Cizgi
              d={yuvarlakKutuYolu(k.kartX, k.kartY, k.kartW, k.kartH, 8)}
              renk={renk}
              dolgu={dolgu}
              kalinlik={vurgulu ? 2.4 : 1.6}
              p={k.p}
            />
            <CokSatirliYazi
              x={kartMerkezX}
              y={k.adY}
              metin={k.adMetni}
              maksGenislik={icW}
              boyut={adBoyut}
              satirYuksekligi={adSatirH}
              renk={vurgulu ? renk : "#1e293b"}
              konturKalinlik={0}
              kalin
              p={sinirla((k.p - 0.25) * 1.4)}
            />
            {k.aciklamaMetni && (
              <CokSatirliYazi
                x={kartMerkezX}
                y={k.aciklamaY}
                metin={k.aciklamaMetni}
                maksGenislik={icW}
                boyut={aciklamaBoyut}
                satirYuksekligi={aciklamaSatirH}
                renk="#475569"
                konturKalinlik={0}
                p={sinirla((k.p - 0.4) * 1.6)}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ============================================================================
// 8. TERAZİ
// ============================================================================

function TeraziSahne({ parcalar, kutu }: { parcalar: SablonParca<"terazi">[]; kutu: Blok["kutu"] }) {
  const s = birlesikSablon(parcalar);
  const boyut = sahneBoyutu(kutu, 470);
  const H = boyut.h;
  const { temelP, ozetP } = asamaIlerlemesi(parcalar, 2);
  const solMaddeler = listeIlerlemesi(parcalar, (x) => x.sol?.maddeler, (m, i) => `${etiketNormal(m)}-${i}`).map((x) => x.veri);
  const sagMaddeler = listeIlerlemesi(parcalar, (x) => x.sag?.maddeler, (m, i) => `${etiketNormal(m)}-${i}`).map((x) => x.veri);

  const icerikUstY = s.baslik ? 58 : 22;
  const cx = W / 2;
  const solSatirSayisi = solMaddeler.map((m) => duz(m)).filter(Boolean).flatMap((m) => satirlaraBol(m, 168, boyut.altBoyut)).length;
  const sagSatirSayisi = sagMaddeler.map((m) => duz(m)).filter(Boolean).flatMap((m) => satirlaraBol(m, 168, boyut.altBoyut)).length;
  const maksKartH = Math.max(46, 34 + Math.max(solSatirSayisi, sagSatirSayisi) * 18);
  const pivotY = icerikUstY + 78;
  const tabanY = H - 28;
  const kolYari = Math.min(206, W * 0.28);

  const egimAci = s.denge === "sol_agir" ? -9.5 : s.denge === "sag_agir" ? 9.5 : 0;
  const rad = (egimAci * Math.PI) / 180;
  const solUc = { x: cx - kolYari * Math.cos(rad), y: pivotY - kolYari * Math.sin(rad) };
  const sagUc = { x: cx + kolYari * Math.cos(rad), y: pivotY + kolYari * Math.sin(rad) };

  const ipBoy = Math.max(82, maksKartH + 14);
  const kefeCiz = (uc: { x: number; y: number }, kefe: TeraziSablonu["sol"], maddelerListesi: string[], varsayilanRenk: string, p: number) => {
    const renk = renkCoz(kefe.renk, varsayilanRenk);
    const kefeY = uc.y + ipBoy;
    const maddeler = maddelerListesi.map((m) => duz(m)).filter(Boolean);
    const satirlar = maddeler.flatMap((m) => satirlaraBol(m, 168, boyut.altBoyut));
    const kartH = Math.max(46, 34 + satirlar.length * 18);
    const kartW = 190;
    const kartY = kefeY - kartH - 12;

    return (
      <g>
        <Cizgi d={`M${uc.x} ${uc.y} L${uc.x - 62} ${kefeY} M${uc.x} ${uc.y} L${uc.x + 62} ${kefeY}`} renk="#64748b" kalinlik={1.8} p={p} />
        <Cizgi
          d={`M${uc.x - 76} ${kefeY} H${uc.x + 76} C${uc.x + 68} ${kefeY + 18} ${uc.x - 68} ${kefeY + 18} ${uc.x - 76} ${kefeY} Z`}
          renk={renk}
          dolgu="#fff3bf"
          kalinlik={2.3}
          p={p}
        />
        <Cizgi d={yuvarlakKutuYolu(uc.x - kartW / 2, kartY, kartW, kartH, 10)} renk={renk} dolgu="#ffffff" dolguOpaklik={0.94} kalinlik={2.2} p={p} />
        <Yazi
          x={uc.x}
          y={kartY + 23}
          metin={etiketBirlestir(duz(kefe.baslik), kefe.agirlik !== undefined ? String(kefe.agirlik) : undefined, " • ")}
          boyut={boyut.etiketBoyut}
          renk={renk}
          hizala="middle"
          konturKalinlik={0}
          kalin
          p={sinirla((p - 0.25) * 1.4)}
        />
        {satirlar.map((satir, i) => (
          <Yazi
            key={i}
            x={uc.x}
            y={kartY + 44 + i * 18}
            metin={satir}
            boyut={boyut.altBoyut}
            renk="#334155"
            hizala="middle"
            konturKalinlik={0}
            p={sinirla((p - 0.35) * 1.5)}
          />
        ))}
      </g>
    );
  };

  const kefeP = parcalar.length > 1 ? sinirla(parcalar[parcalar.length - 1].p) : sinirla((parcalar[0].p - 0.2) * 1.3);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin meet" overflow="hidden">
      <BaslikSatiri baslik={s.baslik} w={W} boyut={boyut.baslikBoyut} p={temelP} />

      <Cizgi d={`M${cx - 86} ${tabanY} H${cx + 86} M${cx - 56} ${tabanY - 12} H${cx + 56} M${cx} ${tabanY - 12} V${pivotY}`} renk="#1e293b" kalinlik={3.2} p={temelP} />
      <Cizgi d={`M${solUc.x.toFixed(1)} ${solUc.y.toFixed(1)} L${sagUc.x.toFixed(1)} ${sagUc.y.toFixed(1)}`} renk="#1e293b" kalinlik={3.6} p={temelP} />
      <Cizgi d={daireYolu(cx, pivotY, 8)} renk="#1e293b" dolgu="#ffd43b" kalinlik={2.2} p={temelP} />

      {kefeCiz(solUc, s.sol, solMaddeler, "#1971c2", kefeP)}
      {kefeCiz(sagUc, s.sag, sagMaddeler, "#2f9e44", kefeP)}

      {s.merkezEtiket && ozetP > 0 && (
        <g>
          <Cizgi d={yuvarlakKutuYolu(cx - 52, pivotY - 46, 104, 30, 12)} renk="#7048e8" dolgu="#f3f0ff" kalinlik={1.8} p={ozetP} kalem={false} />
          <Yazi x={cx} y={pivotY - 26} metin={duz(s.merkezEtiket)} boyut={boyut.altBoyut} renk="#5f3dc4" hizala="middle" konturKalinlik={0} kalin p={ozetP} />
        </g>
      )}
    </svg>
  );
}

// ============================================================================
// 9. PİRAMİT
// ============================================================================

function PiramitSahne({ parcalar, kutu }: { parcalar: SablonParca<"piramit">[]; kutu: Blok["kutu"] }) {
  const s = birlesikSablon(parcalar);
  const boyut = sahneBoyutu(kutu, 480);
  const H = boyut.h;

  const hamKatmanlar = listeIlerlemesi(
    parcalar,
    (x) => x.katmanlar,
    (k, i) => `${etiketNormal(k.baslik)}-${i}`,
  );
  const katmanlar: Ogeli<PiramitKatmani>[] = s.yon === "alttan_uste" ? [...hamKatmanlar].reverse() : hamKatmanlar;
  const { temelP, ozetP } = asamaIlerlemesi(parcalar, katmanlar.length);

  const icerikUstY = s.baslik ? 60 : 22;
  const n = Math.max(1, katmanlar.length);
  const tabanY = H - 24;
  const toplamH = tabanY - icerikUstY;
  const aralik = 6;
  const katH = (toplamH - aralik * (n - 1)) / n;

  const yanVar = Boolean(duz(s.yanEtiket));
  const cx = yanVar ? W * 0.56 : W * 0.5;
  const ustW = 92;
  const altW = yanVar ? 440 : 510;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin meet" overflow="hidden">
      <BaslikSatiri baslik={s.baslik} w={W} boyut={boyut.baslikBoyut} p={temelP} />

      {katmanlar.map((k, i) => {
        if (k.p <= 0) return null;
        const y0 = icerikUstY + i * (katH + aralik);
        const y1 = y0 + katH;
        const w0 = ustW + (i / n) * (altW - ustW);
        const w1 = ustW + ((i + 1) / n) * (altW - ustW);
        const icW = (w0 + w1) / 2 - 34;

        const dolgu = renkCoz(k.veri.renk, PASTEL_DOLGULAR[i % PASTEL_DOLGULAR.length]);
        const vurguRenk = k.veri.vurgulu ? "#e03131" : "#1e293b";
        const baslik = duz(k.veri.baslik);
        const alt = duz(k.veri.altMetin);
        const iceriSigar = yaziGenisligi(baslik, boyut.etiketBoyut) <= icW && katH >= 38;
        const yanX = cx + w1 / 2 + 24;

        return (
          <g key={`pir-${i}`}>
            <Cizgi
              d={cokgenYolu([
                [cx - w0 / 2, y0],
                [cx + w0 / 2, y0],
                [cx + w1 / 2, y1],
                [cx - w1 / 2, y1],
              ])}
              renk={vurguRenk}
              dolgu={dolgu}
              kalinlik={k.veri.vurgulu ? 3 : 2.1}
              p={k.p}
            />
            {iceriSigar ? (
              <g>
                <CokSatirliYazi
                  x={cx}
                  y={alt ? y0 + katH * 0.38 : y0 + katH * 0.52}
                  metin={baslik}
                  maksGenislik={icW}
                  boyut={boyut.etiketBoyut}
                  renk="#1e293b"
                  konturKalinlik={0}
                  kalin
                  p={sinirla((k.p - 0.25) * 1.4)}
                />
                {alt && (
                  <CokSatirliYazi
                    x={cx}
                    y={y0 + katH * 0.72}
                    metin={alt}
                    maksGenislik={icW}
                    boyut={boyut.altBoyut - 1}
                    renk="#475569"
                    konturKalinlik={0}
                    p={sinirla((k.p - 0.4) * 1.6)}
                  />
                )}
              </g>
            ) : (
              <g>
                <Cizgi d={`M${(cx + (w0 + w1) / 4).toFixed(1)} ${(y0 + katH / 2).toFixed(1)} H${yanX - 6}`} renk={vurguRenk} kalinlik={1.6} p={k.p} />
                <Yazi
                  x={yanX}
                  y={y0 + katH / 2 + 5}
                  metin={etiketBirlestir(baslik, alt, " — ")}
                  boyut={boyut.altBoyut}
                  renk="#1e293b"
                  kalin
                  p={sinirla((k.p - 0.25) * 1.4)}
                />
              </g>
            )}
          </g>
        );
      })}

      {yanVar && ozetP > 0 && (
        <g>
          <Ok
            x1={64}
            y1={s.yon === "alttan_uste" ? tabanY - 12 : icerikUstY + 12}
            x2={64}
            y2={s.yon === "alttan_uste" ? icerikUstY + 12 : tabanY - 12}
            renk="#1971c2"
            kalinlik={2.6}
            ucBoyutu={11}
            p={ozetP}
          />
          <text
            x={42}
            y={(icerikUstY + tabanY) / 2}
            transform={`rotate(-90 42 ${(icerikUstY + tabanY) / 2})`}
            textAnchor="middle"
            fontFamily={EL_YAZISI}
            fontSize={boyut.altBoyut}
            fontWeight={600}
            fill="#1971c2"
            opacity={ozetP}
          >
            {duz(s.yanEtiket)}
          </text>
        </g>
      )}
    </svg>
  );
}

// ============================================================================
// 10. VENN ŞEMASI
// ============================================================================

function VennSahne({ parcalar, kutu }: { parcalar: SablonParca<"venn">[]; kutu: Blok["kutu"] }) {
  const s = birlesikSablon(parcalar);
  const boyut = sahneBoyutu(kutu, 470);
  const H = boyut.h;
  const kumeler = listeIlerlemesi(
    parcalar,
    (x) => x.kumeler.slice(0, 3),
    (k, i) => `${etiketNormal(k.ad)}-${i}`,
  ).slice(0, 3);
  const kesisim = listeIlerlemesi(parcalar, (x) => x.kesisim, (m, i) => `${etiketNormal(m)}-${i}`);
  const { temelP, ozetP } = asamaIlerlemesi(parcalar, kumeler.length);

  const icerikUstY = s.baslik ? 58 : 20;
  const evrenselUst = s.evrensel ? icerikUstY + 34 : icerikUstY;
  const evrenselAlt = H - 18;
  const cx = W / 2;
  const n = kumeler.length;
  const ucMu = n >= 3;

  const ustEtiketPayi = 28;
  const altEtiketPayi = ucMu ? 30 : 12;
  const kulH = evrenselAlt - evrenselUst - ustEtiketPayi - altEtiketPayi;
  const r = ucMu ? Math.min(102, Math.max(66, kulH / 2.98)) : Math.min(130, Math.max(82, kulH / 2.08));
  const cy = ucMu
    ? evrenselUst + ustEtiketPayi + r + 0.34 * r
    : evrenselUst + ustEtiketPayi + (kulH - 2 * r) / 2 + r;

  const konumlar: { x: number; y: number; baslikX: number; baslikY: number; icX: number; icY: number }[] = ucMu
    ? [
        { x: cx - 0.58 * r, y: cy - 0.34 * r, baslikX: cx - 1.38 * r, baslikY: cy - 1.34 * r - 12, icX: cx - 0.94 * r, icY: cy - 0.56 * r },
        { x: cx + 0.58 * r, y: cy - 0.34 * r, baslikX: cx + 1.38 * r, baslikY: cy - 1.34 * r - 12, icX: cx + 0.94 * r, icY: cy - 0.56 * r },
        { x: cx, y: cy + 0.62 * r, baslikX: cx, baslikY: cy + 1.62 * r + 20, icX: cx, icY: cy + 0.94 * r },
      ]
    : n === 2
      ? [
          { x: cx - r * 0.56, y: cy, baslikX: cx - r * 0.9, baslikY: cy - r - 14, icX: cx - r * 0.96, icY: cy },
          { x: cx + r * 0.56, y: cy, baslikX: cx + r * 0.9, baslikY: cy - r - 14, icX: cx + r * 0.96, icY: cy },
        ]
      : [{ x: cx, y: cy, baslikX: cx, baslikY: cy - r - 14, icX: cx, icY: cy }];

  const varsayilanDolgular = ["#a5d8ff", "#ffc9c9", "#b2f2bb"];
  const yaziAdim = boyut.altBoyut * 1.28;
  const blokPozisyonla = (maddeler: string[], maksW: number, merkezY: number, maksAdet: number) => {
    const parcali = maddeler.slice(0, maksAdet).map((m) => satirlaraBol(m, maksW, boyut.altBoyut));
    const ara = 4;
    const toplamH = parcali.reduce((t, ls, idx) => t + ls.length * yaziAdim + (idx > 0 ? ara : 0), 0);
    let yImlec = merkezY - toplamH / 2;
    return parcali.map((ls, idx) => {
      const h = ls.length * yaziAdim;
      const y = yImlec + h / 2;
      yImlec += h + ara;
      return { metin: ls.join(" "), y, idx };
    });
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin meet" overflow="hidden">
      <BaslikSatiri baslik={s.baslik} w={W} boyut={boyut.baslikBoyut} p={temelP} />

      {s.evrensel && (
        <g>
          <Cizgi
            d={yuvarlakKutuYolu(24, icerikUstY + 4, W - 48, evrenselAlt - icerikUstY - 4, 14)}
            renk="#64748b"
            dolgu="#f8fafc"
            dolguOpaklik={0.6}
            kalinlik={2}
            p={temelP}
          />
          <Yazi x={42} y={icerikUstY + 28} metin={duz(s.evrensel)} boyut={boyut.etiketBoyut} renk="#475569" kalin p={temelP} />
        </g>
      )}

      {kumeler.map((k: Ogeli<VennKumesi>, i) => {
        if (k.p <= 0) return null;
        const pos = konumlar[i];
        const renk = renkCoz(k.veri.renk, VURGU_RENKLERI[i % VURGU_RENKLERI.length]);
        const dolgu = varsayilanDolgular[i % varsayilanDolgular.length];
        const hamMaddeler = (k.veri.elemanlar ?? []).map((e) => duz(e)).filter(Boolean);
        const maksW = ucMu ? r * 0.84 : r * 0.88;
        const pozlar = blokPozisyonla(hamMaddeler, maksW, pos.icY, 5);
        return (
          <g key={`venn-${i}`}>
            <Cizgi d={daireYolu(pos.x, pos.y, r)} renk={renk} dolgu={dolgu} dolguOpaklik={0.38} kalinlik={2.6} p={k.p} />
            <Yazi x={pos.baslikX} y={pos.baslikY} metin={duz(k.veri.ad)} boyut={boyut.etiketBoyut} renk={renk} hizala="middle" kalin p={k.p} />
            {pozlar.map((item) => (
              <CokSatirliYazi
                key={item.idx}
                x={pos.icX}
                y={item.y}
                metin={item.metin}
                maksGenislik={maksW}
                boyut={boyut.altBoyut}
                satirYuksekligi={yaziAdim}
                renk="#1e293b"
                konturKalinlik={0}
                p={sinirla((k.p - 0.3) * 1.5)}
              />
            ))}
          </g>
        );
      })}

      {kesisim.length > 0 && ozetP > 0 && (() => {
        const maksW = ucMu ? r * 0.72 : r * 0.76;
        const pozlar = blokPozisyonla(kesisim.map((m) => duz(m.veri)).filter(Boolean), maksW, ucMu ? cy + 0.04 * r : cy, 4);
        return (
          <g>
            {pozlar.map((item) => (
              <CokSatirliYazi
                key={`kes-${item.idx}`}
                x={cx}
                y={item.y}
                metin={item.metin}
                maksGenislik={maksW}
                boyut={boyut.altBoyut}
                satirYuksekligi={yaziAdim}
                renk="#1e293b"
                konturKalinlik={3}
                kalin
                p={kesisim[item.idx].p}
              />
            ))}
          </g>
        );
      })()}
    </svg>
  );
}

// ============================================================================
// 11. İKON IZGARASI
// ============================================================================

function IkonIzgarasiSahne({ parcalar, kutu }: { parcalar: SablonParca<"ikon_izgarasi">[]; kutu: Blok["kutu"] }) {
  const s = birlesikSablon(parcalar);
  const boyut = sahneBoyutu(kutu, 460);
  const ogeler: Ogeli<IkonIzgarasiOge>[] = listeIlerlemesi(
    parcalar,
    (x) => x.ogeler,
    (o, i) => `${etiketNormal(o.ikon)}-${etiketNormal(o.baslik)}-${i}`,
  );
  const { temelP } = asamaIlerlemesi(parcalar, ogeler.length);

  const n = Math.max(1, ogeler.length);
  const sutun = aralikta(Math.round(s.sutunSayisi ?? (n <= 3 ? n : n === 4 ? 2 : 3)), 1, 4);
  const satirSayisi = Math.ceil(n / sutun);
  const tekSatirAkis = satirSayisi === 1 && sutun >= 2 && sutun <= 4;

  const icerikUstY = s.baslik ? 60 : 20;
  const yanPay = 22;
  const gapX = tekSatirAkis ? 34 : 18;
  const gapY = 18;
  const kartW = (W - yanPay * 2 - gapX * (sutun - 1)) / sutun;
  const ikonBoyut = sutun >= 4 ? 54 : 64;
  const icW = kartW - 22;

  const satirYukseklikleri = Array.from({ length: satirSayisi }, (_, r) => {
    let maksMetinH = 44;
    for (let c = 0; c < sutun; c++) {
      const idx = r * sutun + c;
      if (idx >= ogeler.length) continue;
      const o = ogeler[idx].veri;
      const bSatir = satirlaraBol(duz(o.baslik), icW, boyut.etiketBoyut).length;
      const aSatir = o.altMetin ? satirlaraBol(duz(o.altMetin), icW, boyut.altBoyut).length : 0;
      maksMetinH = Math.max(maksMetinH, bSatir * 20 + aSatir * 17 + (aSatir ? 8 : 0) + 12);
    }
    return ikonBoyut + 28 + maksMetinH;
  });

  const toplamSatirH = satirYukseklikleri.reduce((a, b) => a + b, 0) + gapY * Math.max(0, satirSayisi - 1);
  const viewH = Math.max(boyut.h, icerikUstY + toplamSatirH + 22);
  const baslangicY = icerikUstY + Math.max(0, (viewH - icerikUstY - toplamSatirH - 22) / 2);

  const satirY = (r: number) => baslangicY + satirYukseklikleri.slice(0, r).reduce((a, b) => a + b + gapY, 0);

  return (
    <svg viewBox={`0 0 ${W} ${viewH}`} preserveAspectRatio="xMidYMin meet" overflow="hidden">
      <BaslikSatiri baslik={s.baslik} w={W} boyut={boyut.baslikBoyut} p={temelP} />

      {ogeler.map((o, i) => {
        if (o.p <= 0) return null;
        const r = Math.floor(i / sutun);
        const c = i % sutun;
        const buSatirSayi = Math.min(sutun, n - r * sutun);
        const satirGenislik = buSatirSayi * kartW + (buSatirSayi - 1) * gapX;
        const x0 = (W - satirGenislik) / 2 + c * (kartW + gapX);
        const y0 = satirY(r);
        const kartH = satirYukseklikleri[r];

        const vurgu = Boolean(o.veri.vurgulu);
        const renk = renkCoz(o.veri.renk, VURGU_RENKLERI[i % VURGU_RENKLERI.length]);
        const dolgu = vurgu ? PASTEL_DOLGULAR[i % PASTEL_DOLGULAR.length] : "#f8fafc";
        const baslikMetin = duz(o.veri.baslik);
        const altMetin = duz(o.veri.altMetin);
        const ikonX = x0 + (kartW - ikonBoyut) / 2;
        const ikonY = y0 + 14;
        const bSatirSayisi = satirlaraBol(baslikMetin, icW, boyut.etiketBoyut).length;
        const baslikY = ikonY + ikonBoyut + 22;
        const altY = baslikY + bSatirSayisi * 19 + 4;

        return (
          <g key={`ig-${i}`}>
            <Cizgi d={yuvarlakKutuYolu(x0, y0, kartW, kartH, 14)} renk={renk} dolgu={dolgu} kalinlik={vurgu ? 2.8 : 1.9} p={o.p} />
            <IkonCiz ad={o.veri.ikon} x={ikonX} y={ikonY} boyut={ikonBoyut} p={sinirla(o.p * 1.25)} />
            <CokSatirliYazi
              x={x0 + kartW / 2}
              y={baslikY}
              metin={baslikMetin}
              maksGenislik={icW}
              boyut={boyut.etiketBoyut}
              satirYuksekligi={19}
              renk="#1e293b"
              dikeyHizala="ust"
              konturKalinlik={0}
              kalin
              p={sinirla((o.p - 0.3) * 1.5)}
            />
            {altMetin && (
              <CokSatirliYazi
                x={x0 + kartW / 2}
                y={altY}
                metin={altMetin}
                maksGenislik={icW}
                boyut={boyut.altBoyut}
                satirYuksekligi={16}
                renk="#475569"
                dikeyHizala="ust"
                konturKalinlik={0}
                p={sinirla((o.p - 0.45) * 1.8)}
              />
            )}
            {tekSatirAkis && i < n - 1 && (
              <Ok
                x1={x0 + kartW + 5}
                y1={y0 + kartH / 2}
                x2={x0 + kartW + gapX - 5}
                y2={y0 + kartH / 2}
                renk="#64748b"
                kalinlik={2.2}
                ucBoyutu={8}
                p={sinirla((o.p - 0.6) * 2.5)}
                kalem={false}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ============================================================================
// ANA BİLEŞEN
// ============================================================================

export function HazirSahneBlok({
  parcalar,
  blokId,
  kutu,
}: {
  parcalar: Parca<HazirSahneAksiyonu>[];
  blokId: string;
  kutu: Blok["kutu"];
}) {
  const kirpId = `hs${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const son = parcalar[parcalar.length - 1]?.aksiyon;
  if (!son) return null;

  const sahne = (() => {
    switch (son.sablon) {
      case "egik_duzlem":
        return <EgikDuzlemSahne parcalar={parcalariBirlestir(parcalar, "egik_duzlem")} kutu={kutu} />;
      case "elektrik_devresi":
        return <ElektrikDevresiSahne parcalar={parcalariBirlestir(parcalar, "elektrik_devresi")} kutu={kutu} />;
      case "optik_duzenek":
        return <OptikDuzenekSahne parcalar={parcalariBirlestir(parcalar, "optik_duzenek")} kutu={kutu} />;
      case "kuvvet_dengesi":
        return <KuvvetDengesiSahne parcalar={parcalariBirlestir(parcalar, "kuvvet_dengesi")} kutu={kutu} />;
      case "atom_modeli":
        return <AtomModeliSahne parcalar={parcalariBirlestir(parcalar, "atom_modeli")} kutu={kutu} />;
      case "tepkime_kabi":
        return <TepkimeKabiSahne parcalar={parcalariBirlestir(parcalar, "tepkime_kabi")} kutu={kutu} />;
      case "hucre_kesiti":
        return <HucreKesitiSahne parcalar={parcalariBirlestir(parcalar, "hucre_kesiti")} kutu={kutu} />;
      case "terazi":
        return <TeraziSahne parcalar={parcalariBirlestir(parcalar, "terazi")} kutu={kutu} />;
      case "piramit":
        return <PiramitSahne parcalar={parcalariBirlestir(parcalar, "piramit")} kutu={kutu} />;
      case "venn":
        return <VennSahne parcalar={parcalariBirlestir(parcalar, "venn")} kutu={kutu} />;
      case "ikon_izgarasi":
        return <IkonIzgarasiSahne parcalar={parcalariBirlestir(parcalar, "ikon_izgarasi")} kutu={kutu} />;
    }
  })();

  return (
    <Fragment key={`${blokId}-${kirpId}`}>
      {sahne}
    </Fragment>
  );
}
