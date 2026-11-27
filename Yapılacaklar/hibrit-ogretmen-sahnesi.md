# Görev: Hibrit Öğretmen Sahnesi, Mikro-Vuruş Senkronu ve Sahne Geçişleri

Mevcut tasarım, kenar çubuğu, OpenAI-uyumlu API (OPENAI_COMPAT_*), model seçici, Anlatım/Sokratik, hız, soru fotoğrafı ve "Tahtayla Birlikte Gönder" korunarak geliştirilecek.

## Adımlar

0. Backend env güvenliği: `OPENAI_COMPAT_API_KEY` / `OPENAI_COMPAT_BASE_URL` `.trim()`, boş/placeholder/ASCII dışı (charCode > 255) kontrolü, net JSON hata (ByteString 502 hatası) — `/api/tahta`, `/api/models`, `/api/plan` — **TAMAMLANDI**
1. Paketler: `turkey-map-react`, `roughjs` (katex zaten var) — **TAMAMLANDI**
2. Tipler + `/api/tahta` şeması: `vurus { id, soz, aksiyonlar }`, 4 yapısal görsel blok (`turkiye_haritasi`, `matematik_grafigi`, `geometri_ve_diyagram`, `formul_ve_not`), freedraw yasağı, seviye, mini görev — **TAMAMLANDI**
3. Öğretmen Sahnesi katmanı: gerçek Türkiye haritası (tıklanabilir iller, pin, etiket, oklar), güvenli matematik parser + roughjs eksen + animasyonlu eğri, roughjs ile temizlenmiş SVG diyagram, KaTeX formül; Excalidraw şeffaf üst katman ve scroll/zoom senkronu (`ssr: false`) — **TAMAMLANDI**
4. Mikro-vuruş oynatıcı: `playbackTokenRef`, `tr-TR` konuşma + `stroke-dashoffset` animasyonu konuşma süresine yayılır, sessiz modda zamanlayıcı, `✏️` kalem imleci, canlı altyazı, konuşma + çizim bitmeden sonraki vuruşa geçmeme — **TAMAMLANDI**
5. Sahne geçişleri: Önceki sahne (sonraki sahneleri ve hedef sahneyi sil, 0. vuruştan yeniden anlat), Sonraki sahne (yarımı tamamla, sonrakini başlat), tıklanabilir sahne zaman çizelgesi — **TAMAMLANDI**
6. Seviye seçici (İlkokul / Ortaokul / Lise-YKS / Üniversite) ve adım sonu mini görev kartı (haritada il tıklama dahil) — **TAMAMLANDI**
7. "Tahtayla Birlikte Gönder": öğretmen sahnesi + Excalidraw çizimini tek PNG'de birleştirip gönderme — **TAMAMLANDI**
8. Doğrulama (tip kontrolü, lint, önizleme)

## Yapılan İşlemler

- Çalışma dalı: `v0/canli-tahta-dogrulama`. Başlangıç V0 bakiyesi: 4.18 / 5.
- Adım 0: `lib/ai-yardimci.ts` `apiAyarlari()` env değerlerini `.trim()` ediyor; boş, placeholder, ASCII dışı (charCode > 255) ve kontrol karakterlerini `fetch`'ten önce yakalayıp "`OPENAI_COMPAT_API_KEY` değerinin 23. karakteri ("ı", kod 305) ASCII dışı" gibi net JSON hata (400/500) döndürüyor. Base URL'nin http(s) olması da kontrol ediliyor. Üç endpoint de `apiIstegi` üzerinden geçtiği için hepsi korunuyor.
- Adım 1: `turkey-map-react@2.4.6` ve `roughjs` kuruldu. Haritada paketin `turkey-map-react/data` export'u (81 il `path`, `centroid`, `region`, `plateNumber`) kullanılıyor; kendi animasyonlu SVG'miz render ediliyor.
- Adım 2: `lib/types.ts` yeni şema (`Vurus { id, soz, aksiyonlar }`, `Aksiyon` = turkiye_haritasi / matematik_grafigi / geometri_ve_diyagram / formul_ve_not / vurgula, `MiniGorev`, `Seviye`). `app/api/tahta/route.ts` promptları freedraw/koordinatı yasaklıyor, yalnızca yapısal blok + mikro-vuruş istiyor; tüm alanlar sunucuda temizleniyor (plaka 1-81, renk deseni, SVG'den script/style/image/href/on* siliniyor). Seviye notu sistem promptuna ekleniyor. `lib/matematik.ts` güvenli ifade parser'ı (eval yok). Üst çubuğa seviye seçici eklendi.
- Adım 3: `components/ogretmen-sahnesi.tsx` (`next/dynamic`, `ssr: false`): Excalidraw'ın altında, dünya koordinatlarında tek SVG. `api.onScrollChange` ile CSS `translate/scale` senkronu. Bloklar: gerçek 81 il haritası (`turkey-map-react/data`; sınırlar `stroke-dashoffset`, il dolgusu, pin, el yazısı etiket, eğrisel oklar, görevde tıklanabilir iller), grafik (roughjs eksen + `lib/matematik.ts` ile hesaplanan eğri), diyagram (DOMParser + izinli 9 etiket → roughjs; innerHTML yok), formül (KaTeX PNG, soldan sağa açılma + alt çizgi). Yerleşim `lib/ogretmen-cizim.ts > yerlesim()`. Excalidraw `viewBackgroundColor: "transparent"`. Eski `lib/tahta-cizim.ts` (freedraw motoru) silindi.
- Adım 4: `hooks/use-oynatici.ts` yeniden yazıldı: `playbackTokenRef`, her vuruşta `tr-TR` konuşma + rAF ilerlemesi (`onboundary` veya kelime/hız tahmini), sessiz modda zamanlayıcı, konuşma + çizim bitmeden sonraki vuruşa geçmiyor. Kalem imleci, aktif `[data-kalem]` yolunun `getPointAtLength` ucundan hesaplanıyor. İlerleme ayrı bir depoda tutuluyor (tüm uygulama her karede yeniden render edilmiyor).
- Adım 5: Tahta durumu (aktif sahne, aktif vuruş, ilerleme) üzerinden deterministik: önceki sahneler tamamlanmış, aktif sahne vuruş vuruş, sonrakiler hiç çizilmiyor. Önceki / Sonraki / zaman çizelgesi `sahneyiOynat(i)` ile tokenı artırıp hedef sahneyi 0. vuruştan yeniden anlatıyor. `components/sahne-cizelgesi.tsx` zaman çizelgesi.
- Adım 6: Seviye `/api/tahta`'ya (anlat + soru) gönderiliyor ve kaydediliyor. `GorevKarti`: il_tikla (doğru/yanlış geri bildirimi) ve tahtaya_yaz görevleri.
- Adım 7: `birlesikGorselAl()`: görünen alanın öğretmen SVG'si (`XMLSerializer`) + Excalidraw `exportToCanvas` aynı koordinatlarda tek PNG'de birleştiriliyor. Cevaplar ek sahne olarak (fotoğraf soldaysa) çizilerek anlatılıyor.
- Adım 8: `tsc --noEmit` temiz. Bakiye sınırı nedeniyle tarayıcıda yalnızca sayfa açılışı kontrol edildi; gerçek AI dersiyle uçtan uca test yapılmadı.
