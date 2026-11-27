import { apiIstegi, hataYaniti } from "@/lib/ai-yardimci";

export async function GET() {
  try {
    const yanit = await apiIstegi("/models", { method: "GET" }, 20_000);
    const data = await yanit.json().catch(() => null);
    const liste: unknown[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    const modeller = [
      ...new Set(
        liste
          .map((m) => (typeof m === "string" ? m : (m as { id?: unknown })?.id))
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    ].sort();
    return Response.json({ modeller });
  } catch (hata) {
    return hataYaniti(hata, "-");
  }
}
