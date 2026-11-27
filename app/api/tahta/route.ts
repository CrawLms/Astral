import { hataYaniti, jsonCikar, modelSec, sohbetTamamla } from "@/lib/ai-yardimci";
import type {
  Aksiyon,
  BaglantiOku,
  Bolge,
  GrafikFonksiyonu,
  GrafikNoktasi,
  MiniGorev,
  OgretmenModu,
  Sahne,
  Seviye,
  TestSorusu,
  VurgulananIl,
  Vurus,
} from "@/lib/types";

export const maxDuration = 300;

const SEVIYE_ACIKLAMA: Record<Seviye, string> = {
  ilkokul: "İlkokul öğrencisi: çok basit kelimeler, somut günlük örnekler, kısa cümleler.",
  ortaokul: "Ortaokul öğrencisi (LGS): açık dil, temel terimleri tanımlayarak, örnekli anlatım.",
  lise: "Lise / YKS öğrencisi: müfredat terimleri, sınavda çıkan tuzaklar ve formüllerle derinlemesine anlatım.",
  universite: "Üniversite öğrencisi: akademik terminoloji, ispat/gerekçe ve ileri bağlantılarla anlatım.",
};

const GORSEL_KURALLARI = `TAHTA ÇİZİM KURALLARI (ÇOK ÖNEMLİ):
- ASLA serbest çizim (freedraw), [x,y] nokta listesi veya koordinatla elle şekil çizme. Harita, organ, nesne gibi karmaşık şekilleri koordinatla çizmeye çalışma.
- Tahtaya yalnızca aşağıdaki YAPISAL GÖRSEL BLOKLARI "aksiyonlar" ile ekle. Her aksiyonun "gorsel" alanı bir blok kimliğidir (ör. "h1"); aynı kimliği tekrar kullanınca o bloğa yeni parça eklenir. Bir sahnede en fazla 3 blok olsun; yerleşimi uygulama otomatik yapar.
1) {"tip":"turkiye_haritasi","gorsel":"h1","vurgulananIller":[{"plaka":6,"ad":"Ankara","renk":"#e03131","etiket":"Başkent"}],"bolgeRenkleri":{"ic-anadolu":"#fff3bf"},"baglantiOklari":[{"neredenPlaka":34,"nereyePlaka":6,"etiket":"göç"}]}
   → Türkiye, iller, bölgeler, coğrafi dağılım konularında ZORUNLU. Gerçek 81 il haritası çizilir; sen sadece plaka numarası verirsin. Bölge anahtarları: marmara, ege, akdeniz, ic-anadolu, karadeniz, dogu-anadolu, guneydogu-anadolu. Haritanın ilk aksiyonu boş da olabilir (sadece haritayı çizer).
2) {"tip":"matematik_grafigi","gorsel":"g1","xAralik":[-5,5],"yAralik":[-2,10],"fonksiyonlar":[{"ifade":"x^2-2*x+1","renk":"#1971c2","etiket":"f(x)"}],"noktalar":[{"x":1,"y":0,"etiket":"Tepe"}]}
   → fonksiyon, doğru, parabol, fizik grafikleri (konum-zaman vb.). Eğriyi SEN hesaplama; sadece ifade yaz. İfadede x, sayılar, + - * / ^, parantez, sin cos tan sqrt abs ln log exp, pi kullan. xAralik/yAralik grafiğin ilk aksiyonunda zorunlu.
3) {"tip":"geometri_ve_diyagram","gorsel":"d1","svg":"<svg viewBox='0 0 800 460'>...</svg>"}
   → akış şeması, zaman çizelgesi, üçgen/çember/açı, kuvvet diyagramı, devre, hücre/atom/molekül şeması. SADECE path, circle, ellipse, rect, line, polyline, polygon, text, g etiketleri; viewBox='0 0 800 460'; fill='none' veya açık ton dolgu, stroke='#1e1e1e', yazılar için <text x y font-size fill>. Aynı bloğa sonraki aksiyonlarda yeni parçalar ekleyebilirsin (aynı koordinat sistemi). Script, style, image, href, on* YASAK. SVG içinde tek tırnak kullan.
4) {"tip":"formul_ve_not","gorsel":"f1","latex":"F = m \\\\cdot a","not":"kısa el yazısı not","renk":"formul","altiCizili":true}
   → formül (KaTeX sözdizimi, JSON'da ters bölüyü \\\\ olarak kaçır) ve/veya kısa not satırı. Her aksiyon bloğa bir satır ekler.
5) {"tip":"vurgula","gorsel":"h1"} → daha önce çizilmiş bloğu lazer halkasıyla gösterir.
Renkler: "#hex" veya "baslik" (lacivert), "formul" (mor), "vurgu" (kırmızı), "sonuc" (yeşil), "normal" (siyah).`;

