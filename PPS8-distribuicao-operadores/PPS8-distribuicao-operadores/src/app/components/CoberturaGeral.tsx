import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { Info, Pencil, Save, X } from "lucide-react";

type RecordApi = Record<string, any>;
type Operation = { id: string; name: string; capable: number; levels: Record<string, number> };
type Family = {
  id: string;
  name: string;
  operations: Operation[];
  levelCounts: Record<string, number>;
  levelCountsPct: Record<string, number>;
};

const DEFAULT_COVERAGE_THRESHOLDS = [10, 25, 50];
const DEFAULT_OLE_THRESHOLDS = [50, 70, 85];
const DEFAULT_LEVEL_MATRIX: number[][] = [
  [1, 1, 2, 2],
  [1, 2, 2, 3],
  [2, 2, 3, 4],
  [2, 3, 4, 4],
];


const normalizeThresholds = (
  value: unknown,
  fallback: number[],
): number[] => {
  if (!Array.isArray(value) || value.length !== 3) {
    return [...fallback];
  }

  const parsed = value.map(Number);

  if (!parsed.every(Number.isFinite)) {
    return [...fallback];
  }

  return parsed;
};

const array = (value: unknown): RecordApi[] =>
  Array.isArray(value) ? (value as RecordApi[]) : [];
const text = (item: RecordApi, keys: string[]) => {
  for (const key of keys) {
    if (item[key] != null && String(item[key]).trim())
      return String(item[key]).trim();
  }
  return "";
};
const number = (item: RecordApi, keys: string[]) => { for (const key of keys) { const value = Number(item[key]); if (Number.isFinite(value)) return value; } return 0; };

const levelColors: Record<string, string> = { "1": "#F26B6B", "2": "#F2B84B", "3": "#4F8EDC", "4": "#35B779" };
const proficiencyMatrix = [
  {
    coverage: "< 10% da gama",
    levels: [1, 1, 2, 2],
  },
  {
    coverage: "10–25% da gama",
    levels: [1, 2, 2, 3],
  },
  {
    coverage: "25–50% da gama",
    levels: [2, 2, 3, 4],
  },
  {
    coverage: "≥ 50% da gama",
    levels: [2, 3, 4, 4],
  },
];

const proficiencyLevelColors: Record<number, string> = {
  1: levelColors["1"],
  2: levelColors["2"],
  3: levelColors["3"],
  4: levelColors["4"],
};


function Donut({ countsPct }: { countsPct: Record<string, number> }) {
  let offset = 0;

  const parts = ["1", "2", "3", "4"].map((level) => {
    const value = countsPct[level] ?? 0;
    const start = offset;
    offset += value;

    return `${levelColors[level]} ${start}% ${offset}%`;
  });

  const dominantLevel = Object.entries(countsPct).sort(
    ([, pctA], [, pctB]) => pctB - pctA,
  )[0];

  const dominantLevelKey = dominantLevel?.[0];
  const dominantPct = dominantLevel?.[1] ?? 0;

  const hasData = Object.values(countsPct).some((value) => value > 0);

  const dominantColor =
    dominantLevelKey && levelColors[dominantLevelKey]
      ? levelColors[dominantLevelKey]
      : "#64748b";

  return (
    <div
      className="relative h-30 w-30 shrink-0 rounded-full"
      style={{
        background: hasData ? `conic-gradient(${parts.join(", ")})` : "#e5e7eb",
      }}
    >
      <div className="absolute inset-[21px] flex flex-col items-center justify-center rounded-full bg-slate-100 text-center">
        <span className="text-xl font-bold" style={{ color: dominantColor }}>
          {hasData ? `${dominantPct.toFixed(1)}%` : "N/D"}
        </span>

        <span className="text-[10px] font-bold uppercase leading-tight text-gray-700">
          nível {hasData ? dominantLevelKey : "—"}
        </span>
      </div>
    </div>
  );
}

