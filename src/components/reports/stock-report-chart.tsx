"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
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
import { formatStockQuantity } from "@/lib/products/format";
import {
  seriesPointLabel,
  toNumberAmount,
  type StockLowBalancePoint,
  type StockReportSeriesPoint,
} from "@/lib/reports/format";

type StockReportChartProps = {
  series: StockReportSeriesPoint[];
  lowBalanceSeries: StockLowBalancePoint[];
  daily: boolean;
  entriesInPeriod?: number;
  exitsInPeriod?: number;
};

type MovementChartPoint = {
  bucket: string;
  label: string;
  entries: number;
  exits: number;
  balance: number;
};

type LowBalanceChartPoint = {
  productId: string;
  label: string;
  fullName: string;
  currentStock: number;
  minStock: number;
  unit: string | null;
};

const TR = {
  navy: "#11203b",
  entries: "#6f9f87",
  exits: "#c05c7d",
  balance: "#c89b3c",
  cinza: "#b6b6b6",
} as const;

type MovementTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: Array<{
    dataKey?: string | number;
    value?: number | string;
    payload?: MovementChartPoint;
  }>;
};

type LowBalanceTooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload?: LowBalanceChartPoint;
  }>;
};

type DotProps = {
  cx?: number;
  cy?: number;
  payload?: MovementChartPoint;
};

type LabelProps = {
  x?: number | string;
  y?: number | string;
  value?: number | string;
};

