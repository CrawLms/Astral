"use client";

import { useRef, useState } from "react";
import { Excalidraw, getSceneVersion } from "@excalidraw/excalidraw";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { BinaryFiles, ExcalidrawImperativeAPI, ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { ANAHTARLAR, oku, yaz } from "@/lib/depolama";

type Props = {
  onApi: (api: ExcalidrawImperativeAPI) => void;
};

type KayitliTahta = { elements: OrderedExcalidrawElement[]; files: BinaryFiles };

const KAYIT_GECIKMESI = 900;

export default function BeyazTahta({ onApi }: Props) {
  const zamanlayici = useRef<number | null>(null);
  const aktifApiId = useRef<string | null>(null);
  const sonSurum = useRef(-1);

  const [yukleme] = useState(() => {
    const durum = { yuklendi: false, veri: null as Promise<ExcalidrawInitialDataState> | null };
    durum.veri = oku<KayitliTahta | null>(ANAHTARLAR.tahta, null).then((kayit) => {
        durum.yuklendi = true;
        return {
          elements: kayit?.elements ?? [],
          files: kayit?.files ?? {},
          appState: {
            viewBackgroundColor: "transparent",
            currentItemStrokeColor: "#e03131",
            currentItemFontFamily: 1,
          },
          scrollToContent: true,
        };
      });
    return durum;
  });

  function kaydet(elements: readonly OrderedExcalidrawElement[], files: BinaryFiles) {
    if (!yukleme.yuklendi) return;
    const surum = getSceneVersion(elements);
    if (surum === sonSurum.current) return;
    if (zamanlayici.current !== null) window.clearTimeout(zamanlayici.current);
    zamanlayici.current = window.setTimeout(() => {
      sonSurum.current = surum;
      const canli = elements.filter((e) => !e.isDeleted);
      const kullanilan = new Set(canli.flatMap((e) => (e.type === "image" && e.fileId ? [e.fileId] : [])));
      const dosyalar: BinaryFiles = {};
      for (const [id, dosya] of Object.entries(files)) if (kullanilan.has(dosya.id)) dosyalar[id] = dosya;
      yaz(ANAHTARLAR.tahta, { elements: canli, files: dosyalar } satisfies KayitliTahta);
    }, KAYIT_GECIKMESI);
  }

  return (
    <div className="absolute inset-0">
      <Excalidraw
        excalidrawAPI={(api) => {
          // StrictMode constructs Excalidraw twice; only the mounted instance ever emits onChange.
          api.onChange(() => {
            if (aktifApiId.current === api.id) return;
            aktifApiId.current = api.id;
            onApi(api);
          });
        }}
        langCode="tr-TR"
        theme="light"
        initialData={yukleme.veri}
        onChange={(elements, _appState, files) => kaydet(elements, files)}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: false,
          },
        }}
      />
    </div>
  );
}
