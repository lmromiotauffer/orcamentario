// Ferramenta provisória de desenvolvimento: lê no app Qlik as folhas, os objetos de cada folha, os itens
// mestres e as variáveis do mashup antigo (Painel orçamentário) para reconstruí-los em React. Remover depois da migração.
import { useState } from "react";
import { useQlikApp } from "@cluster-data-experience/qlik-modules";
import { Button } from "@/components/shadcn/button";

type CelulaFolha = { name: string; type: string; col?: number; row?: number; colspan?: number; rowspan?: number };

// Dimensões e medidas mestras referenciadas em qualquer nível das propriedades
const coletarLibraryIds = (valor: unknown, ids: Set<string>) => {
  if (Array.isArray(valor)) valor.forEach((item) => coletarLibraryIds(item, ids));
  else if (valor && typeof valor === "object") {
    for (const [chave, filho] of Object.entries(valor)) {
      if (chave === "qLibraryId" && typeof filho === "string" && filho) ids.add(filho);
      else coletarLibraryIds(filho, ids);
    }
  }
};

export const ExtrairObjetos = () => {
  const { app } = useQlikApp();
  const [resultado, setResultado] = useState<string>("");
  const [extraindo, setExtraindo] = useState(false);
  const [progresso, setProgresso] = useState("");

  const extrair = async () => {
    if (!app) return;
    setExtraindo(true);
    const saida: Record<string, unknown> = { folhas: [], objetos: {}, itensMestres: {}, variaveis: [] };
    const libraryIds = new Set<string>();

    // Folhas e as células (objetos) de cada uma
    const listaFolhas = await app.createSessionObject({
      qInfo: { qType: "SheetList" },
      qAppObjectListDef: { qType: "sheet", qData: { title: "/qMetaDef/title", rank: "/rank", cells: "/cells" } },
    } as unknown as EngineAPI.IGenericObjectProperties);
    const layoutFolhas = (await listaFolhas.getLayout()) as unknown as {
      qAppObjectList: { qItems: { qInfo: { qId: string }; qData: { title: string; rank: number; cells: CelulaFolha[] } }[] };
    };
    const folhas = [...layoutFolhas.qAppObjectList.qItems].sort((a, b) => (a.qData.rank ?? 0) - (b.qData.rank ?? 0));
    saida.folhas = folhas.map((folha) => ({
      id: folha.qInfo.qId,
      titulo: folha.qData.title,
      rank: folha.qData.rank,
      celulas: folha.qData.cells ?? [],
    }));

    for (const folha of folhas) {
      for (const celula of folha.qData.cells ?? []) {
        setProgresso(`${folha.qData.title}: ${celula.name}`);
        try {
          const objeto = await app.getObject(celula.name);
          const arvore = await objeto.getFullPropertyTree();
          const layout = await objeto.getLayout();
          coletarLibraryIds(arvore, libraryIds);
          (saida.objetos as Record<string, unknown>)[celula.name] = {
            folha: folha.qData.title,
            tipo: layout.qInfo.qType,
            titulo: (layout as { title?: string }).title,
            celula,
            arvore,
          };
        } catch (erro) {
          (saida.objetos as Record<string, unknown>)[celula.name] = { folha: folha.qData.title, erro: String(erro) };
        }
      }
    }

    for (const libraryId of libraryIds) {
      const mestres = saida.itensMestres as Record<string, unknown>;
      try {
        mestres[libraryId] = await (await app.getDimension(libraryId)).getProperties();
      } catch {
        try {
          mestres[libraryId] = await (await app.getMeasure(libraryId)).getProperties();
        } catch (erro) {
          mestres[libraryId] = { erro: String(erro) };
        }
      }
    }

    // Variáveis: as expressões dos objetos expandem $(v...)
    const listaVariaveis = await app.createSessionObject({
      qInfo: { qType: "VariableList" },
      qVariableListDef: { qType: "variable", qShowReserved: false, qShowConfig: false, qData: { tags: "/tags" } },
    } as unknown as EngineAPI.IGenericObjectProperties);
    const layoutVariaveis = (await listaVariaveis.getLayout()) as unknown as {
      qVariableList: { qItems: { qName: string; qDefinition?: string; qIsScriptCreated?: boolean }[] };
    };
    saida.variaveis = layoutVariaveis.qVariableList.qItems.map(({ qName, qDefinition, qIsScriptCreated }) => ({
      nome: qName,
      definicao: qDefinition,
      doScript: qIsScriptCreated,
    }));

    setResultado(JSON.stringify(saida, null, 2));
    setProgresso("");
    setExtraindo(false);
  };

  const baixar = () => {
    const url = URL.createObjectURL(new Blob([resultado], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "objetos-orcamentario.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden p-4">
      <div className="flex items-center gap-2">
        <Button onClick={extrair} disabled={!app || extraindo}>
          {extraindo ? "Extraindo…" : "Extrair definições"}
        </Button>
        <Button variant="outline" onClick={baixar} disabled={!resultado}>
          Baixar JSON
        </Button>
        <span className="text-xs text-muted-foreground">{progresso}</span>
      </div>
      <pre id="resultado-extracao" className="flex-1 overflow-auto rounded-md bg-muted p-3 text-xs">{resultado}</pre>
    </div>
  );
};
