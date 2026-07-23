import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { Loader2, Factory, Search } from "lucide-react";
import { SearchableCombobox } from "./SearchableCombobox";

type ApiRecord = Record<string, any>;

interface TaskOption {
  id: string;
  label: string;
  description?: string;
}

const ensureArray = (value: unknown): ApiRecord[] => {
  if (Array.isArray(value)) return value as ApiRecord[];
  if (value && typeof value === "object") {
    const nestedArray = Object.values(value as Record<string, unknown>).find((entry) => Array.isArray(entry));
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

const toDisplayValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Nao";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "—";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    const items = value.map((entry) => (typeof entry === "string" || typeof entry === "number" ? String(entry) : "obj"));
    return items.length <= 3 ? items.join(", ") : `${items.slice(0, 3).join(", ")} +${items.length - 3}`;
  }
  if (typeof value === "object") {
    const record = value as ApiRecord;
    const summary = pickString(record, ["code", "id", "name", "label", "type", "machine_type"]);
    if (summary) return summary;
    return Object.entries(record)
      .slice(0, 3)
      .map(([key, entry]) => `${key}: ${toDisplayValue(entry)}`)
      .join(" | ") || "Objeto";
  }
  return String(value);
};

const buildTaskOptions = (payload: unknown): TaskOption[] =>
  ensureArray(payload)
    .map((record, index) => {
      const id =
        pickString(record, ["task_id", "taskId", "task_code", "taskCode", "id", "code", "reference"]) ||
        `TASK-${String(index + 1).padStart(3, "0")}`;
      const description =
        pickString(record, ["task_description", "taskDescription", "description", "descricao"]) ||
        pickString(record, ["task_name", "name", "nome"]) ||
        undefined;
      return { id, label: id, description };
    })
    .filter((option, index, list) => list.findIndex((item) => item.id === option.id) === index);

interface CatalogoMaquinasApiProps {
  familyId: string;
  defaultTaskId?: string;
  familyLabel?: string;
  familyOptions: Array<{ id: string; label: string; description?: string }>;
  onFamilyChange: (familyId: string) => void;
}

interface MachineOperationRow {
  operation_code: string;
  operation_name: string;
  sequence_order: string;
  machine_type: string;
  ponto: string;
  largura: string;
  p_cm: string;
  guia: string;
}

interface MachineEntry {
  code: string;
  name: string;
  type: string;
  description: string;
  active: boolean;
  operations: MachineOperationRow[];
}

