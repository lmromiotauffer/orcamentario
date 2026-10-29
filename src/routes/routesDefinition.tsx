import type { ReactElement } from "react";
import { Banknote, LayoutDashboard, Map, ReceiptText, Table2 } from "lucide-react";
import { Empenhos } from "@/pages/Empenhos/Empenhos";
import { Pagamentos } from "@/pages/Pagamentos/Pagamentos";
import { RegioesFontes } from "@/pages/RegioesFontes/RegioesFontes";
import { TabelaOrcamento } from "@/pages/TabelaOrcamento/TabelaOrcamento";
import { VisaoGeral } from "@/pages/VisaoGeral/VisaoGeral";

export interface RouteDefinition {
  label: string;
  href: string;
  element: ReactElement;
  // Título do cabeçalho da página, quando difere do rótulo do menu
  titulo?: string;
  icon?: ReactElement;
  description?: string;
}

export const routesDefinition: RouteDefinition[] = [
  {
    label: "Visão geral",
    href: "/visao-geral",
    titulo: "Orçamento da SINFRA",
    description: "Quanto foi autorizado, quanto já foi empenhado, liquidado e pago, e como cada adjunta executa.",
    element: <VisaoGeral />,
    icon: <LayoutDashboard size={16} />,
  },
  {
    label: "Regiões e fontes",
    href: "/regioes-e-fontes",
    description: "Para onde o dinheiro vai no mapa de Mato Grosso, por grupo de despesa e por fonte de recursos.",
    element: <RegioesFontes />,
    icon: <Map size={16} />,
  },
  {
    label: "Empenhos",
    href: "/empenhos",
    description: "Compromissos assumidos: valor empenhado por mês, por credor e por adjunta, com a lista completa.",
    element: <Empenhos />,
    icon: <ReceiptText size={16} />,
  },
  {
    label: "Pagamentos",
    href: "/pagamentos",
    description: "Valores pagos por mês, credor e fonte, inclusive restos a pagar de anos anteriores, com a lista completa.",
    element: <Pagamentos />,
    icon: <Banknote size={16} />,
  },
  {
    label: "Tabela do orçamento",
    href: "/tabela-do-orcamento",
    description: "A grade completa por ano, adjunta, ação, região, grupo, modalidade e fonte, com todas as colunas de valor.",
    element: <TabelaOrcamento />,
    icon: <Table2 size={16} />,
  },
];
