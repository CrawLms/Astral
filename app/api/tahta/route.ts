import { hataYaniti, jsonCikar, modelSec, sohbetTamamla } from "@/lib/ai-yardimci";
import type { Nokta, OgretmenModu, Sahne, TahtaElemani, TestSorusu, Vurus } from "@/lib/types";

export const maxDuration = 300;

const GORSEL_KURALI = `ÇOK ÖNEMLİ KURAL: Asla sadece dikdörtgen kutu ve düz yazı çizme! Konuyu gerçekten görselleştir.
Her sahnede en az bir gerçek görsel çizim olmalı: grafik, eksen, eğri, geometrik şekil, hücre/atom çizimi, düzenek, akış oku, formül (latex) veya svg diyagram.`;

const ELEMAN_KURALLARI = `${GORSEL_KURALI}

"elemanlar" dizisi tahtaya çizilecek şekilleri içerir. Koordinatlar sahneye görelidir: x 0-1000, y 0-600 (sol üst 0,0). Bir sahnedeki tüm vuruşlar AYNI koordinat alanını paylaşır; önceki vuruşlarda çizilenlerin üstüne binme.
Eleman türleri:
- {"tip":"freedraw","id":"d1","noktalar":[[x,y],[x,y],...],"renk":"vurgu","kalinlik":2}  → serbest el çizimi: dalga, eğri, parabol, kap, insan/nesne taslağı. Pürüzsüz görünmesi için 12-60 nokta kullan.
- {"tip":"line","id":"l1","noktalar":[[x,y],[x,y]],"kapali":false}  → düz çizgi/çoklu çizgi: X/Y ekseni, grafik çizgisi, üçgen (kapali:true), açı, vektör, zaman çizelgesi.
- {"tip":"arrow","id":"a1","noktalar":[[x,y],[x,y],[x,y]],"egri":true,"metin":"kısa etiket"}  → (eğri) ok: akış, sebep-sonuç, kuvvet yönü. Alternatif: {"tip":"arrow","kaynak":"k1","hedef":"k2"}.
- {"tip":"ellipse","id":"e1","x":0,"y":0,"genislik":120,"yukseklik":120,"arkaPlan":"#d3f9d8","metin":"isteğe bağlı"}  → hücre, atom, yörünge, Venn şeması, tekerlek.
- {"tip":"kutu","id":"k1","x":0,"y":0,"genislik":220,"yukseklik":80,"metin":"Kısa kavram","arkaPlan":"#e7f5ff"}  → kavram kutusu (az kullan).
- {"tip":"metin","id":"t1","x":0,"y":0,"metin":"Not","boyut":22,"renk":"baslik"}  → el yazısı not.
- {"tip":"vurgu","x":0,"y":0,"genislik":200,"yukseklik":60}  → önemli yeri çevreleyen kırmızı halka.
- {"tip":"latex","id":"f1","x":0,"y":0,"latex":"F = m \\\\cdot a","boyut":32,"renk":"formul"}  → matematik/kimya denklemi (KaTeX sözdizimi, JSON içinde ters bölüyü \\\\ olarak kaçır).
- {"tip":"svg","id":"s1","x":0,"y":0,"genislik":360,"svg":"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 360 240'>...</svg>"}  → karmaşık diyagram: fonksiyon grafiği, devre, anatomi, fizik düzeneği. Beyaz tahta el çizimi stili: fill='none', stroke='#1e1e1e', stroke-width 2-3, stroke-linecap='round'; yazılar için font-family='Virgil, Comic Sans MS, cursive'. Script, dış bağlantı veya resim KULLANMA. SVG içinde tek tırnak kullan.
Renk kodlaması ("renk" alanına bu adları veya #hex yaz): "baslik" (lacivert), "formul" (mor), "vurgu" (kırmızı, uyarı/önemli), "sonuc" (yeşil), "normal" (siyah).
Kurallar: Elemanlar birbirinin üstüne binmesin (en az 30px boşluk), yazılar kısa olsun, bir vuruşta 1-5 eleman olsun. Arka plan için açık tonlar: #e7f5ff, #fff3bf, #d3f9d8, #ffe3e3, #f3f0ff.`;

