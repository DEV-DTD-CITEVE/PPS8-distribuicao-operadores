import { ResultadosBalanceamento, ConfiguracaoDistribuicao, DistribuicaoCarga } from "../types";
import { TabelaDistribuicao } from "./TabelaDistribuicao";
import svgPaths from "../../imports/Card-2/svg-8qif09w5n2";

interface DashboardResultadosProps {
  resultados: ResultadosBalanceamento;
  operadores: any[];
  operacoes: any[];
  config: ConfiguracaoDistribuicao;
  onRecalcular: (novosResultados: ResultadosBalanceamento, novaConfig: ConfiguracaoDistribuicao) => void;
  onDistribuicaoChange?: (novaDistribuicao: DistribuicaoCarga[]) => void;
  viewMode?: "tempo" | "percentagem";
  onViewModeChange?: (mode: "tempo" | "percentagem") => void;
  onConfirmarEdicao?: (editedRows: any[]) => Promise<void>;
  onGuardarHistorico?: () => Promise<void>;
  isAjustando?: boolean;
  isGuardandoHistorico?: boolean;
  showOccupacaoCard?: boolean;
  showTabela?: boolean;
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getShortOperatorCode(raw: string): string {
  const text = String(raw || "").trim();
  if (!text) return "";
  const inParens = text.match(/\(([^)]+)\)/)?.[1]?.trim();
  if (inParens) return inParens;
  const codeToken = text.match(/\b[A-Za-z]{1,}\d+\b/)?.[0];
  if (codeToken) return codeToken;
  return text;
}

function resolveOperatorCode(operadorId: string, operadores: any[]): string {
  const idKey = normalizeKey(operadorId);
  const idDigits = (operadorId.match(/\d+/g) || []).join("");
  const byId = operadores.find((op: any) => normalizeKey(String(op?.id || "")) === idKey);
  if (byId?.id) return String(byId.id);

  const byNome = operadores.find((op: any) => normalizeKey(String(op?.nome || "")) === idKey);
  if (byNome?.id) return String(byNome.id);

  const byNomeParcial = operadores.find((op: any) => {
    const nomeKey = normalizeKey(String(op?.nome || ""));
    if (!nomeKey) return false;
    return nomeKey.includes(idKey) || idKey.includes(nomeKey);
  });
  if (byNomeParcial?.id) return String(byNomeParcial.id);

  const shortFromRaw = getShortOperatorCode(operadorId);
  const shortKey = normalizeKey(shortFromRaw);
  const byShort = operadores.find((op: any) => normalizeKey(String(op?.id || "")) === shortKey);
  if (byShort?.id) return String(byShort.id);

  if (idDigits) {
    const byDigits = operadores.find((op: any) => {
      const opDigits = (String(op?.id || "").match(/\d+/g) || []).join("");
      return Boolean(opDigits) && (opDigits === idDigits || opDigits.endsWith(idDigits) || idDigits.endsWith(opDigits));
    });
    if (byDigits?.id) return String(byDigits.id);
  }

  return shortFromRaw || operadorId;
}

function buildDisplayCodeMap(distribuicao: DistribuicaoCarga[]): Map<string, string> {
  const map = new Map<string, string>();
  distribuicao.forEach((dist) => {
    const rawId = String(dist?.operadorId || "").trim();
    if (!rawId || map.has(rawId)) return;
    map.set(rawId, `OP${map.size + 1}`);
  });
  return map;
}

function getBatteryColor(ocupacao: number): string {
  if (ocupacao > 100) return "#DC2626";
  if (ocupacao >= 90) return "#10B981";
  if (ocupacao >= 70) return "#FBBF24";
  return "#FBBF24";
}

