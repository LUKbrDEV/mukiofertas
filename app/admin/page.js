"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Admin() {
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [ofertas, setOfertas] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setCarregando(false);
    });
    const { data: ouvinte } = supabase.auth.onAuthStateChange((_evento, nova) => {
      setSessao(nova);
    });
    return () => ouvinte.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (sessao) carregarOfertas();
  }, [sessao]);

  async function carregarOfertas() {
    const { data } = await supabase
      .from("ofertas")
      .select("*")
      .order("atualizado_em", { ascending: false })
      .limit(200);
    setOfertas(data ?? []);
  }

  async function entrar(e) {
    e.preventDefault();
    setErro("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) setErro("E-mail ou senha incorretos.");
  }

  async function alterar(id, campos) {
    await supabase.from("ofertas").update(campos).eq("id", id);
    carregarOfertas();
  }

  async function apagar(id) {
    if (!confirm("Apagar esta oferta?")) return;
    await supabase.from("ofertas").delete().eq("id", id);
    carregarOfertas();
  }

  if (carregando) return <p>Carregando...</p>;

  if (!sessao) {
    return (
      <form onSubmit={entrar} style={{ maxWidth: 320, display: "grid", gap: 10 }}>
        <h2>Entrar no painel</h2>
        <input type="email" placeholder="E-mail" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Senha" value={senha}
          onChange={(e) => setSenha(e.target.value)} required />
        <button type="submit" className="botao">Entrar</button>
        {erro && <p style={{ color: "#e11d48" }}>{erro}</p>}
      </form>
    );
  }

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2>Painel de ofertas ({ofertas.length})</h2>
        <button onClick={() => supabase.auth.signOut()}>Sair</button>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {ofertas.map((o) => (
          <div key={o.id} className="card" style={{ opacity: o.ativa ? 1 : 0.5 }}>
            <strong>{o.titulo}</strong>
            <span className="loja">
              {o.loja} · {o.categoria} · R$ {o.preco_atual}
            </span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => alterar(o.id, { ativa: !o.ativa })}>
                {o.ativa ? "Ocultar" : "Reativar"}
              </button>
              <button onClick={() => alterar(o.id, { relampago: !o.relampago })}>
                {o.relampago ? "Tirar relâmpago" : "⚡ Marcar relâmpago"}
              </button>
              <button onClick={() => apagar(o.id)}>Apagar</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}