const VURUS_KURALLARI = `Her sahne "vuruslar" (mikro adımlar) dizisine bölünür. Öğretmen her vuruşun "konusmaMetni"ni okurken AYNI ANDA o vuruşun "elemanlar"ını tahtaya çizer; yani konuşma, o an çizilen şeyi anlatmalı ("Şimdi buraya X eksenini çiziyorum…").
Vuruş alanları:
- "konusmaMetni": 1-2 cümlelik doğal, konuşma dilinde Türkçe anlatım
- "elemanlar": bu vuruşta çizilecek yeni şekiller (boş olabilir)
- "vurgulananId": daha önceki bir vuruşta çizilmiş elemanın id'si; öğretmen bu sırada onu lazerle gösterir. Yoksa null.
- "animasyonSuresiMs": çizimin yaklaşık süresi (800-6000)`;

const ANLAT_TALIMATI = `Sen sabırlı, net ve sıcak bir Türk öğretmensin. Beyaz tahtada konuşurken eş zamanlı çizerek ders anlatıyorsun.
Sana bir ünitenin TAM metni veriliyor. Bu metindeki HER kavramı, tanımı, formülü, örneği ve detayı eksiksiz öğret; özetleyip atlama.
Anlatımı mantıklı sahnelere böl (konunun uzunluğuna göre 4-12 sahne), her sahnede 3-8 vuruş olsun.
- "baslik": sahnenin kısa başlığı
- "miniSoru": öğrencinin anladığını kontrol eden kısa soru YA DA null. Önemli yerlerde (her 2-3 sahnede bir) soru sor; öğretmen burada durup öğrenciyi bekler.
${VURUS_KURALLARI}
${ELEMAN_KURALLARI}
YALNIZCA şu JSON'u döndür, başka hiçbir şey yazma:
{"sahneler":[{"baslik":"...","miniSoru":null,"vuruslar":[{"konusmaMetni":"...","vurgulananId":null,"animasyonSuresiMs":2000,"elemanlar":[]}]}]}`;

const SOKRATIK_ANLAT_TALIMATI = `Sen Sokratik yöntemle öğreten sabırlı bir Türk öğretmensin. Cevabı veya çözümü ASLA doğrudan söyleme ya da tahtaya yazma.
Sana bir ünitenin metni veriliyor. Konuyu 3-8 sahneye böl. Her sahnede:
- Tahtaya yalnızca soruyu, verilenleri, şemayı ve küçük ipuçlarını çiz (çözümü, sonucu ve cevabı çizme).
- Öğrenciyi düşündüren yönlendirici sorular sor.
- "miniSoru" HER sahnede zorunludur: öğrencinin kendi başına çözüp tahtaya çizerek veya yazarak cevaplayacağı soru. Öğretmen burada durup öğrencinin göndermesini bekler.
${VURUS_KURALLARI}
${ELEMAN_KURALLARI}
YALNIZCA şu JSON'u döndür, başka hiçbir şey yazma:
{"sahneler":[{"baslik":"...","miniSoru":"...","vuruslar":[{"konusmaMetni":"...","vurgulananId":null,"animasyonSuresiMs":2000,"elemanlar":[]}]}]}`;

const SORU_ORTAK = `Öğrencinin tahtada çizdiği, kırmızıyla işaretlediği yerleri ve yüklediği soru fotoğraflarını doğrudan görerek değerlendir.
Cevabını tahtada canlı çizerek ver: "vuruslar" dizisi oluştur (2-8 vuruş). Tahtada yeni boş bir alana çizeceksin; koordinatlar bu yeni alana görelidir.
Eğer öğrenci bir soru fotoğrafı gönderdiyse fotoğraf tahtanın soluna yerleştirildi; sen çözümü x 0-700 aralığında, fotoğrafın SAĞINA adım adım çiz.`;

const SORU_TALIMATI = `Sen sabırlı ve net bir Türk öğretmensin. ${SORU_ORTAK}
Soruyu adım adım çöz ve açıkla. Öğrenci bir mini soruya cevap veriyorsa cevabın doğru olup olmadığını nazikçe söyle ve gerekçesini göster.
${VURUS_KURALLARI}
${ELEMAN_KURALLARI}
YALNIZCA şu JSON'u döndür, başka hiçbir şey yazma:
{"aciklama":"Kısa özet","vuruslar":[{"konusmaMetni":"...","vurgulananId":null,"animasyonSuresiMs":2000,"elemanlar":[]}]}`;