export function CoberturaGeral() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLevelsInfo, setShowLevelsInfo] = useState(false);
  const [coverageThresholds, setCoverageThresholds] = useState<number[]>(
    DEFAULT_COVERAGE_THRESHOLDS,
  );

  const [oleThresholds, setOleThresholds] = useState<number[]>(
    DEFAULT_OLE_THRESHOLDS,
  );

  const [draftCoverageThresholds, setDraftCoverageThresholds] = useState<
    number[]
  >(DEFAULT_COVERAGE_THRESHOLDS);

  const [draftOleThresholds, setDraftOleThresholds] = useState<number[]>(
    DEFAULT_OLE_THRESHOLDS,
  );

  const [editingThresholds, setEditingThresholds] = useState(false);

  const [savingThresholds, setSavingThresholds] = useState(false);

  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [levelMatrix, setLevelMatrix] =
    useState<number[][]>(DEFAULT_LEVEL_MATRIX);

  const [draftLevelMatrix, setDraftLevelMatrix] = useState<number[][]>(
    DEFAULT_LEVEL_MATRIX.map((row) => [...row]),
  );

  const normalizeLevelMatrix = (
    value: unknown,
    fallback: number[][],
  ): number[][] => {
    if (!Array.isArray(value) || value.length !== 4) {
      return fallback.map((row) => [...row]);
    }

    const parsed = value.map((row) =>
      Array.isArray(row) ? row.map(Number) : [],
    );

    const valid =
      parsed.every((row) => row.length === 4) &&
      parsed
        .flat()
        .every((level) => Number.isInteger(level) && level >= 1 && level <= 4);

    return valid ? parsed : fallback.map((row) => [...row]);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/polyvalence/coverage-overview`,
        );
        const data =
          response.data && typeof response.data === "object"
            ? (response.data as RecordApi)
            : {};
        const meta =
          data.meta && typeof data.meta === "object"
            ? (data.meta as RecordApi)
            : {};

        const loadedCoverageThresholds = normalizeThresholds(
          meta.coverage_thresholds,
          DEFAULT_COVERAGE_THRESHOLDS,
        );

        const loadedOleThresholds = normalizeThresholds(
          meta.ole_thresholds,
          DEFAULT_OLE_THRESHOLDS,
        );

        const loadedLevelMatrix = normalizeLevelMatrix(
          meta.level_matrix,
          DEFAULT_LEVEL_MATRIX,
        );

        if (active) {
          setCoverageThresholds(loadedCoverageThresholds);
          setDraftCoverageThresholds(loadedCoverageThresholds);

          setOleThresholds(loadedOleThresholds);
          setDraftOleThresholds(loadedOleThresholds);

          setLevelMatrix(loadedLevelMatrix);
          setDraftLevelMatrix(loadedLevelMatrix.map((row) => [...row]));
        }
        const loaded = array(data.families).map((family) => ({
          id: text(family, ["family_id", "id", "code"]),

          name: text(family, ["family_name", "name", "label"]) || "Família",

          levelCounts: Object.fromEntries(
            Object.entries(
              (family.family_level_counts ??
                family.familyLevelCounts ??
                {}) as RecordApi,
            ).map(([level, count]) => [level, Number(count) || 0]),
          ),
          levelCountsPct: Object.fromEntries(
            Object.entries(
              (family.family_level_counts_pct ??
                family.familyLevelCountsPct ??
                {}) as RecordApi,
            ).map(([level, pct]) => [level, Number(pct) || 0]),
          ),

          operations: array(family.operations ?? family.operacoes).map(
            (item) => ({
              id: text(item, ["operation_id", "id", "code"]),

              name:
                text(item, ["operation_name", "name", "label"]) || "Operação",

              capable: number(item, ["operators_capable", "capable_operators"]),

              levels: Object.fromEntries(
                Object.entries(
                  (item.level_counts ?? item.levelCounts ?? {}) as RecordApi,
                ).map(([level, count]) => [level, Number(count) || 0]),
              ),
            }),
          ),
        }));
        if (active) setFamilies(loaded);
      } catch (err) {
        console.error("Erro ao carregar cobertura geral:", err);
        if (active) setError("Não foi possível carregar a cobertura geral.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);
  const cards = useMemo(
    () =>
      families
        .map((family) => {
          const counts: Record<string, number> = {
            "1": family.levelCounts["1"] ?? 0,
            "2": family.levelCounts["2"] ?? 0,
            "3": family.levelCounts["3"] ?? 0,
            "4": family.levelCounts["4"] ?? 0,
          };

          const countsPct: Record<string, number> = {
            "1": family.levelCountsPct["1"] ?? 0,
            "2": family.levelCountsPct["2"] ?? 0,
            "3": family.levelCountsPct["3"] ?? 0,
            "4": family.levelCountsPct["4"] ?? 0,
          };
          const covered = family.operations.filter(
            (operation) => operation.capable > 0,
          ).length;
          return {
            family,
            counts,
            countsPct,
            covered,
            fragile: [...family.operations]
              .sort((a, b) => a.capable - b.capable)
              .slice(0, 2),
          };
        })
        .sort(
          (a, b) =>
            (b.family.operations.length
              ? b.covered / b.family.operations.length
              : Number.NEGATIVE_INFINITY) -
            (a.family.operations.length
              ? a.covered / a.family.operations.length
              : Number.NEGATIVE_INFINITY),
        ),
    [families],
  );

  const handleGuardarThresholds = async () => {
    const next = draftOleThresholds.map(Number);
    const nextCoverage = draftCoverageThresholds.map(Number);

    const nextOle = draftOleThresholds.map(Number);

    if (nextCoverage.length !== 3 || !nextCoverage.every(Number.isFinite)) {
      setSettingsError("Os limites da cobertura têm de ser valores numéricos.");
      return;
    }

    if (nextOle.length !== 3 || !nextOle.every(Number.isFinite)) {
      setSettingsError("Os limites OLE têm de ser valores numéricos.");
      return;
    }

    const [coverageFirst, coverageSecond, coverageThird] = nextCoverage;

    if (
      coverageFirst < 0 ||
      coverageThird > 100 ||
      !(coverageFirst < coverageSecond && coverageSecond < coverageThird)
    ) {
      setSettingsError(
        "Os limites da cobertura devem estar entre 0 e 100 e em ordem crescente.",
      );
      return;
    }

    const [oleFirst, oleSecond, oleThird] = nextOle;

    if (
      oleFirst < 0 ||
      oleThird > 100 ||
      !(oleFirst < oleSecond && oleSecond < oleThird)
    ) {
      setSettingsError(
        "Os limites OLE devem estar entre 0 e 100 e em ordem crescente.",
      );
      return;
    }

    if (next.length !== 3 || !next.every(Number.isFinite)) {
      setSettingsError("Os limites OLE têm de ser valores numéricos.");
      return;
    }

    const [first, second, third] = next;

    if (first < 0 || third > 100 || !(first < second && second < third)) {
      setSettingsError(
        "Os limites OLE devem estar entre 0 e 100 e em ordem crescente.",
      );
      return;
    }

    setSavingThresholds(true);
    setSettingsError(null);

    try {
      await axios.put(`${API_BASE_URL}/polyvalence/settings`, {
        coverage_thresholds: nextCoverage,
        ole_thresholds: nextOle,
        level_matrix: draftLevelMatrix,
      });

      setCoverageThresholds(nextCoverage);
      setDraftCoverageThresholds(nextCoverage);

      setOleThresholds(nextOle);
      setDraftOleThresholds(nextOle);

      setLevelMatrix(draftLevelMatrix.map((row) => [...row]));

      setEditingThresholds(false);

      // Atualizar os dados porque a alteração dos thresholds
      // pode alterar a classificação dos níveis.
      const response = await axios.get(
        `${API_BASE_URL}/polyvalence/coverage-overview`,
      );

      const data =
        response.data && typeof response.data === "object"
          ? (response.data as RecordApi)
          : {};

      const loaded = array(data.families).map((family) => ({
        id: text(family, ["family_id", "id", "code"]),

        name: text(family, ["family_name", "name", "label"]) || "Família",

        levelCounts: Object.fromEntries(
          Object.entries(
            (family.family_level_counts ??
              family.familyLevelCounts ??
              {}) as RecordApi,
          ).map(([level, count]) => [level, Number(count) || 0]),
        ),

        levelCountsPct: Object.fromEntries(
          Object.entries(
            (family.family_level_counts_pct ??
              family.familyLevelCountsPct ??
              {}) as RecordApi,
          ).map(([level, pct]) => [level, Number(pct) || 0]),
        ),

        operations: array(family.operations ?? family.operacoes).map(
          (item) => ({
            id: text(item, ["operation_id", "id", "code"]),

            name: text(item, ["operation_name", "name", "label"]) || "Operação",

            capable: number(item, ["operators_capable", "capable_operators"]),

            levels: Object.fromEntries(
              Object.entries(
                (item.level_counts ?? item.levelCounts ?? {}) as RecordApi,
              ).map(([level, count]) => [level, Number(count) || 0]),
            ),
          }),
        ),
      }));

      setFamilies(loaded);

      const meta =
        data.meta && typeof data.meta === "object"
          ? (data.meta as RecordApi)
          : {};

      const refreshedCoverage = normalizeThresholds(
        meta.coverage_thresholds,
        coverageThresholds,
      );

      const refreshedOle = normalizeThresholds(meta.ole_thresholds, next);

      const refreshedLevelMatrix = normalizeLevelMatrix(
        meta.level_matrix,
        draftLevelMatrix,
      );

      setCoverageThresholds(refreshedCoverage);
      setOleThresholds(refreshedOle);
      setDraftOleThresholds(refreshedOle);
      setLevelMatrix(refreshedLevelMatrix);
      setDraftLevelMatrix(refreshedLevelMatrix.map((row) => [...row]));
    } catch (error) {
      console.error("Erro ao guardar thresholds de polivalência:", error);

      setSettingsError("Não foi possível guardar os parâmetros.");
    } finally {
      setSavingThresholds(false);
    }
  };

  const activeOleThresholds = editingThresholds
    ? draftOleThresholds
    : oleThresholds;

  const [oleThreshold1, oleThreshold2, oleThreshold3] = activeOleThresholds;

  const activeCoverageThresholds = editingThresholds
    ? draftCoverageThresholds
    : coverageThresholds;

  const [coverageThreshold1, coverageThreshold2, coverageThreshold3] =
    activeCoverageThresholds;

  const coverageLabels = [
    `< ${coverageThreshold1}% da gama`,
    `${coverageThreshold1}–${coverageThreshold2}% da gama`,
    `${coverageThreshold2}–${coverageThreshold3}% da gama`,
    `≥ ${coverageThreshold3}% da gama`,
  ];

  const activeLevelMatrix = editingThresholds ? draftLevelMatrix : levelMatrix;

  return (
    <div className="rounded-sm border border-gray-200 bg-white shadow-sm">
      <div className="relative flex items-start justify-between border-b border-gray-200 p-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Cobertura Geral — Nível de Proficiência
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Por família: cobertura das operações e distribuição dos níveis de
            proficiência dos operadores.
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            title="O que significam os níveis?"
            aria-label="Informação sobre níveis de proficiência"
            onClick={() => setShowLevelsInfo((current) => !current)}
            className="rounded-full border border-gray-300 p-1.5 text-gray-500 transition-colors hover:border-gray-500 hover:bg-gray-50 hover:text-gray-800"
          >
            <Info className="h-4 w-4" />
          </button>
          {showLevelsInfo && (
            <div className="absolute right-0 top-9 z-30 w-[700px] max-w-[calc(100vw-2rem)] rounded-sm border border-gray-200 bg-white p-4 text-xs shadow-xl">
              {" "}
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="text-base font-bold text-gray-900">
                  Matriz Polivalência × OEE
                </div>

                {!editingThresholds ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftCoverageThresholds([...coverageThresholds]);

                      setDraftOleThresholds([...oleThresholds]);

                      setDraftLevelMatrix(levelMatrix.map((row) => [...row]));

                      setSettingsError(null);
                      setEditingThresholds(true);
                    }}
                    className="inline-flex h-7 items-center gap-1.5 rounded-sm border border-gray-300 bg-white px-2.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil className="h-3 w-3" />
                    Editar
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDraftCoverageThresholds([...coverageThresholds]);

                        setDraftOleThresholds([...oleThresholds]);

                        setDraftLevelMatrix(levelMatrix.map((row) => [...row]));

                        setSettingsError(null);
                        setEditingThresholds(false);
                      }}
                      disabled={savingThresholds}
                      className="inline-flex h-7 items-center gap-1.5 rounded-sm border border-gray-300 bg-white px-2.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
                    >
                      <X className="h-3 w-3" />
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleGuardarThresholds()}
                      disabled={savingThresholds}
                      className="inline-flex h-7 items-center gap-1.5 rounded-sm bg-blue-500 px-2.5 text-[11px] font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                    >
                      <Save className="h-3 w-3" />
                      {savingThresholds ? "A guardar..." : "Guardar"}
                    </button>
                  </div>
                )}
              </div>
              {editingThresholds && (
                <div className="mb-4 rounded-sm border border-blue-100 bg-blue-50/50 p-3">
                  <div className="mb-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Limites da cobertura da gama
                    </div>

                    <div className="flex items-center gap-3">
                      {draftCoverageThresholds.map((value, index) => (
                        <label
                          key={index}
                          className="flex items-center gap-1.5 text-xs text-gray-600"
                        >
                          Limite {index + 1}
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={value}
                              onChange={(event) => {
                                const next = [...draftCoverageThresholds];

                                next[index] = Number(event.target.value);

                                setDraftCoverageThresholds(next);
                              }}
                              className="h-7 w-16 rounded-sm border border-gray-300 bg-white px-2 pr-5 text-right text-xs font-semibold text-gray-800 outline-none focus:border-blue-400"
                            />

                            <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                              %
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-blue-100 pt-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Limites Avg OLE
                    </div>

                    <div className="flex items-center gap-3">
                      {draftOleThresholds.map((value, index) => (
                        <label
                          key={index}
                          className="flex items-center gap-1.5 text-xs text-gray-600"
                        >
                          Limite {index + 1}
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={value}
                              onChange={(event) => {
                                const next = [...draftOleThresholds];

                                next[index] = Number(event.target.value);

                                setDraftOleThresholds(next);
                              }}
                              className="h-7 w-16 rounded-sm border border-gray-300 bg-white px-2 pr-5 text-right text-xs font-semibold text-gray-800 outline-none focus:border-blue-400"
                            />

                            <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                              %
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {settingsError && (
                    <div className="mt-3 text-[11px] text-red-600">
                      {settingsError}
                    </div>
                  )}
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="min-w-[180px] px-2 pb-3 text-left font-semibold text-gray-800">
                        <div>Cobertura da gama</div>
                        <div>(% de operações)</div>
                      </th>

                      <th className="min-w-[120px] px-2 pb-3 text-left font-semibold text-gray-800">
                        Avg OLE &lt; {oleThreshold1}%
                      </th>

                      <th className="min-w-[120px] px-2 pb-3 text-left font-semibold text-gray-800">
                        Avg OLE {oleThreshold1}–{oleThreshold2}%
                      </th>

                      <th className="min-w-[120px] px-2 pb-3 text-left font-semibold text-gray-800">
                        Avg OLE {oleThreshold2}–{oleThreshold3}%
                      </th>

                      <th className="min-w-[120px] px-2 pb-3 text-left font-semibold text-gray-800">
                        Avg OLE ≥ {oleThreshold3}%
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {activeLevelMatrix.map((rowLevels, rowIndex) => (
                      <tr
                        key={coverageLabels[rowIndex]}
                        className="border-b border-gray-100"
                      >
                        <td className="px-2 py-3 font-semibold text-gray-800">
                          {coverageLabels[rowIndex]}
                        </td>

                        {rowLevels.map((level, columnIndex) => (
                          <td
                            key={`${rowIndex}-${columnIndex}`}
                            className="px-2 py-3"
                          >
                            {editingThresholds ? (
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-4 w-4 shrink-0 rounded-full"
                                  style={{
                                    backgroundColor:
                                      proficiencyLevelColors[level],
                                  }}
                                />

                                <select
                                  value={level}
                                  onChange={(event) => {
                                    const nextLevel = Number(
                                      event.target.value,
                                    );

                                    setDraftLevelMatrix((current) =>
                                      current.map((matrixRow, rIndex) =>
                                        rIndex === rowIndex
                                          ? matrixRow.map(
                                              (currentLevel, cIndex) =>
                                                cIndex === columnIndex
                                                  ? nextLevel
                                                  : currentLevel,
                                            )
                                          : [...matrixRow],
                                      ),
                                    );
                                  }}
                                  className="h-7 rounded-sm border border-gray-300 bg-white px-2 text-xs font-medium text-gray-800 outline-none focus:border-blue-400"
                                >
                                  <option value={1}>Nível 1</option>
                                  <option value={2}>Nível 2</option>
                                  <option value={3}>Nível 3</option>
                                  <option value={4}>Nível 4</option>
                                </select>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                <span
                                  className="h-4 w-4 shrink-0 rounded-full"
                                  style={{
                                    backgroundColor:
                                      proficiencyLevelColors[level],
                                  }}
                                />

                                <span className="text-gray-800">
                                  Nível {level}
                                </span>
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6">
                <div className="mb-3 text-base font-bold text-gray-900">
                  Interpretação dos 4 níveis
                </div>

                <ul className="space-y-3 pl-5 text-sm text-gray-800">
                  <li className="list-disc">
                    <strong>Nível 1 — Baixa polivalência:</strong> conhece uma
                    parte limitada da gama e/ou apresenta desempenho
                    insuficiente.
                  </li>

                  <li className="list-disc">
                    <strong>Nível 2 — Polivalente:</strong> já consegue
                    trabalhar em várias operações, mas ainda existem limitações
                    de gama ou desempenho.
                  </li>

                  <li className="list-disc">
                    <strong>Nível 3 — Multifuncional:</strong> domina uma parte
                    significativa da gama e apresenta desempenho consistente.
                  </li>

                  <li className="list-disc">
                    <strong>Nível 4 — Alta polivalência:</strong> combina alta
                    polivalência com alto desempenho.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
      {error && (
        <div className="m-5 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {error}
        </div>
      )}
      {loading ? (
        <div className="p-8 text-center text-sm text-gray-500">
          A carregar cobertura geral...
        </div>
      ) : (
        <>
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {cards.map(({ family, counts, countsPct, covered, fragile }) => (
              <div
                key={family.id}
                className="rounded-sm border border-gray-200 bg-gray-50/60 p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800">
                    {family.name}
                  </h3>
                  <span className="text-[10px] text-gray-500">
                    {family.operations.length} operações
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <span>Operações com ≥1 operador capaz</span>
                      <strong className="text-sm text-slate-700">
                        {covered}/{family.operations.length}
                      </strong>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-slate-500"
                        style={{
                          width: `${family.operations.length ? (covered / family.operations.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <Donut countsPct={countsPct} />

                  <div className="space-y-1 text-[13px] text-gray-600">
                    {["1", "2", "3", "4"].map((level) => (
                      <div key={level} className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: levelColors[level],
                          }}
                        />

                        <span>Nível {level}</span>

                        <strong className="ml-auto pl-3 text-gray-800">
                          {counts[level]}
                        </strong>

                        <strong
                          className="w-12 text-right"
                          style={{
                            color: levelColors[level],
                          }}
                        >
                          {countsPct[level].toFixed(1)}%
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 border-t border-dashed border-gray-300 pt-3">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Operações mais frágeis
                  </div>
                  {fragile.length ? (
                    fragile.map((operation) => (
                      <div
                        key={operation.id}
                        className="flex items-center justify-between gap-3 py-1 text-xs"
                      >
                        <span
                          className="truncate text-gray-700"
                          title={`${operation.id} - ${operation.name}`}
                        >
                          {operation.id} - {operation.name}
                        </span>
                        <span className="shrink-0 font-semibold text-slate-600">
                          {operation.capable} capazes
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-400">N/D</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
