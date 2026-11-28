import "server-only";
import { dersAdiTemizle } from "@/lib/dersler";

type Rehber = { anahtarlar: string[]; metin: string };

const EDEBIYAT = `- Şiir incelemesi: dizeleri alt alta yaz; her dizenin sağına kafiye harfini (a, b, c) renkli küçük dairenin içinde göster, aynı kafiyeler aynı renkte olsun; dize sonuna hece sayısını yaz, durakları "|" ile işaretle. Redif ve kafiye hecelerini dizenin altına ayrı renkli kutuda tekrar yaz.
- Nazım biçimleri: beyit/dörtlük yapısını üst üste kutularla çiz; gazel için matla/makta etiketleri ve "aa ba ca" şeması, koşma için dörtlük kutuları ve "abab cccb" şeması.
- Edebi dönem ve akımlar: yatay zaman çizelgesi; dönemleri farklı pastel renk bantları, üzerine yıl işaretleri, altına temsilci adları ve küçük kitap/kalem ikonları.
- Karşılaştırma (Divan–Halk, Tanzimat I–II. dönem, Servetifünun–Fecriati): iki sütunlu tablo; satırlar dil, ölçü, nazım birimi, konu, temsilci; ortak özellikler ortada ayrı kutuda.
- Söz sanatlarını GÖRSELLEŞTİR: teşbihte benzeyen ve benzetilen iki nesneyi çiz, aralarına "gibi" köprüsü ve benzetme yönü etiketi; teşhiste nesneye yüz ve kol ekle; tezatta terazi kefelerine iki karşıt kavram; mübalağada abartılmış dev nesne; kişileştirme ve intak için konuşma balonu.
- Yazar ve eser: merkezde yazarın basit portresi veya çöp adamı, çevresinde kitap ikonları içinde eser adları, tür ve akım etiketleri (kavram haritası).
- Roman ve hikâye: olay örgüsünü dağ eğrisi olarak çiz (serim, düğüm, doruk, çözüm); kahramanları çöp adamlarla ve aralarındaki ilişki oklarıyla göster; anlatıcı bakış açısını göz ikonuyla anlat.
- Metin türleri: ağaç şeması (ana tür → alt türler → örnek eser).
- Edebiyat dersinde kuralı ezberletme: kitaptaki örnek dizeyi veya metni tahtaya yaz, kuralı onun üzerinde işaretleyerek göster; her kavramdan sonra "Bu dizede hangi sanat var?" gibi bir uygulama sorusu sor ve dönemi tarihsel bağlamına bağla.`;

const DIL_BILGISI = `- Cümle ögeleri: cümleyi kelimelere ayır, her ögenin altına köşeli parantez ve kısaltma (Ö, Y, N, DT, BT) yaz; yüklemden soru sorma oklarını göster.
- Kök ve ekler: kökü bir kutuya, her eki ayrı renkli kutuya koy (yapım eki ve çekim eki farklı renk); kelimeyi parçalara ayıran animasyonlu bölme çizgileri.
- Ses olayları: önce ve sonra hâlini ok ile göster (kitap + ı → kitabı), değişen harfi kırmızı daireyle vurgula.
- Gerçek ve mecaz anlam: iki panel çiz; örneğin "soğuk insan" için solda buz küpü, sağda gülümsemeyen bir yüz.
- Paragraf: ana fikri evin çatısı, yardımcı fikirleri sütunları olarak çiz.
- Sözcük türleri ve fiilimsiler: ağaç şeması ve renk kodlu örnek cümleler.`;

const TARIH = `- Her sahnede zaman çizelgesi kullan: olaylar çizgi üzerinde tarih işaretleri ve olay kartlarıyla dizilsin.
- Neden → olay → sonuç zincirini domino taşları ya da ok zinciri olarak çiz; sonuçları "sonuc" renginde göster.
- Savaş ve cepheler: şematik konum kutuları, bayrak ikonlu ordular, hareket okları (yol animasyonu ile ilerleyen ok/ordu). Türkiye içindeki yerler için turkiye_haritasi kullan.
- Antlaşmalar: parşömen ikonu içinde madde listesi; tarafları terazinin iki kefesine koy.
- Önemli kişiler: basit büst veya çöp adam, konuşma balonunda tarihî söz.
- Devlet ve toplum yapısı: piramit veya hiyerarşi şeması; dönemleri karşılaştırma tablosu.`;

const COGRAFYA = `- Türkiye, iller, bölgeler konularında turkiye_haritasi kullan.
- Dünya: daire, ekvator elipsi, eksen eğikliği (23° 27') ve Güneş etrafında yörünge elipsi; dünyayı yörüngede 'don' animasyonuyla döndür; mevsimler için dört konum; gece-gündüz için yarısı koyu daire.
- İklim ve hava: güneş, bulut, yağmur damlası, rüzgâr okları ('akis' animasyonu), yüksek/alçak basınç merkezleri (Y, A).
- Su döngüsü: deniz → buharlaşma okları → bulut → yağış → akarsu, döngü okları; bulutu 'kay' ile hareket ettir.
- Yer şekilleri: dağ kesit profili, kayaç katmanları, levha sınırları ('gidipgel'), volkan kesiti, fay hattı, akarsu aşındırma aşamaları.
- Harita bilgisi: ölçek çizgisi, eş yükselti eğrileri ve altında kesit profili.
- Nüfus ve ekonomi: nüfus piramidi (yaş gruplarına göre çubuklar), grafikler, üretim-tüketim akış şemaları.
- Atmosfer katmanları: yatay renk bantları ve yanında yükseklik ölçeği.`;

