"use client";

// Aba Ofertas do painel admin.
// Salve como components/admin/ListaAdmin.js.
//
// Tudo o que já existia continua: Editar, Marcar/Tirar relâmpago, Destacar/Tirar destaque,
// Reenviar ao Telegram, Reativar, Marcar como expirada, Ocultar e Apagar.
// Novidades: foto, cliques, filtros por loja/categoria/situação, ordenação,
// seleção de várias ofertas para agir em massa, troca rápida de categoria,
// "Ver no site" e "Abrir link".

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { categorias } from "../../data/ofertas";
import { calcularDesconto, formatarPreco, estaExpirada } from "../../lib/ofertas";
import { DIAS_NO_SITE, DIAS_EXPIRADA_VISIVEL } from "../../lib/prazos.mjs";
import { DIA, buscarTudo, nomeCategoria, nomeOrigem, momentoExpiracao, duracao, ha } from "./util";

const POR_PAGINA = 50;
const APAGAVEIS = ["manual", "telegram", "comunidade"];

const ESTILO_EXPIRADA = { background: "#fde2e2", color: "#b42318", fontWeight: 700 };
const ESTILO_NO_AR = { background: "#dcfce7", color: "#15803d", fontWeight: 700 };

const SITUACOES = [
  ["todas", "Todas as situações"],
  ["no-ar", "No ar (não expiradas)"],
  ["expiradas", "Expiradas"],
  ["ocultas", "Ocultas"],
  ["relampago", "Com Relâmpago"],
  ["destaque", "Com Destaque"],
  ["cupom", "Com cupom"],
  ["fila-telegram", "Na fila do Telegram"],
  ["sem-foto", "Sem foto"],
  ["outros", "Em \"Outras ofertas\""],
];

const ORDENS = [
  ["atualizadas", "Atualizadas por último"],
  ["publicadas", "Publicadas por último"],
  ["expira", "Expiram primeiro"],
  ["desconto", "Maior desconto"],
  ["cliques", "Mais cliques"],
  ["preco-maior", "Maior preço"],
  ["preco-menor", "Menor preço"],
];

const tempo = (iso) => (iso ? new Date(iso).getTime() : 0);

