import { useEffect, useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react/esm/core";
import { useTable, type Column } from "@cluster-data-experience/qlik-modules";
import { semTotais } from "@/components/CartaoPainel/colunas";
import { EstadoGrafico } from "@/components/GraficosOrcamento/EstadoGrafico";
import { echarts, numero, useCoresGrafico } from "@/components/GraficosOrcamento/base";
import { autorizado, empenhado, pagoNoExercicio } from "@/shared/qlik/medidas";
import { celulasOrdemEngine } from "@/shared/utils/celulasOrdemEngine";
import { moedaCompacta, moedaCompleta } from "@/shared/utils/formatarMoeda";
import { cn } from "@/shared/utils/tailwind/cn";

export type MedidaMapa = "autorizado" | "empenhado" | "pago";

export const medidasMapa: { value: MedidaMapa; label: string }[] = [
  { value: "autorizado", label: "Autorizado" },
  { value: "empenhado", label: "Empenhado" },
  { value: "pago", label: "Pago" },
];

// Uma só consulta com as três medidas: trocar a aba não volta ao engine
const colunasRegiao: Column[] = [
  { type: "dimension", qFieldDefs: ["Região financeira"], qFieldLabels: ["Região"], qNullSuppression: true },
  { type: "measure", qDef: autorizado, qLabel: "Autorizado" },
  { type: "measure", qDef: empenhado, qLabel: "Empenhado" },
  { type: "measure", qDef: pagoNoExercicio, qLabel: "Pago" },
];

// Município → região financeira vem do app (objeto nmNx), não do geojson
const colunasMunicipios: Column[] = [
  { type: "dimension", qFieldDefs: ["Município"], qFieldLabels: ["Município"], qNullSuppression: true },
  { type: "dimension", qFieldDefs: ["Região financeira"], qFieldLabels: ["Região"] },
];

// Só o que o mapa usa do geojson; @types/geojson não está instalado
type Anel = [number, number][];
type Municipio = {
  type: "Feature";
  properties?: { codarea?: string; nome?: string };
  geometry: { type: "Polygon"; coordinates: Anel[] } | { type: "MultiPolygon"; coordinates: Anel[][] };
};
type Municipios = { type: "FeatureCollection"; features: Municipio[] };

// Geojson dos 141 municípios (public/geo), carregado uma vez por sessão e registrado no ECharts
let municipiosPromessa: Promise<Municipios> | null = null;
const carregarMunicipios = () => {
  municipiosPromessa ??= fetch("./geo/municipios-mt.geojson")
    .then((resposta) => resposta.json() as Promise<Municipios>)
    .then((geo) => {
      echarts.registerMap("mt", geo as unknown as Parameters<typeof echarts.registerMap>[1]);
      return geo;
    });
  return municipiosPromessa;
};

// "Mirassol d'Oeste" no geojson é "MIRASSOL D´OESTE" no Qlik: compara sem acento, apóstrofo nem caixa
// Grafias que divergem entre o geojson (IBGE) e o Qlik
const apelidos: Record<string, string> = { "SANTO ANTONIO DO LEVERGER": "SANTO ANTONIO DE LEVERGER" };
const chave = (nome: string) => {
  const base = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[´'’`]/g, "")
    .toUpperCase()
    .trim();
  return apelidos[base] ?? base;
};

// Valor do numeral romano da região (99 para "TODO ESTADO", que vai por último)
const algarismos: Record<string, number> = { I: 1, V: 5, X: 10 };
const valorRomano = (regiao: string) => {
  const numeral = rotuloRegiao(regiao);
  if (!/^[IVX]+$/.test(numeral)) return 99;
  return [...numeral].reduce((total, letra, i, todas) => total + (algarismos[letra] < (algarismos[todas[i + 1]] ?? 0) ? -algarismos[letra] : algarismos[letra]), 0);
};

// "REGIÃO VI - SUL" → "VI": no mapa só cabe o numeral da região; o nome inteiro vai no tooltip e nas tabelas
export const rotuloRegiao = (regiao: string) => regiao.replace(/^REGI[ÃA]O\s+/i, "").split(/\s*[-–]\s*/)[0];

const centro = (feature: Municipio): [number, number] => {
  const aneis = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates[0]] : feature.geometry.coordinates.map((p) => p[0]);
  const pontos = aneis.flat();
  const lngs = pontos.map((p) => p[0]);
  const lats = pontos.map((p) => p[1]);
  return [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];
};

type MapaRegioesProps = {
  medida: MedidaMapa;
  anoUnico: boolean;
  className?: string;
};

/** Mapa coroplético de Mato Grosso: cada município pintado pelo valor da sua região financeira. Clicar seleciona a região. */
export const MapaRegioes = ({ medida, anoUnico, className }: MapaRegioesProps) => {
  const cores = useCoresGrafico();
  const regioes = useTable({ columns: colunasRegiao, pageHeight: 50, totals: semTotais });
  const municipios = useTable({ columns: colunasMunicipios, pageHeight: 200, totals: semTotais });
  const [geo, setGeo] = useState<Municipios | null>(null);
  // Tamanho do contêiner: a caixa de colisão dos rótulos é em pixels, e a escala do mapa muda com a largura
  const moldura = useRef<HTMLDivElement>(null);
  const [tamanho, setTamanho] = useState({ largura: 480, altura: 300 });
  useEffect(() => {
    const alvo = moldura.current;
    if (!alvo) return;
    const medir = () => setTamanho({ largura: alvo.clientWidth || 480, altura: alvo.clientHeight || 300 });
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(alvo);
    return () => observador.disconnect();
  }, [geo]);

  useEffect(() => {
    let ativo = true;
    carregarMunicipios()
      .then((dados) => ativo && setGeo(dados))
      .catch((erro) => console.error("Não foi possível carregar o mapa dos municípios", erro));
    return () => {
      ativo = false;
    };
  }, []);

  const valores = useMemo(() => {
    const mapa = new Map<string, { regiao: string; valor: number | null; indice: number }>();
    (regioes.data?.rows ?? []).forEach((linha, indice) => {
      const [regiao, aut, emp, pago] = celulasOrdemEngine(linha.cells, regioes.layout?.qHyperCube);
      const nome = regiao?.qText ?? "";
      if (!nome || nome === "-") return;
      const valor = medida === "autorizado" ? numero(aut) : medida === "empenhado" ? numero(emp) : anoUnico ? numero(pago) : null;
      mapa.set(nome, { regiao: nome, valor, indice });
    });
    return mapa;
  }, [regioes.data, regioes.layout, medida, anoUnico]);

  const regiaoDoMunicipio = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const linha of municipios.data?.rows ?? []) {
      const [municipio, regiao] = celulasOrdemEngine(linha.cells, municipios.layout?.qHyperCube);
      if (municipio?.qText && regiao?.qText) mapa.set(chave(municipio.qText), regiao.qText);
    }
    return mapa;
  }, [municipios.data, municipios.layout]);

  const { areas, rotulos, maximo } = useMemo(() => {
    if (!geo) return { areas: [], rotulos: [], maximo: 0 };
    const centros = new Map<string, [number, number][]>();
    const areas = geo.features.map((feature) => {
      // Quatro municípios vêm só com o código IBGE no geojson: ficam no mapa, sem região
      const nome = feature.properties?.nome ?? feature.properties?.codarea ?? "";
      const regiao = nome ? regiaoDoMunicipio.get(chave(nome)) : undefined;
      const dado = regiao ? valores.get(regiao) : undefined;
      if (regiao) centros.set(regiao, [...(centros.get(regiao) ?? []), centro(feature)]);
      // Sem região (nome não casa com o Qlik): fica na cor da trilha, fora da escala, e aparece no console em dev
      if (!regiao && regiaoDoMunicipio.size > 0 && import.meta.env.DEV) console.warn("Município sem região no Qlik:", nome);
      return regiao
        ? { name: nome, value: dado?.valor ?? undefined, regiao }
        : { name: nome, value: undefined, regiao: "Sem região", itemStyle: { areaColor: cores.reguaFraco } };
    });
    const candidatos = [...centros.entries()]
      .map(([regiao, pontos]) => ({
        name: regiao,
        value: [pontos.reduce((s, p) => s + p[0], 0) / pontos.length, pontos.reduce((s, p) => s + p[1], 0) / pontos.length, valores.get(regiao)?.valor ?? null] as [number, number, number | null],
      }))
      .sort((a, b) => (b.value[2] ?? 0) - (a.value[2] ?? 0));
    // Caixa de um rótulo (só o numeral, cerca de 30 x 18 px) convertida em graus pela escala real do mapa: MT mede
    // cerca de 11,4 x 10,7 graus e o ECharts o ajusta ao lado menor do contêiner. Rótulos que caem na caixa de uma região maior somem
    const escala = Math.min((tamanho.largura - 16) / 11.4, (tamanho.altura - 36) / 10.7);
    const caixaLng = 30 / escala;
    const caixaLat = 18 / escala;
    const rotulos = candidatos.filter((candidato, i) =>
      candidatos.slice(0, i).every((maior) => Math.abs(maior.value[0] - candidato.value[0]) > caixaLng || Math.abs(maior.value[1] - candidato.value[1]) > caixaLat),
    );
    const maximo = Math.max(0, ...[...valores.values()].map(({ valor }) => valor ?? 0));
    return { areas, rotulos, maximo };
  }, [geo, regiaoDoMunicipio, valores, tamanho, cores.reguaFraco]);

  const rotuloMedida = medidasMapa.find(({ value }) => value === medida)?.label ?? "";

  const opcao = useMemo(
    () => ({
      backgroundColor: "transparent",
      animation: false,
      textStyle: { fontFamily: cores.fonte },
      tooltip: {
        trigger: "item",
        backgroundColor: cores.superficie,
        borderColor: cores.borda,
        textStyle: { color: cores.texto, fontSize: 12 },
        formatter: (params: { seriesType: string; name: string; data?: { regiao?: string; value?: number | (number | null)[] } }) => {
          if (params.seriesType === "scatter") return "";
          const regiao = params.data?.regiao ?? "";
          const valor = valores.get(regiao)?.valor ?? null;
          return `<strong>${regiao}</strong><br/>${params.name}<br/>${rotuloMedida}: <strong>${moedaCompleta(valor)}</strong> (${moedaCompacta(valor)})`;
        },
      },
      // Um azul só, do claro ao escuro: mais escuro = mais dinheiro
      visualMap: {
        min: 0,
        max: maximo || 1,
        show: true,
        orient: "horizontal",
        left: 8,
        bottom: 4,
        itemWidth: 10,
        itemHeight: 120,
        calculable: false,
        text: [moedaCompacta(maximo).replace(",00", ""), "R$ 0"],
        textStyle: { color: cores.suave, fontSize: 10 },
        inRange: { color: [cores.reguaFraco, cores.regua[1], cores.regua[2]] },
      },
      geo: {
        map: "mt",
        nameProperty: "nome",
        roam: false,
        top: 8,
        bottom: 28,
        left: 8,
        right: 8,
        silent: false,
        itemStyle: { areaColor: cores.reguaFraco, borderColor: cores.superficie, borderWidth: 0.6 },
        emphasis: { disabled: true },
        select: { disabled: true },
      },
      series: [
        { type: "map", map: "mt", geoIndex: 0, nameProperty: "nome", data: areas },
        {
          type: "scatter",
          coordinateSystem: "geo",
          data: rotulos,
          symbolSize: 1,
          tooltip: { show: false },
          labelLayout: { hideOverlap: true },
          label: {
            show: true,
            // Só o numeral cabe no mapa; nome e valor vão no tooltip e nas tabelas
            formatter: ({ name }: { name: string }) => rotuloRegiao(name),
            color: cores.texto,
            fontSize: 10,
            fontWeight: 600,
            backgroundColor: cores.superficie,
            borderRadius: 3,
            padding: [1, 3],
          },
        },
      ],
    }),
    [cores, areas, rotulos, maximo, valores, rotuloMedida],
  );

  const aoIniciar = (grafico: echarts.EChartsType) => {
    grafico.on("click", (params) => {
      const dado = params.data as { regiao?: string } | null | undefined;
      const regiao = params.seriesType === "scatter" ? params.name : dado?.regiao;
      const alvo = regiao ? valores.get(regiao) : undefined;
      if (alvo) regioes.selectCell(alvo.indice, 0);
    });
  };

  if (!geo || !regioes.data || !municipios.data) return <EstadoGrafico carregando />;
  if (valores.size === 0) return <EstadoGrafico carregando={false} />;

  // "REGIÃO VI - SUL" → "Sul"; "REGIÃO XI - NOROESTE II" → "Noroeste II"; "TODO ESTADO" → "Todo o Estado"
  const temNumeral = (regiao: string) => /^REGI[ÃA]O\s+[IVX]+/i.test(regiao);
  const nomeRegiao = (regiao: string) =>
    regiao
      .replace(/^REGI[ÃA]O\s+[IVX]+\s*[-–]\s*/i, "")
      .toLowerCase()
      .replace(/(^|\s)\S/g, (letra) => letra.toUpperCase())
      .replace(/\b(Ii|Iii|Iv|Vi|Vii|Viii|Ix|Xi|Xii)\b/g, (numeral) => numeral.toUpperCase())
      .replace(/^Todo Estado$/, "Todo o Estado");

  return (
    <div className={cn("flex h-full w-full flex-col", className)}>
      <div ref={moldura} role="img" aria-label={`Mapa de Mato Grosso com o valor ${rotuloMedida.toLowerCase()} por região financeira; clicar numa região filtra o painel`} className="min-h-0 flex-1">
        <ReactECharts echarts={echarts} option={opcao} notMerge style={{ height: "100%", width: "100%" }} onChartReady={aoIniciar} />
      </div>
      {/* Numeral e nome de cada região: o mapa só comporta o numeral; aqui o leigo lê "onde", e o toque seleciona */}
      <ul className="flex shrink-0 flex-wrap gap-x-3 gap-y-0.5 px-1 pt-1 text-[10px] leading-4 text-muted-foreground" aria-label="Regiões financeiras">
        {[...valores.values()].sort((a, b) => valorRomano(a.regiao) - valorRomano(b.regiao)).map(({ regiao, indice }) => (
          <li key={regiao}>
            <button type="button" onClick={() => regioes.selectCell(indice, 0)} className="cursor-pointer rounded transicao-feedback hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50" title={`Filtrar por ${regiao}`}>
              {temNumeral(regiao) && <strong className="font-semibold text-foreground">{rotuloRegiao(regiao)} </strong>}
              {nomeRegiao(regiao)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
