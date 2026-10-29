import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useTable, type Column } from "@cluster-data-experience/qlik-modules";
import { medidaDecrescente, semTotais } from "@/components/CartaoPainel/colunas";
import { ReguaExecucao } from "@/components/ReguaExecucao/ReguaExecucao";
import { Skeleton } from "@/components/shadcn/skeleton";
import { movimentoReduzido } from "@/shared/hooks/useMovimentoReduzido";
import { autorizado, comSet, empenhado, inicial, liquidado, pagoNoExercicio, semAdjunta } from "@/shared/qlik/medidas";
import { celulasOrdemEngine } from "@/shared/utils/celulasOrdemEngine";
import { moedaCompacta, moedaCompleta, percentualDe } from "@/shared/utils/formatarMoeda";
import { cn } from "@/shared/utils/tailwind/cn";
import { numero } from "@/components/GraficosOrcamento/base";

// As medidas ignoram a seleção de adjunta: com uma selecionada, as outras quatro continuam com seus valores
const colunas: Column[] = [
  { type: "dimension", qFieldDefs: ["Descrição da adjunta"], qFieldLabels: ["Adjunta"], qNullSuppression: true },
  { type: "dimension", qFieldDefs: ["Sigla da adjunta"], qFieldLabels: ["Sigla"] },
  { type: "measure", qDef: comSet(autorizado, semAdjunta), qLabel: "Autorizado", qSortBy: { qSortByNumeric: medidaDecrescente }, sortingPriority: 0 },
  { type: "measure", qDef: comSet(empenhado, semAdjunta), qLabel: "Empenhado" },
  { type: "measure", qDef: comSet(liquidado, semAdjunta), qLabel: "Liquidado" },
  { type: "measure", qDef: comSet(pagoNoExercicio, semAdjunta), qLabel: "Pago" },
  { type: "measure", qDef: comSet(inicial, semAdjunta), qLabel: "Inicial" },
];

// Cinco maiores ações de cada adjunta, pelo empenhado
const colunasAcoes: Column[] = [
  { type: "dimension", qFieldDefs: ["Sigla da adjunta"], qFieldLabels: ["Sigla"], qNullSuppression: true, sortingPriority: 1 },
  { type: "dimension", qFieldDefs: ["Nome da ação"], qFieldLabels: ["Ação"], qNullSuppression: true, sortingPriority: 2 },
  { type: "measure", qDef: comSet(empenhado, semAdjunta), qLabel: "Empenhado", qSortBy: { qSortByNumeric: medidaDecrescente }, sortingPriority: 0 },
];

type Adjunta = {
  descricao: string;
  sigla: string;
  estado: string;
  autorizado: number | null;
  empenhado: number | null;
  liquidado: number | null;
  pago: number | null;
  inicial: number | null;
  indice: number;
};

type Acao = { nome: string; valor: number | null };

type ColunasAdjuntaProps = {
  // Com mais de um ano em contexto, "Pago no exercício" não tem resposta
  anoUnico: boolean;
};

/**
 * Cinco colunas, uma por adjunta, na mesma régua do Estado. Ordenadas por % executado e reordenando no lugar;
 * clicar numa coluna seleciona a adjunta no Qlik (as outras esmaecem, mas continuam visíveis).
 */
