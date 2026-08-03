"use client";

import { useId, useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  seriesPointLabel,
  type CustomersReportSeriesPoint,
  type CustomersSalesDistributionPoint,
} from "@/lib/reports/format";

type CustomersReportChartProps = {
  series: CustomersReportSeriesPoint[];
  daily: boolean;
};

type CustomersSalesDistributionChartProps = {
  distribution: CustomersSalesDistributionPoint[];
};

type EvolutionPoint = {
  bucket: string;
  label: string;
  newCustomers: number;
  cumulativeTotal: number;
};

const TR = {
  navy: "#11203b",
  rosa: "#c05c7d",
  rosaForte: "#a84568",
  rosaClaro: "#e8c9d1",
  dourado: "#c89b3c",
  cinza: "#b6b6b6",
} as const;

const DISTRIBUTION_COLORS: Record<
  CustomersSalesDistributionPoint["key"],
  string
> = {
  with_sales: TR.navy,
  without_sales: TR.rosa,
};

type EvolutionTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: Array<{
    dataKey?: string | number;
    value?: number | string;
    payload?: EvolutionPoint;
  }>;
};

type DistributionTooltipProps = {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    payload?: CustomersSalesDistributionPoint & { fill?: string };
  }>;
};

function EvolutionTooltip({ active, payload, label }: EvolutionTooltipProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  const newCustomers = Number(point?.newCustomers ?? 0);
  const cumulativeTotal = Number(point?.cumulativeTotal ?? 0);

  return (
    <div className="rounded-xl border border-[#11203b]/[0.08] bg-white px-3.5 py-2.5 shadow-[0_4px_16px_rgb(17_32_59/0.1)]">
      <p className="text-[11px] font-semibold tracking-wide text-[#c89b3c]">
        {String(label ?? "")}
      </p>
      <p className="mt-1 text-[12px] font-medium text-[#11203b]/70">
        Novos clientes:{" "}
        <span className="font-extrabold tabular-nums text-[#c05c7d]">
          {newCustomers}
        </span>
      </p>
      <p className="mt-0.5 text-[12px] font-medium text-[#11203b]/70">
        Total acumulado:{" "}
        <span className="font-extrabold tabular-nums text-[#11203b]">
          {cumulativeTotal}
        </span>
      </p>
    </div>
  );
}

function DistributionTooltip({ active, payload }: DistributionTooltipProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-xl border border-[#11203b]/[0.08] bg-white px-3.5 py-2.5 shadow-[0_4px_16px_rgb(17_32_59/0.1)]">
      <p className="text-[11px] font-semibold tracking-wide text-[#c89b3c]">
        {point.label}
      </p>
      <p className="mt-1 text-[13px] font-extrabold tabular-nums tracking-tight text-[#11203b]">
        {point.count} cliente{point.count === 1 ? "" : "s"}
      </p>
      <p className="mt-0.5 text-[11px] font-medium text-[#11203b]/55">
        {point.percentage.toLocaleString("pt-BR", {
          maximumFractionDigits: 1,
        })}
        % da base filtrada
      </p>
    </div>
  );
}

