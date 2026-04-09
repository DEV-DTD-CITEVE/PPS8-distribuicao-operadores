import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { LogOperacao, Maquina, Operador, Produto } from "../types";
import { produtosMock } from "../data/mock";
import {
  abrirFicheiroExistente,
  carregarHandleIDB,
  carregarSessaoIDB,
  criarNovoFicheiro,
  escreverFicheiro,
  escreverSessaoOPFS,
  guardarHandleIDB,
  guardarSessaoIDB,
  lerFicheiro,
  lerSessaoOPFS,
  limparHandleIDB,
  pedirPermissao,
  suportaFSA,
  suportaOPFS,
  verificarPermissao,
} from "../utils/fileStorageDB";

export type EstadoConexao =
  | "a-carregar"
  | "sem-suporte"
  | "desconectado"
  | "pede-permissao"
  | "conectado"
  | "a-guardar"
  | "erro";

export interface DadosSessao {
  versao: string;
  ultimaModificacao: string;
  operadores: Operador[];
  maquinas: Maquina[];
  produtos: Produto[];
  configuracao: {
    grupoArtigoSelecionado: string;
    operacoesManual: any[];
    layoutConfig: any;
    dadosUnidades: {
      [key: string]: {
        config: any;
        operadoresSelecionados: string[];
        atribuicoesManual: { [key: string]: string[] };
      };
    };
  };
  historico: HistoricoBalanceamento[];
  resultadosAtuais?: {
    resultados: ResultadosBalanceamento;
    operadores: Operador[];
    operacoes: Operacao[];
    config: ConfiguracaoDistribuicao;
    layoutConfig: any;
    atribuicoesManual: { [key: string]: string[] };
    timestamp: string;
  };
  logOperacoes: LogOperacao[];
}

function clonarProdutos(produtos: Produto[]): Produto[] {
  return produtos.map((produto) => ({
    ...produto,
    operacoes: produto.operacoes.map((operacao) => ({ ...operacao })),
  }));
}

const dadosPadrao: DadosSessao = {
  versao: "1.0",
  ultimaModificacao: new Date().toISOString(),
  operadores: [],
  maquinas: [],
  produtos: clonarProdutos(produtosMock),
  configuracao: {
    grupoArtigoSelecionado: "",
    operacoesManual: [],
    layoutConfig: {
      tipoLayout: "espinha",
      postosPorLado: 8,
      distanciaMaxima: 3,
      permitirRetrocesso: false,
      permitirCruzamento: true,
      restricoes: [],
    },
    dadosUnidades: {},
  },
  historico: [],
  logOperacoes: [],
};

interface StorageContextType {
  estadoConexao: EstadoConexao;
  nomeFicheiro: string | null;
  dados: DadosSessao;
  ultimaGravacao: Date | null;
  pronto: boolean;
  criarFicheiro: () => Promise<void>;
  abrirFicheiro: () => Promise<void>;
  reconectar: () => Promise<void>;
  desconectar: () => Promise<void>;
  salvar: (parcial: DeepPartial<DadosSessao>) => Promise<void>;
  logOperacao: (log: Omit<LogOperacao, "id" | "timestamp">) => Promise<void>;
  adicionarOperador: (operador: Operador) => Promise<void>;
  removerOperador: (id: string) => Promise<void>;
  actualizarOperador: (id: string, updates: Partial<Operador>) => Promise<void>;
  adicionarMaquina: (maquina: Maquina) => Promise<void>;
  removerMaquina: (id: string) => Promise<void>;
  actualizarMaquina: (id: string, updates: Partial<Maquina>) => Promise<void>;
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

const StorageContext = createContext<StorageContextType | null>(null);

export function useStorage(): StorageContextType {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error("useStorage deve ser usado dentro de StorageProvider");
  return ctx;
}

function normalizarDados(parcial: any): DadosSessao {
  const maquinasNormalizadas = Array.isArray(parcial?.maquinas) ? parcial.maquinas : [];
  const produtosNormalizados = Array.isArray(parcial?.produtos)
    ? clonarProdutos(parcial.produtos)
    : clonarProdutos(produtosMock);

  // Ajustar operações dos produtos para usar apenas máquinas existentes
  const tiposMaquinaExistentes = new Set(maquinasNormalizadas.map(m => m.tipo));
  const ajustarOperacoes = (operacoes: any[]) => 
    operacoes.map(op => ({
      ...op,
      tipoMaquina: tiposMaquinaExistentes.has(op.tipoMaquina) ? op.tipoMaquina : (maquinasNormalizadas[0]?.tipo || "Geral"),
      tipoMaquina2: op.tipoMaquina2 && tiposMaquinaExistentes.has(op.tipoMaquina2) ? op.tipoMaquina2 : undefined,
    }));

  const produtosAjustados = produtosNormalizados.map(produto => ({
    ...produto,
    operacoes: ajustarOperacoes(produto.operacoes),
  }));

  return {
    ...dadosPadrao,
    ...parcial,
    operadores: Array.isArray(parcial?.operadores) ? parcial.operadores : [],
    maquinas: maquinasNormalizadas,
    produtos: produtosAjustados,
    historico: Array.isArray(parcial?.historico) ? parcial.historico : [],
    resultadosAtuais: parcial?.resultadosAtuais || undefined,
    configuracao: {
      ...dadosPadrao.configuracao,
      ...(parcial?.configuracao || {}),
      dadosUnidades: {
        ...dadosPadrao.configuracao.dadosUnidades,
        ...(parcial?.configuracao?.dadosUnidades || {}),
      },
    },
    logOperacoes: Array.isArray(parcial?.logOperacoes) ? parcial.logOperacoes : [],
  };
}

function tsToMs(ts: string | undefined): number {
  if (!ts) return 0;
  const ms = new Date(ts).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

// Funções de persistência com localStorage
const STORAGE_KEY = "balanceamento_dados";

function salvarLocalStorage(dados: DadosSessao): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
  } catch (e) {
    console.warn("Erro ao salvar no localStorage:", e);
  }
}

