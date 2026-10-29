import { useQlikApp } from "@cluster-data-experience/qlik-modules";
import { useEffect, useState } from "react";

export interface SimplifiedSearchResultItem {
  text: string;
  field: string;
}

const useQlikSearch = () => {
  const { app } = useQlikApp();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [results, setResults] = useState<SimplifiedSearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Seleciona o valor no campo; devolve false quando falhou (a mensagem fica em `error`) */
  const applySelection = async (item: SimplifiedSearchResultItem): Promise<boolean> => {
    if (!app) return false;

    const { field, text: value } = item;

    if (!field || !value) {
      console.error(
        "Erro ao aplicar seleção: Campo ou valor não encontrado no item.",
        item,
      );
      return false;
    }

    try {
      const qField = await app.getField(field);
      await qField.selectValues([{ qText: value }], false, false);
      setSearch("");
      return true;
    } catch (e) {
      console.error("Erro ao aplicar seleção no Qlik:", e);
      setError("Não foi possível aplicar o filtro. Tente de novo.");
      return false;
    }
  };

  useEffect(() => {
    if (search) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
      setResults([]);
    }

    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  useEffect(() => {
    const qOptions: EngineAPI.ISearchCombinationOptions = {
      qContext: "CurrentSelections",
      qCharEncoding: "Utf16",
    } as EngineAPI.ISearchCombinationOptions;

    const qTerms = debouncedSearch ? [debouncedSearch] : [];

    const qPage = {
      qOffset: 0,
      qCount: 5,
      qGroupOptions: [{ qGroupType: "DatasetType", qOffset: 0, qCount: -1 }],
      qGroupItemOptions: [{ qGroupItemType: "Field", qOffset: 0, qCount: 5 }],
    } as unknown as EngineAPI.ISearchPage;

    if (!app || qTerms.length === 0) {
      setResults([]);
      setError(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setError(null);
    // Descarta respostas de buscas já substituídas
    let ativo = true;

    app
      .searchResults(qOptions, qTerms, qPage)
      .then((qlikResult) => {
        if (!ativo) return;

        // @types/qlik-engineapi tipa qSearchGroupArray como objeto; o engine devolve array
        const groups = (qlikResult.qSearchGroupArray ||
          []) as unknown as EngineAPI.ISearchGroup[];

        const processedResults: SimplifiedSearchResultItem[] = groups.flatMap(
          (group) =>
            group.qItems.flatMap((item) =>
              item.qItemMatches.map((match) => ({
                text: match.qText || "N/A: qText not found",
                field: item.qIdentifier || "Field N/A",
              })),
            ),
        );

        setError(null);
        setResults(processedResults);
        setIsSearching(false);
      })
      .catch((err) => {
        if (!ativo) return;
        setError("Erro ao buscar resultados");
        setResults([]);
        setIsSearching(false);
        console.error("Erro ao buscar resultados:", err);
      });

    return () => {
      ativo = false;
    };
  }, [app, debouncedSearch]);

  return {
    search,
    setSearch,
    isSearching,
    error,
    results,
    applySelection,
  };
};

export { useQlikSearch };
