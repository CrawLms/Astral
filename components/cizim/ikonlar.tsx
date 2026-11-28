"use client";

import { useMemo } from "react";
import { Cizgi, parcaIlerlemesi, sinirla, yuvarlakKutuYolu } from "@/components/cizim/ortak";

export const IKON_ADLARI = [
  "gunes",
  "bulut",
  "yagmur",
  "dunya",
  "dag",
  "agac",
  "yaprak",
  "kalp",
  "akciger",
  "noron",
  "dna",
  "mikroskop",
  "pil",
  "ampul",
  "direnc",
  "anahtar",
  "miknatis",
  "disli",
  "merdiven",
  "kopru",
  "kalkan",
  "kitap",
  "kalem",
  "parsomen",
  "saat",
  "ev",
  "bayrak",
  "insan",
  "terazi",
  "beher",
  "atom",
  "damla",
  "simsek",
  "yildiz",
  "termometre",
  "pusula",
] as const;

export type IkonAdi = (typeof IKON_ADLARI)[number];

export const IKON_SETI = new Set<string>(IKON_ADLARI);

type IkonYol = {
  d: string;
  renk?: string;
  dolgu?: string;
  dolguOpaklik?: number;
  kalinlik?: number;
  kesikli?: boolean;
  anaStroke?: boolean;
  anaDolgu?: boolean;
  kalem?: boolean;
};

const MUREKKEP = "#1e293b";

const daireYolu = (cx: number, cy: number, r: number) =>
  `M${(cx - r).toFixed(2)} ${cy.toFixed(2)} A${r} ${r} 0 1 0 ${(cx + r).toFixed(2)} ${cy.toFixed(2)} A${r} ${r} 0 1 0 ${(cx - r).toFixed(2)} ${cy.toFixed(2)} Z`;

function disliYolu(cx: number, cy: number, disSayisi: number, rDis: number, rIc: number): string {
  const adim = (Math.PI * 2) / disSayisi;
  const noktalar: string[] = [];
  for (let i = 0; i < disSayisi; i++) {
    const a0 = i * adim - adim * 0.28;
    const a1 = i * adim - adim * 0.14;
    const a2 = i * adim + adim * 0.14;
    const a3 = i * adim + adim * 0.28;
    const p0 = `${(cx + rIc * Math.cos(a0)).toFixed(1)} ${(cy + rIc * Math.sin(a0)).toFixed(1)}`;
    const p1 = `${(cx + rDis * Math.cos(a1)).toFixed(1)} ${(cy + rDis * Math.sin(a1)).toFixed(1)}`;
    const p2 = `${(cx + rDis * Math.cos(a2)).toFixed(1)} ${(cy + rDis * Math.sin(a2)).toFixed(1)}`;
    const p3 = `${(cx + rIc * Math.cos(a3)).toFixed(1)} ${(cy + rIc * Math.sin(a3)).toFixed(1)}`;
    noktalar.push(i === 0 ? `M${p0}` : `L${p0}`, `L${p1}`, `L${p2}`, `L${p3}`);
  }
  return `${noktalar.join(" ")} Z`;
}

function yildizYolu(cx: number, cy: number, uclar: number, rDis: number, rIc: number): string {
  const adim = Math.PI / uclar;
  const parcalar: string[] = [];
  for (let i = 0; i < uclar * 2; i++) {
    const r = i % 2 === 0 ? rDis : rIc;
    const aci = -Math.PI / 2 + i * adim;
    const x = (cx + r * Math.cos(aci)).toFixed(1);
    const y = (cy + r * Math.sin(aci)).toFixed(1);
    parcalar.push(`${i === 0 ? "M" : "L"}${x} ${y}`);
  }
  return `${parcalar.join(" ")} Z`;
}

function gunesIsinlari(): IkonYol[] {
  const yollar: IkonYol[] = [];
  for (let i = 0; i < 8; i++) {
    const aci = (i * Math.PI) / 4;
    const r1 = 19;
    const r2 = i % 2 === 0 ? 30 : 26;
    yollar.push({
      d: `M${(40 + r1 * Math.cos(aci)).toFixed(1)} ${(40 + r1 * Math.sin(aci)).toFixed(1)} L${(40 + r2 * Math.cos(aci)).toFixed(1)} ${(40 + r2 * Math.sin(aci)).toFixed(1)}`,
      renk: "#f08c00",
      kalinlik: 2.5,
      anaStroke: true,
    });
  }
  return yollar;
}