const SOKRATIK_SORU_TALIMATI = `Sen Sokratik yöntemle öğreten bir Türk öğretmensin. ${SORU_ORTAK}
Cevabı veya çözümün tamamını ASLA verme. Öğrencinin attığı adımı değerlendir: doğruysa takdir et ve bir sonraki adımı düşündüren soruyu sor; yanlışsa hatanın nerede olduğunu ipucuyla göster.
Tahtaya yalnızca ipucu, verilen bilgiler ve yönlendirici sorular çiz. Son vuruş daima öğrenciye bir soru ile bitsin.
${VURUS_KURALLARI}
${ELEMAN_KURALLARI}
YALNIZCA şu JSON'u döndür, başka hiçbir şey yazma:
{"aciklama":"Kısa özet","vuruslar":[{"konusmaMetni":"...","vurgulananId":null,"animasyonSuresiMs":2000,"elemanlar":[]}]}`;

const TEST_TALIMATI = `Sen bir Türk öğretmensin. Verilen ünite metninden öğrencinin anlayıp anlamadığını ölçen TAM 3 adet çoktan seçmeli soru hazırla.
Her sorunun 4 seçeneği olsun, yalnızca biri doğru olsun. Sorular ezber değil kavrama ölçsün.
YALNIZCA şu JSON'u döndür, başka hiçbir şey yazma:
{"sorular":[{"soru":"...","secenekler":["A","B","C","D"],"dogruIndex":0,"aciklama":"Doğru cevabın kısa gerekçesi"}]}`;

const GECERLI_TIPLER = new Set([
  "kutu",
  "ok",
  "metin",
  "vurgu",
  "freedraw",
  "ellipse",
  "line",
  "arrow",
  "svg",
  "latex",
]);

const sayi = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const yazi = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

function noktalariTemizle(ham: unknown): Nokta[] | undefined {
  if (!Array.isArray(ham)) return undefined;
  const sonuc: Nokta[] = [];
  for (const n of ham) {
    if (Array.isArray(n) && typeof n[0] === "number" && typeof n[1] === "number") sonuc.push([n[0], n[1]]);
    else if (n && typeof n === "object" && typeof n.x === "number" && typeof n.y === "number") sonuc.push([n.x, n.y]);
    if (sonuc.length >= 200) break;
  }
  return sonuc.length >= 2 ? sonuc : undefined;
}

