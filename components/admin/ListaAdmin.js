"use client";

// Aba Ofertas do painel admin.
// Salve como components/admin/ListaAdmin.js.
//
// Tudo o que já existia continua: Editar, Relâmpago, Destaque, Reenviar ao Telegram, Reativar,
// Marcar como expirada, Ocultar, Ver no site, Abrir link, Copiar link, Apagar, troca rápida de
// categoria, filtros, ordenação e ações em massa.
// Novidades: atalhos com contagem, botões liga/desliga (📌 Inicial, ⭐ Destaque, ⚡ Relâmpago com horas),
// preço editável na própria linha e as ações menos usadas no menu "⋯".

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { categorias } from "../../data/ofertas";
import { calcularDesconto, formatarPreco, estaExpirada } from "../../lib/ofertas";
import { DIAS_NO_SITE, DIAS_EXPIRADA_VISIVEL } from "../../lib/prazos.mjs";
import { ehRelampago, tempoQueFalta, HORAS_RELAMPAGO_PADRAO } from "../../lib/relampago.mjs";
import { DIA, buscarTudo, nomeCategoria, nomeOrigem, momentoExpiracao, duracao, ha } from "./util";

const POR_PAGINA = 50;
const APAGAVEIS = ["manual", "telegram", "comunidade"];

const SITUACOES = [
  ["todas", "Todas as situações"],
  ["no-ar", "No ar (não expiradas)"],
  ["fixadas", "Fixadas na página inicial"],
  ["expiradas", "Expiradas"],
  ["ocultas", "Ocultas"],
  ["relampago", "Com Relâmpago"],
  ["super", "Com Super desconto"],
  ["destaque", "Com Destaque"],
  ["cupom", "Com cupom"],
  ["fila-telegram", "Na fila do Telegram"],
  ["sem-foto", "Sem foto"],
  ["outros", "Em \"Outras ofertas\""],
];

