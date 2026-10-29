import { useState } from "react";
import { useGenericKPI, useText, type KPIParams } from "@cluster-data-experience/qlik-modules";
import Card from "@/components/Card/components/Root/Root";
import { Cartao } from "@/components/CartaoPainel/CartaoPainel";
import { ColunasAdjunta } from "@/components/ColunasAdjunta/ColunasAdjunta";
import { BarrasComparativas } from "@/components/GraficosOrcamento/GraficosOrcamento";
import { MaisIndicadores } from "@/components/MaisIndicadores/MaisIndicadores";
import { MapaRegioes, medidasMapa, type MedidaMapa } from "@/components/MapaRegioes/MapaRegioes";
import { ReguaExecucao } from "@/components/ReguaExecucao/ReguaExecucao";
import { Skeleton } from "@/components/shadcn/skeleton";
import Tabs from "@/components/Tabs/Tabs";
import {
  anoEmContexto,
  anosSelecionados,
  autorizado,
  disponivel,
  empenhado,
  empenhadoAnoAnteriorAteHoje,
  inicial,
  liquidado,
  pagoAnoAnteriorAteHoje,
  pagoNoExercicio,
} from "@/shared/qlik/medidas";
import { moedaCompacta, moedaCompleta } from "@/shared/utils/formatarMoeda";

// Ordem fixa: os índices abaixo leem o resultado
const kpis: KPIParams[] = [
  { label: "Autorizado", expression: autorizado },
  { label: "Inicial", expression: inicial },
  { label: "Empenhado", expression: empenhado },
  { label: "Liquidado", expression: liquidado },
  { label: "Pago no exercício", expression: pagoNoExercicio },
  { label: "Disponível", expression: disponivel },
  { label: "Empenhado no ano anterior até hoje", expression: empenhadoAnoAnteriorAteHoje },
  { label: "Pago no ano anterior até hoje", expression: pagoAnoAnteriorAteHoje },
];

const valor = (celula?: { qNum?: number | string | null }) =>
  celula && typeof celula.qNum === "number" && Number.isFinite(celula.qNum) ? celula.qNum : null;

const hoje = new Date();
// "9/out"
const diaMes = `${hoje.getDate()}/${hoje.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}`;

const abasDetalhe = [
  { label: "Grupo de despesa", value: "grupo" },
  { label: "Fonte", value: "fonte" },
];

export const VisaoGeral = () => {
  const { data, error } = useGenericKPI(kpis);
  const { text: ano } = useText(anoEmContexto);
  const { text: quantidadeAnos } = useText(anosSelecionados);
  const anoUnico = quantidadeAnos === "1";
  const [medidaMapa, setMedidaMapa] = useState<MedidaMapa>("empenhado");
  const [detalhe, setDetalhe] = useState("grupo");

  const n = (indice: number) => valor(data?.[indice]);
  const carregando = !data && !error;
  // Comparação com o ano anterior só faz sentido com um ano em contexto
  const anoAnterior = Number(ano) - 1;
  const periodo = anoUnico ? `até ${diaMes} ante ${anoAnterior}` : undefined;
  const detalhePeriodo = anoUnico ? `acumulado até ${diaMes} de ${anoAnterior}` : undefined;

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto">
      {/* Régua do Estado: o ano inteiro numa linha de leitura */}
      <Card className="shrink-0 gap-3 px-4 py-3">
        <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-8">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xs text-muted-foreground">Autorizado para {ano || "…"}</span>
            {carregando ? (
              <Skeleton className="h-9 w-44" />
            ) : (
              <span className="text-[28px] font-semibold leading-9 text-foreground" title={moedaCompleta(n(0))}>
                {moedaCompacta(n(0))}
              </span>
            )}
            <span className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              <span title={moedaCompleta(n(1))}>
                Inicial <strong className="font-medium text-foreground">{carregando ? "…" : moedaCompacta(n(1))}</strong>
              </span>
              <span title={moedaCompleta(n(5))}>
                Disponível <strong className="font-medium text-foreground">{carregando ? "…" : moedaCompacta(n(5))}</strong>
              </span>
            </span>
          </div>
          <div className="flex min-w-0 flex-col justify-center">
            {carregando ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <ReguaExecucao
                autorizado={n(0)}
                inicial={n(1)}
                periodoComparacao={periodo}
                detalheComparacao={detalhePeriodo}
                linhas={[
                  { rotulo: "Empenhado", valor: n(2), anterior: anoUnico ? n(6) : undefined },
                  { rotulo: "Liquidado", valor: n(3) },
                  { rotulo: "Pago", valor: anoUnico ? n(4) : null, anterior: anoUnico ? n(7) : undefined },
                ]}
              />
            )}
            {!anoUnico && !carregando && (
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Selecione um único ano para ver o pago no exercício e a comparação com o ano anterior.</p>
            )}
          </div>
        </div>
        <MaisIndicadores />
      </Card>

      <div className="grid shrink-0 gap-2 2xl:min-h-0 2xl:flex-1 2xl:grid-cols-12">
        <Cartao titulo="Execução por adjunta" className="h-auto min-h-[520px] shrink-0 2xl:col-span-7 2xl:min-h-0 2xl:shrink">
          {() => <ColunasAdjunta anoUnico={anoUnico} />}
        </Cartao>

        <Cartao
          titulo="Onde e em quê"
          className="h-auto min-h-[640px] shrink-0 2xl:col-span-5 2xl:min-h-0 2xl:shrink"
          acoes={<Tabs tabs={medidasMapa} activeTab={medidaMapa} onTabChange={(aba) => setMedidaMapa(aba as MedidaMapa)} className="w-auto shrink-0" />}
        >
          {() => (
            <div className="flex h-full min-h-0 flex-col gap-2 lg:flex-row 2xl:flex-col">
              <div className="h-[300px] shrink-0 lg:h-auto lg:min-h-[320px] lg:flex-1 2xl:min-h-[220px] 2xl:flex-[3]">
                <MapaRegioes medida={medidaMapa} anoUnico={anoUnico} />
              </div>
              <div className="flex min-h-[240px] flex-col gap-2 border-t border-border pt-2 lg:flex-1 lg:border-t-0 lg:border-l lg:pl-2 lg:pt-0 2xl:min-h-0 2xl:flex-[2] 2xl:border-t 2xl:border-l-0 2xl:pl-0 2xl:pt-2">
                <Tabs tabs={abasDetalhe} activeTab={detalhe} onTabChange={setDetalhe} className="w-auto self-start" />
                <div className="min-h-0 flex-1">
                  {detalhe === "grupo" ? (
                    <BarrasComparativas key="grupo" campo="Grupo da despesa" rotulo="Grupo de despesa" limite={6} anoUnico={anoUnico} />
                  ) : (
                    <BarrasComparativas key="fonte" campo="Classificação da fonte" rotulo="Fonte" limite={6} anoUnico={anoUnico} />
                  )}
                </div>
              </div>
            </div>
          )}
        </Cartao>
      </div>
    </div>
  );
};
