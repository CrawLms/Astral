# Görev: Astra AI "Canlı Öğretmen Tahtası" Yükseltmesi

Mevcut Beyaz Tahta uygulaması (Noxery `/chat/completions` API, PDF yükleme ve ünite planı korunarak) canlı öğretmen tahtasına yükseltilecek. Mevcut API bağlantısı bozulmayacak.

## Adımlar

1. Bağımlılıkları kur (`katex`, `idb-keyval`) — **TAMAMLANDI**
2. Veri tiplerini ve `/api/tahta` çıktısını vuruş (beat) şemasına geçir; sistem promptlarına "gerçek görselleştir" kuralı, `svg`/`latex`, Sokratik mod ve mini test modunu ekle — **TAMAMLANDI**
3. Tahta çizim kütüphanesi: `freedraw`, `ellipse`, `line`, eğri `arrow`, Virgil yazı tipi, renk kodlaması, `svg` + `KaTeX` görsellerini `addFiles` ile yerleştirme, kademeli el çizimi animasyonu — **TAMAMLANDI**
4. Oynatıcı: konuşma ile vuruş senkronizasyonu (`onboundary` + `requestAnimationFrame` yedeği), canlı kalem göstergesi, `vurgulananId` lazer halkası, hız ayarı — **TAMAMLANDI**
5. Üst bar: hız seçici (`0.75x`–`1.5x`) ve Anlatım / Sokratik mod anahtarı — **TAMAMLANDI**
6. Alt panel: matematik/fen sembol çubuğu, soru fotoğrafı yükleme ve Ctrl+V ile yapıştırma (tahtanın soluna yerleştirme) — **TAMAMLANDI**
7. Ünite sonu 3 soruluk mini test ve "Tahtada Çizerek Açıkla" — **TAMAMLANDI**
8. Kalıcı kayıt: tüm ders verilerini ve tahta çizimlerini `idb-keyval` ile IndexedDB'ye taşı — **TAMAMLANDI**
9. Doğrulama (tip kontrolü, lint, önizleme) — **TAMAMLANDI**

## Yapılan İşlemler

