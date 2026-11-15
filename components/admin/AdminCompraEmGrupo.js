"use client";

// Aba "Compra em grupo" do painel admin. Salve como components/admin/AdminCompraEmGrupo.js.
// Adiciona produtos à lista "Para abrir grupo" (cola o link do AliExpress), corrige o preço de grupo
// e remove produtos ou grupos com problema. Rota: app/api/admin/compra-em-grupo.

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

const vazio = { link: "", preco_grupo: "", link_grupo: "", faltam: "2" };
const ORIGENS = { telegram: "Telegram", comunidade: "Comunidade", admin: "Você" };
const preco = (v) => (v ? Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—");

async function chamar(metodo, corpo) {
  const { data } = await supabase.auth.getSession();
  const r = await fetch("/api/admin/compra-em-grupo", {
    method: metodo,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || `Erro ${r.status}`);
  return j;
}

export default function AdminCompraEmGrupo() {
  const [produtos, setProdutos] = useState([]);
  const [f, setF] = useState(vazio);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [filtro, setFiltro] = useState("todos"); // todos | abertos | telegram | comunidade | admin
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    try {
      const j = await chamar("GET");
      setProdutos(j.produtos ?? []);
    } catch (e) {
      setAviso(e.message);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const mudar = (campo, valor) => setF((atual) => ({ ...atual, [campo]: valor }));

  async function adicionar(e) {
    e.preventDefault();
    setErro("");
    setAviso("");
    if (!/aliexpress/i.test(f.link)) return setErro("Cole o link de um produto do AliExpress.");
    setSalvando(true);
    try {
      const j = await chamar("POST", { acao: "adicionar", ...f });
      setAviso(j.novo ? `Adicionado: ${j.titulo}` : `Atualizado (já estava na lista): ${j.titulo}`);
      setF(vazio);
      carregar();
    } catch (e2) {
      setErro(e2.message);
    }
    setSalvando(false);
  }

  async function acao(corpo, confirmar) {
    if (confirmar && !confirm(confirmar)) return;
    try {
      await chamar("POST", corpo);
      carregar();
    } catch (e) {
      setAviso(e.message);
    }
  }

  async function trocarPreco(p) {
    const novo = prompt(`Preço de grupo de "${p.titulo.slice(0, 50)}" (deixe vazio para apagar):`, p.preco_grupo ?? "");
    if (novo === null) return;
    acao({ acao: "preco", id: p.id, preco_grupo: novo });
  }

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return produtos.filter((p) => {
      if (filtro === "abertos" && !p.grupos.length) return false;
      if (["telegram", "comunidade", "admin"].includes(filtro) && (p.origem ?? "comunidade") !== filtro) return false;
      return !termo || p.titulo.toLowerCase().includes(termo) || p.id.includes(termo);
    });
  }, [produtos, filtro, busca]);

  const totalAbertos = produtos.reduce((s, p) => s + p.grupos.length, 0);

  return (
    <>
      <h1>Compra em grupo</h1>
      <p className="adm-sub">
        {produtos.length} produtos na lista · {totalAbertos} grupos abertos agora. Os produtos chegam sozinhos pelo Telegram
        (postagens de &quot;grupo de 3&quot; do AliExpress) e pela comunidade; aqui você adiciona à mão e tira o que tiver
        problema.
      </p>

      <form className="adm-form-simples" onSubmit={adicionar}>
        <label className="adm-campo">
          <span className="adm-rotulo">Link do produto no AliExpress</span>
          <input
            className="adm-input"
            type="url"
            placeholder="https://pt.aliexpress.com/item/....html ou https://a.aliexpress.com/_..."
            value={f.link}
            onChange={(e) => mudar("link", e.target.value)}
          />
          <small>Um produto que aceita grupo de 3 (aparece &quot;Compra em grupo&quot; no app). Título, foto e preço vêm sozinhos.</small>
        </label>
        <div className="adm-duas-colunas">
          <label className="adm-campo">
            <span className="adm-rotulo">Preço no grupo (R$)</span>
            <input className="adm-input" inputMode="decimal" placeholder="4,99" value={f.preco_grupo} onChange={(e) => mudar("preco_grupo", e.target.value)} />
            <small>Opcional, mas ajuda muito: é o preço que aparece em destaque.</small>
          </label>
          <label className="adm-campo">
            <span className="adm-rotulo">Link de um grupo aberto</span>
            <input className="adm-input" type="url" placeholder="https://a.aliexpress.com/_..." value={f.link_grupo} onChange={(e) => mudar("link_grupo", e.target.value)} />
            <small>Opcional. Se você criou um grupo, cole o convite aqui.</small>
          </label>
        </div>
        {f.link_grupo.trim() && (
          <label className="adm-campo" style={{ maxWidth: 220 }}>
            <span className="adm-rotulo">Quantas pessoas faltam?</span>
            <select className="adm-input" value={f.faltam} onChange={(e) => mudar("faltam", e.target.value)}>
              <option value="2">Faltam 2</option>
              <option value="1">Falta 1</option>
            </select>
          </label>
        )}
        {erro && <p className="adm-erro">{erro}</p>}
        <div className="adm-botoes-form">
          <button className="adm-btn adm-btn--primario" disabled={salvando}>
            {salvando ? "Buscando o produto..." : "Adicionar à lista"}
          </button>
        </div>
      </form>

      {aviso && <p className="adm-aviso">{aviso}</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", margin: "16px 0 10px" }}>
        {[
          ["todos", "Todos"],
          ["abertos", "Com grupo aberto"],
          ["telegram", "Vieram do Telegram"],
          ["comunidade", "Da comunidade"],
          ["admin", "Adicionados por você"],
        ].map(([id, nome]) => (
          <button key={id} type="button" className={filtro === id ? "adm-btn adm-btn--primario" : "adm-btn"} onClick={() => setFiltro(id)}>
            {nome}
          </button>
        ))}
        <input className="adm-input" style={{ maxWidth: 260 }} placeholder="Buscar pelo nome ou código" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {lista.length === 0 && <p className="adm-vazio">Nenhum produto aqui.</p>}

      <div className="adm-lista">
        {lista.map((p) => (
          <div key={p.id} className="adm-linha">
            <div className="adm-linha-info">
              <strong>
                <a href={`/compra-em-grupo/p/${p.id}`} target="_blank" rel="noreferrer">
                  {p.titulo}
                </a>
              </strong>
              <div className="adm-linha-meta">
                <span>Grupo: {preco(p.preco_grupo)}</span>
                <span>Sozinho: {preco(p.preco_normal)}</span>
                <span>{p.grupos_criados ?? 0} grupos criados</span>
                <span>{(p.visualizacoes ?? 0).toLocaleString("pt-BR")} visualizações</span>
                <span>Código {p.id}</span>
              </div>
              <div className="adm-etiquetas">
                <span className="adm-etiqueta adm-etiqueta--cinza">{ORIGENS[p.origem] ?? "Comunidade"}</span>
                {p.grupos.length > 0 && <span className="adm-etiqueta adm-etiqueta--verde">{p.grupos.length} aberto(s)</span>}
                {!p.link_afiliado && <span className="adm-etiqueta adm-etiqueta--cinza">Sem link de afiliado</span>}
              </div>
              {p.grupos.map((g) => (
                <div key={g.id} className="adm-linha-meta" style={{ marginTop: 6 }}>
                  <span>
                    👥 {g.faltam === 1 ? "falta 1" : `faltam ${g.faltam}`} · {g.autor_nome || "—"}
                    {g.avisos_fechado ? ` · ${g.avisos_fechado} aviso(s) de fechado` : ""}
                  </span>
                  <a href={g.link} target="_blank" rel="noreferrer">
                    abrir grupo
                  </a>
                  <button
                    type="button"
                    className="adm-btn adm-btn--perigo"
                    style={{ padding: "2px 8px", fontSize: 12 }}
                    onClick={() => acao({ acao: "remover_grupo", id: g.id }, "Tirar este grupo do mural?")}
                  >
                    Tirar grupo
                  </button>
                </div>
              ))}
            </div>
            <div className="adm-acoes">
              <button className="adm-btn" onClick={() => trocarPreco(p)}>
                Preço de grupo
              </button>
              <button
                className="adm-btn adm-btn--perigo"
                onClick={() => acao({ acao: "remover_produto", id: p.id }, `Apagar "${p.titulo.slice(0, 60)}" e os grupos dele?`)}
              >
                Apagar
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
