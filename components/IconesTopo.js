"use client";

// Ícones do cabeçalho, ao lado de "Olá, Entre ou Cadastre-se":
//   ♡  Lista de desejos (leva para /desejos, com a quantidade salva)
//   🔔 Alertas: abre um menu suspenso para pesquisar/criar um alerta, ver os alertas e as ofertas encontradas
// Salve como components/IconesTopo.js. Usado pelo components/Casca.js.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { carregarDesejos, ouvirDesejos } from "../lib/desejos";
import { IconeCoracao } from "./BotaoDesejo";

const CSS = `
  .it { display: flex; align-items: center; gap: 6px; margin-right: 14px; }
  .it-btn { position: relative; display: inline-flex; flex-direction: column; align-items: center; justify-content: center;
            gap: 2px; min-width: 52px; height: 46px; padding: 0 6px; border: 0; border-radius: 10px;
            background: transparent; color: #fff; font: inherit; font-size: 11px; font-weight: 600;
            text-decoration: none; cursor: pointer; transition: background .15s, color .15s; }
  .it-btn:hover, .it-btn[aria-expanded="true"] { background: rgba(255,255,255,.12); color: #ffb37a; }
  .it-num { position: absolute; top: 1px; left: calc(50% + 7px); min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px;
            background: #ff7a1a; color: #fff; font-size: 11px; font-weight: 800; line-height: 18px; text-align: center; }
  .it-caixa { position: relative; }
  .it-menu { position: absolute; top: calc(100% + 10px); right: -8px; z-index: 80; width: min(360px, calc(100vw - 24px));
             max-height: min(560px, calc(100vh - 140px)); overflow-y: auto;
             background: #fff; color: #0f172a; border-radius: 14px; box-shadow: 0 18px 48px rgba(15, 23, 42, .28);
             padding: 16px; font-size: 14px; text-align: left; }
  .it-menu h3 { margin: 0 0 4px; font-size: 16px; }
  .it-menu p { margin: 0 0 10px; color: #64748b; font-size: 13px; line-height: 1.4; }
  .it-form { display: grid; grid-template-columns: minmax(0, 1fr) 92px; gap: 8px; }
  .it-form input { height: 40px; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 10px; font: inherit; font-size: 14px; min-width: 0; }
  .it-form input:focus { outline: 2px solid #0a4bb8; outline-offset: 1px; }
  .it-form button, .it-entrar { grid-column: 1 / -1; height: 40px; border: 0; border-radius: 10px; background: #ff7a1a;
                                color: #fff; font: inherit; font-weight: 800; cursor: pointer; }
  .it-entrar { display: flex; align-items: center; justify-content: center; text-decoration: none; }
  .it-msg { margin: 8px 0 0 !important; font-weight: 600; }
  .it-msg--erro { color: #b91c1c !important; }
  .it-msg--ok { color: #15803d !important; }
  .it-menu .it-titulo { margin: 16px 0 8px; font-size: 12px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; color: #64748b; }
  .it-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .it-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 6px 5px 11px; border-radius: 999px;
             background: #eef2ff; color: #1e3a8a; font-size: 13px; font-weight: 700; }
  .it-chip small { font-weight: 600; color: #475569; }
  .it-chip button { width: 20px; height: 20px; border: 0; border-radius: 50%; background: rgba(30,58,138,.12); color: #1e3a8a;
                    font-size: 14px; line-height: 1; cursor: pointer; }
  .it-lista { list-style: none; margin: 0; padding: 0; }
  .it-lista li + li { border-top: 1px solid #f1f5f9; }
  .it-lista a { display: block; padding: 8px 0; color: #0f172a; text-decoration: none; line-height: 1.35; }
  .it-lista a:hover strong { color: #0a4bb8; }
  .it-lista a span { display: block; font-size: 12px; color: #64748b; }
  .it-novo { display: inline-block; width: 7px; height: 7px; margin-right: 6px; border-radius: 50%; background: #ff7a1a; vertical-align: middle; }
  .it-rodape { display: block; margin-top: 14px; text-align: center; color: #0a4bb8; font-weight: 700; text-decoration: none; }
  @media (max-width: 768px) {
    .it { margin-right: 6px; gap: 2px; }
    .it-btn { min-width: 40px; font-size: 0; gap: 0; }
    .it-num { left: calc(50% + 5px); }
    .it-menu { position: fixed; top: 70px; right: 12px; }
  }
`;