function svgTemizle(ham: unknown) {
  if (typeof ham !== "string" || !/<svg[\s>]/i.test(ham)) return undefined;
  return ham
    .slice(0, 40_000)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/(href\s*=\s*)("|')\s*(javascript|https?):[^"']*\2/gi, "$1$2#$2");
}

function elemanlariTemizle(ham: unknown): TahtaElemani[] {
  if (!Array.isArray(ham)) return [];
  const sonuc: TahtaElemani[] = [];
  for (const h of ham) {
    if (!h || typeof h !== "object" || !GECERLI_TIPLER.has(h.tip)) continue;
    const e: TahtaElemani = {
      tip: h.tip,
      id: yazi(h.id, 40),
      x: sayi(h.x),
      y: sayi(h.y),
      genislik: sayi(h.genislik),
      yukseklik: sayi(h.yukseklik),
      metin: yazi(h.metin, 300),
      renk: yazi(h.renk, 20),
      arkaPlan: yazi(h.arkaPlan, 20),
      kaynak: yazi(h.kaynak, 40),
      hedef: yazi(h.hedef, 40),
      boyut: sayi(h.boyut),
      noktalar: noktalariTemizle(h.noktalar),
      egri: h.egri === true,
      kapali: h.kapali === true,
      kalinlik: sayi(h.kalinlik),
      svg: h.tip === "svg" ? svgTemizle(h.svg) : undefined,
      latex: h.tip === "latex" ? yazi(h.latex, 1000) : undefined,
    };
    if (e.tip === "svg" && !e.svg) continue;
    if (e.tip === "latex" && !e.latex) continue;
    if ((e.tip === "freedraw" || e.tip === "line") && !e.noktalar) continue;
    sonuc.push(e);
    if (sonuc.length >= 20) break;
  }
  return sonuc;
}

function vuruslariTemizle(ham: unknown): Vurus[] {
  if (!Array.isArray(ham)) return [];
  return ham
    .filter((v) => v && typeof v === "object")
    .map((v) => ({
      konusmaMetni: String(v.konusmaMetni ?? "").trim(),
      vurgulananId: yazi(v.vurgulananId, 40) ?? null,
      animasyonSuresiMs: Math.max(400, Math.min(8000, sayi(v.animasyonSuresiMs) ?? 2000)),
      elemanlar: elemanlariTemizle(v.elemanlar),
    }))
    .filter((v) => v.konusmaMetni || v.elemanlar.length)
    .slice(0, 16);
}

function sahneleriTemizle(ham: unknown): Sahne[] {
  if (!Array.isArray(ham)) return [];
  return ham
    .filter((s) => s && typeof s === "object")
    .map((s) => {
      let vuruslar = vuruslariTemizle(s.vuruslar);
      if (vuruslar.length === 0 && typeof s.anlatimMetni === "string") {
        vuruslar = [{ konusmaMetni: s.anlatimMetni.trim(), vurgulananId: null, animasyonSuresiMs: 2500, elemanlar: elemanlariTemizle(s.elemanlar) }];
      }
      return {
        baslik: String(s.baslik ?? "").trim() || "Sahne",
        miniSoru: typeof s.miniSoru === "string" && s.miniSoru.trim() ? s.miniSoru.trim() : null,
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
  | {
      mode: "anlat";
      model?: string;
      ogretmenModu?: OgretmenModu;
      baslik?: string;
      altKonular?: string[];
      metin?: string;
    }
  | {
      mode: "soru";
      model?: string;
      ogretmenModu?: OgretmenModu;
      soru?: string;
      gorsel?: string;
      fotograf?: string;
      uniteBaslik?: string;
      sonAnlatim?: string;
      miniSoru?: string | null;
    }
  | {
      mode: "test";
      model?: string;
      baslik?: string;
      metin?: string;
    };

const base64 = (v?: string) => (v ?? "").replace(/^data:image\/[\w+.-]+;base64,/, "");

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
      const sokratik = govde.ogretmenModu === "sokratik";
      const altKonular = govde.altKonular?.length ? `\nAlt konular: ${govde.altKonular.join(", ")}` : "";
      const text = await sohbetTamamla(model, [
        { role: "system", content: sokratik ? SOKRATIK_ANLAT_TALIMATI : ANLAT_TALIMATI },
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
      const gorsel = base64(govde.gorsel);
      const fotograf = govde.fotograf ?? "";
      if (!soru && !gorsel && !fotograf) {
        return Response.json({ hata: "Soru, fotoğraf veya tahta görüntüsü gerekli." }, { status: 400 });
      }
      const sokratik = govde.ogretmenModu === "sokratik";
      const baglam = [
        govde.uniteBaslik ? `Ünite: ${govde.uniteBaslik}` : "",
        govde.sonAnlatim ? `Öğretmenin son anlatımı: ${govde.sonAnlatim}` : "",
        govde.miniSoru ? `Öğretmenin sorduğu mini soru: ${govde.miniSoru}` : "",
        fotograf ? "Öğrenci bir soru fotoğrafı yükledi (ekteki ilk görsel). Bu soruyu çöz." : "",
        `Öğrencinin mesajı: ${soru || "(Yazı yok, yalnızca tahtadaki çizimimi / fotoğrafı değerlendir.)"}`,
      ]
        .filter(Boolean)
        .join("\n");

      const fotoUrl = fotograf.startsWith("data:image/") ? fotograf : "";
      const text = await sohbetTamamla(model, [
        { role: "system", content: sokratik ? SOKRATIK_SORU_TALIMATI : SORU_TALIMATI },
        {
          role: "user",
          content: [
            { type: "text", text: baglam },
            ...(fotoUrl ? [{ type: "image_url" as const, image_url: { url: fotoUrl } }] : []),
            ...(gorsel
              ? [{ type: "image_url" as const, image_url: { url: `data:image/png;base64,${gorsel}` } }]
              : []),
          ],
        },
      ]);
      const veri = jsonCikar<{ aciklama?: string; vuruslar?: unknown; elemanlar?: unknown }>(text);
      let vuruslar = vuruslariTemizle(veri.vuruslar);
      const aciklama = String(veri.aciklama ?? "").trim() || "Bunu birlikte inceleyelim.";
      if (vuruslar.length === 0) {
        vuruslar = [{ konusmaMetni: aciklama, vurgulananId: null, animasyonSuresiMs: 2500, elemanlar: elemanlariTemizle(veri.elemanlar) }];
      }
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
      if (sorular.length === 0) {
        return Response.json({ hata: "Yapay zekâ test sorusu üretemedi. Tekrar deneyin." }, { status: 422 });
      }
      return Response.json({ sorular });
    }

    return Response.json({ hata: "Bilinmeyen mod." }, { status: 400 });
  } catch (hata) {
    return hataYaniti(hata, model);
  }
}
