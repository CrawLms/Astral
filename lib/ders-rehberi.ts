import "server-only";
import { dersAdiTemizle } from "@/lib/dersler";

type Rehber = { anahtarlar: string[]; metin: string };

const EDEBIYAT = `- Edebi dönemler ve akımlar: \`zaman_cizelgesi\` (yatay dönem şeridi, yıl işaretleri, temsilci adları).
- Karşılaştırma (Divan–Halk, Tanzimat I–II, Servetifünun–Fecriati): \`tablo\` (ölçütler: dil, ölçü, nazım birimi, konu, temsilci) + ortak özellikler için \`hazir_sahne\` (\`sablon: "venn"\`).
- Yazar–eser ilişkisi ve metin türleri ağacı: \`akis_semasi\` (kavram haritası veya ağaç şeması); tür/eser ögeleri için \`hazir_sahne\` (\`sablon: "ikon_izgarasi"\`, \`kitap\`, \`kalem\`, \`parsomen\`).
- Söz sanatları: tezat için \`hazir_sahne\` (\`sablon: "terazi"\`), olay örgüsü basamakları (serim–düğüm–doruk–çözüm) için \`akis_semasi\` veya \`hazir_sahne\` (\`sablon: "piramit"\`).
- Şiir incelemesi ve dize üstünde kafiye/redif/ölçü işaretleme: yalnızca bu özel satır işaretlemesinde \`geometri_ve_diyagram\` kullan (dizeleri alt alta yaz; sağda kafiye harfini a/b/c renkli dairede, dize sonunda hece sayısını ve durakları "|" ile göster).
- Edebiyat dersinde kuralı ezberletme: kitaptaki örnek dizeyi veya metni tahtaya yaz, kuralı onun üzerinde işaretleyerek göster; her kavramdan sonra "Bu dizede hangi sanat var?" gibi bir uygulama sorusu sor ve dönemi tarihsel bağlamına bağla.`;

const DIL_BILGISI = `- Ses olayları (ünlü düşmesi, ünsüz yumuşaması: önce → sonra), kök–ek ayrımı ve yapım/çekim ekleri: \`akis_semasi\` (\`yon: "LR"\` veya \`"TB"\`) ya da \`tablo\`.
- Sözcük türleri, fiilimsiler ve cümle çeşitleri sınıflandırması: \`akis_semasi\` (ağaç şeması) ve \`tablo\` (örnek cümlelerle).
- Paragraf yapısı (ana fikir–yardımcı fikirler): \`hazir_sahne\` (\`sablon: "piramit"\` veya \`akis_semasi\`).
- Gerçek/mecaz anlam veya kavram ikilemleri: \`tablo\` veya \`hazir_sahne\` (\`sablon: "terazi"\`, \`"ikon_izgarasi"\`).
- Cümle ögeleri (kelimelerin altına parantez, Ö/Y/N/DT/BT etiketleri ve yüklemden soru okları): bu satır-altı çözümlemede \`geometri_ve_diyagram\` (\`<defs>/<marker>\` oklarıyla) kullan.`;

const TARIH = `- Kronoloji, çağlar, savaş/inkılap aşamaları: her uygun sahnede \`zaman_cizelgesi\` (tarih rozetleri ve olay kartları).
- Neden → olay → sonuç zinciri: \`akis_semasi\` (\`yon: "LR"\` veya \`"TB"\`, sonuç düğümleri \`sonuc\` renginde).
- Türkiye içi cepheler, kongreler, iller ve güzergâhlar: \`turkiye_haritasi\` (\`vurgulananIller\` ve \`baglantiOklari\`).
- Antlaşma tarafları ve güç dengesi: \`hazir_sahne\` (\`sablon: "terazi"\`); maddeler ve dönem kıyasları için \`tablo\`; önemli kavram ögeleri için \`hazir_sahne\` (\`sablon: "ikon_izgarasi"\` — \`parsomen\`, \`bayrak\`, \`kalkan\`).
- Devlet ve toplum yapısı / yönetim hiyerarşisi: \`hazir_sahne\` (\`sablon: "piramit"\`).
- Tarihî şahsiyetin konuşma balonlu sahnesi gibi özel anlatım gerektiğinde son çare olarak \`geometri_ve_diyagram\` kullan.`;

