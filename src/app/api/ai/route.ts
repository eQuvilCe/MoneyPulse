import { NextRequest, NextResponse } from "next/server";
import { readStore, consumeMonthlyAiQuota } from "@/lib/db";
import {
  generateAIAnalysis,
  getDoctorGreeting,
  answerAIChat,
  getQuickInsights,
  getHealthScore,
  generateDailyBriefing,
  ChatMessage,
} from "@/lib/ai";
import { getAuthUser, rateLimit } from "@/lib/server-auth";
import { apiError } from "@/lib/api-errors";

const SYSTEM_PROMPT = `Ты MoneyPulse AI — личный финансовый помощник в приложении MoneyPulse (Узбекистан).
Отвечай кратко (3-6 предложений, можно с буллитами), по делу, с конкретными цифрами из контекста ниже.
Никогда не выдумывай операции, суммы или категории, которых нет в контексте — если данных не хватает, так и скажи.
Давай конкретные, действенные советы (сколько и где можно сэкономить), а не общие фразы.
Учитывай предыдущие сообщения в диалоге — если пользователь продолжает тему, не повторяйся.
Отвечай на языке вопроса пользователя (русский или английский).`;

async function callLLM(
  message: string,
  context: string,
  history: ChatMessage[]
): Promise<string | null> {
  const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.XAI_API_KEY;
  if (!key) return null;
  const base = process.env.AI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  try {
    // Last 10 turns is plenty of context for a budgeting chat and keeps token usage bounded.
    const priorTurns = history.slice(-10).map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.text,
    }));
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 700,
        messages: [
          { role: "system", content: `${SYSTEM_PROMPT}\n\nКонтекст (данные пользователя):\n${context}` },
          ...priorTurns,
          { role: "user", content: message },
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
  const byCategory: Record<string, number> = {};
  data.transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });
  const topCats = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([c, a]) => `${c}: ${a}`)
    .join(", ");
  const recent = data.transactions
    .slice(0, 15)
    .map((t) => `${t.date} ${t.type} ${t.amount} ${t.category} "${t.description}"`)
    .join("\n");
  const goals = data.goals
    .map((g) => `${g.title}: ${g.currentAmount}/${g.targetAmount}${g.deadline ? ` до ${g.deadline}` : ""}`)
    .join("; ");
  const budgets = data.budgets.map((b) => `${b.category}: лимит ${b.limit}/${b.period}`).join("; ");
  const accounts = (data.accounts || []).map((a) => `${a.name} (${a.type}): ${a.balance}`).join("; ");
  const today = new Date().toISOString().slice(0, 10);

  return [
    `Сегодня: ${today}. Валюта: ${data.settings.currency}.`,
    `Баланс: ${income - expense}. Доход всего: ${income}. Расход всего: ${expense}.`,
    `Цель по сбережениям: ${data.settings.savingsTargetPercent}%. Стрик логирования: ${data.settings.streak || 0} дн.`,
    topCats ? `Топ категорий расходов: ${topCats}.` : "Трат пока нет.",
    goals ? `Цели: ${goals}.` : "Целей нет.",
    budgets ? `Бюджеты: ${budgets}.` : "Бюджеты не заданы.",
    accounts ? `Счета: ${accounts}.` : "Счетов нет.",
    `Последние операции:\n${recent || "нет операций"}`,
  ].join("\n");
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
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
  } catch (e) {
    return apiError(e);
  }
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

  try {
    // Freemium: monthly AI chat quota, persisted on User.aiUsedMonth/aiMonthKey (survives cold starts).
    const monthlyCap = parseInt(process.env.FREE_AI_MONTHLY_LIMIT || "10", 10);
    if (user.plan === "free") {
      const quota = await consumeMonthlyAiQuota(user.id, monthlyCap);
      if (!quota.allowed) {
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
    const history = Array.isArray(body.history) ? (body.history as ChatMessage[]) : [];
    if (!message.trim()) {
      return NextResponse.json({ error: "empty message" }, { status: 400 });
    }

    // Free: rules only unless demo; Pro gets LLM
    let llmReply: string | null = null;
    if (user.plan === "pro" || user.plan === "demo") {
      llmReply = await callLLM(message, buildContext(data), history);
    }
    const reply = llmReply || answerAIChat(message, data);

    return NextResponse.json({
      reply,
      source: llmReply ? "llm" : "rules",
      health: getHealthScore(data),
      insights: getQuickInsights(data),
      plan: user.plan,
    });
  } catch (e) {
    return apiError(e);
  }
}
