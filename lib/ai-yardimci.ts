export const VARSAYILAN_MODEL = "google/gemini-3-flash";

const MODEL_DESENI = /^[a-z0-9][\w.-]*\/[\w.:-]+$/i;

export function modelSec(istenen?: unknown): string {
  if (typeof istenen === "string" && MODEL_DESENI.test(istenen.trim())) {
    return istenen.trim();
  }
  return process.env.TAHTA_MODEL || VARSAYILAN_MODEL;
}

export function jsonCikar<T>(metin: string): T {
  const temiz = metin
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(temiz) as T;
  } catch {
    const bas = temiz.indexOf("{");
    const son = temiz.lastIndexOf("}");
    if (bas === -1 || son <= bas) {
      throw new Error("Yapay zekâ geçerli bir JSON döndürmedi.");
    }
    return JSON.parse(temiz.slice(bas, son + 1)) as T;
  }
}

function durumKodu(hata: unknown): number | undefined {
  if (!hata || typeof hata !== "object") return undefined;
  const h = hata as { statusCode?: unknown; status?: unknown; cause?: unknown; lastError?: unknown };
  if (typeof h.statusCode === "number") return h.statusCode;
  if (typeof h.status === "number") return h.status;
  return durumKodu(h.lastError) ?? durumKodu(h.cause);
}

export function hataYaniti(hata: unknown, model: string) {
  const kod = durumKodu(hata);
  const mesaj = hata instanceof Error ? hata.message : String(hata);
  console.error("[tahta] AI hatası:", kod, mesaj);

  if (kod === 403 && /credit card/i.test(mesaj)) {
    return Response.json(
      {
        hata: "Erişim reddedildi (403): AI Gateway'i kullanmak için Vercel hesabınıza kredi kartı eklemeniz gerekiyor (ücretsiz krediler kart eklenince açılır). Vercel panelinde AI sekmesinden kart ekleyip tekrar deneyin.",
      },
      { status: 403 },
    );
  }
  if (kod === 403) {
    return Response.json(
      {
        hata: `Erişim reddedildi (403). "${model}" modeline erişim izniniz yok ya da AI Gateway anahtarı (AI_GATEWAY_API_KEY) geçersiz. Üst bardan farklı bir model deneyin.`,
      },
      { status: 403 },
    );
  }
  if (kod === 429) {
    return Response.json(
      {
        hata: `Çok fazla istek veya kota aşıldı (429). Biraz bekleyip tekrar deneyin ya da üst bardan daha hafif bir model seçin.`,
      },
      { status: 429 },
    );
  }
  if (kod === 401) {
    return Response.json(
      { hata: "Kimlik doğrulama başarısız (401). AI_GATEWAY_API_KEY değerini kontrol edin." },
      { status: 401 },
    );
  }
  if (kod === 404 || /model.*not.*found|no such model/i.test(mesaj)) {
    return Response.json(
      { hata: `"${model}" modeli bulunamadı. Model ID'sini "saglayici/model" biçiminde yazın.` },
      { status: 400 },
    );
  }
  return Response.json(
    { hata: `Yapay zekâ isteği başarısız oldu: ${mesaj}` },
    { status: 500 },
  );
}