export function CustomersReportChart({
  series,
  daily,
}: CustomersReportChartProps) {
  const isMobile = useIsMobile();
  const gradientUid = useId().replace(/:/g, "");
  const gradientId = `report-customers-bar-${gradientUid}`;

  const data = useMemo<EvolutionPoint[]>(
    () =>
      series.map((point) => ({
        bucket: point.bucket,
        label: seriesPointLabel(point.bucket, daily),
        newCustomers: point.newCustomers,
        cumulativeTotal: point.cumulativeTotal,
      })),
    [daily, series]
  );

  const periodNew = useMemo(
    () => data.reduce((sum, point) => sum + point.newCustomers, 0),
    [data]
  );

  const latestCumulative = data.length
    ? data[data.length - 1].cumulativeTotal
    : 0;

  const chartHeight = isMobile ? 220 : 280;
  const hasNewInPeriod = periodNew > 0;

  if (!data.length || (!hasNewInPeriod && latestCumulative === 0)) {
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
        <span className="text-[15px] font-extrabold tabular-nums tracking-tight text-[#11203b] sm:text-[16px]">
          {periodNew} novo{periodNew === 1 ? "" : "s"}
        </span>
        <span className="text-[11px] font-medium tabular-nums text-[#11203b]/42">
          <span className="text-[#c89b3c]/65">·</span> Base acumulada{" "}
          <span className="font-semibold text-[#11203b]/50">
            {latestCumulative}
          </span>
        </span>
      </div>

      <div className="w-full min-w-0" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={
              isMobile
                ? { top: 10, right: 8, left: 0, bottom: 4 }
                : { top: 18, right: 12, left: 4, bottom: 10 }
            }
            barCategoryGap={isMobile ? "28%" : "34%"}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TR.rosaForte} />
                <stop offset="55%" stopColor={TR.rosa} />
                <stop offset="100%" stopColor={TR.rosaClaro} />
              </linearGradient>
            </defs>
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
              yAxisId="new"
              width={isMobile ? 28 : 36}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{
                fontSize: isMobile ? 9 : 10,
                fill: TR.cinza,
                fontWeight: 500,
              }}
            />
            <YAxis
              yAxisId="cumulative"
              orientation="right"
              width={isMobile ? 28 : 36}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{
                fontSize: isMobile ? 9 : 10,
                fill: TR.cinza,
                fontWeight: 500,
              }}
            />
            <Tooltip
              cursor={{ fill: "rgb(192 92 125 / 6%)", radius: 8 }}
              content={<EvolutionTooltip />}
              isAnimationActive={false}
            />
            {!isMobile ? (
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{
                  fontSize: 11,
                  color: TR.navy,
                  paddingBottom: 8,
                }}
              />
            ) : null}
            <Bar
              yAxisId="new"
              dataKey="newCustomers"
              name="Novos clientes"
              radius={[10, 10, 4, 4]}
              maxBarSize={isMobile ? 22 : 34}
              fill={`url(#${gradientId})`}
              isAnimationActive
              animationDuration={850}
              animationEasing="ease-out"
              activeBar={{
                fill: TR.rosa,
                stroke: TR.navy,
                strokeWidth: 1.25,
              }}
            >
              {data.map((point) => (
                <Cell key={point.bucket} fill={`url(#${gradientId})`} />
              ))}
            </Bar>
            <Line
              yAxisId="cumulative"
              type="monotone"
              dataKey="cumulativeTotal"
              name="Base acumulada"
              stroke={TR.navy}
              strokeWidth={2.25}
              dot={false}
              activeDot={{
                r: 4,
                fill: TR.navy,
                stroke: "#fff",
                strokeWidth: 2,
              }}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CustomersSalesDistributionChart({
  distribution,
}: CustomersSalesDistributionChartProps) {
  const isMobile = useIsMobile();
  const chartHeight = isMobile ? 220 : 260;

  const total = distribution.reduce((sum, item) => sum + item.count, 0);
  const data = distribution.filter((item) => item.count > 0);

  if (!total || !data.length) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height: chartHeight }}
      >
        Sem dados para a distribuição comercial.
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-3">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        {distribution.map((item) => (
          <span
            key={item.key}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#11203b]/55"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: DISTRIBUTION_COLORS[item.key] }}
            />
            {item.label}{" "}
            <span className="font-semibold tabular-nums text-[#11203b]/70">
              {item.count}
            </span>
            <span className="tabular-nums text-[#11203b]/40">
              (
              {item.percentage.toLocaleString("pt-BR", {
                maximumFractionDigits: 1,
              })}
              %)
            </span>
          </span>
        ))}
      </div>

      <div className="w-full min-w-0" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={<DistributionTooltip />}
              isAnimationActive={false}
            />
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={isMobile ? 48 : 62}
              outerRadius={isMobile ? 78 : 96}
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
              isAnimationActive
              animationDuration={850}
              animationEasing="ease-out"
            >
              {data.map((item) => (
                <Cell
                  key={item.key}
                  fill={DISTRIBUTION_COLORS[item.key]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
