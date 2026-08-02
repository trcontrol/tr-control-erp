"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ExecutiveDashboard } from "@/types/database";
import {
  dayBucketLabel,
  formatCurrency,
  toNumberAmount,
} from "@/lib/dashboard/format";

type ExecutiveCashFlowChartProps = {
  series: ExecutiveDashboard["cash_flow_series"];
};

type CashFlowPoint = {
  bucket: string;
  label: string;
  inflows: number;
  outflows: number;
};

/** Paleta exclusiva de Entradas e saídas — identidade TR Control. */
const CF = {
  navy: "#11203b",
  green: "#6a9e88",
  greenSoft: "#8bb5a3",
  rosa: "#a84568",
  rosaSoft: "#c05c7d",
  dourado: "#c89b3c",
  cinza: "#b6b6b6",
} as const;

type CashFlowTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: Array<{
    dataKey?: string | number;
    value?: number | string;
    name?: string | number;
  }>;
};

function formatCompactCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `R$ ${(value / 1_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 0,
    })}k`;
  }
  return formatCurrency(value);
}

function CashFlowTooltip({ active, payload, label }: CashFlowTooltipProps) {
  if (!active || !payload?.length) return null;

  const inflows = Number(
    payload.find((item) => item.dataKey === "inflows")?.value ?? 0
  );
  const outflows = Number(
    payload.find((item) => item.dataKey === "outflows")?.value ?? 0
  );
  const result = inflows - outflows;

  return (
    <div
      className="rounded-xl border border-[#11203b]/[0.07] bg-[#fffdfd] px-3.5 py-2.5 shadow-[0_4px_16px_rgb(17_32_59/0.09)]"
      style={{ fontSize: 12 }}
    >
      <p className="text-[11px] font-semibold tracking-wide text-[#11203b]/55">
        Dia {String(label ?? "")}
      </p>
      <div className="mt-2 space-y-1.5">
        <p className="flex items-center justify-between gap-6">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#11203b]/70">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: CF.green }}
            />
            Entradas
          </span>
          <span className="text-[12.5px] font-bold tabular-nums tracking-tight text-[#11203b]">
            {formatCurrency(inflows)}
          </span>
        </p>
        <p className="flex items-center justify-between gap-6">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#11203b]/70">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: CF.rosa }}
            />
            Saídas
          </span>
          <span className="text-[12.5px] font-bold tabular-nums tracking-tight text-[#11203b]">
            {formatCurrency(outflows)}
          </span>
        </p>
        <p className="flex items-center justify-between gap-6 border-t border-[#11203b]/[0.06] pt-1.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#c89b3c]">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: CF.dourado }}
            />
            Resultado
          </span>
          <span className="text-[12.5px] font-extrabold tabular-nums tracking-tight text-[#c89b3c]">
            {formatCurrency(result)}
          </span>
        </p>
      </div>
    </div>
  );
}

export function ExecutiveCashFlowChart({ series }: ExecutiveCashFlowChartProps) {
  const data = useMemo<CashFlowPoint[]>(
    () =>
      series.map((point) => ({
        bucket: point.bucket,
        label: dayBucketLabel(point.bucket),
        inflows: toNumberAmount(point.inflows),
        outflows: toNumberAmount(point.outflows),
      })),
    [series]
  );

  const totals = useMemo(() => {
    return data.reduce(
      (acc, point) => ({
        inflows: acc.inflows + point.inflows,
        outflows: acc.outflows + point.outflows,
      }),
      { inflows: 0, outflows: 0 }
    );
  }, [data]);

  const result = totals.inflows - totals.outflows;

  if (!data.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        Sem movimentos realizados no mês para o gráfico.
      </div>
    );
  }

  const tickInterval =
    data.length <= 8 ? 0 : data.length <= 16 ? 1 : Math.ceil(data.length / 8);

  return (
    <div className="w-full min-w-0 space-y-5 overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
        <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-[#11203b]/80">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: CF.green }}
          />
          Entradas{" "}
          <span className="font-extrabold tabular-nums tracking-tight text-[#11203b]">
            {formatCurrency(totals.inflows)}
          </span>
        </span>
        <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-[#11203b]/80">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: CF.rosa }}
          />
          Saídas{" "}
          <span className="font-extrabold tabular-nums tracking-tight text-[#11203b]">
            {formatCurrency(totals.outflows)}
          </span>
        </span>
        <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-[#c89b3c]">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: CF.dourado }}
          />
          Resultado{" "}
          <span className="font-extrabold tabular-nums tracking-tight text-[#c89b3c]">
            {formatCurrency(result)}
          </span>
        </span>
      </div>

      <div className="h-[300px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 14, right: 10, left: 2, bottom: 6 }}
            barCategoryGap="22%"
            barGap={3}
          >
            <CartesianGrid
              strokeDasharray="2 12"
              vertical={false}
              stroke="rgb(17 32 59 / 3.5%)"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
              tick={{ fontSize: 11, fill: CF.cinza, fontWeight: 500 }}
              minTickGap={14}
              tickMargin={10}
            />
            <YAxis
              width={58}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: CF.cinza, fontWeight: 500 }}
              tickFormatter={(value: number) => formatCompactCurrency(value)}
            />
            <Tooltip
              cursor={{ fill: "rgb(17 32 59 / 2.5%)", radius: 6 }}
              content={<CashFlowTooltip />}
              isAnimationActive={false}
            />
            <Bar
              dataKey="inflows"
              name="inflows"
              fill={CF.green}
              radius={[7, 7, 2, 2]}
              maxBarSize={22}
              isAnimationActive
              animationDuration={850}
              animationEasing="ease-out"
              activeBar={{
                fill: CF.greenSoft,
                stroke: CF.navy,
                strokeWidth: 1,
              }}
            />
            <Bar
              dataKey="outflows"
              name="outflows"
              fill={CF.rosa}
              radius={[7, 7, 2, 2]}
              maxBarSize={22}
              isAnimationActive
              animationDuration={850}
              animationEasing="ease-out"
              activeBar={{
                fill: CF.rosaSoft,
                stroke: CF.navy,
                strokeWidth: 1,
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
