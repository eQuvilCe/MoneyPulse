import { NextRequest, NextResponse } from "next/server";
import { readStore } from "@/lib/db";
import {
  generateAIAnalysis,
  getDoctorGreeting,
  answerAIChat,
  getQuickInsights,
  getHealthScore,
  generateDailyBriefing,
} from "@/lib/ai";
import { getAuthUser, rateLimit } from "@/lib/server-auth";

async function callLLM(message: string, context: string): Promise<string | null> {
  const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.XAI_API_KEY;
  if (!key) return null;
  const base = process.env.AI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 600,
        messages: [
          {
            role: "system",
            content:
              "Ты MoneyPulse AI. Отвечай кратко, с цифрами из контекста. Не выдумывай операции.",
          },
          { role: "user", content: `Контекст:\n${context}\n\nВопрос: ${message}` },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

function buildContext(data: Awaited<ReturnType<typeof readStore>>): string {
  const income = data.transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = data.transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const recent = data.transactions
    .slice(0, 12)
    .map((t) => `${t.date} ${t.type} ${t.amount} ${t.category} ${t.description}`)
    .join("\n");
  return `Баланс ${income - expense}, доход ${income}, расход ${expense}, стрик ${data.settings.streak || 0}\n${recent}`;
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await readStore(user.id);
  return NextResponse.json({
    advice: generateAIAnalysis(data),
    greeting: getDoctorGreeting(data),
    insights: getQuickInsights(data),
    health: getHealthScore(data),
    briefing: generateDailyBriefing(data),
    llm: Boolean(process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.XAI_API_KEY),
    plan: user.plan,
  });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Per-minute rate limit
  const limit = user.plan === "pro" || user.plan === "demo" ? 60 : 20;
  if (!rateLimit(`ai:${user.id}`, limit, 60_000)) {
    return NextResponse.json(
      { error: "AI rate limit. Free: 20/min, Pro: 60/min. Try later." },
      { status: 429 }
    );
  }

  // Freemium: monthly AI chat quota (in-memory + cookie-backed map)
  const monthlyCap = parseInt(process.env.FREE_AI_MONTHLY_LIMIT || "10", 10);
  if (user.plan === "free") {
    const monthKey = new Date().toISOString().slice(0, 7);
    const qKey = `ai-month:${user.id}:${monthKey}`;
    if (!rateLimit(qKey, monthlyCap, 40 * 24 * 60 * 60 * 1000)) {
      return NextResponse.json(
        {
          error: `Free plan: ${monthlyCap} AI-запросов в месяц. Upgrade to Pro для безлимита.`,
          code: "AI_QUOTA",
        },
        { status: 402 }
      );
    }
  }

  const body = await req.json();
  const data = await readStore(user.id);
  const message = (body.message || body.question || "") as string;
  if (!message.trim()) {
    return NextResponse.json({ error: "empty message" }, { status: 400 });
  }

  // Free: rules only unless demo; Pro gets LLM
  let llmReply: string | null = null;
  if (user.plan === "pro" || user.plan === "demo") {
    llmReply = await callLLM(message, buildContext(data));
  }
  const reply = llmReply || answerAIChat(message, data);

  return NextResponse.json({
    reply,
    source: llmReply ? "llm" : "rules",
    health: getHealthScore(data),
    insights: getQuickInsights(data),
    plan: user.plan,
  });
}
