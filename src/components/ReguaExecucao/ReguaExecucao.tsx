import { cn } from "@/shared/utils/tailwind/cn";
import { moedaCompacta, moedaCompleta, percentualDe, variacao, variacaoTexto } from "@/shared/utils/formatarMoeda";

export type LinhaRegua = {
  rotulo: string;
  valor: number | null;
  // Acumulado do ano anterior até a mesma data: vira "+12 % até 9/out ante 2025"
  anterior?: number | null;
};

type ReguaExecucaoProps = {
  autorizado: number | null;
  inicial?: number | null;
  linhas: LinhaRegua[];
  // Rótulo da comparação ("até 9/out ante 2025") e o detalhe para o title ("acumulado até 9/out de 2025")
  periodoComparacao?: string;
  detalheComparacao?: string;
  // Miniatura nas colunas de adjunta: só a fração, sem valores por extenso
  compacta?: boolean;
  // Linha única para tabelas: as três barras sobrepostas numa só trilha (a mais escura, Pago, por cima) e o % do Empenhado
  linhaUnica?: boolean;
  className?: string;
};

// As três linhas usam os três passos do azul, do claro ao escuro: o dinheiro "aprofunda" de empenhado a pago
const corLinha = ["bg-regua-1", "bg-regua-2", "bg-regua-3"];

// Coluna de valores com largura fixa: as três trilhas e a marca do Inicial dividem uma única escala.
// Abaixo de sm a trilha ocupa a linha inteira, o que também dá a mesma escala às três
const colunasCheias = "grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 sm:grid-cols-[6.5rem_minmax(0,1fr)_19rem] sm:gap-y-0";

/**
 * Régua de execução: três linhas (Empenhado, Liquidado, Pago) sobre a trilha do Autorizado, na mesma escala,
 * com a marca vertical do Inicial atravessando as três. A assinatura do painel; aparece em tamanho cheio no
 * Estado e em miniatura em cada adjunta e nas tabelas.
 */
export const ReguaExecucao = ({ autorizado, inicial, linhas, periodoComparacao, detalheComparacao, compacta, linhaUnica, className }: ReguaExecucaoProps) => {
  // Escala = maior dos valores: com um filtro o Autorizado pode ficar abaixo do Inicial ou do Empenhado
  const escala = Math.max(autorizado ?? 0, inicial ?? 0, ...linhas.map(({ valor }) => valor ?? 0));
  const largura = (valor: number | null | undefined) => (escala > 0 && valor && valor > 0 ? `${(valor / escala) * 100}%` : "0%");
  // Fração da escala, animada por scale (a barra tem largura cheia e encolhe a partir da esquerda)
  const fracao = (valor: number | null | undefined) => (escala > 0 && valor && valor > 0 ? valor / escala : 0);
  const marcaInicial = escala > 0 && inicial && inicial > 0 ? `${(inicial / escala) * 100}%` : null;

  if (linhaUnica) {
    const titulo = linhas.map(({ rotulo, valor }) => `${rotulo} ${percentualDe(valor, autorizado)}`).join(" · ");
    return (
      <span className={cn("grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-x-2", className)} role="group" aria-label={`Régua de execução: ${titulo}`} title={titulo}>
        <span className="relative block h-2 w-full overflow-hidden rounded-full bg-regua-fraco" aria-hidden>
          <span className="absolute inset-y-0 left-0 rounded-full bg-popover" style={{ left: largura(autorizado) }} />
          {linhas.map(({ rotulo, valor }, indice) => (
            <span key={rotulo} className={cn("regua-barra absolute inset-y-0 left-0 w-full rounded-full", corLinha[indice % corLinha.length])} style={{ scale: `${fracao(valor)} 1` }} />
          ))}
        </span>
        <span className="text-right text-[11px] font-semibold leading-4 tabular-nums text-foreground">{percentualDe(linhas[0]?.valor, autorizado)}</span>
      </span>
    );
  }

  return (
    <div className={cn("flex flex-col", compacta ? "gap-1" : "gap-2", className)} role="group" aria-label="Régua de execução">
      {linhas.map(({ rotulo, valor, anterior }, indice) => {
        const delta = anterior === undefined ? undefined : variacao(valor, anterior);
        return (
          <div key={rotulo} className={cn("grid items-center", compacta ? "grid-cols-[4.5rem_minmax(0,1fr)_3rem] gap-x-2" : colunasCheias)}>
            <span className={cn("truncate text-muted-foreground", compacta ? "text-[11px] leading-4" : "text-xs sm:order-1")}>{rotulo}</span>
            <span className={cn("relative block w-full", compacta ? "h-1.5" : "order-3 col-span-2 h-3 sm:order-2 sm:col-span-1")} aria-hidden>
              {/* Trilha = Autorizado; a barra cresce a partir da esquerda até a fração do valor */}
              <span className="absolute inset-0 overflow-hidden rounded-full bg-regua-fraco">
                <span className="absolute inset-y-0 left-0 rounded-full bg-popover" style={{ left: largura(autorizado) }} />
                <span className={cn("regua-barra absolute inset-y-0 left-0 w-full rounded-full", corLinha[indice % corLinha.length])} style={{ scale: `${fracao(valor)} 1` }} />
              </span>
              {/* Marca do Inicial: mesma posição em cada trilha; o traço passa 4 px da trilha e emenda com o da linha vizinha */}
              {marcaInicial && (
                <span
                  className={cn("absolute w-0.5 -translate-x-1/2 bg-foreground/70", compacta ? "-top-0.5 -bottom-0.5" : "-top-1 -bottom-1")}
                  style={{ left: marcaInicial }}
                />
              )}
            </span>
            <span className={cn("flex min-w-0 flex-wrap items-baseline gap-x-2 tabular-nums", compacta ? "justify-end text-[11px] leading-4" : "order-2 justify-end text-xs sm:order-3 sm:justify-start")}>
              {compacta ? (
                <span className="font-semibold text-foreground">{percentualDe(valor, autorizado)}</span>
              ) : (
                <>
                  <span className="font-semibold text-foreground" title={moedaCompleta(valor)}>
                    {moedaCompacta(valor)}
                  </span>
                  <span className="text-muted-foreground">{percentualDe(valor, autorizado)}</span>
                  {delta !== undefined && (
                    // Só aqui verde e vermelho: à frente ou atrás do ano anterior na mesma data
                    <span
                      className={cn("whitespace-nowrap text-[11px] font-medium", delta === null ? "text-muted-foreground" : delta >= 0 ? "text-n-success" : "text-destructive")}
                      title={anterior === null || anterior === undefined ? undefined : `${moedaCompleta(anterior)} ${detalheComparacao ?? periodoComparacao ?? "no ano anterior"}`}
                    >
                      {delta === null ? "sem comparação" : `${variacaoTexto(delta)} ${periodoComparacao ?? ""}`.trim()}
                    </span>
                  )}
                </>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
};
