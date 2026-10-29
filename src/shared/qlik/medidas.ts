// Expressões oficiais do app Qlik "Painel orçamentário", copiadas dos objetos das folhas
// (.impeccable/objetos-orcamentario.json). Uma fonte só para KPIs, colunas, tabelas e gráficos.

export const inicial = "Sum(vlInicial)";
export const suplementado = "Sum(vlSuplementado)";
export const anulado = "Sum(vlAnulado)";
export const autorizado = "Sum(vlAutorizado)";
export const bloqueado = "Sum(vlBloqueado)";
export const contingenciado = "Sum(vlContingenciado)";
export const disponivel = "Sum(vlDisponivel)";
// vlPED acumula pré-empenho e empenho: o KPI "PED" do app mostra só a parte pré-empenhada
export const ped = "Sum(vlPED) - Sum(vlEmpenhado)";
export const emExecucao = "Sum(vlPED)";
export const empenhado = "Sum(valorEmpenho) - Sum(valorEstornoEmpenho)";
export const liquidado = "Sum(valorLiquidacao) - Sum(valorEstornoLiquidacao)";
// Pagamentos de empenhos do próprio ano em contexto: vale só com um ano selecionado ($(=[Ano]))
export const pagoNoExercicio =
  'Sum({<anoEmpenho = {"$(=[Ano])"}>} valorPagamento) - Sum({<anoEstornoEmpenho = {"$(=[Ano])"}>} valorEstornoPagamento)';
export const totalPago = "Sum(valorPagamento) - Sum(valorEstornoPagamento)";
export const restosAPagar = `(${totalPago}) - (${pagoNoExercicio})`;
export const saldoALiquidar = `(${empenhado}) - Sum(vlLiquidado)`;

export const ppd = `(${empenhado}) / ${inicial}`;
export const cofd = `(${empenhado}) / ${autorizado}`;
export const liquidadoSobreEmpenhado = `(${liquidado}) / (${empenhado})`;

// Mesmo dia e mês de hoje em cada ano: compara o acumulado "até dd/mm" entre anos
export const ateHoje = '_skTempo = {"=Mod({1}_skTempo,10000) <= $(=Month(Today())*100 + Day(Today()))"}';
export const semTempo = "DEANOMES=, DTTEMPO=";
// Acumulado do ano anterior ao selecionado, até a data de hoje
const anoAnterior = `Ano = {$(=Only(Ano) - 1)}, ${semTempo}, ${ateHoje}`;
export const empenhadoAnoAnteriorAteHoje = `Sum({<${anoAnterior}>} valorEmpenho) - Sum({<${anoAnterior}>} valorEstornoEmpenho)`;
export const pagoAnoAnteriorAteHoje = `Sum({<${anoAnterior}>} valorPagamento) - Sum({<${anoAnterior}>} valorEstornoPagamento)`;

// Formato monetário dos KPIs do app
export const formatoMoeda = "R$#.##0,00;-R$#.##0,00";
export const moeda = (expressao: string) => `Num(${expressao}, '${formatoMoeda}')`;
export const percentual = (expressao: string) => `Num(${expressao}, '0,00%')`;

// Anos em contexto, para títulos: "2026", "2025 e 2026", "todos os anos"
export const anoEmContexto =
  "=If(GetSelectedCount(Ano) = 1, Only(Ano), If(GetSelectedCount(Ano) = 0, 'todos os anos', Concat(DISTINCT Ano, ', ')))";
export const anosSelecionados = "=GetSelectedCount(Ano)";

export type IndicadorTecnico = { rotulo: string; expressao: string; formula: string; percentual?: boolean };

// Indicadores do painel antigo com a fórmula por extenso, para "Mais indicadores"
export const indicadoresTecnicos: IndicadorTecnico[] = [
  { rotulo: "Inicial", expressao: inicial, formula: "Orçamento aprovado na lei orçamentária" },
  { rotulo: "Suplementado", expressao: suplementado, formula: "Créditos adicionados ao longo do ano" },
  { rotulo: "Anulado", expressao: anulado, formula: "Créditos retirados ao longo do ano" },
  { rotulo: "Bloqueado", expressao: bloqueado, formula: "Parcela do autorizado bloqueada" },
  { rotulo: "Contingenciado", expressao: contingenciado, formula: "Parcela do autorizado contingenciada" },
  { rotulo: "PED", expressao: ped, formula: "Pré-empenhado ainda não empenhado" },
  { rotulo: "Disponível", expressao: disponivel, formula: "Autorizado − bloqueado − contingenciado − em execução" },
  { rotulo: "Total pago", expressao: totalPago, formula: "Pagamentos no ano, inclusive de empenhos de anos anteriores" },
  { rotulo: "Restos a pagar", expressao: restosAPagar, formula: "Total pago − pago no exercício" },
  { rotulo: "PPD", expressao: ppd, formula: "Empenhado ÷ Inicial", percentual: true },
  { rotulo: "COFD", expressao: cofd, formula: "Empenhado ÷ Autorizado", percentual: true },
  { rotulo: "Liquidado ÷ Empenhado", expressao: liquidadoSobreEmpenhado, formula: "Liquidado no exercício ÷ Empenhado", percentual: true },
];

/**
 * Injeta um modificador de conjunto em cada Sum() da expressão, somando-o ao que já existe.
 * `comSet(pagoNoExercicio, "[Ano]=")` → Sum({<anoEmpenho = {...}, [Ano]=>} valorPagamento) − …
 */
export const comSet = (expressao: string, conjunto: string): string =>
  expressao.replace(/Sum\(\s*\{<([^>]*)>\}/gi, (_, atual: string) => `Sum({<${atual}, ${conjunto}>}`).replace(/Sum\((?!\{)/gi, `Sum({<${conjunto}>} `);

// Campos da adjunta, limpos nas colunas para as cinco continuarem visíveis com uma selecionada
export const semAdjunta = "[Descrição da adjunta]=, [Sigla da adjunta]=";
