import { ResultadosBalanceamento } from "../types";
import { Users, Clock, Package, Timer, TrendingUp, AlertTriangle } from "lucide-react";
import svgPaths from "../../imports/ResumoResultados/svg-lcfdbebd6c";

interface ResumoResultadosProps {
  resultados: ResultadosBalanceamento;
  config: {
    possibilidade: number;
    quantidadeObjetivo?: number;
    numeroOperadores?: number;
    agruparMaquinas?: boolean;
    cargaMaximaOperador: number;
    naoDividirMaiorQue: number;
    naoDividirMenorQue: number;
  };
  mostrarTaktTime?: boolean;
  realMetrics?: any;
  showRealMetrics?: boolean;
  layout?: "row" | "column";
}

export function ResumoResultados({ resultados, config, mostrarTaktTime, realMetrics, showRealMetrics = true, layout = "row" }: ResumoResultadosProps) {
  const rawKpis = (resultados as any)?.kpis ?? null;
  const resolveNumber = (...values: unknown[]) => {
    for (const value of values) {
      const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(",", ".")) : Number.NaN;
      if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
  };
  const cycleTimeSeconds = resolveNumber(rawKpis?.cycle_time_seconds, (resultados as any)?.cycle_time_seconds, resultados.tempoCiclo * 60);
  const tempoCicloMin = cycleTimeSeconds > 10 ? cycleTimeSeconds / 60 : resolveNumber(resultados.tempoCiclo);
  const ciclosPorHora = resolveNumber(
    rawKpis?.cycles_per_hour,
    (resultados as any)?.production_per_hour,
    resultados.numeroCiclosPorHora,
    (resultados as any).numeroPecasHora
  );
  const produtividade = resolveNumber(rawKpis?.productivity_pct, (resultados as any)?.estimated_productivity, resultados.produtividade);
  const perdas = resolveNumber(rawKpis?.balance_loss_pct, (resultados as any)?.balance_loss, resultados.perdas, Math.max(0, 100 - produtividade));
  const numeroOperadores = resolveNumber(rawKpis?.num_operators, resultados.numeroOperadores, config.numeroOperadores);
  const real = realMetrics && typeof realMetrics === "object" ? realMetrics : null;
  const resolveRealNumber = (...values: unknown[]) => {
    for (const value of values) {
      const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(",", ".")) : Number.NaN;
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  };
  const realCycleSeconds = resolveRealNumber(real?.real_cycle_time_seconds, real?.real_cycle_time, real?.real_tempo_ciclo_segundos);
  const realTempoCicloMin = realCycleSeconds == null ? null : realCycleSeconds > 10 ? realCycleSeconds / 60 : realCycleSeconds;
  const realCiclosPorHora = resolveRealNumber(real?.real_cycles_per_hour, real?.real_production_per_hour, real?.real_output_per_hour);
  const realProdutividade = resolveRealNumber(real?.real_productivity_pct, real?.real_productivity, real?.real_estimated_productivity);
  const realPerdas = resolveRealNumber(real?.real_balance_loss_pct, real?.real_balance_loss, real?.real_loss_pct);
  const realNumeroOperadores = resolveRealNumber(real?.real_num_operators, real?.real_operators, real?.real_number_of_operators);
  const comparison = (value: number, realValue: number | null, decimals: number, higherIsBetter: boolean) => {
    if (realValue == null || Math.abs(value - realValue) <= 0.005) return null;
    const difference = realValue - value;
    return {
      value: realValue.toFixed(decimals),
      difference: `(${difference > 0 ? "+" : ""}${difference.toFixed(decimals)})`,
      worse: higherIsBetter ? difference < 0 : difference > 0,
    };
  };
  const exibirTaktTime = mostrarTaktTime ?? (config.possibilidade === 2);
  const isColumn = layout === "column";

  const kpis = [
    {
      label: 'Ciclos/Hora',
      value: ciclosPorHora.toFixed(2),
      realComparison: comparison(ciclosPorHora, realCiclosPorHora, 2, true),
      unit: '',
      bgColor: 'bg-[#cbfbf1]',
      iconColor: '#009689',
      icon: (
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
          <g id="Icon">
            <path d={svgPaths.p2ebe2e00} stroke="#009689" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
            <path d="M7 12.8333V7" stroke="#009689" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
            <path d={svgPaths.p21a6a770} stroke="#009689" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
            <path d="M4.375 2.49083L9.625 5.495" stroke="#009689" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          </g>
        </svg>
      ),
    },
    ...(exibirTaktTime
      ? [{
          label: 'Takt Time',
          value: resultados.taktTime.toFixed(2),
          realComparison: null,
          unit: 'min',
          bgColor: 'bg-[#dbeafe]',
          iconColor: '#155DFC',
          icon: (
            <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
              <g clipPath="url(#clip0_266_1141)">
                <path d={svgPaths.pc012c00} stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
                <path d="M7 3.5V7L9.33333 8.16667" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
              </g>
              <defs>
                <clipPath id="clip0_266_1141">
                  <rect fill="white" height="14" width="14" />
                </clipPath>
              </defs>
            </svg>
          ),
        }]
      : []),
    {
      label: 'Tempo Ciclo',
      value: tempoCicloMin.toFixed(2),
      realComparison: comparison(tempoCicloMin, realTempoCicloMin, 2, false),
      unit: 'min',
      bgColor: 'bg-[#f3e8ff]',
      iconColor: '#9810FA',
      icon: (
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
          <g>
            <path d="M5.83333 1.16667H8.16667" stroke="#9810FA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
            <path d="M7 8.16667L8.75 6.41667" stroke="#9810FA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
            <path d={svgPaths.p3c1f7100} stroke="#9810FA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          </g>
        </svg>
      ),
    },
    {
      label: 'Produtividade',
      value: produtividade.toFixed(1),
      realComparison: comparison(produtividade, realProdutividade, 1, true),
      unit: '%',
      bgColor: 'bg-[#dcfce7]',
      iconColor: '#00A63E',
      icon: (
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
          <g>
            <path d={svgPaths.p1977ee80} stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
            <path d={svgPaths.p3471a100} stroke="#00A63E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          </g>
        </svg>
      ),
    },
    {
      label: 'Perdas',
      value: Number.isFinite(perdas) ? perdas.toFixed(1) : '-',
      realComparison: comparison(perdas, realPerdas, 1, false),
      unit: Number.isFinite(perdas) ? '%' : '',
      bgColor: 'bg-[#fef3c6]',
      iconColor: '#E17100',
      icon: (
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
          <g>
            <path d={svgPaths.p3ba1200} stroke="#E17100" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
            <path d="M7 5.25V7.58333" stroke="#E17100" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
            <path d="M7 9.91667H7.00583" stroke="#E17100" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          </g>
        </svg>
      ),
    },
    {
      label: 'Operadores',
      value: String(numeroOperadores),
      realComparison: comparison(numeroOperadores, realNumeroOperadores, 0, false),
      unit: '',
      bgColor: 'bg-[#e0e7ff]',
      iconColor: '#4F39F6',
      icon: (
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
          <g>
            <path d={svgPaths.p317fdd80} stroke="#4F39F6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
            <path d={svgPaths.p31c78b80} stroke="#4F39F6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
            <path d={svgPaths.p3625bb80} stroke="#4F39F6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
            <path d={svgPaths.p2ca18b80} stroke="#4F39F6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          </g>
        </svg>
      ),
    },
  ];

  return (
    <div className={isColumn ? "flex flex-col gap-6" : "flex flex-1 gap-2"}>
      {kpis.map((kpi, index) => (
        <div
          key={index}
          className={`bg-white rounded-md border border-[#e5e7eb] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] ${isColumn ? "w-full" : "flex-1"}`}
        >
          <div className="flex flex-col justify-center size-full">
            <div className="flex flex-col items-start justify-center p-[7px]">
              <div className="flex gap-[6px] items-center">
                {/* Icon */}
                <div className={`${kpi.bgColor} rounded-md shrink-0 size-7 flex items-center justify-center`}>
                  <div className="relative shrink-0 size-[14px]">
                    {kpi.icon}
                  </div>
                </div>

                {/* Label & Value */}
                <div className="flex flex-col">
                  <p className="font-medium leading-[13.5px] text-[#6a7282] text-[9px] tracking-[0.167px] uppercase whitespace-nowrap">
                    {kpi.label}
                  </p>
                  <p className="font-bold leading-7 text-[#101828] text-[18px] tracking-[-0.4395px] whitespace-nowrap">
                    <span>{kpi.value}</span>
                    {showRealMetrics && kpi.realComparison && <><span className="mx-2 text-[13px] font-normal text-gray-300">|</span><span className={kpi.realComparison.worse ? "text-[#c2413b]" : "text-[#2e8b68]"} title="Valor real e diferença para o teórico">{kpi.realComparison.value} <span className="text-[11px] font-medium">{kpi.realComparison.difference}</span></span></>}
                    {kpi.unit && (
                      <span className="font-normal leading-[15.556px] text-[#6a7282] text-[10px] tracking-[0.1172px]">
                        {kpi.unit}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
