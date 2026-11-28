# Görev: Tekrar eden çizimler yerine sahneye özel illüstrasyonlar

Sorun: Tahtadaki çizimler sahneden sahneye aynı (hep ikon ızgarası / kavram şeması gibi kalıplar) tekrar ediyor.
Hedef: Yapay zekâ her sahnenin konusuna özel illüstrasyon çizebilsin. Düzeltme yeni bir branch'te yapılacak.

## Adımlar

1. Yeni branch oluştur (`feat/sahneye-ozel-illustrasyon`) — TAMAMLANDI
2. Tahta promptunu güncelle: "ham SVG son çare" kuralını kaldır, sahneye özel illüstrasyonu öne çıkar, sahneler arası çeşitlilik kuralları ekle — TAMAMLANDI
3. Sunucuda `illustrasyon` tipini tanı ve tekrar eden sahneleri tespit eden yardımcıyı yaz — TAMAMLANDI
4. Tekrar eden sahneler için arka planda sahneye özel illüstrasyon üreten yeni API modunu (`illustrasyon`) ekle — TAMAMLANDI
5. İstemcide ders yüklenince tekrar eden sahneleri arka planda illüstrasyonla zenginleştir — TAMAMLANDI
6. Tip kontrolü, lint ve sayfa kontrolü; commit ve yeni branch'e push

## Yapılan işlemler

- Adım 1: `feat/yapisal-cizim-motoru` üzerinden `feat/sahneye-ozel-illustrasyon` branch'i açıldı.
- Neden analizi: Prompt "ASLA serbest çizim" ve "ham SVG SON ÇARE" diyordu ve 1-7 arası kalıp blokları zorunlu kılıyordu. Bu yüzden model her sahnede aynı ikon_izgarasi / akis_semasi kalıplarına dönüyordu; boş sahnelerde eklenen yedek kavram şeması da her sahnede aynı görünüyordu.
- Adım 2: `app/api/tahta/route.ts` içinde "ASLA serbest çizim" ve "SON ÇARE" kuralları kaldırıldı; yeni `illustrasyon` bloğu (katman katman SVG) ve "SAHNEYE ÖZEL ÇİZİM VE ÇEŞİTLİLİK" kuralları eklendi (art arda aynı şablon yok, metafor şablonları derste en fazla 1 kez, sahnelerin en az yarısında illüstrasyon). Şiir örneği yerine katmanlı fotosentez illüstrasyonu örneği kondu. SVG kuralları `SVG_KURALLARI` sabitine taşındı. `lib/ders-rehberi.ts` içindeki ders fikir bankası illüstrasyon odaklı güncellendi.
- Adım 3: `illustrasyon`, `illustration`, `resim`, `sahne_cizimi`, `ozel_cizim` tipleri SVG bloğuna eşlendi. Yeni `lib/sahne-cesitlilik.ts`: `illustrasyonGerekenSahneler` (önceki sahnenin kalıbını tekrar eden, yalnızca yedek şeması olan veya ana görseli olmayan sahneleri bulur; harita/grafik/geometri/fen düzeneği ve zaten illüstrasyonu olan sahnelere dokunmaz) ve `illustrasyonuUygula` (kalıp bloğunu katmanlı illüstrasyonla değiştirir, tablo/zaman çizelgesi gibi blokları korur).
- Adım 4: `/api/tahta` için `mode: "illustrasyon"` eklendi. En fazla 3 sahne alır, vuruş sözlerine bağlı 3-6 SVG katmanı ister, katmanları temizleyip yalnızca geçerli vuruş kimliklerine bağlı olanları döndürür.
- Adım 5: `components/ders-uygulamasi.tsx` yeni ders yüklenince (ve kayıtlı ders açılınca) tekrar eden sahneleri 3'erli paketlerle paralel olarak arka planda ister; ders beklemeden başlar. Gelen illüstrasyonlar kayda yazılır ve `useOynatici.sahneleriGuncelle` ile henüz oynatılmayan sahnelere uygulanır; o an oynatılan sahne yarıda değişmez, sahne değişiminde uygulanır. Ders sıfırlanınca bekleyen istekler geçersiz sayılır. Yardımcılar küçük bir betikle denendi (tekrar eden sahneler doğru bulundu, kalıp blok değiştirildi, tablo korundu).