const VURUS_KURALLARI = `Her sahne kısa MİKRO-VURUŞLARA ("vuruslar") bölünür. Öğretmen her vuruşun "soz" cümlesini söylerken AYNI ANDA o vuruşun "aksiyonlar"ını kalemle çizer.
- "id": "v1", "v2"...
- "soz": öğretmenin tam o an söyleyeceği TEK kısa cümle (en fazla ~20 kelime), konuşma dilinde Türkçe, o an çizilen şeyi anlatsın ("Şimdi Ankara'yı kırmızıyla boyuyorum, burası başkentimiz.").
- "aksiyonlar": yalnızca o cümleye karşılık gelen 0-2 küçük görsel işlem (bir il, bir ok, bir eğri, bir formül satırı...). Bir sahnenin tüm çizimini tek vuruşa yığma.`;

const GOREV_KURALI = `"miniGorev" (isteğe bağlı, her 2-3 sahnede bir): {"tur":"il_tikla","yonerge":"Haritada Ankara'ya tıkla","dogruPlaka":6} (yalnızca sahnede harita varsa) veya {"tur":"tahtaya_yaz","yonerge":"Sonucu tahtaya yazıp Tahtayla Birlikte Gönder'e bas"}. Yoksa null.`;

const ANLAT_TALIMATI = `Sen sabırlı, net ve sıcak bir Türk öğretmensin. Beyaz tahtada konuşurken eş zamanlı çizerek ders anlatıyorsun.
Sana bir ünitenin TAM metni veriliyor. Bu metindeki HER kavramı, tanımı, formülü, örneği ve detayı eksiksiz öğret; özetleyip atlama.
Anlatımı mantıklı sahnelere böl (4-12 sahne), her sahnede 4-10 vuruş olsun.
- "baslik": sahnenin kısa başlığı (1-3 kelime)
- "miniSoru": öğrencinin anladığını kontrol eden kısa soru YA DA null.
${GOREV_KURALI}
${VURUS_KURALLARI}
${GORSEL_KURALLARI}
YALNIZCA şu JSON'u döndür:
{"sahneler":[{"baslik":"...","miniSoru":null,"miniGorev":null,"vuruslar":[{"id":"v1","soz":"...","aksiyonlar":[]}]}]}`;

const SOKRATIK_ANLAT_TALIMATI = `Sen Sokratik yöntemle öğreten sabırlı bir Türk öğretmensin. Cevabı veya çözümü ASLA doğrudan söyleme ya da tahtaya yazma.
Sana bir ünitenin metni veriliyor. Konuyu 3-8 sahneye böl, her sahnede 3-8 vuruş olsun. Tahtaya yalnızca soruyu, verilenleri, şemayı ve küçük ipuçlarını çiz.
- "miniSoru" HER sahnede zorunlu: öğrencinin kendi başına çözüp yazarak veya tahtaya çizerek cevaplayacağı soru.
${GOREV_KURALI} Haritalı sahnelerde il_tikla görevini tercih et.
${VURUS_KURALLARI}
${GORSEL_KURALLARI}
YALNIZCA şu JSON'u döndür:
{"sahneler":[{"baslik":"...","miniSoru":"...","miniGorev":null,"vuruslar":[{"id":"v1","soz":"...","aksiyonlar":[]}]}]}`;

const SORU_ORTAK = `Öğrencinin gönderdiği tahta görüntüsü, öğretmenin tahtadaki çizimleri (harita, grafik, diyagram) ile öğrencinin üstüne KIRMIZI kalemle yaptığı işaretlerin birleşimidir; işaretlenen yerleri doğrudan görerek değerlendir.
Cevabını tahtada canlı çizerek ver: 2-8 vuruşluk "vuruslar" dizisi oluştur (yeni boş bir tahta alanına çizilir).
Öğrenci soru fotoğrafı gönderdiyse fotoğraf tahtanın soluna yerleştirilir; sen çözümü yanına adım adım çiz.`;

const SORU_TALIMATI = `Sen sabırlı ve net bir Türk öğretmensin. ${SORU_ORTAK}
Soruyu adım adım çöz ve açıkla. Öğrenci bir mini soruya cevap veriyorsa doğru olup olmadığını nazikçe söyle ve gerekçesini göster.
${VURUS_KURALLARI}
${GORSEL_KURALLARI}
YALNIZCA şu JSON'u döndür:
{"aciklama":"Kısa özet","vuruslar":[{"id":"v1","soz":"...","aksiyonlar":[]}]}`;

