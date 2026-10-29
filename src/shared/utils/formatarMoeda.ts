export const formatadorBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// "R$ 5,24 bi", "R$ 536,05 mi", "R$ 43,38 mil": leitura rápida; o valor completo vai no title
const compacto = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const moedaCompacta = (valor: number | null | undefined): string =>
  Number.isFinite(valor) ? compacto.format(valor as number) : "–";

export const moedaCompleta = (valor: number | null | undefined): string =>
  Number.isFinite(valor) ? formatadorBRL.format(valor as number) : "–";

const porcento = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });

// Razão como "78,4 %"; sem denominador, travessão
export const percentualDe = (parte: number | null | undefined, todo: number | null | undefined): string =>
  Number.isFinite(parte) && Number.isFinite(todo) && (todo as number) !== 0 ? porcento.format((parte as number) / (todo as number)) : "–";

// Variação com sinal: "+12,3 %", "−4,1 %"
export const variacao = (atual: number | null | undefined, anterior: number | null | undefined): number | null =>
  Number.isFinite(atual) && Number.isFinite(anterior) && (anterior as number) !== 0
    ? ((atual as number) - (anterior as number)) / Math.abs(anterior as number)
    : null;

export const variacaoTexto = (valor: number | null): string =>
  valor === null ? "–" : `${valor > 0 ? "+" : valor < 0 ? "−" : ""}${porcento.format(Math.abs(valor))}`;
