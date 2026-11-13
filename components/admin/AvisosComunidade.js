"use client";

// Aba "Avisos e alertas" do painel admin (nova).
// Salve como components/admin/AvisosComunidade.js. Lê da rota app/api/admin/avisos/route.js.
//
// 1) Avisos dos visitantes: botão "O preço subiu ou a oferta acabou?" / "O cupom não funcionou?".
//    Com X pessoas (Configurações → Validade) a oferta expira sozinha; aqui dá para expirar na hora.
// 2) Alertas de preço que os membros criaram: o que o público está procurando (ideia de ofertas para buscar).

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { formatarPreco } from "../../lib/ofertas";
import { ha } from "./util";

async function token() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
}

export default function AvisosComunidade() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState("avisos");
  const [expirando, setExpirando] = useState(null);
  const [aviso, setAviso] = useState("");

  const carregar = useCallback(async () => {
    setErro("");
    const r = await fetch("/api/admin/avisos", { headers: { Authorization: `Bearer ${await token()}` }, cache: "no-store" });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) return setErro(json.erro || "Não foi possível carregar os avisos.");
    setDados(json);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Administrador logado: a rota do botão do site expira a oferta na hora
  // (e, se tiver cupom, as outras ofertas da mesma loja com o mesmo cupom)
  async function expirar(item) {
    if (!confirm(`Marcar como Expirada agora?\n\n${item.oferta?.titulo ?? ""}`)) return;
    setExpirando(item.oferta_id);
    const r = await fetch("/api/oferta/aviso-preco", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ id: item.oferta_id }),
    });
    const json = await r.json().catch(() => ({}));
    setExpirando(null);
    setAviso(r.ok ? `Expirada${json.junto ? ` (e mais ${json.junto} com o mesmo cupom)` : ""}.` : json.erro || "Não foi possível expirar.");
    carregar();
  }

  if (erro) return <p className="adm-aviso">{erro}</p>;
  if (!dados) return <p className="adm-centro">Carregando avisos...</p>;

  const { avisos, alertas } = dados;
  const agora = new Date().toISOString();
  const expirada = (o) => !o || !o.ativa || (o.expires_at && o.expires_at <= agora);
  const abertos = (avisos.lista ?? []).filter((a) => !expirada(a.oferta));

  return (
    <>
      <div className="adm-titulo-linha">
        <div>
          <h1>Avisos e alertas</h1>
          <p className="adm-sub">O que os visitantes estão avisando e procurando no site.</p>
        </div>
        <button className="adm-btn" onClick={carregar}>
          ↻ Atualizar
        </button>
      </div>

      <div className="adm2-atalhos" role="tablist">
        <button role="tab" className="adm2-atalho" aria-selected={aba === "avisos"} onClick={() => setAba("avisos")}>
          🚩 Avisos de preço/cupom <span>{avisos.erro ? "!" : abertos.length}</span>
        </button>
        <button role="tab" className="adm2-atalho" aria-selected={aba === "alertas"} onClick={() => setAba("alertas")}>
          🔔 Alertas de preço dos membros <span>{alertas.erro ? "!" : alertas.ativos}</span>
        </button>
      </div>

      {aviso && (
        <p className="adm-aviso">
          {aviso}
          <button className="adm-aviso-fechar" onClick={() => setAviso("")} aria-label="Fechar aviso">
            ×
          </button>
        </p>
      )}

      {aba === "avisos" &&
        (avisos.erro ? (
          <p className="adm-aviso">{avisos.erro}</p>
        ) : (
          <section className="adm-bloco">
            <p>
              Visitantes que clicaram em <strong>&quot;O preço subiu ou a oferta acabou?&quot;</strong> nos últimos{" "}
              {dados.dias} dias. Com <strong>{avisos.precisa} pessoas</strong> a oferta expira sozinha (muda em
              Configurações → Robô e validade). Ofertas ainda no ar aparecem primeiro.
            </p>
            {avisos.lista.length === 0 ? (
              <p className="adm-vazio">✅ Nenhum aviso nos últimos {dados.dias} dias.</p>
            ) : (
              <ul className="adm-alerta-lista" style={{ marginTop: 14 }}>
                {[...abertos, ...avisos.lista.filter((a) => expirada(a.oferta))].map((a) => {
                  const fora = expirada(a.oferta);
                  return (
                    <li key={a.oferta_id} style={fora ? { opacity: 0.6 } : undefined}>
                      <span className="adm-ranking-titulo">
                        {a.oferta?.titulo ?? `Oferta #${a.oferta_id} (apagada)`}
                        <small>
                          {a.pessoas} {a.pessoas === 1 ? "pessoa avisou" : "pessoas avisaram"} · último aviso {ha(a.ultimo)}
                          {a.oferta ? ` · ${a.oferta.loja} · ${formatarPreco(a.oferta.preco_atual)}` : ""}
                          {a.oferta?.cupom ? ` · cupom ${a.oferta.cupom}` : ""}
                          {fora ? " · já expirada" : ""}
                        </small>
                      </span>
                      {a.oferta && (
                        <span className="adm-alerta-acoes">
                          <a className="adm-btn" href={`/oferta/${a.oferta_id}`} target="_blank" rel="noopener noreferrer">
                            Ver ↗
                          </a>
                          {!fora && (
                            <button className="adm-btn adm-btn--perigo" disabled={expirando === a.oferta_id} onClick={() => expirar(a)}>
                              {expirando === a.oferta_id ? "..." : "Expirar"}
                            </button>
                          )}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}

      {aba === "alertas" &&
        (alertas.erro ? (
          <p className="adm-aviso">{alertas.erro}</p>
        ) : (
          <>
            <div className="adm3-placar">
              <div className="adm3-placar-item">
                <strong>{alertas.ativos}</strong> alertas ativos
              </div>
              <div className="adm3-placar-item adm3-placar-item--verde">
                <strong>{alertas.avisados}</strong> já receberam aviso
              </div>
              <div className="adm3-placar-item">
                <strong>{alertas.total}</strong> criados no total
              </div>
            </div>
            <div className="adm-duas" style={{ alignItems: "start" }}>
              <section className="adm-bloco">
                <h2>🔎 O que mais estão procurando</h2>
                <p>Boa pista de quais ofertas buscar para o site e para os grupos.</p>
                {alertas.maisPedidos.length === 0 ? (
                  <p className="adm-vazio">Nenhum alerta ativo ainda.</p>
                ) : (
                  <ul className="adm-ranking">
                    {alertas.maisPedidos.map((t, i) => (
                      <li key={t.termo}>
                        <span className="adm-pos">{i + 1}</span>
                        <span className="adm-ranking-titulo">{t.termo}</span>
                        <strong>{t.n}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="adm-bloco">
                <h2>🕒 Alertas mais recentes</h2>
                {alertas.recentes.length === 0 ? (
                  <p className="adm-vazio">Nenhum alerta ativo ainda.</p>
                ) : (
                  <ul className="adm-alerta-lista">
                    {alertas.recentes.map((a) => (
                      <li key={a.id}>
                        <span className="adm-ranking-titulo">
                          {a.termo}
                          <small>
                            {a.preco_max ? `até ${formatarPreco(a.preco_max)} · ` : ""}criado {ha(a.criado_em)}
                            {a.ultimo_aviso_em ? ` · último aviso ${ha(a.ultimo_aviso_em)}` : " · ainda sem aviso"}
                          </small>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        ))}
    </>
  );
}
