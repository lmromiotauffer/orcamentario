import { useState, type ReactNode } from "react";
import { useTable } from "@cluster-data-experience/qlik-modules";
import Card from "@/components/Card/components/Root/Root";
import Header from "@/components/Card/components/Header/Header";
import { CustomTable } from "@/shared/components/CustomTable/CustomTable";
import { cn } from "@/shared/utils/tailwind/cn";
import { semTotais, type ColunaTabela } from "./colunas";

type CartaoProps = {
  titulo: ReactNode;
  className?: string;
  // Controles do cabeçalho (abas, filtros locais), antes do botão de exportar
  acoes?: ReactNode;
  children: (slotExportar: HTMLElement | null) => ReactNode;
};

// Abaixo de lg o cartão tem altura fixa e a página rola; a partir daí ele divide a altura da janela com os vizinhos
export const Cartao = ({ titulo, className, acoes, children }: CartaoProps) => {
  // Estado com callback ref: a tabela só cria o portal depois que o slot existe
  const [slotExportar, setSlotExportar] = useState<HTMLElement | null>(null);
  return (
    <Card className={cn("h-[420px] gap-0 p-0 lg:h-auto lg:min-h-0", className)}>
      <Header title={titulo} className="flex-none gap-2 lg:flex-row lg:items-center">
        {acoes}
        {/* Abaixo de lg o cabeçalho empilha: o botão de exportar fica à direita, onde está no desktop */}
        <div ref={setSlotExportar} className="flex shrink-0 justify-end empty:hidden" />
      </Header>
      <div className="min-h-0 flex-1 p-2">{children(slotExportar)}</div>
    </Card>
  );
};

export const TabelaCartao = ({
  colunas,
  slotExportar,
  nomeArquivo,
  linhasIniciais = 25,
  selecionarLinha,
  filtroNoCabecalho,
  hipercubo,
  preencherAltura,
  className,
  totais = semTotais,
  detalhe,
  mensagemVazia,
}: {
  colunas: ColunaTabela[];
  slotExportar: HTMLElement | null;
  nomeArquivo: string;
  linhasIniciais?: number;
  selecionarLinha?: boolean;
  filtroNoCabecalho?: boolean;
  hipercubo?: Partial<EngineAPI.IHyperCubeDef>;
  preencherAltura?: boolean;
  className?: string;
  // Linha de totais do engine (ex.: tabela do orçamento); por padrão, sem totais
  totais?: { show: boolean; position: "top" | "bottom" | "noTotals"; label?: string };
  // Conteúdo abaixo da tabela decidido pelo layout dela (ex.: a ficha do fornecedor selecionado). Lê o mesmo layout
  // que desenha as linhas, no mesmo render: pelo provider de seleções a tabela chegava antes e ficava sozinha,
  // com a linha selecionada esticada no cartão inteiro, até a seleção chegar e a ficha abrir
  detalhe?: (layout: ReturnType<typeof useTable>["layout"]) => ReactNode;
  // Mensagem da tabela vazia decidida pelo layout (ex.: fornecedor selecionado fora do Top 10)
  mensagemVazia?: (layout: ReturnType<typeof useTable>["layout"]) => ReactNode;
}) => {
  const [linhasPorPagina, setLinhasPorPagina] = useState(linhasIniciais);
  // pageHeight fixo: ele entra no id do objeto no engine, e mudar criaria um segundo objeto (sem a ordenação escolhida)
  // alimentando a mesma tabela. A troca de tamanho de página é feita pelo CustomTable no objeto vivo
  const tabela = useTable({ columns: colunas, pageHeight: linhasIniciais, totals: totais });
  const conteudoDetalhe = detalhe?.(tabela.layout);
  // Uma linha só (seleção confirmando, ficha ainda fechada) não estica até o fim do cartão
  const umaLinha = (tabela.data?.rows?.length ?? 0) === 1;
  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {/* Com detalhe aberto a tabela encolhe às linhas que tem e o detalhe toma o resto */}
      <div className={cn("min-h-0", conteudoDetalhe || umaLinha ? "shrink-0" : "flex-1")}>
        <CustomTable
          table={tabela}
          rowsPerPage={linhasPorPagina}
          onRowsPerPageChange={setLinhasPorPagina}
          columnsConfig={colunas}
          slotExportar={slotExportar}
          nomeArquivo={nomeArquivo}
          selecionarLinha={selecionarLinha}
          filtroNoCabecalho={filtroNoCabecalho}
          hipercubo={hipercubo}
          preencherAltura={preencherAltura}
          mensagemVazia={mensagemVazia?.(tabela.layout)}
          className={className}
        />
      </div>
      {conteudoDetalhe}
    </div>
  );
};
