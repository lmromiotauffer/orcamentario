import { Skeleton } from "@/components/shadcn/skeleton";

export const EstadoGrafico = ({ carregando }: { carregando: boolean }) =>
  carregando ? (
    <Skeleton className="h-full w-full rounded-lg bg-muted" />
  ) : (
    <p className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem dados para os filtros atuais.</p>
  );
