"use client";

import { useEffect, useState, useRef } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useApp } from "@/components/AppProvider";

interface Slice {
  name: string;
  value: number;
  color: string;
}

export default function LivePieChart({ data }: { data: Slice[] }) {
  const { tr, lang } = useApp();
  const locale = lang === "en" ? "en-US" : "ru-RU";
  const [tick, setTick] = useState(0);
  const prev = useRef(JSON.stringify(data));

  useEffect(() => {
    const s = JSON.stringify(data);
    if (s !== prev.current) {
      prev.current = s;
      setTick((t) => t + 1);
    }
  }, [data]);

  if (!data.length) {
    return <p className="py-10 text-center text-sm text-slate-600">{tr("noData")}</p>;
  }

  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart key={tick}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={42}
            outerRadius={68}
            paddingAngle={3}
            isAnimationActive
            animationDuration={1000}
          >
            {data.map((e, i) => (
              <Cell key={i} fill={e.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, fontSize: 12 }}
            formatter={(v: number) => `${Number(v).toLocaleString(locale)} ₽`}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
