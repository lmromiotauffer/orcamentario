import { useState } from "react";
import { useText } from "@cluster-data-experience/qlik-modules";
import { Cartao, TabelaCartao } from "@/components/CartaoPainel/CartaoPainel";
import { medidaDecrescente, type ColunaTabela } from "@/components/CartaoPainel/colunas";
import { celulaMoedaCompacta, colunaRegua } from "@/components/ReguaExecucao/colunaRegua";
import { BarrasComparativas } from "@/components/GraficosOrcamento/GraficosOrcamento";
import { MapaRegioes, medidasMapa, type MedidaMapa } from "@/components/MapaRegioes/MapaRegioes";
import Tabs from "@/components/Tabs/Tabs";
import { anosSelecionados, autorizado, disponivel, empenhado, inicial, liquidado, moeda, pagoNoExercicio } from "@/shared/qlik/medidas";

const colunasRegioes: ColunaTabela[] = [
  { type: "dimension", qFieldDefs: ["Região financeira"], qFieldLabels: ["Região"], qNullSuppression: true, sortingPriority: 1, largura: "resto" },
  // Células na ordem do engine: região, execução, inicial, autorizado, empenhado, liquidado, pago, disponível
  colunaRegua({ autorizado: 3, empenhado: 4, liquidado: 5, pago: 6 }),
  { type: "measure", qDef: moeda(inicial), qLabel: "Inicial", largura: 104, alinhamento: "direita", renderizar: celulaMoedaCompacta },
  { type: "measure", qDef: moeda(autorizado), qLabel: "Autorizado", qSortBy: { qSortByNumeric: medidaDecrescente }, sortingPriority: 0, largura: 110, alinhamento: "direita", renderizar: celulaMoedaCompacta },
  { type: "measure", qDef: moeda(empenhado), qLabel: "Empenhado", largura: 110, alinhamento: "direita", renderizar: celulaMoedaCompacta },
  { type: "measure", qDef: moeda(liquidado), qLabel: "Liquidado", largura: 104, alinhamento: "direita", renderizar: celulaMoedaCompacta },
  { type: "measure", qDef: moeda(pagoNoExercicio), qLabel: "Pago", largura: 104, alinhamento: "direita", renderizar: celulaMoedaCompacta },
  { type: "measure", qDef: moeda(disponivel), qLabel: "Disponível", largura: 104, alinhamento: "direita", renderizar: celulaMoedaCompacta },
];

const colunasMunicipios: ColunaTabela[] = [
  { type: "dimension", qFieldDefs: ["Município"], qFieldLabels: ["Município"], qNullSuppression: true, sortingPriority: 0, largura: "resto" },
  { type: "dimension", qFieldDefs: ["Região financeira"], qFieldLabels: ["Região"], sortingPriority: 1, largura: 180 },
];

export const RegioesFontes = () => {
  const [medidaMapa, setMedidaMapa] = useState<MedidaMapa>("empenhado");
  const { text: quantidadeAnos } = useText(anosSelecionados);
  const anoUnico = quantidadeAnos === "1";

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto">
      <div className="grid shrink-0 gap-2 lg:min-h-[420px] lg:flex-[3] lg:shrink lg:grid-cols-12">
        <Cartao
          titulo="Mapa das regiões financeiras"
          className="h-[480px] lg:col-span-7 lg:h-auto"
          acoes={<Tabs tabs={medidasMapa} activeTab={medidaMapa} onTabChange={(aba) => setMedidaMapa(aba as MedidaMapa)} className="w-auto shrink-0" />}
        >
          {() => <MapaRegioes medida={medidaMapa} anoUnico={anoUnico} />}
        </Cartao>
        <Cartao titulo="Execução por região" className="h-[480px] lg:col-span-5 lg:h-auto">
          {(slot) => <TabelaCartao colunas={colunasRegioes} slotExportar={slot} nomeArquivo="execucao-por-regiao" linhasIniciais={25} selecionarLinha filtroNoCabecalho={false} />}
        </Cartao>
      </div>

      <div className="grid shrink-0 gap-2 md:grid-cols-2 lg:min-h-[380px] lg:flex-[2] lg:shrink xl:grid-cols-3">
        <Cartao titulo="Por grupo de despesa" className="h-[320px] lg:h-auto">
          {() => <BarrasComparativas campo="Grupo da despesa" rotulo="Grupo de despesa" limite={8} anoUnico={anoUnico} />}
        </Cartao>
        <Cartao titulo="Por fonte de recursos" className="h-[320px] lg:h-auto">
          {() => <BarrasComparativas campo="Classificação da fonte" rotulo="Fonte" limite={8} anoUnico={anoUnico} />}
        </Cartao>
        <Cartao titulo="Municípios por região" className="h-[320px] md:col-span-2 lg:h-auto xl:col-span-1">
          {(slot) => <TabelaCartao colunas={colunasMunicipios} slotExportar={slot} nomeArquivo="municipios-por-regiao" linhasIniciais={50} selecionarLinha />}
        </Cartao>
      </div>
    </div>
  );
};