function carregarLocalStorage(): DadosSessao | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return normalizarDados(JSON.parse(data));
    }
  } catch (e) {
    console.warn("Erro ao carregar do localStorage:", e);
  }
  return null;
}

type UnidadeDados = {
  config: any;
  operadoresSelecionados: string[];
  atribuicoesManual: { [key: string]: string[] };
};

function unidadesCompletas(dadosUnidades: DadosSessao["configuracao"]["dadosUnidades"]) {
  const base = dadosUnidades || {};
  const ids = Array.from(new Set([...Object.keys(base), "1", "2", "3"]));
  return ids.reduce<Record<string, UnidadeDados>>((acc, id) => {
    const u = base[id];
    acc[id] = {
      config: u?.config ?? {},
      operadoresSelecionados: Array.isArray(u?.operadoresSelecionados) ? u.operadoresSelecionados : [],
      atribuicoesManual: u?.atribuicoesManual ?? {},
    };
    return acc;
  }, {});
}

export function StorageProvider({ children }: { children: React.ReactNode }) {
  const [estadoConexao, setEstadoConexao] = useState<EstadoConexao>("a-carregar");
  const [nomeFicheiro, setNomeFicheiro] = useState<string | null>(null);
  const [dados, setDados] = useState<DadosSessao>(dadosPadrao);
  const [ultimaGravacao, setUltimaGravacao] = useState<Date | null>(null);
  const [pronto, setPronto] = useState(false);

  const handleRef = useRef<FileSystemFileHandle | null>(null);
  const dadosRef = useRef<DadosSessao>(dadosPadrao);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    dadosRef.current = dados;
  }, [dados]);

  const persistirLocalDB = useCallback(async (conteudo: DadosSessao) => {
    try {
      await guardarSessaoIDB(conteudo);
    } catch (e) {
      console.warn("Erro ao guardar sessao na base de dados (IDB):", e);
    }

    if (suportaOPFS()) {
      try {
        await escreverSessaoOPFS(conteudo);
      } catch (e) {
        console.warn("Erro ao sincronizar sessao em OPFS:", e);
      }
    }
  }, []);

  const conectarComHandle = useCallback(
    async (handle: FileSystemFileHandle) => {
      handleRef.current = handle;
      setNomeFicheiro(handle.name);
      setEstadoConexao("a-carregar");

      try {
        const conteudo = await lerFicheiro(handle);
        if (conteudo) {
          const merged = normalizarDados(conteudo);
          setDados(merged);
          dadosRef.current = merged;
          await persistirLocalDB(merged);
          setUltimaGravacao(
            conteudo.ultimaModificacao ? new Date(conteudo.ultimaModificacao) : new Date()
          );
        }
        setEstadoConexao("conectado");
      } catch (e) {
        console.error("Erro ao ler ficheiro:", e);
        setEstadoConexao("erro");
      } finally {
        setPronto(true);
      }
    },
    [persistirLocalDB]
  );

  useEffect(() => {
    async function init() {
      let melhor: DadosSessao | null = null;

      // Tentar carregar do localStorage primeiro
      const localData = carregarLocalStorage();
      if (localData) melhor = localData;

      // Tentar carregar do IDB
      try {
        const idbRaw = await carregarSessaoIDB();
        if (idbRaw) {
          const idbNormalizado = normalizarDados(idbRaw);
          if (!melhor || tsToMs(idbNormalizado.ultimaModificacao) >= tsToMs(melhor.ultimaModificacao)) {
            melhor = idbNormalizado;
          }
        }
      } catch (e) {
        console.warn("Erro ao ler sessao da base de dados (IDB):", e);
      }

      // Tentar carregar do OPFS
      if (suportaOPFS()) {
        try {
          const opfsRaw = await lerSessaoOPFS();
          if (opfsRaw) {
            const opfsNormalizado = normalizarDados(opfsRaw);
            if (!melhor || tsToMs(opfsNormalizado.ultimaModificacao) >= tsToMs(melhor.ultimaModificacao)) {
              melhor = opfsNormalizado;
            }
          }
        } catch (e) {
          console.warn("Erro ao ler sessao OPFS:", e);
        }
      }

      if (melhor) {
        setDados(melhor);
        dadosRef.current = melhor;
        salvarLocalStorage(melhor); // Salvar no localStorage também
      }

      if (!suportaFSA()) {
        setEstadoConexao("sem-suporte");
        setPronto(true);
        return;
      }

      try {
        const handle = await carregarHandleIDB();
        if (!handle) {
          setEstadoConexao("desconectado");
          setPronto(true);
          return;
        }

        const permissao = await verificarPermissao(handle);
        if (permissao === "granted") {
          await conectarComHandle(handle);
        } else {
          handleRef.current = handle;
          setNomeFicheiro(handle.name);
          setEstadoConexao("pede-permissao");
          setPronto(true);
        }
      } catch (e) {
        console.warn("Erro ao reconectar:", e);
        setEstadoConexao("desconectado");
        setPronto(true);
      }
    }

    init();
  }, [conectarComHandle]);

  const criarFicheiro = useCallback(async () => {
    try {
      const handle = await criarNovoFicheiro();
      if (!handle) return;

      const novosDados: DadosSessao = {
        ...dadosRef.current,
        ultimaModificacao: new Date().toISOString(),
      };

      await escreverFicheiro(handle, novosDados);
      await guardarHandleIDB(handle);
      handleRef.current = handle;

      setNomeFicheiro(handle.name);
      setDados(novosDados);
      dadosRef.current = novosDados;
      await persistirLocalDB(novosDados);
      setUltimaGravacao(new Date());
      setEstadoConexao("conectado");
    } catch (e) {
      console.error("Erro ao criar ficheiro:", e);
    }
  }, [persistirLocalDB]);

  const abrirFicheiro = useCallback(async () => {
    try {
      const handle = await abrirFicheiroExistente();
      if (!handle) return;
      await guardarHandleIDB(handle);
      await conectarComHandle(handle);
    } catch (e) {
      console.error("Erro ao abrir ficheiro:", e);
    }
  }, [conectarComHandle]);

  const reconectar = useCallback(async () => {
    if (!handleRef.current) return;
    try {
      const ok = await pedirPermissao(handleRef.current);
      if (ok) {
        await conectarComHandle(handleRef.current);
      } else {
        setEstadoConexao("pede-permissao");
      }
    } catch (e) {
      console.error("Erro ao reconectar:", e);
    }
  }, [conectarComHandle]);

  const desconectar = useCallback(async () => {
    handleRef.current = null;
    await limparHandleIDB();
    setNomeFicheiro(null);
    setEstadoConexao("desconectado");
  }, []);

  const salvar = useCallback(
    async (parcial: DeepPartial<DadosSessao>) => {
      const novosDados: DadosSessao = {
        ...dadosRef.current,
        ...(parcial.operadores !== undefined ? { operadores: parcial.operadores as Operador[] } : {}),
        ...(parcial.maquinas !== undefined ? { maquinas: parcial.maquinas as Maquina[] } : {}),
        ...(parcial.produtos !== undefined ? { produtos: parcial.produtos as Produto[] } : {}),
        ...(parcial.historico !== undefined ? { historico: parcial.historico } : {}),
        ...(parcial.logOperacoes !== undefined ? { logOperacoes: parcial.logOperacoes } : {}),
        configuracao: parcial.configuracao
          ? {
              ...dadosRef.current.configuracao,
              ...parcial.configuracao,
              dadosUnidades: parcial.configuracao.dadosUnidades
                ? {
                    ...dadosRef.current.configuracao.dadosUnidades,
                    ...parcial.configuracao.dadosUnidades,
                  }
                : dadosRef.current.configuracao.dadosUnidades,
            }
          : dadosRef.current.configuracao,
        ultimaModificacao: new Date().toISOString(),
      };

      setDados(novosDados);
      dadosRef.current = novosDados;
      salvarLocalStorage(novosDados); // Sempre salvar no localStorage
      await persistirLocalDB(novosDados); // Salvar no IDB e OPFS

      if (handleRef.current) {
        saveQueueRef.current = saveQueueRef.current.then(async () => {
          try {
            setEstadoConexao("a-guardar");
            await escreverFicheiro(handleRef.current!, dadosRef.current);
            setUltimaGravacao(new Date());
            setEstadoConexao("conectado");
          } catch (e: any) {
            console.error("Erro ao escrever ficheiro:", e);
            if (e?.name === "NotAllowedError" || e?.name === "SecurityError") {
              setEstadoConexao("pede-permissao");
            } else {
              setEstadoConexao("erro");
            }
          }
        });
        await saveQueueRef.current;
      }
    },
    [persistirLocalDB]
  );

  const logOperacao = useCallback(
    async (log: Omit<LogOperacao, "id" | "timestamp">) => {
      const novoLog: LogOperacao = {
        ...log,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      };
      const logsActual = dadosRef.current.logOperacoes;
      const novosLogs = [novoLog, ...logsActual].slice(0, 100);
      await salvar({ logOperacoes: novosLogs });
    },
    [salvar]
  );

  const adicionarOperador = useCallback(
    async (operador: Operador) => {
      const listaActual = dadosRef.current.operadores;
      if (listaActual.some((op) => op.id === operador.id)) {
        console.warn(`Operador ${operador.id} ja existe`);
        return;
      }

      const unidades = unidadesCompletas(dadosRef.current.configuracao.dadosUnidades);
      const dadosUnidadesActualizados = Object.fromEntries(
        Object.entries(unidades).map(([unidadeId, unidade]) => {
          const selecionados = unidade.operadoresSelecionados.includes(operador.id)
            ? unidade.operadoresSelecionados
            : [...unidade.operadoresSelecionados, operador.id];
          return [unidadeId, { ...unidade, operadoresSelecionados: selecionados }];
        })
      );

      await salvar({
        operadores: [...listaActual, operador],
        configuracao: { dadosUnidades: dadosUnidadesActualizados },
      });
    },
    [salvar]
  );

  const removerOperador = useCallback(
    async (id: string) => {
      const listaActual = dadosRef.current.operadores;
      const unidades = unidadesCompletas(dadosRef.current.configuracao.dadosUnidades);
      const dadosUnidadesActualizados = Object.fromEntries(
        Object.entries(unidades).map(([unidadeId, unidade]) => {
          const atribuicoesActualizadas = Object.fromEntries(
            Object.entries(unidade.atribuicoesManual || {}).map(([operacaoId, ids]) => [
              operacaoId,
              Array.isArray(ids) ? ids.filter((opId) => opId !== id) : [],
            ])
          );

          return [
            unidadeId,
            {
              ...unidade,
              operadoresSelecionados: unidade.operadoresSelecionados.filter((opId) => opId !== id),
              atribuicoesManual: atribuicoesActualizadas,
            },
          ];
        })
      );

      await salvar({
        operadores: listaActual.filter((op) => op.id !== id),
        configuracao: { dadosUnidades: dadosUnidadesActualizados },
      });
    },
    [salvar]
  );

  const actualizarOperador = useCallback(
    async (id: string, updates: Partial<Operador>) => {
      const listaActual = dadosRef.current.operadores;
      await salvar({
        operadores: listaActual.map((op) => (op.id === id ? { ...op, ...updates } : op)),
      });
    },
    [salvar]
  );

  const adicionarMaquina = useCallback(
    async (maquina: Maquina) => {
      const listaActual = dadosRef.current.maquinas;
      if (listaActual.some((m) => m.id === maquina.id)) {
        console.warn(`Maquina ${maquina.id} ja existe`);
        return;
      }
      await salvar({ maquinas: [...listaActual, maquina] });
    },
    [salvar]
  );

  const removerMaquina = useCallback(
    async (id: string) => {
      const listaActual = dadosRef.current.maquinas;
      await salvar({ maquinas: listaActual.filter((m) => m.id !== id) });
    },
    [salvar]
  );

  const actualizarMaquina = useCallback(
    async (id: string, updates: Partial<Maquina>) => {
      const listaActual = dadosRef.current.maquinas;
      await salvar({
        maquinas: listaActual.map((m) => (m.id === id ? { ...m, ...updates } : m)),
      });
    },
    [salvar]
  );

  return (
    <StorageContext.Provider
      value={{
        estadoConexao,
        nomeFicheiro,
        dados,
        ultimaGravacao,
        pronto,
        criarFicheiro,
        abrirFicheiro,
        reconectar,
        desconectar,
        salvar,
        logOperacao,
        adicionarOperador,
        removerOperador,
        actualizarOperador,
        adicionarMaquina,
        removerMaquina,
        actualizarMaquina,
      }}
    >
      {children}
    </StorageContext.Provider>
  );
}
