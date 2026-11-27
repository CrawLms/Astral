const ONEK = "astral:";

export const ANAHTARLAR = {
  uniteler: "uniteler",
  aktifUnite: "aktif-unite",
  sayfalar: "sayfalar",
  kitapAdi: "kitap-adi",
  model: "model",
  ses: "ses",
} as const;

export function oku<T>(anahtar: string, varsayilan: T): T {
  if (typeof window === "undefined") return varsayilan;
  try {
    const ham = window.localStorage.getItem(ONEK + anahtar);
    return ham === null ? varsayilan : (JSON.parse(ham) as T);
  } catch {
    return varsayilan;
  }
}

export function yaz(anahtar: string, deger: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(ONEK + anahtar, JSON.stringify(deger));
    return true;
  } catch {
    return false;
  }
}

export function sil(anahtar: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ONEK + anahtar);
}