const COGRAFYA = `- Türkiye, iller, bölgeler, iklim/nüfus/tarım dağılımı: \`turkiye_haritasi\` (ZORUNLU).
- Sıcaklık, yağış, nüfus eğrileri: \`matematik_grafigi\`; bölge/iklim/kayaç karşılaştırmaları: \`tablo\`.
- Su döngüsü, kayaç döngüsü, rüzgâr/basınç neden-sonuç akışı: \`akis_semasi\` (\`akis: true\`) veya \`hazir_sahne\` (\`sablon: "ikon_izgarasi"\` — \`gunes\`, \`bulut\`, \`yagmur\`, \`dunya\`, \`dag\`, \`agac\`).
- Atmosfer katmanları, toprak horizonları, nüfus piramidi: \`hazir_sahne\` (\`sablon: "piramit"\`).
- Dünya'nın eksen eğikliği (23° 27'), mevsim konumları, fay/volkan/eş yükselti kesiti gibi özel çizimlerde \`geometri_ve_diyagram\` (\`don\`, \`gidipgel\` animasyonlarıyla) kullan.`;

const BIYOLOJI = `- Hayvan, bitki ve prokaryot hücre kesitleri ile organel vurgusu: \`hazir_sahne\` (\`sablon: "hucre_kesiti"\`, ilgili organellerde \`vurgulu: true\`).
- Canlılık organizasyon basamakları, ekolojik besin ve enerji piramidi: \`hazir_sahne\` (\`sablon: "piramit"\`).
- Mitoz/mayoz evreleri, protein sentezi, solunum/fotosentez, madde döngüleri, sinir iletimi: \`akis_semasi\` (\`akis: true\` ile akış yönü) veya \`zaman_cizelgesi\` (evre sırası); organ/kavram özetleri için \`hazir_sahne\` (\`sablon: "ikon_izgarasi"\` — \`kalp\`, \`akciger\`, \`noron\`, \`dna\`, \`yaprak\`, \`mikroskop\`).
- Kalıtım (Punnett karesi), kan grupları ve organel/sistem karşılaştırmaları: \`tablo\`.
- Kalbin 4 odası, nefron/alveol gibi özel anatomik kesitler gerektiğinde son çare \`geometri_ve_diyagram\` (\`akis\` animasyonuyla) kullan.`;

const FIZIK = `- Eğik düzlem soruları: \`hazir_sahne\` (\`sablon: "egik_duzlem"\`).
- Elektrik devreleri (seri, paralel, karışık, akım yönü): \`hazir_sahne\` (\`sablon: "elektrik_devresi"\`).
- Aynalar ve mercekler (ışın çizimi, odak/merkez, görüntü): \`hazir_sahne\` (\`sablon: "optik_duzenek"\`).
- Serbest cisim diyagramı ve bileşke kuvvet: \`hazir_sahne\` (\`sablon: "kuvvet_dengesi"\`).
- Konum–zaman, hız–zaman, ivme–zaman grafikleri: \`matematik_grafigi\`.
- Vektör geometrisi ve açı/üçgen hesapları: \`geometri\`; birim ve kavram kıyasları: \`tablo\`.
- Sarkaç, dalga titreşimi veya eğik atış yörüngesi gibi hareket animasyonlarında \`geometri_ve_diyagram\` (\`salin\`, \`gidipgel\`, \`yol\`) kullan; işlemi \`formul_ve_not\` ile adım adım çöz.`;

const KIMYA = `- Atom modeli, katman elektron dizilimi ve iyon yükü: \`hazir_sahne\` (\`sablon: "atom_modeli"\`).
- Kimyasal tepkimeler, çözeltiler, kap/piston ve ısıtma deneyleri: \`hazir_sahne\` (\`sablon: "tepkime_kabi"\`).
- Kütle korunumu ve denge karşılaştırmaları: \`hazir_sahne\` (\`sablon: "terazi"\`).
- Periyodik tablo kesiti, asit–baz/madde hâlleri karşılaştırması: \`tablo\`.
- Mol–kütle–hacim dönüşüm şeması ve tepkime basamakları: \`akis_semasi\`.
- Çözünürlük/hız/pH grafikleri: \`matematik_grafigi\`; molekül geometrisi açıları: \`geometri\`. Lewis nokta yapısı gibi özel çizimlerde \`geometri_ve_diyagram\` kullan.`;

const MATEMATIK = `- Fonksiyon, doğru, parabol ve eşitsizlik eğrileri: \`matematik_grafigi\`.
- Kümeler (kesişim, birleşim, fark, evrensel küme): \`hazir_sahne\` (\`sablon: "venn"\`).
- Denklem eşitliği ve ağırlık dengesi: \`hazir_sahne\` (\`sablon: "terazi"\`).
- Sayma/olasılık ağaç diyagramı, fonksiyon makinesi (girdi → kural → çıktı) ve işlem akışı: \`akis_semasi\`.
- Değer/frekans/oran tabloları ve sınıflandırmalar: \`tablo\`.
- Koordinat düzleminde çokgenler/uzaklıklar: \`geometri\` (\`koordinatGoster: true\`).
- Sayı doğrusu, kesir pastası veya sözel problem (havuz–musluk, tren) sahnesi gerektiğinde \`geometri_ve_diyagram\` kullan; çözümü \`formul_ve_not\` ile satır satır, her satırda tek işlem yaparak yaz.`;

