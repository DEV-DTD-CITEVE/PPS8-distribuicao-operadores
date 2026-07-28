import { OperationAllocation, ResultadosBalanceamento } from "../types";
import { buildOperatorColumns, getOperatorPercentage, OperatorColumn } from "./TabelaDistribuicao";

type OutputRateStation = {
  key: string;
  seq: number;
  name: string;
  code: string;
  totalTime: number;
  splitCount: number;
  outputRate: number;
  gap: number;
};

const COLORS = {
  FIRST: "#3498db",
  SLOWER: "#e74c3c",
  FASTER: "#2ecc71",
  SAME: "#95a5a6",
  TEXT: "#333333",
};

const numberOr = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim().replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const normalizeOlePercentage = (value: number): number =>
  value <= 1 ? value * 100 : value;

const readOlePercentage = (allocation: OperationAllocation, operator: any): number => {
  const direct = operator?.ole_percentage ?? operator?.ole_percent ?? operator?.ole;
  if (direct != null) {
    const parsed = numberOr(direct, 100);
    return Math.max(0.0001, normalizeOlePercentage(parsed));
  }

  const operatorRef = String(
    operator?.operator_code ??
      operator?.operator_id ??
      operator?.operador_id ??
      operator?.operator ??
      operator?.operador ??
      operator?.code ??
      operator?.operator_name ??
      "",
  ).trim().toLowerCase();
  const maps = [
    (allocation as any).occupancy_percentage,
    (allocation as any).occupancy_percentages,
    (allocation as any).operator_percentages,
    (allocation as any).operator_percentage,
    (allocation as any).operator_percents,
    (allocation as any).operator_occupancy,
    (allocation as any).ole_percentage,
    (allocation as any).ole_percentages,
  ];
  for (const map of maps) {
    if (!map || typeof map !== "object") continue;
    const match = Object.entries(map as Record<string, unknown>).find(
      ([key]) => key.trim().toLowerCase() === operatorRef,
    );
    if (match) return Math.max(0.0001, normalizeOlePercentage(numberOr(match[1], 100)));
  }

  const positions = (allocation as any).operator_positions;
  if (positions && typeof positions === "object") {
    const position = Object.entries(positions as Record<string, any>).find(
      ([key]) => key.trim().toLowerCase() === operatorRef,
    )?.[1];
    const positionOle = position?.ole_percentage ?? position?.ole_percent ?? position?.percentage;
    if (positionOle != null) {
      return Math.max(0.0001, normalizeOlePercentage(numberOr(positionOle, 100)));
    }
  }

  return 100;
};

