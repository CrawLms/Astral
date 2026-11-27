"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { CanliKatman } from "@/hooks/use-oynatici";

type Props = {
  apiRef: RefObject<ExcalidrawImperativeAPI | null>;
  canliRef: RefObject<CanliKatman>;
};

const KALEM_BOYUTU = 30;
const VURGU_BOSLUK = 14;

export function KalemKatmani({ apiRef, canliRef }: Props) {
  const kalemRef = useRef<HTMLDivElement>(null);
  const vurguRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let kare = 0;
    const dongu = () => {
      kare = requestAnimationFrame(dongu);
      const api = apiRef.current;
      const kalem = kalemRef.current;
      const vurgu = vurguRef.current;
      if (!api || !kalem || !vurgu) return;
      const { scrollX, scrollY, zoom } = api.getAppState();
      const z = zoom.value;
      const canli = canliRef.current;

      if (canli.kalem) {
        const x = (canli.kalem.x + scrollX) * z;
        const y = (canli.kalem.y + scrollY) * z;
        kalem.style.opacity = "1";
        kalem.style.transform = `translate(${x - 2}px, ${y - KALEM_BOYUTU + 4}px)`;
      } else {
        kalem.style.opacity = "0";
      }

      const v = canli.vurgu;
      if (v && performance.now() < v.bitis) {
        vurgu.style.opacity = "1";
        vurgu.style.transform = `translate(${(v.x + scrollX) * z - VURGU_BOSLUK}px, ${(v.y + scrollY) * z - VURGU_BOSLUK}px)`;
        vurgu.style.width = `${v.w * z + VURGU_BOSLUK * 2}px`;
        vurgu.style.height = `${v.h * z + VURGU_BOSLUK * 2}px`;
      } else {
        if (v) canli.vurgu = null;
        vurgu.style.opacity = "0";
      }
    };
    kare = requestAnimationFrame(dongu);
    return () => cancelAnimationFrame(kare);
  }, [apiRef, canliRef]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden" aria-hidden>
      <div
        ref={vurguRef}
        className="lazer-halkasi absolute left-0 top-0 rounded-[40%] border-[3px] border-[#e03131] opacity-0 transition-opacity duration-300"
      />
      <div
        ref={kalemRef}
        className="absolute left-0 top-0 select-none opacity-0 drop-shadow-md transition-opacity duration-150"
        style={{ fontSize: KALEM_BOYUTU, lineHeight: 1 }}
      >
        <span style={{ fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif' }}>{"✏️"}</span>
        <span className="absolute bottom-1 left-0.5 size-2 rounded-full bg-[#e03131] shadow-[0_0_8px_2px_rgb(255_80_80/0.7)]" />
      </div>
    </div>
  );
}
