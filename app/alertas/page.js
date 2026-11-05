"use client";

// Meus alertas: "me avise quando aparecer <palavra> até R$ X".
// Salve como app/alertas/page.js. Usa as tabelas alertas e avisos_alerta (supabase-melhorias.sql).
// O robô scripts/avisar-alertas.mjs confere as ofertas novas e cria os avisos.

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const CSS = `
  .al { max-width: 720px; margin: 18px auto 40px; }
  .al h1 { margin: 0 0 6px; font-size: 26px; color: #0f172a; }
  .al-sub { margin: 0 0 18px; color: #475569; line-height: 1.5; }
  .al-caixa { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 18px;
              box-shadow: 0 4px 16px rgba(15, 23, 42, .06); margin-bottom: 18px; }
  .al-form { display: grid; grid-template-columns: minmax(0, 1fr) 150px auto; gap: 10px; align-items: end; }
  .al-form label { display: flex; flex-direction: column; gap: 5px; font-size: 13px; font-weight: 700; color: #334155; }
  .al-form input { height: 42px; padding: 0 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 15px; }
  .al-form input:focus { outline: 2px solid #0a4bb8; outline-offset: 1px; }
  .al-btn { height: 42px; padding: 0 18px; border: none; border-radius: 10px; background: #ff7a1a; color: #fff;
            font-weight: 800; font-size: 15px; cursor: pointer; }
  .al-btn:disabled { opacity: .6; cursor: default; }
  .al-erro { margin: 10px 0 0; color: #b91c1c; font-weight: 600; font-size: 14px; }
  .al-ok { margin: 10px 0 0; color: #15803d; font-weight: 600; font-size: 14px; }
  .al-lista { list-style: none; margin: 0; padding: 0; }
  .al-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; }
  .al-item + .al-item { border-top: 1px solid #f1f5f9; }
  .al-termo { flex: 1; min-width: 0; }
  .al-termo strong { display: block; font-size: 16px; color: #0f172a; word-break: break-word; }
  .al-termo span { font-size: 13px; color: #64748b; }
  .al-mini { border: 1px solid #e2e8f0; background: #fff; border-radius: 8px; padding: 6px 10px; font-weight: 700;
             font-size: 13px; color: #334155; cursor: pointer; }
  .al-mini--perigo { color: #b91c1c; }
  .al-vazio { margin: 0; color: #64748b; }
  .al-avisos a { color: #0a4bb8; font-weight: 700; text-decoration: none; }
  @media (max-width: 600px) { .al-form { grid-template-columns: 1fr; } }
`;

