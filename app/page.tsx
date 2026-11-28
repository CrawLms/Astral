import { AI_AYARLARI } from "@/config/ai-config";
import { UygulamaYukleyici } from "@/components/uygulama-yukleyici";

export default function Page() {
  return <UygulamaYukleyici varsayilanModel={AI_AYARLARI.varsayilanModel} />;
}
