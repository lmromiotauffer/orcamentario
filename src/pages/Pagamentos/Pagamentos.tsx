import { useGenericKPI, useText, type KPIParams } from "@cluster-data-experience/qlik-modules";
import { Cartao, TabelaCartao } from "@/components/CartaoPainel/CartaoPainel";
import { decrescente, type ColunaTabela } from "@/components/CartaoPainel/colunas";
import { BarrasRanking, LinhaMensal } from "@/components/GraficosOrcamento/GraficosOrcamento";
import { Skeleton } from "@/components/shadcn/skeleton";
import { useMobileScreen } from "@/shared/hooks/useMobileScreen";
import { anoEmContexto, anosSelecionados, moeda, pagoNoExercicio, restosAPagar, totalPago } from "@/shared/qlik/medidas";
import { moedaCompacta, moedaCompleta } from "@/shared/utils/formatarMoeda";

// Colunas do objeto 0175fe46 do app, da mais recente para a mais antiga
const colunasPagamentos: ColunaTabela[] = [
  { type: "dimension", qFieldDefs: ["=Date(DTTEMPO)"], qFieldLabels: ["Data"], qSortCriterias: [{ qSortByNumeric: decrescente }], qNullSuppression: true, sortingPriority: 0, largura: 96 },
  { type: "dimension", qFieldDefs: ["Sigla da adjunta"], qFieldLabels: ["Adjunta"], sortingPriority: 1, largura: 90 },
  { type: "dimension", qFieldDefs: ["PAOE"], qFieldLabels: ["Ação"], sortingPriority: 2, largura: 200 },
  { type: "dimension", qFieldDefs: ["Grupo da despesa"], qFieldLabels: ["Grupo da despesa"], sortingPriority: 3, largura: 150 },
  { type: "dimension", qFieldDefs: ["Descrição da modalidade"], qFieldLabels: ["Modalidade"], sortingPriority: 4, largura: 150 },
  { type: "dimension", qFieldDefs: ["Código da fonte"], qFieldLabels: ["Fonte"], sortingPriority: 5, largura: 90 },
  { type: "dimension", qFieldDefs: ["Contrato"], qFieldLabels: ["Contrato"], sortingPriority: 6, largura: 120 },
  { type: "dimension", qFieldDefs: ["nmCredor"], qFieldLabels: ["Credor"], sortingPriority: 7, largura: 220 },
  { type: "dimension", qFieldDefs: ["deElemento"], qFieldLabels: ["Elemento"], sortingPriority: 8, largura: 180 },
  { type: "dimension", qFieldDefs: ["Descrição do programa"], qFieldLabels: ["Programa"], sortingPriority: 9, largura: 180 },
  { type: "measure", qDef: moeda(totalPago), qLabel: "Valor pago", largura: 150 },
];

const kpisRestos: KPIParams[] = [
  { label: "Total pago", expression: totalPago },
  { label: "Pago no exercício", expression: pagoNoExercicio },
  { label: "Restos a pagar", expression: restosAPagar },
];

const valor = (celula?: { qNum?: number | string | null }) =>
  celula && typeof celula.qNum === "number" && Number.isFinite(celula.qNum) ? celula.qNum : null;

// Pago no ano = pago de empenhos do próprio ano + restos a pagar de empenhos de anos anteriores
const ResumoRestos = () => {
  const { data, error } = useGenericKPI(kpisRestos);
  const { text: ano } = useText(anoEmContexto);
  const itens = [
    { rotulo: `Pago em ${ano}`, indice: 0 },
    { rotulo: `Empenhos de ${ano}`, indice: 1 },
    { rotulo: "Anos anteriores", indice: 2 },
  ];
  return (
    <dl className="grid shrink-0 grid-cols-3 gap-x-3 px-1 pb-2 text-xs">
      {itens.map(({ rotulo, indice }) => (
        <div key={rotulo} className="min-w-0">
          <dt className="truncate text-[11px] leading-4 text-muted-foreground" title={indice === 2 ? "Restos a pagar: pagamentos de empenhos de anos anteriores" : rotulo}>
            {rotulo}
          </dt>
          <dd className="font-semibold tabular-nums text-foreground" title={moedaCompleta(valor(data?.[indice]))}>
            {data || error ? moedaCompacta(valor(data?.[indice])) : <Skeleton className="h-4 w-16" />}
          </dd>
        </div>
      ))}
    </dl>
  );
};

export const Pagamentos = () => {
  const compacta = useMobileScreen(1024);
  const { text: quantidadeAnos } = useText(anosSelecionados);
  const anoUnico = quantidadeAnos === "1";

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto">
      <div className="grid shrink-0 gap-2 md:grid-cols-2 lg:min-h-[240px] lg:flex-[2] lg:shrink xl:grid-cols-4">
        <Cartao titulo="Valor pago por mês" className="h-[300px] md:col-span-2 lg:h-auto xl:col-span-1">
          {() => <LinhaMensal medida={totalPago} rotuloMedida="Pago" />}
        </Cartao>
        <Cartao titulo="Maiores credores" className="h-[300px] lg:h-auto">
          {() => <BarrasRanking campo="nmCredor" rotulo="Credor" medida={totalPago} rotuloMedida="Pago" limite={10} />}
        </Cartao>
        <Cartao titulo="Por fonte de recursos" className="h-[300px] lg:h-auto">
          {() => <BarrasRanking campo="Classificação da fonte" rotulo="Fonte" medida={totalPago} rotuloMedida="Pago" limite={10} />}
        </Cartao>
        <Cartao titulo="Pago por ano do empenho" className="h-[300px] md:col-span-2 lg:h-auto xl:col-span-1">
          {() => (
            <div className="flex h-full flex-col">
              {anoUnico ? (
                <ResumoRestos />
              ) : (
                <p className="px-1 pb-2 text-[11px] leading-4 text-muted-foreground">Selecione um único ano para separar restos a pagar.</p>
              )}
              <div className="min-h-0 flex-1">
                <BarrasRanking campo="anoEmpenho" rotulo="Ano do empenho" medida={totalPago} rotuloMedida="Pago" limite={8} ordemDaDimensao />
              </div>
            </div>
          )}
        </Cartao>
      </div>
      <Cartao titulo="Lista dos pagamentos" className="h-[520px] shrink-0 lg:min-h-[320px] lg:flex-[3] lg:shrink">
        {(slot) => <TabelaCartao colunas={colunasPagamentos} slotExportar={slot} nomeArquivo="pagamentos" linhasIniciais={50} filtroNoCabecalho={!compacta} />}
      </Cartao>
    </div>
  );
};
