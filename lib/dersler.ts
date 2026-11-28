export const DERSLER = [
  "Matematik",
  "Geometri",
  "Fizik",
  "Kimya",
  "Biyoloji",
  "Fen Bilimleri",
  "Türk Dili ve Edebiyatı",
  "Türkçe",
  "Tarih",
  "T.C. İnkılap Tarihi ve Atatürkçülük",
  "Coğrafya",
  "Sosyal Bilgiler",
  "Felsefe",
  "Mantık",
  "Psikoloji",
  "Sosyoloji",
  "Din Kültürü ve Ahlak Bilgisi",
  "İngilizce",
  "Almanca",
  "Bilişim Teknolojileri ve Yazılım",
  "Hayat Bilgisi",
  "Sağlık Bilgisi",
] as const;

export const DERS_ADI_SINIRI = 60;

export function dersAdiTemizle(ders: unknown) {
  return typeof ders === "string" ? ders.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, DERS_ADI_SINIRI) : "";
}
