import { useState, useEffect, useCallback, useRef } from "react";
import { Operador, Operacao, ConfiguracaoDistribuicao, Produto, ResultadosBalanceamento } from "../types";
import { Button } from "../components/ui/button";
import { Calculator, Users, Package, Factory, ChevronDown, Edit3, AlertTriangle, Download, FileDown } from "lucide-react";
import { ConfiguracaoDistribuicaoComponent } from "../components/ConfiguracaoDistribuicao";
import { LayoutConfig } from "../components/LayoutConfigurador";
import { TabelaOperacoesManual } from "../components/TabelaOperacoesManual";
import { DashboardResultados } from "../components/DashboardResultados";
import { ResumoResultados } from "../components/ResumoResultados";
import { VisualizadorFluxo } from "../components/VisualizadorFluxo";
import { calcularBalanceamento } from "../utils/balanceamento";
import { salvarHistorico, obterHistorico } from "../utils/historico";
import { useStorage } from "../contexts/StorageContext";
import axios from "axios";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { API_BASE_URL } from "../config";
import { SearchableCombobox } from "../components/SearchableCombobox";
import { Progress } from "../components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Valores por defeito ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

const configPadrao: ConfiguracaoDistribuicao = {
  possibilidade: 1,
  agruparMaquinas: false,
  cargaMaximaOperador: 100,
  naoDividirMaiorQue: 1.1,
  naoDividirMenorQue: 0.9,
  horasTurno: 8,
  produtividadeEstimada: 85,
};

const layoutPadrao: LayoutConfig = {
  tipoLayout: "linha",
  postosPorLado: 8,
  distanciaMaxima: 4,
  permitirRetrocesso: false,
  permitirCruzamento: true,
  restricoes: [],
};

const normalizarLayoutConfig = (layout?: Partial<LayoutConfig> | null): LayoutConfig => {
  const merged = { ...layoutPadrao, ...(layout || {}) };
  if (Number(merged.distanciaMaxima) === 3) merged.distanciaMaxima = 4;
  return merged;
};

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Types and Helpers ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

interface FamilyOption {
  id: string;
  label: string;
}

type ApiRecord = Record<string, any>;

type DistItem = {
  operadorId: string;
  operacoes: string[];
  cargaHoraria: number;
  ocupacao: number;
  ciclosPorHora: number;
  temposOperacoes?: Record<string, number>;
};

const ensureArray = (value: unknown): ApiRecord[] => {
  if (Array.isArray(value)) return value as ApiRecord[];
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const nestedArray = Object.values(record).find((entry) => Array.isArray(entry));
    if (Array.isArray(nestedArray)) return nestedArray as ApiRecord[];
  }
  return [];
};

const pickString = (obj: ApiRecord, keys: string[]): string => {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
};

const extrairOperadoresDosResultadosIdeais = (raw: ApiRecord): Operador[] => {
  const slots = ensureArray(
    raw.operator_slots ??
      raw.operatorSlots ??
      raw.layouts?.linha?.operator_slots ??
      raw.layouts?.espinha?.operator_slots
  );
  const byId = new Map<string, Operador>();
  const add = (idRaw: unknown, nameRaw?: unknown) => {
    const id = String(idRaw ?? "").trim();
    if (!id) return;
    const current = byId.get(id);
    const name = String(nameRaw ?? current?.nome ?? "").trim();
    byId.set(id, current || {
      id,
      nome: name || id,
      competencias: {},
      oleHistorico: 100,
    });
    if (name && current) current.nome = name;
  };

  slots.forEach((slot) => add(
    slot.operator_id ?? slot.operatorId ?? slot.operador_id,
    slot.operator_name ?? slot.operatorName
  ));
  ensureArray(raw.operation_allocations ?? raw.operationAllocations).forEach((row) => {
    Object.entries(row.operator_times ?? {}).forEach(([id]) => add(id, row.operator_positions?.[id]?.operator_name));
    Object.entries(row.operator_positions ?? {}).forEach(([id, position]) => add(id, position?.operator_name));
  });
  Object.keys(raw.machine_times_per_operator ?? {}).forEach((id) => add(id));
  Object.keys(raw.operator_flow ?? {}).forEach((id) => add(id));
  return Array.from(byId.values());
};

const pickNumber = (obj: ApiRecord, keys: string[]): number | null => {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const normalized = value.trim().replace(",", ".");
      const direct = Number(normalized);
      if (Number.isFinite(direct)) return direct;

      const matched = normalized.match(/-?\d+(?:\.\d+)?/);
      const parsed = matched ? Number(matched[0]) : Number.NaN;
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
};

const pickBoolean = (obj: ApiRecord, keys: string[]): boolean | undefined => {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "number" && Number.isFinite(value)) return value !== 0;
    if (typeof value === "string" && value.trim()) {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "sim"].includes(normalized)) return true;
      if (["false", "0", "no", "nao"].includes(normalized)) return false;
    }
  }
  return undefined;
};

const ensureRecord = (value: unknown): ApiRecord | null => {
  if (Array.isArray(value)) {
    return (value.find((entry) => entry && typeof entry === "object") as ApiRecord | undefined) || null;
  }
  if (value && typeof value === "object") {
    const record = value as ApiRecord;
    const hasDirectKeys = ["code","id","name","description","operations","operacoes","task_id","task_code","family_id","layouts","espinha","machine_layout","operator_flow"].some((key) => key in record);
    if (hasDirectKeys) return record;
    const nestedRecord = Object.values(record).find((entry) => entry && typeof entry === "object" && !Array.isArray(entry));
    if (nestedRecord && typeof nestedRecord === "object") return nestedRecord as ApiRecord;
  }
  return null;
};

const normalizeKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const ordenarOperacoesPelaBase = (operacoesIds: string[], operacoesBase: Operacao[]): string[] => {
  const ordemPorId = new Map(
    operacoesBase.map((operacao, index) => [normalizeKey(operacao.id), index])
  );

  return Array.from(new Set(operacoesIds.filter(Boolean))).sort((a, b) => {
    const indiceA = ordemPorId.get(normalizeKey(a)) ?? Number.MAX_SAFE_INTEGER;
    const indiceB = ordemPorId.get(normalizeKey(b)) ?? Number.MAX_SAFE_INTEGER;
    if (indiceA !== indiceB) return indiceA - indiceB;
    return a.localeCompare(b);
  });
};

const extractDigits = (value: string): string => {
  const parts = value.match(/\d+/g);
  return parts ? parts.join("") : "";
};

const mapOperatorToCode = (rawOperator: string, operadoresPool: Operador[]): string => {
  const ref = rawOperator.trim();
  if (!ref) return rawOperator;

  const refKey = normalizeKey(ref);
  const refDigits = extractDigits(ref);
  const codeToken =
    ref.match(/\(([A-Za-z]{1,}\d+)\)/)?.[1] ||
    ref.match(/\b([A-Za-z]{1,}\d+)\b/)?.[1] ||
    "";
  const codeTokenKey = codeToken ? normalizeKey(codeToken) : "";

  const exactById = operadoresPool.find((op) => normalizeKey(op.id) === refKey);
  if (exactById) return exactById.id;

  if (codeTokenKey) {
    const byCodeToken = operadoresPool.find((op) => normalizeKey(op.id) === codeTokenKey);
    if (byCodeToken) return byCodeToken.id;
  }

  const exactByNome = operadoresPool.find((op) => normalizeKey(op.nome || "") === refKey);
  if (exactByNome) return exactByNome.id;

  const byNomeParcial = operadoresPool.find((op) => {
    const nomeKey = normalizeKey(op.nome || "");
    if (!nomeKey) return false;
    return nomeKey.includes(refKey) || refKey.includes(nomeKey);
  });
  if (byNomeParcial) return byNomeParcial.id;

  if (refDigits) {
    const byDigits = operadoresPool.find((op) => {
      const opDigits = extractDigits(op.id);
      return Boolean(opDigits) && (opDigits === refDigits || opDigits.endsWith(refDigits) || refDigits.endsWith(opDigits));
    });
    if (byDigits) return byDigits.id;
  }

  return ref;
};

const parseRawNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const normalized = value.trim().replace(",", ".");
    const direct = Number(normalized);
    if (Number.isFinite(direct)) return direct;
    const matched = normalized.match(/-?\d+(?:\.\d+)?/);
    const parsed = matched ? Number(matched[0]) : Number.NaN;
    if (Number.isFinite(parsed)) return parsed;
  }
  if (value && typeof value === "object") {
    return pickNumber(value as ApiRecord, [
      "value",
      "time",
      "tempo",
      "seconds",
      "time_seconds",
      "time_min",
      "minutes",
    ]);
  }
  return null;
};

const findOperacaoIdByReferencia = (ref: string, operacoesBase: Operacao[]): string | null => {
  const refKey = normalizeKey(ref);
  if (!refKey) return null;

  const direct = operacoesBase.find((op) => {
    const idKey = normalizeKey(op.id);
    const nomeKey = normalizeKey(op.nome);
    return (
      idKey === refKey ||
      nomeKey === refKey ||
      refKey.includes(idKey) ||
      refKey.includes(nomeKey)
    );
  });
  if (direct) return direct.id;

  const token = ref
    .split(/[\s\-:/()]+/)
    .map((part) => normalizeKey(part))
    .find(Boolean);
  if (!token) return null;

  const byToken = operacoesBase.find((op) => normalizeKey(op.id) === token || normalizeKey(op.nome) === token);
  return byToken ? byToken.id : null;
};

const findRowOperationId = (row: ApiRecord, operacoesBase: Operacao[]): string | null => {
  const fromKnownKeys =
    pickString(row, [
      "operation_code",
      "operation_id",
      "operacao_id",
      "operation",
      "operacao",
      "operation_name",
      "operacao_nome",
      "name",
      "nome",
      "description",
      "descricao",
      "op",
    ]) || "";

  if (fromKnownKeys) {
    const mapped = findOperacaoIdByReferencia(fromKnownKeys, operacoesBase);
    if (mapped) return mapped;
  }

  for (const [key, value] of Object.entries(row)) {
    const keyNorm = normalizeKey(key);
    const looksOperationField =
      keyNorm.includes("operac") ||
      keyNorm.includes("operation") ||
      keyNorm === "op" ||
      keyNorm === "nome";
    if (!looksOperationField) continue;
    if (typeof value !== "string" && typeof value !== "number") continue;
    const mapped = findOperacaoIdByReferencia(String(value), operacoesBase);
    if (mapped) return mapped;
  }

  const seq = pickNumber(row, ["sequence", "sequencia", "seq", "order", "ordem"]);
  if (seq != null) {
    const bySeq = operacoesBase.find((op) => Number(op.sequencia) === Number(seq));
    if (bySeq) return bySeq.id;
  }

  return null;
};

const extrairDistribuicaoDeOperationAllocations = (
  rows: ApiRecord[],
  operacoesBase: Operacao[],
  operadoresPool: Operador[],
  tempoCiclo: number
): DistItem[] => {
  const mapa: Record<string, { operacoes: Set<string>; tempoTotal: number; temposOperacoes: Record<string, number> }> = {};

  const ensureOperador = (operadorId: string) => {
    if (!mapa[operadorId]) {
      mapa[operadorId] = { operacoes: new Set(), tempoTotal: 0, temposOperacoes: {} };
    }
  };

  const processarTempo = (operadorRef: string, operacaoId: string, tempoSegundos: number) => {
    const operadorId = mapOperatorToCode(operadorRef, operadoresPool);
    if (!operadorId) return;
    ensureOperador(operadorId);
    if (operacaoId) mapa[operadorId].operacoes.add(operacaoId);
    const tempoMinutos = tempoSegundos / 60;
    mapa[operadorId].tempoTotal += tempoMinutos;
    if (operacaoId) {
      mapa[operadorId].temposOperacoes[operacaoId] =
        (mapa[operadorId].temposOperacoes[operacaoId] || 0) + tempoMinutos;
    }
  };

  for (const row of rows) {
    const operacaoRef =
      pickString(row, [
        "operation_code",
        "operation_id",
        "operacao_id",
        "operation",
        "operacao",
        "operation_name",
        "operacao_nome",
        "name",
        "nome",
      ]) || "";
    const operacaoId = operacaoRef ? findOperacaoIdByReferencia(operacaoRef, operacoesBase) || operacaoRef : (findRowOperationId(row, operacoesBase) || "");

    const operatorTimes = row.operator_times && typeof row.operator_times === "object" ? row.operator_times : {};
    if (Object.keys(operatorTimes).length > 0) {
      Object.entries(operatorTimes).forEach(([operatorRef, timeValue]) => {
        const tempoSegundos = parseRawNumber(timeValue);
        if (tempoSegundos == null || !Number.isFinite(tempoSegundos) || tempoSegundos <= 0) return;
        processarTempo(operatorRef, operacaoId, tempoSegundos);
      });
      continue;
    }

    const operatorPositions = row.operator_positions && typeof row.operator_positions === "object" ? row.operator_positions : {};
    if (Object.keys(operatorPositions).length > 0) {
      Object.entries(operatorPositions).forEach(([operatorRef, position]) => {
        const tempoSegundos = parseRawNumber((position as ApiRecord).time_seconds ?? (position as ApiRecord).seconds);
        if (tempoSegundos == null || !Number.isFinite(tempoSegundos) || tempoSegundos <= 0) return;
        processarTempo(operatorRef, operacaoId, tempoSegundos);
      });
      continue;
    }

    if (Array.isArray(row.operator_allocations)) {
      for (const allocation of row.operator_allocations) {
        const record = allocation as ApiRecord;
        const operatorRef = pickString(record, ["operator_code", "operator_id", "operador_id", "operator", "operador", "code"]);
        if (!operatorRef) continue;
        const tempoSegundos = parseRawNumber(
          record.time_seconds ??
          record.tempo_segundos ??
          record.seconds ??
          record.time
        );
        if (tempoSegundos == null || !Number.isFinite(tempoSegundos) || tempoSegundos <= 0) continue;
        processarTempo(operatorRef, operacaoId, tempoSegundos);
      }
    }
  }

  return Object.entries(mapa).map(([operadorId, dados]) => {
    const ocupacao = tempoCiclo > 0 ? (dados.tempoTotal / tempoCiclo) * 100 : 0;
    return {
      operadorId,
      operacoes: ordenarOperacoesPelaBase(Array.from(dados.operacoes), operacoesBase),
      cargaHoraria: dados.tempoTotal,
      ocupacao,
      ciclosPorHora: dados.tempoTotal > 0 ? 60 / dados.tempoTotal : 0,
      temposOperacoes: dados.temposOperacoes,
    };
  });
};

const extrairOperacoesPorReferencia = (raw: unknown, operacoesBase: Operacao[]): string[] => {
  const refs: string[] = [];

  const appendRef = (value: unknown) => {
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value).trim();
      if (!text) return;
      if (typeof value === "string" && /[;,|]/.test(text)) {
        text
          .split(/[;,|]/)
          .map((part) => part.trim())
          .filter(Boolean)
          .forEach((part) => refs.push(part));
        return;
      }
      refs.push(text);
      return;
    }

    if (value && typeof value === "object") {
      const record = value as ApiRecord;
      const opId = pickString(record, ["operation_code", "operation_id", "operacao_id", "id", "code", "operation", "operacao"]);
      const opName = pickString(record, ["operation_name", "operacao_nome", "name", "nome", "description", "descricao"]);
      if (opId) refs.push(opId);
      if (opName) refs.push(opName);
    }
  };

  if (Array.isArray(raw)) raw.forEach(appendRef);
  else appendRef(raw);

  const mapped = new Set<string>();
  refs.forEach((ref) => {
    const opId = findOperacaoIdByReferencia(ref, operacoesBase);
    if (opId) mapped.add(opId);
  });
  return Array.from(mapped);
};

const extrairOperacoesETemposDoRow = (
  row: ApiRecord,
  operacoesBase: Operacao[]
): { operacoes: string[]; temposOperacoes: Record<string, number> } => {
  const opsRaw = row.operations ?? row.operacoes ?? row.assigned_operations ?? row.assignedOperations;
  const operacoes = new Set<string>();
  const temposOperacoes: Record<string, number> = {};

  const addOperacao = (ref: string, tempoMin?: number | null) => {
    const opId = findOperacaoIdByReferencia(ref, operacoesBase);
    if (!opId) return;
    operacoes.add(opId);
    if (typeof tempoMin === "number" && Number.isFinite(tempoMin) && tempoMin > 0) {
      temposOperacoes[opId] = (temposOperacoes[opId] || 0) + tempoMin;
    }
  };

  const parseTempoMin = (obj: ApiRecord): number | null => {
    const tempoSegundos = pickNumber(obj, ["time_seconds", "tempo_segundos", "seconds", "duration_seconds"]);
    const tempoMinDireto = pickNumber(obj, ["time_min", "time_minutes", "tempo_minutos", "minutes", "duration_min"]);
    if (tempoMinDireto != null) return tempoMinDireto;
    if (tempoSegundos != null) return tempoSegundos / 60;

    const tempoLivre = obj.time ?? obj.tempo ?? obj.duration ?? obj.duracao;
    const unidade = pickString(obj, ["time_unit", "unit", "unidade", "duration_unit"]).toLowerCase();

    if (tempoLivre == null) return null;
    const valor = parseRawNumber(tempoLivre);
    if (valor == null || !Number.isFinite(valor) || valor <= 0) return null;

    if (typeof tempoLivre === "string") {
      const raw = tempoLivre.trim().toLowerCase();
      if (/(min|mins|minuto|minutos)\b/.test(raw)) return valor;
      if (/(sec|secs|seg|segs)\b/.test(raw) || /\d\s*s\b/.test(raw) || /s$/.test(raw)) return valor / 60;
    }

    if (unidade) {
      if (/(min|mins|minuto|minutos)\b/.test(unidade)) return valor;
      if (/(sec|secs|seg|segs|s)\b/.test(unidade)) return valor / 60;
    }

    // Fallback: "time" vindo da API costuma estar em segundos.
    return valor > 10 ? valor / 60 : valor;
  };

  const processEntry = (entry: unknown) => {
    if (typeof entry === "string" || typeof entry === "number") {
      addOperacao(String(entry));
      return;
    }

    if (!entry || typeof entry !== "object") return;

    const obj = entry as ApiRecord;
    const ref =
      pickString(obj, ["operation_code", "operation_id", "operacao_id", "id", "code", "operation", "operacao", "op"]) ||
      pickString(obj, ["operation_name", "operacao_nome", "name", "nome", "description", "descricao"]);

    if (ref) {
      addOperacao(ref, parseTempoMin(obj));
      return;
    }

    // Some payloads can send an object keyed by operation code/name.
    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === "number") {
        addOperacao(key, value);
        return;
      }
      if (typeof value === "string") {
        const parsed = Number(value.replace(",", ".").match(/-?\d+(?:\.\d+)?/)?.[0] ?? "");
        addOperacao(key, Number.isFinite(parsed) ? parsed : undefined);
      }
    });
  };

  if (Array.isArray(opsRaw)) opsRaw.forEach(processEntry);
  else if (opsRaw != null) processEntry(opsRaw);

  if (operacoes.size === 0) {
    const operacaoDireta =
      pickString(row, ["operation_code", "operation_id", "operacao_id", "operation", "operacao", "id", "code"]) ||
      pickString(row, ["operation_name", "operacao_nome", "name", "nome", "description", "descricao"]);
    if (operacaoDireta) {
      const opId = findOperacaoIdByReferencia(operacaoDireta, operacoesBase);
      if (opId) operacoes.add(opId);
    }
  }

  if (operacoes.size === 0) {
    extrairOperacoesPorReferencia(opsRaw, operacoesBase).forEach((opId) => operacoes.add(opId));
  }

  return { operacoes: ordenarOperacoesPelaBase(Array.from(operacoes), operacoesBase), temposOperacoes };
};

