"use client";

// Aba "Fila Mercado Livre" do painel admin.
// Salve como components/admin/FilaMercadoLivre.js
//
// O robô (scripts/fila-mercadolivre.mjs) acha ofertas nos mais vendidos do Mercado Livre e coloca aqui.
// 1) Marque as ofertas e clique em "Copiar links"
// 2) Cole no "Gerador de produtos recomendados" do ML (Central de afiliados) e clique em Gerar
// 3) Clique em "Copiar todos" no ML, cole na caixa de baixo e clique em "Publicar"
// Os links voltam na mesma ordem, então cada link é casado com a oferta da mesma posição.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { nomeCategoria } from "./util";

const reais = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function api(metodo, corpo) {
  const { data } = await supabase.auth.getSession();
  const r = await fetch("/api/admin/ml-fila", {
    method: metodo,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(json.erro || json.mensagem || `Erro ${r.status}`);
  return json;
}

export default function FilaMercadoLivre() {
  const [itens, setItens] = useState(null);
  const [marcados, setMarcados] = useState(new Set());
  const [copiados, setCopiados] = useState([]); // ids na ordem em que os links foram copiados
  const [colados, setColados] = useState("");
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function carregar() {
    setErro("");
    try {
      const { itens } = await api("GET");
      setItens(itens);
      // começa com as 20 de maior desconto marcadas
      setMarcados(new Set(itens.slice(0, 20).map((i) => i.id)));
    } catch (e) {
      setErro(e.message);
      setItens([]);
    }
  }
  useEffect(() => {
    carregar();
  }, []);

  const escolhidos = useMemo(() => (itens ?? []).filter((i) => marcados.has(i.id)), [itens, marcados]);
  const linksColados = colados
    .split(/\s+/)
    .map((l) => l.trim())
    .filter((l) => /^https?:\/\//i.test(l));

  function alternar(id) {
    const novo = new Set(marcados);
    novo.has(id) ? novo.delete(id) : novo.add(id);
    setMarcados(novo);
  }

  async function copiarLinks() {
    if (!escolhidos.length) return;
    await navigator.clipboard.writeText(escolhidos.map((i) => i.url).join("\n"));
    setCopiados(escolhidos.map((i) => i.id));
    setColados("");
    setAviso(`${escolhidos.length} links copiados. Cole no gerador do Mercado Livre e clique em Gerar.`);
  }

  async function publicar() {
    setErro("");
    if (linksColados.length !== copiados.length) {
      setErro(
        `Você copiou ${copiados.length} produtos, mas colou ${linksColados.length} links. Os números precisam ser iguais (os links casam pela ordem).`
      );
      return;
    }
    setOcupado(true);
    try {
      const r = await api("POST", { acao: "publicar", itens: copiados.map((id, i) => ({ id, link: linksColados[i] })) });
      setAviso(r.mensagem);
      setCopiados([]);
      setColados("");
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
    setOcupado(false);
  }

  async function descartar() {
    if (!escolhidos.length) return;
    setOcupado(true);
    try {
      const r = await api("POST", { acao: "descartar", ids: escolhidos.map((i) => i.id) });
      setAviso(r.mensagem);
      setCopiados([]);
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
    setOcupado(false);
  }

  return (
    <>
      <h1>Fila do Mercado Livre</h1>
      <p className="adm-sub">
        O robô acha as ofertas nos mais vendidos do Mercado Livre. Você só gera os links de afiliado e publica.
      </p>

      <section className="adm-bloco">
        <h2>Como publicar</h2>
        <ol style={{ margin: "6px 0 0 18px", lineHeight: 1.7 }}>
          <li>Marque as ofertas e clique em <strong>Copiar links</strong>.</li>
          <li>
            No Mercado Livre, abra <strong>Central de afiliados → Gerador de produtos recomendados</strong>, cole
            os links e clique em <strong>Gerar</strong>.
          </li>
          <li>
            No ML, clique em <strong>Copiar todos</strong>, cole na caixa abaixo e clique em <strong>Publicar</strong>.
          </li>
        </ol>
      </section>

      {aviso && (
        <p className="adm-aviso">
          {aviso}{" "}
          <button className="adm-aviso-fechar" onClick={() => setAviso("")} aria-label="Fechar aviso">
            ×
          </button>
        </p>
      )}
      {erro && <p className="adm-erro">{erro}</p>}

      {copiados.length > 0 && (
        <section className="adm-bloco">
          <h2>Cole aqui os {copiados.length} links gerados</h2>
          <textarea
            className="adm-input"
            rows={Math.min(12, Math.max(4, copiados.length))}
            placeholder={"https://meli.la/...\nhttps://meli.la/..."}
            value={colados}
            onChange={(e) => setColados(e.target.value)}
            style={{ width: "100%", fontFamily: "monospace" }}
          />
          <div className="adm-acoes" style={{ marginTop: 10, alignItems: "center", gap: 12 }}>
            <button className="adm-btn adm-btn--primario" onClick={publicar} disabled={ocupado || !linksColados.length}>
              {ocupado ? "Publicando..." : `Publicar ${linksColados.length || ""} oferta(s)`}
            </button>
            <span className="adm-legenda">
              {linksColados.length}/{copiados.length} links colados
            </span>
            <button className="adm-btn" onClick={() => setCopiados([])} disabled={ocupado}>
              Cancelar
            </button>
          </div>
        </section>
      )}

      <section className="adm-bloco">
        <div className="adm-titulo-linha">
          <h2 style={{ margin: 0 }}>
            {itens === null ? "Carregando..." : `${itens.length} oferta(s) esperando link`}
          </h2>
          <div className="adm-acoes">
            <button className="adm-btn" onClick={() => setMarcados(new Set((itens ?? []).map((i) => i.id)))}>
              Marcar todas
            </button>
            <button className="adm-btn" onClick={() => setMarcados(new Set())}>
              Desmarcar
            </button>
            <button className="adm-btn" onClick={carregar}>
              Atualizar
            </button>
          </div>
        </div>

        {itens?.length === 0 && !erro && (
          <p className="adm-vazio">Nenhuma oferta na fila agora. O robô procura de novo a cada 30 minutos.</p>
        )}

        {itens?.length > 0 && (
          <>
            <div className="adm-acoes" style={{ margin: "12px 0" }}>
              <button className="adm-btn adm-btn--primario" onClick={copiarLinks} disabled={!escolhidos.length || ocupado}>
                Copiar links ({escolhidos.length})
              </button>
              <button className="adm-btn" onClick={descartar} disabled={!escolhidos.length || ocupado}>
                Descartar marcadas
              </button>
            </div>

            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {itens.map((i) => (
                <li
                  key={i.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 56px 1fr auto",
                    gap: 12,
                    alignItems: "center",
                    padding: 8,
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    background: marcados.has(i.id) ? "#f0f7ff" : "#fff",
                  }}
                >
                  <input type="checkbox" checked={marcados.has(i.id)} onChange={() => alternar(i.id)} />
                  {i.imagem ? (
                    <img src={i.imagem} alt="" width={56} height={56} style={{ objectFit: "contain", borderRadius: 6 }} />
                  ) : (
                    <span />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <a href={i.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>
                      {i.titulo}
                    </a>
                    <div className="adm-legenda">
                      {nomeCategoria(i.categoria)} · de {reais(i.preco_antigo)} por <strong>{reais(i.preco_atual)}</strong>
                    </div>
                  </div>
                  <strong style={{ color: "#16a34a", whiteSpace: "nowrap" }}>{i.desconto}% OFF</strong>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
