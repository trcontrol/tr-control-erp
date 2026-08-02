"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  formatCurrency,
  seriesPointLabel,
  toNumberAmount,
  type FinanceReportSeriesPoint,
} from "@/lib/reports/format";

type FinanceReportChartProps = {
  series: FinanceReportSeriesPoint[];
  daily: boolean;
  periodBalance?: number;
};

type ChartPoint = {
  bucket: string;
  label: string;
  receitas: number;
  despesas: number;
  saldo: number;
};

const TR = {
  navy: "#11203b",
  receita: "#6f9f87",
  despesa: "#a84568",
  resultado: "#c89b3c",
  cinza: "#b6b6b6",
} as const;

type TooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: Array<{
    dataKey?: string | number;
    value?: number | string;
    payload?: ChartPoint;
  }>;
};

type DotProps = {
  cx?: number;
  cy?: number;
  payload?: ChartPoint;
};

type LabelProps = {
  x?: number | string;
  y?: number | string;
  value?: number | string;
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

function buildYDomain(points: ChartPoint[]): [number, number] {
  let max = 0;
  let min = 0;

  for (const point of points) {
    max = Math.max(max, point.receitas, point.despesas, point.saldo);
    min = Math.min(min, point.receitas, point.despesas, point.saldo);
  }

  const span = Math.max(max - min, Math.abs(max), Math.abs(min), 1);
  const padding = span * 0.14;

  return [min - padding, max + padding];
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  const receitas = toNumberAmount(point?.receitas ?? 0);
  const despesas = toNumberAmount(point?.despesas ?? 0);
  const resultado = toNumberAmount(point?.saldo ?? receitas - despesas);

  return (
    <div className="rounded-xl border border-[#11203b]/[0.08] bg-white px-3.5 py-2.5 shadow-[0_4px_16px_rgb(17_32_59/0.1)]">
      <p className="text-[11px] font-semibold tracking-wide text-[#c89b3c]">
        {String(label ?? "")}
      </p>
      <div className="mt-1.5 space-y-0.5 text-[12px] font-medium tabular-nums">
        <p className="text-[#6f9f87]">Receitas {formatCurrency(receitas)}</p>
        <p className="text-[#a84568]">Despesas {formatCurrency(despesas)}</p>
        <p className="font-semibold text-[#c89b3c]">
          Resultado {formatCurrency(resultado)}
        </p>
      </div>
    </div>
  );
}

function ResultadoDot({
  cx,
  cy,
  single,
}: DotProps & {
  single: boolean;
}) {
  if (cx == null || cy == null || Number.isNaN(cx) || Number.isNaN(cy)) {
    return null;
  }

  const radius = single ? 7 : 4.5;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={radius}
      fill={TR.resultado}
      stroke={TR.navy}
      strokeWidth={1.35}
    />
  );
}

function ResultadoLabel({ x, y, value }: LabelProps) {
  if (x == null || y == null || value == null) return null;

  const numericX = Number(x);
  const numericY = Number(y);
  const amount = toNumberAmount(value);

  if (Number.isNaN(numericX) || Number.isNaN(numericY)) return null;

  const offset = amount >= 0 ? -14 : 18;

  return (
    <text
      x={numericX}
      y={numericY + offset}
      textAnchor="middle"
      fill={TR.resultado}
      fontSize={11}
      fontWeight={700}
    >
      {formatCurrency(amount)}
    </text>
  );
}

export function FinanceReportChart({
  series,
  daily,
  periodBalance,
}: FinanceReportChartProps) {
  const isMobile = useIsMobile();

  const data = useMemo<ChartPoint[]>(
    () =>
      series.map((point) => ({
        bucket: point.bucket,
        label: seriesPointLabel(point.bucket, daily),
        receitas: toNumberAmount(point.receitas),
        despesas: toNumberAmount(point.despesas),
        saldo: toNumberAmount(point.saldo),
      })),
    [daily, series]
  );

  const yDomain = useMemo(() => buildYDomain(data), [data]);
  const isSinglePoint = data.length === 1;
  const chartHeight = isMobile ? 240 : 300;

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height: chartHeight }}
      >
        Sem dados para o gráfico no período selecionado.
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-3">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        {periodBalance !== undefined ? (
          <>
            <span className="text-[15px] font-extrabold tabular-nums tracking-tight text-[#11203b] sm:text-[16px]">
              {formatCurrency(periodBalance)}
            </span>
            <span className="text-[11px] font-medium text-[#11203b]/42">
              <span className="text-[#c89b3c]/65">·</span> Resultado do período
            </span>
          </>
        ) : null}
      </div>

      <div className="w-full min-w-0" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={
              isMobile
                ? {
                    top: isSinglePoint ? 28 : 12,
                    right: 8,
                    left: 0,
                    bottom: isSinglePoint ? 16 : 4,
                  }
                : {
                    top: isSinglePoint ? 32 : 18,
                    right: 12,
                    left: 4,
                    bottom: isSinglePoint ? 18 : 10,
                  }
            }
            barCategoryGap={isMobile ? "22%" : "28%"}
            barGap={2}
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
              tick={{
                fontSize: isMobile ? 10 : 11,
                fill: TR.cinza,
                fontWeight: 500,
              }}
              tickMargin={isMobile ? 8 : 12}
              interval="preserveStartEnd"
              minTickGap={isMobile ? 4 : 8}
            />
            <YAxis
              domain={yDomain}
              allowDataOverflow={false}
              width={isMobile ? 44 : 62}
              tickLine={false}
              axisLine={false}
              tick={{
                fontSize: isMobile ? 9 : 10,
                fill: TR.cinza,
                fontWeight: 500,
              }}
              tickFormatter={(value: number) => formatCompactCurrency(value)}
            />
            <ReferenceLine
              y={0}
              stroke={TR.navy}
              strokeOpacity={0.42}
              strokeWidth={1.5}
            />
            <Tooltip
              cursor={{ fill: "rgb(17 32 59 / 3%)", radius: 8 }}
              content={<ChartTooltip />}
              isAnimationActive={false}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{
                fontSize: isMobile ? 11 : 12,
                color: TR.navy,
                paddingBottom: 8,
              }}
            />
            <Bar
              name="Receitas"
              dataKey="receitas"
              fill={TR.receita}
              radius={[8, 8, 3, 3]}
              maxBarSize={isMobile ? 16 : 26}
              isAnimationActive
              animationDuration={850}
              animationEasing="ease-out"
            />
            <Bar
              name="Despesas"
              dataKey="despesas"
              fill={TR.despesa}
              radius={[8, 8, 3, 3]}
              maxBarSize={isMobile ? 16 : 26}
              isAnimationActive
              animationDuration={850}
              animationEasing="ease-out"
            />
            <Line
              name="Resultado"
              type="monotone"
              dataKey="saldo"
              stroke={TR.resultado}
              strokeWidth={2.5}
              connectNulls
              dot={(props) => (
                <ResultadoDot
                  key={`resultado-dot-${String(props.payload?.bucket ?? props.cx)}`}
                  cx={props.cx}
                  cy={props.cy}
                  payload={props.payload}
                  single={isSinglePoint}
                />
              )}
              activeDot={{
                r: isSinglePoint ? 8 : 5.5,
                fill: TR.resultado,
                stroke: TR.navy,
                strokeWidth: 1.35,
              }}
              isAnimationActive
              animationDuration={900}
            >
              {isSinglePoint ? (
                <LabelList dataKey="saldo" content={<ResultadoLabel />} />
              ) : null}
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
