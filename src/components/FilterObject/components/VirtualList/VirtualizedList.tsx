import { useVirtualizer } from "@tanstack/react-virtual";
import type { FilterObjectOption, FilterObjectOptionValue } from "../../@types/types";
import { useEffect, useId, useRef, useState } from "react";
import { Check, Search } from "lucide-react";
import { cn } from "@/shared/utils/tailwind/cn";
import Typography from "@/components/Typography/Typography";

type VirtualizedListProps = {
  options: FilterObjectOption[];
  handleSearch: (searchString: string) => void;
  handleAcceptSearch: () => void;
  toggleOption: (option: FilterObjectOptionValue) => void;
  isFetching: boolean;
  isLoadingMore?: boolean;
  error?: string | null;
  hasMoreData: boolean | null;
  handleGetNextPage?: () => void;
  resetKey?: number;
};

export const VirtualizedList: React.FC<VirtualizedListProps> = ({
  options,
  handleSearch,
  handleAcceptSearch,
  toggleOption,
  isFetching,
  isLoadingMore,
  error,
  hasMoreData,
  handleGetNextPage,
  resetKey,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const idLista = useId();
  // Opção "ativa" pelo teclado (setas); o foco real fica no campo de busca
  const [ativo, setAtivo] = useState<number | null>(null);
  // Só a primeira carga esconde o popover (ver index.css); uma busca sem resultado depois não pode apagá-lo
  const [carregou, setCarregou] = useState(false);
  if (!carregou && (options.length > 0 || error || (!isFetching && !hasMoreData))) setCarregou(true);
  const virtualizer = useVirtualizer({
    count: options.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 5,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const lastIndex = virtualItems[virtualItems.length - 1]?.index;

  // Carrega mais itens quando o último item (incluindo overscan) entra na janela virtual
  useEffect(() => {
    if (lastIndex === undefined || lastIndex < options.length - 1) return;
    if (hasMoreData && !isFetching && handleGetNextPage) {
      handleGetNextPage();
    }
  }, [lastIndex, options.length, hasMoreData, isFetching, handleGetNextPage]);

  // Reset scroll when resetKey changes
  useEffect(() => {
    if (parentRef.current) {
      parentRef.current.scrollTo({ top: 0 });
    }
  }, [resetKey, parentRef]);

  const moverAtivo = (delta: number) => {
    if (options.length === 0) return;
    const proximo =
      ativo === null
        ? delta > 0 ? 0 : options.length - 1
        : Math.min(options.length - 1, Math.max(0, ativo + delta));
    setAtivo(proximo);
    virtualizer.scrollToIndex(proximo);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moverAtivo(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moverAtivo(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (ativo !== null && options[ativo]) toggleOption(options[ativo].value);
      else handleAcceptSearch();
    }
  };

  return (
    <div
      className="flex flex-col w-full text-foreground"
      data-carregando={carregou ? undefined : true}
      onKeyDown={handleKeyDown}
    >
      {/* Foco na faixa inteira (linha inferior engrossa na cor de foco e a lupa acompanha), em vez de anel solto no input */}
      <div className="group flex items-center border-b border-border px-3 transicao-feedback focus-within:border-ring focus-within:shadow-[inset_0_-1px_0_var(--color-ring)]">
        <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground transicao-feedback group-focus-within:text-ring" />
        <input
          autoFocus
          placeholder="Buscar..."
          aria-label="Filtrar valores"
          role="combobox"
          aria-expanded
          aria-autocomplete="list"
          aria-controls={idLista}
          aria-activedescendant={ativo !== null ? `${idLista}-${ativo}` : undefined}
          onChange={(e) => {
            setAtivo(null);
            handleSearch(e.target.value);
          }}
          className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
      {/* Todos excluídos pelos outros filtros: sem este aviso a lista inteira esmaecida parecia defeito */}
      {carregou && options.length > 0 && options.every((opcao) => opcao.excluded) && (
        <p role="status" className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
          Nenhum valor possível com os filtros atuais
        </p>
      )}
      </div>

      <div
        ref={parentRef}
        id={idLista}
        role="listbox"
        aria-multiselectable
        aria-label="Valores"
        // Teto de 300px, mas nunca mais que o espaço que o popover tem (zoom 200% / tela baixa): busca e rodapé ocupam ~6,5rem
        className="max-h-[min(300px,calc(var(--radix-popover-content-available-height)-6.5rem))] overflow-y-auto overflow-x-hidden p-1"
      >
        {!carregou ? (
          // Primeira carga: a lista ainda não existe, mas o popover já abriu e precisa mostrar que está esperando o engine
          <div role="status" aria-label="Carregando valores" className="flex h-[120px] items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        ) : options.length === 0 && !isFetching && !error ? (
          <div role="status" className="py-6 text-center text-sm text-muted-foreground">
            Sem correspondências
          </div>
        ) : (
          <div
            style={{
              height: `${totalSize}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualItems.map((virtualOption) => {
              const option = options[virtualOption.index];
              if (!option) return null;

              const isSelected = option.selected;
              const isExcluded = option.excluded;
              const isAtivo = ativo === virtualOption.index;

              return (
                <div
                  key={option.value.qElemNumber}
                  id={`${idLista}-${virtualOption.index}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={isExcluded || undefined}
                  title={isExcluded ? "Excluído pelos outros filtros" : option.label}
                  onClick={() => toggleOption(option.value)}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualOption.size}px`,
                    transform: `translateY(${virtualOption.start}px)`,
                  }}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center gap-2.5 rounded-sm px-2 text-sm outline-none transicao-feedback",
                    "hover:bg-accent hover:text-accent-foreground",
                    isExcluded && "opacity-50",
                    isAtivo && "ring-ring/70 ring-2 ring-inset",
                  )}
                >
                  {/* Caixa de seleção visual; o estado acessível vem de aria-selected na opção */}
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-4 shrink-0 place-content-center rounded-[4px] border transicao-feedback",
                      isSelected
                        ? "border-custom-table-label bg-custom-table-label text-primary-foreground"
                        : "border-input bg-background",
                    )}
                  >
                    {isSelected && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <Typography
                    variant="text-sm"
                    className={cn("min-w-0 flex-1 truncate", isSelected && "font-medium")}
                  >
                    {option.label}
                  </Typography>
                </div>
              );
            })}
          </div>
        )}
        {(isLoadingMore || (hasMoreData && isFetching)) && (
           <div className="py-2 flex justify-center items-center">
             <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
           </div>
        )}
        {error && (
          <div role="status" className="py-2 text-center text-xs text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
