"use client";

import { Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";

type Props = {
  onApi: (api: ExcalidrawImperativeAPI) => void;
};

export default function BeyazTahta({ onApi }: Props) {
  return (
    <div className="absolute inset-0">
      <Excalidraw
        excalidrawAPI={(api) => onApi(api)}
        langCode="tr-TR"
        theme="light"
        initialData={{
          appState: {
            viewBackgroundColor: "#ffffff",
            currentItemStrokeColor: "#e03131",
          },
        }}
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
