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

type OperatorMachineBar = {
  operator: string;
  totalSeconds: number;
  gap: number;
  segments: Array<{ machine: string; operation: string; seconds: number; gap: number; color: string }>;
};

const GROUPED_COLORS = [
  "#1d4ed8", "#7c3aed", "#0891b2", "#059669",
  "#d97706", "#6366f1", "#ec4899", "#14b8a6",
  "#f59e0b", "#8b5cf6", "#06b6d4", "#10b981",
];

const buildGroupedOperatorBars = (source: any, operadores: any[], desiredOrder: string[] = []): OperatorMachineBar[] => {
  const grouped = source?.machine_times_per_operator ?? source?.machineTimesPerOperator ?? source?.operator_flow ?? source?.operatorFlow ?? source?.waterfall;
  const entries: Array<[string, any]> = Array.isArray(grouped)
      ? grouped.flatMap((row: any) => Array.isArray(row?.operators)
      ? row.operators.map((operator: any) => [String(operator?.operator_id ?? operator?.operator_code ?? operator?.operator ?? operator?.operator_name ?? operator?.name ?? "Operador"), operator] as [string, any])
      : [[String(row?.operator_id ?? row?.operator_code ?? row?.operator ?? row?.operator_name ?? row?.name ?? "Operador"), row] as [string, any]])
    : grouped && typeof grouped === "object"
      ? Object.entries(grouped)
      : [];
  const operationKeyOf = (entry: any) => String(entry?.operation_name ?? entry?.operation ?? entry?.operation_code ?? entry?.operation_id ?? entry?.operacao ?? entry?.name ?? "Operação").trim().toLowerCase();
  const operationKeys = Array.from(new Set(entries.flatMap(([, rawEntries]) => {
    const list = Array.isArray(rawEntries)
      ? rawEntries
      : Array.isArray(rawEntries?.operations)
        ? rawEntries.operations
        : rawEntries && typeof rawEntries === "object"
          ? Object.values(rawEntries)
          : [];
    return list.flatMap((entry: any) => Array.isArray(entry?.operations) ? entry.operations : [entry]).map(operationKeyOf);
  }))).sort();
  const colorFor = (operation: string) => {
    const index = operationKeys.indexOf(operation.trim().toLowerCase());
    return GROUPED_COLORS[(index >= 0 ? index : 0) % GROUPED_COLORS.length];
  };
  // O waterfall deve manter o identificador devolvido pela API. Em particular,
  // depois de substituir um operador virtual, o nome é apenas metadado e não
  // pode substituir o ID usado na alocação.
  const resolveName = (key: string) => key;
  const operatorOrder = new Map(operadores.flatMap((operator: any, index: number) => [
    [String(operator?.id ?? operator?.codigo ?? "").trim().toLowerCase(), index],
    [String(operator?.nome ?? operator?.name ?? "").trim().toLowerCase(), index],
  ]).concat(desiredOrder.map((label, index) => [String(label).trim().toLowerCase(), index])));
  return entries.map(([operatorKey, rawEntries]) => {
    const list = Array.isArray(rawEntries)
      ? rawEntries
      : Array.isArray(rawEntries?.operations)
        ? rawEntries.operations.map((operation: any) => ({ ...operation, gap: operation?.gap ?? rawEntries?.gap, machine_name: operation?.machine_name ?? rawEntries?.machine_name ?? rawEntries?.machine }))
        : rawEntries && typeof rawEntries === "object"
          ? Object.values(rawEntries)
          : [];
    const expanded = list.flatMap((entry: any) => Array.isArray(entry?.operations)
      ? entry.operations.map((operation: any) => ({ ...operation, machine_name: operation?.machine_name ?? entry?.machine_name ?? entry?.machine }))
      : [entry]);
    const segments = expanded.map((entry: any) => {
      const operation = String(entry?.operation_name ?? entry?.operation ?? entry?.operation_code ?? entry?.operation_id ?? entry?.operacao ?? entry?.name ?? "Operação").trim() || "Operação";
      const machine = String(entry?.machine_name ?? entry?.machine ?? entry?.machine_type ?? entry?.maquina ?? operation).trim() || operation;
      const hours = Number(entry?.time_hours ?? entry?.hours);
      const minutes = Number(entry?.time_minutes ?? entry?.time_min ?? entry?.minutes);
      const seconds = Number(entry?.time_seconds ?? entry?.seconds ?? entry?.tempo_segundos ?? entry?.time ?? entry?.total_time_seconds ?? entry?.work_content);
      const value = Number.isFinite(seconds) && seconds > 0 ? seconds : Number.isFinite(hours) && hours > 0 ? hours * 3600 : Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : 0;
      const gap = numberOr(entry?.gap ?? entry?.gap_seconds ?? entry?.delta, 0);
      return value > 0 ? { machine, operation, seconds: value, gap, color: colorFor(operation) } : null;
    }).filter((segment): segment is { machine: string; operation: string; seconds: number; gap: number; color: string } => Boolean(segment));
    const operatorGap = numberOr(rawEntries?.gap ?? rawEntries?.gap_seconds ?? rawEntries?.delta, segments[0]?.gap ?? 0);
    return { operator: resolveName(operatorKey), totalSeconds: segments.reduce((sum, segment) => sum + segment.seconds, 0), gap: operatorGap, segments };
  }).filter((bar) => bar.totalSeconds > 0).sort((a, b) => {
    const orderA = operatorOrder.get(a.operator.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    const orderB = operatorOrder.get(b.operator.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    return orderA === orderB ? 0 : orderA - orderB;
  });
};

export function WaterfallOutputRate({ resultados, taskCode, operadores = [], operatorOrder = [], waterfallData, embedded = false }: { resultados: ResultadosBalanceamento; taskCode: string; operadores?: any[]; operatorOrder?: string[]; waterfallData?: any; embedded?: boolean }) {
  const rawSource = waterfallData && typeof waterfallData === "object" ? waterfallData : resultados;
  const source = rawSource.data && typeof rawSource.data === "object" ? rawSource.data : rawSource;
  const rows = Array.isArray(source.operation_allocations)
    ? source.operation_allocations
    : Array.isArray(source.operationAllocations)
      ? source.operationAllocations
      : [];
  const operatorColumns = buildOperatorColumns(
    rows as any,
    operadores,
    Array.isArray(resultados.operator_slots) ? resultados.operator_slots : [],
    [],
  );
  const stationSource = source.stations ?? source.waterfall ?? source.waterfall_data ?? source.chart_data;
  const stations = Array.isArray(stationSource)
    ? stationSource.map((station: any, index: number) => ({
        key: String(station.key ?? station.id ?? index),
        seq: numberOr(station.seq ?? station.sequence, index + 1),
        name: String(station.name ?? station.station_name ?? station.operation_name ?? station.operation_code ?? `Estação ${index + 1}`),
        code: String(station.code ?? station.station_code ?? station.operation_code ?? ""),
        totalTime: numberOr(station.total_time_seconds ?? station.output_rate ?? station.outputRate, 0),
        splitCount: Math.max(1, Math.trunc(numberOr(station.split_count, 1))),
        outputRate: numberOr(station.output_rate ?? station.outputRate ?? station.rate, 0),
        gap: numberOr(station.gap ?? station.delta ?? station.change, 0),
      })).filter((station: OutputRateStation) => station.outputRate > 0)
    : buildStations(source as ResultadosBalanceamento, operatorColumns);

  const groupedBars = buildGroupedOperatorBars(source, operadores, operatorOrder);
  const groupedReferenceSeconds = numberOr(
    rawSource.allocation?.share_per_operator_seconds_real,
    0,
  );

  if (groupedBars.length > 0) {
    const isTheoretical = Boolean(source?.theoretical);
    const chartWidth = Math.max(1000, groupedBars.length * (embedded ? 150 : 125));
    const chartHeight = embedded ? 520 : 480;
    const margin = embedded
      ? { top: 36, right: 130, bottom: 76, left: 56 }
      : { top: 58, right: 24, bottom: 112, left: 78 };
    const plotWidth = chartWidth - margin.left - margin.right;
    const plotHeight = chartHeight - margin.top - margin.bottom;
    const maxTotal = Math.max(...groupedBars.map((bar) => bar.totalSeconds), 1);
    const maxY = Math.max(maxTotal * (embedded ? 1.28 : 1.35), groupedReferenceSeconds > 0 ? groupedReferenceSeconds * 1.2 : 0);
    const yFor = (value: number) => margin.top + plotHeight - (value / maxY) * plotHeight;
    const baseline = yFor(0);
    const barWidth = Math.min(90, (plotWidth / groupedBars.length) * 0.58);
    const ticks = [0, maxY / 4, maxY / 2, (maxY * 3) / 4, maxY];
    const legend = Array.from(new Set(groupedBars.flatMap((bar) => bar.segments.map((segment) => `${segment.machine}|${segment.color}`)))).map((entry) => {
      const [machine, color] = entry.split("|");
      return { machine, color };
    });
    return (
      <section className={embedded ? "w-full min-w-0 max-w-full p-0" : "w-full min-w-0 max-w-full rounded-sm border border-gray-200 bg-white p-4 shadow-sm"}>
        {!embedded && <div className="mb-2"><h3 className="text-sm font-semibold text-gray-900">Tempo por Operador x Máquina — {taskCode}</h3><p className="mt-1 text-xs text-gray-500">Eixo X: operador | Eixo Y: segundos empilhados por máquina</p></div>}
        <style>{`.operator-machine-chart > svg { width: ${chartWidth}px !important; min-width: ${chartWidth}px !important; }`}</style>
        <div className="operator-machine-chart flex min-w-0 w-full max-w-full overflow-x-scroll overflow-y-hidden [&>svg]:!h-[520px] [&>svg]:!min-h-[520px]" style={{ width: "100%", justifyContent: "safe center" }}>
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className={embedded ? "h-[500px] min-h-[500px] w-[90%] min-w-[1000px] max-w-none" : "h-auto min-w-[900px]"} role="img" aria-label={`Tempo por operador e máquina para ${taskCode}`}>
            {ticks.map((tick) => <g key={tick}><line x1={margin.left} x2={chartWidth - margin.right} y1={yFor(tick)} y2={yFor(tick)} stroke="#e5e7eb" strokeDasharray="3 3" /><text x={margin.left - 10} y={yFor(tick) + 4} textAnchor="end" fontSize={embedded ? 12 : 11} fill="#6b7280">{tick.toFixed(1)}s</text></g>)}
            <line x1={margin.left} x2={margin.left} y1={margin.top} y2={baseline} stroke="#9ca3af" />
            <line x1={margin.left} x2={chartWidth - margin.right} y1={baseline} y2={baseline} stroke="#9ca3af" />
            {groupedBars.map((bar, index) => {
              const x = margin.left + (plotWidth * (index + 0.5)) / groupedBars.length - barWidth / 2;
              const occupancyMatch = bar.operator.match(/\((-?\d+(?:\.\d+)?)%\)$/);
              const occupancy = isTheoretical && groupedReferenceSeconds > 0
                ? (bar.totalSeconds / groupedReferenceSeconds) * 100
                : occupancyMatch ? Number(occupancyMatch[1]) : null;
              const operatorLabelColor = occupancy == null ? "#333" : occupancy > 100.05 ? "#D64545" : occupancy >= 99.95 ? "#2E9D67" : "#C58A27";
              const operatorName = occupancyMatch ? bar.operator.replace(/\s*\((-?\d+(?:\.\d+)?)%\)$/, "") : bar.operator;
              const targetBarHeight = (bar.totalSeconds / maxY) * plotHeight;
              const minimumSegmentHeight = 24;
              const minimumTotalHeight = bar.segments.length * minimumSegmentHeight;
              const segmentHeights = targetBarHeight >= minimumTotalHeight
                ? bar.segments.map((segment) => minimumSegmentHeight + (targetBarHeight - minimumTotalHeight) * (segment.seconds / bar.totalSeconds))
                : bar.segments.map((segment) => targetBarHeight * (segment.seconds / bar.totalSeconds));
              const visualBarHeight = segmentHeights.reduce((height, segmentHeight) => height + segmentHeight, 0);
              const stackTop = baseline - visualBarHeight;
              const valueLabelY = stackTop - 10;
              const gapLabelY = valueLabelY - 22;
              let currentY = baseline;
              return <g key={bar.operator}>
                <text x={x + barWidth / 2} y={valueLabelY} textAnchor="middle" fontSize={embedded ? 11 : 10} fontWeight="700">
                  {occupancy != null && <><tspan fill={operatorLabelColor}>{occupancy.toFixed(0)}%</tspan><tspan fill="#9ca3af"> · </tspan></>}
                  <tspan fill="#374151">{bar.totalSeconds.toFixed(1)}s</tspan>
                </text>
                {Math.abs(bar.gap) >= 0.05 && <text x={x + barWidth / 2} y={gapLabelY} textAnchor="middle" fontSize={embedded ? 11 : 10} fontWeight="700" fill={bar.gap < 0 ? "#2E9D67" : "#D64545"}>{bar.gap > 0 ? `+${bar.gap.toFixed(1)}s` : `${bar.gap.toFixed(1)}s`}</text>}
                {bar.segments.map((segment, segmentIndex) => {
                  const height = segmentHeights[segmentIndex];
                  currentY -= height;
                  const operationLabel = segment.operation.length > 13 ? `${segment.operation.slice(0, 12)}…` : segment.operation;
                  return <g key={`${bar.operator}-${segment.machine}-${segment.operation}-${currentY}`}><rect x={x} y={currentY} width={barWidth} height={height} fill={segment.color} /><title>{`${bar.operator} · ${segment.operation} · ${segment.machine} · ${segment.seconds.toFixed(1)}s`}</title>{height > 30 ? <text x={x + barWidth / 2} y={currentY + height / 2 - 8} textAnchor="middle" fontSize={embedded ? 9 : 9} fontWeight="700" fill="#fff"><tspan x={x + barWidth / 2} dy="0">{operationLabel}</tspan><tspan x={x + barWidth / 2} dy="12">{segment.seconds.toFixed(1)}s</tspan></text> : <text x={x + barWidth / 2} y={currentY + height / 2 - 3} textAnchor="middle" fontSize={embedded ? 8 : 8} fontWeight="700" fill="#fff"><tspan x={x + barWidth / 2} dy="0">{operationLabel}</tspan><tspan x={x + barWidth / 2} dy="10">{segment.seconds.toFixed(1)}s</tspan></text>}</g>;
                })}
                {isTheoretical && <rect x={x} y={stackTop} width={barWidth} height={visualBarHeight} fill="none" stroke={operatorLabelColor} strokeWidth="1.2" strokeOpacity="0.8" rx="2" />}
                <text x={x + barWidth / 2} y={baseline + (embedded ? 23 : 48)} textAnchor="middle" fontSize={embedded ? 12 : 11} fontWeight="600" fill="#333">{operatorName.length > 20 ? `${operatorName.slice(0, 19)}…` : operatorName}</text>
              </g>;
            })}
            {groupedReferenceSeconds > 0 && <g><line x1={margin.left} x2={chartWidth - margin.right} y1={yFor(groupedReferenceSeconds)} y2={yFor(groupedReferenceSeconds)} stroke="#263B63" strokeOpacity="0.4" strokeWidth="1.6" strokeDasharray="9 8" /><rect x={chartWidth - 145} y={Math.max(margin.top, yFor(groupedReferenceSeconds) - 11)} width="137" height="20" rx="4" fill="#263B63" fillOpacity="0.9" /><text x={chartWidth - 76} y={Math.max(margin.top + 14, yFor(groupedReferenceSeconds) + 3)} textAnchor="middle" fontSize={embedded ? 11 : 11} fontWeight="700" fill="#fff">{isTheoretical ? "Tempo teórico:" : "Tempo Real:"} {groupedReferenceSeconds.toFixed(1)}s</text></g>}
          </svg>
        </div>
        {legend.length > 0 && <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] text-gray-600">{legend.map((item) => <span key={item.machine}><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />{item.machine}</span>)}</div>}
      </section>
    );
  }

  if (stations.length === 0) {
    return (
      <section className={embedded ? "p-2" : "rounded-sm border border-gray-200 bg-white p-5 shadow-sm"}>
        <h3 className="text-sm font-semibold text-gray-900">Waterfall por Estação — {taskCode}</h3>
        <p className="mt-3 text-xs text-gray-500">Não existem dados de output rate disponíveis para este balanceamento.</p>
      </section>
    );
  }

  const chartWidth = Math.max(1000, stations.length * (embedded ? 150 : 125));
  const chartHeight = embedded ? 440 : 430;
  const margin = embedded
    ? { top: 16, right: 14, bottom: 58, left: 56 }
    : { top: 58, right: 24, bottom: 112, left: 78 };
  const plotWidth = chartWidth - margin.left - margin.right;
  const plotHeight = chartHeight - margin.top - margin.bottom;
  const maxRate = Math.max(...stations.map((station) => station.outputRate), 1);
  const referenceSeconds = numberOr(
    rawSource.allocation?.share_per_operator_seconds_real,
    0,
  );
  const maxY = Math.max(
    maxRate * (embedded ? 1.4 : 1.35),
    referenceSeconds > 0 ? referenceSeconds * 1.15 : 0,
  );
  const barWidth = Math.min(embedded ? 76 : 76, (plotWidth / stations.length) * 0.62);
  const xFor = (index: number) => margin.left + (plotWidth * (index + 0.5)) / stations.length;
  const yFor = (value: number) => margin.top + plotHeight - (value / maxY) * plotHeight;
  const baseline = yFor(0);
  const ticks = [0, maxY / 4, maxY / 2, (maxY * 3) / 4, maxY];

  return (
    <section className={embedded ? "p-0" : "rounded-sm border border-gray-200 bg-white p-4 shadow-sm"}>
      {!embedded && <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
        <h3 className="text-sm font-semibold text-gray-900">Ocupação por Trabalhador — Waterfall por Estação — {taskCode}</h3>
        <p className="mt-1 text-xs text-gray-500">Estações/operações atribuídas a cada trabalhador, na sequência da linha</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.FIRST }} />Referência</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.SLOWER }} />Mais lenta</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.FASTER }} />Mais rápida</span>
        </div>
      </div>}
         <div className="flex w-full justify-center overflow-x-auto [&>svg]:!h-[440px] [&>svg]:!min-h-[440px] [&>svg]:mx-auto">
         <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className={embedded ? "h-[400px] min-h-[400px] w-[90%] min-w-[1000px] max-w-none" : "h-auto min-w-[900px]"} role="img" aria-label={`Waterfall de ocupação por trabalhador para ${taskCode}`}>
          {ticks.map((tick) => {
            const y = yFor(tick);
            return (
              <g key={tick}>
                <line x1={margin.left} x2={chartWidth - margin.right} y1={y} y2={y} stroke="#e5e7eb" strokeDasharray="3 3" />
                <text x={margin.left - 10} y={y + 4} textAnchor="end" fontSize={embedded ? 12 : 11} fill="#6b7280">{tick.toFixed(1)}</text>
              </g>
            );
          })}
          <line x1={margin.left} x2={margin.left} y1={margin.top} y2={baseline} stroke="#9ca3af" />
          <line x1={margin.left} x2={chartWidth - margin.right} y1={baseline} y2={baseline} stroke="#9ca3af" />
          <text transform={`translate(17 ${margin.top + plotHeight / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill={COLORS.TEXT}>Segundos</text>
          {stations.map((station, index) => {
            const x = xFor(index) - barWidth / 2;
            const y = yFor(station.outputRate);
            const color = getBarColor(index, station.gap);
            const numericLabel = station.code.trim() || String(station.seq);
             const gapLabel = station.gap > 0 ? `+${station.gap.toFixed(1)}s` : station.gap < 0 ? `${station.gap.toFixed(1)}s` : "";
            const labelLines = station.name.length > 22 ? [station.name.slice(0, 21) + "…"] : [station.name];
            return (
              <g key={station.key}>
                <title>{`${station.name}: ${station.outputRate.toFixed(1)}s/peça${gapLabel ? `, gap ${gapLabel}` : ""}`}</title>
                {gapLabel ? <text x={xFor(index)} y={Math.max(18, y - 27)} textAnchor="middle" fontSize={embedded ? 13 : 11} fontWeight="700" fill={color}>{gapLabel}</text> : null}
                <text x={xFor(index)} y={Math.max(34, y - 9)} textAnchor="middle" fontSize={embedded ? 13 : 11} fontWeight="700" fill={COLORS.TEXT}>{station.outputRate.toFixed(1)}s</text>
                <rect x={x} y={y} width={barWidth} height={Math.max(1, baseline - y)} rx="2" fill={color} />
                 {[numericLabel].map((line) => <text key={line} x={xFor(index)} y={baseline + (embedded ? 24 : 48)} textAnchor="middle" fontSize={embedded ? 12 : 11} fontWeight="600" fill={COLORS.TEXT}>{line}</text>)}
                <text x={xFor(index)} y={baseline + (embedded ? 44 : 76)} textAnchor="middle" fontSize={embedded ? 11 : 10} fill="#6b7280">(seq {station.seq}{station.splitCount > 1 ? `, ×${station.splitCount}` : ""})</text>
              </g>
            );
          })}
          {referenceSeconds > 0 && (
            <g>
              <line x1={margin.left} x2={chartWidth - margin.right} y1={yFor(referenceSeconds)} y2={yFor(referenceSeconds)} stroke="#1e3a5f" strokeWidth="1.5" strokeDasharray="7 5" />
              <rect x={chartWidth - margin.right - 112} y={Math.max(margin.top, yFor(referenceSeconds) - 11)} width="112" height="20" rx="4" fill="#1e3a5f" />
              <text x={chartWidth - margin.right - 56} y={Math.max(margin.top + 14, yFor(referenceSeconds) + 3)} textAnchor="middle" fontSize={embedded ? 11 : 11} fontWeight="700" fill="#ffffff">
                100% · {referenceSeconds.toFixed(1)}s
              </text>
            </g>
          )}
        </svg>
      </div>
    </section>
  );
}