const IKON_YOLLARI: Record<IkonAdi, IkonYol[]> = {
  gunes: [
    { d: daireYolu(40, 40, 21), renk: "none", dolgu: "#fff9db", dolguOpaklik: 0.9, kalinlik: 0, kalem: false },
    { d: daireYolu(40, 40, 14), renk: MUREKKEP, dolgu: "#ffd43b", kalinlik: 2.2, anaStroke: true, anaDolgu: true },
    { d: "M32 34 A10 10 0 0 1 43 29", renk: "#fff9db", kalinlik: 2 },
    ...gunesIsinlari(),
  ],
  bulut: [
    {
      d: "M22 56 H58 C65 56 70 51 70 44 C70 38 65 33 59 33 C58 23 50 17 40 17 C31 17 24 23 22 31 C15 32 10 37 10 44 C10 51 15 56 22 56 Z",
      renk: MUREKKEP,
      dolgu: "#e7f5ff",
      kalinlik: 2.3,
      anaStroke: true,
      anaDolgu: true,
    },
    { d: "M26 33 A11 11 0 0 1 40 23", renk: "#74c0fc", kalinlik: 2 },
  ],
  yagmur: [
    {
      d: "M22 46 H58 C64 46 69 41 69 35 C69 30 65 25 59 25 C58 17 50 12 40 12 C31 12 24 17 22 24 C16 25 11 29 11 35 C11 41 16 46 22 46 Z",
      renk: MUREKKEP,
      dolgu: "#d0ebff",
      kalinlik: 2.2,
      anaStroke: true,
      anaDolgu: true,
    },
    { d: "M24 52 L19 63", renk: "#1971c2", kalinlik: 2.4 },
    { d: "M36 53 L31 67", renk: "#1971c2", kalinlik: 2.4 },
    { d: "M48 52 L43 63", renk: "#1971c2", kalinlik: 2.4 },
    { d: "M60 53 L55 67", renk: "#1971c2", kalinlik: 2.4 },
  ],
  dunya: [
    { d: daireYolu(40, 40, 28), renk: "none", dolgu: "#a5d8ff", kalinlik: 0, anaDolgu: true, kalem: false },
    {
      d: "M22 21 C28 21 31 27 28 33 C26 37 33 42 31 49 C29 56 24 61 21 57 C19 52 21 45 18 40 C15 35 17 23 22 21 Z",
      renk: "#2f9e44",
      dolgu: "#8ce99a",
      kalinlik: 1.5,
    },
    {
      d: "M43 18 C52 17 61 23 62 31 C63 38 56 41 54 47 C52 54 47 59 44 55 C41 49 43 43 39 38 C36 33 38 21 43 18 Z",
      renk: "#2f9e44",
      dolgu: "#8ce99a",
      kalinlik: 1.5,
    },
    { d: "M13 41 Q40 49 67 41", renk: "#1971c2", kalinlik: 1.4, kesikli: true },
    { d: daireYolu(40, 40, 28), renk: MUREKKEP, kalinlik: 2.3, anaStroke: true },
  ],
  dag: [
    { d: "M34 62 L53 27 L71 62 Z", renk: MUREKKEP, dolgu: "#ced4da", kalinlik: 2.1, anaStroke: true },
    { d: "M9 62 L34 17 L59 62 Z", renk: MUREKKEP, dolgu: "#a5d8ff", kalinlik: 2.3, anaStroke: true, anaDolgu: true },
    { d: "M26 31 L34 17 L42 31 L37 28 L34 32 L30 28 Z", renk: MUREKKEP, dolgu: "#ffffff", kalinlik: 1.6 },
    { d: "M34 33 L32 48 L36 62", renk: "#1971c2", kalinlik: 1.6 },
  ],
  agac: [
    { d: "M16 68 H64", renk: "#2f9e44", kalinlik: 2.2 },
    { d: "M35 68 L37 42 H43 L45 68 Z", renk: MUREKKEP, dolgu: "#e8c39e", kalinlik: 2.1, anaStroke: true },
    {
      d: "M23 46 C14 46 12 33 21 29 C21 18 31 12 40 12 C49 12 59 18 59 29 C68 33 66 46 57 46 Z",
      renk: MUREKKEP,
      dolgu: "#b2f2bb",
      kalinlik: 2.3,
      anaStroke: true,
      anaDolgu: true,
    },
    { d: "M27 28 C30 21 38 18 45 21", renk: "#2f9e44", kalinlik: 1.8 },
  ],
  yaprak: [
    {
      d: "M18 60 C16 35 34 17 64 14 C60 44 42 62 18 60 Z",
      renk: MUREKKEP,
      dolgu: "#b2f2bb",
      kalinlik: 2.3,
      anaStroke: true,
      anaDolgu: true,
    },
    { d: "M12 66 Q34 44 58 20", renk: "#2f9e44", kalinlik: 2.2 },
    { d: "M30 48 L29 36 M30 48 L42 49 M42 36 L40 26 M42 36 L52 37", renk: "#2f9e44", kalinlik: 1.7 },
  ],
  kalp: [
    {
      d: "M40 65 C40 65 13 48 13 29 C13 20 20 14 28 14 C34 14 38 18 40 22 C42 18 46 14 52 14 C60 14 67 20 67 29 C67 48 40 65 40 65 Z",
      renk: "#c92a2a",
      dolgu: "#ffc9c9",
      kalinlik: 2.4,
      anaStroke: true,
      anaDolgu: true,
    },
    { d: "M22 26 C22 21 26 19 30 20", renk: "#ffffff", kalinlik: 2.4 },
  ],
  akciger: [
    { d: "M38 11 V28 L29 37 M42 11 V28 L51 37 M37 16 H43 M37 21 H43", renk: MUREKKEP, kalinlik: 2.1, anaStroke: true },
    {
      d: "M35 28 C22 26 12 37 12 53 C12 62 18 66 26 64 C32 62 35 55 35 46 Z",
      renk: MUREKKEP,
      dolgu: "#ffc9c9",
      kalinlik: 2.2,
      anaStroke: true,
      anaDolgu: true,
    },
    {
      d: "M45 28 C58 26 68 37 68 53 C68 62 62 66 54 64 C48 62 45 55 45 46 Z",
      renk: MUREKKEP,
      dolgu: "#ffc9c9",
      kalinlik: 2.2,
      anaStroke: true,
      anaDolgu: true,
    },
    { d: "M29 37 L22 44 M25 41 L24 52 M51 37 L58 44 M55 41 L56 52", renk: "#c92a2a", kalinlik: 1.6 },
  ],
  noron: [
    { d: "M16 33 L8 22 M14 40 L6 40 M16 47 L9 57 M23 31 L22 19 M23 49 L25 60", renk: "#7048e8", kalinlik: 2 },
    { d: daireYolu(22, 40, 9), renk: MUREKKEP, dolgu: "#e5dbff", kalinlik: 2.1, anaStroke: true, anaDolgu: true },
    { d: daireYolu(22, 40, 3.5), renk: "#7048e8", dolgu: "#7048e8", kalinlik: 1 },
    { d: "M31 40 H64 M64 40 L72 30 M64 40 L74 40 M64 40 L72 50", renk: MUREKKEP, kalinlik: 2.1, anaStroke: true },
    { d: yuvarlakKutuYolu(34, 36, 8, 8, 3), renk: "#f08c00", dolgu: "#fff3bf", kalinlik: 1.7 },
    { d: yuvarlakKutuYolu(44, 36, 8, 8, 3), renk: "#f08c00", dolgu: "#fff3bf", kalinlik: 1.7 },
    { d: yuvarlakKutuYolu(54, 36, 8, 8, 3), renk: "#f08c00", dolgu: "#fff3bf", kalinlik: 1.7 },
  ],
  dna: [
    { d: "M28 18 H52 M34 28 H46 M34 52 H46 M28 62 H52", renk: "#e03131", kalinlik: 2.1 },
    { d: "M26 11 C26 24 54 27 54 40 C54 53 26 56 26 69", renk: "#1971c2", kalinlik: 2.8, anaStroke: true },
    { d: "M54 11 C54 24 26 27 26 40 C26 53 54 56 54 69", renk: "#7048e8", kalinlik: 2.8 },
    { d: daireYolu(40, 18, 2.2), renk: "#2f9e44", dolgu: "#2f9e44", kalinlik: 1 },
    { d: daireYolu(40, 62, 2.2), renk: "#2f9e44", dolgu: "#2f9e44", kalinlik: 1 },
  ],
  mikroskop: [
    { d: "M17 67 H61 L58 60 H20 Z", renk: MUREKKEP, dolgu: "#d0ebff", kalinlik: 2.2, anaStroke: true, anaDolgu: true },
    { d: "M47 60 C58 54 60 36 49 26 L44 30 C52 38 51 52 41 58", renk: MUREKKEP, dolgu: "#e7f5ff", kalinlik: 2.1, anaStroke: true },
    { d: "M20 49 H46", renk: MUREKKEP, kalinlik: 3, anaStroke: true },
    { d: "M30 13 L38 10 L47 36 L39 39 Z", renk: MUREKKEP, dolgu: "#a5d8ff", kalinlik: 2.1, anaStroke: true },
    { d: daireYolu(52, 42, 4), renk: "#1971c2", dolgu: "#ffffff", kalinlik: 2 },
  ],
  pil: [
    { d: yuvarlakKutuYolu(34, 11, 12, 6, 2), renk: MUREKKEP, dolgu: "#ced4da", kalinlik: 2, anaStroke: true },
    { d: yuvarlakKutuYolu(25, 17, 30, 51, 5), renk: MUREKKEP, dolgu: "#e7f5ff", kalinlik: 2.2, anaStroke: true, anaDolgu: true },
    { d: yuvarlakKutuYolu(25, 17, 30, 19, 4), renk: MUREKKEP, dolgu: "#ffc9c9", kalinlik: 2, anaStroke: true },
    { d: "M35 26 H45 M40 21 V31", renk: "#c92a2a", kalinlik: 2.2 },
    { d: "M35 53 H45", renk: "#1971c2", kalinlik: 2.2 },
  ],
  ampul: [
    {
      d: "M30 48 C23 43 21 36 22 29 C23 20 31 15 40 15 C49 15 57 20 58 29 C59 36 57 43 50 48 L48 54 H32 Z",
      renk: MUREKKEP,
      dolgu: "#fff3bf",
      kalinlik: 2.2,
      anaStroke: true,
      anaDolgu: true,
    },
    { d: "M35 54 L36 37 L40 41 L44 37 L45 54", renk: "#e67700", kalinlik: 1.9 },
    { d: yuvarlakKutuYolu(32, 54, 16, 11, 2), renk: MUREKKEP, dolgu: "#dee2e6", kalinlik: 2, anaStroke: true },
    { d: "M32 59 H48 M36 65 L38 69 H42 L44 65", renk: MUREKKEP, kalinlik: 1.8 },
    { d: "M40 6 V11 M18 16 L22 20 M62 16 L58 20 M12 33 H17 M68 33 H63", renk: "#f08c00", kalinlik: 2.1 },
  ],
  direnc: [
    { d: yuvarlakKutuYolu(18, 28, 44, 24, 6), renk: "none", dolgu: "#fff4e6", kalinlik: 0, anaDolgu: true, kalem: false },
    { d: "M8 40 H19 L23 29 L30 51 L37 29 L44 51 L51 29 L58 51 L62 40 H72", renk: MUREKKEP, kalinlik: 2.5, anaStroke: true },
    { d: daireYolu(10, 40, 3), renk: MUREKKEP, dolgu: "#ffffff", kalinlik: 2 },
    { d: daireYolu(70, 40, 3), renk: MUREKKEP, dolgu: "#ffffff", kalinlik: 2 },
  ],
  anahtar: [
    { d: "M8 48 H18 M62 48 H72", renk: MUREKKEP, kalinlik: 2.4, anaStroke: true },
    { d: "M24 45 L55 24", renk: "#1971c2", kalinlik: 2.8, anaStroke: true },
    { d: "M51 27 L58 22", renk: "#e03131", kalinlik: 3.4 },
    { d: "M56 31 A30 30 0 0 1 58 43", renk: "#868e96", kalinlik: 1.6, kesikli: true },
    { d: daireYolu(22, 48, 4), renk: MUREKKEP, dolgu: "#e7f5ff", kalinlik: 2.2 },
    { d: daireYolu(58, 48, 4), renk: MUREKKEP, dolgu: "#e7f5ff", kalinlik: 2.2 },
  ],
  miknatis: [
    { d: "M18 21 V44 C18 57 28 66 40 66 V53 C34 53 31 49 31 44 V21 Z", renk: MUREKKEP, dolgu: "#ffa8a8", kalinlik: 2.2, anaStroke: true, anaDolgu: true },
    { d: "M62 21 V44 C62 57 52 66 40 66 V53 C46 53 49 49 49 44 V21 Z", renk: MUREKKEP, dolgu: "#a5d8ff", kalinlik: 2.2, anaStroke: true },
    { d: yuvarlakKutuYolu(18, 12, 13, 9, 1), renk: MUREKKEP, dolgu: "#e9ecef", kalinlik: 2 },
    { d: yuvarlakKutuYolu(49, 12, 13, 9, 1), renk: MUREKKEP, dolgu: "#e9ecef", kalinlik: 2 },
  ],
  disli: [
    { d: disliYolu(40, 40, 8, 29, 22), renk: MUREKKEP, dolgu: "#d0ebff", kalinlik: 2.2, anaStroke: true, anaDolgu: true },
    { d: daireYolu(40, 40, 14), renk: "#1971c2", kalinlik: 1.6 },
    { d: daireYolu(40, 40, 7), renk: MUREKKEP, dolgu: "#ffffff", kalinlik: 2.2, anaStroke: true },
  ],
  merdiven: [
    { d: "M12 64 H26 V51 H40 V38 H54 V25 H68 V64 Z", renk: MUREKKEP, dolgu: "#e7f5ff", kalinlik: 2.3, anaStroke: true, anaDolgu: true },
    { d: "M16 42 L52 14 M44 14 L52 14 L51 22", renk: "#1971c2", kalinlik: 2.2 },
  ],
  kopru: [
    {
      d: "M9 37 H71 V56 H61 A5.5 5.5 0 0 0 50 56 H48 A9 9 0 0 0 32 56 H30 A5.5 5.5 0 0 0 19 56 H9 Z",
      renk: MUREKKEP,
      dolgu: "#fff3bf",
      kalinlik: 2.2,
      anaStroke: true,
      anaDolgu: true,
    },
    { d: "M9 32 H71 M16 32 V37 M28 32 V37 M40 32 V37 M52 32 V37 M64 32 V37", renk: MUREKKEP, kalinlik: 1.8 },
    { d: "M10 63 Q22 60 34 63 T58 63 T70 63", renk: "#1971c2", kalinlik: 2.1 },
  ],
  kalkan: [
    {
      d: "M40 11 L64 19 V39 C64 53 53 64 40 69 C27 64 16 53 16 39 V19 Z",
      renk: MUREKKEP,
      dolgu: "#d0ebff",
      kalinlik: 2.3,
      anaStroke: true,
      anaDolgu: true,
    },
    { d: "M40 17 L57 23 V39 C57 49 49 58 40 62 C31 58 23 49 23 39 V23 Z", renk: "#1971c2", dolgu: "#ffffff", kalinlik: 1.6 },
    { d: "M31 39 L37 45 L50 32", renk: "#2f9e44", kalinlik: 2.8 },
  ],
  kitap: [
    { d: "M10 21 L40 25 L70 21 V59 L40 63 L10 59 Z", renk: MUREKKEP, dolgu: "#a5d8ff", kalinlik: 2.2, anaStroke: true },
    { d: "M13 18 Q27 16 40 23 Q53 16 67 18 V55 Q53 53 40 60 Q27 53 13 55 Z", renk: MUREKKEP, dolgu: "#ffffff", kalinlik: 2, anaStroke: true, anaDolgu: true },
    { d: "M40 23 V60", renk: MUREKKEP, kalinlik: 2 },
    { d: "M19 29 H34 M19 36 H34 M19 43 H31 M46 29 H61 M46 36 H61 M46 43 H58", renk: "#1971c2", kalinlik: 1.7 },
  ],
  kalem: [
    { d: "M14 66 L19 52 L28 61 Z", renk: MUREKKEP, dolgu: "#ffe8cc", kalinlik: 2, anaStroke: true },
    { d: "M14 66 L17 59 L21 63 Z", renk: MUREKKEP, dolgu: MUREKKEP, kalinlik: 1 },
    { d: "M19 52 L53 18 L62 27 L28 61 Z", renk: MUREKKEP, dolgu: "#ffd43b", kalinlik: 2.2, anaStroke: true, anaDolgu: true },
    { d: "M24 56 L57 23", renk: "#f08c00", kalinlik: 1.5 },
    { d: "M53 18 L59 12 C62 10 66 13 68 15 C70 17 69 20 67 22 L62 27 Z", renk: MUREKKEP, dolgu: "#ffa8a8", kalinlik: 2 },
  ],
  parsomen: [
    {
      d: "M20 18 H60 V58 C60 63 57 66 52 66 H18 C21 66 23 62 23 58 V23 C23 20 20 18 20 18 Z",
      renk: MUREKKEP,
      dolgu: "#fff9db",
      kalinlik: 2.2,
      anaStroke: true,
      anaDolgu: true,
    },
    { d: yuvarlakKutuYolu(17, 13, 45, 9, 4), renk: MUREKKEP, dolgu: "#ffe8cc", kalinlik: 2, anaStroke: true },
    { d: yuvarlakKutuYolu(13, 57, 42, 9, 4), renk: MUREKKEP, dolgu: "#ffe8cc", kalinlik: 2, anaStroke: true },
    { d: "M29 31 H52 M29 39 H52 M29 47 H46", renk: "#868e96", kalinlik: 1.9 },
  ],
  saat: [
    { d: daireYolu(40, 40, 27), renk: MUREKKEP, dolgu: "#e7f5ff", kalinlik: 2.3, anaStroke: true, anaDolgu: true },
    { d: daireYolu(40, 40, 21), renk: "#1971c2", dolgu: "#ffffff", kalinlik: 1.6 },
    { d: "M40 22 V25 M58 40 H55 M40 58 V55 M22 40 H25", renk: "#495057", kalinlik: 1.8 },
    { d: "M40 40 L31 32 M40 40 V24", renk: MUREKKEP, kalinlik: 2.5, anaStroke: true },
    { d: daireYolu(40, 40, 2.5), renk: "#e03131", dolgu: "#e03131", kalinlik: 1 },
  ],
  ev: [
    { d: "M51 28 V17 H58 V34", renk: MUREKKEP, dolgu: "#ffa8a8", kalinlik: 2 },
    { d: "M18 37 H62 V66 H18 Z", renk: MUREKKEP, dolgu: "#fff9db", kalinlik: 2.2, anaStroke: true, anaDolgu: true },
    { d: "M10 39 L40 14 L70 39 Z", renk: MUREKKEP, dolgu: "#ffa8a8", kalinlik: 2.3, anaStroke: true },
    { d: "M35 66 V50 C35 48 37 47 40 47 C43 47 45 48 45 50 V66 Z", renk: MUREKKEP, dolgu: "#a5d8ff", kalinlik: 2 },
    { d: yuvarlakKutuYolu(22, 44, 9, 9, 1.5), renk: MUREKKEP, dolgu: "#d0ebff", kalinlik: 1.7 },
  ],
  bayrak: [
    { d: "M21 68 V14 M14 68 H28", renk: MUREKKEP, kalinlik: 2.5, anaStroke: true },
    { d: "M21 17 C34 13 46 21 64 17 V42 C46 46 34 38 21 42 Z", renk: MUREKKEP, dolgu: "#ffa8a8", kalinlik: 2.2, anaStroke: true, anaDolgu: true },
    { d: daireYolu(21, 12, 3), renk: MUREKKEP, dolgu: "#ffd43b", kalinlik: 1.8 },
  ],
  insan: [
    { d: daireYolu(40, 24, 11), renk: MUREKKEP, dolgu: "#ffe8cc", kalinlik: 2.3, anaStroke: true },
    { d: "M18 66 C18 49 27 41 40 41 C53 41 62 49 62 66 Z", renk: MUREKKEP, dolgu: "#a5d8ff", kalinlik: 2.3, anaStroke: true, anaDolgu: true },
  ],
  terazi: [
    { d: "M24 67 H56 M40 67 V18", renk: MUREKKEP, kalinlik: 2.5, anaStroke: true },
    { d: "M15 24 H65", renk: MUREKKEP, kalinlik: 2.4, anaStroke: true },
    { d: "M15 24 L9 46 M15 24 L23 46 M65 24 L57 46 M65 24 L71 46", renk: "#495057", kalinlik: 1.7 },
    { d: "M8 46 H24 C23 53 9 53 8 46 Z", renk: MUREKKEP, dolgu: "#fff3bf", kalinlik: 2, anaDolgu: true },
    { d: "M56 46 H72 C71 53 57 53 56 46 Z", renk: MUREKKEP, dolgu: "#fff3bf", kalinlik: 2, anaDolgu: true },
    { d: daireYolu(40, 17, 3), renk: MUREKKEP, dolgu: "#ffd43b", kalinlik: 1.8 },
  ],
  beher: [
    {
      d: "M21 16 H59 L56 21 V59 C56 63 53 66 49 66 H31 C27 66 24 63 24 59 V21 Z",
      renk: MUREKKEP,
      dolgu: "#f8f9fa",
      kalinlik: 2.2,
      anaStroke: true,
    },
    {
      d: "M25 40 Q40 43 55 40 V59 C55 62 52 65 49 65 H31 C28 65 25 62 25 59 Z",
      renk: "#1971c2",
      dolgu: "#a5d8ff",
      kalinlik: 1.6,
      anaDolgu: true,
    },
    { d: "M27 31 H33 M27 42 H36 M27 52 H33", renk: MUREKKEP, kalinlik: 1.7 },
    { d: daireYolu(44, 52, 2.3), renk: "#1971c2", dolgu: "#ffffff", kalinlik: 1.4 },
    { d: daireYolu(37, 46, 1.8), renk: "#1971c2", dolgu: "#ffffff", kalinlik: 1.4 },
  ],
  atom: [
    { d: "M14 40 A26 11 0 1 0 66 40 A26 11 0 1 0 14 40", renk: "#1971c2", kalinlik: 1.8, anaStroke: true },
    { d: "M27 17.5 A26 11 60 1 0 53 62.5 A26 11 60 1 0 27 17.5", renk: "#7048e8", kalinlik: 1.8 },
    { d: "M53 17.5 A26 11 -60 1 0 27 62.5 A26 11 -60 1 0 53 17.5", renk: "#0c8599", kalinlik: 1.8 },
    { d: daireYolu(40, 40, 5.5), renk: MUREKKEP, dolgu: "#ff8787", kalinlik: 2, anaDolgu: true },
  ],
  damla: [
    {
      d: "M40 12 C40 12 60 35 60 49 C60 60 51 68 40 68 C29 68 20 60 20 49 C20 35 40 12 40 12 Z",
      renk: "#1971c2",
      dolgu: "#a5d8ff",
      kalinlik: 2.3,
      anaStroke: true,
      anaDolgu: true,
    },
    { d: "M29 48 C29 54 33 59 39 60", renk: "#ffffff", kalinlik: 2.3 },
  ],
  simsek: [
    {
      d: "M44 11 L20 44 H38 L34 69 L60 35 H42 Z",
      renk: MUREKKEP,
      dolgu: "#ffd43b",
      kalinlik: 2.2,
      anaStroke: true,
      anaDolgu: true,
    },
  ],
  yildiz: [
    {
      d: yildizYolu(40, 41, 5, 28, 12),
      renk: "#e67700",
      dolgu: "#ffe066",
      kalinlik: 2.2,
      anaStroke: true,
      anaDolgu: true,
    },
  ],
  termometre: [
    {
      d: "M35 16 C35 13 37 11 40 11 C43 11 45 13 45 16 V47 C49 49 51 53 51 58 C51 64 46 69 40 69 C34 69 29 64 29 58 C29 53 31 49 35 47 Z",
      renk: MUREKKEP,
      dolgu: "#e7f5ff",
      kalinlik: 2.2,
      anaStroke: true,
      anaDolgu: true,
    },
    { d: daireYolu(40, 58, 6.5), renk: "#c92a2a", dolgu: "#ff6b6b", kalinlik: 1.6 },
    { d: "M40 53 V26", renk: "#e03131", kalinlik: 3 },
    { d: "M49 22 H55 M49 30 H53 M49 38 H55", renk: MUREKKEP, kalinlik: 1.7 },
  ],
  pusula: [
    { d: daireYolu(40, 40, 27), renk: MUREKKEP, dolgu: "#f8f9fa", kalinlik: 2.3, anaStroke: true, anaDolgu: true },
    { d: "M40 18 L46 40 H34 Z", renk: MUREKKEP, dolgu: "#ff6b6b", kalinlik: 1.8 },
    { d: "M40 62 L46 40 H34 Z", renk: MUREKKEP, dolgu: "#74c0fc", kalinlik: 1.8 },
    { d: daireYolu(40, 40, 2.5), renk: MUREKKEP, dolgu: "#ffffff", kalinlik: 1.6 },
  ],
};

