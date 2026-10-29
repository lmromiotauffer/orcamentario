import type { FilterConfig } from "@/shared/qlik/filtros";

// Rótulos dos campos selecionados fora da barra de filtros (cliques nos gráficos, mapa e tabelas)
const fieldLabels: Record<string, string> = {
  Ano: "Ano",
  nmCredor: "Credor",
  "Região financeira": "Região",
  "Classificação da fonte": "Fonte",
  "Código da fonte": "Código da fonte",
  "Descrição da fonte": "Fonte",
  "Grupo da despesa": "Grupo da despesa",
  "Descrição da adjunta": "Adjunta",
  "Sigla da adjunta": "Adjunta",
  PAOE: "Ação orçamentária",
  cdPAOE: "Ação orçamentária",
  "Nome da ação": "Ação",
  "Descrição do programa": "Programa",
  "Descrição da modalidade": "Modalidade",
  Município: "Município",
  anoEmpenho: "Ano do empenho",
  DEANOMES: "Ano/mês",
  DTTEMPO: "Data",
  Contrato: "Contrato",
  deElemento: "Elemento",
  nuEmpenho: "Código do empenho",
};

/** Nome do campo numa expressão de filtro: "=[Situação atual do contrato]" vira "Situação atual do contrato" */
export const campoDaExpressao = (expressao: string): string =>
  expressao.replace(/^=/, "").replace(/^\[(.*)\]$/, "$1");

export const getFieldLabel = (field: string, filters: FilterConfig[]): string =>
  filters.find(({ expression }) => campoDaExpressao(expression) === field)?.label ?? fieldLabels[field] ?? field;
