"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const vazio = { loja: "", codigo: "", descricao: "", link: "", validade: "" };

export default function AdminCupons() {
  const [cupons, setCupons] = useState([]);
  const [f, setF] = useState(vazio);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from("cupons")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(200);
    if (error) setAviso(`${error.message} (o arquivo supabase-comunidade.sql foi executado no Supabase?)`);
    else setCupons(data ?? []);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const mudar = (campo, valor) => setF((atual) => ({ ...atual, [campo]: valor }));

  async function salvar(e) {
    e.preventDefault();
    setErro("");

    if (!f.loja.trim()) return setErro("Informe a loja.");
    if (!f.codigo.trim()) return setErro("Informe o código do cupom.");
    if (!f.descricao.trim()) return setErro("Descreva o desconto (ex.: 10% em eletrônicos).");
    if (f.link.trim() && !/^https?:\/\//i.test(f.link.trim()))
      return setErro("O link precisa começar com http:// ou https://");

    setSalvando(true);
    const { error } = await supabase.from("cupons").insert({
      loja: f.loja.trim(),
      codigo: f.codigo.trim().toUpperCase(),
      descricao: f.descricao.trim(),
      link: f.link.trim() || null,
      validade: f.validade || null,
    });
    setSalvando(false);

    if (error) return setErro(`Não foi possível salvar: ${error.message}`);
    setF(vazio);
    carregar();
  }

  async function alternar(c) {
    const { error } = await supabase.from("cupons").update({ ativo: !c.ativo }).eq("id", c.id);
    setAviso(error ? error.message : "");
    carregar();
  }

  async function apagar(c) {
    if (!confirm(`Apagar o cupom ${c.codigo}?`)) return;
    const { error } = await supabase.from("cupons").delete().eq("id", c.id);
    setAviso(error ? error.message : "");
    carregar();
  }

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <>
      <h1>Cupons</h1>
      <p className="adm-sub">Cupons avulsos da aba Cupons. Ofertas com cupom aparecem lá automaticamente.</p>

      <form className="adm-form-simples" onSubmit={salvar}>
        <div className="adm-duas-colunas">
          <label className="adm-campo">
            <span className="adm-rotulo">Loja</span>
            <input className="adm-input" value={f.loja} onChange={(e) => mudar("loja", e.target.value)} />
          </label>
          <label className="adm-campo">
            <span className="adm-rotulo">Código</span>
            <input
              className="adm-input"
              value={f.codigo}
              onChange={(e) => mudar("codigo", e.target.value)}
              maxLength={40}
            />
          </label>
        </div>
        <label className="adm-campo">
          <span className="adm-rotulo">Descrição do desconto</span>
          <input
            className="adm-input"
            placeholder="10% de desconto em eletrônicos"
            value={f.descricao}
            onChange={(e) => mudar("descricao", e.target.value)}
            maxLength={160}
          />
        </label>
        <div className="adm-duas-colunas">
          <label className="adm-campo">
            <span className="adm-rotulo">Link da loja</span>
            <input
              className="adm-input"
              type="url"
              placeholder="https://..."
              value={f.link}
              onChange={(e) => mudar("link", e.target.value)}
            />
            <small>Opcional. Use o seu link de afiliado.</small>
          </label>
          <label className="adm-campo">
            <span className="adm-rotulo">Válido até</span>
            <input
              className="adm-input"
              type="date"
              value={f.validade}
              onChange={(e) => mudar("validade", e.target.value)}
            />
            <small>Opcional. Depois da data, o cupom some do site.</small>
          </label>
        </div>
        {erro && <p className="adm-erro">{erro}</p>}
        <div className="adm-botoes-form">
          <button className="adm-btn adm-btn--primario" disabled={salvando}>
            {salvando ? "Salvando..." : "Cadastrar cupom"}
          </button>
        </div>
      </form>

      {aviso && <p className="adm-aviso">{aviso}</p>}
      {cupons.length === 0 && <p className="adm-vazio">Nenhum cupom cadastrado.</p>}

      <div className="adm-lista">
        {cupons.map((c) => {
          const expirado = c.validade && c.validade < hoje;
          return (
            <div key={c.id} className={c.ativo && !expirado ? "adm-linha" : "adm-linha adm-linha--oculta"}>
              <div className="adm-linha-info">
                <strong>
                  {c.codigo} <span className="adm-linha-meta">{c.loja}</span>
                </strong>
                <div className="adm-linha-meta">
                  <span>{c.descricao}</span>
                  {c.validade && <span>Até {c.validade.split("-").reverse().join("/")}</span>}
                </div>
                <div className="adm-etiquetas">
                  {expirado && <span className="adm-etiqueta adm-etiqueta--cinza">Expirado</span>}
                  {!c.ativo && <span className="adm-etiqueta adm-etiqueta--cinza">Oculto</span>}
                  {c.ativo && !expirado && <span className="adm-etiqueta adm-etiqueta--verde">No site</span>}
                </div>
              </div>
              <div className="adm-acoes">
                <button className="adm-btn" onClick={() => alternar(c)}>
                  {c.ativo ? "Ocultar" : "Mostrar"}
                </button>
                <button className="adm-btn adm-btn--perigo" onClick={() => apagar(c)}>
                  Apagar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
