import { ResultadosBalanceamento } from "../types";
import { LayoutConfig } from "./LayoutConfigurador";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ArrowRight, Factory, Layout, BarChart2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useMemo } from "react";
import React from "react";

interface VisualizadorFluxoProps {
  resultados: ResultadosBalanceamento;
  operadores: any[];
  operacoes: any[];
  layoutConfig?: LayoutConfig;
}

export function VisualizadorFluxo({
  resultados,
  operadores,
  operacoes,
  layoutConfig,
}: VisualizadorFluxoProps) {
  const tipoLayout = layoutConfig?.tipoLayout || "linha";
  const postosPorLado = layoutConfig?.postosPorLado || 8;
  const permitirCruzamento = layoutConfig?.permitirCruzamento ?? true;

  const normalizeKey = (value: unknown): string =>
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const extractStationToken = (value: unknown): string => {
    const text = String(value ?? "").trim().toUpperCase();
    if (!text) return "";
    const normalized = text.replace(/\s+/g, "");
    const direct = normalized.match(/\b([AB])[-_]?(\d{1,2})\b/);
    if (direct) return `${direct[1]}${Number(direct[2])}`;
    const words = text.match(/(LADO\s*[AB]).*?(\d{1,2})/);
    if (words) {
      const side = words[1].includes("B") ? "B" : "A";
      return `${side}${Number(words[2])}`;
    }
    return "";
  };

  const maxPositionsFromApi = useMemo(() => {
    let maxLine = 0;
    let maxA = 0;
    let maxB = 0;

    const rows = Array.isArray(resultados.operation_allocations) ? resultados.operation_allocations : [];
    const bump = (labelRaw: unknown, sideRaw: unknown, numberRaw: unknown) => {
      const label = String(labelRaw || "").trim().toUpperCase();
      const side = String(sideRaw || "").trim().toUpperCase();
      const num = Number(numberRaw);
      const token = extractStationToken(labelRaw);

      if (label) {
        const mA = label.match(/^A(\d+)$/);
        const mB = label.match(/^B(\d+)$/);
        const mP = label.match(/^[AP](\d+)$/);
        if (mA) maxA = Math.max(maxA, Number(mA[1]));
        if (mB) maxB = Math.max(maxB, Number(mB[1]));
        if (mP) maxLine = Math.max(maxLine, Number(mP[1]));
      }
      if (token) {
        const sideFromToken = token[0];
        const nFromToken = Number(token.slice(1));
        if (sideFromToken === "A") maxA = Math.max(maxA, nFromToken);
        if (sideFromToken === "B") maxB = Math.max(maxB, nFromToken);
      }

      if (Number.isFinite(num) && num > 0) {
        if (side === "A") maxA = Math.max(maxA, Math.trunc(num));
        else if (side === "B") maxB = Math.max(maxB, Math.trunc(num));
        else maxLine = Math.max(maxLine, Math.trunc(num));
      }
    };

    rows.forEach((row: any) => {
      const positions = row?.operator_positions && typeof row.operator_positions === "object" ? row.operator_positions : {};
      Object.values(positions).forEach((pos: any) => {
        bump(pos?.position_label, pos?.position_side, pos?.position_number);
      });

      if (Array.isArray(row?.operator_allocations)) {
        row.operator_allocations.forEach((alloc: any) => {
          bump(alloc?.position_label, alloc?.position_side, alloc?.position_number);
        });
      }
    });

    const machineLayout = Array.isArray((resultados as any)?.machine_layout)
      ? (resultados as any).machine_layout
      : Array.isArray((resultados as any)?.machineLayout)
        ? (resultados as any).machineLayout
        : [];
    machineLayout.forEach((row: any) => {
      // Formato flat por posto (API nova)
      bump(row?.position_label, row?.position_side, row?.position_number);
      bump(row?.primary_post_label, row?.position_side, row?.position_number);

      const operadoresRows = Array.isArray(row?.operators)
        ? row.operators
        : Array.isArray(row?.operator_allocations)
          ? row.operator_allocations
          : [];

      operadoresRows.forEach((op: any) => {
        const primary = op?.primary_position ?? op?.main_position ?? op?.position ?? op?.position_label;
        bump(primary?.position_label ?? primary, primary?.position_side, primary?.position_number);
        const outras = Array.isArray(op?.other_positions)
          ? op.other_positions
          : Array.isArray(op?.secondary_positions)
            ? op.secondary_positions
            : Array.isArray(op?.positions)
              ? op.positions
              : [];
        outras.forEach((pos: any) => bump(pos?.position_label ?? pos, pos?.position_side, pos?.position_number));
      });
    });

    return { maxLine, maxA, maxB };
  }, [resultados]);

  const postosPorLadoEfetivo = useMemo(() => {
    if (tipoLayout === "linha") {
      return Math.max(postosPorLado, maxPositionsFromApi.maxLine, maxPositionsFromApi.maxA);
    }
    // Espinha: maximo de 16 postos totais => 8 por lado.
    return Math.min(8, Math.max(postosPorLado, maxPositionsFromApi.maxA, maxPositionsFromApi.maxB));
  }, [tipoLayout, postosPorLado, maxPositionsFromApi]);

  const estacoesBase = useMemo(
    () =>
      tipoLayout === "linha"
        ? Array.from({ length: postosPorLadoEfetivo }, (_, i) => `A${i + 1}`)
        : [
            ...Array.from({ length: postosPorLadoEfetivo }, (_, i) => `A${i + 1}`),
            ...Array.from({ length: postosPorLadoEfetivo }, (_, i) => `B${i + 1}`),
          ],
    [tipoLayout, postosPorLadoEfetivo]
  );

  const estacoesSet = useMemo(() => new Set(estacoesBase.map((e) => e.toUpperCase())), [estacoesBase]);

  const resolveOperatorCode = (raw: string): string => {
    const ref = String(raw || "").trim();
    if (!ref) return "";
    const key = normalizeKey(ref);
    const byId = operadores.find((op) => normalizeKey(op?.id) === key);
    if (byId?.id) return String(byId.id);
    const byNome = operadores.find((op) => normalizeKey(op?.nome) === key);
    if (byNome?.id) return String(byNome.id);
    const inParens = ref.match(/\(([^)]+)\)/)?.[1]?.trim();
    return inParens || ref;
  };

  const extrairCodigoEstacao = (position: any): string => {
    const token = extractStationToken(position);
    if (token && estacoesSet.has(token)) return token;

    const direct = String(position ?? "").trim().toUpperCase();
    if (direct && estacoesSet.has(direct)) return direct;

    const label = String(position?.position_label || "").trim().toUpperCase();
    if (label && estacoesSet.has(label)) return label;

    const side = String(position?.position_side || "").trim().toUpperCase();
    const number = Number(position?.position_number);
    if ((side === "A" || side === "B") && Number.isFinite(number)) {
      const code = `${side}${Math.trunc(number)}`;
      if (estacoesSet.has(code)) return code;
    }
    if (tipoLayout === "linha" && Number.isFinite(number)) {
      const code = `A${Math.trunc(number)}`;
      if (estacoesSet.has(code)) return code;
    }
    return "";
  };

  const machineLayoutAssignments = useMemo(() => {
    const rawLayout = (resultados as any)?.machine_layout ?? (resultados as any)?.machineLayout;
    const rows = Array.isArray(rawLayout) ? rawLayout : [];
    const out: Array<{ estacao: string; maquina: string; operador: string; prioridade: number }> = [];

    const pushPos = (pos: any, maquina: string, operadorRaw: string, prioridade: number) => {
      const estacao = extrairCodigoEstacao(pos);
      if (!estacao) return;
      out.push({
        estacao,
        maquina,
        operador: resolveOperatorCode(operadorRaw),
        prioridade,
      });
    };

    const resolveMachine = (row: any, op?: any) =>
      String(
        op?.machine_type ??
        op?.machine_name ??
        op?.machine ??
        row?.machine_type ??
        row?.machine_name ??
        row?.machine ??
        row?.tipo_maquina ??
        ""
      ).trim();
    const resolveOperatorRaw = (op: any) =>
      String(
        op?.operator_id ??
        op?.operator_code ??
        op?.operador_id ??
        op?.operator ??
        op?.operador ??
        op?.primary_operator ??
        op?.main_operator ??
        op?.operador_principal ??
        op?.name ??
        op?.operator_name ??
        ""
      ).trim();
    const resolvePrimaryPos = (op: any) =>
      op?.primary_position ??
      op?.main_position ??
      op?.position ??
      op?.position_label ??
      op?.primary_station ??
      op?.main_station ??
      op?.station;

    rows.forEach((row: any) => {
      // Formato flat por posto (API nova)
      if (!Array.isArray(row?.operators) && !Array.isArray(row?.operator_allocations)) {
        const isPrimary = Boolean(row?.is_primary_post);
        const operadorRaw = String(row?.operator_id ?? row?.operator_code ?? row?.operator ?? "").trim();
        const maquina = String(row?.machine_name ?? row?.machine_type ?? row?.machine ?? "").trim();
        const pos = row?.position_label ?? row?.primary_post_label ?? row?.position;
        if (operadorRaw && pos) {
          pushPos(pos, maquina, operadorRaw, isPrimary ? 0 : 10);
        }
        return;
      }

      const maquinaRow = resolveMachine(row);
      const operadorRows = Array.isArray(row?.operators)
        ? row.operators
        : Array.isArray(row?.operator_allocations)
          ? row.operator_allocations
          : [];

      const rowPrimaryOperator = String(
        row?.primary_operator ?? row?.main_operator ?? row?.operador_principal ?? ""
      ).trim();
      const rowPrimaryPos =
        row?.primary_position ?? row?.main_position ?? row?.position ?? row?.position_label ?? row?.station;
      if (rowPrimaryOperator) {
        pushPos(rowPrimaryPos, maquinaRow, rowPrimaryOperator, 0);
      }

      operadorRows.forEach((op: any) => {
        const operadorRaw = resolveOperatorRaw(op);
        if (!operadorRaw) return;
        const maquina = resolveMachine(row, op) || maquinaRow;
        const isPrimary = Boolean(op?.is_primary_post ?? op?.isPrimaryPost);

        pushPos(resolvePrimaryPos(op), maquina, operadorRaw, isPrimary ? 0 : 10);

        const outras = Array.isArray(op?.other_positions)
          ? op.other_positions
          : Array.isArray(op?.secondary_positions)
            ? op.secondary_positions
            : Array.isArray(op?.positions)
              ? op.positions
              : [];
        outras.forEach((pos: any, idx: number) => pushPos(pos, maquina, operadorRaw, idx + 1));
      });
    });

    return out;
  }, [resultados, estacoesSet]);

  const estacoesMapeadas = useMemo(() => {
    const mapped: Record<string, { maquina: string; operador: string }> = {};
    estacoesBase.forEach((est) => {
      mapped[est] = { maquina: "", operador: "" };
    });

    if (machineLayoutAssignments.length > 0) {
      const sorted = [...machineLayoutAssignments].sort((a, b) => a.prioridade - b.prioridade);
      sorted.forEach((item) => {
        if (!mapped[item.estacao]) return;
        if (!mapped[item.estacao].maquina && item.maquina) mapped[item.estacao].maquina = item.maquina;
        if (!mapped[item.estacao].operador && item.operador) mapped[item.estacao].operador = item.operador;
      });
      return mapped;
    }

    const rows = Array.isArray(resultados.operation_allocations) ? resultados.operation_allocations : [];
    rows.forEach((row: any) => {
      const maquina = String(row?.machine_type || "").trim();
      const operatorPositions = row?.operator_positions && typeof row.operator_positions === "object"
        ? row.operator_positions
        : {};

      Object.entries(operatorPositions).forEach(([operatorRef, pos]) => {
        const est = extrairCodigoEstacao(pos);
        if (!est || !mapped[est]) return;
        if (!mapped[est].maquina && maquina) mapped[est].maquina = maquina;
        if (!mapped[est].operador) mapped[est].operador = resolveOperatorCode(operatorRef);
      });

      if (Array.isArray(row?.operator_allocations)) {
        row.operator_allocations.forEach((alloc: any) => {
          const est = extrairCodigoEstacao(alloc);
          if (!est || !mapped[est]) return;
          if (!mapped[est].maquina && maquina) mapped[est].maquina = maquina;
          if (!mapped[est].operador) {
            const opRef = String(
              alloc?.operator_code ?? alloc?.operator_id ?? alloc?.operador_id ?? alloc?.operator ?? alloc?.operador ?? ""
            ).trim();
            mapped[est].operador = resolveOperatorCode(opRef);
          }
        });
      }
    });

    return mapped;
  }, [machineLayoutAssignments, resultados.operation_allocations, estacoesBase, estacoesSet]);

  // Agrupar operaÃ§Ãµes por tipo de mÃ¡quina
  const maquinasPorTipo = useMemo(() => operacoes.reduce((acc: any, op: any) => {
    const tipo = op.tipoMaquina || "Geral";
    if (!acc[tipo]) {
      acc[tipo] = { tipo, operacoes: [], tempoTotal: 0 };
    }
    acc[tipo].operacoes.push(op);
    acc[tipo].tempoTotal += op.tempo || 0;
    return acc;
  }, {}), [operacoes]);

  const maquinas = useMemo(() => Object.values(maquinasPorTipo), [maquinasPorTipo]);

  const dadosGrafico = useMemo(() => {
    const maquinasArray = Object.values(maquinasPorTipo) as any[];
    const tempoTotal = maquinasArray.reduce((sum: number, maq: any) => sum + maq.tempoTotal, 0);
    return maquinasArray.map((maq: any, idx: number) => ({
      uid: `donut-${idx}`,
      label: maq.tipo,
      ocupacao: tempoTotal > 0 ? Math.round((maq.tempoTotal / tempoTotal) * 100) : 0,
      tempo: parseFloat(maq.tempoTotal.toFixed(2)),
      nOps: maq.operacoes.length,
    }));
  }, [maquinasPorTipo]);

  const pieColors = [
    "#1d4ed8", "#7c3aed", "#0891b2", "#059669",
    "#d97706", "#6366f1", "#ec4899", "#14b8a6",
    "#f59e0b", "#8b5cf6", "#06b6d4", "#10b981",
  ];

  const barrasEmpilhadasPorOperador = useMemo(() => {
    const machineColorMap = new Map<string, string>();
    let colorIdx = 0;
    const pickColor = (machine: string) => {
      if (!machineColorMap.has(machine)) {
        machineColorMap.set(machine, pieColors[colorIdx % pieColors.length]);
        colorIdx += 1;
      }
      return machineColorMap.get(machine)!;
    };

    const operationAllocations = Array.isArray((resultados as any)?.operation_allocations)
      ? ((resultados as any).operation_allocations as any[])
      : [];
    if (operationAllocations.length > 0) {
      const perOperatorMachine = new Map<string, Map<string, number>>();
      operationAllocations.forEach((row: any) => {
        const machine = String(row?.machine_type || row?.machine_name || "-").trim() || "-";
        const operatorAllocations = Array.isArray(row?.operator_allocations) ? row.operator_allocations : [];
        operatorAllocations.forEach((alloc: any) => {
          const operatorKey = String(
            alloc?.operator_id ?? alloc?.operator_code ?? alloc?.operador_id ?? alloc?.operator ?? alloc?.operador ?? ""
          ).trim();
          if (!operatorKey) return;
          const seconds = Number(alloc?.time_seconds);
          if (!Number.isFinite(seconds) || seconds <= 0) return;
          if (!perOperatorMachine.has(operatorKey)) perOperatorMachine.set(operatorKey, new Map<string, number>());
          const byMachine = perOperatorMachine.get(operatorKey)!;
          byMachine.set(machine, (byMachine.get(machine) || 0) + seconds);
        });
      });

      const operadores = Array.from(perOperatorMachine.entries()).map(([operatorKey, byMachine]) => {
        const segmentos = Array.from(byMachine.entries()).map(([maquina, segundos]) => ({
          maquina,
          segundos,
          color: pickColor(maquina),
        }));
        const totalSegundos = segmentos.reduce((sum, s) => sum + s.segundos, 0);
        return { operador: operatorKey, totalSegundos, segmentos };
      }).filter((o) => o.totalSegundos > 0);

      const legenda = Array.from(machineColorMap.entries()).map(([maquina, color]) => ({ maquina, color }));
      return { operadores, legenda };
    }

    const distribuicao = Array.isArray((resultados as any)?.distribuicao) ? ((resultados as any).distribuicao as any[]) : [];
    if (distribuicao.length > 0) {
      const machineByOperation = new Map<string, string>();
      operacoes.forEach((op: any) => {
        const opId = String(op?.id ?? "").trim();
        if (!opId) return;
        machineByOperation.set(opId, String(op?.tipoMaquina || op?.machine_type || "Geral"));
      });

      const operadores = distribuicao
        .map((dist: any) => {
          const operador = resolveOperatorCode(String(dist?.operadorId ?? dist?.operator_id ?? dist?.operator ?? ""));
          if (!operador) return null;
          const temposOperacoes =
            dist?.temposOperacoes && typeof dist.temposOperacoes === "object" ? (dist.temposOperacoes as Record<string, unknown>) : {};
          const byMachine = new Map<string, number>();
          Object.entries(temposOperacoes).forEach(([opId, tempoMinRaw]) => {
            const tempoMin = Number(tempoMinRaw);
            if (!Number.isFinite(tempoMin) || tempoMin <= 0) return;
            const machine = machineByOperation.get(String(opId).trim()) || "Geral";
            byMachine.set(machine, (byMachine.get(machine) || 0) + tempoMin * 60);
          });

          let segmentos = Array.from(byMachine.entries()).map(([maquina, segundos]) => ({
            maquina,
            segundos,
            color: pickColor(maquina),
          }));
          let totalSegundos = segmentos.reduce((sum, s) => sum + s.segundos, 0);

          if (totalSegundos <= 0) {
            const cargaMin = Number(dist?.cargaHoraria);
            if (Number.isFinite(cargaMin) && cargaMin > 0) {
              totalSegundos = cargaMin * 60;
              segmentos = [{ maquina: "Total", segundos: totalSegundos, color: pickColor("Total") }];
            }
          }

          if (totalSegundos <= 0) return null;
          return { operador, totalSegundos, segmentos };
        })
        .filter((entry): entry is { operador: string; totalSegundos: number; segmentos: Array<{ maquina: string; segundos: number; color: string }> } => Boolean(entry));

      const legenda = Array.from(machineColorMap.entries()).map(([maquina, color]) => ({ maquina, color }));
      return { operadores, legenda };
    }

    const raw = (resultados as any)?.machine_times_per_operator ?? (resultados as any)?.machineTimesPerOperator;
    if (!raw || typeof raw !== "object") {
      return {
        operadores: [] as Array<{ operador: string; totalSegundos: number; segmentos: Array<{ maquina: string; segundos: number; color: string }> }>,
        legenda: [] as Array<{ maquina: string; color: string }>,
      };
    }

    const operadores: Array<{ operador: string; totalSegundos: number; segmentos: Array<{ maquina: string; segundos: number; color: string }> }> = [];
    Object.entries(raw as Record<string, any>).forEach(([operatorKey, entries]) => {
      if (!Array.isArray(entries)) return;
      const byMachine = new Map<string, number>();
      entries.forEach((entry: any) => {
        const machine = String(entry?.machine_name || entry?.machine || "-").trim() || "-";
        const hours = Number(entry?.time_hours);
        const secondsDirect = Number(entry?.time_seconds);
        const minutesDirect = Number(entry?.time_minutes ?? entry?.time_min);
        const tempoSegundos = Number.isFinite(secondsDirect)
          ? secondsDirect
          : Number.isFinite(hours)
            ? hours * 3600
            : Number.isFinite(minutesDirect)
              ? minutesDirect * 60
              : 0;
        if (!Number.isFinite(tempoSegundos) || tempoSegundos <= 0) return;
        byMachine.set(machine, (byMachine.get(machine) || 0) + tempoSegundos);
      });

      const segmentos = Array.from(byMachine.entries()).map(([maquina, segundos]) => ({
        maquina,
        segundos,
        color: pickColor(maquina),
      }));
      const totalSegundos = segmentos.reduce((sum, s) => sum + s.segundos, 0);
      if (totalSegundos <= 0) return;
      operadores.push({
        operador: operatorKey,
        totalSegundos,
        segmentos,
      });
    });

    const legenda = Array.from(machineColorMap.entries()).map(([maquina, color]) => ({ maquina, color }));
    return { operadores, legenda };
  }, [resultados, pieColors, operacoes, operadores]);

  return (
    <div className="space-y-6">
      {/* Linha de Produção + Donut - lado a lado */}
      <div className="grid grid-cols-[auto_1fr] gap-4">

        {/* Visualização - Linha de Produção */}
        <Card className="shadow-sm border border-gray-200 rounded-sm bg-white w-fit">
          <CardHeader className="border-b border-gray-200 py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <div className="w-7 h-7 bg-purple-100 rounded-sm flex items-center justify-center">
                  <Factory className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Linha de Produção</div>
                  <p className="text-[10px] text-gray-500 font-normal mt-0.5">Carga Total por Tipo de Máquina</p>
                </div>
              </CardTitle>

              {/* Botao Ver Planta */}
              <Dialog>
                <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                      <Layout className="w-5 h-5 text-purple-600" />
                      Planta de chão de fábrica - Layout Industrial
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                      Vista superior da disposição física das estações e fluxo de produção
                    </DialogDescription>
                  </DialogHeader>

                  <div className="mt-4">
                    <div className="bg-slate-900 p-12 border-4 border-slate-700 min-h-[600px] relative">
                      <div
                        className="absolute inset-0 opacity-20"
                        style={{
                          backgroundImage: `
                            linear-gradient(rgba(100, 116, 139, 0.3) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(100, 116, 139, 0.3) 1px, transparent 1px)
                          `,
                          backgroundSize: "20px 20px",
                        }}
                      />

                      <div className="absolute top-6 left-6 text-yellow-400 font-mono text-xs z-10">
                        <div className="border-2 border-yellow-400 p-2 bg-slate-900/80 backdrop-blur-sm">
                            <div className="font-bold text-sm mb-1">PLANTA DE PRODUÇÃO</div>
                          <div className="text-[10px] space-y-0.5">
                            <div>FABRICA PRINCIPAL</div>
                            <div>ESTAÇÕES: {maquinas.length}</div>
                            <div>ESCALA: 1:100</div>
                          </div>
                        </div>
                      </div>

                      <div className="absolute top-6 right-6 border-2 border-yellow-400 p-3 bg-slate-900/80 backdrop-blur-sm text-xs z-10">
                        <div className="font-semibold text-yellow-400 mb-2 font-mono">LEGENDA OCUPAÇÃO</div>
                        <div className="space-y-1 text-yellow-400/90 font-mono text-[10px]">
                          {[
                            { color: "bg-green-500", label: "< 70% NORMAL" },
                            { color: "bg-yellow-500", label: "70-84% ATENÇÃO" },
                            { color: "bg-amber-500", label: "85-94% ELEVADO" },
                            { color: "bg-orange-500", label: ">= 95% CRÍTICO" },
                          ].map((item, li) => (
                            <div key={`leg-ocup-${li}`} className="flex items-center gap-2">
                              <div className={`w-3 h-3 ${item.color} border border-current`} />
                              <span>{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="relative mt-24 mx-auto max-w-5xl">
                        <div className="border-2 border-dashed border-yellow-400/40 p-8 relative">
                          <div className="absolute -top-3 left-4 bg-slate-900 px-2 text-yellow-400 text-xs font-mono">
                            ÁREA DE PRODUÇÃO
                          </div>

                          <div className="relative" style={{ minHeight: `${Math.max(500, Math.ceil(maquinas.length / 2) * 160 + 80)}px` }}>
                            {maquinas.map((maq: any, index: number) => {
                              const ocupacaoPct = Math.min((maq.tempoTotal / 60) * 100, 100);
                              let borderColor = "border-green-500 shadow-green-500/50";
                              if (ocupacaoPct >= 95) borderColor = "border-orange-500 shadow-orange-500/50";
                              else if (ocupacaoPct >= 85) borderColor = "border-amber-500 shadow-amber-500/50";
                              else if (ocupacaoPct >= 70) borderColor = "border-yellow-500 shadow-yellow-500/50";

                              const isLeft = index % 2 === 0;
                              const row = Math.floor(index / 2);
                              const topPx = row * 150 + 40;

                              return (
                                <div
                                  key={`blueprint-maq-${index}`}
                                  className={`absolute border-3 ${borderColor} bg-slate-800/90 backdrop-blur-sm p-3 shadow-lg hover:shadow-xl transition-all group cursor-pointer`}
                                  style={{
                                    top: `${topPx}px`,
                                    left: isLeft ? "5%" : "auto",
                                    right: isLeft ? "auto" : "5%",
                                    width: "140px",
                                    height: "90px",
                                    transform: "translateY(-50%)",
                                  }}
                                >
                                  <div className="absolute -top-3 left-2 bg-slate-900 px-2 py-0.5 text-yellow-400 text-[9px] font-mono border border-yellow-400/50">
                                    EST-{String(index + 1).padStart(2, "0")}
                                  </div>
                                  <div className="h-full flex flex-col justify-between">
                                    <div>
                                      <div className="text-yellow-400 font-bold text-xs font-mono mb-1 truncate">{maq.tipo}</div>
                                      <div className="text-yellow-400/60 text-[9px] font-mono space-y-0.5">
                                        <div>OPS: {maq.operacoes.length}</div>
                                        <div>TEMPO: {maq.tempoTotal.toFixed(2)}min</div>
                                      </div>
                                    </div>
                                    <div className="mt-1">
                                      <div className="h-1 bg-slate-700 overflow-hidden">
                                        <div
                                          className={`h-full ${borderColor.split(" ")[0].replace("border-", "bg-")}`}
                                          style={{ width: `${ocupacaoPct}%` }}
                                        />
                                      </div>
                                      <div className="text-yellow-400 text-[9px] font-mono mt-0.5 text-right font-bold">
                                        {ocupacaoPct.toFixed(0)}%
                                      </div>
                                    </div>
                                  </div>
                                  <div className={`absolute ${isLeft ? "-right-44" : "-left-44"} top-0 bg-slate-800 border border-yellow-400 p-2 text-[9px] text-yellow-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity z-20 w-40 shadow-xl`}>
                                    <div className="font-bold mb-1">DETALHES:</div>
                                    <div>Operações: {maq.operacoes.length}</div>
                                    <div>Tempo: {maq.tempoTotal.toFixed(2)}min</div>
                                    <div>Ocupação: {ocupacaoPct.toFixed(1)}%</div>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Espinha Central */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                              {(() => {
                                const totalRows = Math.ceil(maquinas.length / 2);
                                const elems: React.ReactNode[] = [];
                                const spineX = "50%";
                                const yStart = 20;
                                const yEnd = (totalRows - 1) * 150 + 60;

                                elems.push(<line key="spine" x1={spineX} y1={yStart} x2={spineX} y2={yEnd} stroke="#fbbf24" strokeWidth="3" opacity="0.7" />);

                                const arrows = Math.min(3, totalRows);
                                for (let i = 0; i < arrows; i++) {
                                  const ay = yStart + ((yEnd - yStart) * (i + 1)) / (arrows + 1);
                                  elems.push(<polygon key={`arr-${i}`} points={`48.5%,${ay - 6} 50%,${ay + 6} 51.5%,${ay - 6}`} fill="#fbbf24" opacity="0.8" />);
                                }

                                maquinas.forEach((_: any, idx: number) => {
                                  const row = Math.floor(idx / 2);
                                  const yPx = row * 150 + 40;
                                  const toX = idx % 2 === 0 ? "20%" : "80%";
                                  elems.push(<line key={`branch-${idx}`} x1={spineX} y1={yPx} x2={toX} y2={yPx} stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.5" />);
                                  elems.push(<circle key={`joint-${idx}`} cx={spineX} cy={yPx} r="4" fill="#fbbf24" opacity="0.8" />);
                                });

                                elems.push(<text key="lbl-in" x={spineX} y={Math.max(yStart - 6, 12)} textAnchor="middle" fill="#fbbf24" fontSize="9" fontFamily="monospace" opacity="0.7">ENTRADA</text>);
                                elems.push(<text key="lbl-out" x={spineX} y={yEnd + 18} textAnchor="middle" fill="#fbbf24" fontSize="9" fontFamily="monospace" opacity="0.7">SAIDA</text>);

                                return elems;
                              })()}
                            </svg>
                          </div>
                        </div>

                        <div className="mt-8 border-t-2 border-yellow-400/30 pt-4 flex items-center justify-between text-yellow-400 font-mono">
                          <div className="text-[10px]">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 bg-yellow-400 animate-pulse" />
                              <span>FLUXO DE PRODUÇÃO ATIVO</span>
                            </div>
                            <div className="text-yellow-400/60">Sentido: Estação 01 {"->"} Estação {maquinas.length}</div>
                          </div>
                          <div className="text-right text-[10px]">
                            <div className="text-yellow-400/60">TOTAL ESTAÇÕES</div>
                            <div className="text-xl font-bold">{maquinas.length}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          <CardContent className="p-4">
            {/* Gráfico Donut Custom - 100% SVG, sem recharts */}
            <div>
              <div className="bg-white border border-gray-200 rounded-sm p-3">
                {(() => {
                  const R = 68;
                  const CX = 88;
                  const CY = 88;
                  const SW = 26;
                  const C = 2 * Math.PI * R;
                  const total = dadosGrafico.reduce((s: number, d: any) => s + (d.ocupacao || 0), 0) || 1;

                  let off = 0;
                  const segs = dadosGrafico.map((d: any, i: number) => {
                    const dash = (d.ocupacao / total) * C;
                    const gap = C - dash;
                    const startOff = off;
                    off += dash;
                    return { d, i, dash, gap, startOff, color: pieColors[i % pieColors.length] };
                  });

                  const SZ = 180; const CR = 66; const CSW = 26; const CC = 2 * Math.PI * CR;

                  return (
                    <div className="flex gap-5 items-center">
                      <svg width={SZ} height={SZ} style={{ flexShrink: 0 }}>
                        {/* track */}
                        <circle cx={SZ/2} cy={SZ/2} r={CR} fill="none" stroke="#f3f4f6" strokeWidth={CSW} />
                        {/* segments */}
                        {segs.map((seg) => {
                          const segDash = (seg.dash / C) * CC;
                          const segGap = CC - segDash;
                          const segOff = -(seg.startOff / C) * CC + CC / 4;
                          return (
                            <circle
                              key={seg.d.uid}
                              cx={SZ/2} cy={SZ/2} r={CR}
                              fill="none"
                              stroke={seg.color}
                              strokeWidth={CSW}
                              strokeDasharray={`${segDash} ${segGap}`}
                              strokeDashoffset={segOff}
                            />
                          );
                        })}
                        {/* centro */}
                        <text x={SZ/2} y={SZ/2 - 8} textAnchor="middle" fontSize={15} fill="#111827" fontWeight="700">
                          {dadosGrafico.length}
                        </text>
                        <text x={SZ/2} y={SZ/2 + 9} textAnchor="middle" fontSize={10} fill="#6b7280">
                          tipos
                        </text>
                      </svg>

                      <div className="flex flex-col gap-1.5 pt-1">
                        {dadosGrafico.map((d: any, i: number) => (
                          <div key={d.uid} className="flex items-center gap-1.5">
                            <div style={{ width: 8, height: 8, borderRadius: 1, background: pieColors[i % pieColors.length], flexShrink: 0 }} />
                            <span className="text-[10px] text-gray-700 whitespace-nowrap">{d.label}</span>
                            <span className="text-[10px] font-semibold text-gray-900">{d.ocupacao}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart - Tempo por Operador x Máquina */}
        <Card className="shadow-sm border border-gray-200 rounded-sm bg-white">
          <CardHeader className="border-b border-gray-200 py-3">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <div className="w-7 h-7 bg-blue-100 rounded-sm flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-blue-700" />
              </div>
                <div>
                <div className="text-sm font-semibold">Tempo por Operador x Máquina</div>
                <p className="text-[10px] text-gray-500 font-normal mt-0.5">
                  Eixo X: Operador | Eixo Y: Tempo (s) empilhado por máquina
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {(() => {
              const CHART_H = 170;
              const BAR_W = 26;
              const Y_AXIS_W = 36;
              const LABEL_H = 40;
              const NUM_TICKS = 5;

              const operadoresBarras = barrasEmpilhadasPorOperador.operadores;
              const legenda = barrasEmpilhadasPorOperador.legenda;
              const maxTempo = Math.max(...operadoresBarras.map((b) => b.totalSegundos), 0.01);
              const tickStep = maxTempo / (NUM_TICKS - 1);
              const ticks = Array.from({ length: NUM_TICKS }, (_, i) =>
                parseFloat((i * tickStep).toFixed(2))
              );
              const topTick = ticks[NUM_TICKS - 1] || 1;
              const getBarH = (t: number) => Math.max(0, Math.round((t / topTick) * CHART_H));

              return (
                <div className="w-full">
                  <div style={{ display: "flex", alignItems: "flex-start" }}>

                    {/* Y Axis */}
                    <div style={{ width: Y_AXIS_W, flexShrink: 0, position: "relative", height: CHART_H + LABEL_H }}>
                      {ticks.map((tick, i) => {
                        const top = CHART_H - Math.round((tick / topTick) * CHART_H);
                        return (
                          <span
                            key={`ytick-${i}`}
                            style={{
                              position: "absolute",
                              top,
                              right: 4,
                              fontSize: 9,
                              color: "#6b7280",
                              lineHeight: 1,
                              transform: "translateY(-50%)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {tick}s
                          </span>
                        );
                      })}
                    </div>

                    {/* Chart + Labels */}
                    <div style={{ flex: 1, minWidth: 0 }}>

                      {/* Chart area + Labels */}
                      <div style={{ position: "relative", height: CHART_H + LABEL_H }}>

                        {/* Grid lines */}
                        {ticks.map((tick, i) => (
                          <div
                            key={`grid-${i}`}
                            style={{
                              position: "absolute",
                              top: CHART_H - Math.round((tick / topTick) * CHART_H),
                              left: 0,
                              right: 0,
                              borderTop: "1px dashed #e5e7eb",
                              pointerEvents: "none",
                            }}
                          />
                        ))}

                        {/* Baseline */}
                        <div style={{ position: "absolute", top: CHART_H, left: 0, right: 0, borderTop: "1px solid #d1d5db" }} />

                        {/* Columns: bar + label, spread evenly */}
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-around" }}>
                          {operadoresBarras.map((b) => (
                            <div
                              key={b.operador}
                              style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}
                            >
                              <div style={{ height: CHART_H, width: 80, position: "relative" }}>
                                <div
                                  style={{
                                    position: "absolute",
                                    left: "50%",
                                    bottom: getBarH(b.totalSegundos) + 4,
                                    transform: "translateX(-50%)",
                                    fontSize: 9,
                                    fontWeight: 700,
                                    color: "#1f2937",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {b.totalSegundos.toFixed(1)}s
                                </div>
                                <div
                                  style={{
                                    position: "absolute",
                                    left: "50%",
                                    bottom: 0,
                                    transform: "translateX(-50%)",
                                    width: BAR_W,
                                    height: getBarH(b.totalSegundos),
                                    borderRadius: "2px 2px 0 0",
                                    overflow: "hidden",
                                    display: "flex",
                                    flexDirection: "column-reverse",
                                  }}
                                >
                                  {b.segmentos.map((seg) => (
                                    <div
                                      key={`${b.operador}-${seg.maquina}`}
                                      title={`${b.operador} · ${seg.maquina} · ${seg.segundos.toFixed(1)}s`}
                                      style={{
                                        width: "100%",
                                        height: getBarH(seg.segundos),
                                        background: seg.color,
                                        minHeight: seg.segundos > 0 ? 14 : 0,
                                        position: "relative",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        pointerEvents: "auto",
                                        zIndex: 2,
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: 8,
                                          color: "#ffffff",
                                          fontWeight: 700,
                                          lineHeight: 1,
                                          textShadow: "0 1px 1px rgba(0,0,0,0.45)",
                                          pointerEvents: "none",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {seg.segundos.toFixed(1)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div style={{ height: LABEL_H, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4, minWidth: 72 }}>
                                <div
                                  style={{
                                    fontSize: 8,
                                    color: "#374151",
                                    whiteSpace: "nowrap",
                                    textAlign: "center",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    maxWidth: 96,
                                  }}
                                >
                                  {b.operador}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {legenda.length > 0 && (
                        <div className="mt-3 flex items-center gap-3 flex-wrap">
                          {legenda.map((item) => (
                            <div key={`legend-${item.maquina}`} className="flex items-center gap-1.5">
                              <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, display: "inline-block" }} />
                              <span className="text-[10px] text-gray-600">{item.maquina}</span>
                            </div>
                          ))}
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

      </div>

      {/* Planta de chão - Layout Configurado */}
      {layoutConfig && (
        <Card className="shadow-sm border border-gray-200 rounded-sm bg-white w-full">
          <CardHeader className="border-b border-gray-200 py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <div className="w-7 h-7 bg-purple-100 rounded-sm flex items-center justify-center">
                  <Layout className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Layout - Planta de chão</div>
                  <p className="text-[10px] text-gray-500 font-normal mt-0.5">
                    {tipoLayout === "linha" ? "Linha" : "Espinha"} - {tipoLayout === "linha" ? postosPorLadoEfetivo : postosPorLadoEfetivo * 2} estações
                    {permitirCruzamento && tipoLayout === "espinha" ? " - Cruzamento ativo" : ""}
                  </p>
                </div>
              </CardTitle>
              <div />
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {(() => {
              const estacoes = estacoesBase;

              if (tipoLayout === "linha") {
                return (
                  <div className="bg-gray-50 p-4 border border-gray-200 rounded-sm">
                    <div className="flex gap-2 justify-center items-center flex-wrap">
                      {estacoes.map((est, idx) => {
                        const maq = estacoesMapeadas[est]?.maquina || "";
                        const operador = estacoesMapeadas[est]?.operador || "";
                        const hasMaq = maq && maq !== "";
                        return (
                          <div key={`est-linha-${est}`} className="flex items-center gap-2">
                            <div className="rounded border border-gray-300 bg-white p-3 w-[120px] min-h-[124px] flex flex-col items-center gap-2 justify-between">
                              <div className={`w-10 h-10 ${hasMaq ? "bg-purple-500" : "bg-gray-300"} rounded flex items-center justify-center`}>
                                <Factory className="w-5 h-5 text-white" />
                              </div>
                              <div className="text-xs font-bold text-gray-900">{est}</div>
                              <div className="w-full text-[9px] text-center rounded-sm border border-purple-200 bg-purple-50 text-purple-700 px-1 py-0.5 truncate">
                                {maq || "--"}
                              </div>
                              <div className="w-full text-[9px] text-center rounded-sm border border-blue-200 bg-blue-50 text-blue-700 px-1 py-0.5 truncate">
                                {operador || "--"}
                              </div>
                            </div>
                            {idx < estacoes.length - 1 && <ArrowRight className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // Espinha layout
              const ladoA = estacoes.filter((e) => e.startsWith("A"));
              const ladoB = estacoes.filter((e) => e.startsWith("B"));
              const maxCols = Math.max(ladoA.length, ladoB.length);

              const fluxoSeq: string[] = [];
              if (permitirCruzamento) {
                let iA = 0, iB = 0, onA = true;
                while (iA < ladoA.length || iB < ladoB.length) {
                  if (onA && iA < ladoA.length) {
                    fluxoSeq.push(ladoA[iA]);
                    if (iB < ladoB.length) onA = false;
                    else iA++;
                  } else if (!onA && iB < ladoB.length) {
                    fluxoSeq.push(ladoB[iB]);
                    iB++;
                    iA++;
                    onA = true;
                  } else {
                    if (iA < ladoA.length) { fluxoSeq.push(ladoA[iA]); iA++; }
                    if (iB < ladoB.length) { fluxoSeq.push(ladoB[iB]); iB++; }
                  }
                }
              } else {
                ladoA.forEach((e) => fluxoSeq.push(e));
                ladoB.forEach((e) => fluxoSeq.push(e));
              }
              const ordemFluxo: { [k: string]: number } = {};
              fluxoSeq.forEach((e, i) => { ordemFluxo[e] = i + 1; });

              const renderCard = (est: string) => {
                const maq = estacoesMapeadas[est]?.maquina || "";
                const operador = estacoesMapeadas[est]?.operador || "";
                const hasMaq = maq && maq !== "";
                const ordem = ordemFluxo[est];
                const isA = est.startsWith("A");
                return (
                  <div key={`card-${est}`} className="rounded border border-gray-300 bg-white p-2 w-[110px] min-h-[132px] flex flex-col items-center justify-between relative">
                    <div className={`absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white z-10 ${
                      permitirCruzamento ? "bg-blue-700" : isA ? "bg-blue-600" : "bg-green-600"
                    }`}>{ordem}</div>
                    <div className={`w-8 h-8 ${hasMaq ? "bg-purple-500" : "bg-gray-300"} rounded flex items-center justify-center`}>
                      <Factory className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-[11px] font-bold text-gray-900">{est}</div>
                    <div className="w-full text-[8px] text-center rounded-sm border border-purple-200 bg-purple-50 text-purple-700 px-1 py-0.5 truncate">
                      {maq || "--"}
                    </div>
                    <div className="w-full text-[8px] text-center rounded-sm border border-blue-200 bg-blue-50 text-blue-700 px-1 py-0.5 truncate">
                      {operador || "--"}
                    </div>
                  </div>
                );
              };

              return (
                <div className="bg-gray-50 p-4 border border-gray-200 rounded-sm relative">
                  <div className="absolute top-2 right-2 text-gray-500 text-[9px] font-medium">ESPINHA - {estacoes.length} EST.</div>
                  <div className="relative z-10 mt-2">
                    <div className="text-blue-600 text-[9px] font-bold mb-3 text-center">LADO A</div>
                    <div className="flex justify-around px-4" style={{ minHeight: "100px" }}>
                      {Array.from({ length: maxCols }).map((_, i) => (
                        <div key={`col-a-${i}`} className="flex justify-center" style={{ width: `${100 / maxCols}%` }}>
                          {ladoA[i] ? renderCard(ladoA[i]) : <div className="w-[90px]" />}
                        </div>
                      ))}
                    </div>
                    <div className="h-14 relative">
                      <div className="absolute inset-x-4 top-1/2 border-t-2 border-dashed border-gray-300" />
                      <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-gray-50 px-3 py-0.5 text-gray-400 text-[8px] font-semibold">
                        CORREDOR {permitirCruzamento ? "- CRUZAMENTO" : ""}
                      </div>
                    </div>
                    <div className="text-green-600 text-[9px] font-bold mb-3 text-center">LADO B</div>
                    <div className="flex justify-around px-4" style={{ minHeight: "100px" }}>
                      {Array.from({ length: maxCols }).map((_, i) => (
                        <div key={`col-b-${i}`} className="flex justify-center" style={{ width: `${100 / maxCols}%` }}>
                          {ladoB[i] ? renderCard(ladoB[i]) : <div className="w-[90px]" />}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-200 relative z-10">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[8px] font-semibold text-gray-500 uppercase">Fluxo:</span>
                      <div className="ml-auto flex items-center gap-1 flex-wrap">
                        {fluxoSeq.map((est, i) => {
                          const isA = est.startsWith("A");
                          const next = fluxoSeq[i + 1];
                          const isCross = next && next.charAt(0) !== est.charAt(0);
                          return (
                            <span key={`flow-${i}-${est}`} className="flex items-center gap-0.5">
                              <span className={`text-[7px] font-mono font-bold px-0.5 rounded-sm ${isA ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>{est}</span>
                              {i < fluxoSeq.length - 1 && (
                                <span className={`text-[7px] ${isCross ? "text-amber-500" : "text-gray-400"}`}>{isCross ? "<->" : "->"}</span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}


