import { NextRequest, NextResponse } from "next/server";
import { readStore, writeStore, getEmptyData } from "@/lib/db";
import { FinanceData } from "@/lib/types";
import { getAuthUser } from "@/lib/server-auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let data = await readStore(user.id);
  // auto-generate monthly recurring (only if templates exist)
  const templates = data.transactions.filter((t) => t.recurring);
  if (templates.length === 0) {
    return NextResponse.json(data);
  }
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let changed = false;
  for (const tpl of templates) {
    const has = data.transactions.some(
      (t) =>
        t.date.startsWith(monthPrefix) &&
        t.type === tpl.type &&
        t.category === tpl.category &&
        t.amount === tpl.amount &&
        t.description === tpl.description
    );
    if (!has) {
      const day = Math.min(
        parseInt(tpl.date.slice(8, 10), 10) || 1,
        new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      );
      data.transactions.unshift({
        ...tpl,
        id: crypto.randomUUID(),
        date: `${monthPrefix}-${String(day).padStart(2, "0")}`,
        recurring: true,
      });
      changed = true;
    }
  }
  if (changed) await writeStore(user.id, data);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  let data = await readStore(user.id);

  // Free plan soft limits
  if (user.plan === "free" && body.action === "add_transaction") {
    if (data.transactions.length >= 200) {
      return NextResponse.json(
        { error: "Free plan limit: 200 transactions. Upgrade to Pro." },
        { status: 403 }
      );
    }
  }

  switch (body.action) {
    case "add_transaction": {
      const tx = { ...body.payload, id: crypto.randomUUID() };
      data.transactions.unshift(tx);
      const today = new Date().toISOString().slice(0, 10);
      const last = data.settings.lastLogDate || "";
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yKey = yesterday.toISOString().slice(0, 10);
      if (last !== today) {
        if (last === yKey) data.settings.streak = (data.settings.streak || 0) + 1;
        else data.settings.streak = 1;
        data.settings.lastLogDate = today;
        data.settings.bestStreak = Math.max(data.settings.bestStreak || 0, data.settings.streak);
        const badges = new Set(data.settings.badges || []);
        if (data.settings.streak >= 3) badges.add("streak_3");
        if (data.settings.streak >= 7) badges.add("streak_7");
        if (data.settings.streak >= 30) badges.add("streak_30");
        if (data.transactions.length >= 10) badges.add("ops_10");
        if (data.transactions.length >= 50) badges.add("ops_50");
        data.settings.badges = Array.from(badges);
      }
      break;
    }
    case "delete_transaction": {
      data.transactions = data.transactions.filter((t) => t.id !== body.id);
      break;
    }
    case "update_transaction": {
      data.transactions = data.transactions.map((tx) =>
        tx.id === body.id ? { ...tx, ...body.payload, id: tx.id } : tx
      );
      break;
    }
    case "add_goal": {
      data.goals.push({ ...body.payload, id: crypto.randomUUID() });
      break;
    }
    case "update_goal": {
      data.goals = data.goals.map((g) => (g.id === body.id ? { ...g, ...body.payload } : g));
      break;
    }
    case "delete_goal": {
      data.goals = data.goals.filter((g) => g.id !== body.id);
      break;
    }
    case "add_budget": {
      const existing = data.budgets.find((b) => b.category === body.payload.category);
      if (existing) {
        existing.limit = body.payload.limit;
        existing.period = body.payload.period;
      } else {
        data.budgets.push({ ...body.payload, id: crypto.randomUUID() });
      }
      break;
    }
    case "delete_budget": {
      data.budgets = data.budgets.filter((b) => b.id !== body.id);
      break;
    }
    case "update_settings": {
      data.settings = { ...data.settings, ...body.payload };
      break;
    }
    case "reset": {
      const def = getEmptyData();
      await writeStore(user.id, def);
      return NextResponse.json(def);
    }
    case "replace": {
      await writeStore(user.id, body.payload as FinanceData);
      return NextResponse.json(body.payload);
    }
    case "import_transactions": {
      if (user.plan === "free") {
        return NextResponse.json(
          { error: "CSV import is Pro. Upgrade or use Demo." },
          { status: 403 }
        );
      }
      const list = (body.payload || []) as FinanceData["transactions"];
      for (const tx of list) {
        data.transactions.unshift({ ...tx, id: crypto.randomUUID() });
      }
      break;
    }
    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }

  await writeStore(user.id, data);
  return NextResponse.json(data);
}
