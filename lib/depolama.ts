"use client";

import { createStore, del, get, set, type UseStore } from "idb-keyval";

const ESKI_ONEK = "astral:";

export const ANAHTARLAR = {
  uniteler: "uniteler",
  aktifUnite: "aktif-unite",
  sayfalar: "sayfalar",
  kitapAdi: "kitap-adi",
  model: "model",
  ses: "ses",
  hiz: "hiz",
  mod: "ogretmen-modu",
  seviye: "seviye",
  ders: "ders",
  tahta: "tahta",
} as const;

let depo: UseStore | null = null;
function depoAl() {
  depo ??= createStore("astral", "ders-verileri");
  return depo;
}

const tarayicida = () => typeof window !== "undefined" && "indexedDB" in window;

function eskiyiAl(anahtar: string): unknown {
  try {
    const ham = window.localStorage.getItem(ESKI_ONEK + anahtar);
    if (ham === null) return undefined;
    window.localStorage.removeItem(ESKI_ONEK + anahtar);
    return JSON.parse(ham);
  } catch {
    return undefined;
  }
}

export async function oku<T>(anahtar: string, varsayilan: T): Promise<T> {
  if (!tarayicida()) return varsayilan;
  try {
    const deger = await get<T>(anahtar, depoAl());
    if (deger !== undefined) return deger;
    const eski = eskiyiAl(anahtar);
    if (eski !== undefined) {
      await set(anahtar, eski, depoAl());
      return eski as T;
    }
  } catch (hata) {
    console.error("[depolama] okunamadı", anahtar, hata);
  }
  return varsayilan;
}

export async function yaz(anahtar: string, deger: unknown): Promise<boolean> {
  if (!tarayicida()) return false;
  try {
    await set(anahtar, deger, depoAl());
    return true;
  } catch (hata) {
    console.error("[depolama] yazılamadı", anahtar, hata);
    return false;
  }
}

export async function sil(anahtar: string) {
  if (!tarayicida()) return;
  try {
    await del(anahtar, depoAl());
  } catch {}
}
