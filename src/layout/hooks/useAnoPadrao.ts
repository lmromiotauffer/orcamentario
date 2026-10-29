import { useEffect, useRef } from "react";
import { useQlikApp } from "@cluster-data-experience/qlik-modules";

/**
 * O app original abre com o ano corrente selecionado (botão "Reiniciar filtros" aplica um bookmark).
 * Sem essa seleção, "Pago no exercício" ($(=[Ano])) e os títulos do ano não têm resposta.
 * Roda uma vez, quando o app chega; se o visitante limpar o ano depois, o painel avisa em vez de reaplicar.
 */
export const useAnoPadrao = () => {
  const { app } = useQlikApp();
  const aplicado = useRef(false);

  useEffect(() => {
    if (!app || aplicado.current) return;
    aplicado.current = true;
    (async () => {
      try {
        if ((await app.evaluate("GetSelectedCount(Ano)")) !== "0") return;
        // O ano corrente; há anos futuros (planejamento) e, em janeiro, o corrente pode ainda não ter dados
        const ano = Number(await app.evaluate("If(Year(Today()) <= Max({1} Ano), Year(Today()), Max({1} Ano))"));
        if (!Number.isFinite(ano)) return;
        const campo = await app.getField("Ano");
        await campo.selectValues([{ qText: String(ano), qIsNumeric: true, qNumber: ano }], false, true);
      } catch (erro) {
        console.error("Não foi possível selecionar o ano padrão", erro);
      }
    })();
  }, [app]);
};
