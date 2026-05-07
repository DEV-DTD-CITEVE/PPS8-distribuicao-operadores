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

  const buildDistribuicaoFromAllocations = (operationAllocations: any[]): any[] => {
    const byOperator: Record<string, { operacoes: Set<string>; segundos: number; temposOperacoes: Record<string, number> }> = {};

    operationAllocations.forEach((row: any) => {
      const opCode = String(row?.operation_code || row?.operation_id || "").trim();
      const operatorTimes = row?.operator_times && typeof row.operator_times === "object" ? row.operator_times : {};
      Object.entries(operatorTimes).forEach(([operatorRef, secondsRaw]) => {
        const seconds = parseNumberLike(secondsRaw) ?? 0;
        if (!operatorRef || seconds <= 0) return;
        if (!byOperator[operatorRef]) {
          byOperator[operatorRef] = { operacoes: new Set<string>(), segundos: 0, temposOperacoes: {} };
        }
        if (opCode) byOperator[operatorRef].operacoes.add(opCode);
        byOperator[operatorRef].segundos += seconds;
        if (opCode) {
          byOperator[operatorRef].temposOperacoes[opCode] =
            (byOperator[operatorRef].temposOperacoes[opCode] || 0) + seconds / 60;
        }
      });
    });

    const tempoCicloMin = parseNumberLike(resultadosAtuais.tempoCiclo) ?? 0;
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
      nextRow.remaining_time_seconds = Math.max(
        0,
        Math.max(0, parseNumberLike(edited?.remaining_time_seconds) ?? nextTotal - nextRow.allocated_time_seconds)
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
    const operationAllocations = ensureArray(raw?.operation_allocations ?? raw?.operationAllocations);
    const taktSeconds = parseNumberLike(raw?.takt_time_seconds ?? raw?.takt_time ?? raw?.taktTime) ?? 0;
    const cicloApi = parseNumberLike(raw?.real_cycle_time_seconds ?? raw?.cycle_time_seconds ?? raw?.cycle_time ?? raw?.tempo_ciclo_segundos) ?? 0;
    const tempoCiclo = cicloApi > 10 ? cicloApi / 60 : cicloApi;
    const produtividadeRaw = parseNumberLike(raw?.estimated_productivity ?? raw?.productivity ?? raw?.produtividade_estimada) ?? (resultadosAtuais.produtividade ?? 0);
    const produtividade = produtividadeRaw <= 1 ? produtividadeRaw * 100 : produtividadeRaw;

    const distribuicaoFromApi = ensureArray(raw?.distribuicao ?? raw?.distribution);
    const distribuicao = distribuicaoFromApi.length > 0 ? distribuicaoFromApi : buildDistribuicaoFromAllocations(operationAllocations);

    return {
      distribuicao: distribuicao as any,
      operation_allocations: operationAllocations as any,
      machine_layout: resolveMachineLayout(raw),
      machine_times_per_operator: (raw?.machine_times_per_operator ?? raw?.machineTimesPerOperator ?? null) as any,
      taktTime: taktSeconds / 60,
      tempoCiclo,
      numeroCiclosPorHora:
        (parseNumberLike(raw?.production_per_hour ?? raw?.numero_ciclos_por_hora) ??
          (tempoCiclo > 0 ? 60 / tempoCiclo : resultadosAtuais.numeroCiclosPorHora)) || 0,
      produtividade,
      perdas: Math.max(0, 100 - produtividade),
      numeroOperadores:
        (parseNumberLike(raw?.num_operators ?? raw?.numero_operadores ?? raw?.numeroOperadores) ?? distribuicao.length) || 0,
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

