# Mobil uyumlu ve sade arayüz

Bu dosya, yapay zekâ modellerinin (v0 vb.) bu projede yapacağı arayüz işleri için not defteridir.
Yeni bir model bu işe devam edecekse önce burayı okusun ve bittiğinde güncellesin.

## Kullanıcının istekleri

- [x] Site mobil kullanıcılar için rahat kullanılabilir olsun; estetik ve profesyonel görünsün (hedef: 10 üzerinden 8+).
- [x] Öğretmenin söylediği sözlerin göründüğü panel (altta "öğretmen mesajı" kartı) kaldırılsın.
- [x] Matematiksel işaretlerin olduğu sembol satırı (√, π, ∑, ∫ …) kaldırılsın.
- [x] "Soru fotoğrafı" butonu alttaki yazma barının **içinde, en sağında** olsun.
- [x] Ekran boşa kalabalıklaştırılmasın; ana planda **yazı tahtası** olsun.
- [x] Uygun yerler açılır/kapanır yapılabilir.

## Yapılanlar

1. **Alt panel → tek satırlık yazma barı** (`components/alt-panel.tsx`)
   - Öğretmen mesaj kartı ve sembol araç çubuğu tamamen silindi.
   - Yuvarlak köşeli tek bir giriş alanı: metin kutusu içeriğe göre büyür (`field-sizing-content`, en fazla ~5 satır),
     fotoğraf butonu kutunun içinde en sağda, gönder butonu kutunun yanında yuvarlak ikon olarak duruyor.
   - Mobilde yazı boyutu 16px (iOS'un otomatik yakınlaştırmasını engellemek için), masaüstünde 14px.
   - Alt kenarda `env(safe-area-inset-bottom)` boşluğu var (iPhone ana ekran çubuğu).
   - Mini soru, hata ve "Üniteyi tamamla / Mini test" butonları yalnızca gerektiğinde barın üstünde küçük çipler olarak çıkıyor.
   - Mini soru kartı tıklanınca açılıp kapanıyor (uzun sorular ekranı kaplamasın diye).
2. **Üst çubuk sadeleştirildi** (`components/ust-cubuk.tsx`)
   - Tek satır: ders planı butonu · başlık/ilerleme · önceki / oynat / sonraki · ayarlar.
   - Anlatım modu, hız, seviye, ses, tahtayı temizle ve model ID artık **açılır "Ayarlar" panelinde**.
   - Masaüstünde ses ve temizle butonları ayrıca çubukta görünüyor; mobilde sadece panelde.
   - Panel dışına tıklayınca veya Esc ile kapanıyor.
3. **Kenar çubuğu mobilde çekmece** (`components/ders-uygulamasi.tsx`)
   - Mobilde (<768px) varsayılan olarak kapalı açılıyor, açıkken arkada karartma var; karartmaya dokununca kapanıyor.
   - Mobilde bir anlatım başlatılınca çekmece otomatik kapanıp tahta görünür oluyor.
4. Tahta alanına `isolate` verildi; böylece Excalidraw'ın iç z-index'leri ayarlar panelinin üstüne çıkmıyor.
5. Sahne çizelgesi daha ince yapıldı.
6. `viewport-fit=cover` eklendi (çentikli telefonlarda tam ekran).

## Notlar / sonraki adımlar için fikirler

- Öğretmenin sözleri artık ekranda yazı olarak görünmüyor; sadece sesli okunuyor. Ses kapalıyken anlatımı takip etmek
  zorlaşabilir. İstenirse ayarlar paneline "Altyazıyı göster" seçeneği eklenebilir (varsayılan kapalı).
- `config/ai-config.ts` içinde API anahtarı açık yazılı duruyor. Repo herkese açıksa anahtarı silip yalnızca
  `OPENAI_COMPAT_API_KEY` ortam değişkenini kullanmak daha güvenli.
- Excalidraw mobilde kendi araç çubuğunu tahtanın altına koyuyor; yazma barıyla çakışmıyor ama ileride
  özel bir kalem/silgi çubuğu tasarlanırsa ikisi birleştirilebilir.