const SOKRATIK_SORU_TALIMATI = `Sen Sokratik yöntemle öğreten bir Türk öğretmensin. ${SORU_ORTAK}
Cevabı veya çözümün tamamını ASLA verme. Öğrencinin attığı adımı değerlendir: doğruysa takdir et ve sonraki adımı düşündüren soruyu sor; yanlışsa hatanın nerede olduğunu ipucuyla göster. Son vuruş daima öğrenciye bir soruyla bitsin.
${VURUS_KURALLARI}
${GORSEL_KURALLARI}
YALNIZCA şu JSON'u döndür:
{"aciklama":"Kısa özet","vuruslar":[{"id":"v1","soz":"...","aksiyonlar":[]}]}`;

const TEST_TALIMATI = `Sen bir Türk öğretmensin. Verilen ünite metninden öğrencinin anlayıp anlamadığını ölçen TAM 3 adet çoktan seçmeli soru hazırla.
Her sorunun 4 seçeneği olsun, yalnızca biri doğru olsun. Sorular ezber değil kavrama ölçsün.
YALNIZCA şu JSON'u döndür:
{"sorular":[{"soru":"...","secenekler":["A","B","C","D"],"dogruIndex":0,"aciklama":"Doğru cevabın kısa gerekçesi"}]}`;

const BOLGELER = new Set<Bolge>(["marmara", "ege", "akdeniz", "ic-anadolu", "karadeniz", "dogu-anadolu", "guneydogu-anadolu"]);

const sayi = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : undefined);
const yazi = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const renk = (v: unknown) => {
  const r = yazi(v, 20);
  return r && /^(#[0-9a-f]{3,8}|[a-z]+)$/i.test(r) ? r : undefined;
};
const plaka = (v: unknown) => {
  const n = sayi(v);
  return n !== undefined && Number.isInteger(n) && n >= 1 && n <= 81 ? n : undefined;
};
const dizi = <T,>(v: unknown, max: number, f: (x: Record<string, unknown>) => T | undefined): T[] =>
  Array.isArray(v) ? v.flatMap((x) => (x && typeof x === "object" ? [f(x)] : [])).filter((x): x is T => x !== undefined).slice(0, max) : [];
const aralik = (v: unknown): [number, number] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const a = sayi(v[0]);
  const b = sayi(v[1]);
  return a !== undefined && b !== undefined && b > a && b - a < 1e6 ? [a, b] : undefined;
};