const BIYOLOJI = `- Hücrenin içini detaylı çiz: hücre zarı, sitoplazma, çekirdek ve çekirdekçik, mitokondri (içinde kıvrımlar), ribozom noktaları, endoplazmik retikulum, golgi, koful, bitkide hücre duvarı ve kloroplast.
- Yakınlaştırma anlatımı: organ → doku → hücre → organel; büyüteç dairesi ve kesikli bağlantı çizgileriyle detay kutusu aç.
- Sistemler: kalbin 4 odası ve kan akış yönü (kırmızı/mavi, 'akis'), sindirim kanalı, akciğer ve alveol yakın planı, nöron (dendrit, akson, uyarının 'akis' ile ilerlemesi).
- Süreçler: mitoz/mayoz evreleri yan yana karelerde, DNA merdiveni, protein sentezi akışı, fotosentez (yaprak, güneş, CO₂ girişi, O₂ çıkışı okları).
- Ekoloji: besin zinciri ve ağı, enerji piramidi, madde döngüleri (döngü okları).
- Kalıtım: Punnett karesi tablosu, soy ağacı (kare erkek, daire dişi).`;

const FIZIK = `- Her problemde önce durumu gerçek nesnelerle çiz, ardından serbest cisim diyagramı ve kuvvet okları.
- Hareketi canlandır: atış, serbest düşme, eğik düzlem, sarkaç, yay; konum-zaman ve hız-zaman grafikleri.
- Elektrik: devre şemaları (pil, direnç, ampul, anahtar), akım yönünü 'akis' ile göster.
- Optik: ayna ve mercekte ışın diyagramı, odak ve merkez noktaları, görüntü oluşumu.
- Dalgalar: sinüs eğrisi (path), dalga boyu ve genlik ölçüleri, 'gidipgel' ile titreşim.
- Enerji: yükseklik ve hıza göre enerji çubukları, dönüşüm okları.`;

const KIMYA = `- Atom modeli: çekirdek, katman elipsleri, elektronları 'don' ile çevir; iyon oluşumunda elektron aktarım oku.
- Periyodik tablo kesiti: ızgara hücreleri, grup ve periyot okları, değişim eğilimi okları.
- Bağlar: Lewis nokta yapıları, top-çubuk molekül modelleri, kutuplu yapılarda δ+ δ− etiketleri.
- Tepkimeler: girenler → ürünler; önce/sonra tanecik kutuları ile atomların korunduğunu göster.
- Deney düzenekleri: beher, deney tüpü, erlen, ısıtıcı alevi; çözelti içinde tanecikler; gazlarda piston ('gidipgel').
- Mol ve hesaplamalar: kutu-ok akış şeması ile birim dönüşümü.`;

const MATEMATIK = `- Problemin durumunu gerçek nesnelerle çiz (havuz ve musluk, tren ve yol, işçi, torba ve toplar), sonra matematiğe dönüştür.
- Sayı doğrusu, kesir pastası ve şeritleri, alan modeli ile çarpma, Venn şemaları ile kümeler.
- Fonksiyonu girdi → makine kutusu → çıktı olarak göster; grafiği matematik_grafigi ile çiz.
- Sayma ve olasılık: ağaç diyagramı, torba-top çizimi, tablo.
- Çözümü formul_ve_not ile satır satır, her satırda tek işlem yaparak yaz.`;

const GEOMETRI = `- Üçgen, dörtgen ve çemberleri köşe harfleri, kenar uzunlukları, açı yayları ve dik açı işaretiyle çiz.
- Katı cisimlerde perspektif: görünmeyen kenarları kesikli çiz; açınımı yanına aç.
- Yardımcı çizgileri kesikli ve farklı renkte ekle; eşlik ve benzerlikte eş parçaları aynı renkle işaretle.
- Dönüşüm geometrisinde ötelemeyi 'kay', dönmeyi 'don' ile canlandır.`;

const FELSEFE = `- Filozofları çöp adam veya basit büst olarak çiz, görüşlerini konuşma ve düşünce balonlarında karşılaştır.
- Kavram haritası: merkezde ana kavram, dallarda alt kavramlar ve örnekler.
- Karşıt görüşleri terazinin iki kefesine koy; argümanı öncüller → sonuç kutularıyla göster.
- Mantık: doğruluk tablosu, Venn şemaları, çıkarım akış şeması.
- Psikoloji: beyin bölümleri, bellek modeli (duyusal → kısa süreli → uzun süreli kutuları ve okları), ihtiyaçlar piramidi.
- Sosyoloji: birey-toplum ağları, kurum şemaları, değişim zaman çizelgesi.`;

