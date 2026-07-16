import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { SearchableCombobox } from "./SearchableCombobox";
import { GrupoArtigo, Operador } from "../types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Grid3X3 } from "lucide-react";

type ApiRecord = Record<string, any>;

interface MatrizPolivalenciaGruposProps {
  operadores: Operador[];
  grupos: GrupoArtigo[];
  modo?: "local" | "api";
}

interface ApiFamilyOption {
  code: string;
  name: string;
}

interface ApiMatrixRow {
  collaborator_id: string;
  collaborator_name: string;
  ole_historico: number;
  by_family: Record<string, number | null | undefined>;
}

const ensureArray = (value: unknown): ApiRecord[] => {
  if (Array.isArray(value)) return value as ApiRecord[];
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

const getOleColor = (ole: number) => {
  if (ole >= 85) return "bg-green-100 text-green-800 border-green-200";
  if (ole >= 75) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-red-100 text-red-800 border-red-200";
};

function LocalView({ operadores, grupos }: Pick<MatrizPolivalenciaGruposProps, "operadores" | "grupos">) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase border-r border-gray-200 sticky left-0 bg-gray-50 z-20 min-w-[180px]">
                Grupo
              </th>
              {operadores.map((operador) => (
                <th
                  key={operador.id}
                  className="p-3 text-center text-xs font-semibold text-gray-600 uppercase border-r border-gray-200 min-w-[140px]"
                >
                  <div className="text-xs font-semibold text-gray-900">{operador.id}</div>
                  {operador.nome && <div className="mt-0.5 text-[10px] font-normal text-gray-500 normal-case">{operador.nome}</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grupos.map((grupo, idx) => (
              <tr
                key={grupo.id}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                }`}
              >
                <td className="p-3 sticky left-0 bg-inherit z-10 border-r border-gray-200">
                  <div className="text-[10px] text-gray-400 font-mono font-normal leading-none">{grupo.referencia}</div>
                  <div className="mt-1 font-semibold text-sm text-gray-900" title={grupo.nome}>
                    {grupo.nome}
                  </div>
                </td>
                {operadores.map((operador) => {
                  const oleGrupo = operador.competenciasPorGrupo?.[grupo.id];
                  return (
                    <td key={`${grupo.id}-${operador.id}`} className="p-3 text-center border-r border-gray-200">
                      {oleGrupo !== undefined ? (
                        <span className={`inline-flex items-center px-2 py-1 rounded-sm text-xs font-semibold font-mono border ${getOleColor(oleGrupo)}`}>
                          {oleGrupo}%
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-6 text-xs">
        <span className="font-semibold text-gray-600">Legenda:</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-green-100 border border-green-200" />
          <span className="text-gray-600">≥ 85% (Excelente)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-yellow-100 border border-yellow-200" />
          <span className="text-gray-600">75-84% (Bom)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-red-100 border border-red-200" />
          <span className="text-gray-600">&lt; 75% (A melhorar)</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="bg-gray-50 p-3 rounded-sm">
          <div className="text-xs text-gray-500 uppercase mb-1">Total Operadores</div>
          <div className="text-lg font-bold text-gray-900">{operadores.length}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-sm">
          <div className="text-xs text-gray-500 uppercase mb-1">Total Grupos</div>
          <div className="text-lg font-bold text-gray-900">{grupos.length}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-sm">
          <div className="text-xs text-gray-500 uppercase mb-1">OLE Médio Geral</div>
          <div className="text-lg font-bold text-gray-900">
            {operadores.length > 0
              ? (operadores.reduce((sum, op) => sum + op.oleHistorico, 0) / operadores.length).toFixed(1)
              : "0.0"}
            %
          </div>
        </div>
      </div>
    </>
  );
}

function ApiView() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [families, setFamilies] = useState<ApiFamilyOption[]>([]);
  const [rows, setRows] = useState<ApiMatrixRow[]>([]);
  const [filtroFamilia, setFiltroFamilia] = useState("");
  const [filtroOperador, setFiltroOperador] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_BASE_URL}/polyvalence/matrix/by-family`);
        const record = response.data && typeof response.data === "object" ? (response.data as ApiRecord) : null;
        const loadedFamilies = ensureArray(record?.families).map((family, index) => ({
          code: pickString(family, ["code", "id", "family_id", "familyCode"]) || `FAM-${String(index + 1).padStart(3, "0")}`,
          name: pickString(family, ["name", "label", "family_name"]) || pickString(family, ["code", "id"]) || "Família",
        }));
        const loadedRows = ensureArray(record?.rows).map((row) => ({
          collaborator_id: pickString(row, ["collaborator_id", "id", "operator_id"]),
          collaborator_name: pickString(row, ["collaborator_name", "name", "operator_name"]),
          ole_historico: Number(row?.ole_historico ?? row?.oleHistorico ?? 0) || 0,
          by_family: (row?.by_family as Record<string, number | null | undefined>) || {},
        }));
        if (!active) return;
        const familyScores = new Map<string, number>();
        loadedFamilies.forEach((family) => familyScores.set(family.code, 0));
        loadedRows.forEach((row) => {
          Object.entries(row.by_family).forEach(([code, value]) => {
            if (value !== null && value !== undefined) familyScores.set(code, (familyScores.get(code) || 0) + 1);
          });
        });

        setFamilies(
          loadedFamilies.sort((a, b) => {
            const diff = (familyScores.get(b.code) || 0) - (familyScores.get(a.code) || 0);
            return diff !== 0 ? diff : a.name.localeCompare(b.name, "pt-PT", { sensitivity: "base" });
          })
        );
        setRows(
          loadedRows.sort((a, b) => {
            const aCount = Object.values(a.by_family).filter((value) => value !== null && value !== undefined).length;
            const bCount = Object.values(b.by_family).filter((value) => value !== null && value !== undefined).length;
            if (bCount !== aCount) return bCount - aCount;
            if (b.ole_historico !== a.ole_historico) return b.ole_historico - a.ole_historico;
            return a.collaborator_id.localeCompare(b.collaborator_id, "pt-PT", { sensitivity: "base" });
          })
        );
      } catch (err) {
        if (!active) return;
        console.error("Erro ao carregar matriz por familia:", err);
        setError("Não foi possível carregar a matriz por grupo de artigo.");
        setFamilies([]);
        setRows([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const visibleFamilies = useMemo(() => {
    if (!filtroFamilia) return families;
    return families.filter((family) => family.code === filtroFamilia);
  }, [families, filtroFamilia]);

  const visibleCollaborators = useMemo(() => {
    const termo = filtroOperador.trim().toLowerCase();
    if (!termo) return rows;

    return rows.filter((row) => {
      const haystack = [row.collaborator_id, row.collaborator_name].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(termo);
    });
  }, [rows, filtroOperador]);

  return (
    <>
      {error && <div className="mb-4 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</div>}

      <div className="mb-4 rounded-sm border border-gray-200 bg-gray-50 p-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">Familia de artigos</div>
            <SearchableCombobox
              value={filtroFamilia}
              onValueChange={setFiltroFamilia}
              options={families.map((family) => ({
                value: family.code,
                label: family.name,
                keywords: [family.code],
              }))}
              placeholder="Todas as famílias"
              searchPlaceholder="Pesquisar família..."
              emptyText="Nenhuma família encontrada"
              disabled={families.length === 0}
              triggerClassName="rounded-sm text-xs h-8 bg-white cursor-pointer"
            />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">Pesquisar operador</div>
            <Input
              value={filtroOperador}
              onChange={(e) => setFiltroOperador(e.target.value)}
              placeholder="ID ou nome do operador"
              className="h-8 rounded-sm bg-white text-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setFiltroFamilia("");
              setFiltroOperador("");
            }}
            className="h-8 rounded-sm border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      <div className="overflow-auto max-h-[65vh] rounded-sm border border-gray-200">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase border-r border-gray-200 sticky left-0 bg-gray-50 z-20 min-w-[180px]">
                Familia de artigos
              </th>
              {visibleCollaborators.map((row) => (
                <th
                  key={row.collaborator_id}
                  className="p-3 text-center text-xs font-semibold text-gray-600 uppercase border-r border-gray-200 min-w-[150px]"
                >
                  <div className="text-xs font-semibold text-gray-900">{row.collaborator_id}</div>
                  {row.collaborator_name && <div className="mt-0.5 text-[10px] font-normal text-gray-500 normal-case">{row.collaborator_name}</div>}
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-sm text-xs font-semibold font-mono border ${getOleColor(row.ole_historico)}`}>
                      {row.ole_historico}%
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleFamilies.map((family, idx) => (
              <tr
                key={family.code}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                }`}
              >
                <td className="p-3 sticky left-0 bg-inherit z-10 border-r border-gray-200">
                  <div className="text-[10px] text-gray-400 font-mono font-normal leading-none">{family.code}</div>
                  <div className="mt-1 font-semibold text-sm text-gray-900" title={family.name}>
                    {family.name}
                  </div>
                </td>
                {visibleCollaborators.map((row) => {
                  const oleFamily = row.by_family?.[family.code];
                  return (
                    <td key={`${family.code}-${row.collaborator_id}`} className="p-3 text-center border-r border-gray-200">
                      {oleFamily !== undefined && oleFamily !== null ? (
                        <span className={`inline-flex items-center px-2 py-1 rounded-sm text-xs font-semibold font-mono border ${getOleColor(oleFamily)}`}>
                          {oleFamily}%
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading ? (
        <div className="mt-4 rounded-sm border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">A carregar matriz por grupo de artigo...</div>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div className="bg-gray-50 p-3 rounded-sm">
            <div className="text-xs text-gray-500 uppercase mb-1">Total Operadores</div>
            <div className="text-lg font-bold text-gray-900">{visibleCollaborators.length}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-sm">
            <div className="text-xs text-gray-500 uppercase mb-1">Total Grupos</div>
            <div className="text-lg font-bold text-gray-900">{visibleFamilies.length}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-sm">
            <div className="text-xs text-gray-500 uppercase mb-1">OLE Médio Geral</div>
            <div className="text-lg font-bold text-gray-900">
              {visibleCollaborators.length > 0
                ? (visibleCollaborators.reduce((sum, row) => sum + row.ole_historico, 0) / visibleCollaborators.length).toFixed(1)
                : "0.0"}%
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function MatrizPolivalenciaGrupos({ operadores, grupos, modo = "local" }: MatrizPolivalenciaGruposProps) {
  return (
    <Card className="shadow-sm border border-gray-200 rounded-sm bg-white">
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="flex items-center justify-between text-gray-900">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-100 rounded-sm flex items-center justify-center">
              <Grid3X3 className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <div className="text-base font-semibold">Matriz de Polivalência por Grupos de Artigos</div>
              <CardDescription className="text-gray-500 mt-0.5 text-xs">
                OLE% médio por operador e por grupo de artigo
              </CardDescription>
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6">
        {modo === "api" ? <ApiView /> : <LocalView operadores={operadores} grupos={grupos} />}
      </CardContent>
    </Card>
  );
}
