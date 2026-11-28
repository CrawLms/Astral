import { hataYaniti, jsonCikar, modelSec, sohbetTamamla, type SohbetMesaji } from "@/lib/ai-yardimci";
import { duzYaziyaCevir, latexKacisOnar } from "@/lib/metin-temizle";
import { dersNotu } from "@/lib/ders-rehberi";
import { dersAdiTemizle } from "@/lib/dersler";
import type {
  AkisBaglantisi,
  AkisDugum,
  AkisDugumSekli,
  AkisGrubu,
  AkisSemasiAksiyonu,
  AkisYon,
  Aksiyon,
  BaglantiOku,
  Bolge,
  EgikDuzlemKuvvet,
  EgikDuzlemSablonu,
  ElektrikDevresiEleman,
  ElektrikDevresiSablonu,
  GeometriAci,
  GeometriAksiyonu,
  GeometriCember,
  GeometriCokgen,
  GeometriDogru,
  GeometriEtiket,
  GeometriNokta,
  GeometriYukseklik,
  GrafikFonksiyonu,
  GrafikNoktasi,
  HazirSahneAksiyonu,
  HucreKesitiSablonu,
  HucreOrganeli,
  IkonIzgarasiOge,
  KuvvetDengesiKuvvet,
  KuvvetDengesiSablonu,
  MiniGorev,
  OgretmenModu,
  OptikDuzenekSablonu,
  PiramitKatmani,
  PiramitSablonu,
  Sahne,
  Seviye,
  TabloAksiyonu,
  TabloVurgusu,
  TepkimeKabiSablonu,
  TepkimeKabiTanecik,
  TeraziKefe,
  TeraziSablonu,
  TestSorusu,
  VennKumesi,
  VurgulananIl,
  Vurus,
  ZamanCizelgesiAksiyonu,
  ZamanCizelgesiYon,
  ZamanOlayi,
} from "@/lib/types";
import { gorselKimlikleriniAyir } from "@/lib/types";
import {
  ILLUSTRASYON_PAKETI,
  YEDEK_SEMA_GORSEL,
  type IllustrasyonIstegiSahnesi,
  type SahneIllustrasyonu,
} from "@/lib/sahne-cesitlilik";

export const maxDuration = 300;

const SEVIYE_ACIKLAMA: Record<Seviye, string> = {
  ilkokul: "İlkokul öğrencisi: çok basit kelimeler, somut günlük örnekler, kısa cümleler.",
  ortaokul: "Ortaokul öğrencisi (LGS): açık dil, temel terimleri tanımlayarak, örnekli anlatım.",
  lise: "Lise / YKS öğrencisi: müfredat terimleri, sınavda çıkan tuzaklar ve formüllerle derinlemesine anlatım.",
  universite: "Üniversite öğrencisi: akademik terminoloji, ispat/gerekçe ve ileri bağlantılarla anlatım.",
};

const SVG_KURALLARI = `   SVG kuralları:
   - viewBox='0 0 800 460'; tüm şekil ve yazılar x 40-760, y 40-420 içinde; tek tırnak kullan.
   - İzinli etiketler: defs, marker, path, circle, ellipse, rect, line, polyline, polygon, text, g (script, style, foreignObject, image, iframe, on*, dış href YASAK).
   - Oklar için <defs><marker id='ok' viewBox='0 0 10 10' refX='8' refY='5' markerWidth='6' markerHeight='6' orient='auto-start-reverse'><path d='M0 1 L10 5 L0 9 z' fill='#1e1e1e'/></marker></defs> tanımlayıp marker-end='url(#ok)' / marker-start='url(#ok)' kullan; elle ok üçgeni tekrarlama.
   - Pastel dolgular (#e7f5ff, #fff3bf, #ebfbee, #fff0f6, #f3f0ff, #fff4e6), stroke='#1e1e1e', stroke-width='2-3', yardımcı çizgide stroke-dasharray='6 6'; etiketler 18-24 font-size, max ~28 karakter.
   - Nesneleri tanınır biçimde çiz: basit ama gerçekçi siluetler (path ile gövde, kanat, yaprak, dağ, dalga, bina, gemi, çöp adam), zemin çizgisi ve gökyüzü/ufuk gibi bağlam ögeleri; her önemli parçayı kısa bir etiket ve gerekiyorsa okla adlandır.
   - Hareket/süreç animasyonunda nesne+etiketi <g data-anim='...'> içine al: 'kay' (data-dx, data-dy, data-ivme='hizlan'|'yavasla'|'sabit'), 'yol' (data-yol='M0 0 ...', data-yonelim='evet'), 'gidipgel' (data-dx, data-dy), 'salin' (data-merkez='x y', data-aci), 'don' (data-merkez='x y', data-yon='-1'), 'nabiz', 'akis' (çizgi/tel üstünde akan kesik). Sabit yazılar <g> dışında kalsın; en fazla 2-3 animasyon grubu.`;

