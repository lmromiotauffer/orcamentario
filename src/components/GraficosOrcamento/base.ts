import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart, MapChart, ScatterChart } from "echarts/charts";
import { GeoComponent, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { movimentoReduzido } from "@/shared/hooks/useMovimentoReduzido";
import { moedaCompacta, moedaCompleta } from "@/shared/utils/formatarMoeda";

// Só os módulos usados: o echarts completo pesa ~1 MB minificado
echarts.use([
  LineChart,
  BarChart,
  MapChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  GeoComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

export { echarts };

// O canvas precisa de cores resolvidas: lê as paletas --palette-{light,dark}-* de index.css, que não dependem
// da classe do documento (a troca de tema não lê a cor anterior)
export const useCoresGrafico = () => {
  const { isDark } = useTheme();
  return useMemo(() => {
    const estilos = getComputedStyle(document.documentElement);
    const ler = (papel: string) => estilos.getPropertyValue(`--palette-${isDark ? "dark" : "light"}-${papel}`).trim();
    return {
      superficie: ler("surface"),
      texto: ler("text"),
      suave: ler("muted"),
      borda: ler("border"),
      primaria: ler("primary"),
      // Os três passos da régua: Empenhado, Liquidado, Pago; e a trilha fraca do Autorizado
      regua: [ler("regua-1"), ler("regua-2"), ler("regua-3")],
      reguaFraco: ler("regua-fraco"),
      sucesso: ler("success"),
      destrutivo: ler("destructive"),
      fonte: getComputedStyle(document.body).fontFamily,
    };
  }, [isDark]);
};

export type Cores = ReturnType<typeof useCoresGrafico>;

export const baseGrafico = (cores: Cores) => ({
  backgroundColor: "transparent",
  // A animação do ECharts é JS e escapa do CSS de movimento reduzido
  animation: !movimentoReduzido(),
  textStyle: { fontFamily: cores.fonte },
  // ECharts 6: outerBoundsMode "same" + outerBoundsContain "axisLabel" é o containLabel: true de antes (depreciado)
  grid: { left: 8, right: 16, top: 28, bottom: 8, outerBoundsMode: "same", outerBoundsContain: "axisLabel" },
  tooltip: {
    trigger: "axis",
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    textStyle: { color: cores.texto, fontSize: 12 },
  },
  legend: { show: false },
});

export const eixoCategorias = (cores: Cores, dados: string[]) => ({
  type: "category",
  data: dados,
  axisLabel: { color: cores.suave, fontSize: 10 },
  axisLine: { lineStyle: { color: cores.borda } },
  axisTick: { show: false },
});

// Valores em reais no eixo: "R$ 1 bi", "R$ 500 mi"
export const eixoValores = (cores: Cores) => ({
  type: "value",
  axisLabel: { color: cores.suave, fontSize: 10, formatter: (valor: number) => moedaCompacta(valor).replace(",00", "") },
  splitLine: { lineStyle: { color: cores.borda } },
});

export const linhaTooltip = (nome: string, valor: number | null, cor?: string) =>
  `<span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:${cor ?? "transparent"};margin-right:6px"></span>${nome}: <strong>${moedaCompleta(valor)}</strong>`;

// A faixa inteira da categoria seleciona, não só a marca: a barra de 1% e o ponto de 8px são alvos pequenos
export const useClicarCategoria = (selecionar: (indice: number) => void) => {
  const selecionarAtual = useRef(selecionar);
  useEffect(() => {
    selecionarAtual.current = selecionar;
  });
  return (grafico: echarts.EChartsType) => {
    grafico.getZr().on("click", ({ offsetX, offsetY }) => {
      if (!grafico.containPixel("grid", [offsetX, offsetY])) return;
      const ponto = grafico.convertFromPixel({ seriesIndex: 0 }, [offsetX, offsetY]) as number[];
      // Barras horizontais: a categoria está no eixo y (índice 1); verticais, no x (índice 0)
      const opcao = grafico.getOption() as { yAxis?: { type?: string }[] };
      const indice = opcao.yAxis?.[0]?.type === "category" ? ponto[1] : ponto[0];
      selecionarAtual.current(Math.round(indice));
    });
  };
};

export const numero = (celula?: { qNum?: number | string | null }): number | null =>
  celula && typeof celula.qNum === "number" && Number.isFinite(celula.qNum) ? celula.qNum : null;