// Atalhos do topo (os mais usados), com a quantidade de cada um
const ATALHOS = [
  ["todas", "Todas"],
  ["no-ar", "🟢 No ar"],
  ["fixadas", "📌 Na inicial"],
  ["destaque", "⭐ Destaque"],
  ["relampago", "⚡ Relâmpago"],
  ["fila-telegram", "📨 Fila do Telegram"],
  ["expiradas", "⏰ Expiradas"],
  ["ocultas", "🙈 Ocultas"],
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

// Aceita "1.299,90" e também "1299.90"
function numero(valor) {
  const t = String(valor ?? "").trim();
  if (!t) return NaN;
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
}

function passaNaSituacao(o, status) {
  const expirada = estaExpirada(o);
  const noAr = o.ativa && !expirada;
  switch (status) {
    case "no-ar": return noAr;
    case "fixadas": return Boolean(o.fixada_home);
    case "expiradas": return o.ativa && expirada;
    case "ocultas": return !o.ativa;
    case "relampago": return ehRelampago(o);
    case "super": return Boolean(o.super_desconto);
    case "destaque": return Boolean(o.destaque);
    case "cupom": return Boolean(o.cupom);
    case "fila-telegram": return noAr && !o.postada_telegram_em;
    case "sem-foto": return !o.imagem;
    case "outros": return o.categoria === "outros";
    default: return true;
  }
}

// Pergunta por quantas horas a oferta fica em relâmpago (null = cancelou)
function perguntarHoras() {
  const r = prompt("A promoção relâmpago acaba em quantas horas?", String(HORAS_RELAMPAGO_PADRAO));
  if (r === null) return null;
  const h = numero(r);
  if (!(h > 0) || h > 72) {
    alert("Coloque um número de horas entre 0,25 e 72.");
    return null;
  }
  return new Date(Date.now() + h * 3600000).toISOString();
}

// Menu "⋯" com as ações menos usadas
function MenuMais({ children }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => caixa.current && !caixa.current.contains(e.target) && setAberto(false);
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);
  return (
    <div className="adm2-mais" ref={caixa}>
      <button className="adm-btn adm2-icone" aria-expanded={aberto} onClick={() => setAberto((a) => !a)} title="Mais ações">
        ⋯
      </button>
      {aberto && (
        <div className="adm2-menu" onClick={() => setAberto(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

// Preço editável na própria linha
function PrecoRapido({ oferta, aoSalvar }) {
  const [editando, setEditando] = useState(false);
  const [atual, setAtual] = useState("");
  const [antigo, setAntigo] = useState("");
  const desconto = calcularDesconto(oferta);

  function abrir() {
    setAtual(String(oferta.preco_atual ?? "").replace(".", ","));
    setAntigo(oferta.preco_antigo ? String(oferta.preco_antigo).replace(".", ",") : "");
    setEditando(true);
  }

  async function salvar(e) {
    e.preventDefault();
    const a = numero(atual);
    const b = antigo.trim() ? numero(antigo) : null;
    if (!(a > 0)) return alert("Preço atual inválido.");
    if (b !== null && !(b > a)) return alert("O preço antigo precisa ser maior que o atual.");
    await aoSalvar({ preco_atual: a, preco_antigo: b, atualizado_em: new Date().toISOString() });
    setEditando(false);
  }

  if (editando) {
    return (
      <form className="adm2-preco-form" onSubmit={salvar}>
        <input className="adm-input" value={atual} onChange={(e) => setAtual(e.target.value)} aria-label="Preço atual" autoFocus />
        <input className="adm-input" value={antigo} onChange={(e) => setAntigo(e.target.value)} placeholder="de (opcional)" aria-label="Preço antigo" />
        <button className="adm-btn adm-btn--primario">Salvar</button>
        <button type="button" className="adm-btn adm-btn--link" onClick={() => setEditando(false)}>
          Cancelar
        </button>
      </form>
    );
  }

  return (
    <button type="button" className="adm2-preco" onClick={abrir} title="Clique para mudar o preço">
      <b>{formatarPreco(oferta.preco_atual)}</b>
      {oferta.preco_antigo > oferta.preco_atual && <s>{formatarPreco(oferta.preco_antigo)}</s>}
      {desconto > 0 && <em>-{desconto}%</em>}
      <span aria-hidden="true">✏️</span>
    </button>
  );
}

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

  useEffect(() => {
    setLimite(POR_PAGINA);
  }, [busca, status, origem, loja, categoria, ordem]);

  // ---------- Ações de uma oferta ----------
  async function atualizar(id, campos, mensagem = "") {
    // muda na tela na hora; o banco confirma em seguida
    setOfertas((lista) => lista.map((o) => (o.id === id ? { ...o, ...campos } : o)));
    const { error } = await supabase.from("ofertas").update(campos).eq("id", id);
    setAviso(error ? error.message : mensagem);
    carregar();
  }

  const camposReativar = () => {
    const agora = new Date().toISOString();
    return { ativa: true, oculta_manual: false, expires_at: null, publicada_em: agora, atualizado_em: agora };
  };

  const ocultar = (o) => atualizar(o.id, { ativa: false, oculta_manual: true }, `"${o.titulo}" ocultada.`);
  const reativar = (o) =>
    atualizar(o.id, camposReativar(), `"${o.titulo}" reativada: fica no ar por mais ${DIAS_NO_SITE} dias.`);
  const expirar = (o) =>
    atualizar(o.id, { expires_at: new Date().toISOString() }, `"${o.titulo}" marcada como expirada.`);
  const reenviar = (o) =>
    atualizar(o.id, { postada_telegram_em: null }, "A oferta será reenviada ao Telegram no próximo ciclo do robô.");

  function alternarRelampago(o) {
    if (ehRelampago(o)) return atualizar(o.id, { relampago_ate: null }, `Relâmpago tirado de "${o.titulo}".`);
    const ate = perguntarHoras();
    if (ate) atualizar(o.id, { relampago_ate: ate }, `"${o.titulo}" é relâmpago até ${new Date(ate).toLocaleString("pt-BR")}.`);
  }

  function alternarInicial(o) {
    if (o.fixada_home) return atualizar(o.id, { fixada_home: false, fixada_ordem: null }, `"${o.titulo}" saiu da página inicial.`);
    const ultima = Math.max(0, ...ofertas.filter((x) => x.fixada_home).map((x) => x.fixada_ordem ?? 0));
    atualizar(o.id, { fixada_home: true, fixada_ordem: ultima + 1 }, `"${o.titulo}" fixada na página inicial.`);
  }

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
      setAviso("Não foi possível copiar. Use Abrir link.");
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

  async function fixarEmMassa() {
    const ids = [...selecionadas].filter((id) => !ofertas.find((o) => o.id === id)?.fixada_home);
    if (ids.length === 0) return setAviso("As selecionadas já estão na página inicial.");
    setTrabalhando(true);
    let ordemAtual = Math.max(0, ...ofertas.filter((x) => x.fixada_home).map((x) => x.fixada_ordem ?? 0));
    for (const id of ids) {
      ordemAtual += 1;
      await supabase.from("ofertas").update({ fixada_home: true, fixada_ordem: ordemAtual }).eq("id", id);
    }
    setTrabalhando(false);
    setAviso(`${ids.length} ofertas fixadas na página inicial.`);
    setSelecionadas(new Set());
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

  const contagens = useMemo(() => {
    const c = {};
    for (const [id] of ATALHOS) c[id] = ofertas.filter((o) => passaNaSituacao(o, id)).length;
    return c;
  }, [ofertas]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = ofertas.filter((o) => {
      if (!passaNaSituacao(o, status)) return false;
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
            {filtradas.length} de {ofertas.length} ofertas · clique no preço para mudar, no título para editar tudo
          </p>
        </div>
        <button className="adm-btn" onClick={carregar}>
          ↻ Atualizar
        </button>
      </div>

      {/* Atalhos com contagem */}
      <div className="adm2-atalhos" role="tablist" aria-label="Situação">
        {ATALHOS.map(([id, nome]) => (
          <button
            key={id}
            role="tab"
            aria-selected={status === id}
            className="adm2-atalho"
            onClick={() => setStatus(id)}
          >
            {nome} <span>{contagens[id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="adm-filtros adm2-filtros">
        <input
          className="adm-input adm-filtros-busca"
          type="search"
          placeholder="🔎 Buscar por título, loja ou cupom"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select className="adm-input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Situação">
          {SITUACOES.map(([valor, nome]) => (
            <option key={valor} value={valor}>
              {nome}
            </option>
          ))}
        </select>
        <select className="adm-input" value={origem} onChange={(e) => setOrigem(e.target.value)} aria-label="Origem">
          <option value="todas">Qualquer origem</option>
          <option value="manual">Cadastradas à mão</option>
          <option value="automatica">Automáticas (robô)</option>
          <option value="telegram">Importadas do Telegram</option>
          <option value="comunidade">Da comunidade</option>
        </select>
        <select className="adm-input" value={loja} onChange={(e) => setLoja(e.target.value)} aria-label="Loja">
          <option value="todas">Todas as lojas</option>
          {lojas.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select className="adm-input" value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria">
          <option value="todas">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.pai ? `— ${c.nome}` : c.nome}
            </option>
          ))}
        </select>
        <select className="adm-input" value={ordem} onChange={(e) => setOrdem(e.target.value)} aria-label="Ordem">
          {ORDENS.map(([valor, nome]) => (
            <option key={valor} value={valor}>
              Ordem: {nome}
            </option>
          ))}
        </select>
        <button className="adm-btn adm-btn--link" onClick={limparFiltros}>
          Limpar filtros
        </button>
      </div>

      {/* Barra de ações em massa (fica presa no topo quando há seleção) */}
      <div className={n > 0 ? "adm-massa adm-massa--ativa adm2-massa" : "adm-massa adm2-massa"}>
        <label className="adm-massa-check">
          <input type="checkbox" checked={todasVisiveisMarcadas} onChange={marcarVisiveis} />
          {n > 0 ? `${n} selecionada${n > 1 ? "s" : ""}` : "Selecionar as da página"}
        </label>
        {n > 0 && (
          <div className="adm-massa-acoes">
            <button className="adm-btn" disabled={trabalhando} onClick={fixarEmMassa}>
              📌 Fixar na inicial
            </button>
            <button
              className="adm-btn"
              disabled={trabalhando}
              onClick={() => emMassa({ fixada_home: false, fixada_ordem: null }, (q) => `${q} ofertas saíram da página inicial.`)}
            >
              Tirar da inicial
            </button>
            <button
              className="adm-btn"
              disabled={trabalhando}
              onClick={() => emMassa({ destaque: true }, (q) => `${q} ofertas destacadas.`)}
            >
              ⭐ Destacar
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
              onClick={() => {
                const ate = perguntarHoras();
                if (ate) emMassa({ relampago_ate: ate }, (q) => `${q} ofertas em relâmpago até ${new Date(ate).toLocaleString("pt-BR")}.`);
              }}
            >
              ⚡ Relâmpago
            </button>
            <button
              className="adm-btn"
              disabled={trabalhando}
              onClick={() => emMassa({ relampago_ate: null }, (q) => `Relâmpago tirado de ${q} ofertas.`)}
            >
              Tirar relâmpago
            </button>
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
              onClick={() =>
                emMassa({ postada_telegram_em: null }, (q) => `${q} ofertas serão reenviadas ao Telegram no próximo ciclo.`)
              }
            >
              Reenviar ao Telegram
            </button>
            <span className="adm-massa-grupo">
              <select className="adm-input" value={categoriaMassa} onChange={(e) => setCategoriaMassa(e.target.value)}>
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
                  emMassa({ categoria: categoriaMassa }, (q) => `${q} ofertas movidas para ${nomeCategoria(categoriaMassa)}.`)
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
      {!carregando && filtradas.length === 0 && <p className="adm-vazio">Nenhuma oferta encontrada com esses filtros.</p>}

      <div className="adm2-lista">
        {visiveis.map((o) => {
          const apagavel = APAGAVEIS.includes(o.origem);
          const expirada = estaExpirada(o);
          const expiraEm = momentoExpiracao(o);
          const saiEm = expiraEm !== null ? expiraEm + DIAS_EXPIRADA_VISIVEL * DIA : null;
          const total = cliques.get(o.id) ?? 0;
          const marcada = selecionadas.has(o.id);
          const relampago = ehRelampago(o);

          return (
            <div
              key={o.id}
              className={["adm2-oferta", !o.ativa && "adm2-oferta--oculta", expirada && "adm2-oferta--expirada", marcada && "adm2-oferta--marcada"]
                .filter(Boolean)
                .join(" ")}
            >
              <input
                type="checkbox"
                className="adm2-check"
                checked={marcada}
                onChange={() => marcar(o.id)}
                aria-label={`Selecionar ${o.titulo}`}
              />

              <button type="button" className="adm2-foto" onClick={() => aoEditar(o)} title="Editar">
                {o.imagem ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.imagem} alt="" loading="lazy" />
                ) : (
                  <span>sem foto</span>
                )}
              </button>

              <div className="adm2-corpo">
                <button type="button" className="adm2-titulo" onClick={() => aoEditar(o)} title="Editar a oferta">
                  {o.titulo}
                </button>

                <div className="adm2-meta">
                  <span className="adm2-loja">{o.loja}</span>
                  <PrecoRapido oferta={o} aoSalvar={(campos) => atualizar(o.id, campos, "Preço atualizado.")} />
                  <span title="Cliques em Ver oferta">👆 {total}</span>
                  <span title={o.publicada_em ? new Date(o.publicada_em).toLocaleString("pt-BR") : ""}>🕒 {ha(o.publicada_em)}</span>
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
                  {!o.ativa && <span className="adm-etiqueta adm-etiqueta--cinza">Oculta</span>}
                  {o.ativa && expirada && (
                    <span className="adm-etiqueta adm2-tag--vermelha">
                      Expirada{saiEm !== null && saiEm > agora ? ` · sai das listas em ${duracao(saiEm - agora)}` : " · fora das listas (página mantida)"}
                    </span>
                  )}
                  {o.ativa && !expirada && (
                    <span className="adm-etiqueta adm2-tag--verde">
                      No ar{expiraEm !== null && ` · expira em ${duracao(expiraEm - agora)}`}
                    </span>
                  )}
                  {o.super_desconto && <span className="adm-etiqueta adm-etiqueta--laranja">🔥 Super desconto</span>}
                  {o.selo && <span className="adm-etiqueta adm-etiqueta--amarela">{o.selo}</span>}
                  {o.cupom && <span className="adm-etiqueta">🎟️ {o.cupom}</span>}
                  {Number(o.nota) > 0 && <span className="adm-etiqueta">★ {Number(o.nota).toFixed(1)}</span>}
                  {o.renovacoes > 0 && <span className="adm-etiqueta">Renovada {o.renovacoes}x</span>}
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

              <div className="adm2-acoes">
                <div className="adm2-toggles">
                  <button
                    className="adm2-toggle"
                    aria-pressed={Boolean(o.fixada_home)}
                    onClick={() => alternarInicial(o)}
                    title={o.fixada_home ? "Tirar da página inicial" : "Fixar no topo da página inicial"}
                  >
                    📌 Inicial
                  </button>
                  <button
                    className="adm2-toggle"
                    aria-pressed={Boolean(o.destaque)}
                    onClick={() => atualizar(o.id, { destaque: !o.destaque })}
                    title={o.destaque ? "Tirar destaque" : "Destacar"}
                  >
                    ⭐ Destaque
                  </button>
                  <button
                    className="adm2-toggle"
                    aria-pressed={relampago}
                    onClick={() => alternarRelampago(o)}
                    title={relampago ? `Tirar relâmpago (acaba em ${tempoQueFalta(o.relampago_ate)})` : "Marcar relâmpago (com horas)"}
                  >
                    ⚡ {relampago ? tempoQueFalta(o.relampago_ate) : "Relâmpago"}
                  </button>
                </div>
                <div className="adm2-botoes">
                  <button className="adm-btn adm-btn--primario" onClick={() => aoEditar(o)}>
                    Editar
                  </button>
                  <a className="adm-btn adm2-icone" href={`/oferta/${o.id}`} target="_blank" rel="noopener noreferrer" title="Ver no site">
                    ↗
                  </a>
                  <MenuMais>
                    <button onClick={() => reenviar(o)}>📨 Reenviar ao Telegram</button>
                    {!o.ativa || expirada ? (
                      <button onClick={() => reativar(o)}>♻️ Reativar</button>
                    ) : (
                      <button onClick={() => expirar(o)}>⏰ Marcar como expirada</button>
                    )}
                    {o.ativa && <button onClick={() => ocultar(o)}>🙈 Ocultar</button>}
                    <a href={`/oferta/${o.id}`} target="_blank" rel="noopener noreferrer">
                      🌐 Ver no site
                    </a>
                    {o.link && (
                      <>
                        <a href={o.link} target="_blank" rel="noopener noreferrer nofollow">
                          🔗 Abrir link
                        </a>
                        <button onClick={() => copiar(o.link)}>📋 Copiar link</button>
                      </>
                    )}
                    {apagavel && (
                      <button className="adm2-menu-perigo" onClick={() => apagar(o)}>
                        🗑️ Apagar
                      </button>
                    )}
                  </MenuMais>
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
