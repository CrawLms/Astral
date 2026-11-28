"use client";

import { useRef, useState } from "react";
import {
  CheckCheck,
  ClipboardList,
  GraduationCap,
  HelpCircle,
  ImagePlus,
  Loader2,
  Send,
  TriangleAlert,
  X,
} from "lucide-react";
import { dosyadanGorsel, type HazirGorsel } from "@/lib/gorsel-donustur";

const SEMBOLLER = ["√", "π", "∑", "∫", "Δ", "θ", "²", "³", "→", "≠", "≤", "≥"];

export type OgretmenMesaji = { baslik: string; metin: string; tur: "anlatim" | "cevap" | "bilgi" };

type Props = {
  mesaj: OgretmenMesaji | null;
  miniSoru: string | null;
  soruBekliyor: boolean;
  konusuyor: boolean;
  yukleniyor: string | null;
  hata: string | null;
  onHataKapat: () => void;
  gonderiliyor: boolean;
  onGonder: (metin: string, fotograf: HazirGorsel | null) => Promise<boolean>;
  tamamlaGorunur: boolean;
  onTamamla: () => void;
  testGorunur: boolean;
  testYukleniyor: boolean;
  onTestOlustur: () => void;
};

export function AltPanel({
  mesaj,
  miniSoru,
  soruBekliyor,
  konusuyor,
  yukleniyor,
  hata,
  onHataKapat,
  gonderiliyor,
  onGonder,
  tamamlaGorunur,
  onTamamla,
  testGorunur,
  testYukleniyor,
  onTestOlustur,
}: Props) {
  const [metin, setMetin] = useState("");
  const [fotograf, setFotograf] = useState<HazirGorsel | null>(null);
  const [fotoHata, setFotoHata] = useState<string | null>(null);
  const metinRef = useRef<HTMLTextAreaElement>(null);
  const dosyaRef = useRef<HTMLInputElement>(null);

  async function gonder() {
    if (gonderiliyor) return;
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

  function sembolEkle(sembol: string) {
    const alan = metinRef.current;
    const bas = alan?.selectionStart ?? metin.length;
    const son = alan?.selectionEnd ?? metin.length;
    setMetin(metin.slice(0, bas) + sembol + metin.slice(son));
    requestAnimationFrame(() => {
      alan?.focus();
      alan?.setSelectionRange(bas + sembol.length, bas + sembol.length);
    });
  }

  return (
    <section
      aria-label="Öğretmen ve soru paneli"
      className="grid max-h-[45vh] shrink-0 grid-cols-1 gap-3 overflow-y-auto border-t border-border bg-background p-3 lg:max-h-64 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]"
    >
          <div className="flex flex-col gap-2 lg:min-h-0">
        {hata && (
          <div role="alert" className="flex items-start gap-2 rounded-md bg-destructive/10 p-2.5 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p className="flex-1">{hata}</p>
            <button type="button" onClick={onHataKapat} aria-label="Hatayı kapat" className="rounded p-0.5 hover:bg-destructive/10">
              <X className="size-4" />
            </button>
          </div>
        )}

        <div className="flex min-h-0 gap-3 rounded-xl border border-border bg-sidebar p-3">
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <span
              className={`flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-shadow ${
                konusuyor ? "ring-4 ring-primary/20" : ""
              }`}
              aria-hidden
            >
              <GraduationCap className="size-4" />
            </span>
            {konusuyor && (
              <span className="flex h-3 items-end gap-0.5" aria-label="Öğretmen konuşuyor" role="img">
                {[0, 0.15, 0.3, 0.45].map((g) => (
                  <span key={g} className="konusma-cubugu h-full w-0.5 rounded-full bg-primary" style={{ animationDelay: `${g}s` }} />
                ))}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1" aria-live="polite">
            {yukleniyor ? (
              <p className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {yukleniyor}
              </p>
            ) : mesaj ? (
              <>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span
                    className={`size-1.5 rounded-full ${
                      mesaj.tur === "cevap" ? "bg-success" : mesaj.tur === "bilgi" ? "bg-accent" : "bg-primary"
                    }`}
                    aria-hidden
                  />
                  <span className="truncate">{mesaj.tur === "cevap" ? "Öğretmenin cevabı" : mesaj.baslik}</span>
                </p>
                <p className="mt-1 text-pretty text-sm leading-relaxed">{mesaj.metin}</p>
              </>
            ) : (
              <p className="pt-2 text-sm text-muted-foreground">
                Soldan bir ünite seçip &quot;Bu Konuyu Tahtada Anlat&quot; deyin. Anlatım sırasında tahtaya istediğiniz gibi çizebilir, işaretleyebilirsiniz.
              </p>
            )}
          </div>
        </div>

        {miniSoru && (
          <div
            className={`flex items-start gap-2 rounded-md border p-2.5 text-sm ${
              soruBekliyor
                ? "border-accent bg-accent/30 text-accent-foreground shadow-[0_0_0_3px] shadow-accent/40"
                : "border-border bg-muted/50"
            }`}
          >
            <HelpCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <p className="font-medium">{miniSoru}</p>
              {soruBekliyor && (
                <p className="mt-0.5 text-xs opacity-80">
                  Öğretmen cevabını bekliyor. Yazın veya tahtada gösterin, sonra gönderin. Devam etmek için Oynat&apos;a basın.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          gonder();
        }}
      >
        <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label="Matematik ve fen sembolleri">
          {SEMBOLLER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => sembolEkle(s)}
              aria-label={`${s} sembolünü ekle`}
              className="flex h-7 min-w-7 items-center justify-center rounded border border-border bg-muted/60 px-1.5 font-mono text-sm hover:border-primary/40 hover:bg-primary/5"
            >
              {s}
            </button>
          ))}
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
            onClick={() => dosyaRef.current?.click()}
            className="ml-auto flex h-7 items-center gap-1.5 rounded border border-border px-2 text-xs font-medium hover:bg-muted"
          >
            <ImagePlus className="size-3.5" aria-hidden />
            Soru fotoğrafı
          </button>
        </div>
        {(fotograf || fotoHata) && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-1.5 text-xs">
            {fotograf ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fotograf.dataURL} alt="Yüklenen soru fotoğrafı önizlemesi" className="h-10 w-14 rounded object-cover" />
                <span className="flex-1 text-muted-foreground">Fotoğraf tahtanın soluna yerleşip yanında adım adım çözülecek.</span>
                <button
                  type="button"
                  onClick={() => setFotograf(null)}
                  aria-label="Fotoğrafı kaldır"
                  className="rounded p-1 hover:bg-muted"
                >
                  <X className="size-3.5" />
                </button>
              </>
            ) : (
              <span role="alert" className="text-destructive">
                {fotoHata}
              </span>
            )}
          </div>
        )}
        <label htmlFor="ogrenci-soru" className="sr-only">
          Sorunuz veya cevabınız
        </label>
        <textarea
          id="ogrenci-soru"
          ref={metinRef}
          value={metin}
          onChange={(e) => setMetin(e.target.value)}
          onPaste={(e) => {
            const dosya = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
            if (!dosya) return;
            e.preventDefault();
            fotografAl(dosya);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.shiftKey) return;
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            e.preventDefault();
            gonder();
          }}
          rows={3}
          placeholder={
            soruBekliyor
              ? "Cevabınızı yazın…"
              : "Anlamadığın yeri sor, tahtada işaretle ya da soru fotoğrafını yapıştır (Ctrl+V)…"
          }
          className="min-h-16 flex-1 resize-none rounded-md border border-border bg-background p-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={gonderiliyor}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {gonderiliyor ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
            Tahtayla Birlikte Gönder
          </button>
          {tamamlaGorunur && (
            <button
              type="button"
              onClick={onTamamla}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm font-medium text-success hover:bg-success/15"
            >
              <CheckCheck className="size-4" aria-hidden />
              Üniteyi Tamamla &amp; Sonrakine Geç
            </button>
          )}
          {testGorunur && (
            <button
              type="button"
              onClick={onTestOlustur}
              disabled={testYukleniyor}
              className="flex basis-full items-center justify-center gap-2 rounded-md border border-accent bg-accent/25 px-3 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/40 disabled:opacity-60"
            >
              {testYukleniyor ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <ClipboardList className="size-4" aria-hidden />
              )}
              3 Soruluk Mini Test Oluştur
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
