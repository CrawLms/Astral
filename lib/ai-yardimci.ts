export const VARSAYILAN_MODEL = "gpt-6.1-sol";
const VARSAYILAN_BASE_URL = "https://api.noxery.net/v1";
const ZAMAN_ASIMI_MS = 280_000;

const MODEL_DESENI = /^[a-z0-9][\w.:/-]{0,127}$/i;

export function modelSec(istenen?: unknown): string {
  if (typeof istenen === "string" && MODEL_DESENI.test(istenen.trim())) {
    return istenen.trim();
  }
  return process.env.OPENAI_COMPAT_MODEL || VARSAYILAN_MODEL;
}

export class AiHatasi extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function apiAyarlari() {
  const baseUrl = (process.env.OPENAI_COMPAT_BASE_URL || VARSAYILAN_BASE_URL).replace(/\/$/, "");
  const apiKey = process.env.OPENAI_COMPAT_API_KEY;
  if (!apiKey) {
    throw new AiHatasi(
      "Sunucuda OPENAI_COMPAT_API_KEY ortam değişkeni tanımlı değil. Ayarlar > Vars bölümünden ekleyin.",
      500,
    );
  }
  return { baseUrl, apiKey };
}

async function hataMesajiOku(yanit: Response): Promise<string> {
  const ham = await yanit.text().catch(() => "");
  try {
    const veri = JSON.parse(ham);
    const m = veri?.error?.message ?? veri?.error ?? veri?.message;
    if (m) return typeof m === "string" ? m : JSON.stringify(m);
  } catch {}
  return ham.slice(0, 500) || yanit.statusText || "Bilinmeyen hata";
}

export async function apiIstegi(yol: string, secenekler: RequestInit = {}, zamanAsimi = ZAMAN_ASIMI_MS) {
  const { baseUrl, apiKey } = apiAyarlari();
  let yanit: Response;
  try {
    yanit = await fetch(`${baseUrl}${yol}`, {
      ...secenekler,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...secenekler.headers,
      },
      signal: AbortSignal.timeout(zamanAsimi),
    });
  } catch (hata) {
    if (hata instanceof Error && (hata.name === "TimeoutError" || hata.name === "AbortError")) {
      throw new AiHatasi(
        `Zaman aşımı: Yapay zekâ sunucusu ${Math.round(zamanAsimi / 1000)} saniye içinde yanıt vermedi.`,
        504,
      );
    }
    throw new AiHatasi(
      `Yapay zekâ sunucusuna bağlanılamadı: ${hata instanceof Error ? hata.message : String(hata)}`,
      502,
    );
  }
  if (!yanit.ok) {
    throw new AiHatasi(`HTTP ${yanit.status}: ${await hataMesajiOku(yanit)}`, yanit.status);
  }
  return yanit;
}

type IcerikParcasi =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type SohbetMesaji = {
  role: "system" | "user" | "assistant";
  content: string | IcerikParcasi[];
};

export async function sohbetTamamla(model: string, messages: SohbetMesaji[]): Promise<string> {
  const yanit = await apiIstegi("/chat/completions", {
    method: "POST",
    body: JSON.stringify({ model, messages, max_tokens: 16384 }),
  });
  const data = await yanit.json().catch(() => null);
  const icerik = data?.choices?.[0]?.message?.content;
  if (typeof icerik !== "string" || !icerik.trim()) {
    throw new AiHatasi("Yapay zekâ boş bir yanıt döndürdü.", 502);
  }
  return icerik;
}

export function jsonCikar<T>(metin: string): T {
  const blok = metin.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const temiz = (blok ? blok[1] : metin).trim();
  try {
    return JSON.parse(temiz) as T;
  } catch {
    const bas = temiz.indexOf("{");
    const son = temiz.lastIndexOf("}");
    if (bas !== -1 && son > bas) {
      try {
        return JSON.parse(temiz.slice(bas, son + 1)) as T;
      } catch {}
    }
    throw new AiHatasi("Yapay zekâ geçerli bir JSON döndürmedi. Tekrar deneyin veya farklı bir model seçin.", 502);
  }
}

export function hataYaniti(hata: unknown, model: string) {
  const mesaj = hata instanceof Error ? hata.message : String(hata);
  const kod = hata instanceof AiHatasi ? hata.status : 500;
  console.error("[tahta] AI hatası:", kod, mesaj);

  let ipucu = "";
  if (kod === 401) ipucu = " OPENAI_COMPAT_API_KEY değerini kontrol edin.";
  else if (kod === 403) ipucu = ` "${model}" modeline erişim izniniz olmayabilir.`;
  else if (kod === 404) ipucu = ` "${model}" modeli bulunamamış olabilir; üst bardan farklı bir model seçin.`;
  else if (kod === 429) ipucu = " İstek sınırı/kota aşıldı, biraz bekleyip tekrar deneyin.";

  const durum = kod >= 400 && kod < 600 ? kod : 500;
  return Response.json({ hata: `Yapay zekâ isteği başarısız oldu — ${mesaj}${ipucu}` }, { status: durum });
}
