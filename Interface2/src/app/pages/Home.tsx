import { useState, useEffect, useCallback, useMemo } from "react";
import { Operador, Operacao, ConfiguracaoDistribuicao } from "../types";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Calculator, Users, Package, Factory, ChevronDown, Edit3 } from "lucide-react";
import { ConfiguracaoDistribuicaoComponent } from "../components/ConfiguracaoDistribuicao";
import { LayoutConfigurador, LayoutConfig } from "../components/LayoutConfigurador";
import { OperadorSelector } from "../components/OperadorSelector";
import { TabelaOperacoesManual } from "../components/TabelaOperacoesManual";
import { calcularBalanceamento } from "../utils/balanceamento";
import { MAX_HISTORICO, normalizarHistorico } from "../utils/historico";
import { useStorage } from "../contexts/StorageContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

// ─── Valores por defeito ──────────────────────────────────────────────────────

const configPadrao = {
  possibilidade: 1 as 1 | 2 | 3 | 4,
  agruparMaquinas: false,
  cargaMaximaOperador: 95,
  naoDividirMaiorQue: 0.9,
  naoDividirMenorQue: 1.1,
  horasTurno: 8,
  produtividadeEstimada: 85,
};

const layoutPadrao: LayoutConfig = {
  tipoLayout: "espinha",
  postosPorLado: 8,
  distanciaMaxima: 3,
  permitirRetrocesso: false,
  permitirCruzamento: true,
  restricoes: [],
};