export const ColunasAdjunta = ({ anoUnico }: ColunasAdjuntaProps) => {
  const tabela = useTable({ columns: colunas, pageHeight: 10, totals: semTotais });
  const acoes = useTable({ columns: colunasAcoes, pageHeight: 500, totals: semTotais });
  const { object, properties, updateProperties } = tabela;

  // A lib não repassa qShowAll: com uma adjunta selecionada as outras sairiam do cubo.
  // Uma vez por objeto: a lib não devolve a propriedade aplicada e um efeito por "properties" repetia sem fim
  const objetoAjustado = useRef<unknown>(null);
  useEffect(() => {
    if (!object || !properties?.qHyperCubeDef || objetoAjustado.current === object) return;
    objetoAjustado.current = object;
    const qHyperCubeDef = properties.qHyperCubeDef;
    updateProperties({
      ...properties,
      qHyperCubeDef: { ...qHyperCubeDef, qDimensions: qHyperCubeDef.qDimensions.map((dimensao) => ({ ...dimensao, qShowAll: true })) },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [object]);

  const adjuntas = useMemo<Adjunta[]>(
    () =>
      (tabela.data?.rows ?? [])
        .map((linha, indice) => {
          const [descricao, sigla, aut, emp, liq, pago, ini] = celulasOrdemEngine(linha.cells, tabela.layout?.qHyperCube);
          const siglaTexto = sigla?.qText ?? "";
          return {
            // "SAOR - Obras rodoviárias" → "Obras rodoviárias": a sigla já vai na linha de baixo
            descricao: (descricao?.qText ?? "").replace(new RegExp(`^${siglaTexto} *[-–] *`), ""),
            sigla: siglaTexto,
            estado: descricao?.qState ?? "O",
            autorizado: numero(aut),
            empenhado: numero(emp),
            liquidado: numero(liq),
            pago: numero(pago),
            inicial: numero(ini),
            indice,
          };
        })
        .filter(({ descricao }) => descricao && descricao !== "-")
        // Por % executado (empenhado ÷ autorizado), da maior para a menor
        .sort((a, b) => razao(b) - razao(a)),
    [tabela.data, tabela.layout],
  );

  const acoesPorSigla = useMemo(() => {
    const mapa = new Map<string, Acao[]>();
    for (const linha of acoes.data?.rows ?? []) {
      const [sigla, nome, valor] = celulasOrdemEngine(linha.cells, acoes.layout?.qHyperCube);
      const chave = sigla?.qText ?? "";
      const lista = mapa.get(chave) ?? [];
      if (lista.length < 5) lista.push({ nome: nome?.qText ?? "", valor: numero(valor) });
      mapa.set(chave, lista);
    }
    return mapa;
  }, [acoes.data, acoes.layout]);

  // Reordenação no lugar: a lista desenhada só troca de ordem dentro de uma view transition
  const [desenhadas, setDesenhadas] = useState<Adjunta[]>([]);
  useEffect(() => {
    const mesmaOrdem = desenhadas.length === adjuntas.length && desenhadas.every((a, i) => a.sigla === adjuntas[i].sigla);
    if (mesmaOrdem || desenhadas.length === 0 || !document.startViewTransition || movimentoReduzido()) {
      setDesenhadas(adjuntas);
      return;
    }
    document.startViewTransition(() => flushSync(() => setDesenhadas(adjuntas)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjuntas]);

  const algumaSelecionada = desenhadas.some(({ estado }) => estado === "S");

  if (!tabela.data) {
    return (
      <div className="grid h-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-full min-h-48 rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (desenhadas.length === 0) {
    return <p className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem dados para os filtros atuais.</p>;
  }

  return (
    <ul className="grid h-full grid-cols-1 divide-y divide-border sm:grid-cols-2 lg:grid-cols-5 lg:divide-x lg:divide-y-0" aria-label="Execução por adjunta">
      {desenhadas.map((adjunta) => {
        const selecionada = adjunta.estado === "S";
        const esmaecida = algumaSelecionada && !selecionada;
        return (
          <li key={adjunta.sigla} className="min-w-0 py-1 first:pt-0 last:pb-0 lg:px-1 lg:py-0 lg:first:pl-0 lg:last:pr-0" style={{ viewTransitionName: `adjunta-${adjunta.sigla.replace(/\W/g, "")}` }}>
            <button
              type="button"
              onClick={() => tabela.selectCell(adjunta.indice, 0)}
              aria-pressed={selecionada}
              title={selecionada ? "Limpar a seleção da adjunta" : `Filtrar o painel por ${adjunta.descricao}`}
              className={cn(
                "flex h-full w-full cursor-pointer flex-col gap-3 rounded-lg border border-transparent p-3 text-left transicao-feedback focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                selecionada ? "border-primary bg-accent" : "hover:bg-accent/60",
                esmaecida && "opacity-55 hover:opacity-100",
              )}
            >
              <span className="flex min-w-0 flex-col">
                <span className="line-clamp-2 text-xs font-semibold leading-4 text-foreground" title={adjunta.descricao}>
                  {adjunta.descricao}
                </span>
                <span className="text-[11px] leading-4 text-muted-foreground">{adjunta.sigla}</span>
              </span>

              <span className="flex flex-col gap-1">
                <span className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold leading-none text-foreground">{percentualDe(adjunta.empenhado, adjunta.autorizado)}</span>
                  <span className="text-[11px] leading-4 text-muted-foreground">executado</span>
                </span>
                <span className="text-[11px] leading-4 text-muted-foreground" title={moedaCompleta(adjunta.autorizado)}>
                  de <strong className="font-semibold tabular-nums text-foreground">{moedaCompacta(adjunta.autorizado)}</strong> autorizados
                </span>
              </span>

              <ReguaExecucao
                compacta
                autorizado={adjunta.autorizado}
                linhas={[
                  { rotulo: "Empenhado", valor: adjunta.empenhado },
                  { rotulo: "Liquidado", valor: adjunta.liquidado },
                  { rotulo: "Pago", valor: anoUnico ? adjunta.pago : null },
                ]}
              />

              <span className="flex flex-col gap-1 border-t border-border pt-2">
                <span className="text-[11px] leading-4 text-muted-foreground">Maiores ações</span>
                {(acoesPorSigla.get(adjunta.sigla) ?? []).map(({ nome, valor }) => (
                  <span key={nome} className="flex flex-wrap justify-between gap-x-2 text-[11px] leading-4">
                    <span className="line-clamp-2 min-w-0 text-foreground" title={nome}>
                      {nome}
                    </span>
                    <span className="ml-auto whitespace-nowrap tabular-nums text-muted-foreground" title={moedaCompleta(valor)}>
                      {moedaCompacta(valor)}
                    </span>
                  </span>
                ))}
                {!acoes.data && <Skeleton className="h-4 w-full" />}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

const razao = ({ empenhado, autorizado }: Adjunta) => (autorizado && empenhado !== null ? empenhado / autorizado : -1);