const outputRateFor = (allocation: OperationAllocation, cycleTimeSeconds: number, operatorColumns: OperatorColumn[]): number | null => {
  const operators = Array.isArray(allocation.operator_allocations)
    ? allocation.operator_allocations
    : [];
  const splitCount = Math.max(1, Math.trunc(numberOr(allocation.split_count, operators.length || 1)));

  if (splitCount <= 1) {
    const operator = operators[0] || {};
    const time = numberOr(
      operator.time_seconds ?? operator.tempo_segundos ?? operator.seconds ?? operator.time,
      numberOr(allocation.total_time_seconds ?? allocation.allocated_time_seconds, 0),
    );
    const operatorRef = String(
      operator?.operator_code ?? operator?.operator_id ?? operator?.operador_id ??
        operator?.operator ?? operator?.operador ?? operator?.code ?? operator?.operator_name ?? "",
    ).trim();
    const operatorKey = operatorRef.toLowerCase();
    const column = operatorColumns.find((candidate) =>
      [candidate.key, candidate.code, candidate.label].some((value) => String(value || "").trim().toLowerCase() === operatorKey),
    ) || { key: operatorKey, code: operatorRef, label: String(operator?.operator_name || operatorRef) };
    const ole = getOperatorPercentage(allocation as any, column, cycleTimeSeconds)
      ?? readOlePercentage(allocation, operator);
    return time > 0 ? time / (ole / 100) : null;
  }

  let totalEffectiveTime = 0;
  let totalFraction = 0;
  const declaredTotalTime = numberOr(
    allocation.total_time_seconds ?? allocation.allocated_time_seconds,
    0,
  );
  // Algumas respostas repetem o tempo total em cada operador. O tempo
  // efetivamente usado no gráfico tem de somar o total da operação.
  const timePerOperator = operators.length > 0 ? declaredTotalTime / operators.length : 0;

  operators.forEach((operator: any) => {
    const time = timePerOperator;
    const operatorRef = String(
      operator?.operator_code ?? operator?.operator_id ?? operator?.operador_id ??
        operator?.operator ?? operator?.operador ?? operator?.code ?? operator?.operator_name ?? "",
    ).trim();
    const operatorKey = operatorRef.toLowerCase();
    const column = operatorColumns.find((candidate) =>
      [candidate.key, candidate.code, candidate.label].some((value) => String(value || "").trim().toLowerCase() === operatorKey),
    ) || { key: operatorKey, code: operatorRef, label: String(operator?.operator_name || operatorRef) };
    const ole = getOperatorPercentage(allocation as any, column, cycleTimeSeconds)
      ?? readOlePercentage(allocation, operator);
    const fraction = operators.length > 0 ? 1 / operators.length : 0;
    if (time > 0 && fraction > 0) {
      totalEffectiveTime += (time / (ole / 100)) * fraction;
      totalFraction += fraction;
    }
  });

  return totalFraction > 0 ? totalEffectiveTime / totalFraction : null;
};

const buildStations = (resultados: ResultadosBalanceamento, operatorColumns: OperatorColumn[]): OutputRateStation[] => {
  const allocations = Array.isArray(resultados.operation_allocations)
    ? resultados.operation_allocations
    : [];
  const sortedAllocations = allocations
    .map((allocation, index) => ({ allocation, index, seq: numberOr(allocation.seq, index + 1) }))
    .sort((a, b) => a.seq - b.seq);
  let previousRate: number | null = null;

  return sortedAllocations
    .map(({ allocation, index, seq }) => {
      const outputRate = outputRateFor(
        allocation,
        Number(resultados.cycle_time_seconds ?? resultados.tempoCiclo * 60) || 0,
        operatorColumns,
      );
      if (outputRate == null || !Number.isFinite(outputRate)) return null;
      const gap = previousRate == null ? 0 : previousRate - outputRate;
      previousRate = outputRate;
      return {
        key: `${allocation.operation_id || allocation.operation_code || index}-${seq}-${index}`,
        seq,
        name: String(allocation.operation_name || allocation.operation_code || allocation.operation_id || `Operação ${seq}`),
        code: String(allocation.operation_code || allocation.operation_id || ""),
        totalTime: numberOr(allocation.total_time_seconds ?? allocation.allocated_time_seconds, outputRate),
        splitCount: Math.max(1, Math.trunc(numberOr(allocation.split_count, 1))),
        outputRate,
        gap,
      };
    })
    .filter((station): station is OutputRateStation => station !== null);
};

const getBarColor = (index: number, gap: number): string => {
  if (index === 0) return COLORS.FIRST;
  if (gap < 0) return COLORS.SLOWER;
  if (gap > 0) return COLORS.FASTER;
  return COLORS.SAME;
};

