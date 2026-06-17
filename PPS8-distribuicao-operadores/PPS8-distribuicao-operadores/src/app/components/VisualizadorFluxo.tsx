import { ResultadosBalanceamento } from "../types";
import { LayoutConfig } from "./LayoutConfigurador";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ArrowRight, Factory, Layout, BarChart2 } from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import React from "react";

interface VisualizadorFluxoProps {
  resultados: ResultadosBalanceamento;
  operadores: any[];
  operacoes: any[];
  layoutConfig?: LayoutConfig;
  viewMode?: "tempo" | "percentagem";
  onTipoLayoutChange?: (tipo: "linha" | "espinha") => void;
  onLayoutConfigChange?: (config: LayoutConfig) => void;
  agruparPorMaquina?: boolean;
}

interface ArrowDef {
  key: string;
  operator?: string;
  stroke: string;
  type: "path";
  d: string;
}

interface EspinhaLayoutProps {
  estacoes: string[];
  ladoA: string[];
  ladoB: string[];
  maxCols: number;
  flowByOperator: Record<string, string[]>;
  estacoesMapeadas: Record<string, { maquina: string; operador: string }>;
  operatorColorMap: Record<string, { bg: string; border: string; text: string }>;
  permitirCruzamento: boolean;
}

function EspinhaLayout({
  estacoes, ladoA, ladoB, maxCols, flowByOperator,
  estacoesMapeadas, operatorColorMap, permitirCruzamento,
}: EspinhaLayoutProps) {
  const MIN_COL_W = 150;
  const colStyle = { flex: 1, minWidth: MIN_COL_W, flexShrink: 0 } as const;
  const totalW = maxCols > 8 ? maxCols * MIN_COL_W : undefined;

  const [arrows, setArrows] = useState<ArrowDef[]>([]);
  const [activeOperator, setActiveOperator] = useState<string>("ALL");
  const layoutRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const measureArrows = useCallback(() => {
    if (!layoutRef.current) return;
    const cr = layoutRef.current.getBoundingClientRect();
    const newArrows: ArrowDef[] = [];
    const PORT_MARGIN = 8;
    const PORT_SPLIT = 10;
    const OPERATOR_PORT_STEP = 12;

    type SegmentInfo = {
      operatorId: string;
      est: string;
      next: string;
      idx: number;
      fromEl: HTMLDivElement;
      toEl: HTMLDivElement;
      startIsA: boolean;
      endIsA: boolean;
    };

    const segments: SegmentInfo[] = [];
    Object.entries(flowByOperator).forEach(([operatorId, fluxoSeq]) => {
      fluxoSeq.slice(0, -1).forEach((est, idx) => {
        const next = fluxoSeq[idx + 1];
        if (!next) return;
        const fromData = estacoesMapeadas[est];
        if (!fromData || (fromData.maquina === "" && fromData.operador === "")) return;

        const fromEl = cardRefs.current.get(est);
        const toEl = cardRefs.current.get(next);
        if (!fromEl || !toEl) return;

        const fr = fromEl.getBoundingClientRect();
        const startIsA = est.startsWith("A");
        const endIsA = next.startsWith("A");
        segments.push({
          operatorId,
          est,
          next,
          idx,
          fromEl,
          toEl,
          startIsA,
          endIsA,
        });
      });
    });

    const stationOperators = new Map<string, string[]>();
    segments.forEach(({ operatorId, est, next }) => {
      if (!stationOperators.has(est)) stationOperators.set(est, []);
      if (!stationOperators.get(est)!.includes(operatorId)) stationOperators.get(est)!.push(operatorId);
      if (!stationOperators.has(next)) stationOperators.set(next, []);
      if (!stationOperators.get(next)!.includes(operatorId)) stationOperators.get(next)!.push(operatorId);
    });

    const operatorPortOffset = (station: string, operatorId: string) => {
      const ops = stationOperators.get(station) || [];
      const index = ops.indexOf(operatorId);
      if (index < 0 || ops.length <= 1) return 0;
      const center = (ops.length - 1) / 2;
      return (index - center) * OPERATOR_PORT_STEP;
    };

    const aRects = ladoA
      .map((est) => cardRefs.current.get(est)?.getBoundingClientRect())
      .filter((rect): rect is DOMRect => Boolean(rect));
    const bRects = ladoB
      .map((est) => cardRefs.current.get(est)?.getBoundingClientRect())
      .filter((rect): rect is DOMRect => Boolean(rect));
    const corridorTop = aRects.length > 0
      ? Math.max(...aRects.map((rect) => rect.bottom - cr.top)) + PORT_MARGIN + 8
      : cr.height / 2 - 28;
    const corridorBottom = bRects.length > 0
      ? Math.min(...bRects.map((rect) => rect.top - cr.top)) - PORT_MARGIN - 8
      : cr.height / 2 + 28;
    const operatorIds = Object.keys(flowByOperator).filter((op) => flowByOperator[op]?.length > 1);
    const laneStartY = corridorTop + 6;
    const laneEndY = corridorBottom - 6;
    const laneSpan = Math.max(0, laneEndY - laneStartY);
    const operatorLaneY = new Map<string, number>();
    operatorIds.forEach((operatorId, index) => {
      const laneY =
        operatorIds.length <= 1
          ? (laneStartY + laneEndY) / 2
          : laneStartY + (laneSpan * index) / (operatorIds.length - 1);
      operatorLaneY.set(operatorId, laneY);
    });

    segments.forEach((segment) => {
      const { operatorId, est, next, idx, fromEl, toEl, startIsA, endIsA } = segment;
      const fr = fromEl.getBoundingClientRect();
      const tr = toEl.getBoundingClientRect();
      const fromCenterX = fr.left + fr.width / 2 + operatorPortOffset(est, operatorId) - cr.left;
      const toCenterX = tr.left + tr.width / 2 + operatorPortOffset(next, operatorId) - cr.left;
      const isNearSameColumn = Math.abs(toCenterX - fromCenterX) < PORT_SPLIT * 2.5;
      const startX = isNearSameColumn ? fromCenterX : fromCenterX + PORT_SPLIT;
      const endX = isNearSameColumn ? toCenterX : toCenterX - PORT_SPLIT;
      const startY = (startIsA ? fr.bottom + PORT_MARGIN : fr.top - PORT_MARGIN) - cr.top;
      const endY = (endIsA ? tr.bottom + PORT_MARGIN : tr.top - PORT_MARGIN) - cr.top;
      const laneY = operatorLaneY.get(operatorId) ?? (corridorTop + corridorBottom) / 2;
      const isDirectVertical = Math.abs(endX - startX) < 2;
      const d = isDirectVertical
        ? `M ${startX} ${startY} L ${endX} ${endY}`
        : `M ${startX} ${startY} ` +
          `L ${startX} ${laneY} ` +
          `L ${endX} ${laneY} ` +
          `L ${endX} ${endY}`;
      const stroke = operatorColorMap[operatorId]?.text || "#3b82f6";
      newArrows.push({
        key: `${operatorId}-${est}-${next}-${idx}`,
        operator: operatorId,
        stroke,
        type: "path",
        d,
      });
    });

    setArrows(newArrows);
  }, [flowByOperator, estacoesMapeadas, ladoA, ladoB, operatorColorMap]);

  const operatorList = useMemo(
    () => Object.keys(flowByOperator).filter((op) => flowByOperator[op]?.length > 1),
    [flowByOperator]
  );

  const visibleArrows = useMemo(() => {
    if (activeOperator === "ALL") return arrows;
    return arrows.filter((a) => a.operator === activeOperator);
  }, [arrows, activeOperator]);

  useEffect(() => {
    measureArrows();
    const el = layoutRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measureArrows);
    ro.observe(el);
    window.addEventListener("resize", measureArrows);
    return () => { ro.disconnect(); window.removeEventListener("resize", measureArrows); };
  }, [measureArrows]);

  // renderCard inline (copy from the outer function — same logic)
  const renderCard = (est: string) => {
    const maq = estacoesMapeadas[est]?.maquina || "";
    const operador = estacoesMapeadas[est]?.operador || "";
    const hasMaq = maq !== "";
    const postoNumero = Number(String(est).replace(/^[A-Z]/i, ""));
    const isA = est.startsWith("A");
    const c = operatorColorMap[operador];
    return (
      <div key={`card-${est}`} className="rounded border border-gray-300 bg-white p-2 w-[110px] min-h-[90px] flex flex-col items-center justify-between relative">
        <div className={`absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white z-10 ${
          permitirCruzamento ? "bg-blue-700" : isA ? "bg-blue-600" : "bg-green-600"
        }`}>{Number.isFinite(postoNumero) ? postoNumero : ""}</div>
        <div className="text-[11px] font-bold text-gray-900">{est}</div>
        <div className="w-full text-[8px] text-center rounded-sm border border-purple-200 bg-purple-50 text-purple-700 px-1 py-0.5 truncate">
          {maq || "--"}
        </div>
        <div
          className="w-full text-[8px] text-center rounded-sm px-1 py-0.5 truncate"
          style={c && operador ? { background: c.bg, border: `1px solid ${c.border}`, color: c.text } : { background: "#f9fafb", border: "1px solid #e5e7eb", color: "#6b7280" }}
        >
          {operador || "--"}
        </div>
      </div>
    );
  };

  const rowStyle = { minHeight: "132px" };

  return (
    <div className="bg-gray-50 p-4 border border-gray-200 rounded-sm relative overflow-x-auto">
      <div ref={layoutRef} style={{ ...(totalW ? { minWidth: totalW } : {}), position: "relative" }}>
        {/* Arrow overlay — pixel coords, no viewBox */}
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 40, overflow: "visible" }}
        >
          <defs>
            <marker
              id="flow-arrowhead"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              markerUnits="userSpaceOnUse"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
            </marker>
          </defs>
          {visibleArrows.map((a) => {
            const color = a.stroke;
            const isFocused = activeOperator !== "ALL";
            return (
              <path
                key={`path-${a.key}`}
                d={a.d}
                fill="none"
                stroke={color}
                strokeWidth={isFocused ? 2.1 : 1.45}
                strokeDasharray="4 3"
                strokeLinecap="butt"
                strokeLinejoin="round"
                markerEnd="url(#flow-arrowhead)"
                opacity={isFocused ? 0.95 : 0.7}
              />
            );
          })}
        </svg>

        <div className="flex justify-between items-start mb-2">
          <div />
          <span className="text-gray-500 text-[9px] font-medium">ESPINHA - {estacoes.length} EST.</span>
        </div>

        <div className="relative z-10">
          <div className="text-blue-600 text-[9px] font-bold mb-3 text-center">LADO A</div>
          <div className="flex px-4" style={rowStyle}>
            {Array.from({ length: maxCols }).map((_, i) => (
              <div key={`col-a-${i}`} className="flex justify-center" style={colStyle}>
                 {ladoA[i] ? (
                  <div ref={(el) => { if (el) cardRefs.current.set(ladoA[i], el); else cardRefs.current.delete(ladoA[i]); }} style={{ alignSelf: "flex-start" }}>
                    {renderCard(ladoA[i])}
                  </div>
                ) : <div className="w-[90px]" />}
              </div>
            ))}
          </div>

          <div className="h-14 relative">
            <div className="absolute inset-x-4 top-1/2 border-t-2 border-dashed border-gray-300" />
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-gray-50 px-3 py-0.5 text-gray-400 text-[8px] font-semibold whitespace-nowrap">
              CORREDOR {permitirCruzamento ? "- CRUZAMENTO" : ""}
            </div>
          </div>

          <div className="text-center mb-3 mt-4">
            <span className="relative z-20 inline-block bg-gray-50 px-2 text-green-600 text-[9px] font-bold">
              LADO B
            </span>
          </div>
          <div className="flex px-4" style={rowStyle}>
            {Array.from({ length: maxCols }).map((_, i) => (
              <div key={`col-b-${i}`} className="flex justify-center" style={colStyle}>
                 {ladoB[i] ? (
                  <div ref={(el) => { if (el) cardRefs.current.set(ladoB[i], el); else cardRefs.current.delete(ladoB[i]); }} style={{ alignSelf: "flex-start" }}>
                    {renderCard(ladoB[i])}
                  </div>
                ) : <div className="w-[90px]" />}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-gray-200 relative z-10">
          {operatorList.length > 0 && (
            <div className="mb-2 flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveOperator("ALL")}
                className={`text-[9px] px-2 py-0.5 rounded border ${activeOperator === "ALL" ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300"}`}
              >
                Todos
              </button>
              {operatorList.map((opId) => (
                <button
                  key={`op-filter-${opId}`}
                  type="button"
                  onClick={() => setActiveOperator(opId)}
                  className="text-[9px] px-2 py-0.5 rounded border"
                  style={
                    activeOperator === opId
                      ? {
                          background: operatorColorMap[opId]?.text || "#2563eb",
                          color: "#fff",
                          borderColor: operatorColorMap[opId]?.text || "#2563eb",
                        }
                      : {
                          background: operatorColorMap[opId]?.bg || "#fff",
                          color: operatorColorMap[opId]?.text || "#374151",
                          borderColor: operatorColorMap[opId]?.border || "#d1d5db",
                        }
                  }
                >
                  {opId}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[8px] font-semibold text-gray-500 uppercase">Fluxo:</span>
            <div className="ml-auto flex items-center gap-1 flex-wrap">
              {Object.entries(flowByOperator)
                .filter(([opId]) => activeOperator === "ALL" || activeOperator === opId)
                .map(([opId, seq]) => (
                <span key={`flow-${opId}`} className="flex items-center gap-0.5">
                  <span
                    className="text-[7px] font-semibold px-1 rounded-sm"
                    style={{ background: operatorColorMap[opId]?.bg || "#e5e7eb", color: operatorColorMap[opId]?.text || "#374151" }}
                  >
                    {opId}
                  </span>
                  {seq.map((est, i) => {
                    const isA = est.startsWith("A");
                    const nextEst = seq[i + 1];
                    const isCross = nextEst && nextEst.charAt(0) !== est.charAt(0);
                    return (
                      <span key={`flow-${opId}-${i}-${est}`} className="flex items-center gap-0.5">
                        <span className={`text-[7px] font-mono font-bold px-0.5 rounded-sm ${isA ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>{est}</span>
                        {i < seq.length - 1 && (
                          <span className={`text-[7px] ${isCross ? "text-amber-500" : "text-gray-400"}`}>{isCross ? "<->" : "->"}</span>
                        )}
                      </span>
                    );
                  })}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VisualizadorFluxo({
  resultados,
  operadores,
  operacoes,
  layoutConfig,
  viewMode = "tempo",
  onTipoLayoutChange,
  onLayoutConfigChange,
  agruparPorMaquina = false,
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

  const normalizeMachineTypeKey = (value: unknown): string =>
    normalizeKey(value)
      .replace(/[^a-z0-9]+/g, "")
      .trim();

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

    const operatorFlow = (resultados as any)?.operator_flow ?? (resultados as any)?.operatorFlow;
    if (operatorFlow && typeof operatorFlow === "object") {
      Object.values(operatorFlow as Record<string, unknown>).forEach((stepsRaw) => {
        if (!Array.isArray(stepsRaw)) return;
        stepsRaw.forEach((step: any) => {
          bump(step?.position_label ?? step?.position, step?.position_side, step?.position_number);
        });
      });
    }

    return { maxLine, maxA, maxB };
  }, [resultados]);

  const postosPorLadoEfetivo = useMemo(() => {
    if (tipoLayout === "linha") {
      return Math.max(postosPorLado, maxPositionsFromApi.maxLine, maxPositionsFromApi.maxA);
    }
    // Em espinha, usa o maior entre configuração e dados reais da API por lado.
    const configuradoPorLado = Math.ceil(postosPorLado / 2);
    return Math.max(configuradoPorLado, maxPositionsFromApi.maxA, maxPositionsFromApi.maxB);
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

  const flowByOperatorFromApi = useMemo(() => {
    const rawFlow = (resultados as any)?.operator_flow ?? (resultados as any)?.operatorFlow;
    if (!rawFlow || typeof rawFlow !== "object") return {} as Record<string, string[]>;

    const flowEntries = Object.entries(rawFlow as Record<string, unknown>);
    const out: Record<string, string[]> = {};

    flowEntries.forEach(([operatorKeyRaw, rawSteps]) => {
      if (!Array.isArray(rawSteps) || rawSteps.length === 0) return;
      const operatorKey = resolveOperatorCode(String(operatorKeyRaw || "").trim()) || String(operatorKeyRaw || "").trim();
      const ordered = [...rawSteps]
        .map((entry: any, idx) => ({
          step: Number(entry?.step ?? idx + 1),
          station: extrairCodigoEstacao(entry?.position_label ?? entry?.position ?? entry),
        }))
        .filter((entry) => entry.station)
        .sort((a, b) => a.step - b.step);

      const seq: string[] = [];
      ordered.forEach((entry) => {
        if (seq.length === 0 || seq[seq.length - 1] !== entry.station) {
          seq.push(entry.station);
        }
      });
      if (operatorKey && seq.length > 0) out[operatorKey] = seq;
    });

    return out;
  }, [resultados, extrairCodigoEstacao, resolveOperatorCode]);

  const estacoesAtivas = useMemo(() => {
    const fromMap = Object.entries(estacoesMapeadas)
      .filter(([, data]) => Boolean(String(data?.operador || "").trim()))
      .map(([est]) => est);
    const fromFlow = Object.values(flowByOperatorFromApi).flat();
    return [...new Set([...fromMap, ...fromFlow])];
  }, [estacoesMapeadas, flowByOperatorFromApi]);

  const requiredMachineMetrics = useMemo(() => {
    const raw = (resultados as any)?.machines_used?.required ?? (resultados as any)?.required;
    const entries = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object"
        ? Object.entries(raw).map(([label, value]) => ({ label, ...(value as Record<string, unknown>) }))
        : [];

    return entries
      .map((entry: any) => {
        const label = String(entry?.label || "").trim();
        const machinesNeeded = Number(entry?.machines_needed);
        const avgTimeSeconds = Number(entry?.avg_time_seconds);
        if (!label) return null;
        return {
          label,
          machines_needed: Number.isFinite(machinesNeeded) ? machinesNeeded : 0,
          avg_time_seconds: Number.isFinite(avgTimeSeconds) ? avgTimeSeconds : 0,
        };
      })
      .filter(Boolean) as Array<{ label: string; machines_needed: number; avg_time_seconds: number }>;
  }, [resultados]);

  const machineCountsByType = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();

    if (requiredMachineMetrics.length > 0) {
      requiredMachineMetrics.forEach((entry) => {
        const key = normalizeMachineTypeKey(entry.label);
        counts.set(key, {
          label: entry.label,
          count: Math.max(0, entry.machines_needed),
        });
      });
      return counts;
    }

    Object.values(estacoesMapeadas).forEach((entry) => {
      const machine = String(entry?.maquina || "").trim();
      if (!machine) return;
      const key = normalizeMachineTypeKey(machine);
      const current = counts.get(key);
      counts.set(key, {
        label: current?.label || machine,
        count: (current?.count || 0) + 1,
      });
    });
    return counts;
  }, [estacoesMapeadas, requiredMachineMetrics]);

  const totalMachineCount = useMemo(
    () => Array.from(machineCountsByType.values()).reduce((sum, entry) => sum + entry.count, 0),
    [machineCountsByType]
  );

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
    if (requiredMachineMetrics.length > 0) {
      const totalMaquinas = requiredMachineMetrics.reduce((sum, item) => sum + Math.max(0, item.machines_needed), 0);
      return requiredMachineMetrics.map((item, idx) => ({
        uid: `donut-required-${idx}`,
        label: item.label,
        ocupacao: totalMaquinas > 0 ? Math.round((item.machines_needed / totalMaquinas) * 100) : 0,
        tempo: item.avg_time_seconds,
        avg_time_seconds: item.avg_time_seconds,
        machines_needed: item.machines_needed,
        nOps: item.machines_needed,
      }));
    }
    const maquinasArray = Object.values(maquinasPorTipo) as any[];
    const tempoTotal = maquinasArray.reduce((sum: number, maq: any) => sum + maq.tempoTotal, 0);
    return maquinasArray.map((maq: any, idx: number) => ({
      uid: `donut-${idx}`,
      label: maq.tipo,
      ocupacao: tempoTotal > 0 ? Math.round((maq.tempoTotal / tempoTotal) * 100) : 0,
      tempo: parseFloat(maq.tempoTotal.toFixed(2)),
      avg_time_seconds: undefined,
      machines_needed: undefined,
      nOps: maq.operacoes.length,
    }));
  }, [maquinasPorTipo, requiredMachineMetrics]);

  const overallAvgTimeSeconds = useMemo(() => {
    const value = Number((resultados as any)?.machines_used?.overall_avg_time_seconds ?? (resultados as any)?.overall_avg_time_seconds);
    return Number.isFinite(value) ? value : null;
  }, [resultados]);

  const pieColors = [
    "#1d4ed8", "#7c3aed", "#0891b2", "#059669",
    "#d97706", "#6366f1", "#ec4899", "#14b8a6",
    "#f59e0b", "#8b5cf6", "#06b6d4", "#10b981",
  ];

  // Paleta de cores por operador (bg, border, text)
  const operatorPalette = [
    { bg: "#dbeafe", border: "#93c5fd", text: "#1d4ed8" },
    { bg: "#dcfce7", border: "#86efac", text: "#15803d" },
    { bg: "#fce7f3", border: "#f9a8d4", text: "#be185d" },
    { bg: "#ffedd5", border: "#fdba74", text: "#c2410c" },
    { bg: "#f3e8ff", border: "#d8b4fe", text: "#7c3aed" },
    { bg: "#fef9c3", border: "#fde047", text: "#854d0e" },
    { bg: "#e0f2fe", border: "#7dd3fc", text: "#0369a1" },
    { bg: "#d1fae5", border: "#6ee7b7", text: "#065f46" },
    { bg: "#fee2e2", border: "#fca5a5", text: "#b91c1c" },
    { bg: "#e0e7ff", border: "#a5b4fc", text: "#3730a3" },
    { bg: "#fdf4ff", border: "#e879f9", text: "#86198f" },
    { bg: "#fff7ed", border: "#fb923c", text: "#9a3412" },
  ];

  const orderedOperatorKeys = useMemo(() => {
    const ordered = new Map<string, string>();
    const appendOperator = (rawCode: string) => {
      const resolved = resolveOperatorCode(String(rawCode || "").trim());
      const normalized = normalizeKey(resolved || rawCode);
      if (!normalized) return;
      if (!ordered.has(normalized)) {
        ordered.set(normalized, String(resolved || rawCode).trim());
      }
    };

    const slots = Array.isArray((resultados as any)?.operator_slots) ? [...((resultados as any).operator_slots as any[])] : [];
    slots
      .sort((a, b) => {
        const aPos = Number(a?.position_number);
        const bPos = Number(b?.position_number);
        const safeAPos = Number.isFinite(aPos) ? aPos : Number.MAX_SAFE_INTEGER;
        const safeBPos = Number.isFinite(bPos) ? bPos : Number.MAX_SAFE_INTEGER;
        if (safeAPos !== safeBPos) return safeAPos - safeBPos;
        return String(a?.operator_id || "").localeCompare(String(b?.operator_id || ""));
      })
      .forEach((slot) => appendOperator(String(slot?.operator_id || slot?.operator_name || "").trim()));

    const operationAllocations = Array.isArray((resultados as any)?.operation_allocations)
      ? ((resultados as any).operation_allocations as any[])
      : [];
    operationAllocations.forEach((row: any) => {
      Object.keys(row?.operator_times && typeof row.operator_times === "object" ? row.operator_times : {}).forEach(appendOperator);
      const allocations = Array.isArray(row?.operator_allocations) ? row.operator_allocations : [];
      allocations.forEach((alloc: any) => {
        appendOperator(String(
          alloc?.operator_id ?? alloc?.operator_code ?? alloc?.operador_id ?? alloc?.operator ?? alloc?.operador ?? ""
        ).trim());
      });
      Object.keys(row?.operator_positions && typeof row.operator_positions === "object" ? row.operator_positions : {}).forEach(appendOperator);
    });

    Object.keys((resultados as any)?.share_per_operator_seconds && typeof (resultados as any).share_per_operator_seconds === "object"
      ? (resultados as any).share_per_operator_seconds
      : {}).forEach(appendOperator);

    (resultados.distribuicao || []).forEach((dist: any) => appendOperator(String(dist?.operadorId ?? dist?.operator_id ?? dist?.operator ?? "")));
    Object.values(estacoesMapeadas).forEach((entry) => appendOperator(entry?.operador || ""));

    return Array.from(ordered.values());
  }, [resultados, estacoesMapeadas, operadores]);

  const operatorColorMap = useMemo(() => {
    const map: Record<string, { bg: string; border: string; text: string }> = {};
    orderedOperatorKeys.forEach((op, i) => { map[op] = operatorPalette[i % operatorPalette.length]; });
    return map;
  }, [orderedOperatorKeys]);

  const barrasEmpilhadasPorOperador = useMemo(() => {
    const machineColorMap = new Map<string, string>();
    const sharePerOperatorSeconds =
      (resultados as any)?.share_per_operator_seconds &&
      typeof (resultados as any).share_per_operator_seconds === "object"
        ? ((resultados as any).share_per_operator_seconds as Record<string, unknown>)
        : null;
    const tableDataRaw =
      (resultados as any)?.table_data ??
      (resultados as any)?.tableData ??
      (resultados as any)?.operator_table ??
      (resultados as any)?.operatorTable ??
      (resultados as any)?.results_table ??
      null;
    const occupancyByOperator = new Map<string, number>();
    const resolveOperatorAliases = (rawRef: string): string[] => {
      const ref = String(rawRef || "").trim();
      if (!ref) return [];
      const aliases = new Set<string>();
      const pushAlias = (value: string) => {
        const normalized = normalizeKey(value);
        if (normalized) aliases.add(normalized);
      };
      pushAlias(ref);
      pushAlias(resolveOperatorCode(ref));
      const opMatch = ref.match(/^OP\s*0*(\d+)$/i);
      if (opMatch) {
        const idx = Number(opMatch[1]) - 1;
        if (idx >= 0 && idx < orderedOperatorKeys.length) {
          pushAlias(orderedOperatorKeys[idx]);
        }
      }
      return Array.from(aliases);
    };
    const getMappedNumericValue = (source: Record<string, unknown> | null, rawRef: string): number => {
      if (!source) return Number.NaN;
      const aliases = resolveOperatorAliases(rawRef);
      for (const alias of aliases) {
        for (const [sourceKey, sourceValue] of Object.entries(source)) {
          if (normalizeKey(sourceKey) !== alias) continue;
          const parsed = Number(sourceValue);
          if (Number.isFinite(parsed)) return parsed;
        }
      }
      return Number.NaN;
    };
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
      resolveOperatorAliases(operatorRef).forEach((alias) => {
        occupancyByOperator.set(alias, normalizedOccupancy);
      });
    });

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
      const addOperatorMachineTime = (operatorKeyRaw: unknown, machine: string, secondsRaw: unknown) => {
        const operatorKey = String(operatorKeyRaw ?? "").trim();
        const seconds = Number(secondsRaw);
        if (!operatorKey || !Number.isFinite(seconds) || seconds <= 0) return;
        if (!perOperatorMachine.has(operatorKey)) perOperatorMachine.set(operatorKey, new Map<string, number>());
        const byMachine = perOperatorMachine.get(operatorKey)!;
        byMachine.set(machine, (byMachine.get(machine) || 0) + seconds);
      };

      operationAllocations.forEach((row: any) => {
        const machine = String(row?.machine_type || row?.machine_name || "-").trim() || "-";
        const operatorTimes =
          row?.operator_times && typeof row.operator_times === "object"
            ? (row.operator_times as Record<string, unknown>)
            : {};
        const hasOperatorTimes = Object.keys(operatorTimes).length > 0;

        if (hasOperatorTimes) {
          Object.entries(operatorTimes).forEach(([operatorRef, secondsRaw]) => {
            addOperatorMachineTime(operatorRef, machine, secondsRaw);
          });
          return;
        }

        const operatorAllocations = Array.isArray(row?.operator_allocations) ? row.operator_allocations : [];
        if (operatorAllocations.length > 0) {
          operatorAllocations.forEach((alloc: any) => {
            addOperatorMachineTime(
              alloc?.operator_id ?? alloc?.operator_code ?? alloc?.operador_id ?? alloc?.operator ?? alloc?.operador ?? "",
              machine,
              alloc?.time_seconds ?? alloc?.tempo_segundos ?? alloc?.seconds ?? alloc?.time
            );
          });
          return;
        }

        const operatorPositions =
          row?.operator_positions && typeof row.operator_positions === "object"
            ? (row.operator_positions as Record<string, any>)
            : {};
        Object.entries(operatorPositions).forEach(([operatorRef, position]) => {
          addOperatorMachineTime(operatorRef, machine, position?.time_seconds);
        });
      });

      const operadores = Array.from(perOperatorMachine.entries()).map(([operatorKey, byMachine]) => {
        const normalizedOperator = normalizeKey(resolveOperatorCode(operatorKey));
        const rawSegmentos = Array.from(byMachine.entries()).map(([maquina, segundos]) => ({
          maquina,
          segundos,
          color: pickColor(maquina),
        }));
        const segmentSum = rawSegmentos.reduce((sum, s) => sum + s.segundos, 0);
        const shareSeconds = getMappedNumericValue(sharePerOperatorSeconds, operatorKey);
        const occupancyPct = occupancyByOperator.get(normalizedOperator);
        const targetTotalSeconds =
          Number.isFinite(shareSeconds) && Number.isFinite(occupancyPct)
            ? shareSeconds * ((occupancyPct as number) / 100)
            : segmentSum;
        const scale = segmentSum > 0 && targetTotalSeconds > 0 ? targetTotalSeconds / segmentSum : 1;
        const segmentos = rawSegmentos.map((seg) => ({ ...seg, segundos: seg.segundos * scale }));
        const totalSegundos = segmentos.reduce((sum, s) => sum + s.segundos, 0);
        return { operador: operatorKey, totalSegundos, segmentos };
      }).filter((o) => o.totalSegundos > 0);

      operadores.sort((a, b) => {
        const aIdx = orderedOperatorKeys.indexOf(a.operador);
        const bIdx = orderedOperatorKeys.indexOf(b.operador);
        const safeA = aIdx >= 0 ? aIdx : Number.MAX_SAFE_INTEGER;
        const safeB = bIdx >= 0 ? bIdx : Number.MAX_SAFE_INTEGER;
        if (safeA !== safeB) return safeA - safeB;
        return a.operador.localeCompare(b.operador);
      });

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
          const normalizedOperator = normalizeKey(operador);
          const shareSeconds = getMappedNumericValue(sharePerOperatorSeconds, operador);
          const occupancyPct = occupancyByOperator.get(normalizedOperator);

          if (totalSegundos <= 0) {
            const cargaMin = Number(dist?.cargaHoraria);
            if (Number.isFinite(cargaMin) && cargaMin > 0) {
              totalSegundos = cargaMin * 60;
              segmentos = [{ maquina: "Total", segundos: totalSegundos, color: pickColor("Total") }];
            }
          }

          if (totalSegundos > 0 && Number.isFinite(shareSeconds) && Number.isFinite(occupancyPct)) {
            const targetTotalSeconds = shareSeconds * ((occupancyPct as number) / 100);
            const scale = targetTotalSeconds > 0 ? targetTotalSeconds / totalSegundos : 1;
            segmentos = segmentos.map((seg) => ({ ...seg, segundos: seg.segundos * scale }));
            totalSegundos = segmentos.reduce((sum, s) => sum + s.segundos, 0);
          }

          if (totalSegundos <= 0) return null;
          return { operador, totalSegundos, segmentos };
        })
        .filter((entry): entry is { operador: string; totalSegundos: number; segmentos: Array<{ maquina: string; segundos: number; color: string }> } => Boolean(entry))
        .sort((a, b) => {
          const aIdx = orderedOperatorKeys.indexOf(a.operador);
          const bIdx = orderedOperatorKeys.indexOf(b.operador);
          const safeA = aIdx >= 0 ? aIdx : Number.MAX_SAFE_INTEGER;
          const safeB = bIdx >= 0 ? bIdx : Number.MAX_SAFE_INTEGER;
          if (safeA !== safeB) return safeA - safeB;
          return a.operador.localeCompare(b.operador);
        });

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

    operadores.sort((a, b) => {
      const aResolved = resolveOperatorCode(a.operador);
      const bResolved = resolveOperatorCode(b.operador);
      const aIdx = orderedOperatorKeys.indexOf(aResolved);
      const bIdx = orderedOperatorKeys.indexOf(bResolved);
      const safeA = aIdx >= 0 ? aIdx : Number.MAX_SAFE_INTEGER;
      const safeB = bIdx >= 0 ? bIdx : Number.MAX_SAFE_INTEGER;
      if (safeA !== safeB) return safeA - safeB;
      return aResolved.localeCompare(bResolved);
    });

    const legenda = Array.from(machineColorMap.entries()).map(([maquina, color]) => ({ maquina, color }));
    return { operadores, legenda };
  }, [resultados, pieColors, operacoes, operadores, orderedOperatorKeys, resolveOperatorCode]);

  return (
    <div className="space-y-6">
      {/* Linha de Produção + Donut - lado a lado */}
      <div className="grid grid-cols-[auto_1fr] gap-4">

        {/* Visualização - Linha de Produção */}
        <Card className="shadow-sm border border-gray-200 rounded-sm bg-white w-fit">
          <CardHeader className="border-b border-gray-200 py-3">
            <div className="flex items-start justify-between gap-4">
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
                            <div>ESTAÇÕES: {totalMachineCount}</div>
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
                            <div className="text-yellow-400/60">Sentido: Estação 01 {"->"} Estação {totalMachineCount}</div>
                          </div>
                          <div className="text-right text-[10px]">
                            <div className="text-yellow-400/60">TOTAL ESTAÇÕES</div>
                            <div className="text-xl font-bold">{totalMachineCount}</div>
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
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: pieColors[i % pieColors.length], flexShrink: 0 }} />
                            <span className="text-[12px] text-gray-700 whitespace-nowrap">{d.label}</span>
                            <span className="text-[12px] font-semibold text-gray-900">{d.ocupacao}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                {(overallAvgTimeSeconds != null || requiredMachineMetrics.length > 0) && (
                  <div className="mt-3 border-t border-gray-100 pt-2 text-[12px] text-gray-600 space-y-1">
                    {overallAvgTimeSeconds != null && (
                      <div>
                        Tempo médio global: <span className="font-semibold text-gray-900">{overallAvgTimeSeconds.toFixed(1)}s</span>
                      </div>
                    )}
                    {requiredMachineMetrics.map((item) => (
                      <div key={`avg-${item.label}`}>
                        {item.label}:{" "}
                        <span className="font-semibold text-gray-900">{item.avg_time_seconds.toFixed(1)}s</span>
                        {" · "}
                        <span className="font-semibold text-gray-900">{item.machines_needed}</span> máquinas
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 border-t border-gray-100 pt-2 text-[12px] text-gray-600">
                  <div>
                    Máquinas existentes: <span className="font-semibold text-gray-900">{totalMachineCount}</span>
                  </div>
                </div>
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
                  {viewMode === "percentagem"
                    ? "Eixo X: Operador | Eixo Y: Ocupação (%) empilhada por máquina"
                    : "Eixo X: Operador | Eixo Y: Tempo (s) empilhado por máquina"}
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {(() => {
              const CHART_H = 340;
              const BAR_W = 82;
              const Y_AXIS_W = 58;
              const LABEL_H = 72;
              const NUM_TICKS = 5;
              const cycleTimeSeconds = Number((resultados as any)?.cycle_time_seconds ?? 0);
              const formatMetric = (value: number) =>
                viewMode === "percentagem" ? `${value.toFixed(1)}%` : `${value.toFixed(1)}s`;
              const toDisplayValue = (seconds: number) =>
                viewMode === "percentagem" && cycleTimeSeconds > 0 ? (seconds / cycleTimeSeconds) * 100 : seconds;

              const operadoresBarras = barrasEmpilhadasPorOperador.operadores;
              const legenda = barrasEmpilhadasPorOperador.legenda;
              const maxTempo = Math.max(...operadoresBarras.map((b) => toDisplayValue(b.totalSegundos)), 0.01);
              const tickStep = maxTempo / (NUM_TICKS - 1);
              const ticks = Array.from({ length: NUM_TICKS }, (_, i) =>
                parseFloat((i * tickStep).toFixed(2))
              );
              const topTick = ticks[NUM_TICKS - 1] || 1;
              const getBarH = (t: number) => Math.max(0, Math.round((t / topTick) * CHART_H));

              return (
                <div className="w-full pt-3">
                  <div style={{ display: "flex", alignItems: "flex-start", width: "100%", maxWidth: "100%" }}>

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
                                fontSize: 13,
                              color: "#6b7280",
                              lineHeight: 1,
                              transform: "translateY(-50%)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {viewMode === "percentagem" ? `${tick}%` : `${tick}s`}
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
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18 }}>
                          {operadoresBarras.map((b) => (
                            <div
                              key={b.operador}
                              style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", flex: "1 1 0", minWidth: 88 }}
                            >
                              <div style={{ height: CHART_H, width: "100%", maxWidth: 164, position: "relative" }}>
                                <div
                                  style={{
                                    position: "absolute",
                                    left: "50%",
                                    bottom: getBarH(toDisplayValue(b.totalSegundos)) + 4,
                                    transform: "translateX(-50%)",
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: "#1f2937",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {formatMetric(toDisplayValue(b.totalSegundos))}
                                </div>
                                <div
                                  style={{
                                    position: "absolute",
                                    left: "50%",
                                    bottom: 0,
                                    transform: "translateX(-50%)",
                                    width: BAR_W,
                                    height: getBarH(toDisplayValue(b.totalSegundos)),
                                    borderRadius: "2px 2px 0 0",
                                    overflow: "hidden",
                                    display: "flex",
                                    flexDirection: "column-reverse",
                                  }}
                                >
                                  {b.segmentos.map((seg) => (
                                    <div
                                      key={`${b.operador}-${seg.maquina}`}
                                      title={`${b.operador} · ${seg.maquina} · ${formatMetric(toDisplayValue(seg.segundos))}`}
                                      style={{
                                        width: "100%",
                                        height: getBarH(toDisplayValue(seg.segundos)),
                                        background: seg.color,
                                        minHeight: seg.segundos > 0 ? 22 : 0,
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
                                           fontSize: 12,
                                          color: "#ffffff",
                                          fontWeight: 700,
                                          lineHeight: 1,
                                          textShadow: "0 1px 1px rgba(0,0,0,0.45)",
                                          pointerEvents: "none",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {viewMode === "percentagem" ? toDisplayValue(seg.segundos).toFixed(1) : seg.segundos.toFixed(1)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div style={{ height: LABEL_H, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 10, width: "100%", minWidth: 0 }}>
                                  <div
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: operatorColorMap[resolveOperatorCode(b.operador)]?.text || "#374151",
                                    whiteSpace: "nowrap",
                                    textAlign: "center",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    width: "100%",
                                    maxWidth: 164,
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
                        <div className="mt-5 flex items-center gap-x-6 gap-y-3 flex-wrap">
                          {legenda.map((item) => (
                            <div key={`legend-${item.maquina}`} className="flex items-center gap-2">
                              <span style={{ width: 14, height: 14, borderRadius: 3, background: item.color, display: "inline-block" }} />
                              <span className="text-[13px] font-medium text-gray-700">{item.maquina}</span>
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
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <div className="w-7 h-7 bg-purple-100 rounded-sm flex items-center justify-center">
                  <Layout className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Layout - Planta de chão</div>
                  <p className="text-[10px] text-gray-500 font-normal mt-0.5">
                    {tipoLayout === "linha" ? "Linha" : "Espinha"} - {estacoesAtivas.length} estações ativas
                    {permitirCruzamento && tipoLayout === "espinha" ? " - Cruzamento ativo" : ""}
                  </p>
                </div>
              </CardTitle>
              {onTipoLayoutChange || onLayoutConfigChange ? (
                <div className="flex w-full flex-col items-center gap-2 lg:w-auto lg:items-end">
                  <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-end">
                    {onTipoLayoutChange ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onTipoLayoutChange("linha")}
                          className={`h-8 rounded-sm border px-3 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                            tipoLayout === "linha"
                              ? "border-blue-600 bg-blue-50 text-blue-700"
                              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          Linha
                        </button>
                        <button
                          type="button"
                          onClick={() => onTipoLayoutChange("espinha")}
                          className={`h-8 rounded-sm border px-3 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                            tipoLayout === "espinha"
                              ? "border-blue-600 bg-blue-50 text-blue-700"
                              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          Espinha
                        </button>
                      </div>
                    ) : null}
                    {onLayoutConfigChange ? (
                      <div className="flex h-8 items-center gap-2 rounded-sm border border-blue-200 bg-blue-50 px-2">
                        <Label htmlFor="vf-postos" className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                          Postos máximos
                        </Label>
                        <Input
                          id="vf-postos"
                          type="number"
                          min={2}
                          max={100}
                          value={layoutConfig?.postosPorLado ?? 8}
                          onChange={(e) => {
                            const parsed = Number(e.currentTarget.value);
                            if (!Number.isFinite(parsed)) return;
                            onLayoutConfigChange({
                              ...(layoutConfig as LayoutConfig),
                              postosPorLado: Math.max(2, Math.round(parsed)),
                            });
                          }}
                          className="h-7 w-20 rounded-sm bg-white text-[11px] font-mono"
                        />
                      </div>
                    ) : null}
                    {onLayoutConfigChange && agruparPorMaquina ? (
                      <div className="flex h-8 items-center gap-2 rounded-sm border border-blue-200 bg-blue-50 px-2">
                        <Label htmlFor="vf-distancia" className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                          Distância
                        </Label>
                        <Input
                          id="vf-distancia"
                          type="number"
                          min={1}
                          max={8}
                          value={layoutConfig?.distanciaMaxima ?? 4}
                          onChange={(e) => {
                            const parsed = Number(e.currentTarget.value);
                            if (!Number.isFinite(parsed)) return;
                            onLayoutConfigChange({
                              ...(layoutConfig as LayoutConfig),
                              distanciaMaxima: Math.max(1, Math.min(8, Math.round(parsed))),
                            });
                          }}
                          className="h-7 w-16 rounded-sm bg-white text-[11px] font-mono"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div />
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {(() => {
              const estacoes = estacoesAtivas.length > 0 ? estacoesAtivas : estacoesBase;

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
                            <div className="rounded border border-gray-300 bg-white p-3 w-[120px] min-h-[90px] flex flex-col items-center gap-2 justify-between">
                              <div className="text-xs font-bold text-gray-900">{est}</div>
                              <div className="w-full text-[9px] text-center rounded-sm border border-purple-200 bg-purple-50 text-purple-700 px-1 py-0.5 truncate">
                                {maq || "--"}
                              </div>
                              {(() => {
                                const c = operatorColorMap[operador];
                                return (
                                  <div
                                    className="w-full text-[9px] text-center rounded-sm px-1 py-0.5 truncate"
                                    style={c && operador ? { background: c.bg, border: `1px solid ${c.border}`, color: c.text } : { background: "#f9fafb", border: "1px solid #e5e7eb", color: "#6b7280" }}
                                  >
                                    {operador || "--"}
                                  </div>
                                );
                              })()}
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

                return (
                  <EspinhaLayout
                    estacoes={estacoes}
                    ladoA={ladoA}
                    ladoB={ladoB}
                    maxCols={maxCols}
                   flowByOperator={flowByOperatorFromApi}
                    estacoesMapeadas={estacoesMapeadas}
                    operatorColorMap={operatorColorMap}
                    permitirCruzamento={permitirCruzamento}
                  />
                );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}


