"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { categorias } from "../../data/ofertas";
import { calcularDesconto, formatarPreco } from "../../lib/ofertas";

const DIAS_NO_SITE = 5; // o mesmo valor do scripts/coletar.mjs

const nomeCategoria = (slug) => categorias.find((c) => c.slug === slug)?.nome ?? slug;

export default function ListaAdmin({ aoEditar }) {
  const [ofertas, setOfertas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState("");
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todas");
  const [origem, setOrigem] = useState("todas");

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from("ofertas")
      .select("*")
      .order("atualizado_em", { ascending: false })
      .limit(500);
    if (error) setAviso(error.message);
    else setOfertas(data ?? []);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function atualizar(id, campos, mensagem = "") {
    const { error } = await supabase.from("ofertas").update(campos).eq("id", id);
    setAviso(error ? error.message : mensagem);
    carregar();
  }

  const ocultar = (o) => atualizar(o.id, { ativa: false, oculta_manual: true });
  // Reativar conta como uma nova publicação: a oferta ganha mais DIAS_NO_SITE dias no site
  const reativar = (o) =>
    atualizar(o.id, {
      ativa: true,
      oculta_manual: false,
      publicada_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    });
  const reenviar = (o) =>
    atualizar(o.id, { postada_telegram_em: null }, "A oferta será reenviada ao Telegram no próximo ciclo do robô.");

  async function apagar(o) {
    if (!confirm(`Apagar "${o.titulo}"?`)) return;
    const { error } = await supabase.from("ofertas").delete().eq("id", o.id);
    setAviso(error ? error.message : "");
    carregar();
  }

  const filtradas = ofertas.filter((o) => {
    if (status === "ativas" && !o.ativa) return false;
    if (status === "ocultas" && o.ativa) return false;
    if (origem !== "todas" && (o.origem ?? "automatica") !== origem) return false;
    if (busca && !`${o.titulo} ${o.loja}`.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <h1>Ofertas</h1>
      <p className="adm-sub">
        {filtradas.length} de {ofertas.length} ofertas
      </p>

      <div className="adm-filtros">
        <input
          className="adm-input"
          type="search"
          placeholder="Buscar por título ou loja"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select className="adm-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="todas">Todas</option>
          <option value="ativas">Ativas</option>
          <option value="ocultas">Ocultas</option>
        </select>
        <select className="adm-input" value={origem} onChange={(e) => setOrigem(e.target.value)}>
          <option value="todas">Qualquer origem</option>
          <option value="manual">Cadastradas à mão</option>
          <option value="automatica">Automáticas (robô)</option>
          <option value="telegram">Importadas do Telegram</option>
        </select>
      </div>

      {aviso && <p className="adm-aviso">{aviso}</p>}
      {carregando && <p className="adm-centro">Carregando...</p>}
      {!carregando && filtradas.length === 0 && (
        <p className="adm-vazio">Nenhuma oferta encontrada com esses filtros.</p>
      )}

      <div className="adm-lista">
        {filtradas.map((o) => {
          const desconto = calcularDesconto(o);
          const apagavel = o.origem === "manual" || o.origem === "telegram";
          const diasRestantes = o.publicada_em
            ? Math.ceil((new Date(o.publicada_em).getTime() + DIAS_NO_SITE * 86400000 - Date.now()) / 86400000)
            : null;
          return (
            <div key={o.id} className={o.ativa ? "adm-linha" : "adm-linha adm-linha--oculta"}>
              <div className="adm-linha-info">
                <strong>{o.titulo}</strong>
                <div className="adm-linha-meta">
                  <span>{o.loja}</span>
                  <span>{nomeCategoria(o.categoria)}</span>
                  <span>
                    {formatarPreco(o.preco_atual)}
                    {desconto > 0 && ` (-${desconto}%)`}
                  </span>
                </div>
                <div className="adm-etiquetas">
                  <span className="adm-etiqueta">
                    {o.origem === "manual" ? "Manual" : o.origem === "telegram" ? "Telegram" : "Automática"}
                  </span>
                  {!o.ativa && <span className="adm-etiqueta adm-etiqueta--cinza">Oculta</span>}
                  {o.ativa && diasRestantes !== null && (
                    <span className="adm-etiqueta">
                      {diasRestantes > 0
                        ? `Sai do site em ${diasRestantes} ${diasRestantes === 1 ? "dia" : "dias"}`
                        : "Sai do site no próximo ciclo"}
                    </span>
                  )}
                  {o.relampago && <span className="adm-etiqueta adm-etiqueta--laranja">Relâmpago</span>}
                  {o.destaque && <span className="adm-etiqueta adm-etiqueta--laranja">Destaque</span>}
                  {o.selo && <span className="adm-etiqueta adm-etiqueta--amarela">{o.selo}</span>}
                  {o.cupom && <span className="adm-etiqueta">Cupom {o.cupom}</span>}
                  {o.postada_telegram_em && (
                    <span className="adm-etiqueta adm-etiqueta--verde">No Telegram</span>
                  )}
                </div>
              </div>

              <div className="adm-acoes">
                <button className="adm-btn" onClick={() => aoEditar(o)}>
                  Editar
                </button>
                <button
                  className="adm-btn"
                  onClick={() => atualizar(o.id, { relampago: !o.relampago })}
                >
                  {o.relampago ? "Tirar relâmpago" : "Marcar relâmpago"}
                </button>
                <button
                  className="adm-btn"
                  onClick={() => atualizar(o.id, { destaque: !o.destaque })}
                >
                  {o.destaque ? "Tirar destaque" : "Destacar"}
                </button>
                <button className="adm-btn" onClick={() => reenviar(o)}>
                  Reenviar ao Telegram
                </button>
                {o.ativa ? (
                  <button className="adm-btn" onClick={() => ocultar(o)}>
                    Ocultar
                  </button>
                ) : (
                  <button className="adm-btn" onClick={() => reativar(o)}>
                    Reativar
                  </button>
                )}
                {apagavel && (
                  <button className="adm-btn adm-btn--perigo" onClick={() => apagar(o)}>
                    Apagar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
