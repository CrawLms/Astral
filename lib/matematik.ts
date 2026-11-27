type Fonk = (x: number) => number;

const FONKSIYONLAR: Record<string, (a: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sqrt: Math.sqrt,
  kok: Math.sqrt,
  abs: Math.abs,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
};

const SABITLER: Record<string, number> = { pi: Math.PI, e: Math.E };

type Belirtec = { tur: "sayi"; deger: number } | { tur: "ad"; deger: string } | { tur: "op"; deger: string };

function belirtecle(ifade: string): Belirtec[] {
  const temiz = ifade
    .replace(/Math\./g, "")
    .replace(/\*\*/g, "^")
    .replace(/π/g, "pi")
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–]/g, "-")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/√/g, "sqrt")
    .replace(/^\s*[yf]\s*(\(\s*x\s*\))?\s*=/i, "")
    .toLowerCase();
  const sonuc: Belirtec[] = [];
  let i = 0;
  while (i < temiz.length) {
    const c = temiz[i];
    if (/\s/.test(c)) {
      i++;
    } else if (/[\d.]/.test(c)) {
      let j = i;
      while (j < temiz.length && /[\d.]/.test(temiz[j])) j++;
      const deger = Number(temiz.slice(i, j));
      if (!Number.isFinite(deger)) throw new Error("Geçersiz sayı");
      sonuc.push({ tur: "sayi", deger });
      i = j;
    } else if (/[a-z]/.test(c)) {
      let j = i;
      while (j < temiz.length && /[a-z]/.test(temiz[j])) j++;
      const ad = temiz.slice(i, j);
      if (ad === "x" || ad in SABITLER || ad in FONKSIYONLAR) sonuc.push({ tur: "ad", deger: ad });
      else if ([...ad].every((h) => h === "x")) for (const _ of ad) sonuc.push({ tur: "ad", deger: "x" });
      else throw new Error(`Bilinmeyen ad: ${ad}`);
      i = j;
    } else if ("+-*/^(),".includes(c)) {
      sonuc.push({ tur: "op", deger: c });
      i++;
    } else {
      throw new Error(`Geçersiz karakter: ${c}`);
    }
  }
  return sonuc;
}

export function ifadeDerle(ifade: string): Fonk | null {
  let b: Belirtec[];
  try {
    b = belirtecle(ifade.slice(0, 200));
  } catch {
    return null;
  }
  let k = 0;
  const bak = () => b[k];
  const opMu = (d: string) => bak()?.tur === "op" && bak()?.deger === d;

  const carpimBaslarMi = () => {
    const t = bak();
    return t && (t.tur === "sayi" || t.tur === "ad" || (t.tur === "op" && t.deger === "("));
  };

  function toplam(): Fonk {
    let sol = carpim();
    while (opMu("+") || opMu("-")) {
      const op = b[k++].deger;
      const a = sol;
      const s = carpim();
      sol = op === "+" ? (x) => a(x) + s(x) : (x) => a(x) - s(x);
    }
    return sol;
  }
  function carpim(): Fonk {
    let sol = tekli();
    for (;;) {
      if (opMu("*") || opMu("/")) {
        const op = b[k++].deger;
        const a = sol;
        const s = tekli();
        sol = op === "*" ? (x) => a(x) * s(x) : (x) => a(x) / s(x);
      } else if (carpimBaslarMi()) {
        const a = sol;
        const s = us();
        sol = (x) => a(x) * s(x);
      } else return sol;
    }
  }
  function tekli(): Fonk {
    if (opMu("-")) {
      k++;
      const a = tekli();
      return (x) => -a(x);
    }
    if (opMu("+")) {
      k++;
      return tekli();
    }
    return us();
  }
  function us(): Fonk {
    const taban = temel();
    if (opMu("^")) {
      k++;
      const ust = tekli();
      return (x) => Math.pow(taban(x), ust(x));
    }
    return taban;
  }
  function temel(): Fonk {
    const t = b[k++];
    if (!t) throw new Error("Eksik ifade");
    if (t.tur === "sayi") return () => t.deger;
    if (t.tur === "ad") {
      if (t.deger === "x") return (x) => x;
      if (t.deger in SABITLER) return () => SABITLER[t.deger];
      const f = FONKSIYONLAR[t.deger];
      let arg: Fonk;
      if (opMu("(")) {
        k++;
        arg = toplam();
        if (!opMu(")")) throw new Error("Kapanmayan parantez");
        k++;
      } else {
        arg = us();
      }
      return (x) => f(arg(x));
    }
    if (t.deger === "(") {
      const ic = toplam();
      if (!opMu(")")) throw new Error("Kapanmayan parantez");
      k++;
      return ic;
    }
    throw new Error("Beklenmeyen işaret");
  }

  try {
    const f = toplam();
    if (k !== b.length) return null;
    return f;
  } catch {
    return null;
  }
}

export function guzelAdim(aralik: number, hedef = 8) {
  const kaba = aralik / hedef;
  const us10 = Math.pow(10, Math.floor(Math.log10(kaba)));
  const oran = kaba / us10;
  return (oran < 1.5 ? 1 : oran < 3 ? 2 : oran < 7 ? 5 : 10) * us10;
}
