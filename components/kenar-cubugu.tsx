"use client";

import { useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  ClipboardPaste,
  FileUp,
  Loader2,
  PanelLeftClose,
  Presentation,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { DersSecici } from "./ders-secici";
import { dersAdiTemizle } from "@/lib/dersler";
import { pdfMetinleriniCikar, sayfaOzeti, taranmisMi } from "@/lib/pdf-oku";
import type { PlanYaniti, SayfaMetni, Unite } from "@/lib/types";

type Props = {
  kitapAdi: string | null;
  kitapDersi: string | null;
  secilenDers: string;
  onDersDegis: (ders: string) => void;
  uniteler: Unite[];
  aktifUniteId: string | null;
  anlatimYukleniyor: boolean;
  onKapat: () => void;
  onKitapHazir: (kitapAdi: string, sayfalar: SayfaMetni[], uniteler: Unite[], ders: string) => void;
  onUniteSec: (id: string) => void;
  onUniteAnlat: (unite: Unite) => void;
  onMetinAnlat: (metin: string, ders: string) => void;
  onSifirla: () => void;
};

type Durum =
  | { tur: "bos" }
  | { tur: "okunuyor"; okunan: number; toplam: number }
  | { tur: "planlaniyor"; sayfaSayisi: number }
  | { tur: "hata"; mesaj: string }
  | { tur: "uyari"; mesaj: string };

export function KenarCubugu({
  kitapAdi,
  kitapDersi,
  secilenDers,
  onDersDegis,
  uniteler,
  aktifUniteId,
  anlatimYukleniyor,
  onKapat,
  onKitapHazir,
  onUniteSec,
  onUniteAnlat,
  onMetinAnlat,
  onSifirla,
}: Props) {
  const dosyaRef = useRef<HTMLInputElement>(null);
  const [durum, setDurum] = useState<Durum>({ tur: "bos" });
  const [yapistirAcik, setYapistirAcik] = useState(false);
  const [yapistirilan, setYapistirilan] = useState("");
  const [dersEksik, setDersEksik] = useState(false);
  const ders = dersAdiTemizle(secilenDers);

  function dersHazirMi() {
    if (ders) return true;
    setDersEksik(true);
    document.getElementById(document.getElementById("ozel-ders") ? "ozel-ders" : "ders-secimi")?.focus();
    return false;
  }

  const mesgul = durum.tur === "okunuyor" || durum.tur === "planlaniyor";
  const tamamlanan = uniteler.filter((u) => u.tamamlandi).length;

  async function pdfYukle(dosya: File) {
    if (dosya.type !== "application/pdf" && !dosya.name.toLowerCase().endsWith(".pdf")) {
      setDurum({ tur: "hata", mesaj: "Lütfen bir PDF dosyası seçin." });
      return;
    }
    setDurum({ tur: "okunuyor", okunan: 0, toplam: 0 });
    let sayfalar: SayfaMetni[];
    try {
      sayfalar = await pdfMetinleriniCikar(dosya, (okunan, toplam) =>
        setDurum({ tur: "okunuyor", okunan, toplam }),
      );
    } catch (hata) {
      console.error(hata);
      setDurum({ tur: "hata", mesaj: "PDF okunamadı. Dosya bozuk veya şifreli olabilir." });
      return;
    }

    if (taranmisMi(sayfalar)) {
      setDurum({
        tur: "uyari",
        mesaj:
          "Bu PDF taranmış görüntü olabilir: sayfaların çoğunda okunabilir metin yok. Metin içeren bir PDF yükleyin veya konuyu aşağıya yapıştırın.",
      });
      return;
    }

    const doluSayfalar = sayfalar.filter((s) => s.metin.trim().length > 0);
    setDurum({ tur: "planlaniyor", sayfaSayisi: sayfalar.length });
    try {
      const yanit = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ders,
          sayfalar: doluSayfalar.map((s) => ({ sayfaNo: s.sayfaNo, ozet: sayfaOzeti(s.metin) })),
        }),
      });
      const veri = (await yanit.json()) as PlanYaniti;
      if ("hata" in veri) {
        setDurum({ tur: "hata", mesaj: veri.hata });
        return;
      }
      onKitapHazir(dosya.name.replace(/\.pdf$/i, ""), sayfalar, veri.uniteler, ders);
      setDurum({ tur: "bos" });
    } catch {
      setDurum({ tur: "hata", mesaj: "Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin." });
    }
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-sidebar" aria-label="Ders planı">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Presentation className="size-4" aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Astral</p>
            <p className="text-xs text-muted-foreground">Kişisel tahta öğretmeni</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onKapat}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Kenar çubuğunu kapat"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      <div className="flex flex-col gap-3 border-b border-border p-4">
        <DersSecici
          deger={secilenDers}
          hatali={dersEksik && !ders}
          onDegis={(d) => {
            onDersDegis(d);
            if (dersAdiTemizle(d)) setDersEksik(false);
          }}
        />
        {dersEksik && !ders && (
          <p role="alert" className="-mt-1 text-xs text-destructive">
            Önce dersi seç ya da yaz; anlatım ve çizimler derse göre hazırlanır.
          </p>
        )}
        <input
          ref={dosyaRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => {
            const dosya = e.target.files?.[0];
            e.target.value = "";
            if (dosya) pdfYukle(dosya);
          }}
        />
        <button
          type="button"
          disabled={mesgul}
          onClick={() => {
            if (dersHazirMi()) dosyaRef.current?.click();
          }}
          className="flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {mesgul ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FileUp className="size-4" aria-hidden />}
          {kitapAdi ? "Başka PDF Yükle" : "Kitap PDF'i Yükle"}
        </button>

        {durum.tur === "okunuyor" && (
          <div className="flex flex-col gap-1.5" role="status">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>PDF okunuyor…</span>
              <span>
                {durum.okunan}/{durum.toplam || "?"}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${durum.toplam ? (durum.okunan / durum.toplam) * 100 : 3}%` }}
              />
            </div>
          </div>
        )}
        {durum.tur === "planlaniyor" && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            {durum.sayfaSayisi} sayfa okundu. Yapay zekâ ders planını çıkarıyor…
          </p>
        )}
        {(durum.tur === "hata" || durum.tur === "uyari") && (
          <p
            role="alert"
            className={`flex gap-2 rounded-md p-2.5 text-xs leading-relaxed ${
              durum.tur === "hata" ? "bg-destructive/10 text-destructive" : "bg-accent/40 text-accent-foreground"
            }`}
          >
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {durum.mesaj}
          </p>
        )}

        <button
          type="button"
          onClick={() => setYapistirAcik((a) => !a)}
          aria-expanded={yapistirAcik}
          className="flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          <ClipboardPaste className="size-4" aria-hidden />
          Metin / konu yapıştır
        </button>
        {yapistirAcik && (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (yapistirilan.trim() && dersHazirMi()) onMetinAnlat(yapistirilan.trim(), ders);
            }}
          >
            <label htmlFor="yapistir" className="sr-only">
              Anlatılacak metin veya konu
            </label>
            <textarea
              id="yapistir"
              value={yapistirilan}
              onChange={(e) => setYapistirilan(e.target.value)}
              rows={5}
              placeholder="Ders notunu, paragrafı ya da sadece konu adını yazın (ör. 'Newton'un hareket yasaları')"
              className="resize-y rounded-md border border-border bg-background p-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={!yapistirilan.trim() || anlatimYukleniyor}
              className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
            >
              Tahtada Anlat
            </button>
          </form>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {uniteler.length > 0 ? (
          <>
            <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold" title={kitapAdi ?? undefined}>
                  {kitapAdi ?? "Ders Planı"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {kitapDersi ? `${kitapDersi} · ` : ""}
                  {tamamlanan}/{uniteler.length} ünite tamamlandı
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Ders planı ve ilerleme silinsin mi?")) onSifirla();
                }}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Planı sıfırla"
                title="Planı sıfırla"
              >
                <RotateCcw className="size-4" />
              </button>
            </div>
            <div className="mx-4 mb-2 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-success transition-all"
                style={{ width: `${(tamamlanan / uniteler.length) * 100}%` }}
              />
            </div>
            <ol className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-4">
              {uniteler.map((u, i) => {
                const aktif = u.id === aktifUniteId;
                return (
                  <li key={u.id}>
                    <div
                      className={`rounded-md border transition-colors ${
                        aktif ? "border-primary/40 bg-primary/5" : "border-transparent hover:bg-muted"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onUniteSec(u.id)}
                        aria-current={aktif ? "true" : undefined}
                        className="flex w-full items-start gap-2 px-2 py-2 text-left"
                      >
                        {u.tamamlandi ? (
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label="Tamamlandı" />
                        ) : (
                          <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium leading-snug">
                            {i + 1}. {u.baslik}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Sayfa {u.sayfaBaslangic}–{u.sayfaBitis}
                          </span>
                        </span>
                      </button>
                      {aktif && (
                        <div className="flex flex-col gap-2 px-2 pb-2 pl-8">
                          {u.altKonular.length > 0 && (
                            <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                              {u.altKonular.map((k) => (
                                <li key={k} className="before:mr-1.5 before:content-['•']">
                                  {k}
                                </li>
                              ))}
                            </ul>
                          )}
                          <button
                            type="button"
                            disabled={anlatimYukleniyor}
                            onClick={() => onUniteAnlat(u)}
                            className="flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                          >
                            {anlatimYukleniyor ? (
                              <Loader2 className="size-3.5 animate-spin" aria-hidden />
                            ) : (
                              <Presentation className="size-3.5" aria-hidden />
                            )}
                            Bu Konuyu Tahtada Anlat
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
            <BookOpen className="size-8" aria-hidden />
            <p className="text-sm">Bir kitap PDF&apos;i yükleyin; yapay zekâ ünite ünite ders planını çıkarsın.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