const DIN = `- Zaman çizelgesi, kavram haritası, değerler ağacı ve karşılaştırma tabloları kullan.
- Mekânları sembolik çiz (cami silüeti, Kâbe küpü, minare); ibadet adımlarını sıra kutularıyla göster.
- Peygamberleri, sahabeleri ve kutsal kişileri ASLA insan figürü, yüz veya çöp adam olarak çizme; isimlerini yalnızca yazı kutusunda göster.`;

const YABANCI_DIL = `- Kelimeyi anlamıyla birlikte göster: yeni kelimenin yanına nesnesini çiz (apple → elma çizimi).
- Zamanları zaman çizgisi üzerinde göster (geçmiş, şimdi, gelecek), eylemin konumunu nokta veya aralıkla işaretle.
- Cümle yapısı: özne, yüklem ve nesneyi renkli kutularla dizip Türkçe karşılığıyla karşılaştır.
- Prepositions: kutu ve top çizimiyle in, on, under, behind, next to.
- Diyaloglar: çöp adamlar ve konuşma balonları. Yabancı kelimelerin söylenişini sözde Türkçe okunuşla ver.`;

const BILISIM = `- Algoritmaları akış şemasıyla göster (başla/bitir ovali, işlem kutusu, karar elması).
- Veri yapıları: dizi kutuları ve indeksleri, yığın ve kuyruk, ağaç düğümleri; adımları animasyonla göster (eleman 'kay' ile yer değiştirsin).
- Ağlar: bilgisayar ikonları, topoloji çizgileri, veri paketinin 'yol' ile ilerlemesi.
- Donanım: bilgisayar bileşenleri blok şeması (girdi → işlemci → bellek → çıktı).`;

const REHBERLER: Rehber[] = [
  { anahtarlar: ["edebiyat", "turk dili"], metin: `${EDEBIYAT}\n${DIL_BILGISI}` },
  { anahtarlar: ["turkce", "dil bilgisi", "dilbilgisi"], metin: `${DIL_BILGISI}\n${EDEBIYAT}` },
  { anahtarlar: ["inkilap", "tarih"], metin: TARIH },
  { anahtarlar: ["cografya"], metin: COGRAFYA },
  { anahtarlar: ["sosyal bilgiler", "hayat bilgisi", "vatandas"], metin: `${TARIH}\n${COGRAFYA}` },
  { anahtarlar: ["biyoloji", "saglik", "anatomi", "fizyoloji"], metin: BIYOLOJI },
  { anahtarlar: ["fizik"], metin: FIZIK },
  { anahtarlar: ["kimya"], metin: KIMYA },
  { anahtarlar: ["fen"], metin: `${FIZIK}\n${KIMYA}\n${BIYOLOJI}` },
  { anahtarlar: ["geometri"], metin: `${GEOMETRI}\n${MATEMATIK}` },
  { anahtarlar: ["matematik", "istatistik", "kalkulus", "analiz", "cebir"], metin: `${MATEMATIK}\n${GEOMETRI}` },
  { anahtarlar: ["felsefe", "mantik", "psikoloji", "sosyoloji"], metin: FELSEFE },
  { anahtarlar: ["din", "ahlak", "siyer", "kuran", "hadis"], metin: DIN },
  { anahtarlar: ["ingilizce", "almanca", "fransizca", "ispanyolca", "arapca", "rusca", "italyanca", "japonca", "dil"], metin: YABANCI_DIL },
  { anahtarlar: ["bilisim", "yazilim", "bilgisayar", "kodlama", "programlama"], metin: BILISIM },
];

const GENEL = `- Bu ders için hazır bir şablon yok; konunun kendisinden görsel fikirler üret. Her kavram için kendine "Bunu bir YouTube çizimli anlatım videosunda nasıl çizerdim?" diye sor.
- Soyut kavramları somut metaforlarla çiz (terazi, köprü, merdiven, dişli çark, ağaç, ev, yol, kalkan, ampul).
- Süreçleri akış ve döngü şemasıyla, kısımları kavram haritasıyla, farkları karşılaştırma tablosuyla, gelişimi zaman çizelgesiyle göster.`;

const normallestir = (s: string) =>
  s
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[âà]/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u");

function rehberBul(ders: string) {
  const n = normallestir(ders);
  return REHBERLER.find((r) => r.anahtarlar.some((a) => n.includes(a)))?.metin ?? GENEL;
}

export function dersNotu(hamDers: unknown) {
  const ders = dersAdiTemizle(hamDers);
  if (!ders) return "";
  return `\nDERS: "${ders}". Anlatımı, örnekleri, terimleri ve tahta çizimlerini bu dersin öğretim geleneğine göre yap; bu dersin öğretmenleri konuyu nasıl görselleştiriyorsa öyle görselleştir.
BU DERS İÇİN GÖRSEL FİKİR BANKASI (örnektir, birebir kopyalama; konuya göre yaratıcı ol):
${rehberBul(ders)}`;
}
