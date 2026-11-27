import { hataYaniti, jsonCikar, modelSec, sohbetTamamla } from "@/lib/ai-yardimci";
import type { Sahne, TahtaElemani } from "@/lib/types";

export const maxDuration = 300;

const ELEMAN_KURALLARI = `"elemanlar" dizisi tahtaya çizilecek şekilleri içerir. Koordinatlar sahneye görelidir: x 0-1000, y 0-600 arası (sol üst 0,0).
Eleman türleri:
- {"tip":"kutu","id":"k1","x":0,"y":0,"genislik":260,"yukseklik":90,"metin":"Kısa kavram","arkaPlan":"#e7f5ff"}  → içinde yazı olan dikdörtgen
- {"tip":"ok","kaynak":"k1","hedef":"k2","metin":"isteğe bağlı kısa etiket"}  → iki kutu arasında ok (kaynak/hedef kutu id'leri)
- {"tip":"metin","x":0,"y":0,"metin":"Formül veya not","boyut":20}  → serbest yazı
- {"tip":"vurgu","x":0,"y":0,"genislik":200,"yukseklik":60}  → önemli yeri çevreleyen kırmızı elips
Kurallar: Kutular birbirinin üstüne binmesin (aralarında en az 40px boşluk), kutu metinleri kısa olsun (en fazla ~8 kelime), sahne başına 2-8 eleman kullan. Renk olarak açık tonlar kullan (#e7f5ff, #fff3bf, #d3f9d8, #ffe3e3, #f3f0ff).`;

const ANLAT_TALIMATI = `Sen sabırlı, net ve sıcak bir Türk öğretmensin. Beyaz tahtada adım adım ders anlatıyorsun.
Sana bir ünitenin TAM metni veriliyor. Bu metindeki HER kavramı, tanımı, formülü, örneği ve detayı eksiksiz öğret; özetleyip atlama.
Anlatımı mantıklı sahnelere böl (konunun uzunluğuna göre 4-14 sahne). Her sahnede:
- "baslik": sahnenin kısa başlığı
- "anlatimMetni": öğretmenin sesli okuyacağı, konuşma dilinde akıcı Türkçe anlatım (3-7 cümle)
- "miniSoru": öğrencinin anladığını kontrol etmek için kısa bir soru YA DA null. Her 2-3 sahnede bir soru sor.
- "elemanlar": tahtaya çizilecek şekiller
${ELEMAN_KURALLARI}
YALNIZCA şu JSON'u döndür, başka hiçbir şey yazma:
{"sahneler":[{"baslik":"...","anlatimMetni":"...","miniSoru":null,"elemanlar":[]}]}`;

const SORU_TALIMATI = `Sen sabırlı ve net bir Türk öğretmensin. Öğrencinin tahtada çizdiği, kırmızıyla işaretlediği veya altına eklediği yerleri doğrudan görerek değerlendir. Önce sorusunu/çizimini Türkçe olarak net açıkla; gerekiyorsa tahtanın altına eklemek üzere yeni \`elemanlar\` JSON'u döndür.
Eğer öğrenci bir mini soruya cevap veriyorsa cevabın doğru olup olmadığını nazikçe söyle ve gerekçesini açıkla.
${ELEMAN_KURALLARI}
YALNIZCA şu JSON'u döndür, başka hiçbir şey yazma:
{"aciklama":"Öğrenciye sesli okunacak Türkçe açıklama","elemanlar":[]}`;

const GECERLI_TIPLER = new Set(["kutu", "ok", "metin", "vurgu"]);

function elemanlariTemizle(ham: unknown): TahtaElemani[] {
  if (!Array.isArray(ham)) return [];
  return ham
    .filter((e): e is TahtaElemani => !!e && typeof e === "object" && GECERLI_TIPLER.has((e as TahtaElemani).tip))
    .slice(0, 20);
}

function sahneleriTemizle(ham: unknown): Sahne[] {
  if (!Array.isArray(ham)) return [];
  return ham
    .filter((s) => s && typeof s === "object" && typeof s.anlatimMetni === "string")
    .map((s) => ({
      baslik: String(s.baslik ?? "").trim() || "Sahne",
      anlatimMetni: String(s.anlatimMetni).trim(),
      miniSoru: typeof s.miniSoru === "string" && s.miniSoru.trim() ? s.miniSoru.trim() : null,
      elemanlar: elemanlariTemizle(s.elemanlar),
    }));
}

type Govde =
  | {
      mode: "anlat";
      model?: string;
      baslik?: string;
      altKonular?: string[];
      metin?: string;
    }
  | {
      mode: "soru";
      model?: string;
      soru?: string;
      gorsel?: string;
      uniteBaslik?: string;
      sonAnlatim?: string;
      miniSoru?: string | null;
    };

export async function POST(req: Request) {
  let govde: Govde;
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const model = modelSec(govde.model);

  try {
    if (govde.mode === "anlat") {
      const metin = (govde.metin ?? "").trim();
      if (!metin) {
        return Response.json({ hata: "Anlatılacak metin boş." }, { status: 400 });
      }
      const altKonular = govde.altKonular?.length ? `\nAlt konular: ${govde.altKonular.join(", ")}` : "";
      const text = await sohbetTamamla(model, [
        { role: "system", content: ANLAT_TALIMATI },
        {
          role: "user",
          content: `Ünite: ${govde.baslik ?? "Konu"}${altKonular}\n\n--- ÜNİTE METNİ (TAM) ---\n${metin}`,
        },
      ]);
      const sahneler = sahneleriTemizle(jsonCikar<{ sahneler?: unknown }>(text).sahneler);
      if (sahneler.length === 0) {
        return Response.json(
          { hata: "Yapay zekâ sahne üretemedi. Tekrar deneyin veya farklı bir model seçin." },
          { status: 422 },
        );
      }
      return Response.json({ sahneler });
    }

    if (govde.mode === "soru") {
      const soru = (govde.soru ?? "").trim();
      const gorsel = (govde.gorsel ?? "").replace(/^data:image\/\w+;base64,/, "");
      if (!soru && !gorsel) {
        return Response.json({ hata: "Soru veya tahta görüntüsü gerekli." }, { status: 400 });
      }
      const baglam = [
        govde.uniteBaslik ? `Ünite: ${govde.uniteBaslik}` : "",
        govde.sonAnlatim ? `Öğretmenin son anlatımı: ${govde.sonAnlatim}` : "",
        govde.miniSoru ? `Öğretmenin sorduğu mini soru: ${govde.miniSoru}` : "",
        `Öğrencinin mesajı: ${soru || "(Yazı yok, yalnızca tahtadaki çizimimi değerlendir.)"}`,
      ]
        .filter(Boolean)
        .join("\n");

      const text = await sohbetTamamla(model, [
        { role: "system", content: SORU_TALIMATI },
        {
          role: "user",
          content: [
            { type: "text", text: baglam },
            ...(gorsel
              ? [{ type: "image_url" as const, image_url: { url: `data:image/png;base64,${gorsel}` } }]
              : []),
          ],
        },
      ]);
      const veri = jsonCikar<{ aciklama?: string; elemanlar?: unknown }>(text);
      return Response.json({
        aciklama: String(veri.aciklama ?? "").trim() || "Bunu birlikte inceleyelim.",
        elemanlar: elemanlariTemizle(veri.elemanlar),
      });
    }

    return Response.json({ hata: "Bilinmeyen mod." }, { status: 400 });
  } catch (hata) {
    return hataYaniti(hata, model);
  }
}