- `v0/canli-ogretmen-tahtasi` dalı açıldı.
- `katex`, `idb-keyval` ve `@types/katex` kuruldu.
- KaTeX `woff2` yazı tipleri `public/katex/fonts/` altına kopyalandı (formülleri SVG/PNG görsele çevirirken yazı tiplerini gömebilmek için).
- `lib/types.ts`: `Sahne` artık `{ baslik, miniSoru, vuruslar: Vurus[] }`; `Vurus = { konusmaMetni, vurgulananId, animasyonSuresiMs, elemanlar }`. Yeni eleman tipleri (`freedraw`, `ellipse`, `line`, `arrow`, `svg`, `latex`), `OgretmenModu`, `TestSorusu` eklendi.
- `app/api/tahta/route.ts`: Noxery `sohbetTamamla` çağrısı aynen korundu. Promptlara "Asla sadece kutu ve düz yazı çizme!" kuralı, vuruş şeması, renk kodlaması, svg/latex tarifleri eklendi. Anlatım + Sokratik için ayrı anlat/soru promptları, soru fotoğrafı desteği ve yeni `mode: "test"` (3 soruluk mini test) eklendi. SVG çıktısı sunucuda temizleniyor (script/foreignObject/on* kaldırılıyor). Eski formatta (`anlatimMetni`) gelen yanıtlar tek vuruşa dönüştürülerek geriye uyumluluk sağlandı.
- `lib/gorsel-donustur.ts` (yeni): `latexGorseli` KaTeX ile formülü HTML'e çevirip yazı tipleri gömülü bir SVG `foreignObject`'e koyar ve 2x çözünürlüklü PNG'ye rasterize eder; `svgGorseli` AI'ın SVG'sini temizleyip PNG'ye çevirir; `dosyadanGorsel` yüklenen fotoğrafı küçültür. Rasterize başarısız olursa SVG veri URL'sine düşer.
- `lib/tahta-cizim.ts` yeniden yazıldı: sahne alanı/bağlamı (`SahneBaglami`, AI id → Excalidraw id eşlemesi), `freedraw`/`line`/eğri `arrow`/`ellipse`/`kutu`/`metin`/`vurgu`/`image` iskeletleri, Virgil (`fontFamily: 1`) yazı tipi, pedagojik renk paleti (`baslik`, `formul`, `vurgu`, `sonuc`). `svg`/`latex` görselleri `excalidrawAPI.addFiles` ile `image` elemanı olarak ekleniyor. `cizimPlaniOlustur` + `planiUygula`: çizgi/ok/serbest çizim noktaları kademeli uzatılıyor, metin harf harf yazılıyor, şekil/görseller beliriyor; her karede kalem ucunun konumu döndürülüyor. Animasyon kareleri geri alma geçmişini kirletmesin diye `CaptureUpdateAction.NEVER` kullanılıyor. Soru fotoğrafını tahtanın soluna yerleştiren `fotografiYerlestir` eklendi.
- `hooks/use-oynatici.ts` yeniden yazıldı: sahneler vuruş vuruş oynatılıyor. Her vuruşta `SpeechSynthesisUtterance` başladığı anda `requestAnimationFrame` çizim döngüsü de başlıyor; ilerleme `onboundary` karakter konumu ile kelime sayısına göre zaman tahmininin büyüğü alınarak hesaplanıyor (boundary olayı gelmeyen tarayıcılarda zamanlayıcı yedeği). Konuşma biterse çizim 350 ms içinde tamamlanıyor. Hız (`rate` + animasyon süresi) canlı uygulanıyor. Duraklatılınca yarım çizim anında tamamlanıyor, devam edince aynı vuruştan sürüyor. Sonraki vuruşların görselleri (KaTeX/SVG) önceden hazırlanıyor. Soru cevapları için `ekSahneOynat` eklendi.
- `components/kalem-katmani.tsx` (yeni): tahta üstünde kalem ucunu takip eden `✏️` göstergesi ve `vurgulananId` için nabız atan kırmızı lazer halkası (Excalidraw scroll/zoom'a göre konumlanıyor; `prefers-reduced-motion` destekli).
- `components/ust-cubuk.tsx`: Anlatım / Sokratik mod anahtarı (erişilebilir `radiogroup`), `0.75x / 1x / 1.25x / 1.5x` hız seçici ve "Sahne x / y · Adım a / b" ilerleme göstergesi eklendi.
- `components/alt-panel.tsx`: mesaj kutusunun üstüne imlecin olduğu yere ekleyen `√ π ∑ ∫ Δ θ ² ³ → ≠ ≤ ≥` sembol çubuğu, "Soru fotoğrafı" yükleme butonu, textarea'ya Ctrl+V ile görsel yapıştırma ve önizleme eklendi. `components/ders-uygulamasi.tsx` içinde fotoğraf gönderilince `fotografiYerlestir` ile tahtanın soluna konuyor, AI çözümü fotoğrafın sağına vuruş vuruş canlı çiziliyor.
- `components/mini-test.tsx` (yeni) + `mode: "test"`: ünite anlatımı bittiğinde "3 Soruluk Mini Test Oluştur" butonu çıkıyor; yanlış cevapta "Tahtada Çizerek Açıkla" ile öğretmen o soruyu tahtada çizerek anlatıyor.
- `lib/depolama.ts` `idb-keyval` (IndexedDB) ile async hale getirildi; eski `localStorage` verileri ilk okumada otomatik taşınıp siliniyor. PDF sayfaları, ünite planı, ayarlar (model, ses, hız, mod), son ders sahneleri ve `components/beyaz-tahta.tsx` üzerinden Excalidraw çizimleri + görsel dosyaları (debounce ile) IndexedDB'ye kaydediliyor ve açılışta geri yükleniyor.
- Tip kontrolü (`tsc --noEmit`) ve ESLint hatasız geçti.
- Adım 9: `tsc --noEmit` ve `eslint .` tekrar hatasız geçti. Önizleme tarayıcıda açıldı, konsol hatası yok. Dar ekranda (796px) alt paneldeki sembol çubuğu ve "Soru fotoğrafı" butonu taşıyordu, mesaj metni de sıkışıyordu: `components/alt-panel.tsx` içinde iki sütunlu düzen `lg` kırılımına alındı ve sol sütunun `min-h-0` değeri yalnızca `lg`'de uygulandı. 796px ve 1440px genişlikte doğrulandı.
- V0 API bakiyesi kontrol edildi: 4.80 / 5 (0.50 sınırının üstünde).
- Tüm adımlar tamamlandığı için bu dosya silindi.

