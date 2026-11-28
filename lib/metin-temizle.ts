// LaTeX'in düz yazı alanlarına (not, etiket, SVG <text>, konuşma) sızmasını ve JSON kaçış
// hatalarından doğan bozuk karakterleri temizler. Hem sunucuda hem istemcide kullanılır.

const KONTROL_KACISLARI: Record<string, string> = {
  "\t": "\\t",
  "\f": "\\f",
  "\b": "\\b",
  "\r": "\\r",
  "\v": "\\v",
};

// JSON.parse, "\text" -> TAB+"ext", "\frac" -> FF+"rac", "\nu" -> LF+"u" üretir. LaTeX'i onarır.
export function latexKacisOnar(latex: string): string {
  return latex
    .replace(/[\t\f\b\r\v](?=[a-zA-Z])/g, (k) => KONTROL_KACISLARI[k])
    .replace(/\n(?=(?:eq|u|abla|ot|otin|eg|e|i|ewline|leq|geq|mid|parallel|subseteq|exists|ewcommand)(?![a-zA-Z]))/g, "\\n")
    .replace(/\\\\(?=[a-zA-Z]{2,})/g, "\\")
    .replace(/[\t\f\b\r\v\n]+/g, " ")
    .trim();
}

const SEMBOLLER: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε", zeta: "ζ", eta: "η",
  theta: "θ", vartheta: "θ", iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", pi: "π",
  rho: "ρ", sigma: "σ", tau: "τ", upsilon: "υ", phi: "φ", varphi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π", Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
  cdot: "·", times: "×", div: "÷", pm: "±", mp: "∓", le: "≤", leq: "≤", ge: "≥", geq: "≥", neq: "≠", ne: "≠",
  approx: "≈", equiv: "≡", sim: "~", propto: "∝", infty: "∞", degree: "°", circ: "°", angle: "∠",
  rightarrow: "→", to: "→", Rightarrow: "⇒", leftarrow: "←", Leftarrow: "⇐", leftrightarrow: "↔",
  Leftrightarrow: "⇔", implies: "⇒", iff: "⇔", uparrow: "↑", downarrow: "↓", perp: "⊥", parallel: "∥",
  in: "∈", notin: "∉", subset: "⊂", subseteq: "⊆", cup: "∪", cap: "∩", emptyset: "∅", forall: "∀",
  exists: "∃", partial: "∂", nabla: "∇", sum: "Σ", prod: "Π", int: "∫", triangle: "△", ldots: "…",
  cdots: "⋯", dots: "…", therefore: "∴", because: "∵", neg: "¬", land: "∧", lor: "∨", prime: "′",
  sin: "sin", cos: "cos", tan: "tan", cot: "cot", log: "log", ln: "ln", lim: "lim", max: "max", min: "min",
  quad: " ", qquad: " ", ",": " ", ";": " ", "!": "", " ": " ", "%": "%", "$": "$", "&": "&", "{": "{", "}": "}",
};

const UST: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾", n: "ⁿ", i: "ⁱ", x: "ˣ", "°": "°",
};
const ALT: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
  "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎", a: "ₐ", e: "ₑ", o: "ₒ", x: "ₓ", n: "ₙ", m: "ₘ", k: "ₖ", t: "ₜ",
};

const kucukYaz = (ic: string, tablo: Record<string, string>, onEk: string) =>
  [...ic].every((c) => tablo[c]) ? [...ic].map((c) => tablo[c]).join("") : `${onEk}${ic.length > 1 ? `(${ic})` : ic}`;

const LATEX_IZI = /\\[a-zA-Z]+|\$|[\^_]\{|[a-zA-Z0-9)][\^_][a-zA-Z0-9]|[\t\f\b\v]/;

export function latexIziVar(metin: string) {
  return LATEX_IZI.test(metin);
}

// Düz yazı alanına sızmış LaTeX'i okunur Unicode metne çevirir: "\frac{1}{2} m v^2" -> "1/2 m v²".
export function duzYaziyaCevir(ham: string): string {
  if (!ham || !latexIziVar(ham)) return ham;
  let m = latexKacisOnar(ham).replace(/\$\$?/g, "");
  for (let tur = 0; tur < 4; tur++) {
    const onceki = m;
    m = m
      .replace(/\\(?:text|textbf|textit|mathrm|mathbf|mathit|operatorname|mbox|boldsymbol|mathsf)\s*\{([^{}]*)\}/g, "$1")
      .replace(/\\d?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_, a: string, b: string) => {
        const pay = /^[\w.²³]+$/.test(a.trim()) ? a.trim() : `(${a.trim()})`;
        const payda = /^[\w.²³]+$/.test(b.trim()) ? b.trim() : `(${b.trim()})`;
        return `${pay}/${payda}`;
      })
      .replace(/\\sqrt\s*\[([^\]]*)\]\s*\{([^{}]*)\}/g, (_, n: string, x: string) => `${kucukYaz(n, UST, "^")}√(${x})`)
      .replace(/\\sqrt\s*\{([^{}]*)\}/g, (_, x: string) => (/^\w+$/.test(x) ? `√${x}` : `√(${x})`))
      .replace(/\\(?:vec|overrightarrow)\s*\{([^{}]*)\}/g, "$1⃗")
      .replace(/\\(?:overline|bar)\s*\{([^{}]*)\}/g, "$1̄")
      .replace(/\\(?:hat|widehat)\s*\{([^{}]*)\}/g, "$1̂")
      .replace(/\\(?:underline|left|right|big|Big|bigg|Bigg|displaystyle|limits)\b/g, "")
      .replace(/\^\s*\{\\circ\}|\^\s*\\circ/g, "°")
      .replace(/\^\s*\{([^{}]*)\}/g, (_, x: string) => kucukYaz(x.trim(), UST, "^"))
      .replace(/_\s*\{([^{}]*)\}/g, (_, x: string) => kucukYaz(x.trim(), ALT, "_"));
    if (m === onceki) break;
  }
  m = m
    .replace(/\\([a-zA-Z]+|[,;! %$&{}])/g, (tam, ad: string) => SEMBOLLER[ad] ?? (/^[a-zA-Z]+$/.test(ad) ? "" : tam))
    .replace(/\^([a-zA-Z0-9+\-])/g, (_, x: string) => UST[x] ?? `^${x}`)
    .replace(/([a-zA-Z)])_([a-zA-Z0-9])/g, (_, a: string, x: string) => a + (ALT[x] ?? `_${x}`))
    .replace(/\\/g, "")
    .replace(/[{}]/g, "")
    .replace(/\s+([,.;:!?)])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return m;
}