const GORSEL_KURALLARI = `TAHTA ÇİZİM KURALLARI (ÇOK ÖNEMLİ):
- Tahtaya çizimleri yalnızca aşağıdaki görsel bloklarla "aksiyonlar" içinde ekle. Ölçü/konum doğruluğu gereken içerikte (Türkiye haritası, fonksiyon grafiği, geometrik şekil, fen düzeneği) yapısal bloklar ZORUNLUDUR; konunun kendisini resmeden sahneye özel çizimler için 8) illustrasyon kullan.
- Her aksiyonun "gorsel" alanı bir blok kimliğidir (ör. "geo1", "ak1", "il1", "f1"). Aynı kimliği sonraki vuruşlarda tekrar kullanınca o bloğa yeni parça/satır/olay/katman eklenir. Bir sahnede en fazla 3 blok olsun; yerleşimi uygulama otomatik yapar (ana görsel solda, formul_ve_not sağda).
- SEÇİM: Önce içeriğin doğasına bak. Türkiye/il/bölge → 1; fonksiyon/grafik → 2; geometrik şekil → 3; kesin fen düzeneği (eğik düzlem, devre, optik, kuvvet, atom, tepkime kabı, hücre) → 7. Kronoloji → 5, çok ölçütlü karşılaştırma → 6, algoritma/soyut neden-sonuç zinciri → 4. Bunların dışında kalan ya da somut bir nesne, mekân, olay, canlı, doğa olayı, makine veya kişi anlatan HER sahnede 8) illustrasyon ile o sahneye özel bir resim çiz. Kalıp şablonu (ikon_izgarasi, piramit, venn, terazi, akis_semasi) içeriğe gerçekten uymuyorsa zorlama; illüstrasyon çiz.
BLOKLAR:
1) turkiye_haritasi (Türkiye, iller, bölgeler, coğrafi dağılım — ZORUNLU):
   {"tip":"turkiye_haritasi","gorsel":"h1","vurgulananIller":[{"plaka":6,"ad":"Ankara","renk":"#e03131","etiket":"Başkent"}],"bolgeRenkleri":{"ic-anadolu":"#fff3bf"},"baglantiOklari":[{"neredenPlaka":34,"nereyePlaka":6,"etiket":"göç"}]}
   Bölgeler: marmara, ege, akdeniz, ic-anadolu, karadeniz, dogu-anadolu, guneydogu-anadolu. İlk aksiyon boş da olabilir (temel haritayı çizer).
2) matematik_grafigi (Fonksiyon, doğru, parabol, konum-zaman/hız-zaman grafikleri — ZORUNLU):
   {"tip":"matematik_grafigi","gorsel":"g1","xAralik":[-5,5],"yAralik":[-2,10],"fonksiyonlar":[{"ifade":"x^2-2*x+1","renk":"#1971c2","etiket":"f(x)"}],"noktalar":[{"x":1,"y":0,"etiket":"Tepe"}]}
   Eğriyi SEN hesaplama; ifade yaz (x, + - * / ^, sin cos tan sqrt abs ln log exp, pi). İlk aksiyonda xAralik ve yAralik zorunlu.
3) geometri (Üçgen, dörtgen, çokgen, çember, yay, açı, diklik, yükseklik, benzerlik, koordinat geometrisi — ZORUNLU):
   {"tip":"geometri","gorsel":"geo1","noktalar":[{"ad":"A","x":0,"y":4},{"ad":"B","x":0,"y":0},{"ad":"C","x":6,"y":0}],"cokgenler":[{"noktalar":["A","B","C"],"dolgu":"#e7f5ff"}],"dogrular":[{"a":"A","b":"B","etiket":"4","esitlik":1},{"a":"B","b":"C","etiket":"6"},{"a":"A","b":"C"}],"acilar":[{"a":"A","kose":"B","c":"C","dik":true},{"a":"B","kose":"C","c":"A","etiket":"α","yaySayisi":1}],"yukseklikler":[{"tepe":"A","tabanA":"B","tabanB":"C","etiket":"h","dikIsareti":true,"kesikli":true}],"cemberler":[{"merkez":"O","r":3,"etiket":"r = 3"}],"etiketler":[{"metin":"Alan = 12","x":3,"y":-1}],"koordinatGoster":false}
   Matematiksel Kartezyen koordinat kullan (y yukarı artar, örn. 0..10 veya -5..5); köşe yerleşimi, dik açı karesi ve açı yayları otomatik çizilir.
   noktalar: ad, x, y, etiket?, renk?, gizli?, konum? ("ust"|"alt"|"sol"|"sag"|"otomatik"). dogrular: a, b, etiket?, tur? ("dogru_parcasi"|"dogru"|"isin"), kesikli?, renk?, kalinlik?, esitlik? (1|2|3). cemberler: merkez, r, renk?, dolgu?, kesikli?, etiket?, baslangicAci?, bitisAci?. acilar: a, kose, c, dik?, etiket?, renk?, yaySayisi? (1|2|3), yaricap?. yukseklikler: tepe, tabanA, tabanB, ayak?, etiket?, dikIsareti?, kesikli?, renk?.
4) akis_semasi (Akış şeması, kavram haritası, neden-sonuç ağacı, döngü, algoritma, süreç — ZORUNLU):
   {"tip":"akis_semasi","gorsel":"ak1","yon":"TB","dugumler":[{"id":"n1","etiket":"Başla","sekil":"oval","dolgu":"#ebfbee"},{"id":"n2","etiket":"x > 0 mı?","altEtiket":"karar","sekil":"elmas","ikon":"disli","dolgu":"#fff3bf"}],"baglantilar":[{"kaynak":"n1","hedef":"n2","etiket":"girdi","akis":true,"kesikli":false,"ciftYon":false}],"gruplar":[{"id":"g1","baslik":"Kontrol","dugumler":["n2"],"dolgu":"#f8f9fa"}]}
   yon: "TB" | "LR". sekil: "kutu" | "yuvarlak" | "oval" | "elmas" | "daire" | "paralelkenar". Düğümlerde isteğe bağlı "ikon" kullanabilirsin. Yerleşim ve ok yönlendirmesi otomatik yapılır.
5) zaman_cizelgesi (Kronoloji, tarihî dönemler, çağlar, evreler, zamanlar — ZORUNLU):
   {"tip":"zaman_cizelgesi","gorsel":"zc1","baslik":"Kurtuluş Savaşı","yon":"yatay","olaylar":[{"tarih":"1919","baslik":"Samsun'a Çıkış","aciklama":"Millî Mücadele başlar","ikon":"bayrak","vurgulu":true,"renk":"vurgu"},{"tarih":"1920","baslik":"TBMM Açılışı","aralik":"1920–1922"}]}
   yon: "yatay" | "dikey". Olaylarda isteğe bağlı "ikon" kullanabilirsin.
6) tablo (Karşılaştırma, sınıflandırma, özellik/veri/doğruluk/Punnett tablosu — ZORUNLU):
   {"tip":"tablo","gorsel":"tb1","baslik":"Karşılaştırma","basliklar":["Ölçüt","Divan","Halk"],"satirlar":[["Ölçü","Aruz","Hece"],["Dil","Ağır","Sade"]],"sutunRenkleri":["","#e7f5ff","#ebfbee"],"vurgular":[{"satir":0,"sutun":2,"renk":"sonuc","not":"Millî ölçü"}]}
   vurgular içindeki satir ve sutun 0-tabanlı indekstir.
7) hazir_sahne (Fen düzenekleri ve görsel metaforlar — ZORUNLU; aşağıdaki 11 "sablon" türünden birini kullan):
   - egik_duzlem: {"tip":"hazir_sahne","gorsel":"hs1","sablon":"egik_duzlem","aci":30,"aciEtiketi":"30°","cisimEtiketi":"m","kuvvetler":[{"yon":"agirlik","etiket":"G"},{"yon":"normal","etiket":"N"},{"yon":"surtunme","etiket":"fs"}],"surtunme":true,"hareket":"asagi","yukseklikEtiketi":"h","uzunlukEtiketi":"L"} (kuvvet yon: "yukari"|"asagi"|"normal"|"yatay"|"agirlik"|"surtunme"; hareket: "yukari"|"asagi"|"durgun").
   - elektrik_devresi: {"tip":"hazir_sahne","gorsel":"hs1","sablon":"elektrik_devresi","duzen":"seri","kaynak":{"gerilim":"12 V","etiket":"V"},"elemanlar":[{"tur":"direnc","etiket":"R₁","deger":"4 Ω"},{"tur":"ampul","etiket":"L"},{"tur":"anahtar","kapali":true}],"akimYonu":"saat","akimEtiketi":"I = 2 A"} (duzen: "seri"|"paralel"|"karisik"; eleman tur: "direnc"|"ampul"|"anahtar"|"ampermetre"|"voltmetre"|"kondansator"|"pil"; paralel için kol: 0,1...).
   - optik_duzenek: {"tip":"hazir_sahne","gorsel":"hs1","sablon":"optik_duzenek","tur":"cukur_ayna","odakEtiketi":"F","merkezEtiketi":"M","cisim":{"konum":"merkez_disi","boy":2,"etiket":"Cisim"},"goruntu":{"goster":true,"etiket":"Görüntü"},"isinlar":true} (tur: "cukur_ayna"|"tumsek_ayna"|"duz_ayna"|"ince_mercek"|"kalin_mercek"; konum: "merkez_disi"|"merkezde"|"odak_merkez_arasi"|"odakta"|"odak_ayna_arasi" veya sayı).
   - kuvvet_dengesi: {"tip":"hazir_sahne","gorsel":"hs1","sablon":"kuvvet_dengesi","cisim":{"sekil":"kutu","etiket":"m"},"zemin":"yatay","kuvvetler":[{"etiket":"F₁","aci":0,"buyukluk":10},{"etiket":"F₂","aci":180,"buyukluk":4}],"bileske":{"etiket":"R = 6 N","goster":true}} (aci: 0 sağ, 90 yukarı, 180 sol, 270 aşağı; zemin: "yatay"|"yok"|"ip"; sekil: "kutu"|"daire"|"nokta").
   - atom_modeli: {"tip":"hazir_sahne","gorsel":"hs1","sablon":"atom_modeli","sembol":"Na","ad":"Sodyum","proton":11,"notron":12,"katmanlar":[2,8,1],"yuk":"+1","animasyon":true}
   - tepkime_kabi: {"tip":"hazir_sahne","gorsel":"hs1","sablon":"tepkime_kabi","kap":"iki_kap","baslik":"Tepkime","girenler":[{"etiket":"H₂","sayi":2,"faz":"gaz"}],"urunler":[{"etiket":"H₂O","sayi":2,"faz":"sivi"}],"isi":true,"piston":false,"etiket":"ΔH < 0"} (kap: "beher"|"erlen"|"tup"|"iki_kap"; tek kapta "tanecikler" kullan; faz: "kati"|"sivi"|"gaz").
   - hucre_kesiti: {"tip":"hazir_sahne","gorsel":"hs1","sablon":"hucre_kesiti","tur":"bitki","baslik":"Bitki Hücresi","organeller":[{"ad":"Kloroplast","aciklama":"Fotosentez yapar","vurgulu":true}]} (tur: "hayvan"|"bitki"|"prokaryot").
   - terazi: {"tip":"hazir_sahne","gorsel":"hs1","sablon":"terazi","baslik":"Denge","sol":{"baslik":"Sol","maddeler":["2x + 3"],"agirlik":11},"sag":{"baslik":"Sağ","maddeler":["11"],"agirlik":11},"denge":"esit","merkezEtiket":"="} (denge: "esit"|"sol_agir"|"sag_agir").
   - piramit: {"tip":"hazir_sahne","gorsel":"hs1","sablon":"piramit","baslik":"Piramit","yon":"alttan_uste","katmanlar":[{"baslik":"Taban","altMetin":"Temel","vurgulu":true},{"baslik":"Tepe"}],"yanEtiket":"Artış ↑"} (yon: "ustten_alta"|"alttan_uste").
   - venn: {"tip":"hazir_sahne","gorsel":"hs1","sablon":"venn","baslik":"Kümeler","kumeler":[{"ad":"A","elemanlar":["1","2"]},{"ad":"B","elemanlar":["2","3"]}],"kesisim":["2"],"evrensel":"E"}
   - ikon_izgarasi: {"tip":"hazir_sahne","gorsel":"hs1","sablon":"ikon_izgarasi","baslik":"Adımlar","sutunSayisi":3,"ogeler":[{"ikon":"gunes","baslik":"Buharlaşma","altMetin":"Isı"},{"ikon":"bulut","baslik":"Yoğuşma"}]}
     İzinli ikon adları: gunes, bulut, yagmur, dunya, dag, agac, yaprak, kalp, akciger, noron, dna, mikroskop, pil, ampul, direnc, anahtar, miknatis, disli, merdiven, kopru, kalkan, kitap, kalem, parsomen, saat, ev, bayrak, insan, terazi, beher, atom, damla, simsek, yildiz, termometre, pusula.
8) illustrasyon (SAHNEYE ÖZEL ÇİZİM — konuyu resmet: olay yeri, savaş meydanı, deney ortamı, canlı/organ kesiti, doğa olayı, manzara, makine, karakterler ve konuşma balonları, şiirin imgesi, dize/cümle işaretleme, sayı doğrusu, sarkaç/atış animasyonu):
   {"tip":"illustrasyon","gorsel":"il1","svg":"<svg viewBox='0 0 800 460'>...</svg>"}
   KATMAN KATMAN KUR: aynı "gorsel" kimliğiyle sonraki vuruşlarda YENİ bir <svg> katmanı gönder; her katman YALNIZCA o vuruşta eklenen parçaları içerir ve öncekilerin üstüne çizilir (ilk katman zemin + ana nesne, sonrakiler etiket, ok, detay, hareket). Önceki katmanları tekrar gönderme.
${SVG_KURALLARI}
9) formul_ve_not (Formül ve kısa el yazısı not — sağ yardımcı alan):
   {"tip":"formul_ve_not","gorsel":"f1","latex":"F = m \\\\cdot a","not":"kısa el yazısı not","renk":"formul","altiCizili":true}
   "latex" içine SADECE matematik yaz (JSON'da \\\\ kaçışı ile); düz açıklama "not" alanına gider; "not" içine renk adı yazma.
10) vurgula: {"tip":"vurgula","gorsel":"h1"} → daha önce çizilmiş bloğu lazer halkasıyla gösterir.
Renkler: "#hex" veya "baslik" (lacivert), "formul" (mor), "vurgu" (kırmızı), "sonuc" (yeşil), "normal" (siyah).
YAZI ALANLARI: "not", "etiket", "altEtiket", "ad", "baslik", "aciklama", "satirlar", "yonerge", "miniSoru" ve SVG <text> DÜZ METİNDİR; LaTeX, $ veya ^{ } / _{ } yazma, Unicode kullan (x², v₀, F₁, 30°, Δx, √2, π, ½, ≤, →, ⊥).`;

