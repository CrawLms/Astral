"use client";

import { useRef, useState } from "react";
import {
  ArrowUp,
  CheckCheck,
  ChevronDown,
  ClipboardList,
  HelpCircle,
  ImagePlus,
  Loader2,
  Paintbrush,
  TriangleAlert,
  X,
} from "lucide-react";
import { dosyadanGorsel, type HazirGorsel } from "@/lib/gorsel-donustur";

type Props = {
  miniSoru: string | null;
  soruBekliyor: boolean;
  hata: string | null;
  onHataKapat: () => void;
  gonderiliyor: boolean;
  onGonder: (metin: string, fotograf: HazirGorsel | null) => Promise<boolean>;
  onCizimIste: (tarif: string) => Promise<boolean>;
  tamamlaGorunur: boolean;
  onTamamla: () => void;
  testGorunur: boolean;
  testYukleniyor: boolean;
  onTestOlustur: () => void;
};

export function AltPanel({
  miniSoru,
  soruBekliyor,
  hata,
  onHataKapat,
  gonderiliyor,
  onGonder,
  onCizimIste,
  tamamlaGorunur,
  onTamamla,
  testGorunur,
  testYukleniyor,
  onTestOlustur,
}: Props) {
  const [metin, setMetin] = useState("");
  const [fotograf, setFotograf] = useState<HazirGorsel | null>(null);
  const [fotoHata, setFotoHata] = useState<string | null>(null);
  const [soruAcik, setSoruAcik] = useState(true);
  const [cizimModu, setCizimModu] = useState(false);
  const dosyaRef = useRef<HTMLInputElement>(null);
  const metinRef = useRef<HTMLTextAreaElement>(null);

  function cizimModunuDegistir() {
    setCizimModu((acik) => !acik);
    setFotograf(null);
    setFotoHata(null);
    metinRef.current?.focus();
  }

  async function gonder() {
    if (gonderiliyor) return;
    if (cizimModu) {
      if (await onCizimIste(metin.trim())) {
        setMetin("");
        setCizimModu(false);
      }
      return;
    }
    const tamam = await onGonder(metin.trim(), fotograf);
    if (tamam) {
      setMetin("");
      setFotograf(null);
    }
  }

  async function fotografAl(dosya: File | null | undefined) {
    if (!dosya) return;
    setFotoHata(null);
    try {
      const g = await dosyadanGorsel(dosya);
      if (!g) setFotoHata("Lütfen bir görsel dosyası seçin.");
      else setFotograf(g);
    } catch {
      setFotoHata("Fotoğraf okunamadı.");
    }
  }

  const eylemVar = tamamlaGorunur || testGorunur;

  return (
    <section
      aria-label="Soru sor"
      className="shrink-0 border-t border-border bg-background/95 px-3 pt-2 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
        {hata && (
          <div role="alert" className="kart-giris flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p className="flex-1 text-pretty">{hata}</p>
            <button type="button" onClick={onHataKapat} aria-label="Hatayı kapat" className="-m-1 rounded-md p-1 hover:bg-destructive/10">
              <X className="size-4" />
            </button>
          </div>
        )}

        {miniSoru && (
          <button
            type="button"
            onClick={() => setSoruAcik((a) => !a)}
            aria-expanded={soruAcik}
            className={`kart-giris flex w-full items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
              soruBekliyor ? "border-accent bg-accent/25 text-accent-foreground" : "border-border bg-muted/60"
            }`}
          >
            <HelpCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className={`block font-medium leading-snug ${soruAcik ? "" : "truncate"}`}>{miniSoru}</span>
              {soruAcik && soruBekliyor && (
                <span className="mt-0.5 block text-xs opacity-80">Cevabını yaz ya da tahtada göster, sonra gönder.</span>
              )}
            </span>
            <ChevronDown className={`mt-0.5 size-4 shrink-0 opacity-60 transition-transform ${soruAcik ? "rotate-180" : ""}`} aria-hidden />
            <span className="sr-only">{soruAcik ? "Soruyu daralt" : "Soruyu genişlet"}</span>
          </button>
        )}

        {eylemVar && (
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
            {tamamlaGorunur && (
              <button
                type="button"
                onClick={onTamamla}
                className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 text-xs font-medium text-success hover:bg-success/15"
              >
                <CheckCheck className="size-3.5" aria-hidden />
                Üniteyi tamamla
              </button>
            )}
            {testGorunur && (
              <button
                type="button"
                onClick={onTestOlustur}
                disabled={testYukleniyor}
                className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-accent bg-accent/20 px-3 text-xs font-medium text-accent-foreground hover:bg-accent/35 disabled:opacity-60"
              >
                {testYukleniyor ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <ClipboardList className="size-3.5" aria-hidden />}
                Mini test
              </button>
            )}
          </div>
        )}

        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            gonder();
          }}
        >
          <div
            className={`flex min-w-0 flex-1 flex-col rounded-3xl border transition-shadow focus-within:bg-background focus-within:ring-4 ${
              cizimModu
                ? "border-primary/40 bg-primary/5 focus-within:ring-primary/15"
                : "border-border bg-muted/50 focus-within:border-primary/40 focus-within:ring-primary/10"
            }`}
          >
            {cizimModu && (
              <div className="flex items-center gap-2 px-3 pt-2 text-xs text-primary">
                <Paintbrush className="size-3.5 shrink-0" aria-hidden />
                <span className="flex-1 text-pretty">
                  Özel çizim: Ne çizmemi istediğini tarif et, tahtada çizerek anlatayım.
                </span>
                <button
                  type="button"
                  onClick={cizimModunuDegistir}
                  aria-label="Özel çizim modunu kapat"
                  className="-my-1 flex size-7 items-center justify-center rounded-full hover:bg-primary/10"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}
            {!cizimModu && (fotograf || fotoHata) && (
              <div className="flex items-center gap-2 px-2 pt-2 text-xs">
                {fotograf ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fotograf.dataURL} alt="Eklenen soru fotoğrafı" className="size-11 rounded-xl object-cover ring-1 ring-border" />
                    <span className="flex-1 text-pretty text-muted-foreground">Fotoğraf tahtada adım adım çözülecek.</span>
                    <button
                      type="button"
                      onClick={() => setFotograf(null)}
                      aria-label="Fotoğrafı kaldır"
                      className="flex size-7 items-center justify-center rounded-full hover:bg-muted"
                    >
                      <X className="size-3.5" />
                    </button>
                  </>
                ) : (
                  <span role="alert" className="px-1 text-destructive">
                    {fotoHata}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-end">
              <label htmlFor="ogrenci-soru" className="sr-only">
                {cizimModu ? "Çizilmesini istediğiniz şeyin tarifi" : "Sorunuz veya cevabınız"}
              </label>
              <textarea
                ref={metinRef}
                id="ogrenci-soru"
                value={metin}
                onChange={(e) => setMetin(e.target.value)}
                onPaste={(e) => {
                  const dosya = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
                  if (!dosya || cizimModu) return;
                  e.preventDefault();
                  fotografAl(dosya);
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || e.shiftKey) return;
                  if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                  e.preventDefault();
                  gonder();
                }}
                rows={1}
                placeholder={
                  cizimModu
                    ? "Ne çizeyim? ör. Malazgirt Savaşı'nın meydanı"
                    : soruBekliyor
                      ? "Cevabını yaz…"
                      : "Öğretmene sor…"
                }
                className="field-sizing-content max-h-32 min-h-11 min-w-0 flex-1 resize-none bg-transparent py-2.5 pl-4 pr-1 text-base leading-6 outline-none placeholder:text-muted-foreground md:text-sm"
              />
              <input
                ref={dosyaRef}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  const d = e.target.files?.[0];
                  e.target.value = "";
                  fotografAl(d);
                }}
              />
              <button
                type="button"
                onClick={cizimModunuDegistir}
                aria-pressed={cizimModu}
                aria-label="Özel çizim iste"
                title="Özel çizim iste"
                className={`my-1 flex size-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                  cizimModu ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Paintbrush className="size-[18px]" aria-hidden />
              </button>
              {!cizimModu && (
                <button
                  type="button"
                  onClick={() => dosyaRef.current?.click()}
                  aria-label="Soru fotoğrafı ekle"
                  title="Soru fotoğrafı ekle"
                  className={`m-1 flex size-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                    fotograf ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <ImagePlus className="size-[18px]" aria-hidden />
                </button>
              )}
              {cizimModu && <span className="w-1" aria-hidden />}
            </div>
          </div>
          <button
            type="submit"
            disabled={gonderiliyor}
            aria-label={cizimModu ? "Çizimi iste" : "Tahtayla birlikte gönder"}
            title={cizimModu ? "Çizimi iste" : "Tahtayla birlikte gönder"}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {gonderiliyor ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : cizimModu ? (
              <Paintbrush className="size-5" aria-hidden />
            ) : (
              <ArrowUp className="size-5" aria-hidden />
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