const YEDEK_IKON: IkonYol[] = [
  { d: yuvarlakKutuYolu(14, 14, 52, 52, 14), renk: MUREKKEP, dolgu: "#e7f5ff", kalinlik: 2.2, anaStroke: true, anaDolgu: true },
  { d: yildizYolu(40, 40, 4, 17, 7), renk: "#1971c2", dolgu: "#ffd43b", kalinlik: 2 },
];

const IKON_ES_ANLAMLARI: Record<string, IkonAdi> = {
  lamba: "ampul",
  isik: "ampul",
  batarya: "pil",
  kure: "dunya",
  yerkure: "dunya",
  gezegen: "dunya",
  fidan: "agac",
  orman: "agac",
  bitki: "yaprak",
  erlen: "beher",
  kap: "beher",
  tup: "beher",
  deney_tupu: "beher",
  deney: "beher",
  kisi: "insan",
  ogrenci: "insan",
  basamak: "merdiven",
  adim: "merdiven",
  zaman: "saat",
  kronometre: "saat",
  defter: "kitap",
  bilgi: "kitap",
  sinir: "noron",
  sinir_hucresi: "noron",
  gen: "dna",
  genetik: "dna",
  cark: "disli",
  kagit: "parsomen",
  ferman: "parsomen",
  anayasa: "parsomen",
  okul: "ev",
  yuva: "ev",
  su: "damla",
  sivi: "damla",
  enerji: "simsek",
  elektrik: "simsek",
  isi: "termometre",
  sicaklik: "termometre",
  yon: "pusula",
  esitlik: "terazi",
  adalet: "terazi",
};

