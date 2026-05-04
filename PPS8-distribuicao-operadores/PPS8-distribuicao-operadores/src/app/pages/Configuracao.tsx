import { useState, useMemo, useCallback, useEffect } from "react";
import { Operador, Maquina, ConfiguracaoLayout } from "../types";
import { operacoesMock, produtosMock, layoutPadraoEspinha } from "../data/mock";
import { useStorage } from "../contexts/StorageContext";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { MatrizPolivalenciaGrupos } from "../components/MatrizPolivalenciaGrupos";
import { ConfiguracaoLayoutComponent } from "../components/ConfiguracaoLayout";
import { CatalogoMaquinas } from "../components/CatalogoMaquinas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import {
  Settings,
  Users,
  Info,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Sliders,
  Shield,
  Cog,
  X,
  Search,
  Filter,
  FolderTree,
  Loader2,
  ChevronsUpDown,
  Check,
} from "lucide-react";

// ─── Operações únicas disponíveis (read-only, do mock) ───────────────────────

const todasOperacoesUnicas = Array.from(
  new Set(operacoesMock.map((op) => op.nome))
).sort();

// ─── Tipo local para tabela de máquinas (layout simples) ─────────────────────

interface MaquinaSimples {
  id: string;
  tipo: string;
  largura: string;
  ponto: string;
  setup: string;
  agrupavel: boolean;
  quantidade: number;
  operacoesCompativeis: string[];
}

interface FamilyOption {
  id: string;
  label: string;
}

type ApiRecord = Record<string, any>;

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

const pickNumber = (obj: ApiRecord, keys: string[]): number | null => {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.trim().replace(",", "."));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
};

const normalizeText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const POLYVALENCE_API_BASE = "http://192.168.54.202:7860/api";
const POLYVALENCE_ENDPOINT = `${POLYVALENCE_API_BASE}/polyvalence/`;

function maquinaToSimples(m: Maquina): MaquinaSimples {
  return {
    id: m.id,
    tipo: m.tipo,
    largura: String(m.largura),
    ponto: m.ponto || "",
    setup: m.setup,
    agrupavel: m.permitirAgrupamento,
    quantidade: m.quantidade,
    operacoesCompativeis: m.operacoesCompativeis,
  };
}

