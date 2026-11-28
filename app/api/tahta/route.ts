import { hataYaniti, jsonCikar, modelSec, sohbetTamamla } from "@/lib/ai-yardimci";
import { duzYaziyaCevir, latexKacisOnar } from "@/lib/metin-temizle";
import { dersNotu } from "@/lib/ders-rehberi";
import { dersAdiTemizle } from "@/lib/dersler";
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
   → formül (KaTeX sözdizimi, JSON'da ters bölüyü \\\\ olarak kaçır) ve/veya kısa not satırı. Her aksiyon bloğa bir satır ekler. "latex" alanına SADECE matematik yaz; düz cümle/açıklama (\\\\text{...}) "not" alanına gider. "not" alanına renk adı yazma, renk "renk" alanındadır.
5) {"tip":"vurgula","gorsel":"h1"} → daha önce çizilmiş bloğu lazer halkasıyla gösterir.
Renkler: "#hex" veya "baslik" (lacivert), "formul" (mor), "vurgu" (kırmızı), "sonuc" (yeşil), "normal" (siyah).
DİYAGRAM DÜZENİ (geometri_ve_diyagram için ZORUNLU — tahta düzenli ve estetik görünmeli):
- Her şey viewBox içinde kalsın: tüm şekil ve yazılar x 40-760, y 40-420 arasında olsun; kenara yapışma, dışarı taşma.
- Önce ızgara planla: karşılaştırılan nesneleri (ör. iki top, iki kap, önce/sonra) EŞİT aralıklı sütunlara yerleştir — 2 nesne için merkezler x=240 ve x=560, 3 nesne için x=160, 400, 640. Hepsi aynı y merkezinde ve aynı boyutta olsun.
- Bir nesnenin etiketi/açıklaması DAİMA o nesnenin tam altında, yatayda ortalı olsun: text-anchor='middle' ve x = nesnenin merkez x'i (cx), y = nesnenin alt kenarı + 30. Aynı satırdaki tüm etiketler aynı y değerini kullansın. Yazıyı nesnenin sağına/soluna kaydırma.
- Ok ve kuvvet etiketleri okun ucuna yakın, oku kesmeyecek şekilde yazılsın; başlık benzeri yazılar üstte ortalı (x=400, text-anchor='middle').
- Yazılar 18-24 font-size, en fazla ~28 karakter; uzun açıklamayı diyagrama değil formul_ve_not notuna yaz. Yazılar birbirinin ve şekillerin üstüne binmesin.
- Aynı bloğa sonraki vuruşlarda eklenen parçalar ilk planladığın ızgaraya uysun (ikinci top ilk topun hizasında, etiketi de ilk etiketle aynı y'de).
DİYAGRAM KALİTESİ (geometri_ve_diyagram — çizimler ders kitabı kalitesinde, açıklayıcı ve dolu olmalı):
- Basit/boş şema çizme. Konunun gerçek parçalarını ayrı ayrı çiz ve etiketle; bir diyagram tüm vuruşlarıyla birlikte genellikle 12-40 öğeden oluşsun. Örnekler: hücre → zar, sitoplazma, çekirdek, çekirdekçik, mitokondri, ribozom, koful; kuvvet diyagramı → cisim, taralı zemin, her kuvvet için ayrı ok ve etiketi; devre → pil (uzun/kısa çizgi), direnç (zikzak), ampul, anahtar, akım yönü oku; üçgen → köşe harfleri, kenar uzunlukları, açı yayları ve dik açı kare işareti.
- Gerçek oranlara sadık kal. Eğri ve organik şekillerde (organ, yaprak, dalga, yörünge) path içinde Q/C eğrileri kullan; her şeyi dikdörtgenle geçiştirme.
- Ok çizimi: gövde için <line>, ucunda okun yönüne bakan küçük dolu <polygon> üçgen (yaklaşık 14px). marker, defs, use YASAK (desteklenmez).
- Parçaları ayırt etmek için açık pastel dolgular kullan: #e7f5ff (mavi), #fff3bf (sarı), #ebfbee (yeşil), #fff0f6 (pembe), #f3f0ff (mor), #fff4e6 (turuncu). Kontur stroke-width 2-3. Vurgulanan parçanın konturu renkli olsun: #e03131, #1971c2, #2f9e44, #7048e8.
- Yardımcı, ölçü ve izdüşüm çizgilerinde stroke-dasharray='6 6' kullan.
- Etiket parçadan uzaktaysa parçadan etikete ince bir kılavuz çizgi (stroke-width 1.5) çek; etiketler 1-3 kelime olsun.
DİYAGRAM ANİMASYONU (hareket, değişim veya süreç anlatılırken KULLAN — ok tek başına yetmez, nesnenin kendisi hareket etsin):
- Hareket eden nesneyi (top, araba, elektron, gezegen, sarkaç, kan hücresi...) ve ona ait etiketi tek bir <g> içine al ve <g>'ye data-anim ekle. Grup, çizimi bittiği anda canlanır; bu yüzden hareketli nesneyi hareketin anlatıldığı vuruşta çiz, önceki vuruşta aynı nesneyi durağan çizip tekrar çizme. Yön okunu ve yolu (kesikli çizgi) yine durağan çiz; nesne okun gösterdiği yönde hareket etsin.
- data-anim türleri:
  · 'kay': data-dx, data-dy kadar kayar (ör. top okun ucuna gider). İsteğe bağlı data-ivme='hizlan' (serbest düşme, kuvvet etkisinde hızlanma), 'yavasla' (sürtünmeyle durma), 'sabit' (sabit hız).
  · 'yol': data-yol boyunca ilerler; yol nesnenin bulunduğu yerden başlayan GÖRELİ bir path'tir ve 'M0 0' ile başlar (ör. eğik atış: data-yol='M0 0 Q180 -220 360 0'). data-yonelim='evet' nesneyi yola göre döndürür (araba, roket).
  · 'gidipgel': data-dx/data-dy kadar gidip geri gelir (yay, piston, titreşen tanecik, dalga).
  · 'salin': data-merkez='x y' asılma noktası etrafında ±data-aci derece sallanır (sarkaç, salıncak). Asılma ipi de gruba dahil olsun.
  · 'don': data-merkez etrafında sürekli döner (çark, gezegen yörüngesi, elektron; yörüngede dönme için merkez = yörüngenin merkezi). data-yon='-1' ters yön.
  · 'nabiz': yerinde büyüyüp küçülür (kalp atışı, vurgulanan sonuç, patlama noktası).
  · 'akis': çizginin üzerinde akan kesikli desen oluşturur; akım yönü, kan/su/hava akışı, enerji aktarımı için tel veya boru çizgisine (ya da onları içeren <g>'ye) ekle. data-yon='-1' akışı ters çevirir.
- 'kay' ve 'yol' hareketlerinde nesnenin başlangıç konumunda soluk bir izi otomatik kalır; başlangıç ve bitiş için ayrı ayrı nesne çizme, tek hareketli nesne yeter. Hareketli nesnenin etiketi gruba dahil olsun ki onunla birlikte gitsin; sabit kalması gereken yazıları (ör. "zemin", "h = 20 m") grubun DIŞINA yaz.
- Ortak: data-sure saniye (varsayılan 1-4), data-gecikme saniye, data-tekrar='1' sadece bir kez oynatır ve sonda bırakır (varsayılan sürekli tekrar).
- Hareket bittiğinde nesne x 40-760, y 40-420 içinde kalsın. Bir diyagramda en fazla 2-3 hareketli grup olsun; durağan kavramları (tanımlar, tablolar, geometri ispatı) canlandırma.
- Örnek: <g data-anim='kay' data-dx='300' data-dy='0' data-ivme='hizlan'><circle cx='180' cy='300' r='30' fill='#e7f5ff' stroke='#1971c2'/><text x='180' y='360' text-anchor='middle' font-size='20'>m</text></g>
- <text> içine YALNIZCA düz yazı yaz. LaTeX, $, ters bölü komutları (text, frac, vec...), ^{ } ve _{ } YASAK. Üs/indis ve semboller için Unicode kullan: x², v₀, F₁, 30°, Δx, √2, π, ½, ≤, →.
YAZI ALANLARI: "not", "etiket", "ad", "yonerge", "miniSoru" alanları DÜZ METİNDİR; içlerine LaTeX komutu, $ veya ters bölü yazma, gerekirse Unicode sembol kullan. LaTeX yalnızca formul_ve_not içindeki "latex" alanına yazılır.`;

const YARATICI_TAHTA = `YARATICI TAHTA ANLATIMI (YouTube'daki çizimli anlatım videoları gibi; HER DERSTE ZORUNLU):
- Her ders görselleştirilir. Sözel derslerde de (edebiyat, tarih, felsefe, din, dil bilgisi, yabancı dil) asla yalnızca yazıyla anlatma. Her söylenen fikrin tahtada bir görsel karşılığı olsun.
- Tahtayı boş bırakma. Vuruşların en az üçte ikisinde tahtaya bir şey eklensin; aksiyonsuz vuruş arka arkaya ikiden fazla olmasın (yalnızca başlığı tanıtan ilk vuruş boş olabilir). Her sahnede en az bir geometri_ve_diyagram, turkiye_haritasi veya matematik_grafigi bloğu olsun; bir sahneyi yalnızca formul_ve_not ile geçirme.
- Bir ana resmi parça parça kur: sahnenin ana çizimini (sahne, kavram haritası, zaman çizelgesi, kesit) vuruşlar boyunca aynı bloğa adım adım ekle. Birbirinden kopuk küçük resimler yerine anlatımla birlikte büyüyen tek bir tablo olsun.
- Soyutu somutlaştır: soyut kavramlar için akılda kalan bir METAFOR bul ve çiz. Örnekler: denge için terazi, süreç için dişli çarklar, gelişim için merdiven, bağlantı için köprü, temel fikir için evin temeli, karar için yol ayrımı, bellek için dosya dolabı, fikir için ampul, koruma için kalkan.
- Kullanabileceğin anlatım kalıpları: önce/sonra iki panel, neden → sonuç zinciri, döngü okları, yakınlaştırma (büyüteç dairesi + kesikli çizgilerle detay kutusu), karşılaştırma tablosu, kavram haritası, zaman çizelgesi, ağaç şeması, piramit, akış şeması.
- Karakter kullan: insanları, yazarları, tarihî kişileri, örnek öğrenciyi basit çöp adam veya büst olarak çiz (baş daire, gövde ve kollar çizgi); konuşma balonu (yuvarlak dikdörtgen + küçük kuyruk üçgeni) ve düşünce balonu (bulut + küçük daireler) ile konuştur.
- Basit ikonlar (yalnızca temel şekillerle çizilir): güneş (sarı daire + 8 ışın çizgisi), bulut (C eğrili path ile yan yana tümsekler, açık mavi dolgu), dünya (daire + ekvator elipsi + kıta lekeleri path), dağ (üçgen polygon + karlı tepe), ağaç (gövde dikdörtgen + yaprak bulutu), damla, kitap, kalem, ampul, kalp, göz, saat, ev, bayrak, parşömen, terazi, kupa.
- Sahneye bağlam kat: yer, ortam veya duygu anlatılıyorsa arka plan ögelerini (ufuk çizgisi, güneş, bulut, bina, deniz dalgası) hafifçe çiz; tahta dolu ama düzenli görünsün.
- Hareket, akış, değişim veya döngü varsa DİYAGRAM ANİMASYONU kurallarıyla canlandır (bulut kaysın, dünya dönsün, kan aksın, ordu ilerlesin).
ÖRNEK (sözel ders, edebiyat; tek bir d1 bloğu, vuruşlara bölünerek parça parça eklenir):
v1 dizeler → {"tip":"geometri_ve_diyagram","gorsel":"d1","svg":"<svg viewBox='0 0 800 460'><rect x='60' y='60' width='500' height='270' rx='14' fill='#fff9db' stroke='#1e1e1e' stroke-width='2'/><text x='90' y='120' font-size='22' fill='#1e1e1e'>Ben yürürüm yane yane</text><text x='90' y='180' font-size='22' fill='#1e1e1e'>Aşk boyadı beni kane</text><text x='90' y='240' font-size='22' fill='#1e1e1e'>Ne âkilem ne divane</text><text x='90' y='300' font-size='22' fill='#1e1e1e'>Gel gör beni aşk neyledi</text></svg>"}
v2 kafiye harfleri → {"tip":"geometri_ve_diyagram","gorsel":"d1","svg":"<svg viewBox='0 0 800 460'><circle cx='640' cy='112' r='22' fill='#fff0f6' stroke='#e03131' stroke-width='2'/><text x='640' y='120' text-anchor='middle' font-size='22' fill='#e03131'>a</text><circle cx='640' cy='172' r='22' fill='#fff0f6' stroke='#e03131' stroke-width='2'/><text x='640' y='180' text-anchor='middle' font-size='22' fill='#e03131'>a</text><circle cx='640' cy='232' r='22' fill='#fff0f6' stroke='#e03131' stroke-width='2'/><text x='640' y='240' text-anchor='middle' font-size='22' fill='#e03131'>a</text><circle cx='640' cy='292' r='22' fill='#e7f5ff' stroke='#1971c2' stroke-width='2'/><text x='640' y='300' text-anchor='middle' font-size='22' fill='#1971c2'>b</text></svg>"}
v3 hece sayısı → {"tip":"geometri_ve_diyagram","gorsel":"d1","svg":"<svg viewBox='0 0 800 460'><text x='540' y='120' text-anchor='end' font-size='18' fill='#2f9e44'>8</text><text x='540' y='180' text-anchor='end' font-size='18' fill='#2f9e44'>8</text><text x='540' y='240' text-anchor='end' font-size='18' fill='#2f9e44'>8</text><text x='540' y='300' text-anchor='end' font-size='18' fill='#2f9e44'>8</text><text x='400' y='390' text-anchor='middle' font-size='22' fill='#2f9e44'>Şema: aaab · Ölçü: 8'li hece</text></svg>"}`;

const OGRETMEN_KIMLIGI = `KİMLİĞİN: Konusuna hâkim, sabırlı, sıcak ve güven veren deneyimli bir Türk öğretmensin. Karşında tek bir öğrenci var; ona doğrudan "sen" diye hitap ederek gerçek bir sınıf öğretmeni gibi ders anlatırsın. Bir yapay zekâ, asistan veya sunucu gibi değil, öğretmen gibi konuşursun.`;

const VURUS_KURALLARI = `Her sahne kısa MİKRO-VURUŞLARA ("vuruslar") bölünür. Öğretmen her vuruşun "soz" cümlesini söylerken AYNI ANDA o vuruşun "aksiyonlar"ı tahtada belirir.
- "id": "v1", "v2"...
- "soz": öğretmenin o an öğrenciye söylediği 1-2 kısa cümle (toplam en fazla ~30 kelime), doğal konuşma dilinde Türkçe. Söz KONUYU öğretir: kavramı, nedenini, ilişkiyi, sonucu açıklar ve o an tahtada beliren şeyin ne anlama geldiğini anlatır.
- "aksiyonlar": yalnızca o söze karşılık gelen 0-2 küçük görsel işlem (bir il, bir ok, bir eğri, bir formül satırı...). Bir sahnenin tüm çizimini tek vuruşa yığma.
- ÇİZİM SESİN ÖNÜNE GEÇMEZ: bir nesne ancak ilgili söz söylenirken belirir. Söylenmeyen şeyi çizme, çizilmeyen şeye "burada gördüğün gibi" deme.
ÖĞRETMEN GİBİ KONUŞ (ZORUNLU):
- Kendi eylemini anlatma. "çiziyorum, yazıyorum, boyuyorum, ekliyorum, işaretliyorum, gösteriyorum, koyuyorum, çizeceğim, şimdi şunu yapacağım" gibi ifadeler YASAK. Çizim zaten ekranda kendiliğinden beliriyor; sen yalnızca anlamını öğret.
  YANLIŞ: "Şimdi Ankara'yı kırmızıyla boyuyorum." → DOĞRU: "Ankara başkentimiz; İç Anadolu'nun tam ortasında yer alır."
  YANLIŞ: "Formülü tahtaya yazıyorum." → DOĞRU: "Kuvvet, kütle ile ivmenin çarpımıdır; cisim ağırlaştıkça aynı ivme için daha büyük kuvvet gerekir."
  YANLIŞ: "Bir ok ekliyorum." → DOĞRU: "Sürtünme kuvveti her zaman harekete zıt yönde etki eder."
- Dikkat çekmek için "Bak", "Dikkat et", "Şuraya odaklan", "Fark ettin mi?" gibi doğal öğretmen dili kullan.
- Sahne, vuruş, blok, aksiyon, JSON, yapay zekâ, model gibi teknik/meta kelimeleri asla söyleme; "bu sahnede", "bir sonraki adımda şunu çizeceğiz" deme.
- Gerekçe ver ("çünkü", "bu yüzden"), öğrencinin aklına gelebilecek soruyu önceden yanıtla, ara sıra kısa bir soruyla düşündür, öğrenciyi cesaretlendir.
- "soz" sesli okunur: içine LaTeX, ters bölü, $, ^ veya _ yazma. Formülü sesli okur gibi yaz ("F eşittir m çarpı a", "x kare artı bir").`;

const CIZIM_STILI = `ÖĞRETMEN ÇİZİM STİLİ (gerçek bir öğretmenin tahtayı kullanma biçimi):
- Sahne başlığını uygulama OTOMATİK yazar: sadece başlığın tanıtıldığı vuruşta başlık tahtanın ortasına büyük yazılır, ilk çizim gelince başlık yukarı kayar. Bu yüzden başlığı formul_ve_not veya diyagram içinde ASLA tekrar yazma. Sahnenin ilk vuruşu konuyu tanıtıyorsa "aksiyonlar": [] bırak.
- Tahtayı yukarıdan aşağı, soldan sağa düzenli doldur; içerik birbirinden kopuk, rastgele konumlara dağılmasın.
- Boyutlar tutarlı olsun: aynı türden yazılar (etiketler, notlar) hep aynı font-size'ı kullansın; bir şey dev, yanındaki minik olmasın.
- Renk kodlaması tutarlı olsun: yeni terim/tanım "baslik", formül "formul", dikkat/tuzak/sık hata "vurgu", sonuç/cevap "sonuc", ara adımlar "normal". Aynı kavram ders boyunca hep aynı renkte kalsın.
- Bir vuruşta tek fikir: bir formül satırı, bir okun eklenmesi, bir değerin yerine konması. Çözümü satır satır, her satırda tek işlem yaparak yaz; ara adımı atlama.
- Kavramlar arasındaki ilişkiyi diyagramla göster (akış, neden-sonuç, karşılaştırma tablosu, zaman çizelgesi); karar noktalarını ayrı kutu/elmas olarak çiz.
- Önemli yere dönerken "vurgula" aksiyonunu kullan; sonucu "sonuc" renginde ve altı çizili yaz.
- Tahtanın sınırları vardır: bir sahneye sığmayacak kadar çok şey yazma. Bir formul_ve_not bloğunda en fazla 6 satır olsun, notlar kısa (en fazla ~12 kelime) tutulsun; fazlası için yeni sahneye geç.`;

const PEDAGOJI = `ANLATIM AKIŞI (Astra AI tarzı yapılandırılmış ders):
1) Kanca: günlük hayattan merak uyandıran bir soru/örnekle başla ve dersin hedefini tek cümlede söyle.
2) Ön bilgi: konunun dayandığı önceki bilgiyi kısaca hatırlat.
3) Kavram: tanımı sade dille ver, sezgisini açıkla, hemen görselleştir.
4) Kural/formül: nereden geldiğini göster; her sembolün anlamını tahtada etiketle.
5) Çözümlü örnek: kitaptaki örnek soruları (metinde "▶ Örnek" vb.) mutlaka tahtada adım adım çöz; kitapta yoksa kendin kolaydan zora 1-2 örnek kur.
6) Tuzak: öğrencilerin en sık yaptığı hatayı "vurgu" renginde göster.
7) Kontrol: sahne sonunda anladığını ölçen kısa soru sor (miniSoru).
8) Özet: son sahnede ana fikirleri 3-5 maddede tahtada topla.
SÖZEL DERSLERDE: Kuralı ezberletme; kitaptaki örnek metni, dizeyi, belgeyi veya cümleyi tahtaya yaz ve kuralı onun üzerinde işaretleyerek göster. Her kavramdan sonra kısa bir uygulama sorusu sor (ör. "Bu dizede hangi sanat var?"). Konuyu dönemine ve tarihsel bağlamına bağla.
KİTAP METNİNİ AYIKLAMA: Metinde "## " satırları kitabın başlıkları, "▶ " satırları örnek/tanım/uyarı kutularıdır; sahneleri bu başlık sırasına göre kur. Sayfa numarası, üst/alt bilgi, telif, "etkinlik sayfasına geçiniz" gibi gürültüyü yok say. Hiçbir tanımı, formülü ve örneği atlama; ama metni kelimesi kelimesine okumak yerine öğretmen gibi yeniden anlat.`;

const GOREV_KURALI = `"miniGorev" (isteğe bağlı, her 2-3 sahnede bir): {"tur":"il_tikla","yonerge":"Haritada Ankara'ya tıkla","dogruPlaka":6} (yalnızca sahnede harita varsa) veya {"tur":"tahtaya_yaz","yonerge":"Sonucu tahtaya yazıp Tahtayla Birlikte Gönder'e bas"}. Yoksa null.`;

const ANLAT_TALIMATI = `${OGRETMEN_KIMLIGI} Beyaz tahtada konuşurken eş zamanlı çizerek ders anlatıyorsun.
Sana bir ünitenin TAM metni veriliyor. Bu metindeki HER kavramı, tanımı, formülü, örneği ve detayı eksiksiz öğret; özetleyip atlama.
Anlatımı mantıklı sahnelere böl (4-12 sahne). Kitaptaki her "## " başlık en az bir sahne olsun. Her sahnede 6-10 vuruş olsun; 3-4 vuruşluk yüzeysel sahne kurma. Her sahne tek bir alt konuya/adıma odaklansın ve o alt konuyu örnekle derinleştirsin.
- "baslik": sahnenin kısa başlığı (1-3 kelime)
- "miniSoru": öğrencinin anladığını kontrol eden kısa soru YA DA null. Kavram ve örnek sahnelerinin sonunda soru sor.
${PEDAGOJI}
${GOREV_KURALI}
${VURUS_KURALLARI}
${CIZIM_STILI}
${GORSEL_KURALLARI}
${YARATICI_TAHTA}
YALNIZCA şu JSON'u döndür:
{"sahneler":[{"baslik":"...","miniSoru":null,"miniGorev":null,"vuruslar":[{"id":"v1","soz":"...","aksiyonlar":[]}]}]}`;

const SOKRATIK_ANLAT_TALIMATI = `${OGRETMEN_KIMLIGI} Sokratik yöntemle öğretirsin. Cevabı veya çözümü ASLA doğrudan söyleme ya da tahtaya yazma.
Sana bir ünitenin metni veriliyor. Konuyu 3-8 sahneye böl, her sahnede 3-8 vuruş olsun. Tahtaya yalnızca soruyu, verilenleri, şemayı ve küçük ipuçlarını çiz.
- "miniSoru" HER sahnede zorunlu: öğrencinin kendi başına çözüp yazarak veya tahtaya çizerek cevaplayacağı soru.
${GOREV_KURALI} Haritalı sahnelerde il_tikla görevini tercih et.
Sokratik akış: kanca sorusuyla başla, öğrencinin bildiği şeyden yola çık, her sahnede bir sonraki adımı keşfettiren yönlendirici soru sor, ipuçlarını kademeli ver (önce genel, sonra daha belirgin).
KİTAP METNİNİ AYIKLAMA: "## " satırları başlık, "▶ " satırları örnek/tanım kutularıdır; sahneleri bu sıraya göre kur, gürültüyü (sayfa no, üst/alt bilgi) yok say.
${VURUS_KURALLARI}
${CIZIM_STILI}
${GORSEL_KURALLARI}
${YARATICI_TAHTA}
YALNIZCA şu JSON'u döndür:
{"sahneler":[{"baslik":"...","miniSoru":"...","miniGorev":null,"vuruslar":[{"id":"v1","soz":"...","aksiyonlar":[]}]}]}`;

const SORU_ORTAK = `Öğrencinin gönderdiği tahta görüntüsü, öğretmenin tahtadaki çizimleri (harita, grafik, diyagram) ile öğrencinin üstüne KIRMIZI kalemle yaptığı işaretlerin birleşimidir; işaretlenen yerleri doğrudan görerek değerlendir.
Cevabını tahtada canlı çizerek ver: 2-8 vuruşluk "vuruslar" dizisi oluştur. Cevap, dersin şu anki adımından çıkılmadan aynı adım içinde temiz bir tahta yüzeyine çizilir; cevap bitince ders kaldığı yerden devam eder.
Öğrenci soru fotoğrafı gönderdiyse fotoğraf tahtanın soluna yerleştirilir; sen çözümü yanına adım adım çiz.`;

const SORU_TALIMATI = `${OGRETMEN_KIMLIGI} ${SORU_ORTAK}
Soruyu adım adım çöz ve açıkla: önce verilenleri ve isteneni tahtaya yaz, sonra kullanılacak kuralı/formülü göster, her satırda tek işlem yap, sonucu "sonuc" renginde altı çizili yaz. Son vuruşta yeni soru SORMA; cevabı konuya bağlayan kısa bir geçiş cümlesiyle bitir (ör. "Harika, şimdi anlatmaya devam edelim."), çünkü ders otomatik olarak devam edecek. Öğrenci bir mini soruya cevap veriyorsa doğru olup olmadığını nazikçe söyle ve gerekçesini göster; yanlışsa hatanın tam olarak hangi adımda olduğunu "vurgu" renginde göster.
${VURUS_KURALLARI}
${CIZIM_STILI}
${GORSEL_KURALLARI}
${YARATICI_TAHTA}
YALNIZCA şu JSON'u döndür:
{"aciklama":"Kısa özet","vuruslar":[{"id":"v1","soz":"...","aksiyonlar":[]}]}`;

const SOKRATIK_SORU_TALIMATI = `${OGRETMEN_KIMLIGI} Sokratik yöntemle öğretirsin. ${SORU_ORTAK}
Cevabı veya çözümün tamamını ASLA verme. Öğrencinin attığı adımı değerlendir: doğruysa takdir et ve sonraki adımı düşündüren soruyu sor; yanlışsa hatanın nerede olduğunu ipucuyla göster. Son vuruş daima öğrenciye bir soruyla bitsin.
${VURUS_KURALLARI}
${CIZIM_STILI}
${GORSEL_KURALLARI}
${YARATICI_TAHTA}
YALNIZCA şu JSON'u döndür:
{"aciklama":"Kısa özet","vuruslar":[{"id":"v1","soz":"...","aksiyonlar":[]}]}`;

const TEST_TALIMATI = `Sen bir Türk öğretmensin. Verilen ünite metninden öğrencinin anlayıp anlamadığını ölçen TAM 3 adet çoktan seçmeli soru hazırla.
Her sorunun 4 seçeneği olsun, yalnızca biri doğru olsun. Sorular ezber değil kavrama ölçsün.
Tüm metinler düz yazı olsun: LaTeX, $ veya ters bölü komutu kullanma; üs, kök ve semboller için Unicode yaz (x², √2, π, ≤, 30°).
YALNIZCA şu JSON'u döndür:
{"sorular":[{"soru":"...","secenekler":["A","B","C","D"],"dogruIndex":0,"aciklama":"Doğru cevabın kısa gerekçesi"}]}`;

const RENK_ANAHTARLARI = new Set(["baslik", "başlık", "formul", "formül", "vurgu", "sonuc", "sonuç", "normal"]);

const BOLGELER = new Set<Bolge>(["marmara", "ege", "akdeniz", "ic-anadolu", "karadeniz", "dogu-anadolu", "guneydogu-anadolu"]);

const sayi = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : undefined);
const yazi = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const duz = (v: unknown, max: number) => {
  const y = yazi(v, max);
  return y ? duzYaziyaCevir(y) || undefined : undefined;
};
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

function yaziyaCevir(latex: string) {
  latex = latexKacisOnar(latex);
  const metinler = [...latex.matchAll(/\\(?:text|textbf|mathrm)\{([^{}]*)\}/g)].map((m) => m[1]);
  const kalan = latex.replace(/\\(?:text|textbf|mathrm)\{[^{}]*\}/g, "").replace(/[\s=:,.\-]|\\[,;!]|\\quad/g, "");
  const duzYazi = !/[\\^_{}]/.test(latex) && /\p{L}{3,}\s+\p{L}{3,}/u.test(latex);
  if (duzYazi) return latex.trim();
  if (!metinler.length || kalan.length > 4) return undefined;
  return latex
    .replace(/\\(?:text|textbf|mathrm)\{([^{}]*)\}/g, "$1")
    .replace(/\\[,;!]|\\quad/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
          return p ? { plaka: p, ad: duz(x.ad, 30) ?? "", renk: renk(x.renk) ?? "vurgu", etiket: duz(x.etiket, 40) } : undefined;
        }),
        bolgeRenkleri,
        baglantiOklari: dizi<BaglantiOku>(h.baglantiOklari, 10, (x) => {
          const a = plaka(x.neredenPlaka);
          const b = plaka(x.nereyePlaka);
          return a && b && a !== b ? { neredenPlaka: a, nereyePlaka: b, etiket: duz(x.etiket, 30) } : undefined;
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
          return ifade ? { ifade, renk: renk(x.renk) ?? "baslik", etiket: duz(x.etiket, 30) } : undefined;
        }),
        noktalar: dizi<GrafikNoktasi>(h.noktalar, 8, (x) => {
          const nx = sayi(x.x);
          const ny = sayi(x.y);
          return nx !== undefined && ny !== undefined ? { x: nx, y: ny, etiket: duz(x.etiket, 30) ?? "" } : undefined;
        }),
      };
    case "geometri_ve_diyagram": {
      const svg = svgTemizle(h.svg);
      return svg ? { tip: "geometri_ve_diyagram", gorsel, svg } : undefined;
    }
    case "formul_ve_not": {
      const hamLatex = yazi(h.latex, 600);
      const hamNot = duz(h.not, 160);
      const temizNot = hamNot && !RENK_ANAHTARLARI.has(hamNot.toLocaleLowerCase("tr")) ? hamNot : undefined;
      const latexMetni = hamLatex ? yaziyaCevir(hamLatex) : undefined;
      const latex = latexMetni || !hamLatex ? undefined : latexKacisOnar(hamLatex) || undefined;
      const not = latexMetni ? [latexMetni, temizNot].filter(Boolean).join(" — ").slice(0, 200) : temizNot;
      return latex || not ? { tip: "formul_ve_not", gorsel, latex, not, renk: renk(h.renk), altiCizili: h.altiCizili === true } : undefined;
    }
    case "vurgula":
      return { tip: "vurgula", gorsel };
    default:
      return undefined;
  }
}

const EYLEM_FIILI =
  /(?<!\p{L})(?:çiz|yaz|boy|ekl|işaretl|göster|koy|çek|bağl|yerleştir|taral|vurgul|boya|ekle|işaretle|bağla)(?:iyorum|ıyorum|uyorum|üyorum|yorum|eceğim|yeceğim|acağım|yacağım|iyoruz|ıyoruz|uyoruz|üyoruz)(?!\p{L})/iu;

const buyukBasla = (m: string) => (m ? m.charAt(0).toLocaleUpperCase("tr") + m.slice(1) : m);

// Öğretmenin "Şimdi Ankara'yı boyuyorum, burası başkentimiz." gibi kendi eylemini anlatan kısımlarını ayıklar.
function eylemAnlatiminiAyikla(soz: string) {
  const cumleler = soz.match(/[^.!?…]+[.!?…]*/g)?.map((c) => c.trim()).filter(Boolean) ?? [];
  const kalan = cumleler.flatMap((cumle) => {
    if (!EYLEM_FIILI.test(cumle)) return [cumle];
    const son = cumle.match(/[.!?…]+$/)?.[0] ?? ".";
    const govde = cumle.slice(0, cumle.length - (cumle.match(/[.!?…]+$/)?.[0].length ?? 0));
    const yan = govde.split(/\s*[,;:—–]\s*/).filter((p) => p && !EYLEM_FIILI.test(p));
    const metin = yan.join(", ").replace(/^(?:ve|ama|sonra|şimdi|ardından|böylece)\s+/iu, "").trim();
    return metin.split(/\s+/).length >= 2 ? [buyukBasla(metin) + son] : [];
  });
  return kalan.length ? kalan.join(" ") : soz;
}

function sozTemizle(ham: string) {
  return eylemAnlatiminiAyikla(duzYaziyaCevir(ham.trim()).replace(/\s+/g, " ").trim());
}

function vuruslariTemizle(ham: unknown): Vurus[] {
  if (!Array.isArray(ham)) return [];
  return ham
    .filter((v) => v && typeof v === "object")
    .map((v, i) => ({
      id: yazi(v.id, 20) ?? `v${i + 1}`,
      soz: sozTemizle(String(v.soz ?? v.konusmaMetni ?? "")).slice(0, 400),
      aksiyonlar: dizi(v.aksiyonlar, 4, aksiyonTemizle),
    }))
    .filter((v) => v.soz || v.aksiyonlar.length)
    .slice(0, 16);
}

function gorevTemizle(ham: unknown): MiniGorev | null {
  if (!ham || typeof ham !== "object") return null;
  const g = ham as Record<string, unknown>;
  const yonerge = duz(g.yonerge, 200);
  if (!yonerge) return null;
  if (g.tur === "il_tikla") {
    const p = plaka(g.dogruPlaka);
    return p ? { tur: "il_tikla", yonerge, dogruPlaka: p } : null;
  }
  return g.tur === "tahtaya_yaz" ? { tur: "tahtaya_yaz", yonerge } : null;
}

const baslikNormal = (m: string) =>
  m
    .toLocaleLowerCase("tr")
    .replace(/^\s*\d+[.)]\s*/, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

function baslikTekrariniAyikla(vuruslar: Vurus[], baslik: string): Vurus[] {
  const hedef = baslikNormal(baslik);
  if (!hedef) return vuruslar;
  return vuruslar.map((v) => ({
    ...v,
    aksiyonlar: v.aksiyonlar.filter((a) => !(a.tip === "formul_ve_not" && !a.latex && a.not && baslikNormal(a.not) === hedef)),
  }));
}

function sahneleriTemizle(ham: unknown): Sahne[] {
  if (!Array.isArray(ham)) return [];
  return ham
    .filter((s) => s && typeof s === "object")
    .map((s) => {
      const vuruslar = baslikTekrariniAyikla(vuruslariTemizle(s.vuruslar), String(s.baslik ?? ""));
      const haritaVar = vuruslar.some((v) => v.aksiyonlar.some((a) => a.tip === "turkiye_haritasi"));
      let miniGorev = gorevTemizle(s.miniGorev);
      if (miniGorev?.tur === "il_tikla" && !haritaVar) miniGorev = null;
      return {
        baslik: String(s.baslik ?? "").trim().slice(0, 60) || "Sahne",
        miniSoru: duz(s.miniSoru, 300) ?? null,
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
      const secenekler = s.secenekler.map((x: unknown) => duzYaziyaCevir(String(x))).slice(0, 5);
      const dogru = sayi(s.dogruIndex) ?? 0;
      return {
        soru: duzYaziyaCevir(s.soru.trim()),
        secenekler,
        dogruIndex: Math.max(0, Math.min(secenekler.length - 1, Math.round(dogru))),
        aciklama: duzYaziyaCevir(String(s.aciklama ?? "").trim()),
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
      seviye?: Seviye;
      ders?: string;
      baslik?: string;
      altKonular?: string[];
      metin?: string;
    }
  | {
      mode: "soru";
      model?: string;
      ogretmenModu?: OgretmenModu;
      seviye?: Seviye;
      ders?: string;
      soru?: string;
      gorsel?: string;
      fotograf?: string;
      uniteBaslik?: string;
      sonAnlatim?: string;
      miniSoru?: string | null;
    }
  | { mode: "test"; model?: string; ders?: string; baslik?: string; metin?: string };

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
        {
          role: "system",
          content: (sokratik ? SOKRATIK_ANLAT_TALIMATI : ANLAT_TALIMATI) + seviyeNotu(govde.seviye) + dersNotu(govde.ders),
        },
        { role: "user", content: `Ünite: ${govde.baslik ?? "Konu"}${altKonular}\n\n--- ÜNİTE METNİ (TAM) ---\n${metin}` },
      ]);
      const sahneler = sahneleriTemizle(jsonCikar<{ sahneler?: unknown }>(text).sahneler);
      if (sahneler.length === 0) {
        return Response.json({ hata: "Yapay zekâ sahne üretemedi. Lütfen tekrar deneyin." }, { status: 422 });
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
        {
          role: "system",
          content: (sokratik ? SOKRATIK_SORU_TALIMATI : SORU_TALIMATI) + seviyeNotu(govde.seviye) + dersNotu(govde.ders),
        },
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
      const aciklama = duzYaziyaCevir(String(veri.aciklama ?? "").trim()) || "Bunu birlikte inceleyelim.";
      let vuruslar = vuruslariTemizle(veri.vuruslar);
      if (vuruslar.length === 0) vuruslar = [{ id: "v1", soz: aciklama, aksiyonlar: [] }];
      return Response.json({ aciklama, vuruslar });
    }

    if (govde.mode === "test") {
      const metin = (govde.metin ?? "").trim();
      if (!metin) return Response.json({ hata: "Test için ünite metni gerekli." }, { status: 400 });
      const text = await sohbetTamamla(model, [
        { role: "system", content: TEST_TALIMATI },
        {
          role: "user",
          content: `${dersAdiTemizle(govde.ders) ? `Ders: ${dersAdiTemizle(govde.ders)}\n` : ""}Ünite: ${govde.baslik ?? "Konu"}\n\n${metin.slice(0, 60_000)}`,
        },
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
