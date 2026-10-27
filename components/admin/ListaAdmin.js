"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { categorias } from "../../data/ofertas";
import { calcularDesconto, formatarPreco, estaExpirada } from "../../lib/ofertas";
import { DIAS_NO_SITE, DIAS_EXPIRADA_VISIVEL } from "../../lib/prazos.mjs";

const DIA = 86400000;

const nomeCategoria = (slug) => categorias.find((c) => c.slug === slug)?.nome ?? slug;

// Momento em que a oferta expira, pela mesma regra do site (lib/ofertas.js -> estaExpirada):
// o que vier primeiro entre o expires_at e publicada_em + DIAS_NO_SITE.
function momentoExpiracao(o) {
  const prazos = [];
  if (o.expires_at) prazos.push(new Date(o.expires_at).getTime());
  if (o.publicada_em) prazos.push(new Date(o.publicada_em).getTime() + DIAS_NO_SITE * DIA);
  return prazos.length ? Math.min(...prazos) : null;
}

// "em 2 dias", "em 5 horas", "em 20 minutos"
function falta(ms) {
  if (ms >= DIA) {
    const d = Math.ceil(ms / DIA);
    return `${d} ${d === 1 ? "dia" : "dias"}`;
  }
  if (ms >= 3600000) {
    const h = Math.ceil(ms / 3600000);
    return `${h} ${h === 1 ? "hora" : "horas"}`;
  }
  const m = Math.max(1, Math.ceil(ms / 60000));
  return `${m} min`;
}

const ESTILO_EXPIRADA = { background: "#fde2e2", color: "#b42318", fontWeight: 700 };
const ESTILO_NO_AR = { background: "#dcfce7", color: "#15803d", fontWeight: 700 };

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

  // Reativar conta como uma nova publicação: tira o expires_at e a oferta ganha
  // mais DIAS_NO_SITE dias no site. Vale para ofertas ocultas e para expiradas.
  const reativar = (o) => {
    const agora = new Date().toISOString();
    return atualizar(
      o.id,
      {
        ativa: true,
        oculta_manual: false,
        expires_at: null,
        publicada_em: agora,
        atualizado_em: agora,
      },
      `"${o.titulo}" reativada: fica no ar por mais ${DIAS_NO_SITE} dias.`
    );
  };

  // Expira agora: continua visível no site com a tag "Expirado" e desce para o fim
  const expirar = (o) =>
    atualizar(
      o.id,
      { expires_at: new Date().toISOString() },
      `"${o.titulo}" marcada como expirada.`
    );

  const reenviar = (o) =>
    atualizar(o.id, { postada_telegram_em: null }, "A oferta será reenviada ao Telegram no próximo ciclo do robô.");

  async function apagar(o) {
    if (!confirm(`Apagar "${o.titulo}"?`)) return;
    const { error } = await supabase.from("ofertas").delete().eq("id", o.id);
    setAviso(error ? error.message : "");
    carregar();
  }

  const filtradas = ofertas.filter((o) => {
    const expirada = estaExpirada(o);
    if (status === "no-ar" && (!o.ativa || expirada)) return false;
    if (status === "expiradas" && (!o.ativa || !expirada)) return false;
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
          <option value="no-ar">No ar (não expiradas)</option>
          <option value="expiradas">Expiradas</option>
          <option value="ocultas">Ocultas</option>
        </select>
        <select className="adm-input" value={origem} onChange={(e) => setOrigem(e.target.value)}>
          <option value="todas">Qualquer origem</option>
          <option value="manual">Cadastradas à mão</option>
          <option value="automatica">Automáticas (robô)</option>
          <option value="telegram">Importadas do Telegram</option>
          <option value="comunidade">Da comunidade</option>
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
          const apagavel = ["manual", "telegram", "comunidade"].includes(o.origem);
          const expirada = estaExpirada(o);
          const expiraEm = momentoExpiracao(o);
          const agora = Date.now();
          const apagaEm = expiraEm !== null ? expiraEm + DIAS_EXPIRADA_VISIVEL * DIA : null;

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
                    {{ manual: "Manual", telegram: "Telegram", comunidade: "Comunidade" }[o.origem] ?? "Automática"}
                  </span>

                  {/* Situação no site: oculta, expirada ou no ar */}
                  {!o.ativa && <span className="adm-etiqueta adm-etiqueta--cinza">Oculta</span>}
                  {o.ativa && expirada && (
                    <span className="adm-etiqueta" style={ESTILO_EXPIRADA}>
                      Expirada
                      {apagaEm !== null && apagaEm > agora && ` · apagada em ${falta(apagaEm - agora)}`}
                    </span>
                  )}
                  {o.ativa && !expirada && (
                    <span className="adm-etiqueta" style={ESTILO_NO_AR}>
                      No ar{expiraEm !== null && ` · expira em ${falta(expiraEm - agora)}`}
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