function metinNorm(ham: string): string {
  return ham
    .trim()
    .toLocaleLowerCase("tr")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function ikonAdiniCoz(ad: string): IkonAdi | null {
  const n = metinNorm(ad);
  if (IKON_SETI.has(n)) return n as IkonAdi;
  if (IKON_ES_ANLAMLARI[n]) return IKON_ES_ANLAMLARI[n];
  return null;
}

export type IkonCizProps = {
  ad: string;
  x?: number;
  y?: number;
  boyut?: number;
  renk?: string;
  dolgu?: string;
  p?: number;
  kalem?: boolean;
};

export function IkonCiz({ ad, x = 0, y = 0, boyut = 80, renk, dolgu, p = 1, kalem = true }: IkonCizProps) {
  const oran = sinirla(p);
  const yollar = useMemo(() => {
    const cozulmus = ikonAdiniCoz(ad);
    return cozulmus ? IKON_YOLLARI[cozulmus] : YEDEK_IKON;
  }, [ad]);

  if (oran <= 0) return null;
  const olcek = boyut / 80;
  const donusum = x !== 0 || y !== 0 || olcek !== 1 ? `translate(${x} ${y}) scale(${olcek})` : undefined;

  return (
    <g transform={donusum}>
      {yollar.map((yol, i) => {
        const parcaP = oran >= 1 ? 1 : parcaIlerlemesi(oran, i, yollar.length);
        if (parcaP <= 0) return null;
        const cizgiRenk = renk && yol.anaStroke && yol.renk !== "none" ? renk : yol.renk ?? MUREKKEP;
        const dolguRenk = dolgu && yol.anaDolgu ? dolgu : yol.dolgu;
        return (
          <Cizgi
            key={i}
            d={yol.d}
            renk={cizgiRenk}
            dolgu={dolguRenk}
            dolguOpaklik={yol.dolguOpaklik}
            kalinlik={yol.kalinlik ?? 2.2}
            kesikli={yol.kesikli}
            p={parcaP}
            kalem={kalem && yol.kalem !== false}
          />
        );
      })}
    </g>
  );
}
