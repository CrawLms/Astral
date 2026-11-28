import "server-only";

// Tüm yapay zekâ ayarlarının tek kaynağı. Yalnızca sunucuda okunur; istemci paketine girmez.
// apiKey boş bırakılırsa güvenlik için OPENAI_COMPAT_API_KEY sunucu değişkeni yedek olarak kullanılır,
// böylece gizli anahtarı herkese açık bir repoya yazmak zorunda kalmazsınız.
export const AI_AYARLARI = {
  baseUrl: "https://api.noxery.net/v1",
  apiKey: "",
  varsayilanModel: "gpt-6.1-sol",
  compat: {
    maxTokens: 16384,
    zamanAsimiMs: 280_000,
    modelListesiZamanAsimiMs: 20_000,
  },
} as const;