function simplesToMaquina(s: MaquinaSimples): Maquina {
  return {
    id: s.id,
    tipo: s.tipo,
    largura: parseFloat(s.largura) || 0,
    ponto: s.ponto,
    setup: s.setup,
    permitirAgrupamento: s.agrupavel,
    quantidade: s.quantidade,
    operacoesCompativeis: s.operacoesCompativeis,
    ativa: true,
  };
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Configuracao() {
  const {
    dados, salvar, estadoConexao,
    adicionarOperador, removerOperador, actualizarOperador,
    adicionarMaquina, removerMaquina, actualizarMaquina
  } = useStorage();

  // Operadores da API (matriz de polivalência) para alimentar a 1ª tabela.
  const [operadoresApi, setOperadoresApi] = useState<Operador[] | null>(null);
  const [erroOperadoresApi, setErroOperadoresApi] = useState<string | null>(null);

  // Operadores e máquinas vêm sempre do contexto (fonte de verdade única)
  const operadores: Operador[] = operadoresApi ?? dados.operadores;
  const maquinas: MaquinaSimples[] = dados.maquinas.map(maquinaToSimples);

  // Feedback visual
  const [mensagemGuardado, setMensagemGuardado] = useState<string | null>(null);
  const [editandoCelula, setEditandoCelula] = useState<string | null>(null);

  // Layout (local — não persistido nesta página por agora)
  const [layout, setLayout] = useState<ConfiguracaoLayout>(layoutPadraoEspinha);

  // Formulário novo operador
  const [showNovoOperador, setShowNovoOperador] = useState(false);
  const [novoOperador, setNovoOperador] = useState({ id: "", nome: "", ativo: true, oleHistorico: 85 });
  const [reloadMatrizTick, setReloadMatrizTick] = useState(0);

  // Formulário nova máquina
  const [showNovaMaquina, setShowNovaMaquina] = useState(false);
  const [novaMaquina, setNovaMaquina] = useState({
    tipo: "", largura: "5.6mm", ponto: "301", setup: "Standard", agrupavel: true, quantidade: 1,
  });

  // ── Helper: mostrar feedback ─────────────────────────────────────────────

  const mostrarFeedback = useCallback(() => {
    setMensagemGuardado("Guardado");
    setTimeout(() => setMensagemGuardado(null), 2000);
  }, []);

  // ── Handlers — Operadores ────────────────────────────────────────────────

  const handleCriarOperador = useCallback(async () => {
    if (!novoOperador.id.trim()) return;
    const code = novoOperador.id.trim();
    const name = novoOperador.nome.trim() || code;
    try {
      await axios.post(`${API_BASE_URL}/collaborators/`, {
        code,
        name,
        active: novoOperador.ativo,
      });
      setReloadMatrizTick((prev) => prev + 1);
      setErroOperadoresApi(null);
    } catch (error) {
      console.error("Erro ao criar colaborador na API, a usar fallback local:", error);
      const novo: Operador = {
        id: code,
        nome: name,
        oleHistorico: novoOperador.oleHistorico,
        competencias: {
          POL_1: null, POL_2: null, POL_3: null, POL_4: null,
          POL_5: null, POL_6: null, POL_7: null, POL_8: null,
        },
      };
      await adicionarOperador(novo);
      setErroOperadoresApi("Colaborador criado localmente (fallback). Verifique o endpoint /collaborators/.");
    }
    mostrarFeedback();
    setShowNovoOperador(false);
    setNovoOperador({ id: "", nome: "", ativo: true, oleHistorico: 85 });
  }, [novoOperador, adicionarOperador, mostrarFeedback]);

  const handleRemoverOperador = useCallback(async (id: string) => {
    await removerOperador(id);
    mostrarFeedback();
  }, [removerOperador, mostrarFeedback]);

  const handleEditOLE = useCallback(async (operadorId: string, ole: number) => {
    await actualizarOperador(operadorId, { oleHistorico: ole });
    mostrarFeedback();
  }, [actualizarOperador, mostrarFeedback]);

  const handleEditCompetencia = useCallback(async (
    operadorId: string,
    posicao: string,
    operacao: string | null,
    ole?: number
  ) => {
    // Obter operador actual dos dados (sempre actualizado)
    const operador = dados.operadores.find((op) => op.id === operadorId);
    if (!operador) return;

    const atual = operador.competencias[posicao];
    const novasCompetencias = {
      ...operador.competencias,
      [posicao]: operacao
        ? {
            operacao,
            ole: ole !== undefined
              ? ole
              : (atual && typeof atual === "object" ? atual.ole : operador.oleHistorico),
          }
        : null,
    };

    await actualizarOperador(operadorId, { competencias: novasCompetencias });
    mostrarFeedback();
  }, [dados.operadores, actualizarOperador, mostrarFeedback]);

  // ── Handlers — Máquinas ──────────────────────────────────────────────────

  const handleCriarMaquina = useCallback(async () => {
    if (!novaMaquina.tipo.trim()) return;
    // Gerar novo ID baseado no número actual de máquinas
    const novoId = `MAQ${String(dados.maquinas.length + 1).padStart(3, "0")}`;
    const nova: Maquina = {
      id: novoId,
      tipo: novaMaquina.tipo,
      largura: parseFloat(novaMaquina.largura) || 0,
      ponto: novaMaquina.ponto,
      setup: novaMaquina.setup,
      permitirAgrupamento: novaMaquina.agrupavel,
      quantidade: novaMaquina.quantidade,
      operacoesCompativeis: [],
      ativa: true,
    };
    await adicionarMaquina(nova);
    mostrarFeedback();
    setShowNovaMaquina(false);
    setNovaMaquina({ tipo: "", largura: "5.6mm", ponto: "301", setup: "Standard", agrupavel: true, quantidade: 1 });
  }, [novaMaquina, dados.maquinas.length, adicionarMaquina, mostrarFeedback]);

  const handleRemoverMaquina = useCallback(async (id: string) => {
    await removerMaquina(id);
    mostrarFeedback();
  }, [removerMaquina, mostrarFeedback]);

  const handleToggleOperacaoMaquina = useCallback(async (maqId: string, operacao: string) => {
    const maquina = dados.maquinas.find((m) => m.id === maqId);
    if (!maquina) return;

    const has = maquina.operacoesCompativeis.includes(operacao);
    const novasOperacoes = has
      ? maquina.operacoesCompativeis.filter((o) => o !== operacao)
      : [...maquina.operacoesCompativeis, operacao].sort();

    await actualizarMaquina(maqId, { operacoesCompativeis: novasOperacoes });
    mostrarFeedback();
  }, [dados.maquinas, actualizarMaquina, mostrarFeedback]);

  const handleEditarCampoMaquina = useCallback(async (id: string, campo: keyof Maquina, valor: any) => {
    await actualizarMaquina(id, { [campo]: valor });
    mostrarFeedback();
  }, [actualizarMaquina, mostrarFeedback]);

  // ── Handlers — Catálogo (reutiliza os helpers do contexto) ───────────────

  const handleAddMaquinaAoCatalogo = useCallback(async (maquina: Maquina) => {
    await adicionarMaquina(maquina);
    mostrarFeedback();
  }, [adicionarMaquina, mostrarFeedback]);

  const handleEditMaquinaDoCatalogo = useCallback(async (id: string, upd: Partial<Maquina>) => {
    await actualizarMaquina(id, upd);
    mostrarFeedback();
  }, [actualizarMaquina, mostrarFeedback]);

  const handleRemoveMaquinaDoCatalogo = useCallback(async (id: string) => {
    await removerMaquina(id);
    mostrarFeedback();
  }, [removerMaquina, mostrarFeedback]);

  // ── Filtros ───────────────────────────────────────────────────────────────

  const [filtroFamilia, setFiltroFamilia] = useState<string>("");
  const [familias, setFamilias] = useState<FamilyOption[]>([]);
  const [loadingFamilias, setLoadingFamilias] = useState(false);
  const [filtroOperador, setFiltroOperador] = useState("");
  const [filtroOperacoesSelecionadas, setFiltroOperacoesSelecionadas] = useState<string[]>([]);
  const [filtroPolivalenciaMin, setFiltroPolivalenciaMin] = useState("");
  const [ordenacaoPolivalencia, setOrdenacaoPolivalencia] = useState<"nenhuma" | "asc" | "desc">("nenhuma");
  const [showFiltros, setShowFiltros] = useState(false);

  useEffect(() => {
    let cancelado = false;

    const carregarFamilias = async () => {
      setLoadingFamilias(true);
      try {
        const resposta = await axios.get(`${API_BASE_URL}/families/`);
        const families = ensureArray(resposta.data).map((family, index) => {
          const id =
            pickString(family, ["family_id", "id", "code", "reference"]) ||
            `FAM${String(index + 1).padStart(3, "0")}`;
          const name = pickString(family, ["family_name", "name", "nome"]) || id;
          return {
            id,
            label: name,
          };
        });

        if (!cancelado) {
          if (families.length > 0) {
            setFamilias(families);
            setFiltroFamilia((current) => {
              if (current && families.some((f) => f.id === current)) return current;
              return families[0].id;
            });
          } else {
            const fallbackFamilies = produtosMock.map((family) => ({ id: family.id, label: family.nome }));
            setFamilias(fallbackFamilies);
            setFiltroFamilia((current) => {
              if (current && fallbackFamilies.some((f) => f.id === current)) return current;
              return fallbackFamilies[0]?.id || "";
            });
          }
        }
      } catch (error) {
        console.error("Erro ao carregar familias:", error);
        if (!cancelado) {
          const fallbackFamilies = produtosMock.map((family) => ({ id: family.id, label: family.nome }));
          setFamilias(fallbackFamilies);
          setFiltroFamilia((current) => {
            if (current && fallbackFamilies.some((f) => f.id === current)) return current;
            return fallbackFamilies[0]?.id || "";
          });
        }
      } finally {
        if (!cancelado) setLoadingFamilias(false);
      }
    };

    void carregarFamilias();
    return () => { cancelado = true; };
  }, []);

  useEffect(() => {
    let cancelado = false;

    const carregarMatrizPolivalencia = async () => {
      try {
        const params: Record<string, string | boolean> = { include_operation_names: true };
        if (filtroFamilia) params.family_id = filtroFamilia;

        const resposta = await axios.get(POLYVALENCE_ENDPOINT, { params });
        const colaboradores = ensureArray(resposta.data);

        const mapeados: Operador[] = colaboradores.map((colaborador, index) => {
          const id = pickString(colaborador, ["collaborator_id", "operator_id", "id"]) || `OP${String(index + 1).padStart(3, "0")}`;
          const nome = pickString(colaborador, ["collaborator_name", "operator_name", "name"]);
          const operacoes = ensureArray(colaborador.operations);

          const competencias: Operador["competencias"] = {};

          operacoes.forEach((op) => {
            const operacaoNome = pickString(op, ["operation_name", "operation_id", "operation_code", "id"]);
            if (!operacaoNome) return;
            const ole = pickNumber(op, ["ole_percentage", "ole", "ole_percent"]) ?? 0;
            competencias[operacaoNome] = { operacao: operacaoNome, ole };
          });

          const olesValidos = Object.values(competencias)
            .map((c) => c?.ole)
            .filter((v): v is number => typeof v === "number");
          const oleHistorico = olesValidos.length
            ? Math.round(olesValidos.reduce((acc, v) => acc + v, 0) / olesValidos.length)
            : 0;

          return {
            id,
            nome: nome || undefined,
            oleHistorico,
            competencias,
          };
        });

        if (!cancelado) {
          setOperadoresApi(mapeados);
          setErroOperadoresApi(null);
        }
      } catch (error) {
        console.error("Erro ao carregar matriz de polivalencia:", error);
        if (!cancelado) {
          setOperadoresApi(null);
          setErroOperadoresApi("Nao foi possivel carregar a matriz da API. A mostrar dados locais.");
        }
      }
    };

    void carregarMatrizPolivalencia();
    return () => { cancelado = true; };
  }, [filtroFamilia, reloadMatrizTick]);

  const operacoesFamiliaSelecionada = useMemo(() => {
    if (!filtroFamilia) return todasOperacoesUnicas;
    const grupo = produtosMock.find((g) => g.id === filtroFamilia);
    return grupo ? Array.from(new Set(grupo.operacoes.map((op) => op.nome))).sort() : todasOperacoesUnicas;
  }, [filtroFamilia]);

  const tabelaSomenteLeitura = Boolean(operadoresApi);
  const posicoesPolivalencia = ["POL_1","POL_2","POL_3","POL_4","POL_5","POL_6","POL_7","POL_8"];
  const colunasBasePolivalencia = useMemo(() => {
    if (!tabelaSomenteLeitura) return posicoesPolivalencia;
    const colunas = new Set<string>();
    for (const operador of operadores) {
      for (const key of Object.keys(operador.competencias || {})) {
        const competencia = operador.competencias[key];
        if (competencia?.operacao) colunas.add(competencia.operacao);
      }
    }
    return Array.from(colunas);
  }, [tabelaSomenteLeitura, operadores]);

  const operadoresFiltrados = useMemo(() => {
    let res = operadores;
    if (filtroOperador.trim()) {
      const t = normalizeText(filtroOperador);
      res = res.filter((op) => {
        const idMatch = normalizeText(op.id).includes(t);
        const nomeMatch = normalizeText(op.nome || "").includes(t);
        return idMatch || nomeMatch;
      });
    }
    if (!tabelaSomenteLeitura && filtroFamilia) {
      const opsSet = new Set(operacoesFamiliaSelecionada.map((op) => normalizeText(op)));
      res = res.filter((op) =>
        Object.values(op.competencias).some(
          (c) => c && c.operacao && opsSet.has(normalizeText(c.operacao))
        )
      );
    }
    if (filtroPolivalenciaMin.trim()) {
      const min = Number(filtroPolivalenciaMin);
      if (Number.isFinite(min)) {
        res = res.filter((op) => (Number(op.oleHistorico) || 0) >= min);
      }
    }
    if (filtroOperacoesSelecionadas.length > 0) {
      const opsSet = new Set(filtroOperacoesSelecionadas.map((op) => normalizeText(op)));
      res = res.filter((op) =>
        Object.values(op.competencias).some(
          (c) => c && c.operacao && opsSet.has(normalizeText(c.operacao))
        )
      );
    }
    return res;
  }, [operadores, filtroOperador, filtroFamilia, filtroPolivalenciaMin, operacoesFamiliaSelecionada, tabelaSomenteLeitura, filtroOperacoesSelecionadas]);

  const temFiltrosAtivos =
    filtroOperador.trim() !== "" ||
    filtroOperacoesSelecionadas.length > 0 ||
    filtroPolivalenciaMin.trim() !== "";

  const operadoresVisiveis = useMemo(() => {
    if (ordenacaoPolivalencia === "nenhuma") return operadoresFiltrados;
    const copia = [...operadoresFiltrados];
    copia.sort((a, b) => {
      const va = Number(a.oleHistorico) || 0;
      const vb = Number(b.oleHistorico) || 0;
      return ordenacaoPolivalencia === "asc" ? va - vb : vb - va;
    });
    return copia;
  }, [operadoresFiltrados, ordenacaoPolivalencia]);

  const limparFiltros = () => {
    setFiltroFamilia(familias[0]?.id || "");
    setFiltroOperador("");
    setFiltroOperacoesSelecionadas([]);
    setFiltroPolivalenciaMin("");
    setOrdenacaoPolivalencia("nenhuma");
  };

  const getOleColorClasses = (ole: number) => {
    if (ole >= 90) return "bg-green-600 text-white hover:bg-green-700";
    if (ole >= 85) return "bg-green-500 text-white hover:bg-green-600";
    if (ole >= 80) return "bg-yellow-500 text-white hover:bg-yellow-600";
    if (ole >= 75) return "bg-yellow-600 text-white hover:bg-yellow-700";
    if (ole >= 70) return "bg-orange-500 text-white hover:bg-orange-600";
    return "bg-gray-400 text-white hover:bg-gray-500";
  };

  const celulaKey = (opId: string, pol: string) => `${opId}-${pol}`;
  const mostrarColunaEliminar = false;
  const colunasPolivalencia = useMemo(() => {
    if (filtroOperacoesSelecionadas.length === 0) return colunasBasePolivalencia;
    const selected = new Set(filtroOperacoesSelecionadas.map((op) => normalizeText(op)));
    return colunasBasePolivalencia.filter((col) => selected.has(normalizeText(col)));
  }, [colunasBasePolivalencia, filtroOperacoesSelecionadas]);

  const toggleFiltroOperacao = useCallback((operacao: string) => {
    setFiltroOperacoesSelecionadas((prev) =>
      prev.some((item) => normalizeText(item) === normalizeText(operacao))
        ? prev.filter((item) => normalizeText(item) !== normalizeText(operacao))
        : [...prev, operacao]
    );
  }, []);

  const isGuardando = estadoConexao === "a-guardar";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="w-full px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuração</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Matrizes de polivalencia de operadores e maquinas
          </p>
        </div>
        <div className="flex items-center gap-3">
          {mensagemGuardado && (
            <div className="flex items-center gap-1.5 text-green-600 text-xs">
              <CheckCircle2 className="w-4 h-4" />
              {mensagemGuardado}
            </div>
          )}
          {isGuardando && (
            <div className="flex items-center gap-1.5 text-blue-600 text-xs">
              <Loader2 className="w-4 h-4 animate-spin" />
              A guardar…
            </div>
          )}
        </div>
      </div>

      {/* ── Matriz de Polivalência dos Operadores ── */}
      <Card className="shadow-sm border border-gray-200 rounded-sm bg-white">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center justify-between text-gray-900">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal-100 rounded-sm flex items-center justify-center">
                <Users className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <div className="text-base font-semibold">Matriz de Polivalencia - Operadores</div>
                <CardDescription className="text-gray-500 mt-0.5 text-xs">
                  Competencias tecnicas de cada operador - clique numa celula para editar
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-sm text-xs">{operadores.length} operadores</Badge>
              <Dialog open={showNovoOperador} onOpenChange={setShowNovoOperador}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600 rounded-sm text-xs font-medium cursor-pointer">
                    <Plus className="w-4 h-4 mr-2" />Novo Operador
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-sm [&>button]:cursor-pointer">
                  <DialogHeader>
                    <DialogTitle className="text-base font-semibold">Adicionar Novo Operador</DialogTitle>
                    <DialogDescription className="text-xs">Preencha os dados do operador</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs font-medium">ID do Operador</Label>
                      <Input
                        value={novoOperador.id}
                        onChange={(e) => setNovoOperador({ ...novoOperador, id: e.target.value })}
                        placeholder={`ex: OP${String(operadores.length + 1).padStart(3, "0")}`}
                        className="rounded-sm text-sm mt-1"
                        onKeyDown={(e) => e.key === "Enter" && handleCriarOperador()}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Nome do Operador</Label>
                      <Input
                        value={novoOperador.nome}
                        onChange={(e) => setNovoOperador({ ...novoOperador, nome: e.target.value })}
                        placeholder="ex: Maria Silva"
                        className="rounded-sm text-sm mt-1"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-sm border border-gray-200">
                      <div>
                        <Label className="text-xs font-medium">Ativo</Label>
                        <p className="text-[10px] text-gray-500 mt-0.5">Enviado para a API como campo `active`</p>
                      </div>
                      <Switch
                        className="cursor-pointer"
                        checked={novoOperador.ativo}
                        onCheckedChange={(checked) => setNovoOperador({ ...novoOperador, ativo: checked })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleCriarOperador}
                      className="bg-blue-500 hover:bg-blue-600 rounded-sm text-xs cursor-pointer"
                      disabled={!novoOperador.id.trim()}
                    >
                      Adicionar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>

        {/* Barra de filtros */}
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 space-y-3">
          {erroOperadoresApi && (
            <div className="text-xs text-orange-600">{erroOperadoresApi}</div>
          )}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Familia de Artigos:</span>
            </div>
            <Select value={filtroFamilia} onValueChange={setFiltroFamilia}>
              <SelectTrigger className="w-[260px] rounded-sm text-xs h-8 bg-white cursor-pointer">
                <SelectValue placeholder={loadingFamilias ? "A carregar familias..." : "Todas as familias"} />
              </SelectTrigger>
              <SelectContent className="rounded-sm">
                {familias.map((familia) => (
                  <SelectItem key={familia.id} value={familia.id} className="text-xs cursor-pointer">
                    {familia.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filtroFamilia && (
              <Badge variant="secondary" className="rounded-sm text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                  {operacoesFamiliaSelecionada.length} operacoes
              </Badge>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant={showFiltros ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFiltros(!showFiltros)}
                className={`rounded-sm text-xs h-8 ${showFiltros ? "bg-blue-500 hover:bg-blue-600" : "border-gray-200"}`}
              >
                <Filter className="w-3 h-3 mr-1.5" />
                Filtros
                {temFiltrosAtivos && (
                  <span className="ml-1.5 w-4 h-4 bg-blue-600 text-white rounded-full text-[9px] flex items-center justify-center">
                    {[filtroOperador.trim() !== "", filtroOperacoesSelecionadas.length > 0, filtroPolivalenciaMin.trim() !== ""].filter(Boolean).length}
                  </span>
                )}
              </Button>
              {temFiltrosAtivos && (
                <Button variant="ghost" size="sm" onClick={limparFiltros} className="rounded-sm text-xs h-8 text-gray-500 hover:text-gray-700">
                  <X className="w-3 h-3 mr-1" />Limpar
                </Button>
              )}
            </div>
          </div>

          {showFiltros && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-gray-200">
              <div>
                <Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Operador</Label>
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input value={filtroOperador} onChange={(e) => setFiltroOperador(e.target.value)} placeholder="Pesquisar por ID..." className="rounded-sm text-xs h-8 pl-7 bg-white" />
                </div>
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Operacoes (colunas)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between rounded-sm text-xs h-8 bg-white border-gray-200">
                      {filtroOperacoesSelecionadas.length > 0
                        ? `${filtroOperacoesSelecionadas.length} selecionada(s)`
                        : "Todas as operacoes"}
                      <ChevronsUpDown className="w-3 h-3 text-gray-500" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-2">
                    <div className="max-h-64 overflow-auto space-y-1">
                      {colunasBasePolivalencia.map((op) => {
                        const checked = filtroOperacoesSelecionadas.some(
                          (item) => normalizeText(item) === normalizeText(op)
                        );
                        return (
                          <button
                            key={op}
                            type="button"
                            onClick={() => toggleFiltroOperacao(op)}
                            className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-sm hover:bg-gray-100"
                          >
                            <span className="text-left">{op}</span>
                            {checked ? <Check className="w-3.5 h-3.5 text-blue-600" /> : null}
                          </button>
                        );
                      })}
                    </div>
                    <div className="pt-2 mt-2 border-t border-gray-200">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs w-full"
                        onClick={() => setFiltroOperacoesSelecionadas([])}
                      >
                        Limpar selecao
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Polivalencia min (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={filtroPolivalenciaMin}
                  onChange={(e) => setFiltroPolivalenciaMin(e.target.value)}
                  placeholder="ex: 85"
                  className="rounded-sm text-xs h-8 bg-white"
                />
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Ordenar por polivalencia</Label>
                <Select value={ordenacaoPolivalencia} onValueChange={(v) => setOrdenacaoPolivalencia(v as "nenhuma" | "asc" | "desc")}>
                  <SelectTrigger className="rounded-sm text-xs h-8 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-sm">
                    <SelectItem value="nenhuma" className="text-xs">Sem ordenacao</SelectItem>
                    <SelectItem value="desc" className="text-xs">Maior OLE primeiro</SelectItem>
                    <SelectItem value="asc" className="text-xs">Menor OLE primeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {temFiltrosAtivos && (
            <div className="text-[10px] text-gray-500">
              A mostrar <span className="font-semibold text-gray-700">{operadoresVisiveis.length}</span> de <span className="font-semibold text-gray-700">{operadores.length}</span> operadores
            </div>
          )}
        </div>

        <CardContent className="p-0">
          <div className="overflow-auto max-h-[65vh]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase sticky left-0 bg-gray-50 z-10 min-w-[140px]">Operador</th>
                  <th className="p-3 text-center text-xs font-semibold text-gray-600 uppercase whitespace-nowrap w-16">OLE %</th>
                  {colunasPolivalencia.map((pol) => (
                    <th key={pol} className="p-3 text-center text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">{pol}</th>
                  ))}
                  {mostrarColunaEliminar && (
                    <th className="p-3 text-center text-xs font-semibold text-gray-600 uppercase w-16 sticky right-0 bg-gray-50 z-10">Acoes</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {operadoresVisiveis.map((operador) => (
                  <tr key={operador.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-3 sticky left-0 bg-white z-10">
                      <div className="font-semibold text-sm text-gray-900">{operador.id}</div>
                    </td>
                    <td className="p-3 text-center">
                      {!tabelaSomenteLeitura && editandoCelula === `${operador.id}-ole` ? (
                        <Input
                          type="number" min={0} max={100}
                          defaultValue={operador.oleHistorico}
                          onBlur={(e) => { handleEditOLE(operador.id, Number(e.target.value)); setEditandoCelula(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { handleEditOLE(operador.id, Number((e.target as HTMLInputElement).value)); setEditandoCelula(null); } }}
                          autoFocus
                          className="h-8 w-16 text-xs text-center rounded-sm font-mono mx-auto"
                        />
                      ) : (
                        <Badge
                          variant="secondary"
                          className="font-mono font-semibold text-xs rounded-sm cursor-pointer"
                          onClick={() => { if (!tabelaSomenteLeitura) setEditandoCelula(`${operador.id}-ole`); }}
                        >
                          {operador.oleHistorico}%
                        </Badge>
                      )}
                    </td>
                    {colunasPolivalencia.map((pol) => {
                      const key = celulaKey(operador.id, pol);
                      const competencia = operador.competencias[pol];
                      return (
                        <td key={pol} className="p-2 text-center">
                          {!tabelaSomenteLeitura && editandoCelula === key ? (
                            <div className="space-y-1">
                              <Input
                                defaultValue={competencia ? competencia.operacao || "" : ""}
                                onBlur={(e) => { handleEditCompetencia(operador.id, pol, e.target.value || null); setEditandoCelula(null); }}
                                onKeyDown={(e) => { if (e.key === "Enter") { handleEditCompetencia(operador.id, pol, (e.target as HTMLInputElement).value || null); setEditandoCelula(null); } }}
                                autoFocus
                                className="h-8 text-xs rounded-sm min-w-[120px]"
                                list={`ops-${key}`}
                                placeholder="Operacao..."
                              />
                              {competencia && competencia.operacao && (
                                <Input
                                  type="number" min={0} max={100}
                                  defaultValue={competencia.ole}
                                  onBlur={(e) => handleEditCompetencia(operador.id, pol, competencia.operacao, Number(e.target.value))}
                                  className="h-7 text-xs rounded-sm min-w-[120px]"
                                  placeholder="OLE%"
                                />
                              )}
                              <datalist id={`ops-${key}`}>
                                {operacoesFamiliaSelecionada.map((opName) => <option key={opName} value={opName} />)}
                              </datalist>
                            </div>
                          ) : (
                            <div
                              className={`inline-flex flex-col items-center justify-center min-w-[120px] min-h-[36px] rounded-sm cursor-pointer transition-colors ${
                                competencia
                                  ? `px-3 py-2 font-medium text-xs ${getOleColorClasses(competencia.ole)}`
                                  : "w-10 h-10 bg-gray-100 text-gray-400 hover:bg-gray-200"
                              }`}
                              onClick={() => { if (!tabelaSomenteLeitura) setEditandoCelula(key); }}
                            >
                              {competencia ? (
                                <>
                                  <span className="text-xs font-mono">{competencia.ole}%</span>
                                </>
                              ) : "-"}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    {mostrarColunaEliminar && (
                      <td className="p-3 text-center sticky right-0 bg-white z-10">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleRemoverOperador(operador.id)}
                          className="h-7 w-7 p-0 rounded-sm hover:bg-orange-50 hover:text-orange-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="m-6 p-5 bg-gray-50 rounded-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-gray-500" />
              <span className="font-semibold text-gray-900 text-xs uppercase tracking-wide">Informacao</span>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <p>Clique numa celula da matriz para editar a competencia do operador</p>
              <p>{tabelaSomenteLeitura ? "Cada coluna representa uma operacao vinda da API de polivalencia" : "Cada posicao (POL_1, POL_2, etc.) representa uma competencia operacional especifica"}</p>
              <p>O OLE% indica a eficiencia historica do operador - clique para editar</p>
              <p className="text-blue-600">Todas as alteracoes sao guardadas automaticamente no ficheiro de sessao</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Configuração de Máquinas ── */}
      <Card className="shadow-sm border border-gray-200 rounded-sm bg-white">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center justify-between text-gray-900">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-sm flex items-center justify-center">
                <Cog className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-base font-semibold">Configuração de Máquinas</div>
                <CardDescription className="text-gray-500 mt-0.5 text-xs">
                  Definição de máquinas por tipo, ponto, largura e setup — clique para editar
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-sm text-xs">{maquinas.length} tipos</Badge>
              <Dialog open={showNovaMaquina} onOpenChange={setShowNovaMaquina}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600 rounded-sm text-xs font-medium cursor-pointer">
                    <Plus className="w-4 h-4 mr-2" />Nova Máquina
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-sm [&>button]:cursor-pointer">
                  <DialogHeader>
                    <DialogTitle className="text-base font-semibold">Adicionar Nova Máquina</DialogTitle>
                    <DialogDescription className="text-xs">Máquinas com ponto, largura ou setup diferente são consideradas máquinas distintas</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs font-medium">Tipo de Máquina</Label>
                      <Input value={novaMaquina.tipo} onChange={(e) => setNovaMaquina({ ...novaMaquina, tipo: e.target.value })} placeholder="ex: P/P1, P/C N flat lock" className="rounded-sm text-sm mt-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium">Largura</Label>
                        <Input value={novaMaquina.largura} onChange={(e) => setNovaMaquina({ ...novaMaquina, largura: e.target.value })} placeholder="ex: 5.6mm" className="rounded-sm text-sm mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs font-medium">Ponto (Gauge)</Label>
                        <Input value={novaMaquina.ponto} onChange={(e) => setNovaMaquina({ ...novaMaquina, ponto: e.target.value })} placeholder="ex: 301, 401, 607" className="rounded-sm text-sm mt-1" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium">Setup</Label>
                        <Input value={novaMaquina.setup} onChange={(e) => setNovaMaquina({ ...novaMaquina, setup: e.target.value })} placeholder="ex: Standard, Flat Lock" className="rounded-sm text-sm mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs font-medium">Quantidade</Label>
                        <Input type="number" min={1} value={novaMaquina.quantidade} onChange={(e) => setNovaMaquina({ ...novaMaquina, quantidade: Number(e.target.value) })} className="rounded-sm text-sm mt-1" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-sm border border-gray-200">
                      <div>
                        <Label className="text-xs font-medium">Permitir Agrupamento</Label>
                        <p className="text-[10px] text-gray-500 mt-0.5">Agrupar com máquinas de mesma configuração</p>
                      </div>
                      <Switch className="cursor-pointer" checked={novaMaquina.agrupavel} onCheckedChange={(checked) => setNovaMaquina({ ...novaMaquina, agrupavel: checked })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCriarMaquina} className="bg-blue-500 hover:bg-blue-600 rounded-sm text-xs cursor-pointer" disabled={!novaMaquina.tipo.trim()}>
                      Adicionar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[65vh]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase min-w-[60px]">ID</th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase min-w-[140px]">Tipo</th>
                  <th className="p-3 text-center text-xs font-semibold text-gray-600 uppercase min-w-[80px]">Ponto</th>
                  <th className="p-3 text-center text-xs font-semibold text-gray-600 uppercase min-w-[80px]">Largura</th>
                  <th className="p-3 text-center text-xs font-semibold text-gray-600 uppercase min-w-[100px]">Setup</th>
                  <th className="p-3 text-center text-xs font-semibold text-gray-600 uppercase min-w-[50px]">Qtd</th>
                  <th className="p-3 text-center text-xs font-semibold text-gray-600 uppercase min-w-[90px]">Agrupável</th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase min-w-[200px]">Operações Compatíveis</th>
                  <th className="p-3 text-center text-xs font-semibold text-gray-600 uppercase w-16">Ações</th>
                </tr>
              </thead>
              <tbody>
                {maquinas.map((maq) => (
                  <tr key={maq.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-3"><span className="font-mono text-xs text-gray-500">{maq.id}</span></td>
                    <td className="p-3">
                      {editandoCelula === `maq-${maq.id}-tipo` ? (
                        <Input
                          defaultValue={maq.tipo}
                          onBlur={(e) => { handleEditarCampoMaquina(maq.id, "tipo", e.target.value); setEditandoCelula(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { handleEditarCampoMaquina(maq.id, "tipo", (e.target as HTMLInputElement).value); setEditandoCelula(null); } }}
                          autoFocus className="h-7 text-xs rounded-sm"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600" onClick={() => setEditandoCelula(`maq-${maq.id}-tipo`)}>{maq.tipo}</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {editandoCelula === `maq-${maq.id}-ponto` ? (
                        <Input defaultValue={maq.ponto} onBlur={(e) => { handleEditarCampoMaquina(maq.id, "ponto", e.target.value); setEditandoCelula(null); }} onKeyDown={(e) => { if (e.key === "Enter") { handleEditarCampoMaquina(maq.id, "ponto", (e.target as HTMLInputElement).value); setEditandoCelula(null); } }} autoFocus className="h-7 text-xs rounded-sm w-20 text-center mx-auto" />
                      ) : (
                        <Badge variant="secondary" className="font-mono text-xs rounded-sm cursor-pointer" onClick={() => setEditandoCelula(`maq-${maq.id}-ponto`)}>{maq.ponto}</Badge>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {editandoCelula === `maq-${maq.id}-largura` ? (
                        <Input defaultValue={String(maq.largura)} onBlur={(e) => { handleEditarCampoMaquina(maq.id, "largura", parseFloat(e.target.value) || 0); setEditandoCelula(null); }} onKeyDown={(e) => { if (e.key === "Enter") { handleEditarCampoMaquina(maq.id, "largura", parseFloat((e.target as HTMLInputElement).value) || 0); setEditandoCelula(null); } }} autoFocus className="h-7 text-xs rounded-sm w-20 text-center mx-auto" />
                      ) : (
                        <Badge variant="secondary" className="font-mono text-xs rounded-sm cursor-pointer" onClick={() => setEditandoCelula(`maq-${maq.id}-largura`)}>{maq.largura}</Badge>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {editandoCelula === `maq-${maq.id}-setup` ? (
                        <Input defaultValue={maq.setup} onBlur={(e) => { handleEditarCampoMaquina(maq.id, "setup", e.target.value); setEditandoCelula(null); }} onKeyDown={(e) => { if (e.key === "Enter") { handleEditarCampoMaquina(maq.id, "setup", (e.target as HTMLInputElement).value); setEditandoCelula(null); } }} autoFocus className="h-7 text-xs rounded-sm w-24 text-center mx-auto" />
                      ) : (
                        <span className="text-xs text-gray-700 cursor-pointer hover:text-blue-600" onClick={() => setEditandoCelula(`maq-${maq.id}-setup`)}>{maq.setup}</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {editandoCelula === `maq-${maq.id}-qtd` ? (
                        <Input type="number" min={0} defaultValue={maq.quantidade} onBlur={(e) => { handleEditarCampoMaquina(maq.id, "quantidade", Number(e.target.value)); setEditandoCelula(null); }} onKeyDown={(e) => { if (e.key === "Enter") { handleEditarCampoMaquina(maq.id, "quantidade", Number((e.target as HTMLInputElement).value)); setEditandoCelula(null); } }} autoFocus className="h-7 text-xs rounded-sm w-14 text-center mx-auto font-mono" />
                      ) : (
                        <span className="font-mono text-sm font-bold text-gray-900 cursor-pointer hover:text-blue-600" onClick={() => setEditandoCelula(`maq-${maq.id}-qtd`)}>{maq.quantidade}</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <Switch
                        checked={maq.agrupavel}
                        onCheckedChange={(checked) => handleEditarCampoMaquina(maq.id, "permitirAgrupamento", checked)}
                      />
                      <div className="text-[9px] text-gray-400 mt-0.5">{maq.agrupavel ? "Sim" : "Não"}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {maq.operacoesCompativeis.length > 0 ? (
                          maq.operacoesCompativeis.map((op) => (
                            <Badge key={op} variant="secondary" className="text-[10px] rounded-sm cursor-pointer hover:bg-gray-300" onClick={() => handleToggleOperacaoMaquina(maq.id, op)}>
                              {op}<X className="w-2.5 h-2.5 ml-1" />
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[10px] text-gray-400">Nenhuma</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <Button variant="ghost" size="sm" onClick={() => handleRemoverMaquina(maq.id)} className="h-7 w-7 p-0 rounded-sm hover:bg-orange-50 hover:text-orange-600">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="m-6 p-5 bg-blue-50 rounded-sm border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-gray-900 text-xs uppercase tracking-wide">Regras de Diferenciação de Máquinas</span>
            </div>
            <div className="text-xs text-gray-700 space-y-2">
              <div className="flex items-start gap-2"><div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 flex-shrink-0" /><p>Máquinas com <span className="font-semibold">ponto (gauge) diferente</span> são consideradas máquinas distintas</p></div>
              <div className="flex items-start gap-2"><div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 flex-shrink-0" /><p>Máquinas com <span className="font-semibold">largura diferente</span> são consideradas máquinas distintas</p></div>
              <div className="flex items-start gap-2"><div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 flex-shrink-0" /><p>Máquinas com <span className="font-semibold">setup diferente</span> são consideradas máquinas distintas</p></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matriz de Polivalência por Grupos */}
      <MatrizPolivalenciaGrupos operadores={operadores} grupos={produtosMock} />

      {/* Catálogo de Máquinas */}
      <CatalogoMaquinas
        maquinas={dados.maquinas}
        onAddMaquina={handleAddMaquinaAoCatalogo}
        onEditMaquina={handleEditMaquinaDoCatalogo}
        onRemoveMaquina={handleRemoveMaquinaDoCatalogo}
      />

      {/* Configuração de Layout */}
      <ConfiguracaoLayoutComponent layout={layout} onLayoutChange={setLayout} />
    </main>
  );
}


