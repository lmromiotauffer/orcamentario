import { useMemo } from "react";
import ReactECharts from "echarts-for-react/esm/core";
import { useTable, type Column } from "@cluster-data-experience/qlik-modules";
import { crescente, medidaDecrescente, semTotais } from "@/components/CartaoPainel/colunas";
import { autorizado, empenhado, pagoNoExercicio } from "@/shared/qlik/medidas";
import { celulasOrdemEngine } from "@/shared/utils/celulasOrdemEngine";
import { moedaCompacta } from "@/shared/utils/formatarMoeda";
import { cn } from "@/shared/utils/tailwind/cn";
import { baseGrafico, echarts, eixoCategorias, eixoValores, linhaTooltip, numero, useClicarCategoria, useCoresGrafico } from "./base";
import { EstadoGrafico } from "./EstadoGrafico";

// Nome de categoria encurtado no eixo; o nome inteiro fica no tooltip
const encurtar = (texto: string, maximo: number) => (texto.length > maximo ? `${texto.slice(0, maximo - 1)}…` : texto);

/** Legenda em HTML: texto nos tokens de texto, só o ponto leva a cor da série. */
export const Legenda = ({ itens, className }: { itens: { nome: string; cor: string }[]; className?: string }) => (
  <ul className={cn("flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-4 text-muted-foreground", className)} aria-label="Legenda">
    {itens.map(({ nome, cor }) => (
      <li key={nome} className="flex items-center gap-1.5">
        <span className="size-2 rounded-full" style={{ background: cor }} aria-hidden />
        {nome}
      </li>
    ))}
  </ul>
);

type BarrasComparativasProps = {
  campo: string;
  rotulo: string;
  limite?: number;
  anoUnico: boolean;
};