const YARATICI_TAHTA = `YARATICI TAHTA ANLATIMI (HER DERSTE ZORUNLU):
- Her ders görselleştirilir. Sözel derslerde de (edebiyat, tarih, felsefe, din, dil bilgisi, yabancı dil) asla yalnızca yazıyla anlatma; her ana fikrin tahtada bir görsel karşılığı olsun.
- Tahtayı boş bırakma: sahnenin konuyu tanıtan ilk vuruşu hariç HER vuruşta en az bir aksiyon olsun (yeni parça, satır, düğüm, olay, not veya vurgula). "Bak", "gördüğün gibi", "burada", "tahtada" diyorsan o anda tahtada gerçekten bir çizim olmalı. Her aksiyonun "tip" ve "gorsel" alanını mutlaka yaz; farklı tipteki bloklara AYNI "gorsel" kimliğini verme (ör. geometri "geo1", not "f1"). Her sahnede en az bir ana görsel blok (turkiye_haritasi, matematik_grafigi, geometri, akis_semasi, zaman_cizelgesi, tablo, hazir_sahne veya illustrasyon) olsun. Sahneyi yalnızca formul_ve_not ile geçirme.
- Adım adım kur: aynı "gorsel" kimliğine sonraki vuruşlarda yeni nokta, yükseklik, düğüm, olay, satır veya SVG katmanı ekleyerek resmi anlatımla birlikte büyüt.
- SAHNEYE ÖZEL ÇİZİM VE ÇEŞİTLİLİK (ZORUNLU):
  • Her sahnenin ana görseli O SAHNENİN konusuna özel olsun; öğrenci tahtaya bakınca hangi konunun anlatıldığını resimden anlayabilmeli.
  • Art arda iki sahnede aynı ana blok tipini veya aynı hazir_sahne şablonunu kullanma (içeriğin zorunlu kıldığı harita, grafik, geometri ve fen düzenekleri hariç).
  • ikon_izgarasi, piramit, venn ve terazi şablonlarının her birini bir derste EN FAZLA BİR KEZ kullan; akis_semasi en fazla iki sahnede olsun.
  • Sahnelerin en az yarısında illustrasyon bulunsun; sözel derslerde de (tarihî olayın mekânı, şiirin imgesi, hikâyenin karakterleri, felsefi düşünce deneyinin sahnesi).
  • Bir illüstrasyonu başka sahnede renk veya etiket değiştirerek tekrar etme; her illüstrasyonun nesneleri ve kompozisyonu farklı olsun.
- Soyutu somutlaştır: karşıtlık için terazi, hiyerarşi için piramit, ortak/farklı özellikler için venn, dönemler için zaman_cizelgesi, kıyas için tablo; ama konu somut bir şeyse önce onu illustrasyon ile resmet.
- İllüstrasyon örneği (fotosentez; aynı "il1" kimliğiyle katman katman):
  v2 yaprak ve güneş → {"tip":"illustrasyon","gorsel":"il1","svg":"<svg viewBox='0 0 800 460'><line x1='60' y1='400' x2='740' y2='400' stroke='#1e1e1e' stroke-width='2'/><circle cx='130' cy='110' r='46' fill='#fff3bf' stroke='#f08c00' stroke-width='3'/><path d='M320 390 Q380 150 600 170 Q590 360 320 390 Z' fill='#ebfbee' stroke='#2f9e44' stroke-width='3'/><path d='M320 390 L570 200' stroke='#2f9e44' stroke-width='2'/><text x='470' y='430' text-anchor='middle' font-size='22' fill='#2f9e44'>Yaprak</text><text x='130' y='190' text-anchor='middle' font-size='20' fill='#f08c00'>Güneş</text></svg>"}
  v3 ışık ve su → {"tip":"illustrasyon","gorsel":"il1","svg":"<svg viewBox='0 0 800 460'><defs><marker id='ok' viewBox='0 0 10 10' refX='8' refY='5' markerWidth='6' markerHeight='6' orient='auto-start-reverse'><path d='M0 1 L10 5 L0 9 z' fill='#f08c00'/></marker></defs><g data-anim='akis'><path d='M175 140 L390 260' stroke='#f08c00' stroke-width='3' stroke-dasharray='10 8' marker-end='url(#ok)'/></g><text x='250' y='170' font-size='20' fill='#f08c00'>Işık enerjisi</text><path d='M250 400 L360 340' stroke='#1971c2' stroke-width='3' marker-end='url(#ok)'/><text x='170' y='380' font-size='20' fill='#1971c2'>H₂O</text></svg>"}
  v4 gaz alışverişi → {"tip":"illustrasyon","gorsel":"il1","svg":"<svg viewBox='0 0 800 460'><defs><marker id='ok' viewBox='0 0 10 10' refX='8' refY='5' markerWidth='6' markerHeight='6' orient='auto-start-reverse'><path d='M0 1 L10 5 L0 9 z' fill='#1e1e1e'/></marker></defs><path d='M720 110 L590 190' stroke='#1e1e1e' stroke-width='3' marker-end='url(#ok)'/><text x='680' y='90' font-size='20'>CO₂ girer</text><path d='M600 280 L720 330' stroke='#2f9e44' stroke-width='3' marker-end='url(#ok)'/><text x='640' y='370' font-size='20' fill='#2f9e44'>O₂ çıkar</text></svg>"}`;

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
- Sahne başlığını uygulama OTOMATİK yazar: sadece başlığın tanıtıldığı vuruşta başlık tahtanın ortasına büyük yazılır, ilk çizim gelince başlık yukarı kayar. Bu yüzden başlığı formul_ve_not veya başka blokların içinde ASLA tekrar yazma. Sahnenin ilk vuruşu konuyu tanıtıyorsa "aksiyonlar": [] bırak.
- Yerleşim düzenini bloklar otomatik sağlar; farklı bloklar arasında renk kodlamasını tutarlı tut: yeni terim/tanım "baslik", formül "formul", dikkat/tuzak/sık hata "vurgu", sonuç/cevap "sonuc", ara adımlar "normal". Aynı kavram ders boyunca hep aynı renkte kalsın.
- Bir vuruşta tek fikir: bir formül satırı, bir düğüm/bağlantı, bir olay kartı, bir kuvvet oku veya bir değerin yerine konması. Çözümü satır satır, her satırda tek işlem yaparak yaz; ara adımı atlama.
- İlişkileri akis_semasi, kıyasları tablo, evre/tarihleri zaman_cizelgesi, geometrik şekilleri geometri, fen düzenekleri ve metaforları hazir_sahne ile kur; konunun kendisini (nesne, mekân, olay, canlı, kişi) illustrasyon ile resmet.
- Önemli yere dönerken "vurgula" aksiyonunu kullan; sonucu "sonuc" renginde ve altı çizili yaz.
- Tahtanın sınırları vardır: bir formul_ve_not bloğunda en fazla 6 satır olsun, notlar kısa (en fazla ~12 kelime) tutulsun; fazlası için yeni sahneye geç.`;

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

const ILLUSTRASYON_TALIMATI = `Sen ders kitaplarına ve beyaz tahtaya çizim yapan usta bir eğitim illüstratörüsün. Bir öğretmenin hazır ders anlatımındaki bazı sahnelerin tahta çizimleri birbirini tekrar ediyor (hep aynı ikon ızgarası/kavram şeması). Her sahne için O SAHNENİN konusunu resmeden, sahneye özel bir illüstrasyon çiz.
Her sahne için öğretmenin vuruş vuruş söylediği sözler verilir. İllüstrasyonu bu sözlerle eş zamanlı, KATMAN KATMAN kur:
- Her katman bir vuruşa bağlanır ("vurus": vuruş id) ve o vuruşta söylenen şeyi gösterir; her katman yalnızca YENİ parçaları içerir, önceki katmanların üstüne çizilir. Önceki katmanları tekrar gönderme.
- Konuyu tanıtan ilk vuruşu atla. İlk katman (genelde 2. vuruş) zemini ve ana nesneyi/mekânı kurar; sonraki katmanlar etiket, ok, detay, karakter, konuşma balonu veya hareket ekler. Bir sahnede 3-6 katman olsun.
- Söylenmeyen şeyi çizme; öğretmen "bak", "burada" diyorsa o anda ilgili parça çizilmiş olsun.
- Somut ve tanınır çiz: konunun gerçek nesnelerini, mekânlarını, canlılarını, olaylarını ve kişilerini basit ama gerçekçi siluetlerle resmet (ör. ordu çadırları ve tepeler, gemi ve liman, yaprak ve güneş, volkan kesiti, fabrika, köy evi, kalp odacıkları). Kutu-ok kavram şeması, ikon ızgarası veya tablo ÇİZME.
- Her sahnenin kompozisyonu, nesneleri ve renk vurgusu diğer sahnelerden FARKLI olsun.
- Tahtanın sağında öğretmenin formül/not alanı olabilir; illüstrasyon kendi alanını doldurur, sahne başlığını tekrar yazma.
- Peygamberleri, sahabeleri ve kutsal kişileri ASLA insan figürü, yüz veya çöp adam olarak çizme.
YAZI: <text> içine düz metin yaz; LaTeX, $ veya ^{ } yazma, Unicode kullan (x², H₂O, 30°, →).
${SVG_KURALLARI}
Her sahne için "sira" alanına o sahnenin başlığında verilen sira değerini AYNEN yaz ve sahneleri verilen sırayla döndür.
YALNIZCA şu JSON'u döndür:
{"cizimler":[{"sira":3,"katmanlar":[{"vurus":"v2","svg":"<svg viewBox='0 0 800 460'>...</svg>"}]}]}`;

const OZEL_CIZIM_TALIMATI = `${OGRETMEN_KIMLIGI} Öğrenci tahtaya özel bir çizim yapmanı istiyor ve ne çizmeni istediğini tarif ediyor. O tarifi, konuşurken eş zamanlı çizdiğin sahneye özel, yaratıcı bir illüstrasyonla resmet ve kısaca anlat.
- 4-7 vuruş üret. İlk vuruşta ne çizeceğini bir cümleyle söyle (aksiyonsuz olabilir). Sonraki HER vuruşta aynı "il1" bloğuna YENİ bir katman ekle: önce zemin/mekân ve ana nesne, sonra parçalar, etiketler, oklar, karakterler, konuşma balonları veya hareket. Her katman yalnızca yeni parçaları içerir; önceki katmanları tekrar gönderme.
- Sözlerde "çiziyorum, ekliyorum" diye kendi eylemini anlatma; çizilen şeyin ne olduğunu ve neden önemli olduğunu öğretici biçimde açıkla.
- Söylediğin şey o anda çizilmiş olsun. Somut, tanınır ve konuya özgü çiz; kutu-ok kavram şeması, ikon ızgarası veya tablo ÇİZME. Kompozisyonu tarife göre kur (manzara, kesit, olay anı, düzenek, karakterler).
- İstersen son vuruşlarda tek bir {"tip":"formul_ve_not","gorsel":"f1","satirlar":[{"metin":"...","renk":"vurgu"}]} ile 1-3 kısa not ekle.
- Tarif bir ders konusuyla ilgisizse bile kibarca ve öğretici biçimde çiz; uygunsuz, şiddet içeren veya müstehcen bir istek gelirse çizme ve kibarca reddet.
- Peygamberleri, sahabeleri ve kutsal kişileri ASLA insan figürü, yüz veya çöp adam olarak çizme.
YAZI: <text> içine düz metin yaz; LaTeX, $ veya ^{ } yazma, Unicode kullan (x², H₂O, 30°, →).
Aksiyon biçimi: {"tip":"illustrasyon","gorsel":"il1","svg":"<svg viewBox='0 0 800 460'>...</svg>"}
${SVG_KURALLARI}
"vuruslar" dizisinde EN AZ 4, EN FAZLA 7 vuruş olmalı; tek vuruşluk yanıt GEÇERSİZDİR. Her svg yalnızca o vuruşun yeni parçalarını içeren tam bir <svg viewBox='0 0 800 460'> belgesidir.
YALNIZCA şu yapıda JSON döndür (… yerine gerçek içerik):
{"aciklama":"…","vuruslar":[{"id":"v1","soz":"…","aksiyonlar":[]},{"id":"v2","soz":"…","aksiyonlar":[{"tip":"illustrasyon","gorsel":"il1","svg":"<svg viewBox='0 0 800 460'>…</svg>"}]},{"id":"v3","soz":"…","aksiyonlar":[{"tip":"illustrasyon","gorsel":"il1","svg":"<svg viewBox='0 0 800 460'>…</svg>"}]},{"id":"v4","soz":"…","aksiyonlar":[{"tip":"illustrasyon","gorsel":"il1","svg":"<svg viewBox='0 0 800 460'>…</svg>"}]},{"id":"v5","soz":"…","aksiyonlar":[{"tip":"formul_ve_not","gorsel":"f1","satirlar":[{"metin":"…","renk":"vurgu"}]}]}]}`;

const MIN_OZEL_CIZIM_VURUSU = 3;

const TEST_TALIMATI = `Sen bir Türk öğretmensin. Verilen ünite metninden öğrencinin anlayıp anlamadığını ölçen TAM 3 adet çoktan seçmeli soru hazırla.
Her sorunun 4 seçeneği olsun, yalnızca biri doğru olsun. Sorular ezber değil kavrama ölçsün.
Tüm metinler düz yazı olsun: LaTeX, $ veya ters bölü komutu kullanma; üs, kök ve semboller için Unicode yaz (x², √2, π, ≤, 30°).
YALNIZCA şu JSON'u döndür:
{"sorular":[{"soru":"...","secenekler":["A","B","C","D"],"dogruIndex":0,"aciklama":"Doğru cevabın kısa gerekçesi"}]}`;

const RENK_ANAHTARLARI = new Set(["baslik", "başlık", "formul", "formül", "vurgu", "sonuc", "sonuç", "normal"]);
const RENK_ESLESME: Record<string, string> = {
  başlık: "baslik",
  formül: "formul",
  sonuç: "sonuc",
};

const BOLGELER = new Set<Bolge>(["marmara", "ege", "akdeniz", "ic-anadolu", "karadeniz", "dogu-anadolu", "guneydogu-anadolu"]);

const NOKTA_KONUMLARI = new Set<NonNullable<GeometriNokta["konum"]>>(["ust", "alt", "sol", "sag", "otomatik"]);
const DOGRU_TURLERI = new Set<NonNullable<GeometriDogru["tur"]>>(["dogru_parcasi", "dogru", "isin"]);
const AKIS_SEKILLERI = new Set<AkisDugumSekli>(["kutu", "yuvarlak", "oval", "elmas", "daire", "paralelkenar"]);
const ZAMAN_YONLERI = new Set<ZamanCizelgesiYon>(["yatay", "dikey"]);
const EGIK_YONLERI = new Set<EgikDuzlemKuvvet["yon"]>(["yukari", "asagi", "normal", "yatay", "agirlik", "surtunme"]);
const HAREKET_YONLERI = new Set<NonNullable<EgikDuzlemSablonu["hareket"]>>(["yukari", "asagi", "durgun"]);
const DEVRE_DUZENLERI = new Set<NonNullable<ElektrikDevresiSablonu["duzen"]>>(["seri", "paralel", "karisik"]);
const DEVRE_ELEMANLARI = new Set<ElektrikDevresiEleman["tur"]>([
  "direnc",
  "ampul",
  "anahtar",
  "ampermetre",
  "voltmetre",
  "kondansator",
  "pil",
]);
const OPTIK_TURLERI = new Set<OptikDuzenekSablonu["tur"]>([
  "cukur_ayna",
  "tumsek_ayna",
  "duz_ayna",
  "ince_mercek",
  "kalin_mercek",
]);
const OPTIK_KONUMLAR = new Set<Exclude<NonNullable<OptikDuzenekSablonu["cisim"]>["konum"], number>>([
  "merkez_disi",
  "merkezde",
  "odak_merkez_arasi",
  "odakta",
  "odak_ayna_arasi",
]);
const KUVVET_SEKILLERI = new Set<NonNullable<NonNullable<KuvvetDengesiSablonu["cisim"]>["sekil"]>>(["kutu", "daire", "nokta"]);
const KUVVET_ZEMINLERI = new Set<NonNullable<KuvvetDengesiSablonu["zemin"]>>(["yatay", "yok", "ip"]);
const KAPLAR = new Set<NonNullable<TepkimeKabiSablonu["kap"]>>(["beher", "erlen", "tup", "iki_kap"]);
const FAZLAR = new Set<NonNullable<TepkimeKabiTanecik["faz"]>>(["kati", "sivi", "gaz"]);
const HUCRE_TURLERI = new Set<HucreKesitiSablonu["tur"]>(["hayvan", "bitki", "prokaryot"]);
const TERAZI_DENGELERI = new Set<NonNullable<TeraziSablonu["denge"]>>(["esit", "sol_agir", "sag_agir"]);
const PIRAMIT_YONLERI = new Set<NonNullable<PiramitSablonu["yon"]>>(["ustten_alta", "alttan_uste"]);

const asciiKucuk = (s: string) =>
  s
    .trim()
    .toLocaleLowerCase("tr")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");

const sayi = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : undefined);
const sinirlaSayi = (v: unknown, min: number, max: number) => {
  const n = sayi(v);
  return n !== undefined ? Math.max(min, Math.min(max, n)) : undefined;
};
const tamSayi = (v: unknown, min: number, max: number) => {
  const n = sayi(v);
  return n !== undefined ? Math.max(min, Math.min(max, Math.round(n))) : undefined;
};
const birUc = (v: unknown): 1 | 2 | 3 | undefined => {
  const n = sayi(v);
  if (n === undefined) return undefined;
  const r = Math.round(n);
  return r === 1 || r === 2 || r === 3 ? r : undefined;
};
const bool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);
const yazi = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const duz = (v: unknown, max: number) => {
  const y = yazi(v, max);
  return y ? duzYaziyaCevir(y) || undefined : undefined;
};
const metin = (v: unknown, max: number) => {
  if (typeof v === "number" && Number.isFinite(v)) return String(v).slice(0, max);
  return duz(v, max);
};
const secenek = <T extends string>(v: unknown, izinli: ReadonlySet<T>): T | undefined => {
  const r = yazi(v, 50);
  if (!r) return undefined;
  if (izinli.has(r as T)) return r as T;
  const n = asciiKucuk(r);
  return izinli.has(n as T) ? (n as T) : undefined;
};
const renk = (v: unknown) => {
  const r = yazi(v, 30);
  if (!r) return undefined;
  const n = RENK_ESLESME[r.toLocaleLowerCase("tr")] ?? r;
  return /^(#[0-9a-f]{3,8}|[a-z]{3,20}|rgba?\([\d\s.,%]+\))$/i.test(n) ? n : undefined;
};
const ikonAdi = (v: unknown) => {
  const ham = yazi(v, 40);
  if (!ham) return undefined;
  const temiz = asciiKucuk(ham).replace(/[^a-z0-9_-]/g, "");
  return temiz || undefined;
};
const plaka = (v: unknown) => {
  const n = sayi(v);
  return n !== undefined && Number.isInteger(n) && n >= 1 && n <= 81 ? n : undefined;
};
const nesne = (v: unknown): Record<string, unknown> | undefined =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
const dizi = <T,>(v: unknown, max: number, f: (x: Record<string, unknown>) => T | undefined): T[] =>
  Array.isArray(v)
    ? v
        .slice(0, max * 3)
        .flatMap((x) => {
          const obj = nesne(x);
          return obj ? [f(obj)] : [];
        })
        .filter((x): x is T => x !== undefined)
        .slice(0, max)
    : [];
const optDizi = <T,>(arr: T[]): T[] | undefined => (arr.length ? arr : undefined);
const yaziDizisi = (v: unknown, maxOge: number, maxUzunluk: number) => {
  if (!Array.isArray(v)) return undefined;
  const temiz = v
    .slice(0, maxOge * 2)
    .map((x) => metin(x, maxUzunluk))
    .filter((x): x is string => Boolean(x))
    .slice(0, maxOge);
  return temiz.length ? temiz : undefined;
};
const aralik = (v: unknown): [number, number] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const a = sayi(v[0]);
  const b = sayi(v[1]);
  return a !== undefined && b !== undefined && b > a && b - a < 1e6 ? [a, b] : undefined;
};

const SVG_IC_ID = /^#[a-zA-Z_][\w:-]*$/;
const SVG_MARKER_URL = /^url\(\s*(#[a-zA-Z_][\w:-]*)\s*\)$/;

function svgTemizle(ham: unknown) {
  if (typeof ham !== "string" || !/<svg[\s>]/i.test(ham)) return undefined;
  let s = ham.slice(0, 30_000);
  for (let tur = 0; tur < 5; tur++) {
    const onceki = s;
    s = s
      .replace(/<\s*(script|style|foreignObject|image|iframe|object|embed)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
      .replace(/<\s*\/?\s*(script|style|foreignObject|image|iframe|object|embed)\b[^>]*>/gi, "");
    if (s === onceki) break;
  }
  return s
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(?:xlink:)?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi, (tam, d, t, y) => {
      const val = String(d ?? t ?? y ?? "").trim();
      return SVG_IC_ID.test(val) ? tam : "";
    })
    .replace(/\s+marker-(?:end|start|mid)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi, (tam, d, t, y) => {
      const val = String(d ?? t ?? y ?? "").trim();
      return SVG_MARKER_URL.test(val) ? tam : "";
    })
    .replace(/\s+style\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi, (tam, d, t, y) => {
      const val = String(d ?? t ?? y ?? "");
      return /url\s*\(|expression\s*\(|javascript:/i.test(val) ? "" : tam;
    });
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

function geometriTemizle(h: Record<string, unknown>, gorsel: string): GeometriAksiyonu | undefined {
  const noktaAdi = (v: unknown) => duz(v, 16);
  const noktalar = dizi<GeometriNokta>(h.noktalar, 24, (x) => {
    const ad = noktaAdi(x.ad);
    const nx = sinirlaSayi(x.x, -10_000, 10_000);
    const ny = sinirlaSayi(x.y, -10_000, 10_000);
    return ad && nx !== undefined && ny !== undefined
      ? {
          ad,
          x: nx,
          y: ny,
          etiket: metin(x.etiket, 30),
          renk: renk(x.renk),
          gizli: bool(x.gizli),
          konum: secenek(x.konum, NOKTA_KONUMLARI),
        }
      : undefined;
  });
  const dogrular = dizi<GeometriDogru>(h.dogrular, 32, (x) => {
    const a = noktaAdi(x.a);
    const b = noktaAdi(x.b);
    return a && b && a !== b
      ? {
          a,
          b,
          etiket: metin(x.etiket, 30),
          tur: secenek(x.tur, DOGRU_TURLERI),
          kesikli: bool(x.kesikli),
          renk: renk(x.renk),
          kalinlik: sinirlaSayi(x.kalinlik, 0.5, 8),
          esitlik: birUc(x.esitlik),
        }
      : undefined;
  });
  const cemberler = dizi<GeometriCember>(h.cemberler, 10, (x) => {
    const merkez = noktaAdi(x.merkez);
    const r = sinirlaSayi(x.r, 0.01, 10_000);
    return merkez && r !== undefined
      ? {
          merkez,
          r,
          renk: renk(x.renk),
          dolgu: renk(x.dolgu),
          kesikli: bool(x.kesikli),
          etiket: metin(x.etiket, 30),
          baslangicAci: sinirlaSayi(x.baslangicAci, -720, 720),
          bitisAci: sinirlaSayi(x.bitisAci, -720, 720),
        }
      : undefined;
  });
  const acilar = dizi<GeometriAci>(h.acilar, 16, (x) => {
    const a = noktaAdi(x.a);
    const kose = noktaAdi(x.kose);
    const c = noktaAdi(x.c);
    return a && kose && c && a !== kose && c !== kose
      ? {
          a,
          kose,
          c,
          dik: bool(x.dik),
          etiket: metin(x.etiket, 24),
          renk: renk(x.renk),
          yaySayisi: birUc(x.yaySayisi),
          yaricap: sinirlaSayi(x.yaricap, 0.1, 500),
        }
      : undefined;
  });
  const yukseklikler = dizi<GeometriYukseklik>(h.yukseklikler, 8, (x) => {
    const tepe = noktaAdi(x.tepe);
    const tabanA = noktaAdi(x.tabanA);
    const tabanB = noktaAdi(x.tabanB);
    return tepe && tabanA && tabanB
      ? {
          tepe,
          tabanA,
          tabanB,
          ayak: noktaAdi(x.ayak),
          etiket: metin(x.etiket, 30),
          dikIsareti: bool(x.dikIsareti),
          kesikli: bool(x.kesikli),
          renk: renk(x.renk),
        }
      : undefined;
  });
  const etiketler = dizi<GeometriEtiket>(h.etiketler, 20, (x) => {
    const m = metin(x.metin, 60);
    const nx = sinirlaSayi(x.x, -10_000, 10_000);
    const ny = sinirlaSayi(x.y, -10_000, 10_000);
    return m && nx !== undefined && ny !== undefined
      ? { metin: m, x: nx, y: ny, renk: renk(x.renk), boyut: sinirlaSayi(x.boyut, 10, 40) }
      : undefined;
  });
  const cokgenler = dizi<GeometriCokgen>(h.cokgenler, 8, (x) => {
    const liste = Array.isArray(x.noktalar)
      ? x.noktalar
          .slice(0, 20)
          .map(noktaAdi)
          .filter((n): n is string => Boolean(n))
          .slice(0, 16)
      : [];
    return liste.length >= 3 ? { noktalar: liste, dolgu: renk(x.dolgu), renk: renk(x.renk), etiket: metin(x.etiket, 40) } : undefined;
  });
  const koordinatGoster = bool(h.koordinatGoster);
  const ogeSayisi =
    noktalar.length + dogrular.length + cemberler.length + acilar.length + yukseklikler.length + etiketler.length + cokgenler.length;
  if (ogeSayisi === 0 && koordinatGoster !== true) return undefined;
  return {
    tip: "geometri",
    gorsel,
    noktalar: optDizi(noktalar),
    dogrular: optDizi(dogrular),
    cemberler: optDizi(cemberler),
    acilar: optDizi(acilar),
    yukseklikler: optDizi(yukseklikler),
    etiketler: optDizi(etiketler),
    cokgenler: optDizi(cokgenler),
    koordinatGoster,
  };
}

function akisSemasiTemizle(h: Record<string, unknown>, gorsel: string): AkisSemasiAksiyonu | undefined {
  const hamYon = asciiKucuk(yazi(h.yon, 20) ?? "");
  const yon: AkisYon | undefined =
    hamYon === "tb" || hamYon === "dikey" ? "TB" : hamYon === "lr" || hamYon === "yatay" ? "LR" : undefined;
  const dugumler = dizi<AkisDugum>(h.dugumler, 24, (x) => {
    const id = yazi(x.id, 32);
    const etiket = metin(x.etiket, 80);
    return id && etiket
      ? {
          id,
          etiket,
          altEtiket: metin(x.altEtiket, 100),
          sekil: secenek(x.sekil, AKIS_SEKILLERI),
          ikon: ikonAdi(x.ikon),
          renk: renk(x.renk),
          dolgu: renk(x.dolgu),
          grup: yazi(x.grup, 32),
        }
      : undefined;
  });
  const baglantilar = dizi<AkisBaglantisi>(h.baglantilar, 40, (x) => {
    const kaynak = yazi(x.kaynak, 32);
    const hedef = yazi(x.hedef, 32);
    return kaynak && hedef
      ? {
          kaynak,
          hedef,
          etiket: metin(x.etiket, 50),
          kesikli: bool(x.kesikli),
          ciftYon: bool(x.ciftYon),
          akis: bool(x.akis),
          renk: renk(x.renk),
        }
      : undefined;
  });
  const gruplar = dizi<AkisGrubu>(h.gruplar, 8, (x) => {
    const id = yazi(x.id, 32);
    const baslik = metin(x.baslik, 60);
    if (!id || !baslik) return undefined;
    const gDugumler = Array.isArray(x.dugumler)
      ? x.dugumler
          .slice(0, 30)
          .map((d) => yazi(d, 32))
          .filter((d): d is string => Boolean(d))
          .slice(0, 24)
      : [];
    return {
      id,
      baslik,
      renk: renk(x.renk),
      dolgu: renk(x.dolgu),
      dugumler: optDizi(gDugumler),
    };
  });
  if (dugumler.length + baglantilar.length + gruplar.length === 0) return undefined;
  return {
    tip: "akis_semasi",
    gorsel,
    yon,
    dugumler: optDizi(dugumler),
    baglantilar: optDizi(baglantilar),
    gruplar: optDizi(gruplar),
  };
}

function zamanCizelgesiTemizle(h: Record<string, unknown>, gorsel: string): ZamanCizelgesiAksiyonu | undefined {
  const olaylar = dizi<ZamanOlayi>(h.olaylar, 16, (x) => {
    const tarih = metin(x.tarih, 40);
    const baslik = metin(x.baslik, 80);
    return tarih && baslik
      ? {
          tarih,
          baslik,
          aciklama: metin(x.aciklama, 160),
          ikon: ikonAdi(x.ikon),
          renk: renk(x.renk),
          vurgulu: bool(x.vurgulu),
          aralik: metin(x.aralik, 40),
        }
      : undefined;
  });
  if (olaylar.length === 0) return undefined;
  return {
    tip: "zaman_cizelgesi",
    gorsel,
    baslik: metin(h.baslik, 80),
    yon: secenek(h.yon, ZAMAN_YONLERI),
    olaylar,
  };
}

function tabloTemizle(h: Record<string, unknown>, gorsel: string): TabloAksiyonu | undefined {
  const basliklar = yaziDizisi(h.basliklar, 8, 60);
  const satirlarRaw = Array.isArray(h.satirlar)
    ? h.satirlar
        .slice(0, 16)
        .filter((r): r is unknown[] => Array.isArray(r))
        .map((r) => r.slice(0, 8).map((hucre) => metin(hucre, 140) ?? ""))
        .filter((r) => r.length > 0)
    : [];
  const satirlar = optDizi(satirlarRaw);
  const vurgular = dizi<TabloVurgusu>(h.vurgular, 16, (x) => {
    const satir = x.satir !== undefined ? tamSayi(x.satir, 0, 15) : undefined;
    const sutun = x.sutun !== undefined ? tamSayi(x.sutun, 0, 7) : undefined;
    const not = metin(x.not, 80);
    const r = renk(x.renk);
    return satir !== undefined || sutun !== undefined || not !== undefined || r !== undefined
      ? { satir, sutun, renk: r, not }
      : undefined;
  });
  const sutunRenkleriRaw = Array.isArray(h.sutunRenkleri) ? h.sutunRenkleri.slice(0, 8).map((c) => renk(c) ?? "") : [];
  const sutunRenkleri = sutunRenkleriRaw.some(Boolean) ? sutunRenkleriRaw : undefined;
  if (!basliklar?.length && !satirlar?.length && vurgular.length === 0) return undefined;
  return {
    tip: "tablo",
    gorsel,
    baslik: metin(h.baslik, 80),
    basliklar,
    satirlar,
    vurgular: optDizi(vurgular),
    sutunRenkleri,
  };
}

const tanecikListesi = (v: unknown) =>
  dizi<TepkimeKabiTanecik>(v, 12, (x) => {
    const etiket = metin(x.etiket, 24);
    return etiket
      ? {
          etiket,
          sayi: x.sayi !== undefined ? tamSayi(x.sayi, 1, 30) : undefined,
          renk: renk(x.renk),
          faz: secenek(x.faz, FAZLAR),
        }
      : undefined;
  });

const kefeTemizle = (v: unknown): TeraziKefe | undefined => {
  const k = nesne(v);
  if (!k) return undefined;
  const maddeler = yaziDizisi(k.maddeler, 6, 40);
  const agirlik = sinirlaSayi(k.agirlik, 0, 10_000);
  const baslik = metin(k.baslik, 50) ?? (maddeler?.length || agirlik !== undefined ? "" : undefined);
  if (baslik === undefined) return undefined;
  return { baslik, maddeler, agirlik, renk: renk(k.renk) };
};

function hazirSahneTemizle(h: Record<string, unknown>, gorsel: string): HazirSahneAksiyonu | undefined {
  const sablon = asciiKucuk(yazi(h.sablon, 40) ?? "");
  switch (sablon) {
    case "egik_duzlem": {
      const kuvvetler = dizi<EgikDuzlemKuvvet>(h.kuvvetler, 8, (x) => {
        const yon = secenek(x.yon, EGIK_YONLERI);
        const etiket = metin(x.etiket, 30);
        return yon && etiket ? { yon, etiket, renk: renk(x.renk) } : undefined;
      });
      const surtunme = typeof h.surtunme === "boolean" ? h.surtunme : metin(h.surtunme, 30);
      return {
        tip: "hazir_sahne",
        gorsel,
        sablon: "egik_duzlem",
        aci: sinirlaSayi(h.aci, 5, 80),
        aciEtiketi: metin(h.aciEtiketi, 24),
        cisimEtiketi: metin(h.cisimEtiketi, 30),
        kuvvetler: optDizi(kuvvetler),
        surtunme,
        hareket: secenek(h.hareket, HAREKET_YONLERI),
        yukseklikEtiketi: metin(h.yukseklikEtiketi, 24),
        uzunlukEtiketi: metin(h.uzunlukEtiketi, 24),
      };
    }
    case "elektrik_devresi": {
      const elemanlar = dizi<ElektrikDevresiEleman>(h.elemanlar, 12, (x) => {
        const tur = secenek(x.tur, DEVRE_ELEMANLARI);
        return tur
          ? {
              tur,
              etiket: metin(x.etiket, 24),
              deger: metin(x.deger, 24),
              kapali: bool(x.kapali),
              kol: x.kol !== undefined ? tamSayi(x.kol, 0, 6) : undefined,
              renk: renk(x.renk),
            }
          : undefined;
      });
      const k = nesne(h.kaynak);
      const kaynak =
        k && (metin(k.gerilim, 24) || metin(k.etiket, 24))
          ? { gerilim: metin(k.gerilim, 24), etiket: metin(k.etiket, 24) }
          : undefined;
      const duzen = secenek(h.duzen, DEVRE_DUZENLERI);
      const akimYonu =
        typeof h.akimYonu === "boolean"
          ? h.akimYonu
          : secenek(h.akimYonu, new Set(["saat", "ters"] as const));
      const akimEtiketi = metin(h.akimEtiketi, 24);
      if (elemanlar.length === 0 && !kaynak && akimYonu === undefined && akimEtiketi === undefined && duzen === undefined) {
        return undefined;
      }
      return {
        tip: "hazir_sahne",
        gorsel,
        sablon: "elektrik_devresi",
        duzen,
        kaynak,
        elemanlar,
        akimYonu,
        akimEtiketi,
      };
    }
    case "optik_duzenek": {
      const tur = secenek(h.tur, OPTIK_TURLERI);
      if (!tur) return undefined;
      const c = nesne(h.cisim);
      let cisim: OptikDuzenekSablonu["cisim"];
      if (c) {
        const konum = secenek(c.konum, OPTIK_KONUMLAR) ?? sinirlaSayi(c.konum, -500, 500);
        const boy = sinirlaSayi(c.boy, 0.2, 500);
        const etiket = metin(c.etiket, 24);
        if (konum !== undefined || boy !== undefined || etiket !== undefined) {
          cisim = { konum: konum ?? "merkez_disi", boy, etiket };
        }
      }
      const g = nesne(h.goruntu);
      const goruntu =
        g && (bool(g.goster) !== undefined || metin(g.etiket, 24) !== undefined)
          ? { goster: bool(g.goster), etiket: metin(g.etiket, 24) }
          : undefined;
      return {
        tip: "hazir_sahne",
        gorsel,
        sablon: "optik_duzenek",
        tur,
        odakEtiketi: metin(h.odakEtiketi, 20),
        merkezEtiketi: metin(h.merkezEtiketi, 20),
        cisim,
        goruntu,
        isinlar: bool(h.isinlar),
      };
    }
    case "kuvvet_dengesi": {
      const kuvvetler = dizi<KuvvetDengesiKuvvet>(h.kuvvetler, 12, (x) => {
        const etiket = metin(x.etiket, 30);
        const aci = sinirlaSayi(x.aci, -360, 360);
        return etiket && aci !== undefined
          ? { etiket, aci, buyukluk: sinirlaSayi(x.buyukluk, 0.1, 1000), renk: renk(x.renk) }
          : undefined;
      });
      const c = nesne(h.cisim);
      const cisim =
        c && (secenek(c.sekil, KUVVET_SEKILLERI) || metin(c.etiket, 30) || renk(c.dolgu))
          ? { sekil: secenek(c.sekil, KUVVET_SEKILLERI), etiket: metin(c.etiket, 30), dolgu: renk(c.dolgu) }
          : undefined;
      const zemin = secenek(h.zemin, KUVVET_ZEMINLERI);
      const b = nesne(h.bileske);
      const bileske =
        b && (metin(b.etiket, 30) !== undefined || bool(b.goster) !== undefined)
          ? { etiket: metin(b.etiket, 30), goster: bool(b.goster) }
          : undefined;
      if (kuvvetler.length === 0 && !cisim && !bileske && !zemin) return undefined;
      return {
        tip: "hazir_sahne",
        gorsel,
        sablon: "kuvvet_dengesi",
        cisim,
        zemin,
        kuvvetler,
        bileske,
      };
    }
    case "atom_modeli": {
      const sembol = duz(h.sembol, 12);
      if (!sembol) return undefined;
      const katmanlar = Array.isArray(h.katmanlar)
        ? h.katmanlar
            .slice(0, 7)
            .map((k) => tamSayi(k, 1, 32))
            .filter((k): k is number => k !== undefined)
        : [];
      return {
        tip: "hazir_sahne",
        gorsel,
        sablon: "atom_modeli",
        sembol,
        ad: metin(h.ad, 40),
        proton: h.proton !== undefined ? tamSayi(h.proton, 0, 120) : undefined,
        notron: h.notron !== undefined ? tamSayi(h.notron, 0, 200) : undefined,
        katmanlar,
        yuk: duz(h.yuk, 12),
        animasyon: bool(h.animasyon),
      };
    }
    case "tepkime_kabi": {
      const tanecikler = tanecikListesi(h.tanecikler);
      const girenler = tanecikListesi(h.girenler);
      const urunler = tanecikListesi(h.urunler);
      if (tanecikler.length + girenler.length + urunler.length === 0) return undefined;
      return {
        tip: "hazir_sahne",
        gorsel,
        sablon: "tepkime_kabi",
        kap: secenek(h.kap, KAPLAR),
        baslik: metin(h.baslik, 60),
        tanecikler: optDizi(tanecikler),
        girenler: optDizi(girenler),
        urunler: optDizi(urunler),
        isi: bool(h.isi),
        piston: bool(h.piston),
        etiket: metin(h.etiket, 60),
      };
    }
    case "hucre_kesiti": {
      const tur = secenek(h.tur, HUCRE_TURLERI);
      if (!tur) return undefined;
      const organeller = dizi<HucreOrganeli>(h.organeller, 16, (x) => {
        const ad = metin(x.ad, 40);
        return ad
          ? {
              id: yazi(x.id, 32),
              ad,
              aciklama: metin(x.aciklama, 120),
              vurgulu: bool(x.vurgulu),
              renk: renk(x.renk),
            }
          : undefined;
      });
      return {
        tip: "hazir_sahne",
        gorsel,
        sablon: "hucre_kesiti",
        tur,
        baslik: metin(h.baslik, 60),
        organeller,
      };
    }
    case "terazi": {
      const sol = kefeTemizle(h.sol);
      const sag = kefeTemizle(h.sag);
      if (!sol || !sag) return undefined;
      return {
        tip: "hazir_sahne",
        gorsel,
        sablon: "terazi",
        baslik: metin(h.baslik, 60),
        sol,
        sag,
        denge: secenek(h.denge, TERAZI_DENGELERI),
        merkezEtiket: metin(h.merkezEtiket, 30),
      };
    }
    case "piramit": {
      const katmanlar = dizi<PiramitKatmani>(h.katmanlar, 8, (x) => {
        const baslik = metin(x.baslik, 50);
        return baslik
          ? {
              baslik,
              altMetin: metin(x.altMetin, 80),
              renk: renk(x.renk),
              vurgulu: bool(x.vurgulu),
            }
          : undefined;
      });
      if (katmanlar.length === 0) return undefined;
      return {
        tip: "hazir_sahne",
        gorsel,
        sablon: "piramit",
        baslik: metin(h.baslik, 60),
        yon: secenek(h.yon, PIRAMIT_YONLERI),
        katmanlar,
        yanEtiket: metin(h.yanEtiket, 40),
      };
    }
    case "venn": {
      const kumeler = dizi<VennKumesi>(h.kumeler, 4, (x) => {
        const ad = metin(x.ad, 40);
        return ad ? { ad, elemanlar: yaziDizisi(x.elemanlar, 12, 30), renk: renk(x.renk) } : undefined;
      });
      const kesisim = yaziDizisi(h.kesisim, 10, 30);
      const evrensel = metin(h.evrensel, 24);
      if (kumeler.length === 0 && !kesisim?.length && !evrensel) return undefined;
      return {
        tip: "hazir_sahne",
        gorsel,
        sablon: "venn",
        baslik: metin(h.baslik, 60),
        kumeler,
        kesisim,
        evrensel,
      };
    }
    case "ikon_izgarasi": {
      const ogeler = dizi<IkonIzgarasiOge>(h.ogeler, 12, (x) => {
        const ikon = ikonAdi(x.ikon);
        const baslik = metin(x.baslik, 50);
        return ikon && baslik
          ? {
              ikon,
              baslik,
              altMetin: metin(x.altMetin, 80),
              renk: renk(x.renk),
              vurgulu: bool(x.vurgulu),
            }
          : undefined;
      });
      if (ogeler.length === 0) return undefined;
      return {
        tip: "hazir_sahne",
        gorsel,
        sablon: "ikon_izgarasi",
        baslik: metin(h.baslik, 60),
        sutunSayisi: h.sutunSayisi !== undefined ? tamSayi(h.sutunSayisi, 1, 5) : undefined,
        ogeler,
      };
    }
    default:
      return undefined;
  }
}

const SABLON_ADLARI = new Set([
  "egik_duzlem",
  "elektrik_devresi",
  "optik_duzenek",
  "kuvvet_dengesi",
  "atom_modeli",
  "tepkime_kabi",
  "hucre_kesiti",
  "terazi",
  "piramit",
  "venn",
  "ikon_izgarasi",
]);

const TIP_ESLESME: Record<string, string> = {
  harita: "turkiye_haritasi",
  turkiye: "turkiye_haritasi",
  turkiye_harita: "turkiye_haritasi",
  grafik: "matematik_grafigi",
  fonksiyon_grafigi: "matematik_grafigi",
  matematik_grafik: "matematik_grafigi",
  geometrik_sekil: "geometri",
  geometri_cizimi: "geometri",
  akis: "akis_semasi",
  akis_diyagrami: "akis_semasi",
  kavram_haritasi: "akis_semasi",
  sema: "akis_semasi",
  zaman: "zaman_cizelgesi",
  zaman_cizgisi: "zaman_cizelgesi",
  kronoloji: "zaman_cizelgesi",
  karsilastirma_tablosu: "tablo",
  tablo_aksiyonu: "tablo",
  sablon: "hazir_sahne",
  hazir_sablon: "hazir_sahne",
  diyagram: "geometri_ve_diyagram",
  svg: "geometri_ve_diyagram",
  cizim: "geometri_ve_diyagram",
  illustrasyon: "geometri_ve_diyagram",
  illustration: "geometri_ve_diyagram",
  resim: "geometri_ve_diyagram",
  sahne_cizimi: "geometri_ve_diyagram",
  ozel_cizim: "geometri_ve_diyagram",
  formul: "formul_ve_not",
  not: "formul_ve_not",
  yazi: "formul_ve_not",
  metin: "formul_ve_not",
  formul_not: "formul_ve_not",
  vurgu: "vurgula",
};

const IC_ICE_ANAHTARLAR = ["veri", "parametreler", "params", "ozellikler", "data", "icerik", "ayarlar"] as const;

// Modelin farklı biçimde yazdığı aksiyonları (ör. "type", "tip":"egik_duzlem", parametrelerin "veri" içinde
// gelmesi) standart biçime çevirir; aksi hâlde bu aksiyonlar tamamen siliniyor ve tahta boş kalıyordu.
function aksiyonNormallestir(ham: Record<string, unknown>): Record<string, unknown> {
  let h: Record<string, unknown> = { ...ham };
  for (const anahtar of IC_ICE_ANAHTARLAR) {
    const ic = nesne(h[anahtar]);
    if (ic) h = { ...ic, ...h, [anahtar]: undefined };
  }
  const hamTip = yazi(h.tip ?? h.type ?? h.gorselTipi, 50);
  if (hamTip) {
    const n = asciiKucuk(hamTip).replace(/[\s-]+/g, "_");
    if (SABLON_ADLARI.has(n)) {
      h.tip = "hazir_sahne";
      if (!yazi(h.sablon, 40)) h.sablon = n;
    } else {
      h.tip = TIP_ESLESME[n] ?? n;
    }
  } else if (yazi(h.sablon, 40)) {
    h.tip = "hazir_sahne";
  } else if (typeof h.svg === "string") {
    h.tip = "geometri_ve_diyagram";
  } else if (yazi(h.latex, 600) || yazi(h.not, 160)) {
    h.tip = "formul_ve_not";
  }
  if (!yazi(h.gorsel, 30)) {
    const alternatif = yazi(h.blok ?? h.id ?? h.gorselId, 30);
    if (alternatif) h.gorsel = alternatif;
  }
  return h;
}

function aksiyonTemizle(ham: Record<string, unknown>): Aksiyon | undefined {
  const h = aksiyonNormallestir(ham);
  const gorsel = yazi(h.gorsel, 30) ?? (typeof h.tip === "string" ? `b_${h.tip}` : "b1");
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
    case "geometri":
      return geometriTemizle(h, gorsel);
    case "akis_semasi":
      return akisSemasiTemizle(h, gorsel);
    case "zaman_cizelgesi":
      return zamanCizelgesiTemizle(h, gorsel);
    case "tablo":
      return tabloTemizle(h, gorsel);
    case "hazir_sahne":
      return hazirSahneTemizle(h, gorsel);
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
      soz: sozTemizle(String(v.soz ?? v.konusmaMetni ?? v.metin ?? "")).slice(0, 400),
      aksiyonlar: dizi(hamAksiyonlar(v), 4, aksiyonTemizle),
    }))
    .filter((v) => v.soz || v.aksiyonlar.length)
    .slice(0, 16);
}

function hamAksiyonlar(v: Record<string, unknown>): unknown {
  for (const anahtar of ["aksiyonlar", "aksiyon", "cizimler", "cizim", "actions"]) {
    const deger = v[anahtar];
    if (Array.isArray(deger)) return deger;
    if (nesne(deger)) return [deger];
  }
  return [];
}

const ANA_GORSEL_TIPLERI = new Set<Aksiyon["tip"]>([
  "turkiye_haritasi",
  "matematik_grafigi",
  "geometri",
  "akis_semasi",
  "zaman_cizelgesi",
  "tablo",
  "hazir_sahne",
  "geometri_ve_diyagram",
]);
const YEDEK_NOT_GORSEL = "yedek_not";
const MAKS_NOT_SATIRI = 6;
const GIRIS_KALIBI =
  /^(?:bak|bakalım|dikkat et|dikkat|şimdi|peki|evet|harika|güzel|tamam|işte|öyleyse|o halde|hatırla|unutma|şuraya odaklan|fark ettin mi)[\s,!:.]+/iu;

// Sözden tahtaya yazılabilecek kısa bir anahtar ifade çıkarır.
function anahtarIfade(soz: string, maksKelime = 8) {
  const cumleler = soz.match(/[^.!?…]+[.!?…]*/g)?.map((c) => c.trim()).filter(Boolean) ?? [];
  const secilen =
    cumleler.find((c) => /(?:demektir|denir|eşittir|yani|çünkü|bu yüzden|sonuç olarak|olarak adlandır)/iu.test(c)) ??
    cumleler.find((c) => !c.endsWith("?")) ??
    cumleler[0];
  if (!secilen) return undefined;
  let temiz = secilen.replace(/[.!…]+$/, "").trim();
  for (let i = 0; i < 3; i++) temiz = temiz.replace(GIRIS_KALIBI, "").trim();
  const kelimeler = temiz.split(/\s+/).filter(Boolean);
  if (kelimeler.length < 2) return undefined;
  const kisa = kelimeler.slice(0, maksKelime).join(" ").replace(/[,;:—–]+$/, "");
  return buyukBasla(kelimeler.length > maksKelime ? `${kisa}…` : kisa);
}

// Model bazı sahnelerde hiç çizim üretmeyebiliyor ya da vuruşların çoğunu boş bırakabiliyor; bu durumda öğretmen
// boş tahtayı anlatıyordu. Konuşmadan türetilen bir kavram şeması / kısa notlarla tahtayı doldurur.
function bosTahtayiDoldur(vuruslar: Vurus[]): Vurus[] {
  if (vuruslar.length === 0) return vuruslar;
  const doluMu = (v: Vurus) => v.aksiyonlar.some((a) => a.tip !== "vurgula");
  const anaGorselVar = vuruslar.some((v) => v.aksiyonlar.some((a) => ANA_GORSEL_TIPLERI.has(a.tip)));
  const hedefDolu = Math.ceil((vuruslar.length * 2) / 3);
  let doluSayisi = vuruslar.filter(doluMu).length;
  if (anaGorselVar && doluSayisi >= hedefDolu) return vuruslar;

  const bosIndeksler = vuruslar
    .map((v, i) => (!doluMu(v) && (i > 0 || vuruslar.length === 1) ? i : -1))
    .filter((i) => i >= 0);

  if (!anaGorselVar) {
    const dugumIndeksleri = bosIndeksler.slice(0, 7);
    if (dugumIndeksleri.length === 0 && vuruslar[0] && !doluMu(vuruslar[0])) dugumIndeksleri.push(0);
    let onceki: string | undefined;
    const yon = dugumIndeksleri.length > 4 ? "LR" : "TB";
    return vuruslar.map((v, i) => {
      if (!dugumIndeksleri.includes(i)) return v;
      const etiket = anahtarIfade(v.soz, 7);
      if (!etiket) return v;
      const id = `n${i}`;
      const aksiyon: AkisSemasiAksiyonu = {
        tip: "akis_semasi",
        gorsel: YEDEK_SEMA_GORSEL,
        yon,
        dugumler: [{ id, etiket, sekil: onceki ? "kutu" : "yuvarlak", dolgu: onceki ? "#e7f5ff" : "#fff3bf" }],
        baglantilar: onceki ? [{ kaynak: onceki, hedef: id }] : undefined,
      };
      onceki = id;
      return { ...v, aksiyonlar: [...v.aksiyonlar, aksiyon] };
    });
  }

  const mevcutNot = vuruslar.reduce((t, v) => t + v.aksiyonlar.filter((a) => a.tip === "formul_ve_not").length, 0);
  let kalanNot = Math.max(0, MAKS_NOT_SATIRI - mevcutNot);
  const notGorseli =
    vuruslar.flatMap((v) => v.aksiyonlar).find((a) => a.tip === "formul_ve_not")?.gorsel ?? YEDEK_NOT_GORSEL;
  return vuruslar.map((v, i) => {
    if (kalanNot <= 0 || doluSayisi >= hedefDolu || !bosIndeksler.includes(i)) return v;
    const not = anahtarIfade(v.soz);
    if (!not) return v;
    kalanNot--;
    doluSayisi++;
    return { ...v, aksiyonlar: [...v.aksiyonlar, { tip: "formul_ve_not", gorsel: notGorseli, not, renk: "normal" }] };
  });
}

function vuruslariHazirla(vuruslar: Vurus[]): Vurus[] {
  return gorselKimlikleriniAyir(bosTahtayiDoldur(vuruslar));
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
      const vuruslar = vuruslariHazirla(baslikTekrariniAyikla(vuruslariTemizle(s.vuruslar), String(s.baslik ?? "")));
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
  | { mode: "test"; model?: string; ders?: string; baslik?: string; metin?: string }
  | { mode: "illustrasyon"; model?: string; seviye?: Seviye; ders?: string; uniteBaslik?: string; sahneler?: unknown }
  | { mode: "ozel_cizim"; model?: string; seviye?: Seviye; ders?: string; uniteBaslik?: string; tarif?: string };

const MAKS_KATMAN = 6;

function illustrasyonIstegiTemizle(ham: unknown): IllustrasyonIstegiSahnesi[] {
  if (!Array.isArray(ham)) return [];
  return ham
    .slice(0, ILLUSTRASYON_PAKETI)
    .flatMap((s): IllustrasyonIstegiSahnesi[] => {
      const x = nesne(s);
      const sira = x ? tamSayi(x.sira, 0, 200) : undefined;
      if (!x || sira === undefined || !Array.isArray(x.vuruslar)) return [];
      const vuruslar = x.vuruslar
        .slice(0, 16)
        .flatMap((v) => {
          const o = nesne(v);
          const id = o ? yazi(o.id, 30) : undefined;
          return o && id ? [{ id, soz: (yazi(o.soz, 400) ?? "").replace(/\s+/g, " ") }] : [];
        });
      return vuruslar.length ? [{ sira, baslik: yazi(x.baslik, 60) ?? "Sahne", vuruslar }] : [];
    });
}

function illustrasyonlariTemizle(ham: unknown, istek: IllustrasyonIstegiSahnesi[]): SahneIllustrasyonu[] {
  if (!Array.isArray(ham)) return [];
  const gecerli = new Map(istek.map((s) => [s.sira, new Set(s.vuruslar.map((v) => v.id))]));
  const sonuc = new Map<number, SahneIllustrasyonu>();
  for (const [i, c] of ham.entries()) {
    const x = nesne(c);
    const yazilan = x ? tamSayi(x.sira, 0, 200) : undefined;
    // Model "sira" değerini bazen 0'dan yeniden numaralandırıyor; eşleşmezse istek sırasına göre eşle.
    const sira = yazilan !== undefined && gecerli.has(yazilan) && !sonuc.has(yazilan) ? yazilan : istek[i]?.sira;
    const idler = sira !== undefined ? gecerli.get(sira) : undefined;
    if (!x || sira === undefined || !idler || sonuc.has(sira) || !Array.isArray(x.katmanlar)) continue;
    const kullanilan = new Set<string>();
    const katmanlar = x.katmanlar.flatMap((k) => {
      const o = nesne(k);
      const vurus = o ? yazi(o.vurus ?? o.id, 30) : undefined;
      const svg = o ? svgTemizle(o.svg) : undefined;
      if (!vurus || !svg || !idler.has(vurus) || kullanilan.has(vurus)) return [];
      kullanilan.add(vurus);
      return [{ vurus, svg }];
    });
    if (katmanlar.length) sonuc.set(sira, { sira, katmanlar: katmanlar.slice(0, MAKS_KATMAN) });
  }
  return [...sonuc.values()];
}

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
      vuruslar = vuruslariHazirla(vuruslar);
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

    if (govde.mode === "illustrasyon") {
      const istek = illustrasyonIstegiTemizle(govde.sahneler);
      if (istek.length === 0) return Response.json({ hata: "İllüstrasyon için sahne gerekli." }, { status: 400 });
      const sahneMetinleri = istek
        .map(
          (s) =>
            `### Sahne sira=${s.sira}: ${s.baslik}\n${s.vuruslar.map((v) => `${v.id}: ${v.soz || "(sessiz)"}`).join("\n")}`,
        )
        .join("\n\n");
      const text = await sohbetTamamla(model, [
        { role: "system", content: ILLUSTRASYON_TALIMATI + seviyeNotu(govde.seviye) + dersNotu(govde.ders) },
        {
          role: "user",
          content: `${govde.uniteBaslik ? `Ünite: ${yazi(govde.uniteBaslik, 120)}\n` : ""}Aşağıdaki ${istek.length} sahnenin her biri için ayrı, sahneye özel illüstrasyon çiz.\n\n${sahneMetinleri}`,
        },
      ]);
      const cizimler = illustrasyonlariTemizle(jsonCikar<{ cizimler?: unknown }>(text).cizimler, istek);
      if (cizimler.length === 0) return Response.json({ hata: "İllüstrasyon üretilemedi." }, { status: 422 });
      return Response.json({ cizimler });
    }

    if (govde.mode === "ozel_cizim") {
      const tarif = (yazi(govde.tarif, 600) ?? "").replace(/\s+/g, " ").trim();
      if (!tarif) return Response.json({ hata: "Ne çizmemi istediğini yaz." }, { status: 400 });
      const mesajlar: SohbetMesaji[] = [
        { role: "system", content: OZEL_CIZIM_TALIMATI + seviyeNotu(govde.seviye) + dersNotu(govde.ders) },
        {
          role: "user",
          content: `${govde.uniteBaslik ? `Şu anki ünite: ${yazi(govde.uniteBaslik, 120)}\n` : ""}Çizilmesini istediğim şey: ${tarif}`,
        },
      ];
      const cizimiAl = async (m: SohbetMesaji[]) => {
        const text = await sohbetTamamla(model, m);
        const veri = jsonCikar<{ aciklama?: string; vuruslar?: unknown }>(text);
        return { text, aciklama: String(veri.aciklama ?? "").trim(), vuruslar: vuruslariTemizle(veri.vuruslar) };
      };
      let sonuc = await cizimiAl(mesajlar);
      // Model bazen tek vuruşta bırakıyor; katman katman çizim için bir kez daha, eksik kısmı açıkça belirterek iste.
      if (sonuc.vuruslar.length < MIN_OZEL_CIZIM_VURUSU) {
        const ikinci = await cizimiAl([
          ...mesajlar,
          { role: "assistant", content: sonuc.text },
          {
            role: "user",
            content: `Yalnızca ${sonuc.vuruslar.length} vuruş döndürdün. Çizimi baştan, 4-7 vuruşta katman katman kur: her vuruşta il1 bloğuna yeni parçalar ekle. Aynı JSON yapısını döndür.`,
          },
        ]);
        if (ikinci.vuruslar.length > sonuc.vuruslar.length) sonuc = ikinci;
      }
      const vuruslar = sonuc.vuruslar;
      if (!vuruslar.some((v) => v.aksiyonlar.some((a) => a.tip === "geometri_ve_diyagram"))) {
        return Response.json({ hata: "Bu çizim üretilemedi. Tarifi biraz değiştirip tekrar deneyin." }, { status: 422 });
      }
      const aciklama = duzYaziyaCevir(sonuc.aciklama) || "Hemen çiziyorum.";
      return Response.json({ aciklama, vuruslar: vuruslariHazirla(vuruslar) });
    }

    return Response.json({ hata: "Bilinmeyen mod." }, { status: 400 });
  } catch (hata) {
    return hataYaniti(hata, model);
  }
}
