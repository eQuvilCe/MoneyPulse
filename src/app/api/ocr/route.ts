import { dateKey } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, rateLimit } from "@/lib/server-auth";

type OcrResult = {
  ok: boolean;
  source: "vision" | "manual";
  amount: number;
  date: string;
  description: string;
  category: string;
  items: string[];
  currency: string;
  confidence?: number;
  note?: string;
  error?: string;
};

const CATEGORIES = [
  "еда",
  "транспорт",
  "развлечения",
  "жильё",
  "здоровье",
  "одежда",
  "образование",
  "подписки",
  "другое",
];

function normalizeCategory(c: string): string {
  const s = (c || "").toLowerCase().trim();
  const hit = CATEGORIES.find((x) => s.includes(x) || x.includes(s));
  if (hit) return hit;
  if (/food|cafe|restaurant|grocery|магазин|продукт/.test(s)) return "еда";
  if (/taxi|uber|metro|fuel|gas|транспорт/.test(s)) return "транспорт";
  if (/netflix|spotify|subscription|подписк/.test(s)) return "подписки";
  return "другое";
}

function parseOcrJson(text: string): Partial<OcrResult> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const p = JSON.parse(match[0]);
    const amount = Number(p.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return { error: "blurry_or_no_amount" };
    }
    const today = dateKey();
    let date = typeof p.date === "string" ? p.date.slice(0, 10) : today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = today;
    return {
      amount,
      date,
      description: String(p.merchant || p.description || "Чек").slice(0, 120),
      category: normalizeCategory(String(p.category || "другое")),
      items: Array.isArray(p.items) ? p.items.map(String).slice(0, 20) : [],
      currency: String(p.currency || "₽").slice(0, 4),
      confidence: typeof p.confidence === "number" ? p.confidence : undefined,
    };
  } catch {
    return { error: "invalid_json" };
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`ocr:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "OCR rate limit (10/min)" }, { status: 429 });
  }

  let body: { image?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const imageBase64 = body.image;
  if (!imageBase64 || imageBase64.length < 80) {
    return NextResponse.json({ error: "image base64 required" }, { status: 400 });
  }
  // ~4MB base64 guard
  if (imageBase64.length > 5_500_000) {
    return NextResponse.json({ error: "Image too large (max ~4MB)" }, { status: 413 });
  }

  const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.XAI_API_KEY;
  const base = process.env.AI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.AI_VISION_MODEL || process.env.AI_MODEL || "gpt-4o-mini";

  if (key) {
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          max_tokens: 500,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `Extract data from a store receipt photo. Reply ONLY a JSON object with keys:
amount (number, total paid), currency (string), date (YYYY-MM-DD), merchant (string), category (one of: ${CATEGORIES.join(", ")}), items (string array), confidence (0-1).
If the image is blurry, not a receipt, or total is unreadable: {"amount":0,"error":"unreadable","confidence":0}.`,
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Parse this receipt." },
                {
                  type: "image_url",
                  image_url: {
                    url: imageBase64.startsWith("data:")
                      ? imageBase64
                      : `data:image/jpeg;base64,${imageBase64}`,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        return NextResponse.json(
          {
            ok: false,
            source: "vision",
            amount: 0,
            date: dateKey(),
            description: "",
            category: "другое",
            items: [],
            currency: "₽",
            note: `Vision API error ${res.status}. Проверь ключ/модель или введи сумму вручную.`,
            error: errText.slice(0, 200),
          } satisfies OcrResult,
          { status: 200 }
        );
      }

      const json = await res.json();
      const text = json.choices?.[0]?.message?.content || "";
      const parsed = parseOcrJson(text);

      if (!parsed || parsed.error || !parsed.amount) {
        return NextResponse.json({
          ok: false,
          source: "vision",
          amount: 0,
          date: dateKey(),
          description: "",
          category: "другое",
          items: [],
          currency: "₽",
          confidence: 0,
          note: "Чек не прочитан (смазан / не чек). Пересними или введи сумму вручную.",
          error: parsed?.error || "unreadable",
        } satisfies OcrResult);
      }

      return NextResponse.json({
        ok: true,
        source: "vision",
        amount: parsed.amount!,
        date: parsed.date!,
        description: parsed.description!,
        category: parsed.category!,
        items: parsed.items || [],
        currency: parsed.currency || "₽",
        confidence: parsed.confidence,
      } satisfies OcrResult);
    } catch (e) {
      return NextResponse.json({
        ok: false,
        source: "vision",
        amount: 0,
        date: dateKey(),
        description: "",
        category: "другое",
        items: [],
        currency: "₽",
        note: "Сеть/API недоступны. Введи сумму вручную.",
        error: String(e).slice(0, 120),
      } satisfies OcrResult);
    }
  }

  return NextResponse.json({
    ok: true,
    source: "manual",
    amount: 0,
    date: dateKey(),
    description: "Чек (проверь сумму)",
    category: "еда",
    items: [],
    currency: "₽",
    note: "Добавь AI_API_KEY (vision) для авто-распознавания. Сейчас заполни поля вручную.",
  } satisfies OcrResult);
}