function criarUnidadePadrao(operadores: Operador[]) {
  return {
    operadores: operadores,
    operadoresSelecionados: operadores.map((op) => op.id),
    atribuicoesManual: {} as { [operacaoId: string]: string[] },
    config: { ...configPadrao },
  };
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate();
  const { dados, salvar, pronto } = useStorage();

  // ── Operadores vêm SEMPRE do contexto (fonte de verdade única) ────────────
  // Nunca importar operadoresMock directamente aqui
  const operadoresMaster = dados.operadores;
  const [produtos, setProdutos] = useState(dados.produtos);

  useEffect(() => {
    setProdutos(dados.produtos);
  }, [dados.produtos]);

  // Ler configuração guardada
  const confGuardada = dados.configuracao;

  const construirDadosUnidades = useCallback(
    (
      operadoresBase: Operador[],
      dadosGuardados: typeof confGuardada.dadosUnidades | undefined
    ) => {
      const u1 = criarUnidadePadrao(operadoresBase);
      const u2 = criarUnidadePadrao(operadoresBase);
      const u3 = criarUnidadePadrao(operadoresBase);
      const g = dadosGuardados;
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
    },
    []
  );

  // ─── Estado local (inicializado a partir do contexto) ─────────────────────

  const [unidadeAtiva, setUnidadeAtiva] = useState<1 | 2 | 3>(1);

  const [grupoArtigoSelecionado, setGrupoArtigoSelecionado] = useState<string>(
    confGuardada.grupoArtigoSelecionado || produtos[0]?.id || ""
  );

  const [operacoesManual, setOperacoesManual] = useState<Operacao[]>(
    confGuardada.operacoesManual || []
  );

  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(
    confGuardada.layoutConfig || layoutPadrao
  );

  const [dadosUnidades, setDadosUnidades] = useState(() =>
    construirDadosUnidades(operadoresMaster, confGuardada.dadosUnidades)
  );

  // ── Sincronizar com o contexto quando os dados carregam do ficheiro ───────

  const [sincronizado, setSincronizado] = useState(false);

  useEffect(() => {
    if (!pronto) return;
    if (sincronizado) return;
    const conf = dados.configuracao;
    const ops = dados.operadores;
    setSincronizado(true);

    setGrupoArtigoSelecionado(conf.grupoArtigoSelecionado || dados.produtos[0]?.id || "");
    setOperacoesManual(conf.operacoesManual || []);
    setLayoutConfig(conf.layoutConfig || layoutPadrao);
    setDadosUnidades(construirDadosUnidades(ops, conf.dadosUnidades));
  }, [pronto, sincronizado, dados, construirDadosUnidades]);

  useEffect(() => {
    if (produtos.length === 0) {
      if (grupoArtigoSelecionado !== "") setGrupoArtigoSelecionado("");
      return;
    }

    const existeSelecionado = produtos.some((p) => p.id === grupoArtigoSelecionado);
    if (!existeSelecionado) {
      setGrupoArtigoSelecionado(produtos[0].id);
    }
  }, [produtos, grupoArtigoSelecionado]);

  // Quando a lista de operadores no contexto muda (ex: apagar em Configuração),
  // actualizar as unidades para reflectir a mudança
  useEffect(() => {
    if (!pronto || !sincronizado) return;
    const ops = dados.operadores;

    const sincronizarUnidade = (unidade: typeof dadosUnidades[1]) => {
      const idsAtuais = new Set(ops.map((o) => o.id));
      const idsConhecidosAntes = new Set(unidade.operadores.map((o) => o.id));
      const idsMantidos = unidade.operadoresSelecionados.filter((id) => idsAtuais.has(id));
      const idsNovos = ops.map((o) => o.id).filter((id) => !idsConhecidosAntes.has(id));

      return {
        ...unidade,
        operadores: ops,
        operadoresSelecionados: [...idsMantidos, ...idsNovos],
      };
    };

    setDadosUnidades((prev) => ({
      1: sincronizarUnidade(prev[1]),
      2: sincronizarUnidade(prev[2]),
      3: sincronizarUnidade(prev[3]),
    }));
  }, [pronto, sincronizado, dados.operadores]);

  // ─── Auto-save em cada mudança de estado ─────────────────────────────────

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
    if (!pronto || !sincronizado) return;
    guardarConfiguracaoAtual();
  }, [pronto, sincronizado, guardarConfiguracaoAtual]);

  // ─── Atalhos ──────────────────────────────────────────────────────────────

  const operadores = dadosUnidades[unidadeAtiva].operadores;
  const operadoresSelecionados = dadosUnidades[unidadeAtiva].operadoresSelecionados;
  const atribuicoesManualRaw = dadosUnidades[unidadeAtiva].atribuicoesManual;
  const config = dadosUnidades[unidadeAtiva].config as ConfiguracaoDistribuicao;

  const produto = produtos.find((p) => p.id === grupoArtigoSelecionado);
  const operacoes = config.possibilidade === 4
    ? operacoesManual
    : (produto ? produto.operacoes : []);

  const chaveAtribuicaoPorProduto = useCallback(
    (operacaoId: string) => {
      if (config.possibilidade === 4 || !grupoArtigoSelecionado) return operacaoId;
      return `${grupoArtigoSelecionado}::${operacaoId}`;
    },
    [config.possibilidade, grupoArtigoSelecionado]
  );

  const atribuicoesManual = useMemo(() => {
    const resultado: { [operacaoId: string]: string[] } = {};

    operacoes.forEach((operacao) => {
      const chaveComProduto = chaveAtribuicaoPorProduto(operacao.id);
      const atribuicao =
        atribuicoesManualRaw[chaveComProduto] ||
        atribuicoesManualRaw[operacao.id] ||
        atribuicoesManualRaw[operacao.nome];
      if (Array.isArray(atribuicao)) {
        resultado[operacao.id] = atribuicao;
      }
    });

    return resultado;
  }, [operacoes, atribuicoesManualRaw, chaveAtribuicaoPorProduto]);

  const numeroMaquinasDisponiveis = useMemo(() => {
    if (operacoes.length === 0) return 0;

    const maquinasAtivas = dados.maquinas.filter((maq) => maq.ativa && maq.quantidade > 0);
    return maquinasAtivas.reduce((total, maq) => {
      const compativel = operacoes.some((operacao) =>
        maq.operacoesCompativeis.includes(operacao.nome) ||
        maq.tipo === operacao.tipoMaquina ||
        Boolean(operacao.tipoMaquina2 && maq.tipo === operacao.tipoMaquina2)
      );
      return compativel ? total + maq.quantidade : total;
    }, 0);
  }, [dados.maquinas, operacoes]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

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
    const chave = chaveAtribuicaoPorProduto(operacaoId);
    const operacaoAtual = operacoes.find((operacao) => operacao.id === operacaoId);

    setDadosUnidades((prev) => ({
      ...prev,
      [unidadeAtiva]: {
        ...prev[unidadeAtiva],
        atribuicoesManual: (() => {
          const atribuicoes = { ...prev[unidadeAtiva].atribuicoesManual };
          if (operacaoAtual?.nome) delete atribuicoes[operacaoAtual.nome];
          delete atribuicoes[operacaoId];
          if (operadorIds.length > 0) atribuicoes[chave] = operadorIds;
          else delete atribuicoes[chave];
          return atribuicoes;
        })(),
      },
    }));
  };

  const handleToggleOperadorOperacao = (operacaoId: string, operadorId: string) => {
    const atribuidos = atribuicoesManual[operacaoId] || [];
    const novaAtribuicao = atribuidos.includes(operadorId)
      ? atribuidos.filter((id) => id !== operadorId)
      : [...atribuidos, operadorId];
    handleAtribuirManualmente(operacaoId, novaAtribuicao);
  };

  const operadorPodeFazerOperacao = (operador: Operador, operacaoNome: string): boolean => {
    return Object.values(operador.competencias).some(
      (comp) => comp && comp.operacao === operacaoNome
    );
  };

  const getOleOperadorOperacao = (operador: Operador, operacaoNome: string): number => {
    const competencia = Object.values(operador.competencias).find(
      (comp) => comp && comp.operacao === operacaoNome
    );
    return competencia ? competencia.ole : operador.oleHistorico;
  };

  const handleCalcular = async () => {
    try {
      const operadoresDisponiveis = operadores.filter((op) =>
        operadoresSelecionados.includes(op.id)
      );

      if (operadoresDisponiveis.length === 0) {
        alert("Por favor, selecione pelo menos um operador.");
        return;
      }

      if (operacoes.length === 0) {
        alert("Por favor, selecione um produto com operações.");
        return;
      }

      const resultados = calcularBalanceamento(
        operadoresDisponiveis,
        operacoes,
        config,
        atribuicoesManual,
        dados.maquinas
      );

      const dataToPass = {
        resultados,
        operadores: operadoresDisponiveis,
        operacoes,
        config,
        layoutConfig,
        atribuicoesManual,
      };

      // Save to persistent storage instead of just sessionStorage
      await salvar({
        resultadosAtuais: {
          ...dataToPass,
          timestamp: new Date().toISOString(),
        },
      });

      // Keep sessionStorage for backward compatibility
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

      const historicoAtual = normalizarHistorico(dados.historico as any[]);
      const historicoAtualizado = [novoRegisto, ...historicoAtual].slice(0, MAX_HISTORICO);

      // Guardar no ficheiro — inclui configuração actual + histórico actualizado
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
        historico: historicoAtualizado,
      });

      navigate("/resultados", { state: dataToPass });
    } catch (error) {
      console.error("Erro ao calcular balanceamento:", error);
      alert("Erro ao calcular balanceamento.");
    }
  };

  const tempoTotal = operacoes.reduce((sum, op) => sum + op.tempo, 0);
  const [gamaExpandida, setGamaExpandida] = useState(false);

  // ─── Render ───────────────────────────────────────────────────────────────

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
        <div className="flex items-center gap-3">
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
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-teal-100 rounded-sm flex items-center justify-center">
              <Users className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Operadores</div>
              <div className="text-2xl font-bold text-gray-900">{operadoresSelecionados.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-sm flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Operações</div>
              <div className="text-2xl font-bold text-gray-900">{operacoes.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-sm flex items-center justify-center">
              <Factory className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Máquinas</div>
              <div className="text-2xl font-bold text-gray-900">
                {numeroMaquinasDisponiveis}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seleção de Grupo de Artigo */}
      {config.possibilidade !== 4 && (
        <div className="bg-white p-5 rounded-sm border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">Grupo de Artigo:</span>
            </div>
            <Select value={grupoArtigoSelecionado} onValueChange={setGrupoArtigoSelecionado}>
              <SelectTrigger className="w-[350px] rounded-sm text-sm">
                <SelectValue placeholder="Selecione um grupo de artigo" />
              </SelectTrigger>
              <SelectContent className="rounded-sm">
                {produtos.map((prod) => (
                  <SelectItem key={prod.id} value={prod.id} className="text-sm">
                    <span className="font-mono text-xs text-gray-500 mr-2">{prod.referencia}</span>
                    {prod.nome}
                    <span className="text-gray-400 ml-2">({prod.operacoes.length} ops)</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {produto && (
              <div className="text-xs text-gray-500">
                Tempo total: <span className="font-mono">{tempoTotal.toFixed(2)} min</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Configuração de Distribuição */}
      <ConfiguracaoDistribuicaoComponent
        config={config}
        onChange={handleConfigChange}
        numeroOperadoresDisponiveis={operadoresSelecionados.length}
        operacoes={operacoes}
        onCalcularOperadoresNecessarios={handleCalcularOperadoresNecessarios}
      />

      {/* Tabela de Operações Manual */}
      {config.possibilidade === 4 && (
        <div className="bg-white p-5 rounded-sm border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-sm flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Entrada Manual de Operações</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Preencha os dados das operações directamente na tabela
              </p>
            </div>
          </div>
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

      {/* Parâmetros de Balanceamento */}
      {config.possibilidade !== 4 && (
        <div className="shadow-sm border border-gray-200 rounded-sm bg-white">
          <div className="p-5 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-gray-700" />
              <div>
                <h3 className="text-base font-semibold text-gray-900">Parâmetros de Balanceamento</h3>
                <p className="text-xs text-gray-500 font-normal mt-0.5">
                  Parâmetros de entrada conforme o método selecionado
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Entradas</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {config.possibilidade === 1 && (
                  <>
                    <div className="flex items-stretch">
                      <div className="bg-gray-100 border border-gray-200 px-4 py-3 flex items-center rounded-l-sm flex-1">
                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Horas do Turno</span>
                      </div>
                      <input
                        type="number" step="0.5" min={1} max={24}
                        value={config.horasTurno}
                        onChange={(e) => handleConfigChange({ ...config, horasTurno: Number(e.target.value) })}
                        className="bg-white border border-gray-300 px-4 py-3 text-sm text-gray-900 font-semibold rounded-r-sm w-32 text-right focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div className="flex items-stretch">
                      <div className="bg-gray-100 border border-gray-200 px-4 py-3 flex items-center rounded-l-sm flex-1">
                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Produtividade Estimada (%)</span>
                      </div>
                      <input
                        type="number" step="1" min={0} max={100}
                        value={config.produtividadeEstimada}
                        onChange={(e) => handleConfigChange({ ...config, produtividadeEstimada: Number(e.target.value) })}
                        className="bg-white border border-gray-300 px-4 py-3 text-sm text-gray-900 font-semibold rounded-r-sm w-32 text-right focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div className="flex items-stretch">
                      <div className="bg-gray-100 border border-gray-200 px-4 py-3 flex items-center rounded-l-sm flex-1">
                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Nº de Operadores</span>
                      </div>
                      <div className="bg-gray-50 border border-gray-300 px-4 py-3 text-sm text-gray-900 font-semibold rounded-r-sm w-32 text-right font-mono flex items-center justify-end">
                        {operadoresSelecionados.length}
                      </div>
                    </div>
                  </>
                )}

                {config.possibilidade === 2 && (
                  <>
                    <div className="flex items-stretch">
                      <div className="bg-gray-100 border border-gray-200 px-4 py-3 flex items-center rounded-l-sm flex-1">
                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Objetivo (peças/dia)</span>
                      </div>
                      <input
                        type="number" min={1}
                        value={config.quantidadeObjetivo || ""}
                        onChange={(e) => {
                          const quantidade = Number(e.target.value);
                          handleConfigChange({ ...config, quantidadeObjetivo: quantidade });
                          if (quantidade > 0) handleCalcularOperadoresNecessarios(quantidade);
                        }}
                        placeholder="Ex: 500"
                        className="bg-white border border-gray-300 px-4 py-3 text-sm text-gray-900 font-semibold rounded-r-sm w-32 text-right focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div className="flex items-stretch">
                      <div className="bg-gray-100 border border-gray-200 px-4 py-3 flex items-center rounded-l-sm flex-1">
                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Horas do Turno</span>
                      </div>
                      <input
                        type="number" step="0.5" min={1} max={24}
                        value={config.horasTurno}
                        onChange={(e) => handleConfigChange({ ...config, horasTurno: Number(e.target.value) })}
                        className="bg-white border border-gray-300 px-4 py-3 text-sm text-gray-900 font-semibold rounded-r-sm w-32 text-right focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </>
                )}

                {config.possibilidade === 3 && (
                  <>
                    <div className="flex items-stretch">
                      <div className="bg-gray-100 border border-gray-200 px-4 py-3 flex items-center rounded-l-sm flex-1">
                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Nº de Operadores</span>
                      </div>
                      <input
                        type="number" min={1} max={operadores.length}
                        value={config.numeroOperadores || operadoresSelecionados.length}
                        onChange={(e) => {
                          const num = Math.min(Number(e.target.value), operadores.length);
                          handleConfigChange({ ...config, numeroOperadores: num });
                          const novos = operadores.slice(0, num).map((op) => op.id);
                          setDadosUnidades((prev) => ({
                            ...prev,
                            [unidadeAtiva]: { ...prev[unidadeAtiva], operadoresSelecionados: novos },
                          }));
                        }}
                        className="bg-white border border-gray-300 px-4 py-3 text-sm text-gray-900 font-semibold rounded-r-sm w-32 text-right focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div className="flex items-stretch">
                      <div className="bg-gray-100 border border-gray-200 px-4 py-3 flex items-center rounded-l-sm flex-1">
                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Disponíveis na Linha</span>
                      </div>
                      <div className="bg-gray-50 border border-gray-300 px-4 py-3 text-sm text-gray-900 font-semibold rounded-r-sm w-32 text-right font-mono flex items-center justify-end">
                        {operadores.length}
                      </div>
                    </div>
                    <div className="flex items-stretch">
                      <div className="bg-gray-100 border border-gray-200 px-4 py-3 flex items-center rounded-l-sm flex-1">
                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Horas do Turno</span>
                      </div>
                      <input
                        type="number" step="0.5" min={1} max={24}
                        value={config.horasTurno}
                        onChange={(e) => handleConfigChange({ ...config, horasTurno: Number(e.target.value) })}
                        className="bg-white border border-gray-300 px-4 py-3 text-sm text-gray-900 font-semibold rounded-r-sm w-32 text-right focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gama Operatória */}
      {config.possibilidade !== 4 && (
        <div className="bg-white rounded-sm border border-gray-200 shadow-sm">
          <div
            className="p-5 border-b border-gray-200 cursor-pointer select-none hover:bg-gray-50 transition-colors"
            onClick={() => setGamaExpandida(!gamaExpandida)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-sm flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Gama Operatória — {produto?.nome || "Sem produto"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Operações carregadas da ficha técnica do produto selecionado
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 font-mono">
                  {operacoes.length} ops · {tempoTotal.toFixed(2)} min
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${gamaExpandida ? "rotate-180" : ""}`}
                />
              </div>
            </div>
          </div>

          {gamaExpandida && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase w-16">Seq.</th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase w-20">ID</th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Descrição</th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase w-28">Tempo (min)</th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">Máquina</th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase min-w-[200px]">Operadores Disponíveis</th>
                  </tr>
                </thead>
                <tbody>
                  {operacoes.map((operacao) => {
                    const operadoresAtribuidos = atribuicoesManual[operacao.id] || [];
                    return (
                      <tr
                        key={operacao.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${operacao.critica ? "bg-orange-50" : ""}`}
                      >
                        <td className="p-3 font-mono text-sm text-gray-700">{operacao.sequencia}</td>
                        <td className="p-3">
                          <span className="font-mono font-semibold text-sm text-blue-700 bg-blue-50 px-2 py-1 rounded-sm border border-blue-200">
                            {operacao.id}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-gray-700">
                          {operacao.nome}
                          {operacao.critica && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium bg-orange-200 text-orange-800 border border-orange-300">
                              CRÍTICA
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-sm text-gray-700">{operacao.tempo.toFixed(2)}</td>
                        <td className="p-3 text-sm text-gray-600">{operacao.tipoMaquina || "—"}</td>
                        <td className="p-3">
                          <OperadorSelector
                            operadores={operadoresSelecionados.map((opId) => {
                              const op = operadores.find((o) => o.id === opId);
                              if (!op) return { id: opId, ole: 0, podeOperar: false };
                              return {
                                id: op.id,
                                ole: getOleOperadorOperacao(op, operacao.nome),
                                podeOperar: operadorPodeFazerOperacao(op, operacao.nome),
                              };
                            })}
                            atribuidos={operadoresAtribuidos}
                            onToggle={(operadorId) => handleToggleOperadorOperacao(operacao.id, operadorId)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-300">
                    <td colSpan={3} className="p-3 text-xs font-semibold text-gray-700 uppercase">Total</td>
                    <td className="p-3 font-mono font-bold text-sm text-gray-900">{tempoTotal.toFixed(2)} min</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Configuração de Layout */}
      <LayoutConfigurador operacoes={operacoes} onLayoutChange={setLayoutConfig} />

      {/* Indicadores Gerais por Produto */}
      <div className="bg-white rounded-sm border border-gray-200 shadow-sm">
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-gray-700" />
            <div>
              <h3 className="text-base font-semibold text-gray-900">Indicadores Gerais por Produto</h3>
              <p className="text-xs text-gray-500 font-normal mt-0.5">
                Visão geral dos produtos configurados e suas máquinas alocadas
              </p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {produtos.map((prod) => {
              const maquinasUsadas = new Set(prod.operacoes.map(op => op.tipoMaquina).filter(Boolean));
              const maquinasDisponiveis = dados.maquinas.filter(m => m.ativa && maquinasUsadas.has(m.tipo));
              const tempoTotalProd = prod.operacoes.reduce((sum, op) => sum + op.tempo, 0);
              const operadoresAtribuidos = new Set();
              prod.operacoes.forEach(op => {
                const chave = `${prod.id}::${op.id}`;
                const atribs = dadosUnidades[unidadeAtiva].atribuicoesManual[chave] || [];
                atribs.forEach(id => operadoresAtribuidos.add(id));
              });

              return (
                <div key={prod.id} className="bg-gray-50 rounded-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">{prod.nome}</h4>
                    <span className="text-xs font-mono text-gray-500 bg-white px-2 py-1 rounded-sm border">
                      {prod.referencia}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Operações:</span>
                      <span className="font-mono font-semibold">{prod.operacoes.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tempo Total:</span>
                      <span className="font-mono font-semibold">{tempoTotalProd.toFixed(2)} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Máquinas Alocadas:</span>
                      <span className="font-mono font-semibold">{maquinasDisponiveis.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Operadores Atribuídos:</span>
                      <span className="font-mono font-semibold">{operadoresAtribuidos.size}</span>
                    </div>
                    {maquinasDisponiveis.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <span className="text-gray-600 text-xs mb-2 block">Máquinas:</span>
                        <div className="flex flex-wrap gap-1">
                          {maquinasDisponiveis.map(m => (
                            <span key={m.id} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-sm border border-blue-200">
                              {m.tipo}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Botão Calcular */}
      <div className="flex justify-center pt-4">
        <Button
          type="button"
          size="lg"
          onClick={handleCalcular}
          disabled={operadoresSelecionados.length === 0 || operacoes.length === 0}
          className="px-12 py-6 text-sm font-semibold bg-blue-500 hover:bg-blue-600 rounded-sm uppercase tracking-wide"
        >
          <Calculator className="w-5 h-5 mr-2" />
          Calcular Balanceamento
        </Button>
      </div>
    </main>
  );
}
