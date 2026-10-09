import { useLocation, useNavigate } from "react-router";
import { ResultadosBalanceamento, ConfiguracaoDistribuicao } from "../types";
import { DashboardResultados } from "../components/DashboardResultados";
import { VisualizadorFluxo } from "../components/VisualizadorFluxo";
import { ResumoResultados } from "../components/ResumoResultados";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { ArrowLeft, Download, Printer, Calculator } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";

export default function Resultados() {
  const location = useLocation();
  const navigate = useNavigate();

  // Tentar obter dados do state ou do sessionStorage
  let dataSource = location.state;
  
  if (!dataSource || !dataSource.resultados) {
    const stored = sessionStorage.getItem('balanceamentoData');
    if (stored) {
      try {
        dataSource = JSON.parse(stored);
      } catch (e) {
        console.error('Erro ao parsear dados do sessionStorage:', e);
      }
    }
  }

  // Check if state exists, if not redirect to home
  useEffect(() => {
    if (!dataSource || !dataSource.resultados) {
      navigate("/");
    }
  }, [dataSource, navigate]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  // Early return if no state
  if (!dataSource || !dataSource.resultados) {
    return null;
  }

  const { resultados, operadores, operacoes, config } = dataSource as {
    resultados: ResultadosBalanceamento;
    operadores: any[];
    operacoes: any[];
    config: ConfiguracaoDistribuicao;
  };
  const initialTaskCode = String((dataSource as any)?.taskCode || "").trim();
  const initialAjusteBodyBase = (dataSource as any)?.ajusteBodyBase;
  const mostrarTaktTimeKpi = Number((dataSource as any)?.config?.possibilidade) === 2;

  // Estado para resultados editaveis
  const [configAtual, setConfigAtual] = useState<ConfiguracaoDistribuicao>(config);
  const [viewMode, setViewMode] = useState<"tempo" | "percentagem">("tempo");
  const [taskCode] = useState<string>(initialTaskCode);
  const [ajusteBodyBase, setAjusteBodyBase] = useState<any>(initialAjusteBodyBase);
  const [isAjustando, setIsAjustando] = useState(false);
  const [isGuardandoHistorico, setIsGuardandoHistorico] = useState(false);
  const [erroPopup, setErroPopup] = useState<string | null>(null);
  const [sucessoPopup, setSucessoPopup] = useState<string | null>(null);

  const parseNumberLike = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const normalized = value.trim().replace(",", ".");
      const direct = Number(normalized);
      if (Number.isFinite(direct)) return direct;
    }
    return null;
  };

  const ensureArray = (value: unknown): any[] => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      const nested = Object.values(record).find((entry) => Array.isArray(entry));
      if (Array.isArray(nested)) return nested as any[];
    }
    return [];
  };
  const pickKpi = (
    raw: any,
    topLevelKeys: string[],
    nestedKpiKeys: string[] = topLevelKeys,
    options?: { preferNested?: boolean }
  ): number | null => {
    const kpis = raw?.kpis && typeof raw.kpis === "object" ? raw.kpis : null;
    const nested = kpis
      ? parseNumberLike(nestedKpiKeys.map((key) => kpis?.[key]).find((value) => value != null))
      : null;
    const direct = parseNumberLike(topLevelKeys.map((key) => raw?.[key]).find((value) => value != null));
    if (options?.preferNested) return nested ?? direct;
    return direct ?? nested;
  };
  const resolveMachineLayout = (raw: any): any[] =>
    ensureArray(
      raw?.machine_layout ??
      raw?.machineLayout ??
      raw?.layout_machines ??
      raw?.machine_positions ??
      raw?.machines_layout
    );

  const [resultadosAtuais, setResultadosAtuais] = useState<ResultadosBalanceamento>(() => ({
    ...(resultados as any),
    machine_layout:
      resolveMachineLayout(resultados).length > 0
        ? resolveMachineLayout(resultados)
        : resolveMachineLayout(initialAjusteBodyBase),
  }));
  const normalizeToken = (value: unknown): string =>
    String(value ?? "").trim().toLowerCase().replace(/^0+(\d)/, "$1");

  const resolveSharePerOperatorSeconds = (
    operatorRef: string,
    sharePerOperatorSeconds: Record<string, unknown> | null,
    sharePerOperatorScalar: number | null,
    fallbackSeconds: number
  ): number => {
    if (sharePerOperatorSeconds) {
      const normalizedOperatorRef = normalizeToken(operatorRef);
      for (const [rawKey, rawValue] of Object.entries(sharePerOperatorSeconds)) {
        if (normalizeToken(rawKey) !== normalizedOperatorRef) continue;
        const parsed = parseNumberLike(rawValue);
        if (parsed != null && parsed > 0) return parsed;
      }
    }

    if (sharePerOperatorScalar != null && sharePerOperatorScalar > 0) {
      return sharePerOperatorScalar;
    }

    return fallbackSeconds;
  };

  const buildOccupancyPercentagesFromTimes = (
    operatorTimes: Record<string, number>,
    sharePerOperatorSeconds: Record<string, unknown> | null,
    sharePerOperatorScalar: number | null,
    fallbackSeconds: number
  ): Record<string, number> => {
    const percentages: Record<string, number> = {};
    Object.entries(operatorTimes).forEach(([operatorRef, secondsRaw]) => {
      const seconds = Math.max(0, parseNumberLike(secondsRaw) ?? 0);
      if (!operatorRef || seconds <= 0) return;
      const denominatorSeconds = resolveSharePerOperatorSeconds(
        operatorRef,
        sharePerOperatorSeconds,
        sharePerOperatorScalar,
        fallbackSeconds
      );
      if (denominatorSeconds <= 0) return;
      percentages[operatorRef] = (seconds / denominatorSeconds) * 100;
    });
    return percentages;
  };

  const logAdjustPercentageTrace = (
    editedRows: any[],
    requestBody: any,
    responseBody: any
  ) => {
    const requestRows = ensureArray(
      requestBody?.operation_allocations ?? requestBody?.operationAllocations
    );
    const responseRows = ensureArray(
      responseBody?.operation_allocations ?? responseBody?.operationAllocations
    );

    const buildRowKey = (row: any) => {
      const seq = String(row?.seq ?? "").trim();
      const op = normalizeToken(row?.operation_code || row?.operation_id || "");
      return `${seq}::${op}`;
    };

    const resolvePercentMap = (row: any): Record<string, number> => {
      const rawMap = row?.occupancy_percentages;
      if (!rawMap || typeof rawMap !== "object") return {};
      const normalized: Record<string, number> = {};
      Object.entries(rawMap as Record<string, unknown>).forEach(([key, value]) => {
        const parsed = parseNumberLike(value);
        if (parsed == null) return;
        normalized[normalizeToken(key)] = parsed;
      });
      return normalized;
    };

    const resolveTimeMap = (row: any): Record<string, number> => {
      const rawMap = row?.operator_times;
      if (!rawMap || typeof rawMap !== "object") return {};
      const normalized: Record<string, number> = {};
      Object.entries(rawMap as Record<string, unknown>).forEach(([key, value]) => {
        const parsed = parseNumberLike(value);
        if (parsed == null) return;
        normalized[normalizeToken(key)] = parsed;
      });
      return normalized;
    };

    const resolveShareContext = (body: any) => {
      const rawShare = body?.share_per_operator_seconds ?? body?.sharePerOperatorSeconds ?? null;
      const shareMap =
        rawShare && typeof rawShare === "object" ? (rawShare as Record<string, unknown>) : null;
      const shareScalar =
        typeof rawShare === "number"
          ? rawShare
          : typeof rawShare === "string"
            ? parseNumberLike(rawShare)
            : null;
      const fallbackSeconds = Math.max(
        0,
        parseNumberLike(
          body?.cycle_time_seconds ??
          body?.real_cycle_time_seconds ??
          body?.cycle_time ??
          body?.tempo_ciclo_segundos ??
          body?.kpis?.cycle_time_seconds
        ) ?? 0
      );

      return { shareMap, shareScalar, fallbackSeconds };
    };

    const requestShareContext = resolveShareContext(requestBody);
    const responseShareContext = resolveShareContext(responseBody);

    const requestByKey = new Map<string, any>();
    requestRows.forEach((row) => requestByKey.set(buildRowKey(row), row));
    const responseByKey = new Map<string, any>();
    responseRows.forEach((row) => responseByKey.set(buildRowKey(row), row));

    console.groupCollapsed("[AJUSTE] Rasto percentagem -> segundos -> resposta");
    editedRows.forEach((editedRow) => {
      const rowKey = buildRowKey(editedRow);
      const reqRow = requestByKey.get(rowKey);
      const resRow = responseByKey.get(rowKey);
      const editedPercents = resolvePercentMap(editedRow);
      const requestPercents = resolvePercentMap(reqRow);
      const responsePercents = resolvePercentMap(resRow);
      const requestTimes = resolveTimeMap(reqRow);
      const responseTimes = resolveTimeMap(resRow);

      const operatorKeys = new Set<string>([
        ...Object.keys(editedPercents),
        ...Object.keys(requestPercents),
        ...Object.keys(responsePercents),
        ...Object.keys(requestTimes),
        ...Object.keys(responseTimes),
      ]);

      operatorKeys.forEach((operatorKey) => {
        const editedPercent = editedPercents[operatorKey];
        const requestSeconds = requestTimes[operatorKey];
        const requestPercent = requestPercents[operatorKey];
        const responseSeconds = responseTimes[operatorKey];
        const responsePercentExplicit = responsePercents[operatorKey];
        const responseDenominator = resolveSharePerOperatorSeconds(
          operatorKey,
          responseShareContext.shareMap,
          responseShareContext.shareScalar,
          responseShareContext.fallbackSeconds
        );
        const requestDenominator = resolveSharePerOperatorSeconds(
          operatorKey,
          requestShareContext.shareMap,
          requestShareContext.shareScalar,
          requestShareContext.fallbackSeconds
        );
        const responsePercent =
          responsePercentExplicit != null
            ? responsePercentExplicit
            : responseSeconds != null && responseDenominator > 0
              ? (responseSeconds / responseDenominator) * 100
              : null;

        if (
          editedPercent == null &&
          requestSeconds == null &&
          requestPercent == null &&
          responsePercent == null &&
          responseSeconds == null
        ) {
          return;
        }

        console.log({
          row: rowKey,
          operator: operatorKey,
          typed_percent: editedPercent ?? null,
          sent_seconds: requestSeconds ?? null,
          sent_percent: requestPercent ?? null,
          sent_denominator_seconds: requestDenominator > 0 ? requestDenominator : null,
          returned_seconds: responseSeconds ?? null,
          returned_denominator_seconds: responseDenominator > 0 ? responseDenominator : null,
          returned_percent: responsePercent ?? null,
        });
      });
    });
    console.groupEnd();
  };

  const buildDistribuicaoFromAllocations = (operationAllocations: any[], tempoCicloMin: number): any[] => {
    const byOperator: Record<string, { operacoes: Set<string>; segundos: number; temposOperacoes: Record<string, number> }> = {};
    const processOperatorTime = (operatorRef: unknown, opCode: string, secondsRaw: unknown) => {
      const normalizedOperatorRef = String(operatorRef || "").trim();
      const seconds = parseNumberLike(secondsRaw) ?? 0;
      if (!normalizedOperatorRef || seconds <= 0) return;
      if (!byOperator[normalizedOperatorRef]) {
        byOperator[normalizedOperatorRef] = { operacoes: new Set<string>(), segundos: 0, temposOperacoes: {} };
      }
      if (opCode) byOperator[normalizedOperatorRef].operacoes.add(opCode);
      byOperator[normalizedOperatorRef].segundos += seconds;
      if (opCode) {
        byOperator[normalizedOperatorRef].temposOperacoes[opCode] =
          (byOperator[normalizedOperatorRef].temposOperacoes[opCode] || 0) + seconds / 60;
      }
    };

    operationAllocations.forEach((row: any) => {
      const opCode = String(row?.operation_code || row?.operation_id || "").trim();
      const operatorTimes = row?.operator_times && typeof row.operator_times === "object" ? row.operator_times : {};
      if (Object.keys(operatorTimes).length > 0) {
        Object.entries(operatorTimes).forEach(([operatorRef, secondsRaw]) => {
          processOperatorTime(operatorRef, opCode, secondsRaw);
        });
        return;
      }

      const operatorPositions = row?.operator_positions && typeof row.operator_positions === "object" ? row.operator_positions : {};
      if (Object.keys(operatorPositions).length > 0) {
        Object.entries(operatorPositions).forEach(([operatorRef, positionRaw]) => {
          processOperatorTime(operatorRef, opCode, (positionRaw as any)?.time_seconds ?? (positionRaw as any)?.seconds);
        });
        return;
      }

      const operatorAllocations = Array.isArray(row?.operator_allocations) ? row.operator_allocations : [];
      operatorAllocations.forEach((allocation: any) => {
        processOperatorTime(
          allocation?.operator_code ?? allocation?.operator_id ?? allocation?.operador_id ?? allocation?.operator ?? allocation?.operador ?? allocation?.code,
          opCode,
          allocation?.time_seconds ?? allocation?.tempo_segundos ?? allocation?.seconds ?? allocation?.time
        );
      });
    });

    return Object.entries(byOperator).map(([operadorId, dados]) => {
      const cargaHoraria = dados.segundos / 60;
      return {
        operadorId,
        operacoes: Array.from(dados.operacoes),
        cargaHoraria,
        ocupacao: tempoCicloMin > 0 ? (cargaHoraria / tempoCicloMin) * 100 : 0,
        ciclosPorHora: cargaHoraria > 0 ? 60 / cargaHoraria : 0,
        temposOperacoes: dados.temposOperacoes,
      };
    });
  };

  const mergeRowsIntoAdjustBody = (baseBody: any, editedRows: any[]): any => {
    const clone = structuredClone(baseBody);
    const originalRows = ensureArray(clone?.operation_allocations);
    if (originalRows.length === 0) return clone;
    const cycleTimeSecondsBase = Math.max(
      0,
      parseNumberLike(
        clone?.cycle_time_seconds ??
        clone?.real_cycle_time_seconds ??
        clone?.cycle_time ??
        clone?.tempo_ciclo_segundos ??
        clone?.kpis?.cycle_time_seconds
      ) ?? 0
    );
    const sharePerOperatorSecondsRaw =
      clone?.share_per_operator_seconds ?? clone?.sharePerOperatorSeconds ?? null;
    const sharePerOperatorSecondsMap =
      sharePerOperatorSecondsRaw && typeof sharePerOperatorSecondsRaw === "object"
        ? (sharePerOperatorSecondsRaw as Record<string, unknown>)
        : null;
    const sharePerOperatorSecondsScalar =
      typeof sharePerOperatorSecondsRaw === "number"
        ? sharePerOperatorSecondsRaw
        : typeof sharePerOperatorSecondsRaw === "string"
          ? parseNumberLike(sharePerOperatorSecondsRaw)
          : null;

    const editedByKey = new Map<string, any>();
    const editedBySeq = new Map<string, any[]>();
    const editedByOp = new Map<string, any[]>();
    editedRows.forEach((row) => {
      const seq = String(row?.seq ?? "").trim();
      const op = normalizeToken(row?.operation_code || row?.operation_id || "");
      const key = `${seq}::${op}`;
      editedByKey.set(key, row);
      if (seq) editedBySeq.set(seq, [...(editedBySeq.get(seq) || []), row]);
      if (op) editedByOp.set(op, [...(editedByOp.get(op) || []), row]);
    });

    clone.operation_allocations = originalRows.map((row: any) => {
      const seq = String(row?.seq ?? "").trim();
      const op = normalizeToken(row?.operation_code || row?.operation_id || "");
      const key = `${seq}::${op}`;
      const edited =
        editedByKey.get(key) ||
        (seq && (editedBySeq.get(seq)?.length || 0) === 1 ? editedBySeq.get(seq)?.[0] : undefined) ||
        (op && (editedByOp.get(op)?.length || 0) === 1 ? editedByOp.get(op)?.[0] : undefined);
      if (!edited) return row;

      const nextRow = { ...row };
      const editedOperatorTimesRaw =
        edited?.operator_times && typeof edited.operator_times === "object"
          ? (edited.operator_times as Record<string, unknown>)
          : null;
      if (editedOperatorTimesRaw) {
        const nextOperatorTimes: Record<string, number> = {};
        Object.entries(editedOperatorTimesRaw).forEach(([operatorRef, secondsRaw]) => {
          const seconds = Math.max(0, parseNumberLike(secondsRaw) ?? 0);
          if (!operatorRef || seconds <= 0) return;
          nextOperatorTimes[operatorRef] = seconds;
        });
        nextRow.operator_times = nextOperatorTimes;
        const editedOriginalTimesRaw =
          edited?.original_operator_times && typeof edited.original_operator_times === "object"
            ? (edited.original_operator_times as Record<string, unknown>)
            : null;
        if (editedOriginalTimesRaw) {
          const nextOriginalTimes: Record<string, number> = {};
          Object.entries(editedOriginalTimesRaw).forEach(([operatorRef, secondsRaw]) => {
            const seconds = Math.max(0, parseNumberLike(secondsRaw) ?? 0);
            if (!operatorRef || seconds <= 0) return;
            nextOriginalTimes[operatorRef] = seconds;
          });
          nextRow.original_operator_times = nextOriginalTimes;
        }
      }

      const editedTotal = parseNumberLike(edited?.total_time_seconds);
      const fromOperatorTimes = Object.values(nextRow?.operator_times || {}).reduce(
        (sum: number, raw) => sum + Math.max(0, parseNumberLike(raw) ?? 0),
        0
      );
      const nextTotal = editedTotal != null ? Math.max(0, editedTotal) : fromOperatorTimes;
      nextRow.total_time_seconds = nextTotal;
      nextRow.allocated_time_seconds = Math.max(0, parseNumberLike(edited?.allocated_time_seconds) ?? fromOperatorTimes);
      nextRow.remaining_time_seconds =
        parseNumberLike(edited?.remaining_time_seconds) ?? nextTotal - nextRow.allocated_time_seconds;
      nextRow.occupancy_percentages = buildOccupancyPercentagesFromTimes(
        nextRow.operator_times || {},
        sharePerOperatorSecondsMap,
        sharePerOperatorSecondsScalar,
        cycleTimeSecondsBase > 0 ? cycleTimeSecondsBase : nextTotal
      );

      if (Array.isArray(edited?.operator_allocations)) {
        nextRow.operator_allocations = edited.operator_allocations.map((item: any) => ({
          ...(item || {}),
          time_seconds: Math.max(0, parseNumberLike(item?.time_seconds) ?? 0),
        }));
      } else if (nextRow?.operator_times && typeof nextRow.operator_times === "object") {
        nextRow.operator_allocations = Object.entries(nextRow.operator_times).map(([operatorCode, seconds]) => ({
          operator_code: operatorCode,
          time_seconds: Math.max(0, parseNumberLike(seconds) ?? 0),
        }));
      }

      if (edited?.operator_positions && typeof edited.operator_positions === "object") {
        const nextPositions: Record<string, any> = {};
        Object.entries(edited.operator_positions).forEach(([operatorCode, positionRaw]) => {
          const position = positionRaw && typeof positionRaw === "object" ? { ...(positionRaw as any) } : {};
          position.time_seconds = Math.max(0, parseNumberLike((position as any)?.time_seconds) ?? 0);
          nextPositions[operatorCode] = position;
        });
        nextRow.operator_positions = nextPositions;
      } else if (nextRow?.operator_times && typeof nextRow.operator_times === "object") {
        const currentPositions =
          nextRow?.operator_positions && typeof nextRow.operator_positions === "object" ? nextRow.operator_positions : {};
        const nextPositions: Record<string, any> = { ...currentPositions };
        Object.entries(nextRow.operator_times).forEach(([operatorCode, seconds]) => {
          nextPositions[operatorCode] = {
            ...(nextPositions[operatorCode] || {}),
            time_seconds: Math.max(0, parseNumberLike(seconds) ?? 0),
          };
        });
        nextRow.operator_positions = nextPositions;
      }

      return nextRow;
    });
    return clone;
  };

  const buildResultadosFromApi = (raw: any): ResultadosBalanceamento => {
    const nextOperationAllocations = ensureArray(raw?.operation_allocations ?? raw?.operationAllocations);
    const operationAllocations =
      nextOperationAllocations.length > 0
        ? nextOperationAllocations
        : ensureArray(resultadosAtuais?.operation_allocations);
    const taktSeconds = parseNumberLike(raw?.takt_time_seconds ?? raw?.takt_time ?? raw?.taktTime) ?? 0;
    const cycleTimeSeconds =
      pickKpi(
        raw,
        ["real_cycle_time_seconds", "cycle_time_seconds", "cycle_time", "tempo_ciclo_segundos"],
        ["cycle_time_seconds"],
        { preferNested: true }
      ) ?? 0;
    const tempoCiclo = cycleTimeSeconds > 10 ? cycleTimeSeconds / 60 : cycleTimeSeconds;
    const produtividadeRaw =
      pickKpi(
        raw,
        ["estimated_productivity", "productivity", "produtividade_estimada"],
        ["productivity_pct", "estimated_productivity"],
        { preferNested: true }
      ) ?? (resultadosAtuais.produtividade ?? 0);
    const produtividade = produtividadeRaw <= 1 ? produtividadeRaw * 100 : produtividadeRaw;

    const distribuicaoFromApi = ensureArray(raw?.distribuicao ?? raw?.distribution);
    const distribuicao =
      operationAllocations.length > 0
        ? buildDistribuicaoFromAllocations(operationAllocations, tempoCiclo)
        : distribuicaoFromApi.length > 0
          ? distribuicaoFromApi
          : resultadosAtuais.distribuicao;
    const machineLayout = resolveMachineLayout(raw);

    return {
      distribuicao: distribuicao as any,
      operation_allocations: operationAllocations as any,
      share_per_operator_seconds:
        ((raw?.share_per_operator_seconds ?? raw?.sharePerOperatorSeconds) ??
          (resultadosAtuais as any)?.share_per_operator_seconds ??
          null) as any,
      table_data:
        ((raw?.table_data ?? raw?.tableData ?? raw?.operator_table ?? raw?.operatorTable ?? raw?.results_table) ??
          (resultadosAtuais as any)?.table_data ??
          null) as any,
      machine_layout: (machineLayout.length > 0 ? machineLayout : resolveMachineLayout(resultadosAtuais)) as any,
      operator_flow: ((raw?.operator_flow ?? raw?.operatorFlow) ?? (resultadosAtuais as any)?.operator_flow ?? null) as any,
      machine_times_per_operator:
        ((raw?.machine_times_per_operator ?? raw?.machineTimesPerOperator) ??
          (resultadosAtuais as any)?.machine_times_per_operator ??
          null) as any,
      operator_slots:
        ((ensureArray(raw?.operator_slots ?? raw?.operatorSlots).length > 0
          ? ensureArray(raw?.operator_slots ?? raw?.operatorSlots)
          : (resultadosAtuais as any)?.operator_slots) ?? []) as any,
      taktTime: taktSeconds / 60,
      tempoCiclo,
      cycle_time_seconds: cycleTimeSeconds || undefined,
      numeroCiclosPorHora:
        (pickKpi(raw, ["production_per_hour", "numero_ciclos_por_hora"], ["cycles_per_hour", "production_per_hour"], { preferNested: true }) ??
          (tempoCiclo > 0 ? 60 / tempoCiclo : resultadosAtuais.numeroCiclosPorHora)) || 0,
      produtividade,
      perdas: Math.max(0, 100 - produtividade),
      numeroOperadores:
        (pickKpi(raw, ["num_operators", "numero_operadores", "numeroOperadores"], ["num_operators"], { preferNested: true }) ?? distribuicao.length) || 0,
      ocupacaoTotal:
        (parseNumberLike(raw?.occupancy_total ?? raw?.ocupacao_total ?? raw?.total_occupancy ?? raw?.total_load) ??
          distribuicao.reduce((sum: number, d: any) => sum + ((parseNumberLike(d?.cargaHoraria) ?? 0) * 60), 0)) || 0,
    };
  };

  const handleConfirmarEdicao = useCallback(
    async (editedRows: any[]) => {
      if (!taskCode || !ajusteBodyBase) {
        setErroPopup("Não foi possível ajustar: faltam dados base da chamada inicial.");
        return;
      }
      setIsAjustando(true);
      try {
        const body = mergeRowsIntoAdjustBody(ajusteBodyBase, editedRows);
        console.groupCollapsed("[AJUSTE] Payload enviado para /adjust");
        console.log("taskCode:", taskCode);
        console.log("payload:", body);
        console.log("payload_json:", JSON.stringify(body, null, 2));
        console.groupEnd();
        const resposta = await axios.post(
          `${API_BASE_URL}/tasks/${encodeURIComponent(taskCode)}/adjust`,
          body
        );
        const novoRaw = resposta.data ?? {};
        logAdjustPercentageTrace(editedRows, body, novoRaw);
        const novosResultados = buildResultadosFromApi(novoRaw);
        setResultadosAtuais(novosResultados);
        setAjusteBodyBase((prev: any) => ({
          ...(prev || {}),
          ...(novoRaw || {}),
          operation_allocations: ensureArray(
            novoRaw?.operation_allocations ?? novoRaw?.operationAllocations ?? prev?.operation_allocations
          ),
        }));
      } catch (error) {
        console.error("Erro ao ajustar alocacao:", error);
        console.group("[AJUSTE] Erro retornado pelo backend");
        console.log("status:", (error as any)?.response?.status);
        console.log("data:", (error as any)?.response?.data);
        console.log("detail:", (error as any)?.response?.data?.detail);
        console.groupEnd();
        const apiMessage =
          (error as any)?.response?.data?.detail?.message ||
          (error as any)?.response?.data?.message ||
          (error as any)?.message;
        setErroPopup(apiMessage || "Erro ao ajustar alocação. Verifica os valores editados e tenta novamente.");
        throw error;
      } finally {
        setIsAjustando(false);
      }
    },
    [taskCode, ajusteBodyBase, resultadosAtuais]
  );

  const handleRecalcular = useCallback((novosResultados: ResultadosBalanceamento, novaConfig: ConfiguracaoDistribuicao) => {
    setResultadosAtuais(novosResultados);
    setConfigAtual(novaConfig);
  }, []);

  const handleGuardarHistorico = useCallback(async () => {
    if (isGuardandoHistorico) return;
    setIsGuardandoHistorico(true);
    try {
      const payload = {
        task_code: taskCode || undefined,
        content: {
          ...(ajusteBodyBase && typeof ajusteBodyBase === "object" ? ajusteBodyBase : {}),
          ...resultadosAtuais,
          distribuicao: (resultadosAtuais as any)?.distribuicao ?? [],
          operation_allocations: ensureArray((resultadosAtuais as any)?.operation_allocations),
          takt_time_seconds: (parseNumberLike((resultadosAtuais as any)?.taktTime) ?? 0) * 60,
          real_cycle_time_seconds: (parseNumberLike((resultadosAtuais as any)?.tempoCiclo) ?? 0) * 60,
          num_operators: parseNumberLike((resultadosAtuais as any)?.numeroOperadores) ?? 0,
        },
      };
      await axios.post(`${API_BASE_URL}/history/`, payload);
      setSucessoPopup("Histórico guardado com sucesso.");
    } catch (error) {
      console.error("Erro ao guardar historico:", error);
      setErroPopup("Erro ao guardar no histórico. Tenta novamente.");
    } finally {
      setIsGuardandoHistorico(false);
    }
  }, [ajusteBodyBase, taskCode, resultadosAtuais, isGuardandoHistorico]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const data = {
      resultados: resultadosAtuais,
      operadores,
      operacoes,
      config,
      dataGeracao: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `balanceamento_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-50">
      <Dialog open={Boolean(erroPopup)} onOpenChange={(open) => { if (!open) setErroPopup(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Erro</DialogTitle>
            <DialogDescription>{erroPopup || ""}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(sucessoPopup)} onOpenChange={(open) => { if (!open) setSucessoPopup(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sucesso</DialogTitle>
            <DialogDescription>{sucessoPopup || ""}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="sticky top-[53px] z-40 bg-white border-b border-gray-200 print:hidden shadow-sm">
        <div className="w-full px-6 py-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                onClick={() => navigate("/")} 
                className="text-gray-600 hover:text-gray-900 -ml-2 h-7 px-2 text-xs"
                size="sm"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Voltar
              </Button>
              <div className="h-5 w-px bg-gray-200"></div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-100 rounded-sm flex items-center justify-center">
                  <Calculator className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-sm font-semibold text-gray-900">
                    Análise de Resultados
                  </h1>
                  <p className="text-gray-500 text-[10px]">
                    Relatório do balanceamento calculado
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleExport}
                size="sm"
                className="text-gray-600 border-gray-200 hover:bg-gray-50 rounded-sm text-[10px] h-7 px-2.5"
              >
                <Download className="w-3 h-3 mr-1.5" />
                Exportar
              </Button>
              <Button 
                variant="outline" 
                onClick={handlePrint}
                size="sm"
                className="text-gray-600 border-gray-200 hover:bg-gray-50 rounded-sm text-[10px] h-7 px-2.5"
              >
                <Printer className="w-3 h-3 mr-1.5" />
                Imprimir
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)] gap-6 items-start xl:items-stretch">
          <div className="sticky top-[95px] z-30 bg-gray-50 pb-3 xl:h-full">
            <ResumoResultados
              resultados={resultadosAtuais}
              config={configAtual}
              mostrarTaktTime={mostrarTaktTimeKpi}
              layout="column"
            />
          </div>

          <div className="space-y-6 min-w-0">
            <DashboardResultados
              resultados={resultadosAtuais}
              operadores={operadores}
              operacoes={operacoes}
              config={configAtual}
              onRecalcular={handleRecalcular}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onConfirmarEdicao={handleConfirmarEdicao}
              onGuardarHistorico={handleGuardarHistorico}
              isAjustando={isAjustando}
              isGuardandoHistorico={isGuardandoHistorico}
              showTabela={false}
            />
          </div>
        </div>

        <DashboardResultados
          resultados={resultadosAtuais}
          operadores={operadores}
          operacoes={operacoes}
          config={configAtual}
          onRecalcular={handleRecalcular}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onConfirmarEdicao={handleConfirmarEdicao}
          onGuardarHistorico={handleGuardarHistorico}
          isAjustando={isAjustando}
          isGuardandoHistorico={isGuardandoHistorico}
          showOccupacaoCard={false}
        />

        <VisualizadorFluxo
          resultados={resultadosAtuais}
          operadores={operadores}
          operacoes={operacoes}
          layoutConfig={dataSource.layoutConfig}
        />
      </main>
    </div>
  );
}

