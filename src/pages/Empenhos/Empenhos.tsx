import { Cartao, TabelaCartao } from "@/components/CartaoPainel/CartaoPainel";
import { decrescente, medidaDecrescente, type ColunaTabela } from "@/components/CartaoPainel/colunas";
import { celulaMoedaCompacta, colunaRegua } from "@/components/ReguaExecucao/colunaRegua";
import { BarrasRanking, LinhaMensal } from "@/components/GraficosOrcamento/GraficosOrcamento";
import { useMobileScreen } from "@/shared/hooks/useMobileScreen";
import { autorizado, empenhado, liquidado, moeda, pagoNoExercicio } from "@/shared/qlik/medidas";

// Colunas do objeto wXdXBRL do app, da mais recente para a mais antiga
const colunasEmpenhos: ColunaTabela[] = [
  { type: "dimension", qFieldDefs: ["Data do empenho"], qFieldLabels: ["Data"], qSortCriterias: [{ qSortByNumeric: decrescente }], qNullSuppression: true, sortingPriority: 0, largura: 96 },
  { type: "dimension", qFieldDefs: ["nuEmpenho"], qFieldLabels: ["Código do empenho"], sortingPriority: 1, largura: 170 },
  { type: "dimension", qFieldDefs: ["deEmpenho"], qFieldLabels: ["Descrição"], sortingPriority: 2, largura: 260 },
  { type: "dimension", qFieldDefs: ["Sigla da adjunta"], qFieldLabels: ["Adjunta"], sortingPriority: 3, largura: 90 },
  { type: "dimension", qFieldDefs: ["PAOE"], qFieldLabels: ["Ação"], sortingPriority: 4, largura: 200 },
  { type: "dimension", qFieldDefs: ["Grupo da despesa"], qFieldLabels: ["Grupo da despesa"], sortingPriority: 5, largura: 150 },
  { type: "dimension", qFieldDefs: ["Descrição da modalidade"], qFieldLabels: ["Modalidade"], sortingPriority: 6, largura: 150 },
  { type: "dimension", qFieldDefs: ["Código da fonte"], qFieldLabels: ["Fonte"], sortingPriority: 7, largura: 90 },
  { type: "dimension", qFieldDefs: ["Contrato"], qFieldLabels: ["Contrato"], sortingPriority: 8, largura: 120 },
  { type: "dimension", qFieldDefs: ["nmCredor"], qFieldLabels: ["Credor"], sortingPriority: 9, largura: 220 },
  { type: "dimension", qFieldDefs: ["deElemento"], qFieldLabels: ["Elemento"], sortingPriority: 10, largura: 180 },
  { type: "dimension", qFieldDefs: ["Descrição do programa"], qFieldLabels: ["Programa"], sortingPriority: 11, largura: 180 },
  { type: "measure", qDef: moeda(empenhado), qLabel: "Empenhado", largura: 150 },
  { type: "measure", qDef: moeda(liquidado), qLabel: "Liquidado", largura: 150 },
];

// Adjuntas na mesma régua do Estado, numa linha cada: Adjunta · Execução · Autorizado cabem no cartão sem rolar.
// Empenhado, Liquidado e Pago alimentam a régua (e os percentuais no title) sem virar coluna visível.
// Células na ordem do engine: adjunta, execução, autorizado, empenhado, liquidado, pago
const colunasAdjuntas: ColunaTabela[] = [
  { type: "dimension", qFieldDefs: ["Sigla da adjunta"], qFieldLabels: ["Adjunta"], qNullSuppression: true, sortingPriority: 1, largura: 84 },
  colunaRegua({ autorizado: 2, empenhado: 3, liquidado: 4, pago: 5 }, 150),
  { type: "measure", qDef: moeda(autorizado), qLabel: "Autorizado", largura: 104, alinhamento: "direita", renderizar: celulaMoedaCompacta },
  { type: "measure", qDef: moeda(empenhado), qLabel: "Empenhado", qSortBy: { qSortByNumeric: medidaDecrescente }, sortingPriority: 0, oculta: true },
  { type: "measure", qDef: moeda(liquidado), qLabel: "Liquidado", oculta: true },
  { type: "measure", qDef: moeda(pagoNoExercicio), qLabel: "Pago", oculta: true },
];

export const Empenhos = () => {
  const compacta = useMobileScreen(1024);
  return (
    // A partir de lg os cartões dividem a altura da janela (gráficos em 2/5, lista em 3/5); abaixo, altura fixa e a página rola
    <div className="flex h-full flex-col gap-2 overflow-y-auto">
      <div className="grid shrink-0 gap-2 md:grid-cols-2 lg:min-h-[240px] lg:flex-[2] lg:shrink xl:grid-cols-3">
        <Cartao titulo="Valor empenhado por mês" className="h-[300px] md:col-span-2 lg:h-auto xl:col-span-1">
          {() => <LinhaMensal medida={empenhado} rotuloMedida="Empenhado" />}
        </Cartao>
        <Cartao titulo="Maiores credores" className="h-[300px] lg:h-auto">
          {() => <BarrasRanking campo="nmCredor" rotulo="Credor" medida={empenhado} rotuloMedida="Empenhado" limite={10} />}
        </Cartao>
        <Cartao titulo="Por adjunta" className="h-[300px] lg:h-auto">
          {(slot) => <TabelaCartao colunas={colunasAdjuntas} slotExportar={slot} nomeArquivo="empenhos-por-adjunta" linhasIniciais={10} selecionarLinha filtroNoCabecalho={false} className="[&_td]:h-8 [&_th]:h-8" />}
        </Cartao>
      </div>
      <Cartao titulo="Lista dos empenhos" className="h-[520px] shrink-0 lg:min-h-[320px] lg:flex-[3] lg:shrink">
        {(slot) => <TabelaCartao colunas={colunasEmpenhos} slotExportar={slot} nomeArquivo="empenhos" linhasIniciais={50} filtroNoCabecalho={!compacta} />}
      </Cartao>
    </div>
  );
};
