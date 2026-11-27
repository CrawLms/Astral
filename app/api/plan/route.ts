import { hataYaniti, jsonCikar, modelSec, sohbetTamamla } from "@/lib/ai-yardimci";
import type { Unite } from "@/lib/types";

export const maxDuration = 300;

type GelenSayfa = { sayfaNo: number; ozet: string };

type HamUnite = {
  baslik?: string;
  sayfaBaslangic?: number;
  sayfaBitis?: number;
  altKonular?: string[];
};

const CHUNK_KARAKTER = 24_000;
const ES_ZAMANLI = 3;

const TALIMAT = `Sen deneyimli bir öğretmen ve müfredat planlayıcısısın.
Sana bir ders kitabının sayfa sayfa başlık/özet bilgileri veriliyor ("[Sayfa N] ..." biçiminde).
Görevin bu kitabı eksiksiz kapsayan bir DERS PLANI / KONU HARİTASI çıkarmaktır.

Kurallar:
- Her ünite/konu bir çalışma oturumunda anlatılabilecek büyüklükte olsun (genellikle 3-15 sayfa).
- İçindekiler, ön söz, kaynakça, cevap anahtarı gibi ders içermeyen sayfaları ünite yapma.
- sayfaBaslangic ve sayfaBitis verilen sayfa numaralarından olmalı, üniteler sırayla ve çakışmadan ilerlemeli.
- altKonular kısa Türkçe başlıklar olsun (2-8 adet).
- YALNIZCA şu JSON'u döndür, başka hiçbir şey yazma:
{"uniteler":[{"baslik":"...","sayfaBaslangic":1,"sayfaBitis":5,"altKonular":["...","..."]}]}`;

function chunklaraBol(sayfalar: GelenSayfa[]): GelenSayfa[][] {
  const parcalar: GelenSayfa[][] = [];
  let mevcut: GelenSayfa[] = [];
  let boyut = 0;
  for (const s of sayfalar) {
    const satirBoyu = s.ozet.length + 16;
    if (boyut + satirBoyu > CHUNK_KARAKTER && mevcut.length > 0) {
      parcalar.push(mevcut);
      mevcut = [];
      boyut = 0;
    }
    mevcut.push(s);
    boyut += satirBoyu;
  }
  if (mevcut.length) parcalar.push(mevcut);
  return parcalar;
}

async function parcayiPlanla(model: string, parca: GelenSayfa[], sira: number, toplam: number) {
  const ilk = parca[0].sayfaNo;
  const son = parca[parca.length - 1].sayfaNo;
  const icerik = parca.map((s) => `[Sayfa ${s.sayfaNo}] ${s.ozet}`).join("\n");
  const text = await sohbetTamamla(model, [
    { role: "system", content: TALIMAT },
    {
      role: "user",
      content: `Bu, kitabın ${toplam} parçasından ${sira + 1}. parçasıdır (sayfa ${ilk}-${son}). Yalnızca bu sayfa aralığındaki üniteleri çıkar.\n\n${icerik}`,
    },
  ]);
  const veri = jsonCikar<{ uniteler?: HamUnite[] }>(text);
  return (veri.uniteler ?? []).filter(
    (u) => u.baslik && Number.isFinite(u.sayfaBaslangic) && Number.isFinite(u.sayfaBitis),
  );
}

function normallestir(hamlar: HamUnite[], minSayfa: number, maxSayfa: number): Unite[] {
  const sirali = hamlar
    .map((u) => ({
      baslik: String(u.baslik).trim(),
      sayfaBaslangic: Math.max(minSayfa, Math.min(maxSayfa, Math.round(u.sayfaBaslangic!))),
      sayfaBitis: Math.max(minSayfa, Math.min(maxSayfa, Math.round(u.sayfaBitis!))),
      altKonular: Array.isArray(u.altKonular) ? u.altKonular.map(String).slice(0, 10) : [],
    }))
    .sort((a, b) => a.sayfaBaslangic - b.sayfaBaslangic);

  const birlesik: typeof sirali = [];
  for (const u of sirali) {
    const onceki = birlesik[birlesik.length - 1];
    if (onceki && onceki.baslik.toLocaleLowerCase("tr") === u.baslik.toLocaleLowerCase("tr")) {
      onceki.sayfaBitis = Math.max(onceki.sayfaBitis, u.sayfaBitis);
      onceki.altKonular = [...new Set([...onceki.altKonular, ...u.altKonular])];
      continue;
    }
    if (onceki && u.sayfaBaslangic <= onceki.sayfaBitis) {
      u.sayfaBaslangic = Math.min(onceki.sayfaBitis + 1, u.sayfaBitis);
    }
    if (u.sayfaBitis < u.sayfaBaslangic) u.sayfaBitis = u.sayfaBaslangic;
    birlesik.push(u);
  }

  return birlesik.map((u, i) => ({
    id: `u${i + 1}-${u.sayfaBaslangic}`,
    ...u,
    tamamlandi: false,
  }));
}

export async function POST(req: Request) {
  let govde: { sayfalar?: GelenSayfa[]; model?: string };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const sayfalar = (govde.sayfalar ?? [])
    .filter((s) => Number.isFinite(s?.sayfaNo) && typeof s?.ozet === "string")
    .map((s) => ({ sayfaNo: s.sayfaNo, ozet: s.ozet.slice(0, 600).replace(/\s+/g, " ").trim() }))
    .filter((s) => s.ozet.length > 0);

  if (sayfalar.length === 0) {
    return Response.json({ hata: "Planlanacak sayfa metni bulunamadı." }, { status: 400 });
  }

  const model = modelSec(govde.model);
  const parcalar = chunklaraBol(sayfalar);

  try {
    const sonuclar: HamUnite[][] = new Array(parcalar.length);
    for (let i = 0; i < parcalar.length; i += ES_ZAMANLI) {
      const grup = parcalar.slice(i, i + ES_ZAMANLI);
      const cikti = await Promise.all(
        grup.map((p, j) => parcayiPlanla(model, p, i + j, parcalar.length)),
      );
      cikti.forEach((c, j) => (sonuclar[i + j] = c));
    }

    const uniteler = normallestir(
      sonuclar.flat(),
      sayfalar[0].sayfaNo,
      sayfalar[sayfalar.length - 1].sayfaNo,
    );

    if (uniteler.length === 0) {
      return Response.json(
        { hata: "Yapay zekâ bu kitaptan ünite çıkaramadı. Farklı bir model deneyin." },
        { status: 422 },
      );
    }
    return Response.json({ uniteler });
  } catch (hata) {
    return hataYaniti(hata, model);
  }
}
