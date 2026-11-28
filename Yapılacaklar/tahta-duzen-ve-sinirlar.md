# Tahta sınırları ve düzenli çizim

## İstek
- Çizimler tahtanın sınırlarından taşmasın, anlatım tahtanın içinde kalsın.
- Etiketler rastgele sağa/sola kaymasın (ör. 2 top örneği: "hareketsiz" ilk topun altında, "hareketli" ise ikinci topun altında değil, sağa kaymış duruyordu). Düzenli ve estetik görünsün.

## Yapılanlar (tamamlandı, tsc + eslint temiz)
`components/ogretmen-sahnesi.tsx`
- Tahtaya düz, belirgin bir çerçeve eklendi (eski kesik çizgi yerine). Sahne içeriği bu çerçeveye kırpılıyor (clipPath), dışarı hiçbir şey taşmıyor.
- Başlık uzun olursa yazı boyutu küçülerek sığdırılıyor.
- Diyagram bloğu (`diyagramDuzenle`):
  - Bloğun tüm SVG parçaları sahne verisinden baştan okunuyor, böylece yerleşim çizim boyunca kaymıyor.
  - Etiket hizalama: bir yazı küçük kapalı bir şeklin (daire/elips/dikdörtgen/çokgen) altında, üstünde ya da içindeyse şeklin yatay merkezine çekiliyor (text-anchor middle) ve şekle binmemesi için aralık bırakılıyor.
  - Satır hizalama: y'leri birbirine 16px'den yakın yazılar aynı satıra (ortalama y) getiriliyor.
  - viewBox, tüm içeriği (+12px pay) kapsayacak şekilde genişletiliyor ve blok kendi kutusuna kırpılıyor; içerik kutudan taşmak yerine ölçekleniyor.
- Formül/not bloğu (`formulDuzeni`): uzun notlar kelime kelime satırlara bölünüyor; toplam yükseklik kutuyu aşarsa tüm blok orantılı küçültülüyor (taşma yok).

`app/api/tahta/route.ts`
- Modele "DİYAGRAM DÜZENİ" kuralları eklendi: içerik x 40-760 / y 40-420 arasında kalsın; karşılaştırılan nesneler eşit sütunlarda (2 nesne: x=240/560, 3 nesne: x=160/400/640), aynı y'de ve aynı boyutta olsun; etiket daima nesnenin altında, ortalı ve aynı y'de olsun; yazılar 18-24 punto, en fazla ~28 karakter.
- Sahne sınırı kuralı: formül bloğunda en fazla 6 satır, kısa notlar; fazlası varsa yeni sahneye geçilsin.

## Kalanlar / sonraki adımlar
- [ ] Gerçek bir ders üretip (ör. hareketsiz/hareketli 2 top) tarayıcıda görsel doğrulama yap — henüz yapılmadı.
- [ ] Harita ve grafik bloklarındaki etiketler hâlâ `overflow="visible"`; sahne kırpması korur ama kenara yakın etiketler kesilebilir. Gerekirse bunlar da içeri sığdırılmalı.
- [ ] Yazı genişliği tahmini (`uzunluk * boyut * 0.56`) el yazısı fontunda kaba; gerekirse `getComputedTextLength` ile ölçülebilir.
- [ ] Dönüşüm (transform) olan SVG öğeleri hizalamaya ve sınır hesabına dahil değil.