function parseNumberLike(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const normalized = value.trim().replace(",", ".");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizePercentageValue(value: number): number {
  return value <= 1 ? value * 100 : value;
}

const operatorPalette = [
  "#2563eb",
  "#16a34a",
  "#db2777",
  "#ea580c",
  "#7c3aed",
  "#ca8a04",
  "#0891b2",
  "#0f766e",
  "#dc2626",
  "#4f46e5",
  "#9333ea",
  "#c2410c",
];

function getCollaboratorLabel(rawOperatorId: string, fallbackCode: string): string {
  const rawDigits = (String(rawOperatorId || "").match(/\d+/g) || []).join("");
  if (rawDigits) return String(Number(rawDigits));

  const codeDigits = (String(fallbackCode || "").match(/\d+/g) || []).join("");
  if (codeDigits) return String(Number(codeDigits));

  return fallbackCode || rawOperatorId;
}

function generateFillPath(height: number): string {
  const h = Math.max(height, 3.27);
  return `M37.6364 0H1.63636C0.732625 0 0 0.732625 0 1.63636V${(h - 1.63636).toFixed(5)}C0 ${(h - 0.732625).toFixed(5)} 0.732625 ${h.toFixed(5)} 1.63636 ${h.toFixed(5)}H37.6364C38.5401 ${h.toFixed(5)} 39.2727 ${(h - 0.732625).toFixed(5)} 39.2727 ${(h - 1.63636).toFixed(5)}V1.63636C39.2727 0.732625 38.5401 0 37.6364 0Z`;
}

const BATTERY_TOTAL_HEIGHT = 174.545;
const BATTERY_START_MT = 6.55;

export function DashboardResultados({
  resultados,
  operadores,
  operacoes,
  config,
  onDistribuicaoChange,
  viewMode = "tempo",
  onViewModeChange,
  onConfirmarEdicao,
  onGuardarHistorico,
  isAjustando = false,
  isGuardandoHistorico = false,
  showOccupacaoCard = true,
  showTabela = true,
}: DashboardResultadosProps) {
  const cycleTimeSeconds =
    Number((resultados as any)?.cycle_time_seconds) > 0
      ? Number((resultados as any)?.cycle_time_seconds)
      : Math.max(0, Number(resultados?.tempoCiclo || 0) * 60);
  const slotOrderedOperatorCodes = (() => {
    const slots = Array.isArray((resultados as any)?.operator_slots) ? [...((resultados as any).operator_slots as any[])] : [];
    if (slots.length === 0) return [] as string[];
    return slots
      .sort((a, b) => {
        const aPos = Number(a?.position_number);
        const bPos = Number(b?.position_number);
        const safeAPos = Number.isFinite(aPos) ? aPos : Number.MAX_SAFE_INTEGER;
        const safeBPos = Number.isFinite(bPos) ? bPos : Number.MAX_SAFE_INTEGER;
        if (safeAPos !== safeBPos) return safeAPos - safeBPos;
        return String(a?.operator_id || "").localeCompare(String(b?.operator_id || ""));
      })
      .map((slot) => resolveOperatorCode(String(slot?.operator_id || slot?.operator_name || ""), operadores))
      .filter(Boolean);
  })();
  const resolveOperatorAliases = (rawRef: string): string[] => {
    const ref = String(rawRef || "").trim();
    if (!ref) return [];
    const aliases = new Set<string>();
    const addAlias = (value: string) => {
      const normalized = normalizeKey(value);
      if (normalized) aliases.add(normalized);
    };
    addAlias(ref);
    addAlias(resolveOperatorCode(ref, operadores));
    const opMatch = ref.match(/^OP\s*0*(\d+)$/i);
    if (opMatch) {
      const idx = Number(opMatch[1]) - 1;
      if (idx >= 0 && idx < slotOrderedOperatorCodes.length) {
        addAlias(slotOrderedOperatorCodes[idx]);
      }
    }
    return Array.from(aliases);
  };
  const occupancyByOperator = new Map<string, number>();
  const tableDataRaw =
    (resultados as any)?.table_data ??
    (resultados as any)?.tableData ??
    (resultados as any)?.operator_table ??
    (resultados as any)?.operatorTable ??
    (resultados as any)?.results_table ??
    null;
  const tableRows = Array.isArray(tableDataRaw)
    ? tableDataRaw
    : tableDataRaw && typeof tableDataRaw === "object"
      ? Object.entries(tableDataRaw as Record<string, unknown>).map(([key, value]) =>
          value && typeof value === "object" && !Array.isArray(value)
            ? { operator: key, ...(value as Record<string, unknown>) }
            : { operator: key, occupancy: value }
        )
      : [];
  tableRows.forEach((row: any) => {
    const operatorRef = String(row?.operator ?? row?.operator_id ?? row?.operador ?? row?.operador_id ?? "").trim();
    if (!operatorRef) return;
    const rawOccupancy = Number(
      row?.occupancy ??
      row?.occupancy_percent ??
      row?.operator_occupancy ??
      row?.worker_occupancy ??
      row?.ocupacao
    );
    if (!Number.isFinite(rawOccupancy)) return;
    const normalizedOccupancy = rawOccupancy <= 1 ? rawOccupancy * 100 : rawOccupancy;
    resolveOperatorAliases(operatorRef).forEach((key) => {
      occupancyByOperator.set(key, normalizedOccupancy);
    });
  });
  const maxSegundosPorOperador = new Map<string, number>();
  const totaisSegundosPorOperador = new Map<string, number>();
  const sharePerOperatorSecondsRaw = (resultados as any)?.share_per_operator_seconds;
  const sharePerOperatorSecondsScalar =
    typeof sharePerOperatorSecondsRaw === "number" && Number.isFinite(sharePerOperatorSecondsRaw) && sharePerOperatorSecondsRaw > 0
      ? sharePerOperatorSecondsRaw
      : typeof sharePerOperatorSecondsRaw === "string"
        ? parseNumberLike(sharePerOperatorSecondsRaw)
        : null;
  const sharePerOperatorSeconds =
    sharePerOperatorSecondsRaw &&
    typeof sharePerOperatorSecondsRaw === "object"
      ? (sharePerOperatorSecondsRaw as Record<string, unknown>)
      : null;

  if (sharePerOperatorSeconds) {
    Object.entries(sharePerOperatorSeconds).forEach(([operatorRef, rawSeconds]) => {
      const seconds = Number(rawSeconds);
      if (!Number.isFinite(seconds) || seconds <= 0) return;
      resolveOperatorAliases(String(operatorRef)).forEach((key) => {
        maxSegundosPorOperador.set(key, seconds);
      });
    });
  }
  const operationAllocations = Array.isArray((resultados as any)?.operation_allocations)
    ? ((resultados as any).operation_allocations as any[])
    : [];
  operationAllocations.forEach((row: any) => {
    const operatorTimes = row?.operator_times && typeof row.operator_times === "object" ? row.operator_times : {};
    const hasOperatorTimes = Object.keys(operatorTimes).length > 0;
    if (hasOperatorTimes) {
      Object.entries(operatorTimes).forEach(([operatorRef, rawSeconds]) => {
        const seconds = Number(rawSeconds);
        if (!Number.isFinite(seconds) || seconds <= 0) return;
        resolveOperatorAliases(String(operatorRef)).forEach((key) => {
          totaisSegundosPorOperador.set(key, (totaisSegundosPorOperador.get(key) || 0) + seconds);
        });
      });
      return;
    }

    const operatorAllocations = Array.isArray(row?.operator_allocations) ? row.operator_allocations : [];
    if (operatorAllocations.length > 0) {
      operatorAllocations.forEach((allocation: any) => {
        const operatorRef = String(
          allocation?.operator_code ??
          allocation?.operator_id ??
          allocation?.operador_id ??
          allocation?.operator ??
          allocation?.operador ??
          ""
        ).trim();
        if (!operatorRef) return;
        const seconds = Number(
          allocation?.time_seconds ??
          allocation?.tempo_segundos ??
          allocation?.seconds ??
          allocation?.time
        );
        if (!Number.isFinite(seconds) || seconds <= 0) return;
        resolveOperatorAliases(String(operatorRef)).forEach((key) => {
          totaisSegundosPorOperador.set(key, (totaisSegundosPorOperador.get(key) || 0) + seconds);
        });
      });
      return;
    }

    const operatorPositions = row?.operator_positions && typeof row.operator_positions === "object" ? row.operator_positions : {};
    Object.entries(operatorPositions).forEach(([operatorRef, positionRaw]) => {
      const position = positionRaw && typeof positionRaw === "object" ? (positionRaw as Record<string, unknown>) : null;
      const seconds = Number(position?.time_seconds);
      if (!Number.isFinite(seconds) || seconds <= 0) return;
      resolveOperatorAliases(String(operatorRef)).forEach((key) => {
        totaisSegundosPorOperador.set(key, (totaisSegundosPorOperador.get(key) || 0) + seconds);
      });
    });
  });

  const orderedOperatorCodes = (() => {
    const ordered = new Map<string, string>();
    const appendOperator = (rawCode: string) => {
      const resolved = resolveOperatorCode(rawCode, operadores);
      const normalized = normalizeKey(resolved || rawCode);
      if (!normalized) return;
      if (!ordered.has(normalized)) {
        ordered.set(normalized, String(resolved || rawCode));
      }
    };

    slotOrderedOperatorCodes.forEach(appendOperator);

    if (totaisSegundosPorOperador.size > 0 || maxSegundosPorOperador.size > 0) {
      Array.from(new Set([
        ...Array.from(totaisSegundosPorOperador.keys()),
        ...Array.from(maxSegundosPorOperador.keys()),
      ])).forEach((key) => {
        const fromOperadores = operadores.find((op: any) => normalizeKey(String(op?.id || "")) === key);
        appendOperator(String(fromOperadores?.id || key));
      });
    }

    (resultados.distribuicao || []).forEach((dist) => {
      appendOperator(String(dist?.operadorId || ""));
    });

    return Array.from(ordered.values());
  })();
  const displayCodeByOperatorId = buildDisplayCodeMap(resultados.distribuicao || []);
  const distribuicaoByOperator = new Map(
    (resultados.distribuicao || []).map((dist) => [normalizeKey(resolveOperatorCode(dist.operadorId, operadores)), dist])
  );
  const occupancyPercentByOperator = new Map<string, number>();
  const getOperatorTimeFromRow = (row: any, operatorCode: string): number | null => {
    const directTime = parseNumberLike(row?.operator_times?.[operatorCode]);
    if (directTime != null) return directTime;

    const normalizedKey = normalizeKey(operatorCode);
    const normalizedMatch = Object.entries(row?.operator_times || {}).find(([candidate]) => normalizeKey(candidate) === normalizedKey);
    if (normalizedMatch) {
      const parsed = parseNumberLike(normalizedMatch[1]);
      if (parsed != null) return parsed;
    }

    const allocations = Array.isArray(row?.operator_allocations) ? row.operator_allocations : [];
    for (const allocation of allocations) {
      const record = allocation as Record<string, unknown>;
      const allocationOperatorCode = String(
        record.operator_code ??
        record.operator_id ??
        record.operador_id ??
        record.operator ??
        record.operador ??
        record.code ??
        ""
      ).trim();
      if (!allocationOperatorCode || normalizeKey(allocationOperatorCode) !== normalizedKey) continue;
      const parsed = parseNumberLike(
        record.time_seconds ??
        record.tempo_segundos ??
        record.seconds ??
        record.time ??
        record.time_min ??
        record.time_minutes ??
        record.minutes
      );
      if (parsed != null) return parsed;
    }

    const positionEntry = Object.entries(row?.operator_positions || {}).find(([candidate]) => normalizeKey(candidate) === normalizedKey);
    const positionTime = parseNumberLike((positionEntry?.[1] as any)?.time_seconds);
    if (positionTime != null) return positionTime;
    return null;
  };
  const getOperatorPercentageFromRow = (row: any, operatorCode: string): number | null => {
    const normalizedKey = normalizeKey(operatorCode);
    const candidateKeys = new Set<string>([
      operatorCode,
      normalizedKey,
    ]);

    const percentageMaps = [
      row?.occupancy_percentage,
      row?.occupancy_percentages,
      row?.operator_percentages,
      row?.operator_percentage,
      row?.operator_percents,
      row?.operator_occupancy,
    ];

    for (const map of percentageMaps) {
      if (!map || typeof map !== "object") continue;
      for (const [rawKey, rawValue] of Object.entries(map as Record<string, unknown>)) {
        const parsed = parseNumberLike(rawValue);
        if (parsed == null) continue;
        const normalizedRawKey = normalizeKey(rawKey);
        if (candidateKeys.has(rawKey) || candidateKeys.has(normalizedRawKey) || normalizedRawKey === normalizedKey) {
          return normalizePercentageValue(parsed);
        }
      }
    }

    const allocations = Array.isArray(row?.operator_allocations) ? row.operator_allocations : [];
    for (const allocation of allocations) {
      const record = allocation as Record<string, unknown>;
      const allocationOperatorCode = String(
        record.operator_code ??
        record.operator_id ??
        record.operador_id ??
        record.operator ??
        record.operador ??
        record.code ??
        ""
      ).trim();
      const normalizedAllocationCode = normalizeKey(allocationOperatorCode);
      if (!allocationOperatorCode || (!candidateKeys.has(allocationOperatorCode) && !candidateKeys.has(normalizedAllocationCode) && normalizedAllocationCode !== normalizedKey)) {
        continue;
      }
      const parsed = parseNumberLike(
        record.occupancy_percentage ??
        record.percentage ??
        record.percent ??
        record.occupancy_percent ??
        record.operator_occupancy ??
        record.allocation_percentage ??
        record.share
      );
      if (parsed != null) return normalizePercentageValue(parsed);
    }

    return null;
  };
  orderedOperatorCodes.forEach((operatorCode) => {
    let totalPercent = 0;
    let hasPercentData = false;
    operationAllocations.forEach((row: any) => {
      const rowPercent = getOperatorPercentageFromRow(row, operatorCode);
      if (rowPercent == null) return;
      hasPercentData = true;
      totalPercent += rowPercent;
    });
    if (hasPercentData) {
      occupancyPercentByOperator.set(normalizeKey(operatorCode), totalPercent);
    }
  });
  const hasOccupancyFromTable = Array.from(occupancyPercentByOperator.values()).some((value) => value > 0);
  const dadosCarga = orderedOperatorCodes.map((operatorCode, index) => {
    const normalizedOperatorCode = normalizeKey(operatorCode);
    const dist = distribuicaoByOperator.get(normalizedOperatorCode);
    const codigo =
      displayCodeByOperatorId.get(String(dist?.operadorId || "").trim()) ||
      operatorCode;
    const colaboradorLabel = getCollaboratorLabel(String(dist?.operadorId || operatorCode), codigo);
    const fallbackTotal = Number(dist?.cargaHoraria) * 60;
    const totalFromAllocations = totaisSegundosPorOperador.get(normalizedOperatorCode);
    const maxFromShare = maxSegundosPorOperador.get(normalizedOperatorCode);
    const totalTimeSeconds = Number.isFinite(fallbackTotal) && fallbackTotal > 0
      ? fallbackTotal
      : Number.isFinite(totalFromAllocations as number) && (totalFromAllocations as number) > 0
        ? (totalFromAllocations as number)
        : Number(totalFromAllocations || 0);
    const denominatorSeconds = Number.isFinite(sharePerOperatorSecondsScalar as number) && (sharePerOperatorSecondsScalar as number) > 0
      ? (sharePerOperatorSecondsScalar as number)
      : Number.isFinite(maxFromShare as number) && (maxFromShare as number) > 0
        ? (maxFromShare as number)
        : cycleTimeSeconds > 0
          ? cycleTimeSeconds
          : 0;
    const ocupacaoFromDistribuicao = parseNumberLike(dist?.ocupacao);
    const ocupacaoFromSummary = occupancyByOperator.get(normalizedOperatorCode);
    const ocupacaoFromTable = occupancyPercentByOperator.get(normalizedOperatorCode);
    const ocupacaoFromTotal = denominatorSeconds > 0
      ? (totalTimeSeconds / denominatorSeconds) * 100
      : null;
    const ocupacaoExact =
      Number.isFinite(sharePerOperatorSecondsScalar as number) && Number.isFinite(ocupacaoFromTotal as number)
        ? (ocupacaoFromTotal as number)
        : Number.isFinite(ocupacaoFromSummary as number)
          ? (ocupacaoFromSummary as number)
          : Number.isFinite(ocupacaoFromDistribuicao as number)
            ? (ocupacaoFromDistribuicao as number)
            : Number.isFinite(ocupacaoFromTable as number)
              ? (ocupacaoFromTable as number)
              : Number.isFinite(ocupacaoFromTotal as number)
                ? (ocupacaoFromTotal as number)
                : Number(dist?.ocupacao || 0);

    return {
      idx: `op_${index}`,
      codigo,
      colaboradorLabel,
      operatorSortKey: normalizedOperatorCode,
      ocupacao: ocupacaoExact,
      ocupacaoDisplay: Math.round(ocupacaoExact),
      totalTimeSeconds,
    };
  }).filter((item) => {
    if (hasOccupancyFromTable) return item.ocupacao > 0;
    return item.totalTimeSeconds > 0 || item.ocupacao > 0;
  }).sort((a, b) => {
    const aIdx = orderedOperatorCodes.findIndex((code) => normalizeKey(code) === a.operatorSortKey);
    const bIdx = orderedOperatorCodes.findIndex((code) => normalizeKey(code) === b.operatorSortKey);
    const safeA = aIdx >= 0 ? aIdx : Number.MAX_SAFE_INTEGER;
    const safeB = bIdx >= 0 ? bIdx : Number.MAX_SAFE_INTEGER;
    if (safeA !== safeB) return safeA - safeB;
    return a.codigo.localeCompare(b.codigo);
  });
  const showTaktTimeLine = Number(config?.possibilidade) === 2;

  return (
    <div className="flex flex-col gap-4 items-start w-full">
      {showOccupacaoCard && (
      <div className="bg-white content-stretch flex flex-col gap-[41px] items-center pb-[24px] pt-px px-px relative rounded-[6px] w-full min-w-0">
        <div aria-hidden="true" className="absolute border border-[#e5e7eb] border-solid inset-0 pointer-events-none rounded-[6px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]" />

        <div className="relative shrink-0 w-full">
          <div aria-hidden="true" className="absolute border-[#e5e7eb] border-b border-solid inset-0 pointer-events-none" />
          <div className="content-stretch flex flex-col gap-[6px] items-start p-[24px] relative w-full">
            <div className="h-[20px] relative shrink-0 w-full">
              <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[20px] left-0 not-italic text-[#101828] text-[14px] top-0 tracking-[-0.1504px] whitespace-nowrap">
                Ocupação por Trabalhador
              </p>
            </div>
            <div className="content-stretch flex h-[16px] items-start relative shrink-0 w-full">
              <p className="flex-[1_0_0] font-['Inter:Regular',sans-serif] font-normal leading-[16px] min-h-px min-w-px not-italic relative text-[#717182] text-[12px]">
                Percentagem de carga horaria atribuida
              </p>
            </div>
          </div>
        </div>

        <div className="relative shrink-0 w-full overflow-x-auto">
          <div className="content-stretch flex gap-[12px] items-start justify-center px-[24px] min-w-full w-max relative">
            {dadosCarga.map((d) => {
              const fillHeight = (Math.min(d.ocupacao, 100) / 100) * BATTERY_TOTAL_HEIGHT;
              const fillMT = BATTERY_START_MT + (BATTERY_TOTAL_HEIGHT - fillHeight);
              const color = getBatteryColor(d.ocupacao);
              const fillPath = generateFillPath(fillHeight);

              return (
                <div key={d.idx} className="content-stretch flex flex-col gap-px items-center relative shrink-0 w-[76px]">
                  <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid leading-[0] place-items-start relative shrink-0">
                    <div className="col-1 h-[6.545px] ml-[13.09px] mt-0 relative row-1 w-[17.455px]">
                      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17.4545 6.54545">
                        <path d={svgPaths.p2631fa00} fill="#9CA3AF" />
                      </svg>
                    </div>

                  <div className="col-1 h-[174.545px] ml-0 mt-[6.55px] relative row-1 w-[43.636px]">
                    <div className="absolute inset-[-0.47%_-1.87%_-0.47%_-1.88%]">
                      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 45.2727 176.182">
                        <path d={svgPaths.p3d6b6400} fill="#F9FAFB" stroke="#D1D5DB" strokeWidth="1.63636" />
                      </svg>
                    </div>
                  </div>

                  {fillHeight > 2 && (
                    <div
                      className="col-1 ml-[2.18px] relative row-1 w-[39.273px]"
                      style={{ height: `${fillHeight}px`, marginTop: `${fillMT}px` }}
                    >
                      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox={`0 0 39.2727 ${fillHeight}`}>
                        <path d={fillPath} fill={color} />
                      </svg>
                    </div>
                  )}

                  {[144.73, 108.36, 72, 35.64].map((mt, idx) => (
                    <div key={idx} className="col-1 h-0 ml-[3.27px] relative row-1 w-[37.091px]" style={{ marginTop: `${mt}px` }}>
                      <div className="absolute inset-[-0.27px_0]">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 37.0909 0.545455">
                          <path d="M0 0.272727H37.0909" stroke="#E5E7EB" strokeDasharray="2.18 2.18" strokeWidth="0.545455" />
                        </svg>
                      </div>
                    </div>
                  ))}

                  {["OP1", "OP2", "OP3", "OP4", "OP5"].map((op, i) => {
                    const tops = [156.05, 120.05, 87.14, 50.05, 14.05];
                    return (
                      <p key={op} className="col-1 font-bold leading-[normal] not-italic relative row-1 text-[#dddbdb] text-[11.5px] text-center whitespace-nowrap" style={{ marginLeft: "9.91px", marginTop: `${tops[i]}px` }}>
                        {op}
                      </p>
                    );
                  })}
                </div>

                  <div className="relative shrink-0 w-full">
                    <div className="flex flex-col items-center justify-center size-full">
                      <div className="content-stretch flex flex-col gap-[8px] items-center justify-center p-[2px] relative w-full">
                        <p title={d.codigo} className="font-normal leading-[normal] not-italic relative shrink-0 text-[#6b7280] text-[11px] text-center whitespace-nowrap cursor-help">
                          {d.colaboradorLabel}
                        </p>
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center h-[16px] w-[78px]">
                          <p className="font-bold leading-[normal] not-italic relative text-[#6b7280] text-[11px] text-right whitespace-nowrap pr-[4px]">{d.totalTimeSeconds.toFixed(1)}s</p>
                          <p className="font-bold leading-[normal] not-italic relative text-[#9ca3af] text-[11px] text-center whitespace-nowrap">|</p>
                          <p className="font-bold leading-[normal] not-italic relative text-[#6b7280] text-[11px] text-left whitespace-nowrap pl-[4px]">{d.ocupacaoDisplay}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {showTaktTimeLine && (
              <div className="absolute content-stretch flex items-center justify-end left-0 right-0 z-10" style={{ top: 0 }}>
                <div className="flex-[1_0_0] h-0 min-h-px min-w-px relative">
                  <div className="absolute inset-[-0.82px_0]">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 534.896 1.63636">
                      <path d="M0 0.818182H534.896" stroke="#1E3A5F" strokeDasharray="6.55 3.27" strokeWidth="1.63636" />
                    </svg>
                  </div>
                </div>
                <div className="bg-[#1e3a5f] content-stretch flex h-[17.455px] items-center justify-center p-[6px] relative rounded-[4px] shrink-0 w-[73.104px]">
                  <p className="font-bold leading-[normal] not-italic relative shrink-0 text-[8.727px] text-center text-white whitespace-nowrap">
                    TT {(resultados.taktTime * 60).toFixed(1)}s
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {showTabela && (
      <div className="w-full min-w-0">
        <TabelaDistribuicao
          resultados={resultados}
          operadores={operadores}
          operacoes={operacoes}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          unidadeTempo="s"
          onDistribuicaoChange={onDistribuicaoChange}
          onConfirmarEdicao={onConfirmarEdicao}
          onGuardarHistorico={onGuardarHistorico}
          isAjustando={isAjustando}
          isGuardandoHistorico={isGuardandoHistorico}
        />
      </div>
      )}
    </div>
  );
}
