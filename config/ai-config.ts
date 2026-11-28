import "server-only";

// Tüm yapay zekâ ayarlarının tek kaynağı. Yalnızca sunucuda okunur; istemci paketine girmez.
// apiKey boş bırakılırsa güvenlik için OPENAI_COMPAT_API_KEY sunucu değişkeni yedek olarak kullanılır,
// böylece gizli anahtarı herkese açık bir repoya yazmak zorunda kalmazsınız.
export const AI_AYARLARI = {
  baseUrl: "https://api.noxery.net/v1",
  apiKey: "nox-565160dea3276d344adfd28db25c5ddedb40abe9fd643326",
  varsayilanModel: "gpt-6-astra",
  compat: {
    maxTokens: 16384,
    zamanAsimiMs: 280_000,
    modelListesiZamanAsimiMs: 20_000,
  },
} as const;