export default function ListaAdmin({ aoEditar }) {
  const [ofertas, setOfertas] = useState([]);
  const [cliques, setCliques] = useState(new Map());
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState("");
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todas");
  const [origem, setOrigem] = useState("todas");
  const [loja, setLoja] = useState("todas");
  const [categoria, setCategoria] = useState("todas");
  const [ordem, setOrdem] = useState("atualizadas");
  const [limite, setLimite] = useState(POR_PAGINA);
  const [selecionadas, setSelecionadas] = useState(new Set());
  const [categoriaMassa, setCategoriaMassa] = useState("");
  const [trabalhando, setTrabalhando] = useState(false);

  const carregar = useCallback(async () => {
    const [r, c] = await Promise.all([
      buscarTudo(() => supabase.from("ofertas").select("*").order("atualizado_em", { ascending: false })),
      buscarTudo(() => supabase.from("cliques_por_oferta").select("id, total")),
    ]);
    if (r.error) setAviso(r.error.message);
    else setOfertas(r.data);
    if (!c.error) setCliques(new Map(c.data.map((l) => [l.id, l.total])));
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Volta para a primeira página quando muda um filtro
  useEffect(() => {
    setLimite(POR_PAGINA);
  }, [busca, status, origem, loja, categoria, ordem]);

  // ---------- Ações de uma oferta ----------
  async function atualizar(id, campos, mensagem = "") {
    const { error } = await supabase.from("ofertas").update(campos).eq("id", id);
    setAviso(error ? error.message : mensagem);
    carregar();
  }

  const camposReativar = () => {
    const agora = new Date().toISOString();
    return { ativa: true, oculta_manual: false, expires_at: null, publicada_em: agora, atualizado_em: agora };
  };

  const ocultar = (o) => atualizar(o.id, { ativa: false, oculta_manual: true }, `"${o.titulo}" ocultada.`);

  // Reativar conta como uma nova publicação: tira o expires_at e a oferta ganha
  // mais DIAS_NO_SITE dias no site. Vale para ofertas ocultas e para expiradas.
  const reativar = (o) =>
    atualizar(o.id, camposReativar(), `"${o.titulo}" reativada: fica no ar por mais ${DIAS_NO_SITE} dias.`);

  // Expira agora: continua visível no site com a tag "Expirado" e desce para o fim
  const expirar = (o) =>
    atualizar(o.id, { expires_at: new Date().toISOString() }, `"${o.titulo}" marcada como expirada.`);

  const reenviar = (o) =>
    atualizar(o.id, { postada_telegram_em: null }, "A oferta será reenviada ao Telegram no próximo ciclo do robô.");

  async function apagar(o) {
    if (!confirm(`Apagar "${o.titulo}"?`)) return;
    const { error } = await supabase.from("ofertas").delete().eq("id", o.id);
    setAviso(error ? error.message : `"${o.titulo}" apagada.`);
    carregar();
  }

  async function copiar(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      setAviso("Link copiado.");
    } catch {
      setAviso("Não foi possível copiar. Use o botão Abrir link.");
    }
  }

  // ---------- Ações em massa ----------
  async function emMassa(campos, mensagem, apenas = null) {
    let ids = [...selecionadas];
    if (apenas) ids = ids.filter((id) => apenas(ofertas.find((o) => o.id === id)));
    if (ids.length === 0) return setAviso("Nenhuma das ofertas selecionadas pode receber essa ação.");
    setTrabalhando(true);
    const { error } = await supabase.from("ofertas").update(campos).in("id", ids);
    setTrabalhando(false);
    setAviso(error ? error.message : mensagem(ids.length));
    if (!error) setSelecionadas(new Set());
    carregar();
  }

  async function apagarEmMassa() {
    const ids = [...selecionadas].filter((id) => APAGAVEIS.includes(ofertas.find((o) => o.id === id)?.origem));
    const ignoradas = selecionadas.size - ids.length;
    if (ids.length === 0)
      return setAviso("As ofertas do robô não podem ser apagadas (voltariam na próxima coleta). Use Ocultar.");
    if (!confirm(`Apagar ${ids.length} ofertas?${ignoradas ? ` (${ignoradas} do robô serão mantidas)` : ""}`)) return;
    setTrabalhando(true);
    const { error } = await supabase.from("ofertas").delete().in("id", ids);
    setTrabalhando(false);
    setAviso(
      error
        ? error.message
        : `${ids.length} ofertas apagadas.${ignoradas ? ` ${ignoradas} do robô foram mantidas (use Ocultar).` : ""}`
    );
    if (!error) setSelecionadas(new Set());
    carregar();
  }

  // ---------- Filtros e ordem ----------
  const lojas = useMemo(
    () => [...new Set(ofertas.map((o) => o.loja).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [ofertas]
  );

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = ofertas.filter((o) => {
      const expirada = estaExpirada(o);
      const noAr = o.ativa && !expirada;
      if (status === "no-ar" && !noAr) return false;
      if (status === "expiradas" && (!o.ativa || !expirada)) return false;
      if (status === "ocultas" && o.ativa) return false;
      if (status === "relampago" && !o.relampago) return false;
      if (status === "destaque" && !o.destaque) return false;
      if (status === "cupom" && !o.cupom) return false;
      if (status === "fila-telegram" && (!noAr || o.postada_telegram_em)) return false;
      if (status === "sem-foto" && o.imagem) return false;
      if (status === "outros" && o.categoria !== "outros") return false;
      if (origem !== "todas" && (o.origem ?? "automatica") !== origem) return false;
      if (loja !== "todas" && o.loja !== loja) return false;
      if (categoria !== "todas" && o.categoria !== categoria) return false;
      if (termo && !`${o.titulo} ${o.loja} ${o.cupom ?? ""}`.toLowerCase().includes(termo)) return false;
      return true;
    });

    const criterio = {
      atualizadas: (a, b) => tempo(b.atualizado_em) - tempo(a.atualizado_em),
      publicadas: (a, b) => tempo(b.publicada_em) - tempo(a.publicada_em),
      expira: (a, b) => (momentoExpiracao(a) ?? Infinity) - (momentoExpiracao(b) ?? Infinity),
      desconto: (a, b) => calcularDesconto(b) - calcularDesconto(a),
      cliques: (a, b) => (cliques.get(b.id) ?? 0) - (cliques.get(a.id) ?? 0),
      "preco-maior": (a, b) => Number(b.preco_atual) - Number(a.preco_atual),
      "preco-menor": (a, b) => Number(a.preco_atual) - Number(b.preco_atual),
    }[ordem];
    return [...lista].sort(criterio);
  }, [ofertas, cliques, busca, status, origem, loja, categoria, ordem]);

  const visiveis = filtradas.slice(0, limite);
  const todasVisiveisMarcadas = visiveis.length > 0 && visiveis.every((o) => selecionadas.has(o.id));

  function marcar(id) {
    setSelecionadas((atual) => {
      const nova = new Set(atual);
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      return nova;
    });
  }

  function marcarVisiveis() {
    setSelecionadas((atual) => {
      const nova = new Set(atual);
      if (todasVisiveisMarcadas) visiveis.forEach((o) => nova.delete(o.id));
      else visiveis.forEach((o) => nova.add(o.id));
      return nova;
    });
  }

  const limparFiltros = () => {
    setBusca("");
    setStatus("todas");
    setOrigem("todas");
    setLoja("todas");
    setCategoria("todas");
    setOrdem("atualizadas");
  };

  const agora = Date.now();
  const n = selecionadas.size;

  return (
    <>
      <div className="adm-titulo-linha">
        <div>
          <h1>Ofertas</h1>
          <p className="adm-sub">
            {filtradas.length} de {ofertas.length} ofertas
          </p>
        </div>
        <button className="adm-btn" onClick={carregar}>
          ↻ Atualizar
        </button>
      </div>

      <div className="adm-filtros">
        <input
          className="adm-input adm-filtros-busca"
          type="search"
          placeholder="Buscar por título, loja ou cupom"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select className="adm-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          {SITUACOES.map(([valor, nome]) => (
            <option key={valor} value={valor}>
              {nome}
            </option>
          ))}
        </select>
        <select className="adm-input" value={origem} onChange={(e) => setOrigem(e.target.value)}>
          <option value="todas">Qualquer origem</option>
          <option value="manual">Cadastradas à mão</option>
          <option value="automatica">Automáticas (robô)</option>
          <option value="telegram">Importadas do Telegram</option>
          <option value="comunidade">Da comunidade</option>
        </select>
        <select className="adm-input" value={loja} onChange={(e) => setLoja(e.target.value)}>
          <option value="todas">Todas as lojas</option>
          {lojas.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select className="adm-input" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="todas">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.pai ? `— ${c.nome}` : c.nome}
            </option>
          ))}
        </select>
        <select className="adm-input" value={ordem} onChange={(e) => setOrdem(e.target.value)}>
          {ORDENS.map(([valor, nome]) => (
            <option key={valor} value={valor}>
              Ordem: {nome}
            </option>
          ))}
        </select>
        <button className="adm-btn" onClick={limparFiltros}>
          Limpar filtros
        </button>
      </div>

      {/* Barra de ações em massa */}
      <div className={n > 0 ? "adm-massa adm-massa--ativa" : "adm-massa"}>
        <label className="adm-massa-check">
          <input type="checkbox" checked={todasVisiveisMarcadas} onChange={marcarVisiveis} />
          {n > 0 ? `${n} selecionada${n > 1 ? "s" : ""}` : "Selecionar as da página"}
        </label>
        {n > 0 && (
          <div className="adm-massa-acoes">
            <button
              className="adm-btn"
              disabled={trabalhando}
              onClick={() => emMassa({ expires_at: new Date().toISOString() }, (q) => `${q} ofertas marcadas como expiradas.`)}
            >
              Expirar
            </button>
            <button
              className="adm-btn"
              disabled={trabalhando}
              onClick={() => emMassa(camposReativar(), (q) => `${q} ofertas reativadas por mais ${DIAS_NO_SITE} dias.`)}
            >
              Reativar
            </button>
            <button
              className="adm-btn"
              disabled={trabalhando}
              onClick={() => emMassa({ ativa: false, oculta_manual: true }, (q) => `${q} ofertas ocultadas.`)}
            >
              Ocultar
            </button>
            <button
              className="adm-btn"
              disabled={trabalhando}
              onClick={() => emMassa({ destaque: true }, (q) => `${q} ofertas destacadas.`)}
            >
              Destacar
            </button>
            <button
              className="adm-btn"
              disabled={trabalhando}
              onClick={() => emMassa({ destaque: false }, (q) => `Destaque tirado de ${q} ofertas.`)}
            >
              Tirar destaque
            </button>
            <button
              className="adm-btn"
              disabled={trabalhando}
              onClick={() => emMassa({ relampago: true }, (q) => `${q} ofertas marcadas como relâmpago.`)}
            >
              Relâmpago
            </button>
            <button
              className="adm-btn"
              disabled={trabalhando}
              onClick={() => emMassa({ relampago: false }, (q) => `Relâmpago tirado de ${q} ofertas.`)}
            >
              Tirar relâmpago
            </button>
            <button
              className="adm-btn"
              disabled={trabalhando}
              onClick={() =>
                emMassa({ postada_telegram_em: null }, (q) => `${q} ofertas serão reenviadas ao Telegram no próximo ciclo.`)
              }
            >
              Reenviar ao Telegram
            </button>
            <span className="adm-massa-grupo">
              <select
                className="adm-input"
                value={categoriaMassa}
                onChange={(e) => setCategoriaMassa(e.target.value)}
              >
                <option value="">Mudar categoria para...</option>
                {categorias.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.pai ? `— ${c.nome}` : c.nome}
                  </option>
                ))}
              </select>
              <button
                className="adm-btn"
                disabled={trabalhando || !categoriaMassa}
                onClick={() =>
                  emMassa(
                    { categoria: categoriaMassa },
                    (q) => `${q} ofertas movidas para ${nomeCategoria(categoriaMassa)}.`
                  )
                }
              >
                Aplicar
              </button>
            </span>
            <button className="adm-btn adm-btn--perigo" disabled={trabalhando} onClick={apagarEmMassa}>
              Apagar
            </button>
            <button className="adm-btn adm-btn--link" onClick={() => setSelecionadas(new Set())}>
              Limpar seleção
            </button>
          </div>
        )}
      </div>

      {aviso && (
        <p className="adm-aviso">
          {aviso}
          <button className="adm-aviso-fechar" onClick={() => setAviso("")} aria-label="Fechar aviso">
            ×
          </button>
        </p>
      )}
      {carregando && <p className="adm-centro">Carregando...</p>}
      {!carregando && filtradas.length === 0 && (
        <p className="adm-vazio">Nenhuma oferta encontrada com esses filtros.</p>
      )}

      <div className="adm-lista">
        {visiveis.map((o) => {
          const desconto = calcularDesconto(o);
          const apagavel = APAGAVEIS.includes(o.origem);
          const expirada = estaExpirada(o);
          const expiraEm = momentoExpiracao(o);
          const apagaEm = expiraEm !== null ? expiraEm + DIAS_EXPIRADA_VISIVEL * DIA : null;
          const total = cliques.get(o.id) ?? 0;
          const marcada = selecionadas.has(o.id);

          return (
            <div
              key={o.id}
              className={[
                "adm-linha",
                "adm-linha--oferta",
                !o.ativa && "adm-linha--oculta",
                marcada && "adm-linha--marcada",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <input
                type="checkbox"
                className="adm-linha-check"
                checked={marcada}
                onChange={() => marcar(o.id)}
                aria-label={`Selecionar ${o.titulo}`}
              />

              <div className="adm-foto">
                {o.imagem ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.imagem} alt="" loading="lazy" />
                ) : (
                  <span>sem foto</span>
                )}
              </div>

              <div className="adm-linha-corpo">
                <div className="adm-linha-info">
                  <strong>{o.titulo}</strong>
                  <div className="adm-linha-meta">
                    <span>{o.loja}</span>
                    <span className="adm-preco">
                      {formatarPreco(o.preco_atual)}
                      {o.preco_antigo > o.preco_atual && <s>{formatarPreco(o.preco_antigo)}</s>}
                      {desconto > 0 && <b>-{desconto}%</b>}
                    </span>
                    <span title="Cliques em Ver oferta">👆 {total} cliques</span>
                    <span title={o.publicada_em ? new Date(o.publicada_em).toLocaleString("pt-BR") : ""}>
                      Publicada {ha(o.publicada_em)}
                    </span>
                    <select
                      className="adm-categoria-rapida"
                      value={o.categoria ?? ""}
                      onChange={(e) =>
                        atualizar(o.id, { categoria: e.target.value }, `Categoria mudada para ${nomeCategoria(e.target.value)}.`)
                      }
                      title="Mudar a categoria"
                    >
                      {!categorias.some((c) => c.slug === o.categoria) && (
                        <option value={o.categoria ?? ""}>{o.categoria || "sem categoria"}</option>
                      )}
                      {categorias.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.pai ? `— ${c.nome}` : c.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="adm-etiquetas">
                    <span className="adm-etiqueta">{nomeOrigem(o.origem)}</span>

                    {/* Situação no site: oculta, expirada ou no ar */}
                    {!o.ativa && <span className="adm-etiqueta adm-etiqueta--cinza">Oculta</span>}
                    {o.ativa && expirada && (
                      <span className="adm-etiqueta" style={ESTILO_EXPIRADA}>
                        Expirada
                        {apagaEm !== null && apagaEm > agora && ` · apagada em ${duracao(apagaEm - agora)}`}
                      </span>
                    )}
                    {o.ativa && !expirada && (
                      <span className="adm-etiqueta" style={ESTILO_NO_AR}>
                        No ar{expiraEm !== null && ` · expira em ${duracao(expiraEm - agora)}`}
                      </span>
                    )}

                    {o.relampago && <span className="adm-etiqueta adm-etiqueta--laranja">Relâmpago</span>}
                    {o.destaque && <span className="adm-etiqueta adm-etiqueta--laranja">Destaque</span>}
                    {o.selo && <span className="adm-etiqueta adm-etiqueta--amarela">{o.selo}</span>}
                    {o.cupom && <span className="adm-etiqueta">Cupom {o.cupom}</span>}
                    {o.renovacoes > 0 && (
                      <span className="adm-etiqueta">Renovada {o.renovacoes}x</span>
                    )}
                    {o.postada_telegram_em ? (
                      <span className="adm-etiqueta adm-etiqueta--verde">No Telegram</span>
                    ) : (
                      o.ativa && !expirada && <span className="adm-etiqueta">Na fila do Telegram</span>
                    )}
                    {o.preco_conferido_em && (
                      <span className="adm-etiqueta" title={new Date(o.preco_conferido_em).toLocaleString("pt-BR")}>
                        Preço conferido {ha(o.preco_conferido_em)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="adm-acoes">
                  <button className="adm-btn" onClick={() => aoEditar(o)}>
                    Editar
                  </button>
                  <button className="adm-btn" onClick={() => atualizar(o.id, { relampago: !o.relampago })}>
                    {o.relampago ? "Tirar relâmpago" : "Marcar relâmpago"}
                  </button>
                  <button className="adm-btn" onClick={() => atualizar(o.id, { destaque: !o.destaque })}>
                    {o.destaque ? "Tirar destaque" : "Destacar"}
                  </button>
                  <button className="adm-btn" onClick={() => reenviar(o)}>
                    Reenviar ao Telegram
                  </button>

                  {/* Expirada ou oculta: reativar. No ar: pode expirar na hora. */}
                  {!o.ativa || expirada ? (
                    <button className="adm-btn" onClick={() => reativar(o)}>
                      Reativar
                    </button>
                  ) : (
                    <button className="adm-btn" onClick={() => expirar(o)}>
                      Marcar como expirada
                    </button>
                  )}

                  {o.ativa && (
                    <button className="adm-btn" onClick={() => ocultar(o)}>
                      Ocultar
                    </button>
                  )}
                  <a className="adm-btn" href={`/oferta/${o.id}`} target="_blank" rel="noopener noreferrer">
                    Ver no site ↗
                  </a>
                  {o.link && (
                    <>
                      <a className="adm-btn" href={o.link} target="_blank" rel="noopener noreferrer nofollow">
                        Abrir link ↗
                      </a>
                      <button className="adm-btn" onClick={() => copiar(o.link)}>
                        Copiar link
                      </button>
                    </>
                  )}
                  {apagavel && (
                    <button className="adm-btn adm-btn--perigo" onClick={() => apagar(o)}>
                      Apagar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtradas.length > limite && (
        <div className="adm-mais">
          <button className="adm-btn" onClick={() => setLimite((l) => l + POR_PAGINA)}>
            Mostrar mais {Math.min(POR_PAGINA, filtradas.length - limite)} ({filtradas.length - limite} restantes)
          </button>
        </div>
      )}
    </>
  );
}
