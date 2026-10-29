import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useGenericKPI, type KPIParams } from "@cluster-data-experience/qlik-modules";
import { Skeleton } from "@/components/shadcn/skeleton";
import { indicadoresTecnicos, moeda, percentual } from "@/shared/qlik/medidas";
import { moedaCompacta } from "@/shared/utils/formatarMoeda";
import { cn } from "@/shared/utils/tailwind/cn";

const kpis: KPIParams[] = indicadoresTecnicos.map(({ rotulo, expressao, percentual: ehPercentual }) => ({
  label: rotulo,
  expression: ehPercentual ? percentual(expressao) : moeda(expressao),
}));

/** Os indicadores técnicos do painel antigo, cada um com a fórmula por extenso; só carregam depois de abertos. */
export const MaisIndicadores = ({ className }: { className?: string }) => {
  const [aberto, setAberto] = useState(false);
  return (
    <details className={cn("group", className)} onToggle={(evento) => setAberto(evento.currentTarget.open)}>
      <summary className="flex cursor-pointer select-none list-none items-center gap-1 rounded text-xs font-medium text-primary transicao-feedback hover:text-primary-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        Mais indicadores
        <ChevronDown className="size-4 transition-[rotate] duration-(--duracao-media) ease-(--ease-suave) group-open:rotate-180" aria-hidden />
      </summary>
      {aberto && <ListaIndicadores />}
    </details>
  );
};

const ListaIndicadores = () => {
  const { data, error } = useGenericKPI(kpis);
  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3 sm:grid-cols-3 xl:grid-cols-6">
      {indicadoresTecnicos.map(({ rotulo, formula, percentual: ehPercentual }, indice) => {
        const celula = data?.[indice];
        return (
          <div key={rotulo} className="min-w-0">
            <dt className="text-[11px] leading-4 text-muted-foreground">{rotulo}</dt>
            <dd className="text-sm font-semibold tabular-nums text-foreground" title={celula?.qText}>
              {data || error ? (ehPercentual ? celula?.qText ?? "–" : moedaCompacta(celula?.qNum)) : <Skeleton className="h-5 w-20" />}
            </dd>
            <dd className="text-[11px] leading-4 text-muted-foreground">{formula}</dd>
          </div>
        );
      })}
    </dl>
  );
};