const preco = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function lerPreco(texto) {
  let t = String(texto ?? "").replace(/[^\d.,]/g, "");
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

export default function PaginaAlertas() {
  const [usuario, setUsuario] = useState(undefined); // undefined = carregando
  const [alertas, setAlertas] = useState([]);
  const [avisos, setAvisos] = useState([]);
  const [termo, setTermo] = useState("");
  const [precoMax, setPrecoMax] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const [a, b] = await Promise.all([
      supabase.from("alertas").select("*").order("criado_em", { ascending: false }),
      supabase
        .from("avisos_alerta")
        .select("id, criado_em, alerta:alertas(termo), oferta:ofertas(id, titulo, preco_atual, loja)")
        .order("criado_em", { ascending: false })
        .limit(15),
    ]);
    if (a.error) setErro("Não foi possível carregar os alertas: " + a.error.message);
    else setAlertas(a.data ?? []);
    if (!b.error) setAvisos((b.data ?? []).filter((x) => x.oferta));
  }

  useEffect(() => {
    // ?termo=... vem do botão "Criar alerta" da página do produto
    const sugerido = new URLSearchParams(window.location.search).get("termo");
    if (sugerido) setTermo(sugerido.slice(0, 60));

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUsuario(u);
      if (u) carregar();
    });
  }, []);

  async function criar(e) {
    e.preventDefault();
    setErro("");
    setOk("");
    const t = termo.replace(/\s+/g, " ").trim();
    if (t.length < 2) return setErro("Escreva o que você procura (ex.: air fryer, PS5, iPhone 15).");
    const max = precoMax.trim() ? lerPreco(precoMax) : null;
    if (precoMax.trim() && !max) return setErro("O preço máximo não ficou certo. Ex.: 300 ou 1.299,90");

    setSalvando(true);
    const { error } = await supabase.from("alertas").insert({ user_id: usuario.id, termo: t, preco_max: max });
    setSalvando(false);
    if (error) return setErro(error.message.includes("20 alertas") ? error.message : "Não foi possível criar: " + error.message);
    setTermo("");
    setPrecoMax("");
    setOk(`Pronto! Vamos te avisar quando aparecer "${t}"${max ? ` até ${preco(max)}` : ""}.`);
    carregar();
  }

  async function alternar(a) {
    await supabase.from("alertas").update({ ativo: !a.ativo }).eq("id", a.id);
    carregar();
  }

  async function apagar(a) {
    await supabase.from("alertas").delete().eq("id", a.id);
    carregar();
  }

  if (usuario === undefined) return <div className="al"><style>{CSS}</style><p className="al-vazio">Carregando...</p></div>;

  if (!usuario) {
    return (
      <div className="al">
        <style>{CSS}</style>
        <h1>🔔 Alertas de preço</h1>
        <p className="al-sub">
          Diga o que você quer comprar e quanto quer pagar. Quando aparecer uma oferta assim no MukiOfertas,
          a gente te avisa.
        </p>
        <Link href="/entrar?voltar=/alertas" className="al-btn" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
          Entrar para criar alertas
        </Link>
      </div>
    );
  }

  return (
    <div className="al">
      <style>{CSS}</style>
      <h1>🔔 Alertas de preço</h1>
      <p className="al-sub">
        Diga o que você quer comprar e, se quiser, o preço máximo. Quando aparecer uma oferta assim no site,
        o aviso aparece aqui e no canto da tela quando você entrar.
      </p>

      <form className="al-caixa al-form" onSubmit={criar}>
        <label>
          O que você procura
          <input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Ex.: air fryer, PS5, iPhone 15" maxLength={60} />
        </label>
        <label>
          Até (opcional)
          <input value={precoMax} onChange={(e) => setPrecoMax(e.target.value)} placeholder="R$ 300" inputMode="decimal" />
        </label>
        <button className="al-btn" disabled={salvando}>
          {salvando ? "Criando..." : "Criar alerta"}
        </button>
        {erro && <p className="al-erro" style={{ gridColumn: "1 / -1" }}>{erro}</p>}
        {ok && <p className="al-ok" style={{ gridColumn: "1 / -1" }}>{ok}</p>}
      </form>

      <div className="al-caixa">
        <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Meus alertas ({alertas.length}/20)</h2>
        {alertas.length === 0 ? (
          <p className="al-vazio">Você ainda não tem alertas.</p>
        ) : (
          <ul className="al-lista">
            {alertas.map((a) => (
              <li key={a.id} className="al-item" style={{ opacity: a.ativo ? 1 : 0.55 }}>
                <span className="al-termo">
                  <strong>{a.termo}</strong>
                  <span>
                    {a.preco_max ? `até ${preco(a.preco_max)}` : "qualquer preço"}
                    {a.ultimo_aviso_em ? ` · último aviso ${new Date(a.ultimo_aviso_em).toLocaleDateString("pt-BR")}` : ""}
                    {!a.ativo && " · pausado"}
                  </span>
                </span>
                <button type="button" className="al-mini" onClick={() => alternar(a)}>
                  {a.ativo ? "Pausar" : "Ativar"}
                </button>
                <button type="button" className="al-mini al-mini--perigo" onClick={() => apagar(a)}>
                  Apagar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {avisos.length > 0 && (
        <div className="al-caixa al-avisos">
          <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Últimas ofertas encontradas</h2>
          <ul className="al-lista">
            {avisos.map((v) => (
              <li key={v.id} className="al-item">
                <span className="al-termo">
                  <Link href={`/oferta/${v.oferta.id}`}>{v.oferta.titulo}</Link>
                  <span>
                    {preco(v.oferta.preco_atual)} na {v.oferta.loja} · alerta “{v.alerta?.termo}” ·{" "}
                    {new Date(v.criado_em).toLocaleDateString("pt-BR")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