const preco = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function lerPreco(texto) {
  let t = String(texto ?? "").replace(/[^\d.,]/g, "");
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function IconeSino() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function SinoAlertas({ usuario }) {
  const [aberto, setAberto] = useState(false);
  const [alertas, setAlertas] = useState([]);
  const [avisos, setAvisos] = useState([]);
  const [termo, setTermo] = useState("");
  const [precoMax, setPrecoMax] = useState("");
  const [msg, setMsg] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const caixa = useRef(null);
  const campo = useRef(null);
  const pathname = usePathname();

  const naoLidos = avisos.filter((a) => !a.lido).length;

  async function carregar() {
    if (!usuario) return;
    const [a, b] = await Promise.all([
      supabase.from("alertas").select("id, termo, preco_max, ativo").order("criado_em", { ascending: false }).limit(20),
      supabase
        .from("avisos_alerta")
        .select("id, lido, criado_em, alerta:alertas(termo), oferta:ofertas(id, titulo, preco_atual, loja)")
        .order("criado_em", { ascending: false })
        .limit(6),
    ]);
    if (!a.error) setAlertas(a.data ?? []);
    if (!b.error) setAvisos((b.data ?? []).filter((x) => x.oferta));
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id]);

  useEffect(() => setAberto(false), [pathname]);

  // Fecha ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => caixa.current && !caixa.current.contains(e.target) && setAberto(false);
    const esc = (e) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    setTimeout(() => campo.current?.focus(), 50);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  async function abrir() {
    const vaiAbrir = !aberto;
    setAberto(vaiAbrir);
    setMsg(null);
    if (vaiAbrir && naoLidos > 0) {
      const ids = avisos.filter((a) => !a.lido).map((a) => a.id);
      await supabase.from("avisos_alerta").update({ lido: true }).in("id", ids);
      setAvisos((lista) => lista.map((a) => ({ ...a, lido: true, novo: ids.includes(a.id) })));
    }
  }

  async function criar(e) {
    e.preventDefault();
    const t = termo.replace(/\s+/g, " ").trim();
    if (t.length < 2) return setMsg({ erro: true, texto: "Digite o que você procura (ex.: air fryer)." });
    const max = precoMax.trim() ? lerPreco(precoMax) : null;
    if (precoMax.trim() && !max) return setMsg({ erro: true, texto: "Preço inválido. Ex.: 300 ou 1.299,90" });
    setSalvando(true);
    const { error } = await supabase.from("alertas").insert({ user_id: usuario.id, termo: t, preco_max: max });
    setSalvando(false);
    if (error) return setMsg({ erro: true, texto: error.message.includes("20 alertas") ? error.message : "Não foi possível criar o alerta." });
    setTermo("");
    setPrecoMax("");
    setMsg({ erro: false, texto: `Pronto! Vamos avisar quando aparecer "${t}"${max ? ` até ${preco(max)}` : ""}.` });
    carregar();
  }

  async function apagar(id) {
    setAlertas((l) => l.filter((a) => a.id !== id));
    await supabase.from("alertas").delete().eq("id", id);
  }

  return (
    <div className="it-caixa" ref={caixa}>
      <button type="button" className="it-btn" aria-expanded={aberto} aria-haspopup="dialog" onClick={abrir} title="Alertas de preço">
        <IconeSino />
        Alertas
        {naoLidos > 0 && <span className="it-num">{naoLidos}</span>}
      </button>

      {aberto && (
        <div className="it-menu" role="dialog" aria-label="Alertas de preço">
          <h3>🔔 Alertas de preço</h3>
          <p>Diga o que você quer comprar. Quando aparecer uma oferta assim, a gente te avisa.</p>

          {!usuario ? (
            <Link href={`/entrar?voltar=${encodeURIComponent(pathname)}`} className="it-entrar">
              Entrar para criar alertas
            </Link>
          ) : (
            <>
              <form className="it-form" onSubmit={criar}>
                <input
                  ref={campo}
                  value={termo}
                  onChange={(e) => setTermo(e.target.value)}
                  placeholder="Pesquisar: air fryer, PS5, iPhone..."
                  maxLength={60}
                  aria-label="O que você procura"
                />
                <input value={precoMax} onChange={(e) => setPrecoMax(e.target.value)} placeholder="Até R$" inputMode="decimal" aria-label="Preço máximo (opcional)" />
                <button disabled={salvando}>{salvando ? "Criando..." : "Criar alerta"}</button>
              </form>
              {msg && <p className={`it-msg ${msg.erro ? "it-msg--erro" : "it-msg--ok"}`}>{msg.texto}</p>}

              {alertas.length > 0 && (
                <>
                  <p className="it-titulo">Seus alertas</p>
                  <div className="it-chips">
                    {alertas.slice(0, 8).map((a) => (
                      <span key={a.id} className="it-chip" style={{ opacity: a.ativo ? 1 : 0.5 }}>
                        {a.termo}
                        {a.preco_max && <small>até {preco(a.preco_max)}</small>}
                        <button type="button" aria-label={`Apagar o alerta ${a.termo}`} onClick={() => apagar(a.id)}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </>
              )}

              {avisos.length > 0 && (
                <>
                  <p className="it-titulo">Encontramos para você</p>
                  <ul className="it-lista">
                    {avisos.map((v) => (
                      <li key={v.id}>
                        <Link href={`/oferta/${v.oferta.id}`}>
                          <strong>
                            {v.novo && <i className="it-novo" aria-label="novo" />}
                            {v.oferta.titulo}
                          </strong>
                          <span>
                            {preco(v.oferta.preco_atual)} na {v.oferta.loja} · alerta “{v.alerta?.termo}”
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <Link href="/alertas" className="it-rodape">
                Gerenciar meus alertas →
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function IconesTopo() {
  const [usuario, setUsuario] = useState(null);
  const [desejos, setDesejos] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUsuario(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUsuario(s?.user ?? null));
    carregarDesejos().then((ids) => setDesejos(ids?.size ?? 0));
    const parar = ouvirDesejos((ids) => setDesejos(ids?.size ?? 0));
    return () => {
      data.subscription.unsubscribe();
      parar();
    };
  }, []);

  return (
    <div className="it">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <Link href="/desejos" className="it-btn" title="Lista de desejos">
        <IconeCoracao tamanho={22} />
        Desejos
        {desejos > 0 && <span className="it-num">{desejos}</span>}
      </Link>
      <SinoAlertas usuario={usuario} />
    </div>
  );
}