function svgTemizle(ham: unknown) {
  if (typeof ham !== "string" || !/<svg[\s>]/i.test(ham)) return undefined;
  return ham
    .slice(0, 30_000)
    .replace(/<(script|style|foreignObject|image|iframe)[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|foreignObject|image|iframe)[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(xlink:)?href\s*=\s*("[^"]*"|'[^']*')/gi, "");
}

function aksiyonTemizle(h: Record<string, unknown>): Aksiyon | undefined {
  const gorsel = yazi(h.gorsel, 30) ?? "b1";
  switch (h.tip) {
    case "turkiye_haritasi": {
      const bolgeRenkleri: Partial<Record<Bolge, string>> = {};
      if (h.bolgeRenkleri && typeof h.bolgeRenkleri === "object") {
        for (const [k, v] of Object.entries(h.bolgeRenkleri)) {
          const r = renk(v);
          if (BOLGELER.has(k as Bolge) && r) bolgeRenkleri[k as Bolge] = r;
        }
      }
      return {
        tip: "turkiye_haritasi",
        gorsel,
        vurgulananIller: dizi<VurgulananIl>(h.vurgulananIller, 20, (x) => {
          const p = plaka(x.plaka);
          return p ? { plaka: p, ad: yazi(x.ad, 30) ?? "", renk: renk(x.renk) ?? "vurgu", etiket: yazi(x.etiket, 40) } : undefined;
        }),
        bolgeRenkleri,
        baglantiOklari: dizi<BaglantiOku>(h.baglantiOklari, 10, (x) => {
          const a = plaka(x.neredenPlaka);
          const b = plaka(x.nereyePlaka);
          return a && b && a !== b ? { neredenPlaka: a, nereyePlaka: b, etiket: yazi(x.etiket, 30) } : undefined;
        }),
      };
    }
    case "matematik_grafigi":
      return {
        tip: "matematik_grafigi",
        gorsel,
        xAralik: aralik(h.xAralik),
        yAralik: aralik(h.yAralik),
        fonksiyonlar: dizi<GrafikFonksiyonu>(h.fonksiyonlar, 4, (x) => {
          const ifade = yazi(x.ifade, 200);
          return ifade ? { ifade, renk: renk(x.renk) ?? "baslik", etiket: yazi(x.etiket, 30) } : undefined;
        }),
        noktalar: dizi<GrafikNoktasi>(h.noktalar, 8, (x) => {
          const nx = sayi(x.x);
          const ny = sayi(x.y);
          return nx !== undefined && ny !== undefined ? { x: nx, y: ny, etiket: yazi(x.etiket, 30) ?? "" } : undefined;
        }),
      };
    case "geometri_ve_diyagram": {
      const svg = svgTemizle(h.svg);
      return svg ? { tip: "geometri_ve_diyagram", gorsel, svg } : undefined;
    }
    case "formul_ve_not": {
      const latex = yazi(h.latex, 600);
      const not = yazi(h.not, 160);
      return latex || not ? { tip: "formul_ve_not", gorsel, latex, not, renk: renk(h.renk), altiCizili: h.altiCizili === true } : undefined;
    }
    case "vurgula":
      return { tip: "vurgula", gorsel };
    default:
      return undefined;
  }
}

function vuruslariTemizle(ham: unknown): Vurus[] {
  if (!Array.isArray(ham)) return [];
  return ham
    .filter((v) => v && typeof v === "object")
    .map((v, i) => ({
      id: yazi(v.id, 20) ?? `v${i + 1}`,
      soz: String(v.soz ?? v.konusmaMetni ?? "").trim().slice(0, 400),
      aksiyonlar: dizi(v.aksiyonlar, 4, aksiyonTemizle),
    }))
    .filter((v) => v.soz || v.aksiyonlar.length)
    .slice(0, 16);
}

function gorevTemizle(ham: unknown): MiniGorev | null {
  if (!ham || typeof ham !== "object") return null;
  const g = ham as Record<string, unknown>;
  const yonerge = yazi(g.yonerge, 200);
  if (!yonerge) return null;
  if (g.tur === "il_tikla") {
    const p = plaka(g.dogruPlaka);
    return p ? { tur: "il_tikla", yonerge, dogruPlaka: p } : null;
  }
  return g.tur === "tahtaya_yaz" ? { tur: "tahtaya_yaz", yonerge } : null;
}

function sahneleriTemizle(ham: unknown): Sahne[] {
  if (!Array.isArray(ham)) return [];
  return ham
    .filter((s) => s && typeof s === "object")
    .map((s) => {
      const vuruslar = vuruslariTemizle(s.vuruslar);
      const haritaVar = vuruslar.some((v) => v.aksiyonlar.some((a) => a.tip === "turkiye_haritasi"));
      let miniGorev = gorevTemizle(s.miniGorev);
      if (miniGorev?.tur === "il_tikla" && !haritaVar) miniGorev = null;
      return {
        baslik: String(s.baslik ?? "").trim().slice(0, 60) || "Sahne",
        miniSoru: yazi(s.miniSoru, 300) ?? null,
        miniGorev,
        vuruslar,
      };
    })
    .filter((s) => s.vuruslar.length > 0);
}

function sorulariTemizle(ham: unknown): TestSorusu[] {
  if (!Array.isArray(ham)) return [];
  return ham
    .filter((s) => s && typeof s === "object" && typeof s.soru === "string" && Array.isArray(s.secenekler))
    .map((s) => {
      const secenekler = s.secenekler.map((x: unknown) => String(x)).slice(0, 5);
      const dogru = sayi(s.dogruIndex) ?? 0;
      return {
        soru: s.soru.trim(),
        secenekler,
        dogruIndex: Math.max(0, Math.min(secenekler.length - 1, Math.round(dogru))),
        aciklama: String(s.aciklama ?? "").trim(),
      };
    })
    .filter((s) => s.secenekler.length >= 2)
    .slice(0, 3);
}

type Govde =
  | { mode: "anlat"; model?: string; ogretmenModu?: OgretmenModu; seviye?: Seviye; baslik?: string; altKonular?: string[]; metin?: string }
  | {
      mode: "soru";
      model?: string;
      ogretmenModu?: OgretmenModu;
      seviye?: Seviye;
      soru?: string;
      gorsel?: string;
      fotograf?: string;
      uniteBaslik?: string;
      sonAnlatim?: string;
      miniSoru?: string | null;
    }
  | { mode: "test"; model?: string; baslik?: string; metin?: string };

const base64 = (v?: string | null) => (v ?? "").replace(/^data:image\/[\w+.-]+;base64,/, "");
const seviyeNotu = (s?: Seviye) => `\nÖğrenci seviyesi: ${SEVIYE_ACIKLAMA[s && s in SEVIYE_ACIKLAMA ? s : "lise"]} Dili, örnekleri ve derinliği buna göre ayarla.`;

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
      if (!metin) return Response.json({ hata: "Anlatılacak metin boş." }, { status: 400 });
      const sokratik = govde.ogretmenModu === "sokratik";
      const altKonular = govde.altKonular?.length ? `\nAlt konular: ${govde.altKonular.join(", ")}` : "";
      const text = await sohbetTamamla(model, [
        { role: "system", content: (sokratik ? SOKRATIK_ANLAT_TALIMATI : ANLAT_TALIMATI) + seviyeNotu(govde.seviye) },
        { role: "user", content: `Ünite: ${govde.baslik ?? "Konu"}${altKonular}\n\n--- ÜNİTE METNİ (TAM) ---\n${metin}` },
      ]);
      const sahneler = sahneleriTemizle(jsonCikar<{ sahneler?: unknown }>(text).sahneler);
      if (sahneler.length === 0) {
        return Response.json({ hata: "Yapay zekâ sahne üretemedi. Tekrar deneyin veya farklı bir model seçin." }, { status: 422 });
      }
      return Response.json({ sahneler });
    }

    if (govde.mode === "soru") {
      const soru = (govde.soru ?? "").trim();
      const gorsel = base64(govde.gorsel);
      const fotograf = govde.fotograf ?? "";
      if (!soru && !gorsel && !fotograf) {
        return Response.json({ hata: "Soru, fotoğraf veya tahta görüntüsü gerekli." }, { status: 400 });
      }
      const sokratik = govde.ogretmenModu === "sokratik";
      const fotoUrl = fotograf.startsWith("data:image/") ? fotograf : "";
      const baglam = [
        govde.uniteBaslik ? `Ünite: ${govde.uniteBaslik}` : "",
        govde.sonAnlatim ? `Öğretmenin son anlatımı: ${govde.sonAnlatim}` : "",
        govde.miniSoru ? `Öğretmenin sorduğu mini soru: ${govde.miniSoru}` : "",
        fotoUrl ? "Öğrenci bir soru fotoğrafı yükledi (ekteki ilk görsel). Bu soruyu çöz." : "",
        gorsel ? "Ekteki tahta görüntüsü: öğretmen çizimleri + öğrencinin kırmızı işaretleri." : "",
        `Öğrencinin mesajı: ${soru || "(Yazı yok, yalnızca tahtadaki çizimimi / fotoğrafı değerlendir.)"}`,
      ]
        .filter(Boolean)
        .join("\n");

      const text = await sohbetTamamla(model, [
        { role: "system", content: (sokratik ? SOKRATIK_SORU_TALIMATI : SORU_TALIMATI) + seviyeNotu(govde.seviye) },
        {
          role: "user",
          content: [
            { type: "text", text: baglam },
            ...(fotoUrl ? [{ type: "image_url" as const, image_url: { url: fotoUrl } }] : []),
            ...(gorsel ? [{ type: "image_url" as const, image_url: { url: `data:image/png;base64,${gorsel}` } }] : []),
          ],
        },
      ]);
      const veri = jsonCikar<{ aciklama?: string; vuruslar?: unknown }>(text);
      const aciklama = String(veri.aciklama ?? "").trim() || "Bunu birlikte inceleyelim.";
      let vuruslar = vuruslariTemizle(veri.vuruslar);
      if (vuruslar.length === 0) vuruslar = [{ id: "v1", soz: aciklama, aksiyonlar: [] }];
      return Response.json({ aciklama, vuruslar });
    }

    if (govde.mode === "test") {
      const metin = (govde.metin ?? "").trim();
      if (!metin) return Response.json({ hata: "Test için ünite metni gerekli." }, { status: 400 });
      const text = await sohbetTamamla(model, [
        { role: "system", content: TEST_TALIMATI },
        { role: "user", content: `Ünite: ${govde.baslik ?? "Konu"}\n\n${metin.slice(0, 60_000)}` },
      ]);
      const sorular = sorulariTemizle(jsonCikar<{ sorular?: unknown }>(text).sorular);
      if (sorular.length === 0) return Response.json({ hata: "Yapay zekâ test sorusu üretemedi. Tekrar deneyin." }, { status: 422 });
      return Response.json({ sorular });
    }

    return Response.json({ hata: "Bilinmeyen mod." }, { status: 400 });
  } catch (hata) {
    return hataYaniti(hata, model);
  }
}
