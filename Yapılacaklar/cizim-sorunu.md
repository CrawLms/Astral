# Görev: Tahtada çizimlerin azalması / görünmemesi sorunu

Sorun: Çizimler çok azaldı, bazı sahnelerde hiç çizim yok veya görünmüyor. Yazılar da
azalmış, tahta çok boş görünüyor. Bazen boş tahtayı gösterip bir şey varmış gibi anlatıyor.

## Adımlar

1. Çizim akışını incele (AI tahta API -> tipler -> öğretmen sahnesi -> çizim blokları) — TAMAMLANDI
2. Çizimlerin kaybolduğu / boş kaldığı noktaları tespit et — TAMAMLANDI
3. Sunucu tarafında (AI tahta route) boş/eksik sahneleri düzelt ve yedek çizim üret — TAMAMLANDI
4. İstemci tarafında (render) görünmeyen çizimleri düzelt — TAMAMLANDI
5. Tip kontrolü / lint ile doğrula, önizlemede kontrol et — TAMAMLANDI
6. Değişiklikleri commitle ve `feat/yapisal-cizim-motoru` branch'ine pushla

## Yapılan işlemler

- `app/api/tahta/route.ts`, `lib/types.ts`, `lib/ogretmen-cizim.ts`, `components/ogretmen-sahnesi.tsx`,
  `components/cizim/sablon-blok.tsx` incelendi.
- Tespit edilen nedenler:
  - Aynı `gorsel` kimliği farklı blok tipleriyle kullanılınca (ör. `gorsel` yazılmayınca hepsi `b1` oluyor)
    tahtada yalnızca ilk tipin bloğu çiziliyor, diğer tipteki tüm aksiyonlar sessizce atılıyor.
    Aynı durum farklı `sablon`lu `hazir_sahne` blokları için de geçerli.
  - AI `tip` alanını farklı yazınca (ör. `"tip":"egik_duzlem"`, `"type"`, `"harita"`, `"grafik"`) ya da
    parametreleri `veri`/`parametreler` içine koyunca aksiyon temizleyicide tamamen siliniyor.
  - Vuruşlarda aksiyonlar `aksiyon`/`cizimler` gibi farklı anahtarla gelirse okunmuyor.
  - Prompt yalnızca "vuruşların üçte ikisinde" çizim istiyor; sunucuda boş sahne/boş vuruş için hiçbir yedek yok,
    bu yüzden öğretmen boş tahtayı anlatabiliyor.
- Sunucu düzeltmeleri (`app/api/tahta/route.ts`):
  - `aksiyonNormallestir`: `type`/`gorselTipi` takma adları, şablon adının doğrudan `tip` olarak yazılması,
    `harita`/`grafik`/`diyagram`/`formul` gibi kısa tip adları ve `veri`/`parametreler` içine gömülü alanlar
    standart biçime çevriliyor. `gorsel` yoksa tipe özel kimlik (`b_<tip>`) veriliyor.
  - `hamAksiyonlar`: `aksiyon`, `cizimler`, `cizim`, `actions` anahtarları da okunuyor.
  - `bosTahtayiDoldur`: Sahnede hiç ana görsel yoksa konuşmadan adım adım büyüyen bir kavram şeması üretiliyor;
    ana görsel var ama vuruşların 2/3'ünden azı doluysa boş vuruşlara kısa notlar (en fazla 6 satır) ekleniyor.
  - Prompt: ilk vuruş hariç her vuruşta aksiyon, "bak/gördüğün gibi" deniyorsa gerçekten çizim ve farklı tiplere
    aynı `gorsel` kimliğini vermeme kuralı eklendi.
- Ortak/istemci düzeltmeleri:
  - `lib/types.ts` içine `gorselKimlikleriniAyir` eklendi; çakışan kimlikler tip (ve şablon) bazında ayrılıyor.
  - Hem sunucuda hem `components/ogretmen-sahnesi.tsx` içinde (kayıtlı eski dersler için de) uygulanıyor.
- Test: geçici betikle boş sahne, takma adlı aksiyonlar ve kimlik çakışması denendi; hepsi doğru çıktı verdi.
- `tsc --noEmit` ve `eslint` hatasız geçti; önizleme açıldı, sayfa konsol hatası olmadan yükleniyor.

