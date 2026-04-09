import { useCallback, useEffect, useRef, useState } from "react";
import { Produto, Operacao } from "../types";
import { useStorage } from "../contexts/StorageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
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
  FileText,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Package,
  AlertTriangle,
  Pencil,
  ChevronRight,
  Clock,
  Cpu,
  CheckCircle2,
  Copy,
  Upload,
  FileSpreadsheet,
  X,
} from "lucide-react";
import { AtribuicaoManual } from "../components/AtribuicaoManual";
import * as XLSX from "xlsx";

export default function FichaTecnica() {
  const { dados, salvar, pronto } = useStorage();
  const [produtos, setProdutos] = useState<Produto[]>(dados.produtos);
  const [produtoSelecionado, setProdutoSelecionado] = useState<string | null>(
    dados.configuracao.grupoArtigoSelecionado || dados.produtos[0]?.id || null
  );
  const [showNovoProduto, setShowNovoProduto] = useState(false);
  const [showNovaOperacao, setShowNovaOperacao] = useState(false);
  const [editandoOperacao, setEditandoOperacao] = useState<string | null>(null);
  const [mensagemGuardado, setMensagemGuardado] = useState<string | null>(null);
  const [atribuicoesManual, setAtribuicoesManual] = useState<{ [operacaoId: string]: string[] }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<Operacao[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const operadores = dados.operadores;

  const gerarChaveAtribuicao = useCallback(
    (produtoId: string, operacaoId: string) => `${produtoId}::${operacaoId}`,
    []
  );

  useEffect(() => {
    setProdutos(dados.produtos);
  }, [dados.produtos]);

  useEffect(() => {
    if (produtos.length === 0) {
      if (produtoSelecionado !== null) setProdutoSelecionado(null);
      return;
    }

    const existeSelecionado = produtoSelecionado
      ? produtos.some((produtoAtual) => produtoAtual.id === produtoSelecionado)
      : false;

    if (!existeSelecionado) {
      const preferido = dados.configuracao.grupoArtigoSelecionado;
      const existePreferido = preferido
        ? produtos.some((produtoAtual) => produtoAtual.id === preferido)
        : false;
      setProdutoSelecionado(existePreferido ? preferido! : produtos[0].id);
    }
  }, [produtos, produtoSelecionado, dados.configuracao.grupoArtigoSelecionado]);

  useEffect(() => {
    if (!pronto) return;
    const grupoAtual = produtoSelecionado || "";
    if (dados.configuracao.grupoArtigoSelecionado === grupoAtual) return;
    salvar({ configuracao: { grupoArtigoSelecionado: grupoAtual } }).catch((error) => {
      console.error("Erro ao guardar grupo de artigo selecionado:", error);
    });
  }, [pronto, produtoSelecionado, dados.configuracao.grupoArtigoSelecionado, salvar]);

  useEffect(() => {
    const produtoAtual = produtos.find((p) => p.id === produtoSelecionado);
    if (!produtoAtual || !produtoSelecionado) {
      setAtribuicoesManual({});
      return;
    }

    const atribuicoesBase = dados.configuracao.dadosUnidades?.["1"]?.atribuicoesManual || {};
    const atribuicoesProduto: { [operacaoId: string]: string[] } = {};

    produtoAtual.operacoes.forEach((operacao) => {
      const chave = gerarChaveAtribuicao(produtoSelecionado, operacao.id);
      const ids = atribuicoesBase[chave] || atribuicoesBase[operacao.id] || atribuicoesBase[operacao.nome];
      if (Array.isArray(ids)) atribuicoesProduto[operacao.id] = ids;
    });

    setAtribuicoesManual(atribuicoesProduto);
  }, [produtoSelecionado, produtos, dados.configuracao.dadosUnidades, gerarChaveAtribuicao]);

  const persistirProdutos = useCallback(
    async (novosProdutos: Produto[], proximoSelecionado: string | null = produtoSelecionado) => {
      setProdutos(novosProdutos);
      await salvar({
        produtos: novosProdutos,
        configuracao: { grupoArtigoSelecionado: proximoSelecionado || "" },
      });
    },
    [produtoSelecionado, salvar]
  );

  const gerarNovoProdutoId = useCallback(() => {
    const maiorId = produtos.reduce((maior, produtoAtual) => {
      const numero = Number.parseInt(produtoAtual.id.replace(/\D/g, ""), 10);
      return Number.isFinite(numero) ? Math.max(maior, numero) : maior;
    }, 0);
    return `PROD${String(maiorId + 1).padStart(3, "0")}`;
  }, [produtos]);

  const [novoProduto, setNovoProduto] = useState({
    nome: "",
    referencia: "",
    cliente: "",
    descricao: "",
  });

  const [novaOperacao, setNovaOperacao] = useState<Partial<Operacao>>({
    id: "",
    nome: "",
    tempo: 0,
    tipoMaquina: "",
    largura: 190,
    ponto: "",
    setup: "Standard",
    permitirAgrupamento: true,
    sequencia: 1,
  });

  const produto = produtos.find((p) => p.id === produtoSelecionado);

  const limparAtribuicoesProdutoNasUnidades = useCallback(
    (produtoId: string) => {
      const prefixo = `${produtoId}::`;
      const unidadesAtuais = dados.configuracao.dadosUnidades || {};
      const unidadeIds = Array.from(new Set([...Object.keys(unidadesAtuais), "1", "2", "3"]));

      return unidadeIds.reduce<Record<string, any>>((acc, unidadeId) => {
        const unidade = unidadesAtuais[unidadeId] || {
          config: {},
          operadoresSelecionados: dados.operadores.map((op) => op.id),
          atribuicoesManual: {},
        };

        const atribuicoesLimpa = Object.fromEntries(
          Object.entries(unidade.atribuicoesManual || {}).filter(
            ([chave]) => !chave.startsWith(prefixo)
          )
        );

        acc[unidadeId] = {
          ...unidade,
          atribuicoesManual: atribuicoesLimpa,
        };
        return acc;
      }, {});
    },
    [dados.configuracao.dadosUnidades, dados.operadores]
  );

  const handleCriarProduto = async () => {
    if (!novoProduto.nome || !novoProduto.referencia) return;
    const newProd: Produto = {
      id: gerarNovoProdutoId(),
      nome: novoProduto.nome,
      referencia: novoProduto.referencia,
      cliente: novoProduto.cliente,
      descricao: novoProduto.descricao,
      operacoes: [],
      dataCriacao: new Date().toISOString().split("T")[0],
      dataModificacao: new Date().toISOString().split("T")[0],
    };
    await persistirProdutos([...produtos, newProd], newProd.id);
    setProdutoSelecionado(newProd.id);
    setShowNovoProduto(false);
    setNovoProduto({ nome: "", referencia: "", cliente: "", descricao: "" });
  };

  const handleDuplicarProduto = async (prodId: string) => {
    const original = produtos.find((p) => p.id === prodId);
    if (!original) return;
    const newProd: Produto = {
      ...original,
      id: gerarNovoProdutoId(),
      nome: `${original.nome} (Copia)`,
      referencia: `${original.referencia}-COPY`,
      operacoes: original.operacoes.map((op) => ({ ...op })),
      dataCriacao: new Date().toISOString().split("T")[0],
      dataModificacao: new Date().toISOString().split("T")[0],
    };
    await persistirProdutos([...produtos, newProd], newProd.id);
    setProdutoSelecionado(newProd.id);
  };

  const handleRemoverProduto = async (prodId: string) => {
    const restantes = produtos.filter((p) => p.id !== prodId);
    const proximoSelecionado =
      produtoSelecionado === prodId ? restantes[0]?.id || null : produtoSelecionado;
    const dadosUnidadesLimpos = limparAtribuicoesProdutoNasUnidades(prodId);

    setProdutos(restantes);
    setProdutoSelecionado(proximoSelecionado);
    if (produtoSelecionado === prodId) setAtribuicoesManual({});

    await salvar({
      produtos: restantes,
      configuracao: {
        grupoArtigoSelecionado: proximoSelecionado || "",
        dadosUnidades: dadosUnidadesLimpos,
      },
    });
  };

  const handleAddOperacao = async () => {
    if (!produto || !novaOperacao.id || !novaOperacao.nome || !novaOperacao.tempo) return;
    const updated = produtos.map((p) => {
      if (p.id !== produto.id) return p;
      const newOp: Operacao = {
        id: novaOperacao.id!,
        nome: novaOperacao.nome!,
        tempo: Number(novaOperacao.tempo) || 0,
        tipoMaquina: novaOperacao.tipoMaquina || "",
        tipoMaquina2: novaOperacao.tipoMaquina2,
        largura: Number(novaOperacao.largura) || 190,
        ponto: novaOperacao.ponto || "",
        setup: novaOperacao.setup || "Standard",
        permitirAgrupamento: novaOperacao.permitirAgrupamento ?? true,
        sequencia: p.operacoes.length + 1,
      };
      return {
        ...p,
        operacoes: [...p.operacoes, newOp],
        dataModificacao: new Date().toISOString().split("T")[0],
      };
    });
    await persistirProdutos(updated);
    setShowNovaOperacao(false);
    setNovaOperacao({
      id: "",
      nome: "",
      tempo: 0,
      tipoMaquina: "",
      largura: 190,
      ponto: "",
      setup: "Standard",
      permitirAgrupamento: true,
      sequencia: 1,
    });
  };

  const handleRemoveOperacao = async (opId: string) => {
    if (!produto) return;
    const updated = produtos.map((p) => {
      if (p.id !== produto.id) return p;
      const newOps = p.operacoes
        .filter((op) => op.id !== opId)
        .map((op, idx) => ({ ...op, sequencia: idx + 1 }));
      return { ...p, operacoes: newOps, dataModificacao: new Date().toISOString().split("T")[0] };
    });
    await persistirProdutos(updated);

    if (!produtoSelecionado) return;
    const chave = gerarChaveAtribuicao(produtoSelecionado, opId);
    const unidadesAtuais = dados.configuracao.dadosUnidades || {};
    const unidadeIds = Array.from(new Set([...Object.keys(unidadesAtuais), "1", "2", "3"]));
    const dadosUnidadesActualizados = unidadeIds.reduce<Record<string, any>>((acc, unidadeId) => {
      const unidade = unidadesAtuais[unidadeId] || {
        config: {},
        operadoresSelecionados: dados.operadores.map((op) => op.id),
        atribuicoesManual: {},
      };
      const atribuicoes = { ...(unidade.atribuicoesManual || {}) };
      delete atribuicoes[chave];
      delete atribuicoes[opId];
      acc[unidadeId] = { ...unidade, atribuicoesManual: atribuicoes };
      return acc;
    }, {});

    setAtribuicoesManual((prev) => {
      const next = { ...prev };
      delete next[opId];
      return next;
    });

    await salvar({ configuracao: { dadosUnidades: dadosUnidadesActualizados } });
  };

  const handleReorder = async (opId: string, direction: "up" | "down") => {
    if (!produto) return;
    const ops = [...produto.operacoes];
    const idx = ops.findIndex((op) => op.id === opId);
    if ((direction === "up" && idx === 0) || (direction === "down" && idx === ops.length - 1)) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    [ops[idx], ops[targetIdx]] = [ops[targetIdx], ops[idx]];
    const opsReordenadas = ops.map((op, index) => ({ ...op, sequencia: index + 1 }));
    const updated = produtos.map((p) =>
      p.id === produto.id
        ? { ...p, operacoes: opsReordenadas, dataModificacao: new Date().toISOString().split("T")[0] }
        : p
    );
    await persistirProdutos(updated);
  };

  const handleToggleCritica = async (opId: string) => {
    if (!produto) return;
    const updated = produtos.map((p) => {
      if (p.id !== produto.id) return p;
      return {
        ...p,
        operacoes: p.operacoes.map((op) =>
          op.id === opId ? { ...op, critica: !op.critica } : op
        ),
        dataModificacao: new Date().toISOString().split("T")[0],
      };
    });
    await persistirProdutos(updated);
  };

  const handleEditOperacao = async (opId: string, field: string, value: string | number) => {
    if (!produto) return;
    const updated = produtos.map((p) => {
      if (p.id !== produto.id) return p;
      return {
        ...p,
        operacoes: p.operacoes.map((op) =>
          op.id === opId ? { ...op, [field]: value } : op
        ),
        dataModificacao: new Date().toISOString().split("T")[0],
      };
    });
    await persistirProdutos(updated);
  };

  const handleGuardar = async () => {
    await salvar({
      produtos,
      configuracao: { grupoArtigoSelecionado: produtoSelecionado || "" },
    });
    setMensagemGuardado("Ficha técnica guardada com sucesso");
    setTimeout(() => setMensagemGuardado(null), 3000);
  };

  const handleAtribuirManualmente = async (operacaoId: string, operadorIds: string[]) => {
    if (!produtoSelecionado) return;

    setAtribuicoesManual((prev) => ({
      ...prev,
      [operacaoId]: operadorIds,
    }));

    const chave = gerarChaveAtribuicao(produtoSelecionado, operacaoId);
    const unidadesAtuais = dados.configuracao.dadosUnidades || {};
    const unidadeIds = Array.from(new Set([...Object.keys(unidadesAtuais), "1", "2", "3"]));

    const dadosUnidadesActualizados = unidadeIds.reduce<Record<string, any>>((acc, unidadeId) => {
      const unidade = unidadesAtuais[unidadeId] || {
        config: {},
        operadoresSelecionados: dados.operadores.map((op) => op.id),
        atribuicoesManual: {},
      };

      const atribuicoes = { ...(unidade.atribuicoesManual || {}) };
      if (operadorIds.length > 0) {
        atribuicoes[chave] = operadorIds;
      } else {
        delete atribuicoes[chave];
      }
      delete atribuicoes[operacaoId];

      acc[unidadeId] = {
        ...unidade,
        atribuicoesManual: atribuicoes,
      };
      return acc;
    }, {});

    await salvar({ configuracao: { dadosUnidades: dadosUnidadesActualizados } });
  };


  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb   = XLSX.read(data, { type: "array" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        // Tentar detectar colunas flexivelmente
        const parsed: Operacao[] = rows
          .filter((r) => {
            const keys = Object.keys(r).map(k => k.toLowerCase().trim());
            return keys.some(k => k.includes("operac") || k.includes("nome") || k.includes("descric"));
          })
          .map((r, idx) => {
            const get = (patterns: string[]) => {
              const key = Object.keys(r).find(k =>
                patterns.some(p => k.toLowerCase().trim().includes(p))
              );
              return key ? String(r[key]).trim() : "";
            };
            const tempoRaw = get(["tempo", "time", "min", "durac"]);
            const tempo = parseFloat(tempoRaw.replace(",", ".")) || 0;
            const seqRaw = get(["seq", "ordem", "order", "nÂº", "no", "num"]);
            const seq = parseInt(seqRaw) || (idx + 1);
            return {
              id: get(["id", "cod", "ref", "cÃ³digo"]) || `OP${String(idx + 1).padStart(3, "0")}`,
              nome: get(["operac", "nome", "descric", "operaÃ§Ã£o", "descriÃ§Ã£o", "name"]),
              tempo,
              tipoMaquina: get(["maquin", "mÃ¡quin", "machine", "tipo", "grupo"]),
              largura: 190,
              ponto: "",
              setup: "Standard",
              permitirAgrupamento: true,
              sequencia: seq,
            } as Operacao;
          })
          .filter(op => op.nome);

        if (parsed.length === 0) {
          setImportError("Nenhuma operaÃ§Ã£o vÃ¡lida encontrada. Verifique as colunas (OperaÃ§Ã£o/Nome, Tempo, MÃ¡quina, Seq).");
          return;
        }
        // Renumerar sequÃªncias
        parsed.forEach((op, i) => { op.sequencia = i + 1; });
        setImportPreview(parsed);
        setShowImportDialog(true);
      } catch (err) {
        setImportError("Erro ao ler o ficheiro. Certifique-se que Ã© um ficheiro Excel (.xlsx ou .xls).");
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleConfirmImport = async () => {
    if (!produto || !importPreview) return;
    const updated = produtos.map(p =>
      p.id === produto.id
        ? { ...p, operacoes: importPreview, dataModificacao: new Date().toISOString().split("T")[0] }
        : p
    );
    await persistirProdutos(updated);
    setImportPreview(null);
    setShowImportDialog(false);
    setMensagemGuardado(`${importPreview.length} operaÃ§Ãµes importadas com sucesso`);
    setTimeout(() => setMensagemGuardado(null), 3000);
  };

  const tempoTotal = produto
    ? produto.operacoes.reduce((sum, op) => sum + op.tempo, 0)
    : 0;
  const numMaquinas = produto
    ? new Set(produto.operacoes.map((op) => op.tipoMaquina).filter(Boolean)).size
    : 0;

  return (
    <main className="w-full px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ficha TÃ©cnica</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Gama operatÃ³ria por produto â€” edite e guarde cada ficha tÃ©cnica
          </p>
        </div>
        <div className="flex items-center gap-3">
          {produto && (
            <Button
              onClick={handleGuardar}
              className="bg-blue-500 hover:bg-blue-600 rounded-sm text-xs gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar Ficha
            </Button>
          )}
          <Dialog open={showNovoProduto} onOpenChange={setShowNovoProduto}>
            <DialogTrigger asChild>
              <Button className="bg-[#2d2d2d] hover:bg-[#3d3d3d] rounded-sm text-xs gap-2">
                <Plus className="w-4 h-4" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-sm">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold">
                  Criar Novo Produto
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Preencha os dados do novo produto
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium">Nome do Produto</Label>
                  <Input
                    value={novoProduto.nome}
                    onChange={(e) => setNovoProduto({ ...novoProduto, nome: e.target.value })}
                    placeholder="ex: Calca Ganga Classic"
                    className="rounded-sm text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">ReferÃªncia</Label>
                  <Input
                    value={novoProduto.referencia}
                    onChange={(e) =>
                      setNovoProduto({ ...novoProduto, referencia: e.target.value })
                    }
                    placeholder="ex: REF-2026-001"
                    className="rounded-sm text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Cliente (opcional)</Label>
                  <Input
                    value={novoProduto.cliente}
                    onChange={(e) =>
                      setNovoProduto({ ...novoProduto, cliente: e.target.value })
                    }
                    placeholder="ex: Fashion Corp"
                    className="rounded-sm text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">DescriÃ§Ã£o (opcional)</Label>
                  <Input
                    value={novoProduto.descricao}
                    onChange={(e) =>
                      setNovoProduto({ ...novoProduto, descricao: e.target.value })
                    }
                    className="rounded-sm text-sm mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCriarProduto}
                  className="bg-blue-500 hover:bg-blue-600 rounded-sm text-xs"
                  disabled={!novoProduto.nome || !novoProduto.referencia}
                >
                  Criar Produto
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Mensagem de guardado */}
      {mensagemGuardado && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-sm flex items-center gap-2 text-green-700 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          {mensagemGuardado}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Lista de Produtos (sidebar) */}
        <div className="lg:col-span-1 space-y-3">
          <Card className="shadow-sm border border-gray-200 rounded-sm bg-white">
            <CardHeader className="border-b border-gray-200 pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Package className="w-4 h-4 text-blue-600" />
                Produtos ({produtos.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {produtos.map((prod) => (
                <div
                  key={prod.id}
                  className={`p-3 rounded-sm border-2 cursor-pointer transition-all ${
                    produtoSelecionado === prod.id
                      ? "border-blue-300 bg-blue-50/50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                  onClick={() => setProdutoSelecionado(prod.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 truncate">
                        {prod.nome}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{prod.referencia}</div>
                      {prod.cliente && (
                        <div className="text-xs text-gray-400 mt-0.5">{prod.cliente}</div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs rounded-sm">
                          {prod.operacoes.length} ops
                        </Badge>
                        <span className="text-xs text-gray-400 font-mono">
                          {prod.operacoes.reduce((s, o) => s + o.tempo, 0).toFixed(1)} min
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        produtoSelecionado === prod.id ? "text-blue-500" : "text-gray-300"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Ficha Tecnica do Produto */}
        <div className="lg:col-span-3 space-y-6">
          {!produto ? (
            <Card className="shadow-sm border border-gray-200 rounded-sm bg-white">
              <CardContent className="p-16 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <div className="text-gray-500 text-sm">
                  Selecione um produto para ver a ficha tÃ©cnica
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  Ou crie um novo produto para comeÃ§ar
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Info do Produto */}
              <Card className="shadow-sm border border-gray-200 rounded-sm bg-white">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-bold text-gray-900">{produto.nome}</h2>
                        <Badge variant="secondary" className="rounded-sm text-xs font-mono">
                          {produto.id}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>
                          ReferÃªncia:{" "}
                          <span className="font-medium">{produto.referencia}</span>
                        </div>
                        {produto.cliente && (
                          <div>
                            Cliente:{" "}
                            <span className="font-medium">{produto.cliente}</span>
                          </div>
                        )}
                        {produto.descricao && (
                          <div className="text-gray-500">{produto.descricao}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-sm text-xs gap-1"
                        onClick={() => handleDuplicarProduto(produto.id)}
                      >
                        <Copy className="w-3 h-3" />
                        Duplicar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-sm text-xs gap-1 text-gray-500 hover:text-orange-600 hover:border-orange-300"
                        onClick={() => handleRemoverProduto(produto.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                        Eliminar
                      </Button>
                    </div>
                  </div>

                  {/* Metricas Resumo */}
                  <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-200">
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
                      <div className="text-xs text-gray-500 uppercase">OperaÃ§Ãµes</div>
                      <div className="text-xl font-bold text-gray-900 mt-1">
                        {produto.operacoes.length}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
                      <div className="text-xs text-gray-500 uppercase flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Tempo Total
                      </div>
                      <div className="text-xl font-bold text-gray-900 mt-1 font-mono">
                        {tempoTotal.toFixed(2)} min
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
                      <div className="text-xs text-gray-500 uppercase flex items-center gap-1">
                        <Cpu className="w-3 h-3" /> MÃ¡quinas
                      </div>
                      <div className="text-xl font-bold text-gray-900 mt-1">{numMaquinas}</div>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-sm">
                      <div className="text-xs text-gray-500 uppercase">Modificado</div>
                      <div className="text-sm font-medium text-gray-900 mt-1">
                        {produto.dataModificacao}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Gama Operatoria */}
              <Card className="shadow-sm border border-gray-200 rounded-sm bg-white">
                <CardHeader className="border-b border-gray-200">
                  <CardTitle className="flex items-center justify-between text-gray-900">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-sm flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-base font-semibold">Gama OperatÃ³ria</div>
                        <CardDescription className="text-gray-500 mt-0.5 text-xs">
                          SequÃªncia de operaÃ§Ãµes do processo produtivo
                        </CardDescription>
                      </div>
                    </div>
                    <Dialog open={showNovaOperacao} onOpenChange={setShowNovaOperacao}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          className="bg-blue-500 hover:bg-blue-600 rounded-sm text-xs font-medium"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Nova OperaÃ§Ã£o
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-sm">
                        <DialogHeader>
                          <DialogTitle className="text-base font-semibold">
                            Adicionar Nova OperaÃ§Ã£o
                          </DialogTitle>
                          <DialogDescription className="text-xs">
                            Preencha os dados da nova operaÃ§Ã£o
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-xs font-medium">ID da OperaÃ§Ã£o</Label>
                            <Input
                              value={novaOperacao.id}
                              onChange={(e) =>
                                setNovaOperacao({ ...novaOperacao, id: e.target.value })
                              }
                              placeholder={`ex: OP${produto.operacoes.length + 1}`}
                              required
                              className="rounded-sm text-sm mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium">Nome</Label>
                            <Input
                              value={novaOperacao.nome}
                              onChange={(e) =>
                                setNovaOperacao({ ...novaOperacao, nome: e.target.value })
                              }
                              placeholder="ex: Fechar vista"
                              required
                              className="rounded-sm text-sm mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium">
                              Tempo de ExecuÃ§Ã£o (min)
                            </Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={novaOperacao.tempo || ""}
                              onChange={(e) =>
                                setNovaOperacao({
                                  ...novaOperacao,
                                  tempo: Number(e.target.value),
                                })
                              }
                              required
                              className="rounded-sm text-sm mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium">MÃ¡quina (opcional)</Label>
                            <Input
                              value={novaOperacao.tipoMaquina}
                              onChange={(e) =>
                                setNovaOperacao({
                                  ...novaOperacao,
                                  tipoMaquina: e.target.value,
                                })
                              }
                              placeholder="ex: P/P1"
                              className="rounded-sm text-sm mt-1"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={handleAddOperacao}
                            className="bg-blue-500 hover:bg-blue-600 rounded-sm text-xs"
                            disabled={
                              !novaOperacao.id || !novaOperacao.nome || !novaOperacao.tempo
                            }
                          >
                            Adicionar
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button
                      size="sm"
                      className="bg-gray-500 hover:bg-gray-600 rounded-sm text-xs font-medium"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Importar Excel
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".xlsx, .xls"
                      onChange={handleImportExcel}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase w-16">
                            Seq.
                          </th>
                          <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase w-20">
                            CrÃ­tica
                          </th>
                          <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase w-20">
                            ID
                          </th>
                          <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            DescriÃ§Ã£o
                          </th>
                          <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase w-28">
                            Tempo (min)
                          </th>
                          <th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            MÃ¡quina
                          </th>
                          <th className="p-3 text-center text-xs font-semibold text-gray-600 uppercase w-32">
                            AÃ§Ãµes
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {produto.operacoes.map((operacao, index) => (
                          <tr
                            key={operacao.id}
                            className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                              operacao.critica ? "bg-orange-50" : ""
                            }`}
                          >
                            <td className="p-3 font-mono text-sm text-gray-700">
                              {operacao.sequencia}
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => handleToggleCritica(operacao.id)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-medium transition-colors ${
                                  operacao.critica
                                    ? "bg-orange-200 text-orange-800 border border-orange-300"
                                    : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200"
                                }`}
                              >
                                <AlertTriangle className="w-3 h-3" />
                                {operacao.critica ? "Sim" : "NÃ£o"}
                              </button>
                            </td>
                            <td className="p-3">
                              <span className="font-mono font-semibold text-sm text-blue-700 bg-blue-50 px-2 py-1 rounded-sm border border-blue-200">
                                {operacao.id}
                              </span>
                            </td>
                            <td className="p-3">
                              {editandoOperacao === operacao.id ? (
                                <Input
                                  value={operacao.nome}
                                  onChange={(e) =>
                                    handleEditOperacao(operacao.id, "nome", e.target.value)
                                  }
                                  onBlur={() => setEditandoOperacao(null)}
                                  onKeyDown={(e) =>
                                    e.key === "Enter" && setEditandoOperacao(null)
                                  }
                                  autoFocus
                                  className="h-8 text-sm rounded-sm"
                                />
                              ) : (
                                <div
                                  className="flex items-center gap-2 cursor-pointer group"
                                  onClick={() => setEditandoOperacao(operacao.id)}
                                >
                                  <span className="text-sm text-gray-700">
                                    {operacao.nome}
                                  </span>
                                  <Pencil className="w-3 h-3 text-gray-300 group-hover:text-gray-500" />
                                  {operacao.critica && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs rounded-sm bg-orange-200 text-orange-800 border border-orange-300"
                                    >
                                      CRÃTICA
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                step="0.01"
                                value={operacao.tempo}
                                onChange={(e) =>
                                  handleEditOperacao(
                                    operacao.id,
                                    "tempo",
                                    Number(e.target.value)
                                  )
                                }
                                className="h-8 w-24 text-sm font-mono rounded-sm text-right"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                value={operacao.tipoMaquina || ""}
                                onChange={(e) =>
                                  handleEditOperacao(
                                    operacao.id,
                                    "tipoMaquina",
                                    e.target.value
                                  )
                                }
                                className="h-8 text-sm rounded-sm"
                                placeholder="â€”"
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReorder(operacao.id, "up")}
                                  disabled={index === 0}
                                  className="h-7 w-7 p-0 rounded-sm hover:bg-gray-100"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReorder(operacao.id, "down")}
                                  disabled={index === produto.operacoes.length - 1}
                                  className="h-7 w-7 p-0 rounded-sm hover:bg-gray-100"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveOperacao(operacao.id)}
                                  className="h-7 w-7 p-0 rounded-sm hover:bg-orange-50 hover:text-orange-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 border-t-2 border-gray-300">
                          <td colSpan={4} className="p-3 text-xs font-semibold text-gray-700 uppercase">
                            Total
                          </td>
                          <td className="p-3 font-mono font-bold text-sm text-gray-900">
                            {tempoTotal.toFixed(2)} min
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {produto.operacoes.length === 0 && (
                    <div className="p-12 text-center text-gray-400 text-sm">
                      Nenhuma operaÃ§Ã£o adicionada. Clique em "Nova OperaÃ§Ã£o" para comeÃ§ar.
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* AtribuiÃ§Ã£o Manual de OperaÃ§Ãµes */}
      {produto && produto.operacoes.length > 0 && (
        <AtribuicaoManual
          operadores={operadores}
          operacoes={produto.operacoes}
          atribuicoesManual={atribuicoesManual}
          onAtribuirManualmente={handleAtribuirManualmente}
        />
      )}

      {/* Dialog de ImportaÃ§Ã£o */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="rounded-sm max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              PrÃ©-visualizaÃ§Ã£o da ImportaÃ§Ã£o
            </DialogTitle>
            <DialogDescription className="text-xs">
              {importPreview?.length} operaÃ§Ãµes detectadas â€” confirme para substituir a gama operatÃ³ria actual
            </DialogDescription>
          </DialogHeader>
          {importError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm flex items-center gap-2 text-amber-700 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {importError}
            </div>
          )}
          <div className="overflow-x-auto border border-gray-200 rounded-sm">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase w-10">Seq</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase w-24">ID</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase">DescriÃ§Ã£o</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600 uppercase w-24">Tempo (min)</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase w-28">MÃ¡quina</th>
                </tr>
              </thead>
              <tbody>
                {importPreview?.map((op) => (
                  <tr key={op.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-1.5 text-gray-500 font-mono">{op.sequencia}</td>
                    <td className="px-3 py-1.5">
                      <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-sm border border-blue-200 text-[10px]">
                        {op.id}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-gray-800">{op.nome}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-gray-700">{op.tempo.toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-gray-500">{op.tipoMaquina || "â€”"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300">
                  <td colSpan={3} className="px-3 py-2 text-xs font-semibold text-gray-700 uppercase">Total</td>
                  <td className="px-3 py-2 font-mono font-bold text-right text-gray-900">
                    {importPreview?.reduce((s, o) => s + o.tempo, 0).toFixed(2)} min
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowImportDialog(false)} className="rounded-sm text-xs">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmImport}
              className="bg-blue-500 hover:bg-blue-600 rounded-sm text-xs"
              disabled={!importPreview?.length}
            >
              <CheckCircle2 className="w-3 h-3 mr-1.5" />
              Confirmar e Substituir ({importPreview?.length} ops)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
