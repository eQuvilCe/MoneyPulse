"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FinanceData, CATEGORY_ICONS, CATEGORY_COLORS, formatMoney } from "@/lib/types";
import { periodRange, statsInRange } from "@/lib/insights";
import { useApp } from "@/components/AppProvider";

type FlowNode = { id: string; label: string; icon: string; amount: number; color: string; y: number };

const WIDTH = 640;
const HEIGHT = 360;
const PAD_Y = 36;
const LEFT_X = 54;
const POOL_X = WIDTH / 2;
const RIGHT_X = WIDTH - 54;
const MAX_NODES = 8;

function layout(items: { id: string; label: string; icon: string; amount: number; color: string }[]): FlowNode[] {
  if (items.length === 0) return [];
  const usable = HEIGHT - PAD_Y * 2;
  const step = usable / items.length;
  return items.map((it, i) => ({ ...it, y: PAD_Y + step * (i + 0.5) }));
}

function ribbonPath(x1: number, y1: number, x2: number, y2: number): string {
  const cx1 = x1 + (x2 - x1) * 0.5;
  const cx2 = x2 - (x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;
}

function Ribbon({
  d,
  color,
  width,
  dimmed,
  animate,
}: {
  d: string;
  color: string;
  width: number;
  dimmed: boolean;
  animate: boolean;
}) {
  return (
    <g style={{ transition: "opacity 0.25s" }} opacity={dimmed ? 0.15 : 1}>
      <path d={d} stroke={color} strokeOpacity={0.22} strokeWidth={width} fill="none" strokeLinecap="round" />
      {animate ? (
        <motion.path
          d={d}
          stroke={color}
          strokeOpacity={0.85}
          strokeWidth={Math.max(1.5, width * 0.35)}
          fill="none"
          strokeLinecap="round"
          strokeDasharray="5 13"
          animate={{ strokeDashoffset: [0, -36] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: "linear" }}
        />
      ) : (
        <path
          d={d}
          stroke={color}
          strokeOpacity={0.85}
          strokeWidth={Math.max(1.5, width * 0.35)}
          fill="none"
          strokeLinecap="round"
          strokeDasharray="5 13"
        />
      )}
    </g>
  );
}

function NodeLabel({
  node,
  align,
  dimmed,
  cur,
  onHover,
}: {
  node: FlowNode;
  align: "left" | "right";
  dimmed: boolean;
  cur: string;
  onHover: (id: string | null) => void;
}) {
  const x = align === "left" ? LEFT_X : RIGHT_X;
  const textAnchor = align === "left" ? "start" : "end";
  const dx = align === "left" ? 14 : -14;
  return (
    <g
      opacity={dimmed ? 0.35 : 1}
      style={{ cursor: "default", transition: "opacity 0.2s" }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
    >
      <circle cx={x} cy={node.y} r={10} fill={node.color} fillOpacity={0.9} />
      <text x={x} y={node.y - 14} textAnchor={textAnchor} className="fill-slate-200 text-[11px] font-medium">
        {node.icon} {node.label}
      </text>
      <text x={x + dx} y={node.y + 4} textAnchor={textAnchor} className="fill-slate-400 text-[10px] tabular-nums">
        {formatMoney(node.amount, cur)}
      </text>
    </g>
  );
}

function getReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export default function MoneyFlow({ data }: { data: FinanceData }) {
  const { tr } = useApp();
  const [hovered, setHovered] = useState<string | null>(null);
  const [reducedMotion] = useState(getReducedMotion);
  const cur = data.settings.currency || "₽";

  const { incomeItems, expenseItems, savings, hasAny } = useMemo(() => {
    const range = periodRange("this");
    const stats = statsInRange(data, range.start, range.end);

    const incomeByCategory: Record<string, number> = {};
    data.transactions
      .filter((t) => t.type === "income" && t.date >= range.start && t.date <= range.end)
      .forEach((t) => {
        incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
      });

    const toItems = (byCategory: Record<string, number>) =>
      Object.entries(byCategory)
        .filter(([, amount]) => amount > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_NODES)
        .map(([category, amount]) => ({
          id: category,
          label: category,
          icon: CATEGORY_ICONS[category] || "💳",
          amount,
          color: CATEGORY_COLORS[category] || "#38bdf8",
        }));

    const income = toItems(incomeByCategory);
    const expense = toItems(stats.byCategory);
    const net = stats.income - stats.expense;

    return {
      incomeItems: income,
      expenseItems: expense,
      savings: net > 0 ? net : 0,
      hasAny: income.length > 0 || expense.length > 0,
    };
  }, [data]);

  if (!hasAny) {
    return (
      <div className="flex h-52 flex-col items-center justify-center gap-1.5 text-center">
        <p className="text-sm text-slate-500">{tr("moneyFlowEmpty")}</p>
        <p className="text-xs text-slate-600">{tr("moneyFlowEmptyHint")}</p>
      </div>
    );
  }

  const rightItemsRaw = savings > 0
    ? [...expenseItems, { id: "__savings", label: tr("moneyFlowSavings"), icon: "🏦", amount: savings, color: "#34d399" }]
    : expenseItems;

  const incomeNodes = layout(incomeItems);
  const rightNodes = layout(rightItemsRaw);

  const maxLeft = Math.max(1, ...incomeItems.map((i) => i.amount));
  const maxRight = Math.max(1, ...rightItemsRaw.map((i) => i.amount));
  const widthFor = (amount: number, max: number) => 2 + (amount / max) * 16;

  const poolY = HEIGHT / 2;
  const anyHover = hovered !== null;
  const dim = (id: string) => anyHover && hovered !== id;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-[260px] w-full min-w-[480px] sm:h-[320px]">
        {/* left: income -> pool */}
        {incomeNodes.map((n) => (
          <Ribbon
            key={`l-${n.id}`}
            d={ribbonPath(LEFT_X + 10, n.y, POOL_X, poolY)}
            color={n.color}
            width={widthFor(n.amount, maxLeft)}
            dimmed={dim(n.id)}
            animate={!reducedMotion}
          />
        ))}
        {/* right: pool -> expenses/savings */}
        {rightNodes.map((n) => (
          <Ribbon
            key={`r-${n.id}`}
            d={ribbonPath(POOL_X, poolY, RIGHT_X - 10, n.y)}
            color={n.color}
            width={widthFor(n.amount, maxRight)}
            dimmed={dim(n.id)}
            animate={!reducedMotion}
          />
        ))}
        {/* pool hub */}
        <circle cx={POOL_X} cy={poolY} r={7} fill="var(--page-accent, #38bdf8)" fillOpacity={0.9} />
        <circle cx={POOL_X} cy={poolY} r={16} fill="var(--page-accent, #38bdf8)" fillOpacity={0.15} />

        {incomeNodes.map((n) => (
          <NodeLabel key={`nl-${n.id}`} node={n} align="left" dimmed={dim(n.id)} cur={cur} onHover={setHovered} />
        ))}
        {rightNodes.map((n) => (
          <NodeLabel key={`nr-${n.id}`} node={n} align="right" dimmed={dim(n.id)} cur={cur} onHover={setHovered} />
        ))}
      </svg>
    </div>
  );
}
