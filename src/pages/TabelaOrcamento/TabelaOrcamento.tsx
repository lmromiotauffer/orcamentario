import { Cartao, TabelaCartao } from "@/components/CartaoPainel/CartaoPainel";
import { medidaDecrescente, type ColunaTabela } from "@/components/CartaoPainel/colunas";
import { useMobileScreen } from "@/shared/hooks/useMobileScreen";
import {
  autorizado,
  disponivel,
  emExecucao,
  empenhado,
  inicial,
  liquidado,
  liquidadoSobreEmpenhado,
  moeda,
  pagoNoExercicio,
  percentual,
  saldoALiquidar,
} from "@/shared/qlik/medidas";

// Colunas do objeto VZABu do app; ordem pelo Inicial, da maior ação para a menor
const colunas: ColunaTabela[] = [
  { type: "dimension", qFieldDefs: ["Ano"], qFieldLabels: ["Ano"], qNullSuppression: true, sortingPriority: 1, largura: 84 },
  { type: "dimension", qFieldDefs: ["Sigla da adjunta"], qFieldLabels: ["Adjunta"], sortingPriority: 2, largura: 104 },
  { type: "dimension", qFieldDefs: ["cdPAOE"], qFieldLabels: ["PAOE"], sortingPriority: 3, largura: 88 },
  { type: "dimension", qFieldDefs: ["Nome da ação"], qFieldLabels: ["Ação"], sortingPriority: 4, largura: 220 },
  { type: "dimension", qFieldDefs: ["Região financeira"], qFieldLabels: ["Região"], sortingPriority: 5, largura: 170 },
  { type: "dimension", qFieldDefs: ["Grupo da despesa"], qFieldLabels: ["Grupo da despesa"], sortingPriority: 6, largura: 150 },
  { type: "dimension", qFieldDefs: ["Descrição da modalidade"], qFieldLabels: ["Modalidade"], sortingPriority: 7, largura: 160 },
  { type: "dimension", qFieldDefs: ["Código da fonte"], qFieldLabels: ["Código da fonte"], sortingPriority: 8, largura: 100 },
  { type: "dimension", qFieldDefs: ["Classificação da fonte"], qFieldLabels: ["Fonte"], sortingPriority: 9, largura: 150 },
  { type: "measure", qDef: moeda(inicial), qLabel: "Inicial", qSortBy: { qSortByNumeric: medidaDecrescente }, sortingPriority: 0, largura: 150 },
  { type: "measure", qDef: moeda(autorizado), qLabel: "Autorizado", largura: 150 },
  { type: "measure", qDef: moeda(emExecucao), qLabel: "Em execução", largura: 150 },
  { type: "measure", qDef: moeda(empenhado), qLabel: "Empenhado", largura: 150 },
  { type: "measure", qDef: moeda(liquidado), qLabel: "Liquidado no exercício", largura: 150 },
  { type: "measure", qDef: moeda(saldoALiquidar), qLabel: "Saldo a liquidar", largura: 150 },
  { type: "measure", qDef: moeda(pagoNoExercicio), qLabel: "Pago no exercício", largura: 150 },
  { type: "measure", qDef: moeda(disponivel), qLabel: "Disponível", largura: 150 },
  { type: "measure", qDef: percentual(liquidadoSobreEmpenhado), qLabel: "Liquidado ÷ Empenhado", largura: 120 },
  { type: "measure", qDef: percentual(`${emExecucao} / ${autorizado}`), qLabel: "Em execução ÷ Autorizado", largura: 120 },
  { type: "measure", qDef: percentual(`${disponivel} / ${autorizado}`), qLabel: "Disponível ÷ Autorizado", largura: 120 },
];

const totais = { show: true, position: "top" as const, label: "Totais" };

export const TabelaOrcamento = () => {
  const compacta = useMobileScreen(1024);
  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto lg:overflow-hidden">
      <Cartao titulo="Orçamento por ação, região, grupo e fonte" className="h-auto min-h-[560px] shrink-0 lg:min-h-0 lg:flex-1">
        {(slot) => <TabelaCartao colunas={colunas} slotExportar={slot} nomeArquivo="tabela-do-orcamento" linhasIniciais={50} filtroNoCabecalho={!compacta} totais={totais} />}
      </Cartao>
    </div>
  );
};
