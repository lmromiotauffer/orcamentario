import type { ReactNode } from "react";
import type { Cell, Column } from "@cluster-data-experience/qlik-modules";

export const semTotais = { show: false, position: "noTotals" } as const;

// @types/qlik-engineapi tipa a direção como string ("1"), mas o engine espera número.
// O useTable grava qReverseSort: true em dimensões e medidas, o que inverte o sentido: por isso os sinais trocados
export const crescente = -1 as unknown as EngineAPI.TypeSortDirection;
export const decrescente = 1 as unknown as EngineAPI.TypeSortDirection;
export const medidaCrescente = -1 as unknown as EngineAPI.TypeSortDirection;
export const medidaDecrescente = 1 as unknown as EngineAPI.TypeSortDirection;

export type ColunaTabela = Column & {
  // largura em px: as colunas curtas cabem no cartão sem rolagem lateral; "resto" absorve a folga da tabela
  largura?: number | "resto";
  // Desenho próprio da célula (barra, chip, medalha); recebe a célula e a linha na ordem do engine
  renderizar?: (celula: Cell, linha: Cell[]) => ReactNode;
  // Alinhamento da célula lido pela CustomTable (números à direita)
  alinhamento?: "direita";
  // No cubo (para a régua e a planilha), mas sem coluna desenhada
  oculta?: boolean;
};
