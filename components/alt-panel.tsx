"use client";

import { useState } from "react";
import { CheckCheck, GraduationCap, HelpCircle, Loader2, Send, TriangleAlert, X } from "lucide-react";

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
  onGonder: (metin: string) => Promise<boolean>;
  tamamlaGorunur: boolean;
  onTamamla: () => void;
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
}: Props) {
  const [metin, setMetin] = useState("");

  async function gonder() {
    if (gonderiliyor) return;
    const tamam = await onGonder(metin.trim());
    if (tamam) setMetin("");
  }

  return (
    <section
      aria-label="Öğretmen ve soru paneli"
      className="grid max-h-[45vh] shrink-0 grid-cols-1 gap-3 overflow-y-auto border-t border-border bg-background p-3 md:max-h-64 md:grid-cols-[1fr_minmax(320px,420px)]"
    >
      <div className="flex min-h-0 flex-col gap-2">
        {hata && (
          <div role="alert" className="flex items-start gap-2 rounded-md bg-destructive/10 p-2.5 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p className="flex-1">{hata}</p>
            <button type="button" onClick={onHataKapat} aria-label="Hatayı kapat" className="rounded p-0.5 hover:bg-destructive/10">
              <X className="size-4" />
            </button>
          </div>
        )}

        <div className="flex min-h-0 gap-3">
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground ${
              konusuyor ? "ring-4 ring-primary/20" : ""
            }`}
            aria-hidden
          >
            <GraduationCap className="size-4" />
          </span>
          <div className="min-w-0 flex-1" aria-live="polite">
            {yukleniyor ? (
              <p className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {yukleniyor}
              </p>
            ) : mesaj ? (
              <>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {mesaj.tur === "cevap" ? "Öğretmenin cevabı" : mesaj.baslik}
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
        <label htmlFor="ogrenci-soru" className="sr-only">
          Sorunuz veya cevabınız
        </label>
        <textarea
          id="ogrenci-soru"
          value={metin}
          onChange={(e) => setMetin(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.shiftKey) return;
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            e.preventDefault();
            gonder();
          }}
          rows={3}
          placeholder={soruBekliyor ? "Cevabınızı yazın…" : "Anlamadığın yeri sor ya da tahtada işaretleyip açıkla…"}
          className="min-h-20 flex-1 resize-none rounded-md border border-border bg-background p-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
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
        </div>
      </form>
    </section>
  );
}
