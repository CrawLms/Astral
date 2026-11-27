"use client";

import { useState } from "react";
import {
  Cpu,
  Eraser,
  PanelLeftOpen,
  Pause,
  Play,
  RefreshCw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";

type Props = {
  kenarAcik: boolean;
  onKenarAc: () => void;
  baslik: string | null;
  sahneSayisi: number;
  aktif: number;
  oynatiliyor: boolean;
  sesAcik: boolean;
  model: string;
  onOynat: () => void;
  onDuraklat: () => void;
  onOnceki: () => void;
  onSonraki: () => void;
  onSes: () => void;
  onTemizle: () => void;
  onModel: (model: string) => void;
};

const HAZIR_MODELLER = [
  "gpt-6.1-sol",
  "gpt-6-astra",
  "gpt-6-sol",
  "gpt-5.6-sol",
  "gpt-6-luna",
  "gemini-3.8-flash",
];

function AracButonu({
  etiket,
  onClick,
  disabled,
  vurgulu,
  children,
}: {
  etiket: string;
  onClick: () => void;
  disabled?: boolean;
  vurgulu?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={etiket}
      title={etiket}
      className={`flex size-9 items-center justify-center rounded-md transition-colors disabled:opacity-40 ${
        vurgulu
          ? "bg-primary text-primary-foreground hover:opacity-90"
          : "text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

export function UstCubuk(p: Props) {
  const [modelTaslak, setModelTaslak] = useState(p.model);
  const [canliModeller, setCanliModeller] = useState<string[]>([]);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [modelDurumu, setModelDurumu] = useState<string | null>(null);
  const sahneVar = p.sahneSayisi > 0;
  const modelSecenekleri = [...new Set([...HAZIR_MODELLER, ...canliModeller])];

  async function modelleriYenile() {
    setYenileniyor(true);
    setModelDurumu(null);
    try {
      const yanit = await fetch("/api/models", { cache: "no-store" });
      const veri = await yanit.json().catch(() => ({}));
      if (!yanit.ok) throw new Error(veri.hata ?? `HTTP ${yanit.status}`);
      const liste: string[] = Array.isArray(veri.modeller) ? veri.modeller : [];
      setCanliModeller(liste);
      setModelDurumu(`${liste.length} model bulundu`);
    } catch (hata) {
      const mesaj = hata instanceof Error ? hata.message : String(hata);
      setModelDurumu("Liste alınamadı");
      window.alert(`Modeller yenilenemedi: ${mesaj}`);
    } finally {
      setYenileniyor(false);
    }
  }

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-border bg-background px-3 py-2">
      {!p.kenarAcik && (
        <AracButonu etiket="Ders planını aç" onClick={p.onKenarAc}>
          <PanelLeftOpen className="size-4" />
        </AracButonu>
      )}

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold">{p.baslik ?? "Beyaz Tahta"}</h1>
        <p className="text-xs text-muted-foreground">
          {sahneVar ? `Sahne ${Math.max(p.aktif + 1, 0)} / ${p.sahneSayisi}` : "Bir ünite seçin ya da tahtaya serbestçe çizin"}
        </p>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-border p-1" role="toolbar" aria-label="Anlatım kontrolleri">
        <AracButonu etiket="Önceki sahne" onClick={p.onOnceki} disabled={!sahneVar || p.aktif <= 0}>
          <SkipBack className="size-4" />
        </AracButonu>
        {p.oynatiliyor ? (
          <AracButonu etiket="Duraklat" onClick={p.onDuraklat} vurgulu>
            <Pause className="size-4" />
          </AracButonu>
        ) : (
          <AracButonu etiket="Oynat" onClick={p.onOynat} disabled={!sahneVar} vurgulu>
            <Play className="size-4" />
          </AracButonu>
        )}
        <AracButonu
          etiket="Sonraki sahne"
          onClick={p.onSonraki}
          disabled={!sahneVar || p.aktif >= p.sahneSayisi - 1}
        >
          <SkipForward className="size-4" />
        </AracButonu>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <AracButonu etiket={p.sesAcik ? "Sesi kapat" : "Sesi aç"} onClick={p.onSes}>
          {p.sesAcik ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
        </AracButonu>
        <AracButonu
          etiket="Tahtayı temizle"
          onClick={() => {
            if (window.confirm("Tahtadaki tüm çizimler silinsin mi?")) p.onTemizle();
          }}
        >
          <Eraser className="size-4" />
        </AracButonu>
      </div>

      <form
        className="flex items-center gap-1.5 rounded-lg border border-border py-1 pl-2 pr-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (modelTaslak.trim()) p.onModel(modelTaslak.trim());
        }}
      >
        <Cpu className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <label htmlFor="model-id" className="sr-only">
          Yapay zekâ model ID
        </label>
        <input
          id="model-id"
          list="hazir-modeller"
          value={modelTaslak}
          onChange={(e) => setModelTaslak(e.target.value)}
          onBlur={() => modelTaslak.trim() && p.onModel(modelTaslak.trim())}
          spellCheck={false}
          className="w-44 bg-transparent font-mono text-xs outline-none"
          placeholder="model-id"
        />
        <datalist id="hazir-modeller">
          {modelSecenekleri.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={modelleriYenile}
          disabled={yenileniyor}
          aria-label="Modelleri Yenile"
          title={modelDurumu ?? "Modelleri Yenile"}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${yenileniyor ? "animate-spin" : ""}`} />
        </button>
        <span className="sr-only" role="status">
          {modelDurumu}
        </span>
        <button
          type="submit"
          className="rounded-md bg-muted px-2 py-1 text-xs font-medium hover:bg-border"
        >
          Uygula
        </button>
      </form>
    </header>
  );
}
