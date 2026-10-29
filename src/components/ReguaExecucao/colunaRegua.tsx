import type { Cell } from "@cluster-data-experience/qlik-modules";
import type { ColunaTabela } from "@/components/CartaoPainel/colunas";
import { cofd, percentual } from "@/shared/qlik/medidas";
import { numero } from "@/components/GraficosOrcamento/base";
import { moedaCompacta, moedaCompleta } from "@/shared/utils/formatarMoeda";
import { ReguaExecucao } from "./ReguaExecucao";

type Indices = { autorizado: number; empenhado: number; liquidado: number; pago: number };

/**
 * Coluna "Execução" para tabelas: a régua de linha única desenhada a partir das células da linha
 * (índices na ordem do engine: dimensões e depois medidas). Mesmo dispositivo do ranking do Fornecedores: cabe numa linha.
 */
export const colunaRegua = (indices: Indices, largura: number | "resto" = 180): ColunaTabela => ({
  type: "measure",
  qDef: percentual(cofd),
  qLabel: "Execução",
  largura,
  renderizar: (_celula: Cell, linha: Cell[]) => (
    <ReguaExecucao
      linhaUnica
      autorizado={numero(linha[indices.autorizado])}
      linhas={[
        { rotulo: "Empenhado", valor: numero(linha[indices.empenhado]) },
        { rotulo: "Liquidado", valor: numero(linha[indices.liquidado]) },
        { rotulo: "Pago", valor: numero(linha[indices.pago]) },
      ]}
    />
  ),
});

// Valor em compacto ("R$ 226,53 mi") com o valor inteiro no title: as colunas de dinheiro cabem sem rolagem
export const celulaMoedaCompacta = (celula: Cell) => (
  <span className="tabular-nums" title={moedaCompleta(numero(celula))}>
    {moedaCompacta(numero(celula))}
  </span>
);