function formatCompactQuantity(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 0,
    })}k`;
  }
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function truncateLabel(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function buildYDomain(points: MovementChartPoint[]): [number, number] {
  let max = 0;
  let min = 0;

  for (const point of points) {
    max = Math.max(max, point.entries, point.exits, point.balance);
    min = Math.min(min, point.entries, point.exits, point.balance);
  }

  const span = Math.max(max - min, Math.abs(max), Math.abs(min), 1);
  const padding = span * 0.14;

  return [min - padding, max + padding];
}

function MovementTooltip({ active, payload, label }: MovementTooltipProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  const entries = toNumberAmount(point?.entries ?? 0);
  const exits = toNumberAmount(point?.exits ?? 0);
  const balance = toNumberAmount(point?.balance ?? entries - exits);

  return (
    <div className="rounded-xl border border-[#11203b]/[0.08] bg-white px-3.5 py-2.5 shadow-[0_4px_16px_rgb(17_32_59/0.1)]">
      <p className="text-[11px] font-semibold tracking-wide text-[#c89b3c]">
        {String(label ?? "")}
      </p>
      <div className="mt-1.5 space-y-0.5 text-[12px] font-medium tabular-nums">
        <p className="text-[#6f9f87]">Entradas {formatCompactQuantity(entries)}</p>
        <p className="text-[#c05c7d]">Saídas {formatCompactQuantity(exits)}</p>
        <p className="font-semibold text-[#c89b3c]">
          Saldo {formatCompactQuantity(balance)}
        </p>
      </div>
    </div>
  );
}

function SaldoDot({
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
      fill={TR.balance}
      stroke={TR.navy}
      strokeWidth={1.35}
    />
  );
}

function SaldoLabel({ x, y, value }: LabelProps) {
  if (x == null || y == null || value == null) return null;

  const numericX = Number(x);
  const numericY = Number(y);
  const amount = toNumberAmount(value);

  if (Number.isNaN(numericX) || Number.isNaN(numericY)) return null;

  // Keep single-point label clearly above the gold marker (or below if negative),
  // with enough clearance from the entry/exit bars.
  const offset = amount >= 0 ? -30 : 24;

  return (
    <text
      x={numericX}
      y={numericY + offset}
      textAnchor="middle"
      fill={TR.balance}
      fontSize={10}
      fontWeight={600}
    >
      {formatCompactQuantity(amount)}
    </text>
  );
}

function LowBalanceTooltip({ active, payload }: LowBalanceTooltipProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-xl border border-[#11203b]/[0.08] bg-white px-3.5 py-2.5 shadow-[0_4px_16px_rgb(17_32_59/0.1)]">
      <p className="text-[11px] font-semibold tracking-wide text-[#c89b3c]">
        {point.fullName}
      </p>
      <div className="mt-1.5 space-y-0.5 text-[12px] font-medium tabular-nums">
        <p className="text-[#11203b]">
          Saldo {formatStockQuantity(point.currentStock, point.unit)}
        </p>
        <p className="text-[#11203b]/70">
          Mínimo {formatStockQuantity(point.minStock, point.unit)}
        </p>
      </div>
    </div>
  );
}

export function StockReportChart({
  series,
  lowBalanceSeries,
  daily,
  entriesInPeriod,
  exitsInPeriod,
}: StockReportChartProps) {
  const isMobile = useIsMobile();

  const movementData = useMemo<MovementChartPoint[]>(
    () =>
      series.map((point) => ({
        bucket: point.bucket,
        label: seriesPointLabel(point.bucket, daily),
        entries: toNumberAmount(point.entries),
        exits: toNumberAmount(point.exits),
        balance: toNumberAmount(point.balance),
      })),
    [daily, series]
  );

  const lowBalanceData = useMemo<LowBalanceChartPoint[]>(
    () =>
      lowBalanceSeries.map((point) => ({
        productId: point.productId,
        label: truncateLabel(point.name, isMobile ? 14 : 22),
        fullName: point.name,
        currentStock: point.currentStock,
        minStock: point.minStock,
        unit: point.unit,
      })),
    [isMobile, lowBalanceSeries]
  );

  const yDomain = useMemo(() => buildYDomain(movementData), [movementData]);
  const isSinglePoint = movementData.length === 1;
  const movementHeight = isMobile ? 240 : 300;
  const lowBalanceHeight = isMobile
    ? Math.max(180, lowBalanceData.length * 28)
    : Math.max(220, lowBalanceData.length * 32);

  return (
    <div className="space-y-6">
      <div className="w-full min-w-0 space-y-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          {entriesInPeriod !== undefined && exitsInPeriod !== undefined ? (
            <>
              <span className="text-[15px] font-extrabold tabular-nums tracking-tight text-[#11203b] sm:text-[16px]">
                {formatCompactQuantity(entriesInPeriod)} entr. ·{" "}
                {formatCompactQuantity(exitsInPeriod)} saíd.
              </span>
              <span className="text-[11px] font-medium text-[#11203b]/42">
                <span className="text-[#c89b3c]/65">·</span> Movimentação no
                período
              </span>
            </>
          ) : null}
        </div>

        {!movementData.length ? (
          <div
            className="flex items-center justify-center text-sm text-muted-foreground"
            style={{ height: movementHeight }}
          >
            Sem dados para o gráfico no período selecionado.
          </div>
        ) : (
          <div className="w-full min-w-0" style={{ height: movementHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={movementData}
                margin={
                  isMobile
                    ? {
                        top: isSinglePoint ? 40 : 12,
                        right: 8,
                        left: 0,
                        bottom: isSinglePoint ? 16 : 4,
                      }
                    : {
                        top: isSinglePoint ? 44 : 18,
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
                  width={isMobile ? 44 : 56}
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fontSize: isMobile ? 9 : 10,
                    fill: TR.cinza,
                    fontWeight: 500,
                  }}
                  tickFormatter={(value: number) => formatCompactQuantity(value)}
                />
                <ReferenceLine
                  y={0}
                  stroke={TR.navy}
                  strokeOpacity={0.42}
                  strokeWidth={1.5}
                />
                <Tooltip
                  cursor={{ fill: "rgb(17 32 59 / 3%)", radius: 8 }}
                  content={<MovementTooltip />}
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
                  name="Entradas"
                  dataKey="entries"
                  fill={TR.entries}
                  radius={[8, 8, 3, 3]}
                  maxBarSize={isMobile ? 14 : 22}
                  isAnimationActive
                  animationDuration={850}
                  animationEasing="ease-out"
                />
                <Bar
                  name="Saídas"
                  dataKey="exits"
                  fill={TR.exits}
                  radius={[8, 8, 3, 3]}
                  maxBarSize={isMobile ? 14 : 22}
                  isAnimationActive
                  animationDuration={850}
                  animationEasing="ease-out"
                />
                <Line
                  name="Saldo"
                  type="monotone"
                  dataKey="balance"
                  stroke={TR.balance}
                  strokeWidth={2.5}
                  connectNulls
                  dot={(props) => (
                    <SaldoDot
                      key={`saldo-dot-${String(props.payload?.bucket ?? props.cx)}`}
                      cx={props.cx}
                      cy={props.cy}
                      payload={props.payload}
                      single={isSinglePoint}
                    />
                  )}
                  activeDot={{
                    r: isSinglePoint ? 8 : 5.5,
                    fill: TR.balance,
                    stroke: TR.navy,
                    strokeWidth: 1.35,
                  }}
                  isAnimationActive
                  animationDuration={900}
                  animationEasing="ease-out"
                >
                  {isSinglePoint ? (
                    <LabelList dataKey="balance" content={<SaldoLabel />} />
                  ) : null}
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="w-full min-w-0 space-y-3 border-t border-[var(--brand-navy)]/6 pt-5">
        <div>
          <p className="text-sm font-semibold text-[var(--brand-navy)]">
            Produtos com menor saldo disponível
          </p>
          <p className="text-xs text-muted-foreground">
            Prioridade de reposição com base no estoque atual
          </p>
        </div>

        {!lowBalanceData.length ? (
          <div
            className="flex items-center justify-center text-sm text-muted-foreground"
            style={{ height: 160 }}
          >
            Sem produtos controlados para o gráfico secundário.
          </div>
        ) : (
          <div className="w-full min-w-0" style={{ height: lowBalanceHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={lowBalanceData}
                layout="vertical"
                margin={
                  isMobile
                    ? { top: 4, right: 16, left: 4, bottom: 4 }
                    : { top: 4, right: 24, left: 8, bottom: 4 }
                }
              >
                <CartesianGrid
                  strokeDasharray="2 12"
                  horizontal={false}
                  stroke="rgb(17 32 59 / 3.5%)"
                />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fontSize: isMobile ? 9 : 10,
                    fill: TR.cinza,
                    fontWeight: 500,
                  }}
                  tickFormatter={(value: number) => formatCompactQuantity(value)}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={isMobile ? 88 : 140}
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fontSize: isMobile ? 10 : 11,
                    fill: TR.navy,
                    fontWeight: 500,
                  }}
                />
                <Tooltip
                  cursor={{ fill: "rgb(17 32 59 / 3%)" }}
                  content={<LowBalanceTooltip />}
                  isAnimationActive={false}
                />
                <Bar
                  name="Saldo atual"
                  dataKey="currentStock"
                  fill={TR.navy}
                  radius={[0, 6, 6, 0]}
                  maxBarSize={isMobile ? 14 : 18}
                  isAnimationActive
                  animationDuration={850}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
