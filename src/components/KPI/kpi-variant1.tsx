import { ReactNode } from "react";
import { cn } from "@/shared/utils/tailwind/cn";
import Typography from "../Typography/Typography";
import EllipseBoxesIcon from "./assets/ellipse-boxes.svg?react";
import EllipseCoinsIcon from "./assets/ellipse-coins.svg?react";
import EllipseLayersIcon from "./assets/ellipse-layers.svg?react";
import EllipseBlocksIcon from "./assets/ellipse-blocks.svg?react";

// Mapeamento dos ícones por nome
const iconMap = {
  "ellipse-boxes": EllipseBoxesIcon,
  "ellipse-coins": EllipseCoinsIcon,
  "ellipse-layers": EllipseLayersIcon,
  "ellipse-blocks": EllipseBlocksIcon,
} as const;

type IconName = keyof typeof iconMap;

interface KPIVariant1Props {
  icon?: IconName;
  title: string;
  value: string | ReactNode;
  className?: string;
}

export const Variant1 = ({
  icon,
  title,
  value,
  className,
}: KPIVariant1Props) => {
  // Default to ellipse-boxes if icon is not provided or empty
  const iconName = (icon && icon.trim()) ? icon : "ellipse-boxes";
  // O nome vem do JSON de configuração, que pode trazer um ícone inexistente
  const IconComponent = iconMap[iconName];
  if (!IconComponent) console.warn(`Ícone "${iconName}" não encontrado`);

  return (
    <div className={cn("flex w-full gap-4 min-w-0", className)}>
      {IconComponent && (
        <IconComponent
          width={40}
          height={40}
          // shrink-0: um valor longo (nota com leitura) não pode espremer o ícone
          className="shrink-0 text-foreground"
          style={
            {
              "--kpi-border": "var(--color-secondary)",
              "--kpi-icon": "var(--color-popover-foreground)",
            } as React.CSSProperties
          }
        />
      )}
      <div className="flex min-w-0 flex-col justify-center gap-2">
        {/* Sem nowrap: "BDP médio de set 2026" quebra em duas linhas no cartão estreito em vez de ser cortado */}
        <Typography variant="text-2xs" className="text-muted-foreground">{title}</Typography>
        <Typography variant="text-base" className="text-popover-foreground tabular-nums">{value}</Typography>
      </div>
    </div>
  );
};