const extrairDistribuicaoDeTableData = (
  raw: ApiRecord,
  operacoesBase: Operacao[],
  tempoCiclo: number,
  operadoresPool: Operador[]
): DistItem[] => {
  const tableDataRaw =
    raw.table_data ??
    raw.tableData ??
    raw.operator_table ??
    raw.operatorTable ??
    raw.results_table;

  let tableData = ensureArray(tableDataRaw);
  if (
    tableData.length === 0 &&
    tableDataRaw &&
    typeof tableDataRaw === "object" &&
    !Array.isArray(tableDataRaw)
  ) {
    tableData = Object.entries(tableDataRaw as Record<string, unknown>).map(([key, value]) => {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return { operator: key, ...(value as ApiRecord) };
      }
      return { operator: key, occupancy: value };
    });
  }

  if (tableData.length === 0) return [];

  const reservedRowKeys = new Set(
    [
      "grupo",
      "group",
      "seq",
      "sequencia",
      "sequencia_op",
      "sequence",
      "maquina",
      "machine",
      "machine_name",
      "tipo_maquina",
      "operacao",
      "operation",
      "operation_code",
      "operation_id",
      "operation_name",
      "operacao_id",
      "operacao_nome",
      "ocup",
      "ocupacao",
      "occupancy",
      "occupancy_percent",
      "operator_occupancy",
      "worker_occupancy",
      "tempo",
      "tempo_segundos",
      "time_seconds",
      "time_min",
      "time_minutes",
      "minutes",
      "seconds",
      "subtotal",
      "total",
      "linha",
      "line",
      "line_type",
      "balanced",
      "is_balanced",
      "status",
      "ok",
      "critical",
      "critical_op",
      "critical_operation",
    ].map((key) => normalizeKey(key))
  );

  const agrupado: Record<
    string,
    { operacoes: Set<string>; cargaHoraria: number; ocupacao?: number; temposOperacoes: Record<string, number> }
  > = {};

  const ensureOperador = (operadorId: string, ocupacao?: number) => {
    if (!agrupado[operadorId]) {
      agrupado[operadorId] = {
        operacoes: new Set<string>(),
        cargaHoraria: 0,
        ocupacao,
        temposOperacoes: {},
      };
    }
  };

  const operadorExisteNoPool = (id: string): boolean =>
    operadoresPool.some((operador) => normalizeKey(operador.id) === normalizeKey(id));

  const fallbackOperatorByColumn = new Map<string, string>();
  const fallbackOperatorsUsed = new Set<string>();

  const resolveMatrixColumnOperatorId = (colKey: string): string | null => {
    const colNorm = normalizeKey(colKey);
    if (!colNorm) return null;

    const mapped = mapOperatorToCode(String(colKey), operadoresPool);
    if (operadorExisteNoPool(mapped)) return mapped;
    if (operadorExisteNoPool(String(colKey))) return mapOperatorToCode(String(colKey), operadoresPool);

    const memo = fallbackOperatorByColumn.get(colNorm);
    if (memo && operadorExisteNoPool(memo)) return memo;

    const nextFallback = operadoresPool.find((operador) => !fallbackOperatorsUsed.has(operador.id));
    if (nextFallback) {
      fallbackOperatorByColumn.set(colNorm, nextFallback.id);
      fallbackOperatorsUsed.add(nextFallback.id);
      return nextFallback.id;
    }

    return null;
  };

  tableData.forEach((row) => {
    // Tenta primeiro extrair operator direto (estrutura por linha)
    const operadorOriginal = pickString(row, ["operator", "operator_id", "operador", "operador_id"]);
    
    if (operadorOriginal) {
      // Estrutura por linha: cada linha tem um operador e suas operaÃƒÂ§ÃƒÂµes
      const operadorId = mapOperatorToCode(operadorOriginal, operadoresPool);
      
      const extracted = extrairOperacoesETemposDoRow(row, operacoesBase);
      const operacaoDaLinha = findRowOperationId(row, operacoesBase);
      const operacoes = new Set<string>(extracted.operacoes);
      if (operacaoDaLinha) operacoes.add(operacaoDaLinha);
      const temposOperacoes: Record<string, number> = { ...extracted.temposOperacoes };

      const ocupacaoRaw = pickNumber(row, [
        "occupancy",
        "occupancy_percent",
        "operator_occupancy",
        "worker_occupancy",
        "ocupacao",
        "utilization",
        "load",
      ]);
      const ocupacao = ocupacaoRaw == null ? undefined : ocupacaoRaw <= 1 ? ocupacaoRaw * 100 : ocupacaoRaw;

      const tempoSegundos = pickNumber(row, ["time_seconds", "tempo_segundos", "seconds"]);
      const tempoMinutosDireto = pickNumber(row, [
        "time_min",
        "time_minutes",
        "tempo_minutos",
        "minutes",
        "workload_minutes",
        "workload_min",
        "carga_horaria",
      ]);
      const tempoSomaOperacoes = Object.values(temposOperacoes).reduce((sum, value) => sum + value, 0);
      const tempoMinutos =
        tempoMinutosDireto ??
        (tempoSegundos != null ? tempoSegundos / 60 : null) ??
        (tempoSomaOperacoes > 0 ? tempoSomaOperacoes : null) ??
        (ocupacao != null && tempoCiclo > 0 ? (tempoCiclo * ocupacao) / 100 : 0);

      ensureOperador(operadorId, ocupacao);

      operacoes.forEach((opId) => agrupado[operadorId].operacoes.add(opId));
      Object.entries(temposOperacoes).forEach(([opId, tempoMin]) => {
        agrupado[operadorId].temposOperacoes[opId] = (agrupado[operadorId].temposOperacoes[opId] || 0) + tempoMin;
      });

      agrupado[operadorId].cargaHoraria += Math.max(0, tempoMinutos || 0);
      if (ocupacao != null) agrupado[operadorId].ocupacao = ocupacao;
    } else {
      // Estrutura por coluna: cada chave ÃƒÂ© um operador, dentro tem operaÃƒÂ§ÃƒÂµes e tempos
      Object.entries(row).forEach(([colKey, colValue]) => {
        const colKeyNorm = normalizeKey(colKey);
        if (!colKeyNorm || reservedRowKeys.has(colKeyNorm)) return;

        const mappedOperator = mapOperatorToCode(String(colKey), operadoresPool);
        if (!operadorExisteNoPool(mappedOperator)) return;

        // colValue pode ser um objeto com operaÃƒÂ§ÃƒÂµes como chaves, ou um nÃƒÂºmero direto
        if (!colValue || typeof colValue !== "object") return;

        const operadorData = colValue as ApiRecord;
        let tempoTotalOperador = 0;
        
        // Iterar pelas operaÃƒÂ§ÃƒÂµes dentro do operador
        Object.entries(operadorData).forEach(([opKey, opTime]) => {
          const opKeyNorm = normalizeKey(opKey);
          if (!opKeyNorm || reservedRowKeys.has(opKeyNorm)) return;

          // Tentar mapear a chave para uma operaÃƒÂ§ÃƒÂ£o
          const operacaoId = findOperacaoIdByReferencia(String(opKey), operacoesBase);
          if (!operacaoId) return;

          const tempoRaw = parseRawNumber(opTime);
          if (tempoRaw == null || !Number.isFinite(tempoRaw) || tempoRaw <= 0) return;

          // Detectar se estÃƒÂ¡ em segundos ou minutos
          const tempoOperacaoBase = operacoesBase.find((op) => op.id === operacaoId)?.tempo ?? 0;
          const ehSegundos = tempoRaw > tempoOperacaoBase * 2.5;
          const tempoMin = ehSegundos ? tempoRaw / 60 : tempoRaw;

          ensureOperador(mappedOperator);
          agrupado[mappedOperator].operacoes.add(operacaoId);
          agrupado[mappedOperator].temposOperacoes[operacaoId] = 
            (agrupado[mappedOperator].temposOperacoes[operacaoId] || 0) + tempoMin;
          agrupado[mappedOperator].cargaHoraria += tempoMin;
          tempoTotalOperador += tempoMin;
        });
      });
    }
  });

  return Object.entries(agrupado).map(([operadorId, dados]) => {
    const ocupacaoCalculada =
      dados.ocupacao != null
        ? dados.ocupacao
        : tempoCiclo > 0
          ? (dados.cargaHoraria / tempoCiclo) * 100
          : 0;

    return {
      operadorId,
      operacoes: ordenarOperacoesPelaBase(Array.from(dados.operacoes), operacoesBase),
      cargaHoraria: dados.cargaHoraria,
      ocupacao: ocupacaoCalculada,
      ciclosPorHora: dados.cargaHoraria > 0 ? 60 / dados.cargaHoraria : 0,
      temposOperacoes: dados.temposOperacoes,
    };
  });
};

const extrairMensagemErro = (error: unknown): string => {
  const formatListMessage = (message: string): string => {
    const trimmed = message.trim();
    const parts = trimmed.split(/:(.+)/s);
    if (parts.length !== 3) return trimmed;

    const prefix = parts[0].trim();
    const listPart = parts[1].trim();
    const items = listPart
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (items.length < 2) return trimmed;
    return `${prefix}:\n${items.map((item) => `- ${item}`).join("\n")}`;
  };

  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { detail?: unknown; message?: string; error?: string }
      | undefined;

    if (Array.isArray(data?.detail)) {
      const linhas = data.detail
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const detail = item as { loc?: unknown; msg?: unknown; input?: unknown };
          const loc = Array.isArray(detail.loc)
            ? detail.loc
                .map((part) => (typeof part === "string" || typeof part === "number" ? String(part) : ""))
                .filter(Boolean)
                .join(".")
            : "";
          const msg = typeof detail.msg === "string" ? detail.msg : "Erro de validacao";
          const input = detail.input != null ? ` (input: ${String(detail.input)})` : "";
          return loc ? `${loc}: ${msg}${input}` : `${msg}${input}`;
        })
        .filter((line): line is string => Boolean(line));
      if (linhas.length > 0) return linhas.join("\n");
    }

    if (typeof data?.detail === "string" && data.detail.trim()) return formatListMessage(data.detail);
    if (data?.detail && typeof data.detail === "object") {
      const detail = data.detail as { message?: unknown };
      if (typeof detail.message === "string" && detail.message.trim()) return formatListMessage(detail.message);
    }
    if (typeof data?.message === "string" && data.message.trim()) return formatListMessage(data.message);
    if (typeof data?.error === "string" && data.error.trim()) return formatListMessage(data.error);
    if (typeof error.message === "string" && error.message.trim()) return formatListMessage(error.message);
  }

  if (error instanceof Error && error.message.trim()) return formatListMessage(error.message);
  return "Ocorreu um erro inesperado.";
};

const mapApiOperation = (raw: ApiRecord, index: number): Operacao =>
  (() => {
    const timeMinutes = pickNumber(raw, ["time_min","time_minutes","tempo_minutos","tempo","minutes"]);
    const timeCmin = pickNumber(raw, ["time_cmin","tempo_cmin","cmin"]);
    return {
      id: pickString(raw, ["operation_code","operation_id","id","code"]) || `OP${String(index + 1).padStart(3, "0")}`,
      nome: pickString(raw, ["operation_name","name","nome","designation","description","descricao"]) || `Operacao ${index + 1}`,
      tempo: timeMinutes ?? (timeCmin != null ? timeCmin / 100 : null) ?? ((pickNumber(raw, ["time_seconds","tempo_segundos","seconds"]) || 0) / 60),
      tipoMaquina: pickString(raw, ["machine_name","machine_type","tipo_maquina","tipoMaquina"]),
      sequencia: pickNumber(raw, ["sequence_order","sequence","sequencia","seq","order"]) ?? index + 1,
      critica: pickBoolean(raw, ["is_critical","critica"]),
    } as Operacao;
  })();

const mapApiTaskToProduto = (raw: ApiRecord, index: number, familyId: string): Produto => {
  const taskId = pickString(raw, ["task_id","task_code","id","code"]) || `${familyId}-TASK-${String(index + 1).padStart(3, "0")}`;
  const taskName = pickString(raw, ["task_name","name","nome","description","descricao"]) || `Ficha ${index + 1}`;
  const operationsRaw = ensureArray(raw.operations ?? raw.operacoes ?? raw.steps ?? raw.sequence ?? raw.gama_operatoria).map((op, i) => mapApiOperation(op, i));
  const operations = operationsRaw.map((operation, operationIndex) => ({
    ...operation,
    sequencia: operationIndex + 1,
  }));
  const numOperations = pickNumber(raw, ["num_operations", "numero_operacoes", "operations_count"]) ?? operations.length;
  const numCapableOperators = pickNumber(raw, ["num_capable_operators", "numero_operadores_disponiveis"]);
  const numDistinctMachines = pickNumber(raw, ["num_distinct_machines", "numero_maquinas_distintas"]);
  const indicators = [
    numOperations != null ? `${numOperations} ops` : null,
    numCapableOperators != null ? `${numCapableOperators} op disponiveis` : null,
    numDistinctMachines != null ? `${numDistinctMachines} maquinas` : null,
  ].filter(Boolean);
  const today = new Date().toISOString().split("T")[0];
  return {
    id: taskId,
    nome: taskName,
    referencia: pickString(raw, ["reference","referencia","task_reference","task_code"]) || taskId,
    cliente: pickString(raw, ["client","cliente"]),
    descricao: pickString(raw, ["notes","observacoes","description","descricao"]) || (indicators.length ? indicators.join(" | ") : `Ficha tecnica da familia ${familyId}`),
    operacoes: operations,
    dataCriacao: pickString(raw, ["created_at","creation_date","data_criacao"]) || today,
    dataModificacao: pickString(raw, ["updated_at","modified_at","data_modificacao"]) || today,
  };
};

const normalizeToken = (value: string): string => value.trim().toUpperCase();

const normalizeNumericToken = (value: string): string => {
  const sanitized = value.trim().replace(/[^\d-]/g, "");
  if (!sanitized) return "";
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? String(parsed) : "";
};

const parseAssignedOperatorIds = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => parseAssignedOperatorIds(entry))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parseAssignedOperatorIds(parsed);
      } catch {
        // fallback
      }
    }
    if (trimmed.includes(",") || trimmed.includes(";")) {
      return trimmed
        .split(/[;,]/)
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    return [trimmed];
  }

  if (typeof value === "number" && Number.isFinite(value)) return [String(value)];

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const nestedCandidates = [
      record.collaborator_ids,
      record.collaborators,
      record.colaboradores,
      record.operator_ids,
      record.operators,
      record.operadores,
      record.collaborator_id,
      record.operator_id,
      record.operator,
      record.operador,
      record.id,
      record.code,
    ];
    for (const candidate of nestedCandidates) {
      const parsed = parseAssignedOperatorIds(candidate);
      if (parsed.length > 0) return parsed;
    }
  }

  return [];
};

const resolveOperationIdFromKey = (operationKey: string, operacoes: Operacao[]): string | null => {
  const keyToken = normalizeToken(operationKey);
  const keyNumeric = normalizeNumericToken(operationKey);
  const keyAsNumber = Number(operationKey);

  const byId = operacoes.find((operacao) => normalizeToken(operacao.id) === keyToken);
  if (byId) return byId.id;

  if (keyNumeric) {
    const byIdNumeric = operacoes.find(
      (operacao) => normalizeNumericToken(operacao.id) === keyNumeric
    );
    if (byIdNumeric) return byIdNumeric.id;
  }

  if (Number.isFinite(keyAsNumber)) {
    const bySequence = operacoes.find((operacao) => operacao.sequencia === keyAsNumber);
    if (bySequence) return bySequence.id;
  }

  return null;
};

const mapOperationCandidatesToManual = (
  operationCandidates: Record<string, unknown>,
  operacoes: Operacao[]
): { [operacaoId: string]: string[] } => {
  const mapped: { [operacaoId: string]: string[] } = {};

  Object.entries(operationCandidates).forEach(([operationKey, operationValue]) => {
    const operacaoId = resolveOperationIdFromKey(operationKey, operacoes);
    if (!operacaoId) return;

    const operadoresIds = Array.from(new Set(parseAssignedOperatorIds(operationValue)));
    if (operadoresIds.length === 0) return;
    mapped[operacaoId] = operadoresIds;
  });

  return mapped;
};

const candidatePoolsArrayToObject = (
  rows: unknown[],
  operacoes: Operacao[]
): Record<string, unknown> | null => {
  const mapped: Record<string, unknown> = {};

  rows.forEach((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return;
    const record = row as ApiRecord;
    const operationKey =
      pickString(record, [
        "operation_code",
        "operation_id",
        "op_code",
        "op_id",
        "operation",
        "op",
        "code",
        "id",
      ]) || "";
    if (!operationKey) return;

    const operacaoId = resolveOperationIdFromKey(operationKey, operacoes);
    if (!operacaoId) return;

    const operatorIds = parseAssignedOperatorIds(
      record.collaborator_ids ??
        record.collaborators ??
        record.colaboradores ??
        record.operator_ids ??
        record.operators ??
        record.operadores ??
        record.collaborator_id ??
        record.operator_id ??
        record.operator ??
        record.operador
    );

    if (operatorIds.length === 0) return;
    mapped[operacaoId] = Array.from(new Set(operatorIds));
  });

  return Object.keys(mapped).length > 0 ? mapped : null;
};

const coerceCandidatePoolsObject = (
  value: unknown,
  operacoes: Operacao[]
): Record<string, unknown> | null => {
  if (!value) return null;
  if (Array.isArray(value)) return candidatePoolsArrayToObject(value, operacoes);
  if (typeof value === "object") return value as Record<string, unknown>;
  return null;
};

const extractCandidatePoolsForProduto = (
  responseRecord: Record<string, unknown>,
  produtoAlvo: Produto
): Record<string, unknown> | null => {
  const pickedTaskIds = Array.from(
    new Set([produtoAlvo.id, produtoAlvo.referencia].map((value) => value?.trim()).filter(Boolean))
  ) as string[];
  const normalizedTaskIds = new Set(pickedTaskIds.map((value) => normalizeKey(value)));
  const queue: Record<string, unknown>[] = [responseRecord];
  const seen = new Set<object>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);

    const mapped = mapOperationCandidatesToManual(current, produtoAlvo.operacoes);
    if (Object.keys(mapped).length > 0) return current;

    const nestedPools =
      current.candidate_pools ??
      current.candidatePools ??
      current.pools ??
      current.operation_candidates ??
      current.operationCandidates ??
      null;
    const coercedNestedPools = coerceCandidatePoolsObject(nestedPools, produtoAlvo.operacoes);
    if (coercedNestedPools) queue.push(coercedNestedPools);

    Object.entries(current).forEach(([key, value]) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return;
      const nested = value as Record<string, unknown>;
      const nestedTaskId = pickString(nested as ApiRecord, ["task_id", "taskId", "task_code", "taskCode", "reference"]);
      if (nestedTaskId && normalizedTaskIds.has(normalizeKey(nestedTaskId))) {
        queue.push(nested);
        return;
      }
      if (normalizedTaskIds.has(normalizeKey(key))) {
        queue.push(nested);
      }
    });
  }

  return null;
};

function criarUnidadePadrao(operadores: Operador[]) {
  return {
    operadores: operadores,
    operadoresSelecionados: operadores.map((op) => op.id),
    atribuicoesManual: {} as { [operacaoId: string]: string[] },
    config: { ...configPadrao },
  };
}

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Componente ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

