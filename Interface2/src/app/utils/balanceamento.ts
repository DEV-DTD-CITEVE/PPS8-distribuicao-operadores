import {
  Operador,
  Operacao,
  ConfiguracaoDistribuicao,
  ResultadosBalanceamento,
  DistribuicaoCarga,
} from "../types";

type AtribuicoesManuais = { [operacaoId: string]: string[] };

export function validarAtribuicoesManuais(
  operadores: Operador[],
  operacoes: Operacao[],
  atribuicoesManuais: AtribuicoesManuais,
  maquinas: Maquina[] = []
): { valido: boolean; erros: string[] } {
  const erros: string[] = [];
  const operadoresMap = new Map(operadores.map(op => [op.id, op]));
  const operacoesMap = new Map(operacoes.map(op => [op.id, op]));
  const maquinasMap = new Map(maquinas.map(m => [m.id, m]));

  for (const [operacaoId, operadorIds] of Object.entries(atribuicoesManuais)) {
    const operacao = operacoesMap.get(operacaoId);
    if (!operacao) {
      erros.push(`Operação ${operacaoId} não encontrada`);
      continue;
    }

    for (const operadorId of operadorIds) {
      const operador = operadoresMap.get(operadorId);
      if (!operador) {
        erros.push(`Operador ${operadorId} não encontrado`);
        continue;
      }

      // Verificar se operador tem competência para a operação
      const temCompetencia = Object.values(operador.competencias).some(
        comp => comp && comp.operacao === operacao.nome
      );

      if (!temCompetencia) {
        erros.push(`Operador ${operador.id} não tem competência para "${operacao.nome}"`);
      }

      // Verificar compatibilidade com máquinas (se máquinas fornecidas)
      if (maquinas.length > 0) {
        const maquinaCompativel = maquinas.some(m => 
          m.ativa && 
          m.operacoesCompativeis.includes(operacao.nome) ||
          m.tipo === operacao.tipoMaquina ||
          (operacao.tipoMaquina2 && m.tipo === operacao.tipoMaquina2)
        );

        if (!maquinaCompativel) {
          erros.push(`Nenhuma máquina ativa compatível com "${operacao.nome}"`);
        }
      }
    }
  }

  return { valido: erros.length === 0, erros };
}

export function calcularBalanceamento(
  operadores: Operador[],
  operacoes: Operacao[],
  config: ConfiguracaoDistribuicao,
  atribuicoesManuais: AtribuicoesManuais = {},
  maquinas: Maquina[] = []
): ResultadosBalanceamento {
  if (operadores.length === 0) {
    return {
      distribuicao: [],
      numeroCiclosPorHora: 0,
      taktTime: 0,
      tempoCiclo: 0,
      produtividade: 0,
      perdas: 100,
      numeroOperadores: 0,
      avisos: [],
    };
  }

  // Validar atribuições manuais
  const validacao = validarAtribuicoesManuais(operadores, operacoes, atribuicoesManuais, maquinas);
  const avisos = validacao.erros;

  const operacoesOrdenadas = [...operacoes].sort((a, b) => a.sequencia - b.sequencia);
  const tempoTotal = operacoesOrdenadas.reduce((acc, op) => acc + op.tempo, 0);

  const horasTurno = config.horasTurno || 8;
  const minutosDisponiveis = horasTurno * 60;

  let numeroOperadores: number;

  switch (config.possibilidade) {
    case 1: {
      const produtividade = (config.produtividadeEstimada || 100) / 100;
      const minutosEfetivos = minutosDisponiveis * produtividade;
      const cargaMaxMinutos = (minutosEfetivos * config.cargaMaximaOperador) / 100;
      numeroOperadores = Math.max(1, Math.ceil(tempoTotal / cargaMaxMinutos));
      break;
    }
    case 2: {
      const quantidadeObjetivo = config.quantidadeObjetivo || 100;
      const taktTimeNecessario = minutosDisponiveis / quantidadeObjetivo;
      numeroOperadores = Math.max(1, Math.ceil(tempoTotal / taktTimeNecessario));
      break;
    }
    case 3: {
      numeroOperadores = config.numeroOperadores || operadores.length;
      break;
    }
    default:
      numeroOperadores = operadores.length;
      break;
  }

  numeroOperadores = Math.min(Math.max(1, numeroOperadores), operadores.length);

  const operadoresSelecionados = [...operadores]
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, numeroOperadores);

  const distribuicao: DistribuicaoCarga[] = operadoresSelecionados.map((op) => ({
    operadorId: op.id,
    operacoes: [],
    cargaHoraria: 0,
    ocupacao: 0,
    ciclosPorHora: 0,
  }));

  const indicePorOperador = new Map<string, number>(
    distribuicao.map((d, idx) => [d.operadorId, idx])
  );
  const cargaIdealPorOperador = numeroOperadores > 0 ? tempoTotal / numeroOperadores : 0;
  const operacoesPreAtribuidas = new Set<string>();

  operacoesOrdenadas.forEach((op) => {
    const idsAtribuidos = (atribuicoesManuais[op.id] || []).filter((operadorId) =>
      indicePorOperador.has(operadorId)
    );

    if (idsAtribuidos.length === 0) return;

    operacoesPreAtribuidas.add(op.id);
    const tempoPorOperador = op.tempo / idsAtribuidos.length;

    idsAtribuidos.forEach((operadorId) => {
      const idx = indicePorOperador.get(operadorId)!;
      distribuicao[idx].operacoes.push(op.id);
      distribuicao[idx].cargaHoraria += tempoPorOperador;
    });
  });

  let operadorAtualIdx = 0;
  const tolerancia = 1.2;

  operacoesOrdenadas.forEach((op) => {
    if (operacoesPreAtribuidas.has(op.id)) return;

    const cargaAposAdicionar = distribuicao[operadorAtualIdx].cargaHoraria + op.tempo;
    if (
      operadorAtualIdx < distribuicao.length - 1 &&
      cargaIdealPorOperador > 0 &&
      cargaAposAdicionar > cargaIdealPorOperador * tolerancia
    ) {
      operadorAtualIdx++;
    }

    distribuicao[operadorAtualIdx].operacoes.push(op.id);
    distribuicao[operadorAtualIdx].cargaHoraria += op.tempo;
  });

  const tempoCiclo =
    distribuicao.length > 0 ? Math.max(...distribuicao.map((d) => d.cargaHoraria)) : 0;

  distribuicao.forEach((d) => {
    d.ocupacao = tempoCiclo > 0 ? (d.cargaHoraria / tempoCiclo) * 100 : 0;
    d.ciclosPorHora = d.cargaHoraria > 0 ? 60 / d.cargaHoraria : 0;
  });

  const numeroCiclosPorHora = tempoCiclo > 0 ? 60 / tempoCiclo : 0;

  let taktTime: number;
  switch (config.possibilidade) {
    case 2: {
      const quantidadeObjetivo = config.quantidadeObjetivo || 100;
      taktTime = minutosDisponiveis / quantidadeObjetivo;
      break;
    }
    case 3:
    case 1:
    default:
      taktTime = tempoCiclo;
      break;
  }

  const ocupacaoMedia =
    distribuicao.length > 0
      ? distribuicao.reduce((acc, d) => acc + d.ocupacao, 0) / distribuicao.length
      : 0;
  const produtividade = Math.min(ocupacaoMedia, 100);
  const perdas = Math.max(0, 100 - produtividade);

  return {
    distribuicao,
    numeroCiclosPorHora,
    taktTime,
    tempoCiclo,
    produtividade,
    perdas,
    numeroOperadores,
    avisos,
  };
}