const GEOMETRI = `- Üçgen, dörtgen, çokgen, çember, yay, açı, diklik, yükseklik, kenarortay, eşlik/benzerlik ve analitik geometri: \`geometri\` (ZORUNLU: \`noktalar\`, \`dogrular\`, \`cemberler\`, \`acilar\`, \`yukseklikler\`, \`cokgenler\`, \`koordinatGoster\`).
- Çokgen/üçgen sınıflandırması ve özellik kıyası: \`tablo\` veya \`hazir_sahne\` (\`sablon: "venn"\`).
- Katı cisim perspektifi, açınım ve öteleme/dönme animasyonu (\`kay\`, \`don\`) gibi \`geometri\` ile çizilemeyen özel durumlarda \`geometri_ve_diyagram\` kullan.`;

const FELSEFE = `- Kavram haritası ve argüman yapısı (öncüller → sonuç): \`akis_semasi\`.
- Karşıt felsefi görüşler ve ikilemler: \`hazir_sahne\` (\`sablon: "terazi"\`).
- Akımlar/filozoflar karşılaştırması ve mantık doğruluk tablosu: \`tablo\`; kavram ilişkileri: \`hazir_sahne\` (\`sablon: "venn"\`).
- Psikolojide ihtiyaçlar piramidi: \`hazir_sahne\` (\`sablon: "piramit"\`); bellek modeli: \`akis_semasi\`.
- Felsefe tarihi dönemleri ve sosyolojik değişim: \`zaman_cizelgesi\`.`;

const DIN = `- Peygamberlik tarihi, vahiy ve İslam tarihi dönemleri: \`zaman_cizelgesi\`.
- Kavram haritası, ibadet adımları ve değerler ağacı: \`akis_semasi\` veya \`hazir_sahne\` (\`sablon: "ikon_izgarasi"\` — \`kitap\`, \`kalp\`, \`saat\`, \`ev\`, \`terazi\`).
- İnanç/ibadet/kavram karşılaştırmaları: \`tablo\` veya \`hazir_sahne\` (\`sablon: "venn"\`).
- Sembolik mekân (cami silüeti, Kâbe) gerekirse son çare \`geometri_ve_diyagram\` kullan.
- Peygamberleri, sahabeleri ve kutsal kişileri ASLA insan figürü, yüz veya çöp adam olarak çizme; isimlerini yalnızca yazı kutusunda göster.`;

const YABANCI_DIL = `- Zaman kipleri (past, present, future) ve eylem sırası: \`zaman_cizelgesi\` (\`aralik\` ve \`vurgulu\` ile).
- Kelime–anlam eşleştirme: \`hazir_sahne\` (\`sablon: "ikon_izgarasi"\`, uygun ikonlarla).
- Cümle yapısı (özne → yüklem → nesne) ve dil bilgisi çekim tabloları: \`akis_semasi\` (\`yon: "LR"\`) ve \`tablo\`.
- Prepositions (in, on, under, behind) veya konuşma balonlu diyalog gerektiğinde \`geometri_ve_diyagram\` kullan. Yabancı kelimelerin söylenişini sözde Türkçe okunuşla ver.`;

const BILISIM = `- Algoritmalar (başla/bitir \`oval\`, işlem \`kutu\`, karar \`elmas\`, girdi/çıktı \`paralelkenar\`): \`akis_semasi\` (ZORUNLU, \`akis: true\` ile veri akışı).
- Donanım bileşenleri (girdi → işlemci → bellek → çıktı) ve ağ topolojisi: \`akis_semasi\` (gruplarla) veya \`hazir_sahne\` (\`sablon: "ikon_izgarasi"\`).
- Veri türü / algoritma karmaşıklığı karşılaştırması: \`tablo\`.
- Dizi, yığın, kuyruk adım animasyonu (\`kay\`, \`yol\`) gerektiğinde \`geometri_ve_diyagram\` kullan.`;

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

const GENEL = `- Bu ders için hazır bir şablon yoksa konuya en uygun YAPISAL BLOĞU seç: süreç/ilişki için \`akis_semasi\`, aşama/tarih için \`zaman_cizelgesi\`, karşılaştırma için \`tablo\`.
- Soyut kavramları \`hazir_sahne\` metaforlarıyla somutlaştır (\`terazi\`, \`piramit\`, \`venn\`, \`ikon_izgarasi\` — \`merdiven\`, \`kopru\`, \`kalkan\`, \`disli\`, \`ampul\`, \`kitap\`, \`saat\`, \`terazi\`).
- Yalnızca bu yapısal bloklara sığmayan özgün çizimlerde son çare olarak \`geometri_ve_diyagram\` kullan.`;

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