export function WaterfallOutputRate({ resultados, taskCode, operadores = [] }: { resultados: ResultadosBalanceamento; taskCode: string; operadores?: any[] }) {
  const rows = Array.isArray(resultados.operation_allocations) ? resultados.operation_allocations : [];
  const operatorColumns = buildOperatorColumns(
    rows as any,
    operadores,
    Array.isArray(resultados.operator_slots) ? resultados.operator_slots : [],
    [],
  );
  const stations = buildStations(resultados, operatorColumns);

  if (stations.length === 0) {
    return (
      <section className="rounded-sm border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Waterfall por Estação — {taskCode}</h3>
        <p className="mt-3 text-xs text-gray-500">Não existem dados de output rate disponíveis para este balanceamento.</p>
      </section>
    );
  }

  const chartWidth = Math.max(900, stations.length * 125);
  const chartHeight = 430;
  const margin = { top: 58, right: 24, bottom: 112, left: 78 };
  const plotWidth = chartWidth - margin.left - margin.right;
  const plotHeight = chartHeight - margin.top - margin.bottom;
  const maxRate = Math.max(...stations.map((station) => station.outputRate), 1);
  const maxY = maxRate * 1.35;
  const barWidth = Math.min(76, (plotWidth / stations.length) * 0.62);
  const xFor = (index: number) => margin.left + (plotWidth * (index + 0.5)) / stations.length;
  const yFor = (value: number) => margin.top + plotHeight - (value / maxY) * plotHeight;
  const baseline = yFor(0);
  const ticks = [0, maxY / 4, maxY / 2, (maxY * 3) / 4, maxY];

  return (
    <section className="rounded-sm border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Waterfall por Estação — {taskCode}</h3>
          <p className="mt-1 text-xs text-gray-500">Output Rate (s/peça) na sequência da linha</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.FIRST }} />Referência</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.SLOWER }} />Mais lenta</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.FASTER }} />Mais rápida</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-auto min-w-[900px]" role="img" aria-label={`Waterfall de output rate por estação para ${taskCode}`}>
          {ticks.map((tick) => {
            const y = yFor(tick);
            return (
              <g key={tick}>
                <line x1={margin.left} x2={chartWidth - margin.right} y1={y} y2={y} stroke="#e5e7eb" strokeDasharray="3 3" />
                <text x={margin.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">{tick.toFixed(1)}</text>
              </g>
            );
          })}
          <line x1={margin.left} x2={margin.left} y1={margin.top} y2={baseline} stroke="#9ca3af" />
          <line x1={margin.left} x2={chartWidth - margin.right} y1={baseline} y2={baseline} stroke="#9ca3af" />
          <text transform={`translate(17 ${margin.top + plotHeight / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill={COLORS.TEXT}>Output Rate (s/peça)</text>
          {stations.map((station, index) => {
            const x = xFor(index) - barWidth / 2;
            const y = yFor(station.outputRate);
            const color = getBarColor(index, station.gap);
            const gapLabel = station.gap < 0 ? `+${Math.abs(station.gap).toFixed(1)}s` : station.gap > 0 ? `-${station.gap.toFixed(1)}s` : "";
            const labelLines = station.name.length > 22 ? [station.name.slice(0, 21) + "…"] : [station.name];
            return (
              <g key={station.key}>
                <title>{`${station.name}: ${station.outputRate.toFixed(1)}s/peça${gapLabel ? `, gap ${gapLabel}` : ""}`}</title>
                {gapLabel ? <text x={xFor(index)} y={Math.max(18, y - 27)} textAnchor="middle" fontSize="11" fontWeight="600" fill={color}>{gapLabel}</text> : null}
                <text x={xFor(index)} y={Math.max(34, y - 9)} textAnchor="middle" fontSize="11" fontWeight="600" fill={COLORS.TEXT}>{station.outputRate.toFixed(1)}s</text>
                <rect x={x} y={y} width={barWidth} height={Math.max(1, baseline - y)} rx="2" fill={color} />
                {labelLines.map((line, lineIndex) => <text key={line} x={xFor(index)} y={baseline + 48 + lineIndex * 14} textAnchor="middle" fontSize="11" fill={COLORS.TEXT}>{line}</text>)}
                <text x={xFor(index)} y={baseline + 76} textAnchor="middle" fontSize="10" fill="#6b7280">(seq {station.seq}{station.splitCount > 1 ? `, ×${station.splitCount}` : ""})</text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
