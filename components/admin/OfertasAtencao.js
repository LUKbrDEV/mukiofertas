"use client";

// Aba "Precisam de atenção" do painel admin (antes ficava no fim da Saúde do robô).
// Salve como components/admin/OfertasAtencao.js.
//
// Ofertas no ar com algum problema: sem foto, sem categoria, preço estranho, repetidas,
// sem preço antigo e preço sem conferir há muito tempo. Um tipo por vez, escolhido nos botões do topo.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { calcularDesconto, formatarPreco, estaExpirada } from "../../lib/ofertas";
import { HORAS_ENTRE_CONFERENCIAS } from "../../lib/prazos.mjs";
import { buscarTudo, ha, tituloBase } from "./util";

const HORA = 3600000;

// Ofertas que o painel pode apagar de vez. As do robô (Lomadee, Shopee, AliExpress, KaBuM!)
// são ocultadas, senão o robô coloca de volta na próxima coleta.
const APAGAVEIS = ["manual", "telegram", "comunidade"];

// Em cada grupo de repetidas, fica a de menor preço (empate: a mais recente)
function escolherQueFica(grupo) {
  return [...grupo].sort(
    (a, b) =>
      Number(a.preco_atual) - Number(b.preco_atual) ||
      new Date(b.publicada_em ?? 0).getTime() - new Date(a.publicada_em ?? 0).getTime()
  )[0];
}

// Separa as ofertas no ar em cada tipo de problema. Usado aqui e no contador da Saúde do robô.
export function problemasDasOfertas(ofertas) {
  const noAr = ofertas.filter((o) => o.ativa && !estaExpirada(o));

  const grupos = new Map();
  for (const o of noAr) {
    const chave = `${o.loja}|${tituloBase(o.titulo)}`;
    grupos.set(chave, [...(grupos.get(chave) ?? []), o]);
  }
  const gruposRepetidos = [...grupos.values()].filter((g) => g.length > 1);
  const repetidas = gruposRepetidos.flatMap((g) => {
    const fica = escolherQueFica(g);
    return g.map((o) => ({ ...o, nota: `${g.length} iguais${o.id === fica.id ? " · esta fica" : ""}` }));
  });

  const suspeitas = noAr
    .map((o) => {
      const d = calcularDesconto(o);
      if (Number(o.preco_atual) < 5) return { ...o, nota: "preço abaixo de R$ 5" };
      if (d >= 90) return { ...o, nota: `desconto de ${d}%` };
      return null;
    })
    .filter(Boolean);

  const limiteConferencia = HORAS_ENTRE_CONFERENCIAS * 3 * HORA;
  const semConferir = noAr
    .filter((o) => !/amazon|amzn|amaznlink/i.test(`${o.loja} ${o.link}`))
    .filter((o) => {
      const ultima = o.preco_conferido_em || o.publicada_em;
      return ultima && Date.now() - new Date(ultima).getTime() > limiteConferencia;
    })
    .map((o) => ({ ...o, nota: `conferido ${ha(o.preco_conferido_em || o.publicada_em)}` }));

  return {
    gruposRepetidos,
    tipos: [
      {
        id: "foto",
        titulo: "Sem foto",
        explicacao: "Aparecem sem imagem no site. Edite e cole o endereço da foto.",
        itens: noAr.filter((o) => !o.imagem),
      },
      {
        id: "outros",
        titulo: 'Em "Outras ofertas"',
        explicacao: "O classificador não reconheceu a categoria. Edite e escolha a categoria certa.",
        itens: noAr.filter((o) => o.categoria === "outros" || !o.categoria),
      },
      {
        id: "suspeitas",
        titulo: "Preço estranho",
        explicacao: "Preço abaixo de R$ 5 ou desconto de 90% ou mais. Pode ser erro da loja.",
        itens: suspeitas,
      },
      {
        id: "repetidas",
        titulo: "Repetidas",
        explicacao:
          "Mesma loja e mesmo título no ar mais de uma vez. O botão deixa só a de menor preço de cada grupo (marcada com “esta fica”).",
        itens: repetidas,
      },
      {
        id: "semantigo",
        titulo: "Sem preço antigo",
        explicacao: "Sem o preço 'de', a oferta aparece sem a tag de desconto.",
        itens: noAr.filter((o) => !o.preco_antigo || Number(o.preco_antigo) <= Number(o.preco_atual)),
      },
      {
        id: "semconferir",
        titulo: "Preço sem conferir",
        explicacao: `Não conferidas há mais de ${HORAS_ENTRE_CONFERENCIAS * 3}h (a Amazon fica de fora de propósito). Normalmente é loja que bloqueia a leitura do preço.`,
        itens: semConferir,
      },
    ],
  };
}

const POR_PAGINA = 30;