export function CatalogoMaquinasApi({ familyId, defaultTaskId, familyLabel, familyOptions, onFamilyChange }: CatalogoMaquinasApiProps) {
  const [taskOptions, setTaskOptions] = useState<TaskOption[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedMachineType, setSelectedMachineType] = useState("ALL");
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operations, setOperations] = useState<ApiRecord[]>([]);

  useEffect(() => {
    let active = true;

    const loadTasks = async () => {
      if (!familyId) {
        setTaskOptions([]);
        setSelectedTaskId("");
        setOperations([]);
        return;
      }

      setLoadingTasks(true);
      setError(null);
      try {
        const response = await axios.get(`${API_BASE_URL}/technical-sheets/family/${encodeURIComponent(familyId)}`);
        const options = buildTaskOptions(response.data);
        if (!active) return;
        setTaskOptions(options);
        setSelectedTaskId((current) => {
          if (current && options.some((option) => option.id === current)) return current;
          if (defaultTaskId && options.some((option) => option.id === defaultTaskId)) return defaultTaskId;
          return options[0]?.id || "";
        });
        setSelectedMachineType("ALL");
      } catch (err) {
        if (!active) return;
        console.error("Erro ao carregar task_id do catalogo:", err);
        setTaskOptions([]);
        setSelectedTaskId("");
        setSelectedMachineType("ALL");
        setOperations([]);
        setError("Nao foi possivel carregar os task_id da familia selecionada.");
      } finally {
        if (active) setLoadingTasks(false);
      }
    };

    void loadTasks();
    return () => {
      active = false;
    };
  }, [familyId, defaultTaskId]);

  useEffect(() => {
    let active = true;

    const loadCatalog = async () => {
      if (!selectedTaskId) {
        setOperations([]);
        return;
      }

      setLoadingCatalog(true);
      setError(null);
      setSelectedMachineType("ALL");
      try {
        const response = await axios.get(
          `${API_BASE_URL}/technical-sheets/${encodeURIComponent(selectedTaskId)}/machine-catalog`
        );
        const record = response.data && typeof response.data === "object" ? (response.data as ApiRecord) : null;
        const operationList = ensureArray(record?.operations ?? record?.catalog ?? record?.machine_catalog ?? record?.items);
        if (!active) return;
        setOperations(operationList);
      } catch (err) {
        if (!active) return;
        console.error("Erro ao carregar catalogo de maquinas:", err);
        setOperations([]);
        setError("Nao foi possivel carregar o catalogo de maquinas para o task_id selecionado.");
      } finally {
        if (active) setLoadingCatalog(false);
      }
    };

    void loadCatalog();
    return () => {
      active = false;
    };
  }, [selectedTaskId]);

  const taskSummary = useMemo(() => {
    const machineTypes = Array.from(
      new Set(
        operations.flatMap((operation) =>
          ensureArray(operation.machines)
            .filter((machine) => machine.active !== false && machine.ativa !== false)
            .map((machine) => pickString(machine, ["type", "machine_type"]))
            .filter(Boolean)
        )
      )
    );

    return {
      taskId: selectedTaskId,
      machineTypes,
    };
  }, [operations, selectedTaskId]);

  const machineEntries = useMemo<MachineEntry[]>(() => {
    const map = new Map<string, MachineEntry>();

    operations.forEach((operation) => {
      const operationRow: MachineOperationRow = {
        operation_code: pickString(operation, ["operation_code", "operation_id", "code", "id"]),
        operation_name: pickString(operation, ["operation_name", "name", "nome"]),
        sequence_order: toDisplayValue(operation.sequence_order),
        machine_type: pickString(operation, ["machine_type", "type", "tipo_maquina"]),
        ponto: toDisplayValue(operation.ponto),
        largura: toDisplayValue(operation.largura),
        p_cm: toDisplayValue(operation.p_cm),
        guia: toDisplayValue(operation.guia),
      };

      ensureArray(operation.machines)
        .filter((machine) => machine.active !== false && machine.ativa !== false)
        .forEach((machine) => {
          const code = pickString(machine, ["code", "id", "machine_code"]) || operationRow.machine_type || "MACHINE";
          const name = pickString(machine, ["name", "machine_name", "label"]) || code;
          const type = pickString(machine, ["type", "machine_type"]) || operationRow.machine_type || "MACHINE";
          const description = pickString(machine, ["description", "descricao"]);

          const current = map.get(code);
          if (!current) {
            map.set(code, {
              code,
              name,
              type,
              description,
              active: true,
              operations: [operationRow],
            });
            return;
          }

          if (!current.operations.some((item) => item.operation_code === operationRow.operation_code)) {
            current.operations.push(operationRow);
          }
        });
    });

    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [operations]);

  const machineTypes = useMemo(
    () => Array.from(new Set(machineEntries.map((machine) => machine.type).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [machineEntries]
  );

  const filteredMachineEntries = useMemo(
    () =>
      selectedMachineType === "ALL"
        ? machineEntries
        : machineEntries.filter((machine) => machine.type === selectedMachineType),
    [machineEntries, selectedMachineType]
  );

  useEffect(() => {
    if (selectedMachineType !== "ALL" && !machineTypes.includes(selectedMachineType)) {
      setSelectedMachineType("ALL");
    }
  }, [machineTypes, selectedMachineType]);

  return (
    <Card className="shadow-sm border border-gray-200 rounded-sm bg-white">
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="flex items-center justify-between gap-4 text-gray-900">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-sm flex items-center justify-center">
              <Factory className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-base font-semibold">Catálogo de Máquinas</div>
              <CardDescription className="text-gray-500 mt-0.5 text-xs">
                Catálogo por máquina, com as operações compatíveis dentro de cada cartão
              </CardDescription>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="rounded-sm text-[10px]">
                  Família de artigos
                </Badge>
                <span className="text-xs text-gray-600">{familyLabel || familyId || "Sem família selecionada"}</span>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="rounded-sm text-xs">
            {loadingTasks || loadingCatalog ? "A carregar..." : selectedTaskId || "Sem task_id"}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-gray-500" />
              Família de artigos
            </Label>
            <SearchableCombobox
              value={familyId}
              onValueChange={onFamilyChange}
              options={familyOptions.map((family) => ({
                value: family.id,
                label: family.label,
                keywords: [family.id, family.description || ""],
                renderLabel: (
                  <div className="flex max-w-full flex-col items-start overflow-hidden">
                    <span className="font-medium text-gray-900">{family.label}</span>
                    <span className="block w-full truncate text-[11px] text-gray-500">{family.description || family.id}</span>
                  </div>
                ),
                renderSelectedLabel: (
                  <div className="flex max-w-full flex-col items-start overflow-hidden leading-tight">
                    <span className="font-medium text-gray-900">{family.label}</span>
                    <span className="block w-full truncate text-[11px] text-gray-500">{family.description || family.id}</span>
                  </div>
                ),
              }))}
              placeholder="Selecionar família"
              searchPlaceholder="Pesquisar família..."
              emptyText="Nenhuma família encontrada"
              disabled={familyOptions.length === 0}
              triggerClassName="rounded-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-gray-500" />
              Task ID
            </Label>
            <SearchableCombobox
              value={selectedTaskId}
              onValueChange={setSelectedTaskId}
              options={taskOptions.map((option) => ({
                value: option.id,
                label: option.label,
                keywords: [option.id, option.description || ""],
                renderLabel: (
                  <div className="flex max-w-full flex-col items-start overflow-hidden">
                    <span className="font-medium text-gray-900">{option.id}</span>
                    {option.description && <span className="block w-full truncate text-[11px] text-gray-500">{option.description}</span>}
                  </div>
                ),
                renderSelectedLabel: (
                  <div className="flex max-w-full flex-col items-start overflow-hidden leading-tight">
                    <span className="font-medium text-gray-900">{option.id}</span>
                    {option.description && <span className="block w-full truncate text-[11px] text-gray-500">{option.description}</span>}
                  </div>
                ),
              }))}
              placeholder={loadingTasks ? "A carregar task_id..." : "Selecionar task_id"}
              searchPlaceholder="Pesquisar task_id..."
              emptyText="Nenhum task_id disponível"
              disabled={loadingTasks || taskOptions.length === 0}
              triggerClassName="rounded-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-gray-500" />
              Tipo
            </Label>
            <SearchableCombobox
              value={selectedMachineType}
              onValueChange={setSelectedMachineType}
              options={[
                {
                  value: "ALL",
                  label: "Todos",
                  renderLabel: (
                    <div className="flex max-w-full flex-col items-start overflow-hidden">
                      <span className="font-medium text-gray-900">Todos</span>
                      <span className="block w-full truncate text-[11px] text-gray-500">Mostrar todas as maquinas</span>
                    </div>
                  ),
                  renderSelectedLabel: (
                    <div className="flex max-w-full flex-col items-start overflow-hidden leading-tight">
                      <span className="font-medium text-gray-900">Todos</span>
                      <span className="block w-full truncate text-[11px] text-gray-500">Mostrar todas as maquinas</span>
                    </div>
                  ),
                },
                ...machineTypes.map((type) => ({
                  value: type,
                  label: type,
                  keywords: [type],
                  renderLabel: (
                    <div className="flex max-w-full flex-col items-start overflow-hidden">
                      <span className="font-medium text-gray-900">{type}</span>
                      <span className="block w-full truncate text-[11px] text-gray-500">
                        {machineEntries.filter((machine) => machine.type === type).length} maquinas
                      </span>
                    </div>
                  ),
                  renderSelectedLabel: (
                    <div className="flex max-w-full flex-col items-start overflow-hidden leading-tight">
                      <span className="font-medium text-gray-900">{type}</span>
                      <span className="block w-full truncate text-[11px] text-gray-500">
                        {machineEntries.filter((machine) => machine.type === type).length} maquinas
                      </span>
                    </div>
                  ),
                })),
              ]}
              placeholder={loadingCatalog ? "A carregar tipos..." : "Filtrar por tipo"}
              searchPlaceholder="Pesquisar tipo..."
              emptyText="Nenhum tipo encontrado"
              disabled={loadingCatalog || machineTypes.length === 0}
              triggerClassName="rounded-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <Badge variant="outline" className="rounded-sm">
            {taskSummary.taskId || selectedTaskId}
          </Badge>
          {taskSummary.machineTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedMachineType(type)}
              className={`rounded-sm border px-2 py-1 text-xs transition-colors ${
                selectedMachineType === type
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">Catálogo por máquina</div>
              <div className="text-xs text-gray-500">
                Cada máquina aparece uma vez, com as operações em que é compatível.
              </div>
            </div>
            {loadingCatalog && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                A carregar catálogo
              </div>
            )}
          </div>

          {filteredMachineEntries.length > 0 ? (
            <div className="max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredMachineEntries.map((machine) => (
                  <div key={machine.code} className="rounded-sm border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="rounded-sm text-[10px]">
                            {machine.type}
                          </Badge>
                          <span className="text-sm font-semibold text-gray-900">{machine.code}</span>
                        </div>
                        <div className="text-sm text-gray-700">{machine.name}</div>
                        {machine.description && <div className="text-xs text-gray-500">{machine.description}</div>}
                      </div>
                      <Badge variant="default" className="rounded-sm text-[10px]">
                        Ativa
                      </Badge>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-sm border border-gray-200 bg-white">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="p-2 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">Seq</th>
                            <th className="p-2 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">Operacao</th>
                            <th className="p-2 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">Tipo</th>
                            <th className="p-2 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">Ponto</th>
                            <th className="p-2 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">Largura</th>
                            <th className="p-2 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">p_cm</th>
                            <th className="p-2 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">Guia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {machine.operations.map((operation) => (
                            <tr key={`${machine.code}-${operation.operation_code}`} className="border-b border-gray-100 last:border-0">
                              <td className="p-2 text-xs text-gray-600">{operation.sequence_order}</td>
                              <td className="p-2 text-xs font-medium text-gray-900">{operation.operation_name || operation.operation_code || "—"}</td>
                              <td className="p-2 text-xs text-gray-700">{operation.machine_type || "—"}</td>
                              <td className="p-2 text-xs text-gray-700">{operation.ponto}</td>
                              <td className="p-2 text-xs text-gray-700">{operation.largura}</td>
                              <td className="p-2 text-xs text-gray-700">{operation.p_cm}</td>
                              <td className="p-2 text-xs text-gray-700">{operation.guia}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-sm border border-gray-200 bg-white p-4 text-sm text-gray-500">
              {loadingCatalog ? "A carregar catálogo..." : "Nenhuma maquina compatível encontrada para este task_id."}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
