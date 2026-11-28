"use client";

import { useRef, useState } from "react";
import { Excalidraw, MainMenu, getSceneVersion } from "@excalidraw/excalidraw";
import { Moon, Sun } from "lucide-react";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { BinaryFiles, ExcalidrawImperativeAPI, ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { ANAHTARLAR, oku, yaz } from "@/lib/depolama";

export type Tema = "light" | "dark";

type Props = {
  onApi: (api: ExcalidrawImperativeAPI) => void;
  tema: Tema;
  onTemaDegistir: () => void;
};

type KayitliTahta = { elements: OrderedExcalidrawElement[]; files: BinaryFiles };

const KAYIT_GECIKMESI = 900;

export default function BeyazTahta({ onApi, tema, onTemaDegistir }: Props) {
  const zamanlayici = useRef<number | null>(null);
  const aktifApiId = useRef<string | null>(null);
  const sonApi = useRef<ExcalidrawImperativeAPI | null>(null);
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
          const etkinlestir = () => {
            if (aktifApiId.current === api.id) return;
            aktifApiId.current = api.id;
            onApi(api);
          };
          api.onChange(etkinlestir);
          sonApi.current = api;
          // onChange may never fire until the user touches the board; fall back to the latest constructed instance.
          window.setTimeout(() => {
            if (!aktifApiId.current && sonApi.current === api) etkinlestir();
          }, 400);
        }}
        langCode="tr-TR"
        theme={tema}
        initialData={yukleme.veri}
        onChange={(elements, _appState, files) => kaydet(elements, files)}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: false,
          },
        }}
      >
        <MainMenu>
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.SearchMenu />
          <MainMenu.DefaultItems.Help />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.Separator />
          <MainMenu.Item
            icon={tema === "dark" ? <Sun strokeWidth={1.75} /> : <Moon strokeWidth={1.75} />}
            onSelect={onTemaDegistir}
            aria-label={tema === "dark" ? "Gündüz moduna geç" : "Gece moduna geç"}
          >
            {tema === "dark" ? "Gündüz modu" : "Gece modu"}
          </MainMenu.Item>
          <MainMenu.Separator />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
        </MainMenu>
      </Excalidraw>
    </div>
  );
}