/** Autorizado · Empenhado · Pago por categoria (grupo de despesa, fonte): barras horizontais nos três passos da régua. */
export const BarrasComparativas = ({ campo, rotulo, limite = 8, anoUnico }: BarrasComparativasProps) => {
  const cores = useCoresGrafico();
  const colunas = useMemo<Column[]>(
    () => [
      { type: "dimension", qFieldDefs: [campo], qFieldLabels: [rotulo], qNullSuppression: true, sortingPriority: 1 },
      { type: "measure", qDef: autorizado, qLabel: "Autorizado", qSortBy: { qSortByNumeric: medidaDecrescente }, sortingPriority: 0 },
      { type: "measure", qDef: empenhado, qLabel: "Empenhado" },
      { type: "measure", qDef: pagoNoExercicio, qLabel: "Pago" },
    ],
    [campo, rotulo],
  );
  const { data, layout, isLoading, selectCell } = useTable({ columns: colunas, pageHeight: limite, totals: semTotais });
  const aoIniciar = useClicarCategoria((indice) => selectCell(indice, 0));

  const linhas = useMemo(
    () =>
      (data?.rows ?? []).map((linha) => {
        const [categoria, aut, emp, pago] = celulasOrdemEngine(linha.cells, layout?.qHyperCube);
        return { nome: categoria?.qText ?? "", valores: [numero(aut), numero(emp), anoUnico ? numero(pago) : null] };
      }),
    [data, layout, anoUnico],
  );

  const series = ["Autorizado", "Empenhado", "Pago"];
  const opcao = useMemo(
    () => ({
      ...baseGrafico(cores),
      grid: { ...baseGrafico(cores).grid, top: 4, right: 12 },
      tooltip: {
        ...baseGrafico(cores).tooltip,
        axisPointer: { type: "shadow", shadowStyle: { color: cores.borda, opacity: 0.4 } },
        formatter: (params: { dataIndex: number }[]) => {
          const linha = linhas[params[0]?.dataIndex ?? 0];
          return `<strong>${linha?.nome}</strong><br/>${series.map((nome, i) => linhaTooltip(nome, linha?.valores[i] ?? null, cores.regua[i])).join("<br/>")}`;
        },
      },
      // Categorias no eixo y, maior em cima
      xAxis: { ...eixoValores(cores) },
      yAxis: { ...eixoCategorias(cores, linhas.map((l) => encurtar(l.nome, 22))), inverse: true, axisLabel: { color: cores.suave, fontSize: 10, width: 120, overflow: "truncate" } },
      series: series.map((nome, i) => ({
        name: nome,
        type: "bar",
        data: linhas.map((l) => l.valores[i]),
        barMaxWidth: 8,
        barGap: "25%",
        barCategoryGap: "35%",
        itemStyle: { color: cores.regua[i], borderRadius: [0, 4, 4, 0] },
      })),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cores, linhas],
  );

  if (!data || linhas.length === 0) return <EstadoGrafico carregando={isLoading} />;
  return (
    <div className="flex h-full w-full flex-col gap-1">
      <Legenda itens={series.map((nome, i) => ({ nome, cor: cores.regua[i] }))} className="px-1" />
      <div role="img" aria-label={`Gráfico de barras: autorizado, empenhado e pago por ${rotulo.toLowerCase()}`} className="min-h-0 flex-1">
        <ReactECharts echarts={echarts} option={opcao} notMerge style={{ height: "100%", width: "100%" }} onChartReady={aoIniciar} />
      </div>
    </div>
  );
};

type BarrasRankingProps = {
  campo: string;
  rotulo: string;
  medida: string;
  rotuloMedida: string;
  limite?: number;
  // Ordem pela dimensão (ex.: anos) em vez de pelo valor
  ordemDaDimensao?: boolean;
};

/** Maiores valores de uma medida por categoria (credor, adjunta, fonte, ano do empenho), com o valor na ponta. */
export const BarrasRanking = ({ campo, rotulo, medida, rotuloMedida, limite = 10, ordemDaDimensao }: BarrasRankingProps) => {
  const cores = useCoresGrafico();
  const colunas = useMemo<Column[]>(
    () => [
      {
        type: "dimension",
        qFieldDefs: [campo],
        qFieldLabels: [rotulo],
        qNullSuppression: true,
        sortingPriority: ordemDaDimensao ? 0 : 1,
        ...(ordemDaDimensao && { qSortCriterias: [{ qSortByNumeric: crescente }] }),
      },
      { type: "measure", qDef: medida, qLabel: rotuloMedida, qSortBy: { qSortByNumeric: medidaDecrescente }, sortingPriority: ordemDaDimensao ? 1 : 0 },
    ],
    [campo, rotulo, medida, rotuloMedida, ordemDaDimensao],
  );
  const { data, layout, isLoading, selectCell } = useTable({ columns: colunas, pageHeight: limite, totals: semTotais });
  const aoIniciar = useClicarCategoria((indice) => selectCell(indice, 0));

  const linhas = useMemo(
    () =>
      (data?.rows ?? []).map((linha) => {
        const [categoria, valor] = celulasOrdemEngine(linha.cells, layout?.qHyperCube);
        return { nome: categoria?.qText ?? "", valor: numero(valor) };
      }),
    [data, layout],
  );

  const opcao = useMemo(
    () => ({
      ...baseGrafico(cores),
      grid: { ...baseGrafico(cores).grid, top: 4, right: 64 },
      tooltip: {
        ...baseGrafico(cores).tooltip,
        axisPointer: { type: "shadow", shadowStyle: { color: cores.borda, opacity: 0.4 } },
        formatter: (params: { dataIndex: number }[]) => {
          const linha = linhas[params[0]?.dataIndex ?? 0];
          return `<strong>${linha?.nome}</strong><br/>${linhaTooltip(rotuloMedida, linha?.valor ?? null, cores.regua[1])}`;
        },
      },
      xAxis: { ...eixoValores(cores), axisLabel: { show: false }, splitLine: { show: false } },
      yAxis: { ...eixoCategorias(cores, linhas.map((l) => encurtar(l.nome, 26))), inverse: true, axisLabel: { color: cores.suave, fontSize: 10, width: 150, overflow: "truncate" } },
      series: [
        {
          name: rotuloMedida,
          type: "bar",
          data: linhas.map((l) => l.valor),
          barMaxWidth: 14,
          barCategoryGap: "35%",
          itemStyle: { color: cores.regua[1], borderRadius: [0, 4, 4, 0] },
          // Valor na ponta, em texto; a barra leva a cor
          label: { show: true, position: "right", color: cores.suave, fontSize: 10, formatter: ({ value }: { value: number | null }) => moedaCompacta(value) },
        },
      ],
    }),
    [cores, linhas, rotuloMedida],
  );

  if (!data || linhas.length === 0) return <EstadoGrafico carregando={isLoading} />;
  return (
    <div role="img" aria-label={`Gráfico de barras: ${rotuloMedida.toLowerCase()} por ${rotulo.toLowerCase()}`} className="h-full w-full">
      <ReactECharts echarts={echarts} option={opcao} notMerge style={{ height: "100%", width: "100%" }} onChartReady={aoIniciar} />
    </div>
  );
};

type LinhaMensalProps = {
  medida: string;
  rotuloMedida: string;
};

/** Valor por ano/mês (DEANOMES) ao longo do período em contexto. Clicar num mês seleciona o ano/mês. */
export const LinhaMensal = ({ medida, rotuloMedida }: LinhaMensalProps) => {
  const cores = useCoresGrafico();
  const colunas = useMemo<Column[]>(
    () => [
      { type: "dimension", qFieldDefs: ["DEANOMES"], qFieldLabels: ["Ano/mês"], qSortCriterias: [{ qSortByNumeric: crescente }], qNullSuppression: true },
      { type: "measure", qDef: medida, qLabel: rotuloMedida },
    ],
    [medida, rotuloMedida],
  );
  const { data, layout, isLoading, selectCell } = useTable({ columns: colunas, pageHeight: 200, totals: semTotais });
  const aoIniciar = useClicarCategoria((indice) => selectCell(indice, 0));

  const pontos = useMemo(
    () =>
      (data?.rows ?? []).map((linha) => {
        const [mes, valor] = celulasOrdemEngine(linha.cells, layout?.qHyperCube);
        return { mes: mes?.qText ?? "", valor: numero(valor) };
      }),
    [data, layout],
  );

  const opcao = useMemo(
    () => ({
      ...baseGrafico(cores),
      grid: { ...baseGrafico(cores).grid, top: 16, right: 16 },
      tooltip: {
        ...baseGrafico(cores).tooltip,
        axisPointer: { type: "line", lineStyle: { color: cores.suave } },
        formatter: (params: { dataIndex: number }[]) => {
          const ponto = pontos[params[0]?.dataIndex ?? 0];
          return `<strong>${ponto?.mes}</strong><br/>${linhaTooltip(rotuloMedida, ponto?.valor ?? null, cores.regua[1])}`;
        },
      },
      xAxis: { ...eixoCategorias(cores, pontos.map((p) => p.mes)), boundaryGap: false },
      yAxis: { ...eixoValores(cores), min: 0 },
      series: [
        {
          name: rotuloMedida,
          type: "line",
          data: pontos.map((p) => p.valor),
          lineStyle: { width: 2, color: cores.regua[1] },
          // Área a 10 %: lavagem, não bloco
          areaStyle: { color: cores.regua[1], opacity: 0.1 },
          itemStyle: { color: cores.regua[1], borderColor: cores.superficie, borderWidth: 2 },
          symbol: "circle",
          symbolSize: 8,
        },
      ],
    }),
    [cores, pontos, rotuloMedida],
  );

  if (!data || pontos.length === 0) return <EstadoGrafico carregando={isLoading} />;
  return (
    <div role="img" aria-label={`Gráfico de linha: ${rotuloMedida.toLowerCase()} por ano/mês`} className="h-full w-full">
      <ReactECharts echarts={echarts} option={opcao} notMerge style={{ height: "100%", width: "100%" }} onChartReady={aoIniciar} />
    </div>
  );
};