export default function OfertasAtencao({ aoEditar }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [tipo, setTipo] = useState(null);
  const [mostrar, setMostrar] = useState(POR_PAGINA);
  const [limpando, setLimpando] = useState(false);
  const [aviso, setAviso] = useState("");

  const carregar = useCallback(async () => {
    setErro("");
    const r = await buscarTudo(() => supabase.from("ofertas").select("*").order("id"));
    if (r.error) return setErro(`Não foi possível carregar as ofertas: ${r.error.message}`);
    const p = problemasDasOfertas(r.data);
    setDados(p);
    // abre no primeiro tipo que tem problema
    setTipo((atual) => atual ?? p.tipos.find((t) => t.itens.length)?.id ?? p.tipos[0].id);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function limparRepetidas() {
    const grupos = dados?.gruposRepetidos ?? [];
    const sobrando = grupos.flatMap((g) => {
      const fica = escolherQueFica(g);
      return g.filter((o) => o.id !== fica.id);
    });
    if (!sobrando.length) return;
    if (
      !confirm(
        `Deixar só 1 oferta de cada um dos ${grupos.length} grupos de repetidas?\n\n` +
          `${sobrando.length} ofertas vão sair do site (fica a de menor preço de cada grupo). ` +
          `As do Telegram e manuais são apagadas; as do robô são ocultadas, para ele não colocar de volta.`
      )
    )
      return;

    setLimpando(true);
    setAviso("");
    const apagar = sobrando.filter((o) => APAGAVEIS.includes(o.origem)).map((o) => o.id);
    const ocultar = sobrando.filter((o) => !APAGAVEIS.includes(o.origem)).map((o) => o.id);
    const erros = [];
    for (let i = 0; i < apagar.length; i += 200) {
      const { error } = await supabase.from("ofertas").delete().in("id", apagar.slice(i, i + 200));
      if (error) erros.push(error.message);
    }
    for (let i = 0; i < ocultar.length; i += 200) {
      const { error } = await supabase.from("ofertas").update({ ativa: false, oculta_manual: true }).in("id", ocultar.slice(i, i + 200));
      if (error) erros.push(error.message);
    }
    setLimpando(false);
    setAviso(
      erros.length
        ? `Algumas não saíram: ${erros[0]}`
        : `Pronto: ${apagar.length} apagadas e ${ocultar.length} ocultadas. Ficou 1 de cada grupo.`
    );
    carregar();
  }

  if (erro) return <p className="adm-aviso">{erro}</p>;
  if (!dados) return <p className="adm-centro">Procurando ofertas com problema...</p>;

  const atual = dados.tipos.find((t) => t.id === tipo) ?? dados.tipos[0];
  const total = dados.tipos.reduce((s, t) => s + t.itens.length, 0);

  return (
    <>
      <div className="adm-titulo-linha">
        <div>
          <h1>Precisam de atenção</h1>
          <p className="adm-sub">
            Só ofertas que estão no ar. {total ? `${total} avisos no total.` : "Nenhum problema encontrado 🎉"}
          </p>
        </div>
        <button className="adm-btn" onClick={carregar}>
          ↻ Atualizar
        </button>
      </div>

      <div className="adm2-atalhos" role="tablist">
        {dados.tipos.map((t) => (
          <button
            key={t.id}
            role="tab"
            className="adm2-atalho"
            aria-selected={t.id === atual.id}
            onClick={() => {
              setTipo(t.id);
              setMostrar(POR_PAGINA);
            }}
          >
            {t.itens.length ? "⚠️" : "✅"} {t.titulo} <span>{t.itens.length}</span>
          </button>
        ))}
      </div>

      {aviso && <p className="adm-aviso">{aviso}</p>}

      <section className="adm-bloco">
        <div className="adm-titulo-linha">
          <p style={{ margin: 0 }}>{atual.explicacao}</p>
          {atual.id === "repetidas" && atual.itens.length > 0 && (
            <button className="adm-btn adm-btn--primario" onClick={limparRepetidas} disabled={limpando}>
              {limpando ? "Trabalhando..." : `🧹 Deixar só 1 de cada (${dados.gruposRepetidos.length} grupos)`}
            </button>
          )}
        </div>

        {atual.itens.length === 0 ? (
          <p className="adm-vazio">✅ Nenhuma oferta com esse problema.</p>
        ) : (
          <ul className="adm-alerta-lista" style={{ marginTop: 14 }}>
            {atual.itens.slice(0, mostrar).map((o) => (
              <li key={o.id}>
                <span className="adm-ranking-titulo">
                  {o.titulo}
                  <small>
                    {o.loja} · {formatarPreco(o.preco_atual)}
                    {o.nota ? ` · ${o.nota}` : ""}
                  </small>
                </span>
                <span className="adm-alerta-acoes">
                  <a className="adm-btn" href={`/oferta/${o.id}`} target="_blank" rel="noopener noreferrer">
                    Ver ↗
                  </a>
                  {aoEditar && (
                    <button className="adm-btn" onClick={() => aoEditar(o)}>
                      Editar
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        {atual.itens.length > mostrar && (
          <div className="adm-mais">
            <button className="adm-btn" onClick={() => setMostrar((m) => m + POR_PAGINA)}>
              Mostrar mais ({atual.itens.length - mostrar} restantes)
            </button>
          </div>
        )}
      </section>
    </>
  );
}