export default function Home() {
  const { dados, salvar } = useStorage();

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Operadores vem SEMPRE do contexto (fonte de verdade unica) ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  // Nunca importar operadoresMock directamente aqui
  const operadoresMaster = dados.operadores;

  // Ler configuracao guardada
  const confGuardada = dados.configuracao;

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Estado local (inicializado a partir do contexto) ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

  const [unidadeAtiva, setUnidadeAtiva] = useState<1 | 2 | 3>(1);

  const [grupoArtigoSelecionado, setGrupoArtigoSelecionado] = useState<string>(
    confGuardada.grupoArtigoSelecionado || ""
  );

  const [operacoesManual, setOperacoesManual] = useState<Operacao[]>(
    confGuardada.operacoesManual || []
  );

  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(
    normalizarLayoutConfig(confGuardada.layoutConfig)
  );

  const [dadosUnidades, setDadosUnidades] = useState(() => {
    const u1 = criarUnidadePadrao(operadoresMaster);
    const u2 = criarUnidadePadrao(operadoresMaster);
    const u3 = criarUnidadePadrao(operadoresMaster);
    const g = confGuardada.dadosUnidades;
    if (g) {
      if (g["1"]) {
        u1.config = { ...configPadrao, ...g["1"].config };
        u1.operadoresSelecionados = g["1"].operadoresSelecionados || u1.operadoresSelecionados;
        u1.atribuicoesManual = g["1"].atribuicoesManual || {};
      }
      if (g["2"]) {
        u2.config = { ...configPadrao, ...g["2"].config };
        u2.operadoresSelecionados = g["2"].operadoresSelecionados || u2.operadoresSelecionados;
        u2.atribuicoesManual = g["2"].atribuicoesManual || {};
      }
      if (g["3"]) {
        u3.config = { ...configPadrao, ...g["3"].config };
        u3.operadoresSelecionados = g["3"].operadoresSelecionados || u3.operadoresSelecionados;
        u3.atribuicoesManual = g["3"].atribuicoesManual || {};
      }
    }
    return { 1: u1, 2: u2, 3: u3 };
  });

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Sincronizar com o contexto quando os dados carregam do ficheiro ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

  const [sincronizado, setSincronizado] = useState(false);

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ API: Familias e Fichas Tecnicas ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  const [familias, setFamilias] = useState<FamilyOption[]>([]);
  const [loadingFamilias, setLoadingFamilias] = useState(false);
  const [produtosApi, setProdutosApi] = useState<Produto[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<string | null>(
    confGuardada.fichaTecnicaSelecionada?.fichaId || null
  );
  const [loadingFichas, setLoadingFichas] = useState(false);
  const [candidatePoolsByOperation, setCandidatePoolsByOperation] = useState<Record<string, string[]>>({});
  const [quantidadeObjetivoInput, setQuantidadeObjetivoInput] = useState("");
  const [numeroOperadoresInput, setNumeroOperadoresInput] = useState("");
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [confirmarCalculoModal, setConfirmarCalculoModal] = useState<{
    open: boolean;
    identificador: string;
  }>({ open: false, identificador: "" });
  const [erroCalculoModal, setErroCalculoModal] = useState<string | null>(null);
  const [resultadosInlineData, setResultadosInlineData] = useState<{
    resultados: ResultadosBalanceamento;
    resultadosPorTipo?: Partial<Record<"linha" | "espinha", ResultadosBalanceamento>>;
    operadores: Operador[];
    operacoes: Operacao[];
    config: ConfiguracaoDistribuicao;
    layoutConfig: LayoutConfig;
    taskCode?: string;
    ajusteBodyBase?: any;
    ajusteBodyBasePorTipo?: Partial<Record<"linha" | "espinha", any>>;
    swapBaseRaw?: any;
    swapBaseRawPorTipo?: Partial<Record<"linha" | "espinha", any>>;
  } | null>(null);
  const resultadosRef = useRef<HTMLDivElement | null>(null);
  const [resultadosAtuaisInline, setResultadosAtuaisInline] = useState<ResultadosBalanceamento | null>(null);
  const [resultadosPorTipoInline, setResultadosPorTipoInline] = useState<Partial<Record<"linha" | "espinha", ResultadosBalanceamento>>>({});
  const [configAtualInline, setConfigAtualInline] = useState<ConfiguracaoDistribuicao | null>(null);
  const [viewModeInline, setViewModeInline] = useState<"tempo" | "percentagem" | "ole">("tempo");
  const [ajusteBodyBaseInline, setAjusteBodyBaseInline] = useState<any>(null);
  const [ajusteBodyBasePorTipoInline, setAjusteBodyBasePorTipoInline] = useState<Partial<Record<"linha" | "espinha", any>>>({});
  const [swapBaseRawInline, setSwapBaseRawInline] = useState<any>(null);
  const [swapBaseRawPorTipoInline, setSwapBaseRawPorTipoInline] = useState<Partial<Record<"linha" | "espinha", any>>>({});
  const [exportPdfBodyInline, setExportPdfBodyInline] = useState<any>(null);
  const [taskCodeInline, setTaskCodeInline] = useState<string>("");
  const [temAdjustInline, setTemAdjustInline] = useState(false);
  const autoRecalcularLayoutRef = useRef(false);
  const suppressResultadosScrollRef = useRef(false);
  const [isAjustando, setIsAjustando] = useState(false);
  const [isGuardandoHistorico, setIsGuardandoHistorico] = useState(false);
  const [erroPopupInline, setErroPopupInline] = useState<string | null>(null);
  const [sucessoPopupInline, setSucessoPopupInline] = useState<string | null>(null);
  const [idealCollaborators, setIdealCollaborators] = useState<any[]>([]);
  const [idealCollaboratorsLoading, setIdealCollaboratorsLoading] = useState(false);
  const [idealAssignmentColumn, setIdealAssignmentColumn] = useState<string | null>(null);
  const [idealCollaboratorSearch, setIdealCollaboratorSearch] = useState("");
  const [idealOleDetails, setIdealOleDetails] = useState<Record<string, { media?: number; operacoes: Array<{ id: string; nome?: string; ole?: number }> }>>({});
  const [idealOleExpanded, setIdealOleExpanded] = useState<Record<string, boolean>>({});
  const [idealOleDetailsCollaborator, setIdealOleDetailsCollaborator] = useState<{ id: string; name: string } | null>(null);
  const [idealOperationsByVirtual, setIdealOperationsByVirtual] = useState<Record<string, string[]>>({});

  const getMaxPostsPayloadInline = useCallback((nextLayoutConfig: LayoutConfig) => {
    const postosInputEl = document.getElementById("lc-postos") as HTMLInputElement | null;
    const postosInputRaw = postosInputEl?.value?.trim() || "";
    const postosInputNum = postosInputRaw ? Number(postosInputRaw.replace(",", ".")) : Number.NaN;
    const postosBase = Number.isFinite(postosInputNum)
      ? postosInputNum
      : Number(nextLayoutConfig.postosPorLado);
    const postosPorLado = Math.max(1, Math.round(postosBase || 0));
    return nextLayoutConfig.tipoLayout === "espinha" ? postosPorLado * 2 : postosPorLado;
  }, []);

  useEffect(() => {
    if (sincronizado) return;
    const conf = dados.configuracao;
    const ops = dados.operadores;
    if (!conf.grupoArtigoSelecionado && !conf.dadosUnidades && ops.length === 0) return;
    setSincronizado(true);

    if (conf.grupoArtigoSelecionado) setGrupoArtigoSelecionado(conf.grupoArtigoSelecionado);
    if (conf.operacoesManual?.length) setOperacoesManual(conf.operacoesManual);
    if (conf.layoutConfig) setLayoutConfig(normalizarLayoutConfig(conf.layoutConfig));

    const g = conf.dadosUnidades;
    // Actualizar operadores master nas unidades quando o contexto carrega
    setDadosUnidades((prev) => ({
      1: {
        ...prev[1],
        operadores: ops,
        config: g?.["1"]?.config ? { ...configPadrao, ...g["1"].config } : prev[1].config,
        operadoresSelecionados: g?.["1"]?.operadoresSelecionados ?? ops.map((o) => o.id),
        atribuicoesManual: g?.["1"]?.atribuicoesManual || {},
      },
      2: {
        ...prev[2],
        operadores: ops,
        config: g?.["2"]?.config ? { ...configPadrao, ...g["2"].config } : prev[2].config,
        operadoresSelecionados: g?.["2"]?.operadoresSelecionados ?? ops.map((o) => o.id),
        atribuicoesManual: g?.["2"]?.atribuicoesManual || {},
      },
      3: {
        ...prev[3],
        operadores: ops,
        config: g?.["3"]?.config ? { ...configPadrao, ...g["3"].config } : prev[3].config,
        operadoresSelecionados: g?.["3"]?.operadoresSelecionados ?? ops.map((o) => o.id),
        atribuicoesManual: g?.["3"]?.atribuicoesManual || {},
      },
    }));
  }, [dados, sincronizado]);

  // Quando a lista de operadores no contexto muda (ex: apagar em Configuracao),
  // actualizar as unidades para reflectir a mudanca
  useEffect(() => {
    const ops = dados.operadores;
    setDadosUnidades((prev) => ({
      1: { ...prev[1], operadores: ops, operadoresSelecionados: prev[1].operadoresSelecionados.filter((id) => ops.some((o) => o.id === id)) },
      2: { ...prev[2], operadores: ops, operadoresSelecionados: prev[2].operadoresSelecionados.filter((id) => ops.some((o) => o.id === id)) },
      3: { ...prev[3], operadores: ops, operadoresSelecionados: prev[3].operadoresSelecionados.filter((id) => ops.some((o) => o.id === id)) },
    }));
  }, [dados.operadores]);

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Auto-save em cada mudanca de estado ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

  const guardarConfiguracaoAtual = useCallback(() => {
    salvar({
      configuracao: {
        grupoArtigoSelecionado,
        operacoesManual,
        layoutConfig,
        dadosUnidades: {
          "1": {
            config: dadosUnidades[1].config,
            operadoresSelecionados: dadosUnidades[1].operadoresSelecionados,
            atribuicoesManual: dadosUnidades[1].atribuicoesManual,
          },
          "2": {
            config: dadosUnidades[2].config,
            operadoresSelecionados: dadosUnidades[2].operadoresSelecionados,
            atribuicoesManual: dadosUnidades[2].atribuicoesManual,
          },
          "3": {
            config: dadosUnidades[3].config,
            operadoresSelecionados: dadosUnidades[3].operadoresSelecionados,
            atribuicoesManual: dadosUnidades[3].atribuicoesManual,
          },
        },
      },
    });
  }, [grupoArtigoSelecionado, operacoesManual, layoutConfig, dadosUnidades, salvar]);

  useEffect(() => {
    guardarConfiguracaoAtual();
  }, [guardarConfiguracaoAtual]);

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Load families from API ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  useEffect(() => {
    const carregarFamilias = async () => {
      setLoadingFamilias(true);
      setErroApi(null);
      try {
        const resposta = await axios.get(`${API_BASE_URL}/families/`);
        const families = ensureArray(resposta.data).map((family, index) => {
          const id = pickString(family, ["family_id","id","code","reference"]) || `FAM${String(index + 1).padStart(3, "0")}`;
          const name = pickString(family, ["family_name","name","nome"]) || id;
          const reference = pickString(family, ["reference","referencia"]);
          return { id, label: reference ? `${name} (${reference})` : name };
        });
        if (families.length === 0) throw new Error("Sem familias");
        setFamilias(families);
        setGrupoArtigoSelecionado((current) =>
          current && families.some((family) => family.id === current)
            ? current
            : families[0].id
        );
      } catch (error) {
        console.error("Erro ao carregar familias:", error);
        setErroApi("Nao foi possivel carregar familias da API.");
        setFamilias([]);
        setGrupoArtigoSelecionado("");
        setProdutosApi([]);
        setProdutoSelecionado(null);
      } finally {
        setLoadingFamilias(false);
      }
    };
    carregarFamilias();
  }, []);

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Load technical sheets for selected family ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  useEffect(() => {
    if (!grupoArtigoSelecionado) {
      setProdutosApi([]);
      setProdutoSelecionado(null);
      return;
    }
    const carregarFichas = async () => {
      setLoadingFichas(true);
      setErroApi(null);
      try {
        const resposta = await axios.get(`${API_BASE_URL}/technical-sheets/family/${encodeURIComponent(grupoArtigoSelecionado)}`);
        const technicalSheets = ensureArray(resposta.data);
        const fichas = technicalSheets.map((sheet, index) => mapApiTaskToProduto(sheet, index, grupoArtigoSelecionado));
        setProdutosApi(fichas);
        const fichaGuardada = dados.configuracao.fichaTecnicaSelecionada;
        const fichaGuardadaPertenceAFamilia = fichaGuardada?.grupoArtigoId === grupoArtigoSelecionado;
        const proximoSelecionado =
          (fichaGuardadaPertenceAFamilia && fichas.some((f) => f.id === fichaGuardada?.fichaId)
            ? fichaGuardada?.fichaId
            : produtoSelecionado && fichas.some((f) => f.id === produtoSelecionado)
              ? produtoSelecionado
              : fichas[0]?.id) || null;
        setProdutoSelecionado(proximoSelecionado);
        if (proximoSelecionado) {
          void salvar({
            configuracao: {
              fichaTecnicaSelecionada: {
                grupoArtigoId: grupoArtigoSelecionado,
                fichaId: proximoSelecionado,
              },
            },
          });
        }
      } catch (error) {
        console.error("Erro ao carregar fichas da familia:", error);
        setErroApi("Nao foi possivel carregar fichas tecnicas da familia selecionada.");
        setProdutosApi([]);
        setProdutoSelecionado(null);
      } finally {
        setLoadingFichas(false);
      }
    };
    carregarFichas();
  }, [grupoArtigoSelecionado]);

  const handleSelecionarFicha = (produtoId: string) => {
    setProdutoSelecionado(produtoId);
    void salvar({
      configuracao: {
        fichaTecnicaSelecionada: {
          grupoArtigoId: grupoArtigoSelecionado,
          fichaId: produtoId,
        },
      },
    });
  };

  useEffect(() => {
    const produtoAtual = produtosApi.find((p) => p.id === produtoSelecionado);
    if (!produtoAtual) {
      setCandidatePoolsByOperation({});
      return;
    }

    const carregarCandidatePools = async () => {
      const taskIds = Array.from(
        new Set([produtoAtual.id, produtoAtual.referencia].map((value) => value?.trim()).filter(Boolean))
      ) as string[];

      if (taskIds.length === 0) {
        setCandidatePoolsByOperation({});
        return;
      }

      let mapped: Record<string, string[]> = {};

      for (const taskId of taskIds) {
        try {
          const resposta = await axios.get(
            `${API_BASE_URL}/technical-sheets/${encodeURIComponent(taskId)}/candidate-pools`
          );
          const responseData = resposta.data;
          if (!responseData || typeof responseData !== "object") continue;

          const responseRecord = coerceCandidatePoolsObject(responseData, produtoAtual.operacoes);
          if (!responseRecord) continue;

          const candidatePools = extractCandidatePoolsForProduto(responseRecord, produtoAtual);
          if (!candidatePools) continue;

          const parsed = mapOperationCandidatesToManual(candidatePools, produtoAtual.operacoes);
          mapped = Object.fromEntries(
            Object.entries(parsed).map(([operacaoId, operatorIds]) => [
              operacaoId,
              Array.from(
                new Set(
                  operatorIds.map((operatorId) => mapOperatorToCode(String(operatorId), dados.operadores))
                )
              ),
            ])
          );
          if (Object.keys(mapped).length > 0) break;
        } catch {
          // tenta proximo task_id
        }
      }

      setCandidatePoolsByOperation(mapped);
    };

    void carregarCandidatePools();
  }, [produtoSelecionado, produtosApi, dados.operadores]);

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Atalhos ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

  const operadores = dadosUnidades[unidadeAtiva].operadores;
  const operadoresSelecionados = dadosUnidades[unidadeAtiva].operadoresSelecionados;
  const atribuicoesManual = dadosUnidades[unidadeAtiva].atribuicoesManual;
  const config = dadosUnidades[unidadeAtiva].config;

  const produto = produtosApi.find((p) => p.id === produtoSelecionado);
  const operacoes = config.possibilidade === 4
    ? operacoesManual
    : (produto ? produto.operacoes : []);
  const usarAllocateModo1Api = config.possibilidade === 1;
  const usarAllocateIdealApi = config.possibilidade === 5;
  const usarAllocateObjetivoApi = config.possibilidade === 2;
  const usarAllocateNumeroOperadoresApi = config.possibilidade === 3;
  const taskCodeSelecionado = (produto?.referencia || produto?.id || grupoArtigoSelecionado || "").trim();

  useEffect(() => {
    setQuantidadeObjetivoInput(
      config.quantidadeObjetivo != null && Number.isFinite(config.quantidadeObjetivo)
        ? String(config.quantidadeObjetivo)
        : ""
    );
  }, [config.quantidadeObjetivo]);

  useEffect(() => {
    setNumeroOperadoresInput(
      config.numeroOperadores != null && Number.isFinite(config.numeroOperadores)
        ? String(config.numeroOperadores)
        : ""
    );
  }, [config.numeroOperadores]);

  useEffect(() => {
    if (config.possibilidade !== 3) return;
    if (config.numeroOperadores != null && Number.isFinite(config.numeroOperadores) && config.numeroOperadores >= 1) return;
    const disponiveis = Math.max(1, operadores.length || 1);
    const sugerido = Math.max(1, Math.min(operadoresSelecionados.length || disponiveis, disponiveis));
    setDadosUnidades((prev) => ({
      ...prev,
      [unidadeAtiva]: {
        ...prev[unidadeAtiva],
        config: {
          ...prev[unidadeAtiva].config,
          numeroOperadores: sugerido,
        },
      },
    }));
  }, [config.possibilidade, config.numeroOperadores, operadores.length, operadoresSelecionados.length, unidadeAtiva]);

  // Sincroniza operadores com a ficha tecnica activa (quando muda de ficha/operacoes)
  useEffect(() => {
    if (config.possibilidade === 4 || config.possibilidade === 5 || !produto || operacoes.length === 0 || operadores.length === 0) return;

    const nomesOperacoes = new Set(
      operacoes
        .map((op) => op.nome?.trim())
        .filter((nome): nome is string => Boolean(nome))
    );
    if (nomesOperacoes.size === 0) return;

    const operadoresCapazes = operadores
      .filter((operador) =>
        Object.values(operador.competencias || {}).some(
          (comp) => comp && comp.operacao && nomesOperacoes.has(comp.operacao)
        )
      )
      .map((operador) => operador.id);

    const novosSelecionados = operadoresCapazes.length > 0
      ? operadoresCapazes
      : operadores.map((operador) => operador.id);

    setDadosUnidades((prev) => {
      const unidadeAtual = prev[unidadeAtiva];
      const atuais = new Set(unidadeAtual.operadoresSelecionados);
      const novos = new Set(novosSelecionados);
      const iguais = atuais.size === novos.size && [...novos].every((id) => atuais.has(id));
      if (iguais) return prev;

      return {
        ...prev,
        [unidadeAtiva]: {
          ...unidadeAtual,
          operadoresSelecionados: novosSelecionados,
          config:
            unidadeAtual.config.possibilidade === 3
              ? {
                  ...unidadeAtual.config,
                  numeroOperadores: Math.min(
                    unidadeAtual.config.numeroOperadores || novosSelecionados.length,
                    novosSelecionados.length
                  ),
                }
              : unidadeAtual.config,
        },
      };
    });
  }, [config.possibilidade, operacoes, operadores, produto, unidadeAtiva]);

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Handlers ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

  const handleToggleOperador = (id: string) => {
    setDadosUnidades((prev) => ({
      ...prev,
      [unidadeAtiva]: {
        ...prev[unidadeAtiva],
        operadoresSelecionados: prev[unidadeAtiva].operadoresSelecionados.includes(id)
          ? prev[unidadeAtiva].operadoresSelecionados.filter((opId) => opId !== id)
          : [...prev[unidadeAtiva].operadoresSelecionados, id],
      },
    }));
  };

  const handleConfigChange = (newConfig: ConfiguracaoDistribuicao) => {
    setDadosUnidades((prev) => ({
      ...prev,
      [unidadeAtiva]: {
        ...prev[unidadeAtiva],
        config: newConfig,
      },
    }));
  };

  const handleCalcularOperadoresNecessarios = (quantidadeObjetivo: number) => {
    const tempoTotalCiclo = operacoes.reduce((sum, op) => sum + op.tempo, 0);
    const minutosDisponiveis = 480;
    const tempoNecessarioTotal = tempoTotalCiclo * quantidadeObjetivo;
    const operadoresNecessarios = Math.ceil(tempoNecessarioTotal / minutosDisponiveis);
    const operadoresAUtilizar = Math.min(operadoresNecessarios, operadores.length);

    const novosOperadoresSelecionados = operadores
      .slice(0, operadoresAUtilizar)
      .map((op) => op.id);

    setDadosUnidades((prev) => ({
      ...prev,
      [unidadeAtiva]: {
        ...prev[unidadeAtiva],
        operadoresSelecionados: novosOperadoresSelecionados,
      },
    }));
  };

  const handleAtribuirManualmente = (operacaoId: string, operadorIds: string[]) => {
    setDadosUnidades((prev) => ({
      ...prev,
      [unidadeAtiva]: {
        ...prev[unidadeAtiva],
        atribuicoesManual: {
          ...prev[unidadeAtiva].atribuicoesManual,
          [operacaoId]: operadorIds,
        },
      },
    }));
  };

  // ─── Helpers para resultados inline (espelham Resultados.tsx) ──────────────

  const resolveMachineLayoutInline = (raw: any): any[] => {
    const arr =
      raw?.machine_layout ??
      raw?.machineLayout ??
      raw?.layouts?.linha ??
      raw?.layouts?.espinha ??
      raw?.layout_machines ??
      raw?.machine_positions ??
      raw?.machines_layout;
    if (Array.isArray(arr)) return arr;
    if (arr && typeof arr === "object") {
      const nested = Object.values(arr as Record<string, unknown>).find((v) => Array.isArray(v));
      if (Array.isArray(nested)) return nested as any[];
    }
    return [];
  };

  const normalizeLayoutSideInline = (value: unknown): "A" | "B" | "" => {
    const key = String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

    if (!key) return "";
    if (["a", "ladoa", "sidea", "top", "upper"].includes(key)) return "A";
    if (["b", "ladob", "sideb", "bottom", "lower"].includes(key)) return "B";
    return "";
  };

  const enrichLayoutPositionInline = (value: any, sideHint: "A" | "B" | ""): any => {
    if (!sideHint || value == null) return value;
    if (Array.isArray(value)) return value.map((entry) => enrichLayoutPositionInline(entry, sideHint));
    if (typeof value !== "object") return value;

    const currentSide = normalizeLayoutSideInline(
      (value as any)?.position_side ??
      (value as any)?.side
    );

    const enriched: any = {
      ...value,
      ...(currentSide ? {} : { position_side: sideHint }),
    };

    if (enriched.primary_position) {
      enriched.primary_position = enrichLayoutPositionInline(enriched.primary_position, sideHint);
    }
    if (enriched.main_position) {
      enriched.main_position = enrichLayoutPositionInline(enriched.main_position, sideHint);
    }
    if (Array.isArray(enriched.other_positions)) {
      enriched.other_positions = enriched.other_positions.map((pos: any) => enrichLayoutPositionInline(pos, sideHint));
    }
    if (Array.isArray(enriched.secondary_positions)) {
      enriched.secondary_positions = enriched.secondary_positions.map((pos: any) => enrichLayoutPositionInline(pos, sideHint));
    }
    if (Array.isArray(enriched.positions)) {
      enriched.positions = enriched.positions.map((pos: any) => enrichLayoutPositionInline(pos, sideHint));
    }
    if (Array.isArray(enriched.operators)) {
      enriched.operators = enriched.operators.map((operator: any) => enrichLayoutPositionInline(operator, sideHint));
    }
    if (Array.isArray(enriched.operator_allocations)) {
      enriched.operator_allocations = enriched.operator_allocations.map((operator: any) => enrichLayoutPositionInline(operator, sideHint));
    }
    if (enriched.operator_positions && typeof enriched.operator_positions === "object") {
      enriched.operator_positions = Object.fromEntries(
        Object.entries(enriched.operator_positions).map(([key, pos]) => [key, enrichLayoutPositionInline(pos, sideHint)])
      );
    }

    return enriched;
  };

  const flattenLayoutRowsInline = (value: unknown, sideHint: "A" | "B" | "" = ""): any[] => {
    if (Array.isArray(value)) {
      return value.flatMap((entry) => flattenLayoutRowsInline(entry, sideHint));
    }

    if (!value || typeof value !== "object") return [];

    const record = value as Record<string, unknown>;
    const looksLikeLayoutRow = [
      "position_label",
      "position_number",
      "primary_post_label",
      "machine_name",
      "machine_type",
      "machine",
      "operators",
      "operator_allocations",
      "operator_positions",
    ].some((key) => key in record);

    if (looksLikeLayoutRow) {
      return [enrichLayoutPositionInline(record, sideHint)];
    }

    const entries = Object.entries(record);
    const nestedArrays = entries.filter(([, nested]) => Array.isArray(nested));

    if (nestedArrays.length > 0) {
      return nestedArrays.flatMap(([key, nested]) =>
        flattenLayoutRowsInline(nested, normalizeLayoutSideInline(key) || sideHint)
      );
    }

    const nestedObjects = entries.filter(([, nested]) => nested && typeof nested === "object");
    if (nestedObjects.length > 0) {
      return nestedObjects.flatMap(([key, nested]) =>
        flattenLayoutRowsInline(nested, normalizeLayoutSideInline(key) || sideHint)
      );
    }

    return [enrichLayoutPositionInline(record, sideHint)];
  };

  const resolveMachineLayoutPorTipoInline = (raw: any, tipoLayout: "linha" | "espinha"): any[] => {
    // A API nova devolve os dados por tipo dentro de `espinha`/`linha`.
    // Mantemos também o formato antigo, onde estes campos estão na raiz.
    const typedResponse =
      raw?.[tipoLayout] ??
      (tipoLayout === "espinha" ? raw?.spine ?? raw?.fishbone ?? raw?.backbone : raw?.line ?? raw?.linear ?? raw?.row);
    const layoutsRoot =
      raw?.layouts ??
      raw?.machine_layouts ??
      raw?.machineLayouts ??
      raw?.layouts_by_type;

    if (layoutsRoot && typeof layoutsRoot === "object" && !Array.isArray(layoutsRoot)) {
      const typedLayout =
        (layoutsRoot as Record<string, unknown>)[tipoLayout] ??
        (tipoLayout === "linha"
          ? (layoutsRoot as Record<string, unknown>)["line"] ?? (layoutsRoot as Record<string, unknown>)["linear"] ?? (layoutsRoot as Record<string, unknown>)["row"]
          : (layoutsRoot as Record<string, unknown>)["spine"] ?? (layoutsRoot as Record<string, unknown>)["fishbone"] ?? (layoutsRoot as Record<string, unknown>)["backbone"]);

      const directKeys = tipoLayout === "linha"
        ? ["linha", "line", "linear", "row"]
        : ["espinha", "spine", "fishbone", "backbone"];

      const directFlattened = flattenLayoutRowsInline(typedLayout, "");
      if (directFlattened.length > 0) return directFlattened;

      for (const key of directKeys) {
        const direct = (layoutsRoot as Record<string, unknown>)[key];
        const flattened = flattenLayoutRowsInline(direct, tipoLayout === "espinha" ? normalizeLayoutSideInline(key) : "");
        if (flattened.length > 0) return flattened;
      }
    }

    const source =
      layoutsRoot ??
      typedResponse?.machine_layout ??
      typedResponse?.machineLayout ??
      raw?.machine_layout ??
      raw?.machineLayout ??
      raw?.layout_machines ??
      raw?.machine_positions ??
      raw?.machines_layout;

    if (Array.isArray(source)) return source;
    if (!source || typeof source !== "object") return [];

    const normalize = (value: unknown) =>
      String(value ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");

    const preferredKeys = tipoLayout === "linha"
      ? ["linha", "line", "linear", "row"]
      : ["espinha", "spine", "fishbone", "backbone"];

    const looksLikeEspinhaLayout = (rows: any[]): boolean =>
      rows.some((row) => {
        const side = String(row?.position_side ?? row?.side ?? "").trim().toUpperCase();
        const label = String(row?.position_label ?? row?.primary_post_label ?? row?.position ?? "").trim().toUpperCase();
        if (side === "B") return true;
        if (label.startsWith("B")) return true;

        const operators = Array.isArray(row?.operators)
          ? row.operators
          : Array.isArray(row?.operator_allocations)
            ? row.operator_allocations
            : [];

        return operators.some((operator: any) => {
          const primary = operator?.primary_position ?? operator?.main_position ?? operator?.position ?? operator?.position_label;
          const primarySide = String(primary?.position_side ?? operator?.position_side ?? "").trim().toUpperCase();
          const primaryLabel = String(primary?.position_label ?? primary ?? "").trim().toUpperCase();
          if (primarySide === "B" || primaryLabel.startsWith("B")) return true;

          const otherPositions = Array.isArray(operator?.other_positions)
            ? operator.other_positions
            : Array.isArray(operator?.secondary_positions)
              ? operator.secondary_positions
              : Array.isArray(operator?.positions)
                ? operator.positions
                : [];

          return otherPositions.some((pos: any) => {
            const posSide = String(pos?.position_side ?? pos?.side ?? "").trim().toUpperCase();
            const posLabel = String(pos?.position_label ?? pos ?? "").trim().toUpperCase();
            return posSide === "B" || posLabel.startsWith("B");
          });
        });
      });

    const collectArrayCandidates = (
      value: unknown,
      path: string[] = [],
      acc: Array<{ path: string[]; rows: any[] }> = []
    ) => {
      if (Array.isArray(value)) {
        acc.push({ path, rows: value });
        return acc;
      }
      if (!value || typeof value !== "object") return acc;
      Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
        collectArrayCandidates(nested, [...path, key], acc);
      });
      return acc;
    };

    const candidates = collectArrayCandidates(source);
    const scored = candidates.map((candidate) => {
      const pathScore = candidate.path.some((segment) => preferredKeys.includes(normalize(segment))) ? 2 : 0;
      const espinhaScore = looksLikeEspinhaLayout(candidate.rows) ? 4 : 0;
      return {
        ...candidate,
        score: pathScore + (tipoLayout === "espinha" ? espinhaScore : 0),
      };
    });

    if (tipoLayout === "espinha") {
      const espinha = scored
        .filter((candidate) => looksLikeEspinhaLayout(candidate.rows))
        .sort((a, b) => b.score - a.score)[0];
      if (espinha) return espinha.rows;
      return [];
    }

    const preferred = scored.sort((a, b) => b.score - a.score)[0];
    if (preferred) return preferred.rows;
    return resolveMachineLayoutInline(raw);
  };

  const parseNumberLikeInline = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const n = Number(value.trim().replace(",", "."));
      if (Number.isFinite(n)) return n;
    }
    return null;
  };

  const buildDistribuicaoFromAllocationsInline = useCallback((
    operationAllocations: any[],
    tempoCicloMin: number,
    sharePerOperatorSeconds: Record<string, unknown> | null,
    sharePerOperatorScalar: number | null
  ): any[] => {
    const byOperator: Record<string, { operacoes: Set<string>; segundos: number; temposOperacoes: Record<string, number> }> = {};
    const processOperatorTime = (operatorRef: unknown, opCode: string, secondsRaw: unknown) => {
      const normalizedOperatorRef = String(operatorRef || "").trim();
      const seconds = parseNumberLikeInline(secondsRaw) ?? 0;
      if (!normalizedOperatorRef || seconds <= 0) return;
      if (!byOperator[normalizedOperatorRef]) byOperator[normalizedOperatorRef] = { operacoes: new Set<string>(), segundos: 0, temposOperacoes: {} };
      if (opCode) byOperator[normalizedOperatorRef].operacoes.add(opCode);
      byOperator[normalizedOperatorRef].segundos += seconds;
      if (opCode) byOperator[normalizedOperatorRef].temposOperacoes[opCode] = (byOperator[normalizedOperatorRef].temposOperacoes[opCode] || 0) + seconds / 60;
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
      let denominatorSeconds = tempoCicloMin > 0 ? tempoCicloMin * 60 : 0;
      if (sharePerOperatorSeconds) {
        const normalizedOperatorId = normalizeKey(String(operadorId || ""));
        for (const [rawKey, rawValue] of Object.entries(sharePerOperatorSeconds)) {
          if (normalizeKey(rawKey) !== normalizedOperatorId) continue;
          const parsed = parseNumberLikeInline(rawValue);
          if (parsed != null && parsed > 0) {
            denominatorSeconds = parsed;
            break;
          }
        }
      } else if (sharePerOperatorScalar != null && sharePerOperatorScalar > 0) {
        denominatorSeconds = sharePerOperatorScalar;
      }
      return {
        operadorId,
        operacoes: ordenarOperacoesPelaBase(Array.from(dados.operacoes), operacoes),
        cargaHoraria,
        ocupacao: denominatorSeconds > 0 ? (dados.segundos / denominatorSeconds) * 100 : 0,
        ciclosPorHora: cargaHoraria > 0 ? 60 / cargaHoraria : 0,
        temposOperacoes: dados.temposOperacoes,
      };
    });
  }, []);

  const buildTableDataFromDistribuicaoInline = useCallback((distribuicao: any[]) => {
    return distribuicao.map((dist: any) => ({
      operator: String(dist?.operadorId ?? dist?.operator_id ?? dist?.operator ?? "").trim(),
      occupancy: parseNumberLikeInline(dist?.ocupacao) ?? 0,
      load_minutes: parseNumberLikeInline(dist?.cargaHoraria) ?? 0,
      cycles_per_hour: parseNumberLikeInline(dist?.ciclosPorHora) ?? 0,
    })).filter((row: any) => row.operator);
  }, []);

  const buildSharePerOperatorSecondsInline = useCallback((distribuicao: any[], cycleTimeSeconds: number) => {
    if (cycleTimeSeconds <= 0) return null;
    const perOperator: Record<string, number> = {};
    distribuicao.forEach((dist: any) => {
      const operatorId = String(dist?.operadorId ?? dist?.operator_id ?? dist?.operator ?? "").trim();
      if (!operatorId) return;
      perOperator[operatorId] = cycleTimeSeconds;
    });
    return Object.keys(perOperator).length > 0 ? perOperator : null;
  }, []);

  const normalizeOperatorSlotsInline = useCallback((rawSlots: unknown): any[] => {
    return ensureArray(rawSlots)
      .map((slot) => ({
        ...(slot || {}),
        operator_id: pickString(slot, ["operator_id", "operator_code", "operador_id", "operator"]) || "",
        operator_name: pickString(slot, ["operator_name", "name", "nome"]) || "",
        position_number: parseNumberLikeInline((slot as any)?.position_number),
        position_label: pickString(slot, ["position_label", "label", "posto"]) || "",
        position_side: pickString(slot, ["position_side", "side", "lado"]) || "",
      }))
      .filter((slot) => slot.operator_id)
      .sort((a, b) => {
        const aPos = Number.isFinite(a.position_number) ? a.position_number : Number.MAX_SAFE_INTEGER;
        const bPos = Number.isFinite(b.position_number) ? b.position_number : Number.MAX_SAFE_INTEGER;
        if (aPos !== bPos) return aPos - bPos;
        return String(a.operator_id).localeCompare(String(b.operator_id));
      });
  }, []);

  const pickKpiInline = useCallback((
    raw: any,
    topLevelKeys: string[],
    nestedKpiKeys: string[] = topLevelKeys,
    options?: { preferNested?: boolean }
  ): number | null => {
    const kpis = raw?.kpis && typeof raw.kpis === "object" ? raw.kpis : null;
    const nested = kpis
      ? parseNumberLikeInline(nestedKpiKeys.map((key) => kpis?.[key]).find((value) => value != null))
      : null;
    const direct = parseNumberLikeInline(topLevelKeys.map((key) => raw?.[key]).find((value) => value != null));
    if (options?.preferNested) return nested ?? direct;
    return direct ?? nested;
  }, []);

  const buildResultadosFromApiInline = useCallback((raw: any, currentResultados: ResultadosBalanceamento): ResultadosBalanceamento => {
    const nextOperationAllocations = ensureArray(raw?.operation_allocations ?? raw?.operationAllocations);
    const operationAllocations =
      nextOperationAllocations.length > 0
        ? nextOperationAllocations
        : ensureArray(currentResultados?.operation_allocations);
    const machinesUsed = raw?.machines_used && typeof raw.machines_used === "object" ? raw.machines_used : null;
    const taktSeconds = parseNumberLikeInline(raw?.takt_time_seconds ?? raw?.takt_time ?? raw?.taktTime) ?? 0;
    const cycleTimeSeconds =
      pickKpiInline(
        raw,
        ["real_cycle_time_seconds", "cycle_time_seconds", "cycle_time", "tempo_ciclo_segundos"],
        ["cycle_time_seconds"],
        { preferNested: true }
      ) ?? 0;
    const cicloApi = cycleTimeSeconds;
    const tempoCiclo = cicloApi > 10 ? cicloApi / 60 : cicloApi;
    const produtividadeRaw =
      pickKpiInline(
        raw,
        ["estimated_productivity", "productivity", "produtividade_estimada"],
        ["productivity_pct", "estimated_productivity"],
        { preferNested: true }
      ) ?? (currentResultados.produtividade ?? 0);
    const produtividade = produtividadeRaw <= 1 ? produtividadeRaw * 100 : produtividadeRaw;
    const distribuicaoFromApi = ensureArray(raw?.distribuicao ?? raw?.distribution);
    const rawSharePerOperatorSeconds = raw?.share_per_operator_seconds ?? raw?.sharePerOperatorSeconds;
    const rawSharePerOperatorSecondsMap =
      rawSharePerOperatorSeconds && typeof rawSharePerOperatorSeconds === "object"
        ? (rawSharePerOperatorSeconds as Record<string, unknown>)
        : null;
    const rawSharePerOperatorSecondsScalar =
      typeof rawSharePerOperatorSeconds === "number"
        ? rawSharePerOperatorSeconds
        : typeof rawSharePerOperatorSeconds === "string"
          ? parseNumberLikeInline(rawSharePerOperatorSeconds)
          : null;
    const distribuicao =
      distribuicaoFromApi.length > 0
        ? distribuicaoFromApi
        : operationAllocations.length > 0
          ? buildDistribuicaoFromAllocationsInline(
              operationAllocations,
              tempoCiclo,
              rawSharePerOperatorSecondsMap,
              rawSharePerOperatorSecondsScalar
            )
          : currentResultados.distribuicao;
    const derivedTableData = buildTableDataFromDistribuicaoInline(distribuicao);
    const derivedSharePerOperatorSeconds = buildSharePerOperatorSecondsInline(distribuicao, cycleTimeSeconds);
    const rawTableData =
      raw?.table_data ?? raw?.tableData ?? raw?.operator_table ?? raw?.operatorTable ?? raw?.results_table;
    const shouldPreferDerivedOperatorMetrics =
      operationAllocations.length > 0 &&
      rawTableData == null &&
      rawSharePerOperatorSeconds == null;
    const numeroCiclosPorHora =
      pickKpiInline(
        raw,
        ["production_per_hour", "numero_ciclos_por_hora"],
        ["cycles_per_hour", "production_per_hour"],
        { preferNested: true }
      ) ?? (tempoCiclo > 0 ? 60 / tempoCiclo : currentResultados.numeroCiclosPorHora);
    const numeroOperadores =
      pickKpiInline(
        raw,
        ["num_operators", "numero_operadores", "numeroOperadores"],
        ["num_operators"],
        { preferNested: true }
      ) ?? distribuicao.length;
    const balanceLoss =
      pickKpiInline(raw, ["balance_loss"], ["balance_loss_pct"], { preferNested: true }) ?? Math.max(0, 100 - produtividade);
    const ocupacaoTotal =
      (parseNumberLikeInline(raw?.occupancy_total ?? raw?.ocupacao_total ?? raw?.total_occupancy ?? raw?.total_load) ??
        distribuicao.reduce((sum: number, d: any) => sum + ((parseNumberLikeInline(d?.cargaHoraria) ?? 0) * 60), 0)) || 0;
    const derivedKpis = {
      cycle_time_seconds: cycleTimeSeconds || undefined,
      cycles_per_hour: numeroCiclosPorHora || 0,
      production_per_hour: numeroCiclosPorHora || 0,
      productivity_pct: produtividade,
      estimated_productivity: produtividade,
      balance_loss_pct: balanceLoss,
      balance_loss: balanceLoss,
      num_operators: numeroOperadores || 0,
      occupancy_total: ocupacaoTotal,
      total_occupancy: ocupacaoTotal,
    };
    const operatorSlotsFromApi = normalizeOperatorSlotsInline(raw?.operator_slots ?? raw?.operatorSlots);
    const operatorSlots =
      operatorSlotsFromApi.length > 0
        ? operatorSlotsFromApi
        : Array.isArray((currentResultados as any)?.operator_slots)
          ? ((currentResultados as any).operator_slots as any[])
          : [];
    const machineLayout = resolveMachineLayoutInline(raw);
    return {
      distribuicao: distribuicao as any,
      espinha: (raw?.espinha ?? (currentResultados as any)?.espinha ?? null) as any,
      layouts: (raw?.layouts ?? (currentResultados as any)?.layouts ?? null) as any,
      operation_allocations: operationAllocations as any,
      share_per_operator_seconds:
        ((shouldPreferDerivedOperatorMetrics
          ? derivedSharePerOperatorSeconds
          : rawSharePerOperatorSeconds) ??
          (shouldPreferDerivedOperatorMetrics
            ? rawSharePerOperatorSeconds
            : derivedSharePerOperatorSeconds) ??
          (currentResultados as any)?.share_per_operator_seconds ??
          null) as any,
      table_data:
        ((shouldPreferDerivedOperatorMetrics
          ? derivedTableData
          : rawTableData) ??
          (shouldPreferDerivedOperatorMetrics
            ? rawTableData
            : derivedTableData) ??
          (currentResultados as any)?.table_data ??
          null) as any,
      machine_layout:
        ((machineLayout.length > 0 ? machineLayout : resolveMachineLayoutInline(currentResultados)) ?? null) as any,
      operator_flow: (raw?.espinha?.operator_flow ?? (currentResultados as any)?.espinha?.operator_flow ?? null) as any,
      machine_times_per_operator:
        ((raw?.machine_times_per_operator ?? raw?.machineTimesPerOperator) ??
          (currentResultados as any)?.machine_times_per_operator ??
          null) as any,
      operator_slots: operatorSlots as any,
      kpis: ({ ...derivedKpis, ...(((raw?.kpis ?? null) && typeof raw?.kpis === "object") ? raw.kpis : {}) }) as any,
      machines_used: ((machinesUsed ?? (currentResultados as any)?.machines_used) ?? null) as any,
      required: ((machinesUsed?.required ?? raw?.required ?? (currentResultados as any)?.required) ?? null) as any,
      overall_avg_time_seconds:
        parseNumberLikeInline(machinesUsed?.overall_avg_time_seconds ?? raw?.overall_avg_time_seconds) ??
        currentResultados.overall_avg_time_seconds,
      taktTime: taktSeconds / 60,
      tempoCiclo,
      cycle_time_seconds: cycleTimeSeconds || undefined,
      balance_loss: balanceLoss,
      production_per_hour: numeroCiclosPorHora || 0,
      estimated_productivity: produtividade,
      numeroCiclosPorHora: numeroCiclosPorHora || 0,
      produtividade,
      perdas: balanceLoss,
      numeroOperadores: numeroOperadores || 0,
      ocupacaoTotal,
    };
  }, [buildDistribuicaoFromAllocationsInline, buildSharePerOperatorSecondsInline, buildTableDataFromDistribuicaoInline, normalizeOperatorSlotsInline, pickKpiInline]);

  const resolveSharePerOperatorSecondsInline = useCallback((
    operatorRef: string,
    sharePerOperatorSeconds: Record<string, unknown> | null,
    sharePerOperatorScalar: number | null,
    fallbackSeconds: number
  ) => {
    if (sharePerOperatorSeconds) {
      const normalizedOperatorRef = normalizeKey(String(operatorRef || ""));
      for (const [rawKey, rawValue] of Object.entries(sharePerOperatorSeconds)) {
        if (normalizeKey(rawKey) !== normalizedOperatorRef) continue;
        const parsed = parseNumberLikeInline(rawValue);
        if (parsed != null && parsed > 0) return parsed;
      }
    }

    if (sharePerOperatorScalar != null && sharePerOperatorScalar > 0) {
      return sharePerOperatorScalar;
    }

    return fallbackSeconds;
  }, []);

  const buildOccupancyPercentagesInline = useCallback((
    operatorTimes: Record<string, number>,
    sharePerOperatorSeconds: Record<string, unknown> | null,
    sharePerOperatorScalar: number | null,
    fallbackSeconds: number
  ) => {
    const percentages: Record<string, number> = {};
    Object.entries(operatorTimes).forEach(([operatorRef, secondsRaw]) => {
      const seconds = Math.max(0, parseNumberLikeInline(secondsRaw) ?? 0);
      if (!operatorRef || seconds <= 0) return;
      const denominatorSeconds = resolveSharePerOperatorSecondsInline(
        operatorRef,
        sharePerOperatorSeconds,
        sharePerOperatorScalar,
        fallbackSeconds
      );
      if (denominatorSeconds <= 0) return;
      percentages[operatorRef] = (seconds / denominatorSeconds) * 100;
    });
    return percentages;
  }, [resolveSharePerOperatorSecondsInline]);

  const logAdjustPercentageTraceInline = useCallback((editedRows: any[], requestBody: any, responseBody: any) => {
    const requestRows = ensureArray(
      requestBody?.operation_allocations ?? requestBody?.operationAllocations
    );
    const responseRows = ensureArray(
      responseBody?.operation_allocations ?? responseBody?.operationAllocations
    );

    const buildRowKey = (row: any) => {
      const seq = String(row?.seq ?? "").trim();
      const op = String(row?.operation_code || row?.operation_id || "").trim().toLowerCase().replace(/^0+(\d)/, "$1");
      return `${seq}::${op}`;
    };

    const resolvePercentMap = (row: any): Record<string, number> => {
      const rawMap = row?.occupancy_percentages;
      if (!rawMap || typeof rawMap !== "object") return {};
      const normalized: Record<string, number> = {};
      Object.entries(rawMap as Record<string, unknown>).forEach(([key, value]) => {
        const parsed = parseNumberLikeInline(value);
        if (parsed == null) return;
        normalized[normalizeKey(String(key || ""))] = parsed;
      });
      return normalized;
    };

    const resolveTimeMap = (row: any): Record<string, number> => {
      const rawMap = row?.operator_times;
      if (!rawMap || typeof rawMap !== "object") return {};
      const normalized: Record<string, number> = {};
      Object.entries(rawMap as Record<string, unknown>).forEach(([key, value]) => {
        const parsed = parseNumberLikeInline(value);
        if (parsed == null) return;
        normalized[normalizeKey(String(key || ""))] = parsed;
      });
      return normalized;
    };

    const resolveSharePerOperatorSecondsForTrace = (
      operatorRef: string,
      shareMap: Record<string, unknown> | null,
      shareScalar: number | null,
      fallbackSeconds: number
    ) => {
      if (shareMap) {
        const normalizedOperatorRef = normalizeKey(String(operatorRef || ""));
        for (const [rawKey, rawValue] of Object.entries(shareMap)) {
          if (normalizeKey(rawKey) !== normalizedOperatorRef) continue;
          const parsed = parseNumberLikeInline(rawValue);
          if (parsed != null && parsed > 0) return parsed;
        }
      }

      if (shareScalar != null && shareScalar > 0) return shareScalar;
      return fallbackSeconds;
    };

    const resolveShareContext = (body: any) => {
      const rawShare = body?.share_per_operator_seconds ?? body?.sharePerOperatorSeconds ?? null;
      const shareMap =
        rawShare && typeof rawShare === "object" ? (rawShare as Record<string, unknown>) : null;
      const shareScalar =
        typeof rawShare === "number"
          ? rawShare
          : typeof rawShare === "string"
            ? parseNumberLikeInline(rawShare)
            : null;
      const fallbackSeconds = Math.max(
        0,
        parseNumberLikeInline(
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

    console.groupCollapsed("[AJUSTE][INLINE] Rasto percentagem -> segundos -> resposta");
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
        const requestDenominator = resolveSharePerOperatorSecondsForTrace(
          operatorKey,
          requestShareContext.shareMap,
          requestShareContext.shareScalar,
          requestShareContext.fallbackSeconds
        );
        const responseDenominator = resolveSharePerOperatorSecondsForTrace(
          operatorKey,
          responseShareContext.shareMap,
          responseShareContext.shareScalar,
          responseShareContext.fallbackSeconds
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
  }, []);

  const mergeRowsIntoAdjustBodyInline = (baseBody: any, editedRows: any[]): any => {
    const clone = structuredClone(baseBody);
    const originalRows = ensureArray(clone?.operation_allocations);
    if (originalRows.length === 0) return clone;
    const cycleTimeSecondsBase = Math.max(
      0,
      parseNumberLikeInline(
        clone?.cycle_time_seconds ??
        clone?.real_cycle_time_seconds ??
        clone?.cycle_time ??
        clone?.tempo_ciclo_segundos ??
        clone?.kpis?.cycle_time_seconds
      ) ?? 0
    );
    const normalizeToken = (value: unknown): string => String(value ?? "").trim().toLowerCase().replace(/^0+(\d)/, "$1");
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
      const edited = editedByKey.get(key) || (seq && (editedBySeq.get(seq)?.length || 0) === 1 ? editedBySeq.get(seq)?.[0] : undefined) || (op && (editedByOp.get(op)?.length || 0) === 1 ? editedByOp.get(op)?.[0] : undefined);
      if (!edited) return row;
      const nextRow = { ...row };
      const editedOperatorTimesRaw = edited?.operator_times && typeof edited.operator_times === "object" ? (edited.operator_times as Record<string, unknown>) : null;
      if (editedOperatorTimesRaw) {
        const nextOperatorTimes: Record<string, number> = {};
        Object.entries(editedOperatorTimesRaw).forEach(([operatorRef, secondsRaw]) => {
          const s = Math.max(0, parseNumberLikeInline(secondsRaw) ?? 0);
          if (!operatorRef || s <= 0) return;
          nextOperatorTimes[operatorRef] = s;
        });
        nextRow.operator_times = nextOperatorTimes;
      }
      const fromOperatorTimes = Object.values(nextRow?.operator_times || {}).reduce((sum: number, raw) => sum + Math.max(0, parseNumberLikeInline(raw) ?? 0), 0);
      const totalTimeSeconds = Math.max(
        0,
        (parseNumberLikeInline(edited?.total_time_seconds) ?? parseNumberLikeInline(row?.total_time_seconds) ?? fromOperatorTimes) as number
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
            ? parseNumberLikeInline(sharePerOperatorSecondsRaw)
            : null;
      const occupancyPercentages = buildOccupancyPercentagesInline(
        nextRow.operator_times || {},
        sharePerOperatorSecondsMap,
        sharePerOperatorSecondsScalar,
        cycleTimeSecondsBase > 0 ? cycleTimeSecondsBase : totalTimeSeconds
      );
      nextRow.total_time_seconds = totalTimeSeconds;
      nextRow.allocated_time_seconds = Math.max(0, (parseNumberLikeInline(edited?.allocated_time_seconds) ?? fromOperatorTimes) as number);
      nextRow.remaining_time_seconds = totalTimeSeconds - (parseNumberLikeInline(nextRow.allocated_time_seconds) ?? 0);
      nextRow.occupancy_percentages = occupancyPercentages;
      if (Array.isArray(edited?.operator_allocations)) {
        nextRow.operator_allocations = edited.operator_allocations.map((item: any) => {
          const nextItem = { ...(item || {}), time_seconds: Math.max(0, parseNumberLikeInline(item?.time_seconds) ?? 0) } as any;
          const operatorRef = String(
            nextItem.operator_code ??
            nextItem.operator_id ??
            nextItem.operador_id ??
            nextItem.operator ??
            nextItem.operador ??
            nextItem.code ??
            ""
          ).trim();
          if (operatorRef) {
            const percent = occupancyPercentages[operatorRef];
            if (percent != null) {
              nextItem.occupancy_percentage = percent;
              nextItem.percentage = percent;
              nextItem.percent = percent;
            }
          }
          return nextItem;
        });
      } else if (nextRow?.operator_times) {
        nextRow.operator_allocations = Object.entries(nextRow.operator_times).map(([code, seconds]) => ({
          operator_code: code,
          time_seconds: Math.max(0, parseNumberLikeInline(seconds) ?? 0),
          occupancy_percentage: occupancyPercentages[code] ?? 0,
          percentage: occupancyPercentages[code] ?? 0,
          percent: occupancyPercentages[code] ?? 0,
        }));
      }
      return nextRow;
    });
    return clone;
  };

  // ─── mostrarResultadosNaPagina (atualizado) ─────────────────────────────────

  const mostrarResultadosNaPagina = (data: {
    resultados: ResultadosBalanceamento;
    resultadosPorTipo?: Partial<Record<"linha" | "espinha", ResultadosBalanceamento>>;
    operadores: Operador[];
    operacoes: Operacao[];
    config: ConfiguracaoDistribuicao;
    layoutConfig: LayoutConfig;
    taskCode?: string;
    ajusteBodyBase?: any;
    ajusteBodyBasePorTipo?: Partial<Record<"linha" | "espinha", any>>;
    swapBaseRaw?: any;
    swapBaseRawPorTipo?: Partial<Record<"linha" | "espinha", any>>;
  }) => {
    const machineLayout = resolveMachineLayoutPorTipoInline(data.resultados, data.layoutConfig.tipoLayout);
    const resultadosComLayout = {
      ...(data.resultados as any),
      machine_layout: machineLayout,
    };
    const resultadosPorTipo = data.resultadosPorTipo ?? {
      [data.layoutConfig.tipoLayout]: resultadosComLayout,
    };
    const resultadoAtual =
      resultadosPorTipo[data.layoutConfig.tipoLayout] ??
      resultadosComLayout;
    const ajusteBodyBasePorTipo = data.ajusteBodyBasePorTipo ?? {
      [data.layoutConfig.tipoLayout]: data.ajusteBodyBase ?? null,
    };
    setResultadosInlineData(data);
    setResultadosPorTipoInline(resultadosPorTipo);
    setResultadosAtuaisInline(resultadoAtual);
    setConfigAtualInline(data.config);
    setViewModeInline("tempo");
    setTaskCodeInline(data.taskCode || taskCodeSelecionado || "");
    setAjusteBodyBasePorTipoInline(ajusteBodyBasePorTipo);
    setAjusteBodyBaseInline(ajusteBodyBasePorTipo[data.layoutConfig.tipoLayout] ?? data.ajusteBodyBase ?? null);
    setExportPdfBodyInline(data.ajusteBodyBase ?? data.swapBaseRaw ?? null);
    setSwapBaseRawPorTipoInline(data.swapBaseRawPorTipo ?? {});
    setSwapBaseRawInline(data.swapBaseRaw ?? null);
    setTemAdjustInline(Boolean(data.ajusteBodyBase || data.ajusteBodyBasePorTipo));
    if (suppressResultadosScrollRef.current) {
      suppressResultadosScrollRef.current = false;
      return;
    }
    requestAnimationFrame(() => {
      setTimeout(() => {
        resultadosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    });
  };

  // ─── Handlers inline ─────────────────────────────────────────────────────────

  const handleRecalcularInline = useCallback((novosResultados: ResultadosBalanceamento, novaConfig: ConfiguracaoDistribuicao) => {
    setResultadosAtuaisInline(novosResultados);
    setConfigAtualInline(novaConfig);
  }, []);

  const handleRecalcularLayoutComAdjustInline = useCallback(async (nextLayoutConfig: LayoutConfig) => {
    const codigoFicha = taskCodeInline || taskCodeSelecionado;
    if (!codigoFicha || !resultadosAtuaisInline) return;
    setIsAjustando(true);
    try {
      const maxPosts = getMaxPostsPayloadInline(nextLayoutConfig);
      const bodyBase = ajusteBodyBaseInline ?? ajusteBodyBasePorTipoInline[nextLayoutConfig.tipoLayout];
      if (!bodyBase) return;
      const body = {
        ...(structuredClone(bodyBase) || {}),
        max_posts: maxPosts,
        max_position_deviation: Math.max(1, Number(nextLayoutConfig.distanciaMaxima) || 1),
        position_deviation_mode: nextLayoutConfig.permitirRetrocesso ? "both" : "forward",
        ...(configAtualInline?.possibilidade === 5 ? { group_by_machine: configAtualInline.agruparMaquinas } : {}),
      };
      const ajusteEndpoint = configAtualInline?.possibilidade === 5 ? "adjust-ideal" : "adjust";
      const resposta = await axios.post(`${API_BASE_URL}/tasks/${encodeURIComponent(codigoFicha)}/${ajusteEndpoint}`, body);
      const novoRaw = resposta.data ?? {};
      const tipos: Array<"linha" | "espinha"> = ["linha", "espinha"];
      const proximosResultadosPorTipo = Object.fromEntries(
        tipos.map((tipo) => {
          const resultadosBase = buildResultadosFromApiInline(novoRaw, resultadosAtuaisInline);
          return [
            tipo,
            {
              ...(resultadosBase as any),
              machine_layout: resolveMachineLayoutPorTipoInline(novoRaw, tipo),
            } as ResultadosBalanceamento,
          ];
        })
      ) as Partial<Record<"linha" | "espinha", ResultadosBalanceamento>>;
      const proximoAjusteBodyBasePorTipo = {
        linha: { ...(body || {}), ...(novoRaw || {}) },
        espinha: { ...(body || {}), ...(novoRaw || {}) },
      } as Partial<Record<"linha" | "espinha", any>>;
      const resultadoAtual = proximosResultadosPorTipo[nextLayoutConfig.tipoLayout];
      if (resultadoAtual) setResultadosAtuaisInline(resultadoAtual);
      setResultadosPorTipoInline((prev) => ({ ...prev, ...proximosResultadosPorTipo }));
      setResultadosInlineData((prev) =>
        prev
          ? {
              ...prev,
              resultados: resultadoAtual ?? prev.resultados,
              resultadosPorTipo: {
                ...(prev.resultadosPorTipo || {}),
                ...proximosResultadosPorTipo,
              },
              layoutConfig: nextLayoutConfig,
              ajusteBodyBase: proximoAjusteBodyBasePorTipo[nextLayoutConfig.tipoLayout] ?? prev.ajusteBodyBase,
              ajusteBodyBasePorTipo: {
                ...(prev.ajusteBodyBasePorTipo || {}),
                ...proximoAjusteBodyBasePorTipo,
              },
              swapBaseRaw: novoRaw,
              swapBaseRawPorTipo: {
                ...(prev.swapBaseRawPorTipo || {}),
                linha: novoRaw,
                espinha: novoRaw,
              },
            }
          : prev
      );
      setAjusteBodyBasePorTipoInline((prev) => ({ ...prev, ...proximoAjusteBodyBasePorTipo }));
      setAjusteBodyBaseInline(proximoAjusteBodyBasePorTipo[nextLayoutConfig.tipoLayout] ?? null);
      setSwapBaseRawInline(novoRaw);
      setSwapBaseRawPorTipoInline((prev) => ({ ...prev, linha: novoRaw, espinha: novoRaw }));
      setExportPdfBodyInline(novoRaw);
      setTemAdjustInline(true);
    } catch (error) {
      const apiMessage = (error as any)?.response?.data?.detail?.message || (error as any)?.response?.data?.message || (error as any)?.message;
      setErroPopupInline(apiMessage || "Erro ao recalcular layout ajustado.");
      throw error;
    } finally {
      setIsAjustando(false);
    }
  }, [taskCodeInline, taskCodeSelecionado, ajusteBodyBaseInline, ajusteBodyBasePorTipoInline, resultadosAtuaisInline, resultadosPorTipoInline, getMaxPostsPayloadInline, buildResultadosFromApiInline, configAtualInline]);

  const handleConfirmarEdicaoInline = useCallback(async (editedRows: any[]) => {
    const codigoFicha = taskCodeInline || taskCodeSelecionado;
    if (!codigoFicha || (!ajusteBodyBaseInline && !ajusteBodyBasePorTipoInline.linha && !ajusteBodyBasePorTipoInline.espinha)) {
      setErroPopupInline("Não foi possível ajustar: faltam dados base da chamada inicial.");
      return;
    }
    setIsAjustando(true);
    try {
      const bodyBase = ajusteBodyBaseInline ?? ajusteBodyBasePorTipoInline[layoutConfig.tipoLayout];
      if (!bodyBase) return;
      const body = mergeRowsIntoAdjustBodyInline(bodyBase, editedRows);
      if (configAtualInline?.possibilidade === 5) {
        body.group_by_machine = configAtualInline.agruparMaquinas;
      }
      const ajusteEndpoint = configAtualInline?.possibilidade === 5 ? "adjust-ideal" : "adjust";
      const resposta = await axios.post(`${API_BASE_URL}/tasks/${encodeURIComponent(codigoFicha)}/${ajusteEndpoint}`, body);
      const novoRaw = resposta.data ?? {};
      logAdjustPercentageTraceInline(editedRows, body, novoRaw);
      const tipos: Array<"linha" | "espinha"> = ["linha", "espinha"];
      const proximosResultadosPorTipo = Object.fromEntries(
        tipos.map((tipo) => {
          const novosResultadosBase = buildResultadosFromApiInline(
            novoRaw,
            resultadosAtuaisInline!
          );
          return [
            tipo,
            {
              ...(novosResultadosBase as any),
              machine_layout: resolveMachineLayoutPorTipoInline(novoRaw, tipo),
            } as ResultadosBalanceamento,
          ];
        })
      ) as Partial<Record<"linha" | "espinha", ResultadosBalanceamento>>;
      const proximoAjusteBodyBasePorTipo = {
        linha: { ...(body || {}), ...(novoRaw || {}) },
        espinha: { ...(body || {}), ...(novoRaw || {}) },
      } as Partial<Record<"linha" | "espinha", any>>;
      const novosResultados = proximosResultadosPorTipo[layoutConfig.tipoLayout] ?? resultadosAtuaisInline!;
      setResultadosAtuaisInline(novosResultados);
      setResultadosPorTipoInline((prev) => ({ ...prev, ...proximosResultadosPorTipo }));
      setResultadosInlineData((prev) =>
        prev
          ? {
              ...prev,
              resultados: novosResultados,
              resultadosPorTipo: {
                ...(prev.resultadosPorTipo || {}),
                ...proximosResultadosPorTipo,
              },
              ajusteBodyBase: proximoAjusteBodyBasePorTipo[layoutConfig.tipoLayout] ?? prev.ajusteBodyBase,
              ajusteBodyBasePorTipo: {
                ...(prev.ajusteBodyBasePorTipo || {}),
                ...proximoAjusteBodyBasePorTipo,
              },
              swapBaseRaw: novoRaw,
              swapBaseRawPorTipo: {
                ...(prev.swapBaseRawPorTipo || {}),
                linha: novoRaw,
                espinha: novoRaw,
              },
            }
          : prev
      );
      setAjusteBodyBasePorTipoInline((prev) => ({ ...prev, ...proximoAjusteBodyBasePorTipo }));
      setAjusteBodyBaseInline(proximoAjusteBodyBasePorTipo[layoutConfig.tipoLayout] ?? null);
      setSwapBaseRawInline(novoRaw);
      setSwapBaseRawPorTipoInline((prev) => ({ ...prev, linha: novoRaw, espinha: novoRaw }));
      setExportPdfBodyInline(novoRaw);
      setTemAdjustInline(true);
    } catch (error) {
      const apiMessage = (error as any)?.response?.data?.detail?.message || (error as any)?.response?.data?.message || (error as any)?.message;
      setErroPopupInline(apiMessage || "Erro ao ajustar alocação. Verifica os valores editados e tenta novamente.");
      throw error;
    } finally {
      setIsAjustando(false);
    }
  }, [taskCodeInline, taskCodeSelecionado, ajusteBodyBaseInline, ajusteBodyBasePorTipoInline, resultadosAtuaisInline, resultadosPorTipoInline, buildResultadosFromApiInline, logAdjustPercentageTraceInline, layoutConfig.tipoLayout, configAtualInline]);

  const handleAtribuirColunaIdeal = useCallback(async (operatorCode: string) => {
    setIdealAssignmentColumn(operatorCode);
    setIdealCollaboratorSearch("");
    setIdealOleExpanded({});
    const bodyBase = ajusteBodyBaseInline ?? ajusteBodyBasePorTipoInline[layoutConfig.tipoLayout];
    const renameMap = ((bodyBase as any)?.rename_map || {}) as Record<string, string>;
    const virtualCode = operatorCode.toUpperCase().startsWith("VIRT")
      ? operatorCode
      : Object.entries(renameMap).find(([, collaboratorCode]) =>
          normalizeKey(String(collaboratorCode)) === normalizeKey(operatorCode)
        )?.[0] || operatorCode;
    const operationsByVirtual: Record<string, string[]> = {};
    const tableRows = ensureArray(
      resultadosAtuaisInline?.operation_allocations ??
      (resultadosAtuaisInline as any)?.table_data ??
      (resultadosAtuaisInline as any)?.tableData
    );
    tableRows.forEach((row: any) => {
        const refs = new Set<string>([
          ...Object.keys(row?.operator_times || {}),
          ...Object.keys(row?.operator_positions || {}),
          ...ensureArray(row?.operator_allocations).map((allocation: any) =>
            pickString(allocation, ["operator_code", "operator_id", "operador_id", "operator", "operador", "code"])
          ),
        ]);
        const operationId = pickString(row, ["operation_id", "operation_code", "operation", "code", "id"]);
        if (!operationId) return;
        Array.from(refs).forEach((ref) => {
          const virtualRef = ref.toUpperCase().startsWith("VIRT") ? ref :
            Object.entries(renameMap).find(([, collaboratorCode]) => normalizeKey(String(collaboratorCode)) === normalizeKey(ref))?.[0] || ref;
          if (!virtualRef.toUpperCase().startsWith("VIRT")) return;
          operationsByVirtual[virtualRef] = Array.from(new Set([...(operationsByVirtual[virtualRef] || []), operationId]));
        });
      });
    setIdealOperationsByVirtual(operationsByVirtual);
    const operationIds = operationsByVirtual[virtualCode] || [];

    setIdealCollaboratorsLoading(true);
    try {
      if (operationIds.length === 0) {
        setIdealCollaborators([]);
        setIdealOleDetails({});
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/polyvalence/candidates/average-ole`, {
        params: { operation_ids: operationIds.join(",") },
      });
      const data = response.data;
      const candidates = (Array.isArray(data?.candidates) ? data.candidates : ensureArray(data))
        .filter((candidate: any) => candidate && candidate.active !== false);
      const operationNames = new Map<string, string>();
      operacoes.forEach((operation: any) => {
        const id = pickString(operation, ["operation_id", "operation_code", "id", "code", "referencia"]);
        const name = pickString(operation, ["operation_name", "name", "nome", "descricao"]);
        if (id && name) operationNames.set(normalizeKey(id), name);
      });
      const details: Record<string, { media?: number; operacoes: Array<{ id: string; nome?: string; ole?: number }> }> = {};
      candidates.forEach((candidate: any) => {
        const collaboratorId = pickString(candidate, ["collaborator_id", "collaboratorId", "operator_id", "operator_code", "id", "code"]);
        if (!collaboratorId) return;
        const oleByOperation = candidate.ole_by_operation && typeof candidate.ole_by_operation === "object"
          ? candidate.ole_by_operation
          : {};
        const candidateOperations = Object.entries(oleByOperation as Record<string, unknown>).map(([id, ole]) => ({
          id,
          nome: operationNames.get(normalizeKey(id)),
          ole: typeof ole === "number" ? ole : Number(ole),
        }));
        details[normalizeKey(collaboratorId)] = {
          media: pickNumber(candidate, ["average_ole", "average_ole_percentage", "ole_average", "media_ole", "average"]) ?? undefined,
          operacoes: candidateOperations.filter((operation) => Number.isFinite(operation.ole)),
        };
      });
      setIdealCollaborators(candidates);
      setIdealOleDetails(details);
    } catch (error) {
      setIdealAssignmentColumn(null);
      setIdealCollaborators([]);
      setIdealOleDetails({});
      setErroPopupInline((error as any)?.response?.data?.detail || "NÃ£o foi possÃ­vel obter os candidatos.");
    } finally {
      setIdealCollaboratorsLoading(false);
    }
    return;

    if (operationIds.length > 0) {
      try {
        const response = await axios.get(`${API_BASE_URL}/polyvalence/candidates/average-ole`, {
          params: {
            operation_ids: operationIds.join(","),
          },
        });
        const data = response.data;
        const rows = ensureArray(data).length > 0
          ? ensureArray(data)
          : data && typeof data === "object"
            ? Object.entries(data as Record<string, any>).map(([collaboratorId, value]) => ({
                ...(value && typeof value === "object" ? value : {}),
                collaborator_id: collaboratorId,
              }))
            : [];
        const details: Record<string, { media?: number; operacoes: Array<{ id: string; nome?: string; ole?: number }> }> = {};
        rows.forEach((row: any) => {
          const collaborator = row.collaborator && typeof row.collaborator === "object" ? row.collaborator : {};
          const collaboratorId = pickString(row, ["collaborator_id", "collaboratorId", "operator_id", "operator_code", "id", "code"]) ||
            pickString(collaborator, ["collaborator_id", "collaboratorId", "operator_id", "operator_code", "id", "code"]);
          if (!collaboratorId) return;
          const operationSource = row.operations ?? row.operacoes ?? row.operation_oles ?? row.oles ?? row.operations_by_id;
          const operationRows = Array.isArray(operationSource)
            ? operationSource
            : operationSource && typeof operationSource === "object"
              ? Object.entries(operationSource as Record<string, any>).map(([id, value]) => ({
                  ...(value && typeof value === "object" ? value : {}),
                  operation_id: id,
                }))
              : [];
          const operacoes = operationRows.map((operation: any) => ({
            id: pickString(operation, ["operation_id", "operation_code", "id", "code"]) || "",
            nome: pickString(operation, ["operation_name", "name", "nome"]) || undefined,
            ole: pickNumber(operation, ["ole_percentage", "ole_percent", "ole"] ) ?? undefined,
          })).filter((operation) => operation.id);
          details[normalizeKey(collaboratorId)] = {
            media: pickNumber(row, ["average_ole", "average_ole_percentage", "ole_average", "media_ole", "average"]) ??
              pickNumber(collaborator, ["average_ole", "average_ole_percentage", "ole_average", "media_ole", "average"]) ?? undefined,
            operacoes,
          };
        });
        setIdealOleDetails(details);
      } catch (error) {
        console.warn("Não foi possível carregar os OLEs das operações:", error);
        setIdealOleDetails({});
      }
    } else {
      setIdealOleDetails({});
    }

    if (idealCollaborators.length > 0) return;
    setIdealCollaboratorsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/operations/collaborators/all`);
      const entries = ensureArray(response.data);
      const flattened = entries.flatMap((entry: any) =>
        ensureArray(entry?.collaborators ?? entry?.colaboradores ?? entry)
      );
      const source = flattened.length > 0 ? flattened : entries;
      const unique = new Map<string, any>();
      source.forEach((item: any) => {
        const id = pickString(item, ["collaborator_id", "collaboratorId", "id", "operator_id", "operador_id"]);
        if (id && !unique.has(id)) unique.set(id, item);
      });
      setIdealCollaborators(Array.from(unique.values()));
    } catch (error) {
      setIdealAssignmentColumn(null);
      setErroPopupInline((error as any)?.response?.data?.detail || "Não foi possível obter os colaboradores.");
    } finally {
      setIdealCollaboratorsLoading(false);
    }
  }, [ajusteBodyBaseInline, ajusteBodyBasePorTipoInline, layoutConfig.tipoLayout, resultadosAtuaisInline, operacoes]);

  const handleConfirmarAtribuicaoIdeal = useCallback(async (collaborator: any) => {
    const selectedColumnCode = idealAssignmentColumn;
    const codigoFicha = taskCodeInline || taskCodeSelecionado;
    const bodyBase = ajusteBodyBaseInline ?? ajusteBodyBasePorTipoInline[layoutConfig.tipoLayout];
    const collaboratorId = pickString(collaborator, ["collaborator_id", "collaboratorId", "id", "operator_id", "operador_id"]);
    if (!selectedColumnCode || !codigoFicha || !bodyBase || !collaboratorId) return;

    const existingRenameMap = ((bodyBase as any)?.rename_map || {}) as Record<string, string>;
    const operatorCode = selectedColumnCode.toUpperCase().startsWith("VIRT")
      ? selectedColumnCode
      : Object.entries(existingRenameMap).find(([, collaboratorCode]) =>
          normalizeKey(String(collaboratorCode)) === normalizeKey(selectedColumnCode)
        )?.[0] || selectedColumnCode;
    const duplicateAssignment = Object.entries(existingRenameMap).some(([virtualCode, assignedId]) =>
      virtualCode !== operatorCode && normalizeKey(String(assignedId)) === normalizeKey(collaboratorId)
    );
    if (duplicateAssignment) {
      setErroPopupInline("Este colaborador já está atribuído a outra coluna.");
      return;
    }

    setIsAjustando(true);
    try {
      const body = {
        ...(structuredClone(bodyBase) || {}),
        edited_operation_code: "",
        rename_map: {
          ...existingRenameMap,
          [operatorCode]: collaboratorId,
        },
        group_by_machine: configAtualInline?.agruparMaquinas ?? false,
      };
      const response = await axios.post(`${API_BASE_URL}/tasks/${encodeURIComponent(codigoFicha)}/adjust-ideal`, body);
      const raw = response.data ?? {};
      // O endpoint pode não devolver o rename_map. Mantemo-lo no estado local
      // para que a barra de progresso e o filtro do popup reflitam a atribuição.
      const rawComAtribuicoes = {
        ...raw,
        rename_map: {
          ...existingRenameMap,
          [operatorCode]: collaboratorId,
        },
      };
      const tipos: Array<"linha" | "espinha"> = ["linha", "espinha"];
      const nextResultsByType = Object.fromEntries(
        tipos.map((tipo) => {
          const base = buildResultadosFromApiInline(rawComAtribuicoes, resultadosAtuaisInline!);
          return [
            tipo,
            {
              ...(base as any),
              machine_layout: resolveMachineLayoutPorTipoInline(rawComAtribuicoes, tipo),
            } as ResultadosBalanceamento,
          ];
        })
      ) as Partial<Record<"linha" | "espinha", ResultadosBalanceamento>>;
      const next = nextResultsByType[layoutConfig.tipoLayout] ?? resultadosAtuaisInline!;
      setResultadosAtuaisInline(next);
      setResultadosPorTipoInline((prev) => ({ ...prev, ...nextResultsByType }));
      setAjusteBodyBaseInline(rawComAtribuicoes);
      setAjusteBodyBasePorTipoInline({ linha: rawComAtribuicoes, espinha: rawComAtribuicoes });
      setSwapBaseRawInline(rawComAtribuicoes);
      setSwapBaseRawPorTipoInline({ linha: rawComAtribuicoes, espinha: rawComAtribuicoes });
      setExportPdfBodyInline(rawComAtribuicoes);
      setResultadosInlineData((prev) => prev ? {
        ...prev,
        resultados: next,
        resultadosPorTipo: { ...(prev.resultadosPorTipo || {}), ...nextResultsByType },
         operadores: extrairOperadoresDosResultadosIdeais(rawComAtribuicoes),
         ajusteBodyBase: rawComAtribuicoes,
         ajusteBodyBasePorTipo: { linha: rawComAtribuicoes, espinha: rawComAtribuicoes },
         swapBaseRaw: rawComAtribuicoes,
         swapBaseRawPorTipo: { linha: rawComAtribuicoes, espinha: rawComAtribuicoes },
      } : prev);
      setIdealAssignmentColumn(null);
    } catch (error) {
      setErroPopupInline((error as any)?.response?.data?.detail?.message || (error as any)?.response?.data?.detail || "Não foi possível atribuir o colaborador.");
    } finally {
      setIsAjustando(false);
    }
  }, [idealAssignmentColumn, taskCodeInline, taskCodeSelecionado, ajusteBodyBaseInline, ajusteBodyBasePorTipoInline, layoutConfig.tipoLayout, resultadosAtuaisInline, buildResultadosFromApiInline, configAtualInline]);

  const idealRenameMap = ((ajusteBodyBaseInline as any)?.rename_map || {}) as Record<string, string>;
  const idealAssignedCollaboratorIds = new Set(
    Object.values(idealRenameMap)
      .map((value) => normalizeKey(String(value)))
      .filter(Boolean)
  );
  const idealAssignmentMax = Math.max(
    Number(configAtualInline?.numeroOperadores || 0),
    Number(resultadosAtuaisInline?.numeroOperadores || 0),
    Array.isArray(resultadosAtuaisInline?.operator_slots) ? resultadosAtuaisInline.operator_slots.length : 0,
    Object.keys(idealRenameMap).length,
    1
  );
  const idealSelectedVirtualCode = idealAssignmentColumn
    ? (idealAssignmentColumn.toUpperCase().startsWith("VIRT")
        ? idealAssignmentColumn
        : Object.entries(idealRenameMap).find(([, collaboratorCode]) =>
            normalizeKey(String(collaboratorCode)) === normalizeKey(idealAssignmentColumn)
          )?.[0] || idealAssignmentColumn)
    : null;
  const idealCollaboratorsFiltered = idealCollaborators.filter((collaborator) => {
    const id = pickString(collaborator, ["collaborator_id", "collaboratorId", "id", "operator_id", "operador_id"]);
    const name = pickString(collaborator, ["collaborator_name", "collaboratorName", "name", "nome"]);
    const idKey = normalizeKey(id);
    const currentAssignment = idealSelectedVirtualCode ? idealRenameMap[idealSelectedVirtualCode] : "";
    const alreadyAssignedElsewhere = idealAssignedCollaboratorIds.has(idKey) && normalizeKey(String(currentAssignment)) !== idKey;
    const query = normalizeKey(idealCollaboratorSearch);
    return !alreadyAssignedElsewhere && (!query || normalizeKey(id).includes(query) || normalizeKey(name).includes(query));
  });

  const handleSwapPositionsInline = useCallback(async (positionA: string, positionB: string) => {
    const codigoFicha = taskCodeInline || taskCodeSelecionado || resultadosInlineData?.taskCode;
    if (!codigoFicha || !resultadosAtuaisInline) return;
    const rawBase =
      swapBaseRawPorTipoInline[layoutConfig.tipoLayout] ??
      swapBaseRawInline ??
      resultadosInlineData?.swapBaseRawPorTipo?.[layoutConfig.tipoLayout] ??
      resultadosInlineData?.swapBaseRaw ??
      null;

    if (!rawBase) {
      setErroPopupInline("Nao foi possivel trocar as posicoes: faltam dados base do layout.");
      return;
    }

    const layouts = rawBase?.layouts ?? null;
    const operationAllocations =
      ensureArray(rawBase?.operation_allocations ?? rawBase?.operationAllocations).length > 0
        ? ensureArray(rawBase?.operation_allocations ?? rawBase?.operationAllocations)
        : ensureArray(resultadosAtuaisInline?.operation_allocations);

    if (!layouts || operationAllocations.length === 0) {
      setErroPopupInline("Nao foi possivel trocar as posicoes: faltam layouts ou operation_allocations.");
      return;
    }

    setIsAjustando(true);
    try {
      const resposta = await axios.post(
        `${API_BASE_URL}/tasks/${encodeURIComponent(codigoFicha)}/layout/swap-positions`,
        {
          line_type: layoutConfig.tipoLayout,
          position_a: positionA,
          position_b: positionB,
          layouts,
          operation_allocations: operationAllocations,
        },
        {
          params: {
            _code: codigoFicha,
          },
        }
      );
      const novoRaw = resposta.data ?? {};
      const tipos: Array<"linha" | "espinha"> = ["linha", "espinha"];
      const proximosResultadosPorTipo = Object.fromEntries(
        tipos.map((tipo) => {
          const resultadosBase = buildResultadosFromApiInline(novoRaw, resultadosAtuaisInline);
          return [
            tipo,
            {
              ...(resultadosBase as any),
              machine_layout: resolveMachineLayoutPorTipoInline(novoRaw, tipo),
            } as ResultadosBalanceamento,
          ];
        })
      ) as Partial<Record<"linha" | "espinha", ResultadosBalanceamento>>;
      const proximoAjusteBodyBasePorTipo = {
        linha: novoRaw,
        espinha: novoRaw,
      } as Partial<Record<"linha" | "espinha", any>>;
      const novosResultados = proximosResultadosPorTipo[layoutConfig.tipoLayout] ?? resultadosAtuaisInline;
      if (novosResultados) setResultadosAtuaisInline(novosResultados);
      setResultadosPorTipoInline((prev) => ({ ...prev, ...proximosResultadosPorTipo }));
      setResultadosInlineData((prev) =>
        prev
          ? {
              ...prev,
              resultados: novosResultados ?? prev.resultados,
              resultadosPorTipo: {
                ...(prev.resultadosPorTipo || {}),
                ...proximosResultadosPorTipo,
              },
              ajusteBodyBase: proximoAjusteBodyBasePorTipo[layoutConfig.tipoLayout] ?? prev.ajusteBodyBase,
              ajusteBodyBasePorTipo: {
                ...(prev.ajusteBodyBasePorTipo || {}),
                ...proximoAjusteBodyBasePorTipo,
              },
              swapBaseRaw: novoRaw,
              swapBaseRawPorTipo: {
                ...(prev.swapBaseRawPorTipo || {}),
                linha: novoRaw,
                espinha: novoRaw,
              },
            }
          : prev
      );
      setAjusteBodyBasePorTipoInline((prev) => ({ ...prev, ...proximoAjusteBodyBasePorTipo }));
      setAjusteBodyBaseInline(proximoAjusteBodyBasePorTipo[layoutConfig.tipoLayout] ?? null);
      setSwapBaseRawInline(novoRaw);
      setSwapBaseRawPorTipoInline((prev) => ({ ...prev, linha: novoRaw, espinha: novoRaw }));
      setExportPdfBodyInline(novoRaw);
      setTemAdjustInline(true);
    } catch (error) {
      const apiMessage = (error as any)?.response?.data?.detail?.message || (error as any)?.response?.data?.message || (error as any)?.message;
      setErroPopupInline(apiMessage || "Erro ao trocar posicoes no layout.");
      throw error;
    } finally {
      setIsAjustando(false);
    }
  }, [taskCodeInline, taskCodeSelecionado, resultadosAtuaisInline, resultadosInlineData, swapBaseRawInline, swapBaseRawPorTipoInline, layoutConfig.tipoLayout, buildResultadosFromApiInline]);

  const handleGuardarHistoricoInline = useCallback(async () => {
    if (isGuardandoHistorico) return;
    setIsGuardandoHistorico(true);
    try {
      const payload = {
        task_code: taskCodeInline || undefined,
        content: {
          ...(ajusteBodyBaseInline && typeof ajusteBodyBaseInline === "object" ? ajusteBodyBaseInline : {}),
          ...resultadosAtuaisInline,
          distribuicao: (resultadosAtuaisInline as any)?.distribuicao ?? [],
          operation_allocations: ensureArray((resultadosAtuaisInline as any)?.operation_allocations),
          takt_time_seconds: (parseNumberLikeInline((resultadosAtuaisInline as any)?.taktTime) ?? 0) * 60,
          real_cycle_time_seconds: (parseNumberLikeInline((resultadosAtuaisInline as any)?.tempoCiclo) ?? 0) * 60,
          num_operators: parseNumberLikeInline((resultadosAtuaisInline as any)?.numeroOperadores) ?? 0,
        },
      };
      await axios.post(`${API_BASE_URL}/history/`, payload);
      setSucessoPopupInline("Histórico guardado com sucesso.");
    } catch (error) {
      console.error("Erro ao guardar historico:", error);
      setErroPopupInline("Erro ao guardar no histórico. Tenta novamente.");
    } finally {
      setIsGuardandoHistorico(false);
    }
  }, [ajusteBodyBaseInline, taskCodeInline, resultadosAtuaisInline, isGuardandoHistorico]);

  const handleExportInline = () => {
    if (!resultadosAtuaisInline || !resultadosInlineData) return;
    const data = { resultados: resultadosAtuaisInline, operadores: resultadosInlineData.operadores, operacoes: resultadosInlineData.operacoes, config: configAtualInline, dataGeracao: new Date().toISOString() };
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

  const handleExportPdfInline = () => {
    const codigoFicha = taskCodeInline || taskCodeSelecionado;
    if (!codigoFicha) {
      setErroPopupInline("Nao foi possivel exportar PDF: falta o codigo da tarefa.");
      return;
    }

    void (async () => {
      try {
        const exportPayload =
          exportPdfBodyInline ??
          resultadosInlineData?.ajusteBodyBase ??
          resultadosInlineData?.swapBaseRaw ??
          null;

        if (!exportPayload) {
          setErroPopupInline("Nao foi possivel exportar PDF: faltam dados base da resposta da API.");
          return;
        }

        const payloadComLinha = {
          ...(structuredClone(exportPayload) || {}),
          line_type: layoutConfig.tipoLayout,
        };

        const resposta = await axios.post(
          `${API_BASE_URL}/v2/tasks/${encodeURIComponent(codigoFicha)}/export-pdf`,
          payloadComLinha,
          {
            responseType: "blob",
            headers: {
              Accept: "application/pdf",
            },
          }
        );

        const blob = new Blob([resposta.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `balanceamento_${new Date().toISOString().split("T")[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        const responseBlob = (error as any)?.response?.data;
        if (responseBlob instanceof Blob && responseBlob.type.includes("application/json")) {
          try {
            const text = await responseBlob.text();
            const parsed = JSON.parse(text);
            const message = parsed?.detail?.message || parsed?.message || "Erro ao exportar PDF.";
            setErroPopupInline(message);
            return;
          } catch {
            // fall through to generic error
          }
        }

        const apiMessage =
          (error as any)?.response?.data?.detail?.message ||
          (error as any)?.response?.data?.message ||
          (error as any)?.message;
        setErroPopupInline(apiMessage || "Erro ao exportar PDF.");
      }
    })();
  };
  const handleCalcular = async (confirmado = false) => {
    try {
      const getMaxPostsPayload = () => {
        const postosInputEl = document.getElementById("lc-postos") as HTMLInputElement | null;
        const postosInputRaw = postosInputEl?.value?.trim() || "";
        const postosInputNum = postosInputRaw ? Number(postosInputRaw.replace(",", ".")) : Number.NaN;
        const postosBase = Number.isFinite(postosInputNum)
          ? postosInputNum
          : Number(layoutConfig.postosPorLado);
        const postosPorLado = Math.max(1, Math.round(postosBase || 0));
        return layoutConfig.tipoLayout === "espinha" ? postosPorLado * 2 : postosPorLado;
      };

      const operadoresDisponiveis = operadores.filter((op) =>
        operadoresSelecionados.includes(op.id)
      );

      if (!usarAllocateModo1Api && !usarAllocateIdealApi && !usarAllocateObjetivoApi && !usarAllocateNumeroOperadoresApi && config.possibilidade !== 4 && operadoresDisponiveis.length === 0) {
        alert("Por favor, selecione pelo menos um operador.");
        return;
      }

      if (operacoes.length === 0) {
        alert("Por favor, selecione um produto com operacoes.");
        return;
      }
      const identificadorFicha = produto?.referencia || produto?.id || taskCodeSelecionado || "ficha selecionada";
      if (!confirmado) {
        setConfirmarCalculoModal({ open: true, identificador: identificadorFicha });
        return;
      }
      // Modo 1: usar endpoint automatico (sequencial ou agrupado por maquina)
      if (usarAllocateModo1Api || usarAllocateIdealApi) {
        if (!taskCodeSelecionado) {
          alert("Nao foi possivel identificar o codigo da ficha tecnica para calcular.");
          return;
        }

        const normalizarRatio = (valor: number) => {
          if (!Number.isFinite(valor)) return 0;
          return valor > 1 ? valor / 100 : valor;
        };
        const limitNotDivideUpper = Math.max(1.01, Number(config.naoDividirMaiorQue) || 1.1);
        const limitNotDivideLower = Math.min(0.99, Math.max(0, Number(config.naoDividirMenorQue) || 0.9));
        const maxPosts = getMaxPostsPayload();

        const payloadBase = {
          efficiency: normalizarRatio(config.produtividadeEstimada),
          work_hours: config.horasTurno,
          limit_not_assign: normalizarRatio(config.cargaMaximaOperador),
          limit_not_divide_upper: limitNotDivideUpper,
          limit_not_divide_lower: limitNotDivideLower,
          max_posts: maxPosts,
          max_position_deviation: Math.max(1, Number(layoutConfig.distanciaMaxima) || 1),
          position_deviation_mode: layoutConfig.permitirRetrocesso ? "both" : "forward",
        };
        const endpointModo1 = usarAllocateIdealApi
          ? (config.agruparMaquinas ? "allocate-grouped-ideal" : "allocate-ideal")
          : (config.agruparMaquinas ? "allocate-grouped" : "allocate");
        const resposta = await axios.post(
          `${API_BASE_URL}/tasks/${encodeURIComponent(taskCodeSelecionado)}/${endpointModo1}`,
          payloadBase
        );
        const r = ensureRecord(resposta.data) ?? {};
        const taktTime = (pickNumber(r, ["takt_time_seconds", "takt_time", "taktTime"]) ?? 0) / 60;
        const tempoCicloApi = pickNumber(r, ["real_cycle_time_seconds", "cycle_time_seconds", "cycle_time", "tempo_ciclo_segundos"]);
        const tempoCiclo = tempoCicloApi != null
          ? (tempoCicloApi > 10 ? tempoCicloApi / 60 : tempoCicloApi)
          : 0;
        const numeroCiclosPorHora = pickNumber(r, ["production_per_hour", "numero_ciclos_por_hora"]) ?? (tempoCiclo > 0 ? 60 / tempoCiclo : 0);
        const produtividadeRaw = pickNumber(r, ["estimated_productivity", "productivity", "produtividade_estimada"]) ?? 0;
        const produtividade = produtividadeRaw <= 1 ? produtividadeRaw * 100 : produtividadeRaw;
        const perdas = Math.max(0, 100 - produtividade);

        const assignments = ensureArray(
          r.assignments ??
          r.allocations ??
          r.operator_allocations ??
          r.operator_assignments ??
          r.distribution ??
          r.distribuicao
        );
        const operationAllocations = ensureArray(
          r.operation_allocations ??
          r.operationAllocations
        );

        const operadoresResultado = usarAllocateIdealApi
          ? extrairOperadoresDosResultadosIdeais(r)
          : operadoresDisponiveis;
        let distribuicao = extrairDistribuicaoDeTableData(r, operacoes, tempoCiclo, operadoresResultado);
        if (distribuicao.length === 0 && operationAllocations.length > 0) {
          distribuicao = extrairDistribuicaoDeOperationAllocations(operationAllocations, operacoes, operadoresResultado, tempoCiclo);
        }
        const mapa: Record<string, { operacoes: Set<string>; tempoTotal: number; temposOperacoes: Record<string, number> }> = {};

        if (distribuicao.length === 0) {
          for (const item of assignments) {
            const operadorRef = pickString(item, ["operator_id", "operador_id", "operator", "operador"]);
            if (!operadorRef) continue;
            const operadorId = mapOperatorToCode(operadorRef, operadoresDisponiveis);

            const operacaoRef =
              pickString(item, ["operation_code", "operation_id", "operacao_id", "operation", "operacao"]) ||
              pickString(item, ["operation_name", "operacao_nome", "name", "nome"]);
            const operacaoId = operacaoRef ? findOperacaoIdByReferencia(operacaoRef, operacoes) || operacaoRef : "";

            const tempoSegundos = pickNumber(item, ["time_seconds", "tempo_segundos", "seconds"]);
            const tempoMinutos = tempoSegundos != null
              ? tempoSegundos / 60
              : (pickNumber(item, ["time_min", "time_minutes", "tempo_minutos", "minutes"]) ?? 0);

            if (!mapa[operadorId]) mapa[operadorId] = { operacoes: new Set(), tempoTotal: 0, temposOperacoes: {} };
            if (operacaoId) mapa[operadorId].operacoes.add(operacaoId);
            mapa[operadorId].tempoTotal += tempoMinutos;
            if (operacaoId) {
              mapa[operadorId].temposOperacoes[operacaoId] = (mapa[operadorId].temposOperacoes[operacaoId] || 0) + tempoMinutos;
            }
          }
        } else {
          for (const dist of distribuicao) {
            mapa[dist.operadorId] = {
              operacoes: new Set(dist.operacoes),
              tempoTotal: dist.cargaHoraria,
              temposOperacoes: { ...(dist.temposOperacoes || {}) },
            };
          }
        }

        let numeroOperadores =
          pickNumber(r, ["num_operators", "numero_operadores", "numeroOperadores"]) ??
          Object.keys(mapa).length;

        if (Object.keys(mapa).length === 0 && numeroOperadores > 0) {
          for (let i = 1; i <= numeroOperadores; i++) {
            const operadorId = `OP${String(i).padStart(2, "0")}`;
            mapa[operadorId] = { operacoes: new Set(), tempoTotal: 0, temposOperacoes: {} };
          }
        }

        if (distribuicao.length === 0) {
          distribuicao = Object.entries(mapa).map(([operadorId, dados]) => ({
            operadorId,
            operacoes: ordenarOperacoesPelaBase(Array.from(dados.operacoes), operacoes),
            cargaHoraria: dados.tempoTotal,
            ocupacao: tempoCiclo > 0 ? (dados.tempoTotal / tempoCiclo) * 100 : 0,
            ciclosPorHora: dados.tempoTotal > 0 ? 60 / dados.tempoTotal : 0,
            temposOperacoes: dados.temposOperacoes,
          }));
        }

        if (!numeroOperadores) numeroOperadores = distribuicao.length;
        const ocupacaoTotal =
          pickNumber(r, ["occupancy_total", "ocupacao_total", "total_occupancy", "total_load"]) ??
          distribuicao.reduce((sum, dist) => sum + dist.cargaHoraria * 60, 0);

        const resultadosApi = {
          espinha: (r as any)?.espinha ?? (r as any)?.Espinha ?? null,
          layouts: (r as any)?.layouts ?? null,
          distribuicao,
          operation_allocations: operationAllocations,
          share_per_operator_seconds: (r as any)?.share_per_operator_seconds ?? (r as any)?.sharePerOperatorSeconds ?? null,
          table_data: (r as any)?.table_data ?? (r as any)?.tableData ?? (r as any)?.operator_table ?? (r as any)?.operatorTable ?? (r as any)?.results_table ?? null,
          machine_layout: (r as any)?.machine_layout ?? (r as any)?.machineLayout ?? null,
          operator_flow: (r as any)?.espinha?.operator_flow ?? null,
          machine_times_per_operator: (r as any)?.machine_times_per_operator ?? (r as any)?.machineTimesPerOperator ?? null,
          operator_slots: normalizeOperatorSlotsInline((r as any)?.operator_slots ?? (r as any)?.operatorSlots),
          kpis: (r as any)?.kpis ?? null,
          machines_used: (r as any)?.machines_used ?? null,
          required: ((r as any)?.machines_used?.required ?? (r as any)?.required) ?? null,
          overall_avg_time_seconds: pickNumber(((r as any)?.machines_used ?? {}), ["overall_avg_time_seconds"]) ?? pickNumber(r, ["overall_avg_time_seconds"]) ?? undefined,
          taktTime,
          tempoCiclo,
          cycle_time_seconds: tempoCicloApi ?? undefined,
          balance_loss: perdas,
          production_per_hour: numeroCiclosPorHora,
          estimated_productivity: produtividade,
          numeroCiclosPorHora,
          produtividade,
          perdas,
          numeroOperadores,
          ocupacaoTotal,
        };
        const resultadosBaseComum = resultadosApi as ResultadosBalanceamento;
        const resultadosPorTipo = {
          linha: {
            ...(resultadosBaseComum as any),
            machine_layout: resolveMachineLayoutPorTipoInline(r, "linha"),
          } as ResultadosBalanceamento,
          espinha: {
            ...(resultadosBaseComum as any),
            machine_layout: resolveMachineLayoutPorTipoInline(r, "espinha"),
          } as ResultadosBalanceamento,
        } as Partial<Record<"linha" | "espinha", ResultadosBalanceamento>>;

        const dataToPass = {
          resultados: resultadosPorTipo[layoutConfig.tipoLayout] ?? resultadosApi,
          resultadosPorTipo,
        operadores: operadoresResultado,
          operacoes,
          config,
          layoutConfig,
          taskCode: taskCodeSelecionado,
          ajusteBodyBase: r,
          ajusteBodyBasePorTipo: { linha: r, espinha: r },
          swapBaseRaw: r,
          swapBaseRawPorTipo: { linha: r, espinha: r },
        };

        sessionStorage.setItem("balanceamentoData", JSON.stringify(dataToPass));
        mostrarResultadosNaPagina(dataToPass);
        return;
      }
      // Modo 2: usar endpoint por quantidade objetivo
      if (usarAllocateObjetivoApi) {
        if (!taskCodeSelecionado) {
          alert("Nao foi possivel identificar o codigo da ficha tecnica para calcular.");
          return;
        }

        const quantidadeObjetivo = Number(quantidadeObjetivoInput || config.quantidadeObjetivo || 0);
        if (!Number.isFinite(quantidadeObjetivo) || quantidadeObjetivo <= 0) {
          alert("Defina uma quantidade objetivo valida.");
          return;
        }

        const normalizarRatio = (valor: number) => {
          if (!Number.isFinite(valor)) return 0;
          return valor > 1 ? valor / 100 : valor;
        };
        const limitNotDivideUpper = Math.max(1.01, Number(config.naoDividirMaiorQue) || 1.1);
        const limitNotDivideLower = Math.min(0.99, Math.max(0, Number(config.naoDividirMenorQue) || 0.9));
        const maxPosts = getMaxPostsPayload();

        const payloadBase = {
          efficiency: normalizarRatio(config.produtividadeEstimada),
          work_hours: config.horasTurno,
          limit_not_assign: normalizarRatio(config.cargaMaximaOperador),
          limit_not_divide_upper: limitNotDivideUpper,
          limit_not_divide_lower: limitNotDivideLower,
          max_posts: maxPosts,
          objective_pieces: quantidadeObjetivo,
          max_position_deviation: Math.max(1, Number(layoutConfig.distanciaMaxima) || 1),
          position_deviation_mode: layoutConfig.permitirRetrocesso ? "both" : "forward",
        };
        const endpointModo2 = config.agruparMaquinas
          ? "allocate-grouped-objective"
          : "allocate-objective";
        const resposta = await axios.post(
          `${API_BASE_URL}/tasks/${encodeURIComponent(taskCodeSelecionado)}/${endpointModo2}`,
          payloadBase
        );
        const r = ensureRecord(resposta.data) ?? {};
        const taktTime = (pickNumber(r, ["takt_time_seconds", "takt_time", "taktTime"]) ?? 0) / 60;
        const tempoCicloApi = pickNumber(r, ["real_cycle_time_seconds", "cycle_time_seconds", "cycle_time", "tempo_ciclo_segundos"]);
        const tempoCiclo = tempoCicloApi != null
          ? (tempoCicloApi > 10 ? tempoCicloApi / 60 : tempoCicloApi)
          : 0;
        const numeroCiclosPorHora = pickNumber(r, ["production_per_hour", "numero_ciclos_por_hora"]) ?? (tempoCiclo > 0 ? 60 / tempoCiclo : 0);
        const produtividadeRaw = pickNumber(r, ["estimated_productivity", "productivity", "produtividade_estimada"]) ?? 0;
        const produtividade = produtividadeRaw <= 1 ? produtividadeRaw * 100 : produtividadeRaw;
        const perdas = Math.max(0, 100 - produtividade);

        const assignments = ensureArray(
          r.assignments ??
          r.allocations ??
          r.operator_allocations ??
          r.operator_assignments ??
          r.distribution ??
          r.distribuicao
        );
        const operationAllocations = ensureArray(
          r.operation_allocations ??
          r.operationAllocations
        );

        let distribuicao = extrairDistribuicaoDeTableData(r, operacoes, tempoCiclo, operadores);
        if (distribuicao.length === 0 && operationAllocations.length > 0) {
          distribuicao = extrairDistribuicaoDeOperationAllocations(operationAllocations, operacoes, operadores, tempoCiclo);
        }
        const mapa: Record<string, { operacoes: Set<string>; tempoTotal: number; temposOperacoes: Record<string, number> }> = {};

        if (distribuicao.length === 0) {
          for (const item of assignments) {
            const operadorRef = pickString(item, ["operator_id", "operador_id", "operator", "operador"]);
            if (!operadorRef) continue;
            const operadorId = mapOperatorToCode(operadorRef, operadores);

            const operacaoRef =
              pickString(item, ["operation_code", "operation_id", "operacao_id", "operation", "operacao"]) ||
              pickString(item, ["operation_name", "operacao_nome", "name", "nome"]);
            const operacaoId = operacaoRef ? findOperacaoIdByReferencia(operacaoRef, operacoes) || operacaoRef : "";

            const tempoSegundos = pickNumber(item, ["time_seconds", "tempo_segundos", "seconds"]);
            const tempoMinutos = tempoSegundos != null
              ? tempoSegundos / 60
              : (pickNumber(item, ["time_min", "time_minutes", "tempo_minutos", "minutes"]) ?? 0);

            if (!mapa[operadorId]) mapa[operadorId] = { operacoes: new Set(), tempoTotal: 0, temposOperacoes: {} };
            if (operacaoId) mapa[operadorId].operacoes.add(operacaoId);
            mapa[operadorId].tempoTotal += tempoMinutos;
            if (operacaoId) {
              mapa[operadorId].temposOperacoes[operacaoId] = (mapa[operadorId].temposOperacoes[operacaoId] || 0) + tempoMinutos;
            }
          }
        } else {
          for (const dist of distribuicao) {
            mapa[dist.operadorId] = {
              operacoes: new Set(dist.operacoes),
              tempoTotal: dist.cargaHoraria,
              temposOperacoes: { ...(dist.temposOperacoes || {}) },
            };
          }
        }

        let numeroOperadores =
          pickNumber(r, ["num_operators", "numero_operadores", "numeroOperadores"]) ??
          Object.keys(mapa).length;

        if (Object.keys(mapa).length === 0 && numeroOperadores > 0) {
          for (let i = 1; i <= numeroOperadores; i++) {
            const operadorId = `OP${String(i).padStart(2, "0")}`;
            mapa[operadorId] = { operacoes: new Set(), tempoTotal: 0, temposOperacoes: {} };
          }
        }

        if (distribuicao.length === 0) {
          distribuicao = Object.entries(mapa).map(([operadorId, dados]) => ({
            operadorId,
            operacoes: ordenarOperacoesPelaBase(Array.from(dados.operacoes), operacoes),
            cargaHoraria: dados.tempoTotal,
            ocupacao: tempoCiclo > 0 ? (dados.tempoTotal / tempoCiclo) * 100 : 0,
            ciclosPorHora: dados.tempoTotal > 0 ? 60 / dados.tempoTotal : 0,
            temposOperacoes: dados.temposOperacoes,
          }));
        }

        if (!numeroOperadores) numeroOperadores = distribuicao.length;
        const ocupacaoTotal =
          pickNumber(r, ["occupancy_total", "ocupacao_total", "total_occupancy", "total_load"]) ??
          distribuicao.reduce((sum, dist) => sum + dist.cargaHoraria * 60, 0);

        const resultadosApi = {
          espinha: (r as any)?.espinha ?? (r as any)?.Espinha ?? null,
          layouts: (r as any)?.layouts ?? null,
          distribuicao,
          operation_allocations: operationAllocations,
          share_per_operator_seconds: (r as any)?.share_per_operator_seconds ?? (r as any)?.sharePerOperatorSeconds ?? null,
          table_data: (r as any)?.table_data ?? (r as any)?.tableData ?? (r as any)?.operator_table ?? (r as any)?.operatorTable ?? (r as any)?.results_table ?? null,
          machine_layout: (r as any)?.machine_layout ?? (r as any)?.machineLayout ?? null,
          operator_flow: (r as any)?.espinha?.operator_flow ?? null,
          machine_times_per_operator: (r as any)?.machine_times_per_operator ?? (r as any)?.machineTimesPerOperator ?? null,
          operator_slots: normalizeOperatorSlotsInline((r as any)?.operator_slots ?? (r as any)?.operatorSlots),
          kpis: (r as any)?.kpis ?? null,
          machines_used: (r as any)?.machines_used ?? null,
          required: ((r as any)?.machines_used?.required ?? (r as any)?.required) ?? null,
          overall_avg_time_seconds: pickNumber(((r as any)?.machines_used ?? {}), ["overall_avg_time_seconds"]) ?? pickNumber(r, ["overall_avg_time_seconds"]) ?? undefined,
          taktTime,
          tempoCiclo,
          cycle_time_seconds: tempoCicloApi ?? undefined,
          balance_loss: perdas,
          production_per_hour: numeroCiclosPorHora,
          estimated_productivity: produtividade,
          numeroCiclosPorHora,
          produtividade,
          perdas,
          numeroOperadores,
          ocupacaoTotal,
        };
        const resultadosBaseComum = resultadosApi as ResultadosBalanceamento;
        const resultadosPorTipo = {
          linha: {
            ...(resultadosBaseComum as any),
            machine_layout: resolveMachineLayoutPorTipoInline(r, "linha"),
          } as ResultadosBalanceamento,
          espinha: {
            ...(resultadosBaseComum as any),
            machine_layout: resolveMachineLayoutPorTipoInline(r, "espinha"),
          } as ResultadosBalanceamento,
        } as Partial<Record<"linha" | "espinha", ResultadosBalanceamento>>;

        const dataToPass = {
          resultados: resultadosPorTipo[layoutConfig.tipoLayout] ?? resultadosApi,
          resultadosPorTipo,
          operadores,
          operacoes,
          config,
          layoutConfig,
          taskCode: taskCodeSelecionado,
          ajusteBodyBase: r,
          ajusteBodyBasePorTipo: { linha: r, espinha: r },
          swapBaseRaw: r,
          swapBaseRawPorTipo: { linha: r, espinha: r },
        };

        sessionStorage.setItem("balanceamentoData", JSON.stringify(dataToPass));
        mostrarResultadosNaPagina(dataToPass);
        return;
      }
      // Modo 3: usar endpoint por numero de operadores
      if (usarAllocateNumeroOperadoresApi) {
        if (!taskCodeSelecionado) {
          alert("Nao foi possivel identificar o codigo da ficha tecnica para calcular.");
          return;
        }

        const numeroOperadoresEfetivo = Number(numeroOperadoresInput || config.numeroOperadores || operadoresSelecionados.length || 0);
        const numeroOperadoresPedido = Math.max(1, Math.trunc(numeroOperadoresEfetivo));
        if (!Number.isFinite(numeroOperadoresPedido) || numeroOperadoresPedido <= 0) {
          alert("Defina um numero de operadores valido.");
          return;
        }

        const normalizarRatio = (valor: number) => {
          if (!Number.isFinite(valor)) return 0;
          return valor > 1 ? valor / 100 : valor;
        };
        const limitNotDivideUpper = Math.max(1.01, Number(config.naoDividirMaiorQue) || 1.1);
        const limitNotDivideLower = Math.min(0.99, Math.max(0, Number(config.naoDividirMenorQue) || 0.9));
        const maxPosts = getMaxPostsPayload();

        const payloadBase = {
          efficiency: normalizarRatio(config.produtividadeEstimada),
          work_hours: config.horasTurno,
          limit_not_assign: normalizarRatio(config.cargaMaximaOperador),
          limit_not_divide_upper: limitNotDivideUpper,
          limit_not_divide_lower: limitNotDivideLower,
          max_posts: maxPosts,
          num_operators: numeroOperadoresPedido,
          max_position_deviation: Math.max(1, Number(layoutConfig.distanciaMaxima) || 1),
          position_deviation_mode: layoutConfig.permitirRetrocesso ? "both" : "forward",
        };
        const endpointModo3 = config.agruparMaquinas
          ? "allocate-grouped-manual"
          : "allocate-manual";
        const resposta = await axios.post(
          `${API_BASE_URL}/tasks/${encodeURIComponent(taskCodeSelecionado)}/${endpointModo3}`,
          payloadBase
        );
        const r = ensureRecord(resposta.data) ?? {};
        const taktTime = (pickNumber(r, ["takt_time_seconds", "takt_time", "taktTime"]) ?? 0) / 60;
        const tempoCicloApi = pickNumber(r, ["real_cycle_time_seconds", "cycle_time_seconds", "cycle_time", "tempo_ciclo_segundos"]);
        const tempoCiclo = tempoCicloApi != null
          ? (tempoCicloApi > 10 ? tempoCicloApi / 60 : tempoCicloApi)
          : 0;
        const numeroCiclosPorHora = pickNumber(r, ["production_per_hour", "numero_ciclos_por_hora"]) ?? (tempoCiclo > 0 ? 60 / tempoCiclo : 0);
        const produtividadeRaw = pickNumber(r, ["estimated_productivity", "productivity", "produtividade_estimada"]) ?? 0;
        const produtividade = produtividadeRaw <= 1 ? produtividadeRaw * 100 : produtividadeRaw;
        const perdas = Math.max(0, 100 - produtividade);

        const assignments = ensureArray(
          r.assignments ??
          r.allocations ??
          r.operator_allocations ??
          r.operator_assignments ??
          r.distribution ??
          r.distribuicao
        );
        const operationAllocations = ensureArray(
          r.operation_allocations ??
          r.operationAllocations
        );

        let distribuicao = extrairDistribuicaoDeTableData(r, operacoes, tempoCiclo, operadores);
        if (distribuicao.length === 0 && operationAllocations.length > 0) {
          distribuicao = extrairDistribuicaoDeOperationAllocations(operationAllocations, operacoes, operadores, tempoCiclo);
        }
        const mapa: Record<string, { operacoes: Set<string>; tempoTotal: number; temposOperacoes: Record<string, number> }> = {};

        if (distribuicao.length === 0) {
          for (const item of assignments) {
            const operadorRef = pickString(item, ["operator_id", "operador_id", "operator", "operador"]);
            if (!operadorRef) continue;
            const operadorId = mapOperatorToCode(operadorRef, operadores);

            const operacaoRef =
              pickString(item, ["operation_code", "operation_id", "operacao_id", "operation", "operacao"]) ||
              pickString(item, ["operation_name", "operacao_nome", "name", "nome"]);
            const operacaoId = operacaoRef ? findOperacaoIdByReferencia(operacaoRef, operacoes) || operacaoRef : "";

            const tempoSegundos = pickNumber(item, ["time_seconds", "tempo_segundos", "seconds"]);
            const tempoMinutos = tempoSegundos != null
              ? tempoSegundos / 60
              : (pickNumber(item, ["time_min", "time_minutes", "tempo_minutos", "minutes"]) ?? 0);

            if (!mapa[operadorId]) mapa[operadorId] = { operacoes: new Set(), tempoTotal: 0, temposOperacoes: {} };
            if (operacaoId) mapa[operadorId].operacoes.add(operacaoId);
            mapa[operadorId].tempoTotal += tempoMinutos;
            if (operacaoId) {
              mapa[operadorId].temposOperacoes[operacaoId] = (mapa[operadorId].temposOperacoes[operacaoId] || 0) + tempoMinutos;
            }
          }
        } else {
          for (const dist of distribuicao) {
            mapa[dist.operadorId] = {
              operacoes: new Set(dist.operacoes),
              tempoTotal: dist.cargaHoraria,
              temposOperacoes: { ...(dist.temposOperacoes || {}) },
            };
          }
        }

        let numeroOperadores =
          pickNumber(r, ["num_operators", "numero_operadores", "numeroOperadores"]) ??
          Object.keys(mapa).length;

        if (Object.keys(mapa).length === 0 && numeroOperadores > 0) {
          for (let i = 1; i <= numeroOperadores; i++) {
            const operadorId = `OP${String(i).padStart(2, "0")}`;
            mapa[operadorId] = { operacoes: new Set(), tempoTotal: 0, temposOperacoes: {} };
          }
        }

        if (distribuicao.length === 0) {
          distribuicao = Object.entries(mapa).map(([operadorId, dados]) => ({
            operadorId,
            operacoes: ordenarOperacoesPelaBase(Array.from(dados.operacoes), operacoes),
            cargaHoraria: dados.tempoTotal,
            ocupacao: tempoCiclo > 0 ? (dados.tempoTotal / tempoCiclo) * 100 : 0,
            ciclosPorHora: dados.tempoTotal > 0 ? 60 / dados.tempoTotal : 0,
            temposOperacoes: dados.temposOperacoes,
          }));
        }

        if (!numeroOperadores) numeroOperadores = distribuicao.length;
        const ocupacaoTotal =
          pickNumber(r, ["occupancy_total", "ocupacao_total", "total_occupancy", "total_load"]) ??
          distribuicao.reduce((sum, dist) => sum + dist.cargaHoraria * 60, 0);

        const resultadosApi = {
          espinha: (r as any)?.espinha ?? (r as any)?.Espinha ?? null,
          layouts: (r as any)?.layouts ?? null,
          distribuicao,
          operation_allocations: operationAllocations,
          share_per_operator_seconds: (r as any)?.share_per_operator_seconds ?? (r as any)?.sharePerOperatorSeconds ?? null,
          table_data: (r as any)?.table_data ?? (r as any)?.tableData ?? (r as any)?.operator_table ?? (r as any)?.operatorTable ?? (r as any)?.results_table ?? null,
          machine_layout: (r as any)?.machine_layout ?? (r as any)?.machineLayout ?? null,
          operator_flow: (r as any)?.espinha?.operator_flow ?? null,
          machine_times_per_operator: (r as any)?.machine_times_per_operator ?? (r as any)?.machineTimesPerOperator ?? null,
          operator_slots: normalizeOperatorSlotsInline((r as any)?.operator_slots ?? (r as any)?.operatorSlots),
          kpis: (r as any)?.kpis ?? null,
          machines_used: (r as any)?.machines_used ?? null,
          required: ((r as any)?.machines_used?.required ?? (r as any)?.required) ?? null,
          overall_avg_time_seconds: pickNumber(((r as any)?.machines_used ?? {}), ["overall_avg_time_seconds"]) ?? pickNumber(r, ["overall_avg_time_seconds"]) ?? undefined,
          taktTime,
          tempoCiclo,
          cycle_time_seconds: tempoCicloApi ?? undefined,
          balance_loss: perdas,
          production_per_hour: numeroCiclosPorHora,
          estimated_productivity: produtividade,
          numeroCiclosPorHora,
          produtividade,
          perdas,
          numeroOperadores,
          ocupacaoTotal,
        };
        const resultadosBaseComum = resultadosApi as ResultadosBalanceamento;
        const resultadosPorTipo = {
          linha: {
            ...(resultadosBaseComum as any),
            machine_layout: resolveMachineLayoutPorTipoInline(r, "linha"),
          } as ResultadosBalanceamento,
          espinha: {
            ...(resultadosBaseComum as any),
            machine_layout: resolveMachineLayoutPorTipoInline(r, "espinha"),
          } as ResultadosBalanceamento,
        } as Partial<Record<"linha" | "espinha", ResultadosBalanceamento>>;

        const dataToPass = {
          resultados: resultadosPorTipo[layoutConfig.tipoLayout] ?? resultadosApi,
          resultadosPorTipo,
          operadores,
          operacoes,
          config,
          layoutConfig,
          taskCode: taskCodeSelecionado,
          ajusteBodyBase: r,
          ajusteBodyBasePorTipo: { linha: r, espinha: r },
        };

        sessionStorage.setItem("balanceamentoData", JSON.stringify(dataToPass));
        mostrarResultadosNaPagina(dataToPass);
        return;
      }
      if (config.possibilidade === 4) {
        const assignments: {
          machine_name: string;
          operation_code: string;
          operation_name: string;
          operator_id: string;
          time_seconds: number;
        }[] = [];

        for (const op of operacoesManual) {
          const operadoresAtribuidos = atribuicoesManual[op.id] || [];
          const tempoTotalSegundos = op.tempo * 60;
          if (operadoresAtribuidos.length > 0) {
            const tempoPorOperadorSegundos = tempoTotalSegundos / operadoresAtribuidos.length;
            for (const operadorId of operadoresAtribuidos) {
              assignments.push({
                machine_name: op.tipoMaquina || "",
                operation_code: op.id,
                operation_name: op.nome,
                operator_id: operadorId,
                time_seconds: tempoPorOperadorSegundos,
              });
            }
          } else {
            assignments.push({
              machine_name: op.tipoMaquina || "",
              operation_code: op.id,
              operation_name: op.nome,
              operator_id: "",
              time_seconds: tempoTotalSegundos,
            });
          }
        }

        const taskCode = taskCodeSelecionado || grupoArtigoSelecionado || "custom";
        const payload = { assignments };
        const resposta = await axios.post(
          `${API_BASE_URL}/tasks/${encodeURIComponent(taskCode)}/allocate-custom`,
          payload
        );
        const r = ensureRecord(resposta.data) ?? {};
        // Mapear resposta da API para ResultadosBalanceamento
        const taktTime = (pickNumber(r, ["takt_time_seconds", "takt_time", "taktTime"]) ?? 0) / 60;
        const tempoCicloApi = pickNumber(r, ["real_cycle_time_seconds", "cycle_time_seconds", "cycle_time", "tempo_ciclo_segundos"]);
        const tempoCiclo = tempoCicloApi != null
          ? (tempoCicloApi > 10 ? tempoCicloApi / 60 : tempoCicloApi)
          : 0;
        const numeroCiclosPorHora = pickNumber(r, ["production_per_hour", "numero_ciclos_por_hora"]) ?? (tempoCiclo > 0 ? 60 / tempoCiclo : 0);
        const produtividadeRaw = pickNumber(r, ["estimated_productivity", "productivity", "produtividade_estimada"]) ?? 0;
        const produtividade = produtividadeRaw <= 1 ? produtividadeRaw * 100 : produtividadeRaw;
        const perdas = Math.max(0, 100 - produtividade);
        const numeroOperadores = r.num_operators ?? r.numero_operadores ?? r.numeroOperadores ?? new Set(assignments.map((a) => a.operator_id).filter(Boolean)).size;
        const operationAllocations = ensureArray(
          r.operation_allocations ??
          r.operationAllocations
        );

        // Construir distribuicao por operador a partir dos assignments enviados (por operacao)
        const mapa: Record<string, { operacoes: Set<string>; tempoTotal: number; temposOperacoes: Record<string, number> }> = {};
        for (const a of assignments) {
          if (!a.operator_id) continue;
          const operadorId = mapOperatorToCode(a.operator_id, operadoresDisponiveis);
          if (!mapa[operadorId]) mapa[operadorId] = { operacoes: new Set(), tempoTotal: 0, temposOperacoes: {} };
          mapa[operadorId].operacoes.add(a.operation_code);
          mapa[operadorId].tempoTotal += a.time_seconds / 60;
          mapa[operadorId].temposOperacoes[a.operation_code] =
            (mapa[operadorId].temposOperacoes[a.operation_code] || 0) + a.time_seconds / 60;
        }
        const distribuicao: DistItem[] = Object.entries(mapa).map(([operadorId, dados]) => ({
          operadorId,
          operacoes: ordenarOperacoesPelaBase(Array.from(dados.operacoes), operacoes),
          cargaHoraria: dados.tempoTotal,
          ocupacao: tempoCiclo > 0 ? (dados.tempoTotal / tempoCiclo) * 100 : 0,
          ciclosPorHora: dados.tempoTotal > 0 ? 60 / dados.tempoTotal : 0,
          temposOperacoes: dados.temposOperacoes,
        }));
        const ocupacaoTotal =
          pickNumber(r, ["occupancy_total", "ocupacao_total", "total_occupancy", "total_load"]) ??
          distribuicao.reduce((sum, dist) => sum + dist.cargaHoraria * 60, 0);

        const resultadosCustom = {
          espinha: (r as any)?.espinha ?? (r as any)?.Espinha ?? null,
          layouts: (r as any)?.layouts ?? null,
          distribuicao,
          operation_allocations: operationAllocations,
          share_per_operator_seconds: (r as any)?.share_per_operator_seconds ?? (r as any)?.sharePerOperatorSeconds ?? null,
          table_data: (r as any)?.table_data ?? (r as any)?.tableData ?? (r as any)?.operator_table ?? (r as any)?.operatorTable ?? (r as any)?.results_table ?? null,
          operator_flow: (r as any)?.espinha?.operator_flow ?? null,
          machine_times_per_operator: (r as any)?.machine_times_per_operator ?? (r as any)?.machineTimesPerOperator ?? null,
          operator_slots: normalizeOperatorSlotsInline((r as any)?.operator_slots ?? (r as any)?.operatorSlots),
          kpis: (r as any)?.kpis ?? null,
          machines_used: (r as any)?.machines_used ?? null,
          required: ((r as any)?.machines_used?.required ?? (r as any)?.required) ?? null,
          overall_avg_time_seconds: pickNumber(((r as any)?.machines_used ?? {}), ["overall_avg_time_seconds"]) ?? pickNumber(r, ["overall_avg_time_seconds"]) ?? undefined,
          taktTime,
          tempoCiclo,
          cycle_time_seconds: pickNumber(r, ["real_cycle_time_seconds", "cycle_time_seconds", "cycle_time", "tempo_ciclo_segundos"]) ?? undefined,
          balance_loss: perdas,
          production_per_hour: numeroCiclosPorHora,
          estimated_productivity: produtividade,
          numeroCiclosPorHora,
          produtividade,
          perdas,
          numeroOperadores,
          ocupacaoTotal,
        };

        const dataToPass = {
          resultados: resultadosCustom,
          operadores: operadoresDisponiveis,
          operacoes: operacoesManual,
          config,
          layoutConfig,
          taskCode,
          ajusteBodyBase: resposta.data,
          swapBaseRaw: resposta.data,
          swapBaseRawPorTipo: { linha: resposta.data, espinha: resposta.data },
        };

        sessionStorage.setItem("balanceamentoData", JSON.stringify(dataToPass));
        mostrarResultadosNaPagina(dataToPass);
        return;
      }

      const resultados = calcularBalanceamento(operadoresDisponiveis, operacoes, config);

      const dataToPass = {
        resultados,
        operadores: operadoresDisponiveis,
        operacoes,
        config,
        layoutConfig,
        taskCode: taskCodeSelecionado,
      };

      sessionStorage.setItem("balanceamentoData", JSON.stringify(dataToPass));

      const oleMedia =
        operadoresDisponiveis.reduce((sum, op) => sum + op.oleHistorico, 0) /
        operadoresDisponiveis.length;

      const novoRegisto = {
        id: `${Date.now()}-${unidadeAtiva}-${grupoArtigoSelecionado}`,
        timestamp: new Date(),
        unidade: unidadeAtiva,
        produtoId: grupoArtigoSelecionado,
        produtoNome: produto?.nome || "Sem produto",
        produtoReferencia: produto?.referencia || "",
        metodo: config.possibilidade,
        resultados,
        configuracao: config,
        oleMedia,
        numeroOperacoes: operacoes.length,
      };

      // Guardar no localStorage (via historico.ts)
      salvarHistorico(novoRegisto);

      // Guardar no ficheiro - inclui configuracao actual + historico actualizado
      await salvar({
        configuracao: {
          grupoArtigoSelecionado,
          operacoesManual,
          layoutConfig,
          dadosUnidades: {
            "1": {
              config: dadosUnidades[1].config,
              operadoresSelecionados: dadosUnidades[1].operadoresSelecionados,
              atribuicoesManual: dadosUnidades[1].atribuicoesManual,
            },
            "2": {
              config: dadosUnidades[2].config,
              operadoresSelecionados: dadosUnidades[2].operadoresSelecionados,
              atribuicoesManual: dadosUnidades[2].atribuicoesManual,
            },
            "3": {
              config: dadosUnidades[3].config,
              operadoresSelecionados: dadosUnidades[3].operadoresSelecionados,
              atribuicoesManual: dadosUnidades[3].atribuicoesManual,
            },
          },
        },
        historico: obterHistorico(),
      });

      mostrarResultadosNaPagina(dataToPass);
    } catch (error) {
      console.error("Erro ao calcular balanceamento:", error);
      if (axios.isAxiosError(error) && error.response?.status === 422) {
        const data = error.response?.data as { detail?: unknown } | undefined;
        let mensagem422 = "";
        if (data?.detail && typeof data.detail === "object") {
          const detail = data.detail as { message?: unknown };
          if (typeof detail.message === "string" && detail.message.trim()) {
            mensagem422 = detail.message;
          }
        }
        setErroCalculoModal(mensagem422 || extrairMensagemErro(error));
        return;
      }
      alert(`Erro ao calcular balanceamento:\n${extrairMensagemErro(error)}`);
    }
  };

  useEffect(() => {
    if (!autoRecalcularLayoutRef.current) return;
    autoRecalcularLayoutRef.current = false;
    if (!resultadosInlineData) return;
    suppressResultadosScrollRef.current = true;
    if (temAdjustInline && ajusteBodyBaseInline && taskCodeInline) {
      void handleRecalcularLayoutComAdjustInline(layoutConfig);
      return;
    }
    void handleCalcular(true);
  }, [
    ajusteBodyBaseInline,
    handleRecalcularLayoutComAdjustInline,
    layoutConfig.tipoLayout,
    layoutConfig.postosPorLado,
    layoutConfig.distanciaMaxima,
    layoutConfig.permitirRetrocesso,
    taskCodeInline,
    temAdjustInline,
  ]);

  const [seccoesExpandidas, setSeccoesExpandidas] = useState({
    grupoArtigo: true,
    configuracaoDistribuicao: true,
    tabelaManual: true,
  });
  const toggleSeccao = (seccao: keyof typeof seccoesExpandidas) =>
    setSeccoesExpandidas((prev) => ({ ...prev, [seccao]: !prev[seccao] }));

  const familiaOptions = familias.map((familia) => ({
    value: familia.id,
    label: familia.label,
    keywords: [familia.id, familia.label],
  }));

  const produtoOptions = produtosApi.map((prod) => ({
    value: prod.id,
    label: prod.nome,
    keywords: [prod.id, prod.referencia, prod.nome, prod.descricao || ""],
    renderLabel: (
      <span className="flex w-full items-center justify-between gap-2">
        <span className="min-w-0 truncate">
          <span className="font-mono text-xs text-gray-500 mr-2">
            {prod.descricao || prod.referencia}
          </span>
          {prod.nome}
        </span>
        <span className="shrink-0 text-xs text-gray-400">({prod.operacoes.length} ops)</span>
      </span>
    ),
    renderSelectedLabel: (
      <span className="flex w-full items-center justify-between gap-2">
        <span className="min-w-0 truncate">
          <span className="font-mono text-xs text-gray-500 mr-2">
            {prod.descricao || prod.referencia}
          </span>
          {prod.nome}
        </span>
        <span className="shrink-0 text-xs text-gray-400">({prod.operacoes.length} ops)</span>
      </span>
    ),
  }));

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Render ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

  return (
    <main className="w-full px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Balanceamento de Linha</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Configure operadores e processos operacionais
          </p>
        </div>
        {/* <div className="flex items-center gap-3">
          <button
            onClick={() => setUnidadeAtiva(1)}
            className={`px-4 py-2 rounded-sm text-xs font-medium transition-colors ${
              unidadeAtiva === 1
                ? "bg-blue-500 text-white border border-blue-600"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            LINHA 1
          </button>
        </div> */}
      </div>

      {/* Selecao de Grupo de Artigo */}
      {config.possibilidade !== 4 && erroApi && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm flex items-center gap-2 text-amber-700 text-sm">
          <AlertTriangle className="w-4 h-4" />
          {erroApi}
        </div>
      )}

      {config.possibilidade !== 4 && (
        <div className="bg-white rounded-sm border border-gray-200 shadow-sm">
          <div
            className="p-3 border-b border-gray-200 cursor-pointer select-none hover:bg-gray-50 transition-colors"
            onClick={() => toggleSeccao("grupoArtigo")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-700" />
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Selecao de Grupo de Artigo</h3>
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${seccoesExpandidas.grupoArtigo ? "rotate-180" : ""}`}
              />
            </div>
          </div>
          {seccoesExpandidas.grupoArtigo && (
            <div className="p-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-gray-600">
                    Grupo de Artigo
                  </Label>
                  <SearchableCombobox
                    value={grupoArtigoSelecionado || undefined}
                    onValueChange={setGrupoArtigoSelecionado}
                    options={familiaOptions}
                    placeholder={loadingFamilias ? "A carregar grupos..." : "Selecione um grupo"}
                    searchPlaceholder="Pesquisar grupo..."
                    emptyText="Nenhum grupo encontrado."
                    disabled={loadingFamilias || familias.length === 0}
                    triggerClassName="rounded-sm text-sm"
                    contentClassName="rounded-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase text-gray-600">
                    Ficha Tecnica
                  </Label>
                  <SearchableCombobox
                    value={produtoSelecionado || undefined}
                    onValueChange={handleSelecionarFicha}
                    options={produtoOptions}
                    placeholder={
                      loadingFichas
                        ? "A carregar fichas..."
                        : "Selecione uma ficha tecnica"
                    }
                    searchPlaceholder="Pesquisar ficha..."
                    emptyText="Nenhuma ficha encontrada."
                    disabled={loadingFichas || produtosApi.length === 0}
                    triggerClassName="rounded-sm text-sm"
                    contentClassName="rounded-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Configuracao de Distribuicao */}
      <div className="bg-white rounded-sm border border-gray-200 shadow-sm">
        <div
          className="p-5 border-b border-gray-200 cursor-pointer select-none hover:bg-gray-50 transition-colors"
          onClick={() => toggleSeccao("configuracaoDistribuicao")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-700" />
              <h3 className="text-base font-semibold text-gray-900">Configuracao de Distribuicao</h3>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${seccoesExpandidas.configuracaoDistribuicao ? "rotate-180" : ""}`}
            />
          </div>
        </div>
        {seccoesExpandidas.configuracaoDistribuicao && (
           <div className="p-5">
            <ConfiguracaoDistribuicaoComponent
              config={config}
              onChange={handleConfigChange}
              numeroOperadoresDisponiveis={operadoresSelecionados.length}
              operacoes={operacoes}
              onCalcularOperadoresNecessarios={handleCalcularOperadoresNecessarios}
              horasTurno={config.horasTurno}
              produtividadeEstimada={config.produtividadeEstimada}
              quantidadeObjetivoInput={quantidadeObjetivoInput}
              numeroOperadoresInput={numeroOperadoresInput}
              usarAllocateModo1Api={usarAllocateModo1Api}
              totalOperadoresLinha={operadores.length}
              onHorasTurnoChange={(value) => handleConfigChange({ ...config, horasTurno: value })}
              onProdutividadeEstimadaChange={(value) => handleConfigChange({ ...config, produtividadeEstimada: value })}
              onQuantidadeObjetivoInputChange={(raw) => {
                setQuantidadeObjetivoInput(raw);
              }}
              onQuantidadeObjetivoCommit={(raw) => {
                if (!raw) {
                  handleConfigChange({ ...config, quantidadeObjetivo: undefined });
                  return;
                }
                const quantidade = Number(raw);
                if (!Number.isFinite(quantidade)) return;
                handleConfigChange({ ...config, quantidadeObjetivo: quantidade });
                if (quantidade > 0) handleCalcularOperadoresNecessarios(quantidade);
              }}
              onNumeroOperadoresInputChange={(raw) => {
                setNumeroOperadoresInput(raw);
              }}
              onNumeroOperadoresCommit={(raw) => {
                if (!raw) {
                  handleConfigChange({ ...config, numeroOperadores: undefined });
                  return;
                }
                const typed = Number(raw);
                if (!Number.isFinite(typed)) return;
                const num = Math.max(1, Math.trunc(typed));
                setNumeroOperadoresInput(String(num));
                handleConfigChange({ ...config, numeroOperadores: num });
                }}
              permitirRetrocesso={layoutConfig.permitirRetrocesso}
              distanciaMaxima={layoutConfig.distanciaMaxima}
              onPermitirRetrocessoChange={(value) =>
                setLayoutConfig((prev) => ({ ...prev, permitirRetrocesso: value }))
              }
              onDistanciaMaximaChange={(value) =>
                setLayoutConfig((prev) => ({ ...prev, distanciaMaxima: value }))
              }
            />
          </div>
        )}
      </div>

      {/* Tabela de Operacoes Manual */}
      {config.possibilidade === 4 && (
        <div className="bg-white rounded-sm border border-gray-200 shadow-sm">
          <div
            className="p-5 border-b border-gray-200 cursor-pointer select-none hover:bg-gray-50 transition-colors"
            onClick={() => toggleSeccao("tabelaManual")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-sm flex items-center justify-center">
                  <Edit3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Entrada Manual de Operações</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Preencha os dados das operações diretamente na tabela. Clique numa célula para editar.
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${seccoesExpandidas.tabelaManual ? "rotate-180" : ""}`}
              />
            </div>
          </div>
          {seccoesExpandidas.tabelaManual && (
            <div className="p-5">
              <TabelaOperacoesManual
                operacoes={operacoesManual}
                onOperacoesChange={(ops) => {
                  const lista = ops.length === 0
                    ? [{
                        id: "OP001",
                        nome: "",
                        tempo: 0,
                        tipoMaquina: "",
                        largura: 190,
                        ponto: "",
                        setup: "Standard",
                        permitirAgrupamento: true,
                        sequencia: 1,
                      }]
                    : ops;
                  setOperacoesManual(lista);
                }}
                operadores={operadores.filter((op) => operadoresSelecionados.includes(op.id))}
                atribuicoes={atribuicoesManual}
                onAtribuicaoChange={handleAtribuirManualmente}
              />
            </div>
          )}
        </div>
      )}

      {/* Botão Calcular */}
      <div className="flex justify-center pt-4">
        <Button
          type="button"
          size="lg"
               onClick={() => handleCalcular(true)}
           disabled={(!usarAllocateModo1Api && !usarAllocateIdealApi && operadoresSelecionados.length === 0) || operacoes.length === 0}
          className="px-12 py-6 text-sm font-semibold bg-blue-500 hover:bg-blue-600 rounded-sm uppercase tracking-wide"
        >
          <Calculator className="w-5 h-5 mr-2" />
          Calcular Balanceamento
        </Button>
      </div>

      {resultadosInlineData && resultadosAtuaisInline && configAtualInline && (
        <section ref={resultadosRef} className="pt-4 space-y-6">
          {/* Dialogs de erro/sucesso do inline */}
          <Dialog open={Boolean(erroPopupInline)} onOpenChange={(open) => { if (!open) setErroPopupInline(null); }}>
            <DialogContent className="max-w-md rounded-sm">
              <DialogHeader>
                <DialogTitle>Erro</DialogTitle>
                <DialogDescription>
                  <div className="whitespace-pre-wrap">{erroPopupInline || ""}</div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          <Dialog open={Boolean(sucessoPopupInline)} onOpenChange={(open) => { if (!open) setSucessoPopupInline(null); }}>
            <DialogContent className="max-w-md rounded-sm">
              <DialogHeader>
                <DialogTitle>Sucesso</DialogTitle>
                <DialogDescription>
                  <div className="whitespace-pre-wrap">{sucessoPopupInline || ""}</div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>

          {/* Header inline */}
          <div className="sticky top-[53px] z-40 bg-white border-b border-gray-200 print:hidden shadow-sm">
            <div className="w-full px-6 py-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-px bg-gray-200"></div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-100 rounded-sm flex items-center justify-center">
                      <Calculator className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">Análise de Resultados</h2>
                      <p className="text-gray-500 text-[10px]">Relatório do balanceamento calculado</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportInline} className="text-gray-600 border-gray-200 hover:bg-gray-50 rounded-sm text-[10px] h-7 px-2.5">
                    <Download className="w-3 h-3 mr-1.5" />
                    Exportar
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportPdfInline} className="text-gray-600 border-gray-200 hover:bg-gray-50 rounded-sm text-[10px] h-7 px-2.5">
                    <FileDown className="w-3 h-3 mr-1.5" />
                    Exportar PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)] gap-6 items-start xl:items-stretch">
            <div className="sticky top-[95px] z-30 bg-gray-50 xl:h-full">
              <ResumoResultados
                resultados={resultadosAtuaisInline}
                config={configAtualInline}
                mostrarTaktTime={Number(configAtualInline?.possibilidade) === 2}
                layout="column"
              />
            </div>
            <div className="space-y-6 min-w-0">
              <DashboardResultados
                resultados={resultadosAtuaisInline}
                operadores={resultadosInlineData.operadores}
                operacoes={resultadosInlineData.operacoes}
                config={configAtualInline}
                onRecalcular={handleRecalcularInline}
                viewMode={viewModeInline}
                onViewModeChange={setViewModeInline}
                onConfirmarEdicao={handleConfirmarEdicaoInline}
                onGuardarHistorico={handleGuardarHistoricoInline}
                isAjustando={isAjustando}
                isGuardandoHistorico={isGuardandoHistorico}
                showTabela={false}
                onAtribuirColuna={handleAtribuirColunaIdeal}
                isIdealSemOle={configAtualInline.possibilidade === 5}
              />
            </div>
          </div>

          {configAtualInline.possibilidade === 5 ? (
            <div className="rounded-sm border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Progresso de Atribuição</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {idealAssignedCollaboratorIds.size} de {idealAssignmentMax} operadores atribuídos
                  </div>
                </div>
                <span className="font-mono text-sm font-semibold text-blue-600">
                  {Math.round(Math.min(100, (idealAssignedCollaboratorIds.size / idealAssignmentMax) * 100))}%
                </span>
              </div>
              <Progress
                value={Math.min(100, (idealAssignedCollaboratorIds.size / idealAssignmentMax) * 100)}
                className="h-2"
              />
            </div>
          ) : null}

          <DashboardResultados
            resultados={resultadosAtuaisInline}
            operadores={resultadosInlineData.operadores}
            operacoes={resultadosInlineData.operacoes}
            config={configAtualInline}
            onRecalcular={handleRecalcularInline}
            viewMode={viewModeInline}
            onViewModeChange={setViewModeInline}
            onConfirmarEdicao={handleConfirmarEdicaoInline}
            onGuardarHistorico={handleGuardarHistoricoInline}
            isAjustando={isAjustando}
            isGuardandoHistorico={isGuardandoHistorico}
            showOccupacaoCard={false}
            onAtribuirColuna={handleAtribuirColunaIdeal}
            isIdealSemOle={configAtualInline.possibilidade === 5}
          />

          <VisualizadorFluxo
            resultados={resultadosAtuaisInline}
            operadores={resultadosInlineData.operadores}
            operacoes={resultadosInlineData.operacoes}
            layoutConfig={layoutConfig}
            viewMode={viewModeInline === "ole" ? "tempo" : viewModeInline}
            agruparPorMaquina={configAtualInline.agruparMaquinas}
            onTipoLayoutChange={(tipo) => {
              if (layoutConfig.tipoLayout === tipo) return;
              const resultadoTipo = resultadosPorTipoInline[tipo];
              const ajusteTipo = ajusteBodyBasePorTipoInline[tipo];
              if (resultadoTipo) setResultadosAtuaisInline(resultadoTipo);
              if (ajusteTipo) setAjusteBodyBaseInline(ajusteTipo);
              setLayoutConfig((prev) => ({
                ...prev,
                tipoLayout: tipo,
                postosPorLado: tipo === "espinha" ? 16 : 8,
              }));
            }}
            onLayoutConfigChange={(next) => {
              autoRecalcularLayoutRef.current = true;
              setLayoutConfig(next);
            }}
            onSwapPositions={handleSwapPositionsInline}
          />
        </section>
      )}
      <Dialog
        open={Boolean(idealAssignmentColumn)}
        onOpenChange={(open) => {
          if (!open) {
            setIdealAssignmentColumn(null);
            setIdealCollaboratorSearch("");
          }
        }}
      >
        <DialogContent className="w-[min(96vw,760px)] max-w-2xl overflow-x-hidden rounded-sm">
          <DialogHeader>
            <DialogTitle>Atribuir colaborador a {idealAssignmentColumn || "coluna"}</DialogTitle>
            <DialogDescription>
              Escolhe o colaborador que ficará associado a esta coluna.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Operadores atribuídos</span>
              <span className="font-mono font-semibold text-gray-900">
                {idealAssignedCollaboratorIds.size} / {idealAssignmentMax}
              </span>
            </div>
            <Progress
              value={Math.min(100, (idealAssignedCollaboratorIds.size / idealAssignmentMax) * 100)}
              className="h-2"
            />
          </div>
          <Input
            value={idealCollaboratorSearch}
            onChange={(event) => setIdealCollaboratorSearch(event.target.value)}
            placeholder="Pesquisar por ID ou nome..."
            className="rounded-sm text-sm"
            disabled={idealCollaboratorsLoading || isAjustando}
          />
          <div className="max-h-96 min-w-0 max-w-full space-y-1 overflow-x-hidden overflow-y-auto">
            {idealCollaboratorsLoading ? (
              <div className="py-6 text-center text-sm text-gray-500">A carregar colaboradores...</div>
            ) : idealCollaboratorsFiltered.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500">Nenhum colaborador encontrado.</div>
            ) : idealCollaboratorsFiltered.map((collaborator, index) => {
              const id = pickString(collaborator, ["collaborator_id", "collaboratorId", "id", "operator_id", "operador_id"]);
              const name = pickString(collaborator, ["collaborator_name", "collaboratorName", "name", "nome"]) || id;
              const oleDetails = idealOleDetails[normalizeKey(id)] || { operacoes: [] };
              const isOleExpanded = false;
              const alreadyAssignedElsewhere = false;
              return (
                <Button
                  key={`${id}-${index}`}
                  type="button"
                  variant="outline"
                  className="w-full min-w-0 justify-start rounded-sm text-left"
                  disabled={isAjustando}
                  title={alreadyAssignedElsewhere ? "Este colaborador já está atribuído a outra coluna" : undefined}
                  onClick={() => void handleConfirmarAtribuicaoIdeal(collaborator)}
                >
                  <span className="flex min-w-0 w-full items-center gap-2">
                    <span className="font-mono text-xs mr-2">{id}</span>
                    <span className="min-w-0 flex-1 truncate text-left">{name}</span>
                    <span className="text-[11px] text-gray-500">
                      Média OLE: {oleDetails.media != null ? `${oleDetails.media.toFixed(1)}%` : "—"}
                    </span>
                    {true ? (
                      <span
                        role="button"
                        tabIndex={0}
                        className="text-[11px] text-blue-600 hover:underline"
                        onClick={(event) => {
                          event.stopPropagation();
                          setIdealOleDetailsCollaborator({ id, name });
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            setIdealOleDetailsCollaborator({ id, name });
                          }
                        }}
                      >
                        {isOleExpanded ? "Esconder" : "Ver mais"}
                      </span>
                    ) : null}
                  </span>
                  {isOleExpanded ? (
                    <span className="mt-1 w-full border-t border-gray-200 pt-1 text-left text-[11px] font-normal text-gray-600">
                      <span className="block font-medium text-gray-700">
                        Média OLE: {oleDetails.media != null ? `${oleDetails.media.toFixed(1)}%` : "—"}
                      </span>
                      {oleDetails.operacoes.map((operation) => (
                        <span key={operation.id} className="block">
                          {operation.nome || operation.id}: {operation.ole != null ? `${operation.ole.toFixed(1)}%` : "—"}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(idealOleDetailsCollaborator)}
        onOpenChange={(open) => {
          if (!open) setIdealOleDetailsCollaborator(null);
        }}
      >
        <DialogContent className="max-w-sm rounded-sm">
          <DialogHeader>
            <DialogTitle>Operações de {idealOleDetailsCollaborator?.name || "colaborador"}</DialogTitle>
            <DialogDescription>OLE das operações consideradas para este candidato.</DialogDescription>
          </DialogHeader>
          {idealOleDetailsCollaborator ? (() => {
            const details = idealOleDetails[normalizeKey(idealOleDetailsCollaborator.id)] || { operacoes: [] };
            return (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-sm bg-gray-50 px-3 py-2">
                  <span className="text-gray-600">Média OLE</span>
                  <span className="font-semibold text-gray-900">
                    {details.media != null ? `${details.media.toFixed(1)}%` : "—"}
                  </span>
                </div>
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {details.operacoes.length === 0 ? (
                    <div className="py-4 text-center text-xs text-gray-500">Sem operações disponíveis.</div>
                  ) : details.operacoes.map((operation) => (
                    <div key={operation.id} className="flex items-center justify-between rounded-sm border px-3 py-2">
                      <span className="truncate pr-3">{operation.nome || operation.id}</span>
                      <span className="font-mono text-xs font-semibold text-gray-700">
                        {operation.ole != null ? `${operation.ole.toFixed(1)}%` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })() : null}
        </DialogContent>
      </Dialog>
      <Dialog
        open={confirmarCalculoModal.open}
        onOpenChange={(open) => {
          if (!open) setConfirmarCalculoModal({ open: false, identificador: "" });
        }}
      >
        <DialogContent className="rounded-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
              Confirmar balanceamento
            </DialogTitle>
            <DialogDescription className="text-xs bg-amber-50 border border-amber-200 rounded-sm px-3 py-2 text-amber-700">
              Confirmar balanceamento para <strong>{confirmarCalculoModal.identificador}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-sm text-xs cursor-pointer"
              onClick={() => setConfirmarCalculoModal({ open: false, identificador: "" })}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-amber-600 hover:bg-amber-700 rounded-sm text-xs cursor-pointer"
              onClick={async () => {
                setConfirmarCalculoModal({ open: false, identificador: "" });
                await handleCalcular(true);
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(erroCalculoModal)}
        onOpenChange={(open) => {
          if (!open) setErroCalculoModal(null);
        }}
      >
        <DialogContent className="rounded-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Erro ao calcular balanceamento</DialogTitle>
            <DialogDescription className="text-xs">
              <div className="whitespace-pre-wrap">{erroCalculoModal || "Ocorreu um erro inesperado."}</div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              className="bg-orange-600 hover:bg-orange-700 rounded-sm text-xs"
              onClick={() => setErroCalculoModal(null)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}



