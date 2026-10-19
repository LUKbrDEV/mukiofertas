"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import Resumo from "./Resumo";
import ListaAdmin from "./ListaAdmin";
import FormOferta from "./FormOferta";
import "./admin.css";

const MENU = [
  { id: "resumo", nome: "Resumo" },
  { id: "ofertas", nome: "Ofertas" },
  { id: "form", nome: "Nova oferta" },
  { id: "vendas", nome: "Vendas" },
];

function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) setErro("E-mail ou senha incorretos.");
    setEnviando(false);
  }

  return (
    <div className="adm-login">
      <form onSubmit={entrar} className="adm-login-caixa">
        <h1>
          Muki<span>Ofertas</span>
        </h1>
        <p>Acesso restrito ao painel.</p>
        <label className="adm-campo">
          <span className="adm-rotulo">E-mail</span>
          <input
            className="adm-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="adm-campo">
          <span className="adm-rotulo">Senha</span>
          <input
            className="adm-input"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </label>
        <button className="adm-btn adm-btn--primario" disabled={enviando}>
          {enviando ? "Entrando..." : "Entrar"}
        </button>
        {erro && <p className="adm-erro">{erro}</p>}
      </form>
    </div>
  );
}

function Vendas() {
  return (
    <>
      <h1>Vendas e comissões</h1>
      <p className="adm-sub">De onde vêm esses números e o que o painel já mede.</p>

      <div className="adm-bloco">
        <h2>O que o MukiOfertas já mede</h2>
        <p>
          Cada clique em &quot;Ver oferta&quot; passa pelo site antes de ir à loja, e é contado.
          Veja os números na aba <strong>Resumo</strong>: cliques por dia, ofertas mais
          clicadas e de onde veio o clique (site ou Telegram).
        </p>
      </div>

      <div className="adm-bloco">
        <h2>Vendas e comissões</h2>
        <p>
          Quem sabe se uma compra foi concluída é a loja, e ela informa só ao programa de
          afiliados. Por isso as vendas e comissões ficam nos painéis da Lomadee, do Mercado
          Livre Afiliados, da Amazon Associates e dos outros programas em que você participa.
        </p>
        <p>
          Os cliques deste painel mostram o que dá resultado (quais ofertas, lojas e categorias
          atraem mais gente), e as comissões você confere em cada programa.
        </p>
      </div>

      <div className="adm-bloco">
        <h2>Próximo passo possível</h2>
        <p>
          Trazer para cá os pedidos da API da Lomadee, quando a chave de API estiver ativa. As
          vendas dos outros programas só entrariam se eles oferecerem uma API própria.
        </p>
      </div>
    </>
  );
}

export default function AdminApp() {
  const [sessao, setSessao] = useState(undefined); // undefined = ainda verificando
  const [aba, setAba] = useState("resumo");
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data: ouvinte } = supabase.auth.onAuthStateChange((_evento, nova) => {
      setSessao(nova);
    });
    return () => ouvinte.subscription.unsubscribe();
  }, []);

  if (sessao === undefined) return <p className="adm-centro">Carregando...</p>;
  if (!sessao) return <Login />;

  function irPara(id) {
    setEditando(null);
    setAba(id);
  }

  function editar(oferta) {
    setEditando(oferta);
    setAba("form");
  }

  function depoisDeSalvar() {
    setEditando(null);
    setAba("ofertas");
  }

  return (
    <div className="adm">
      <aside className="adm-lateral">
        <div className="adm-marca">
          Muki<span>Ofertas</span>
          <small>Painel admin</small>
        </div>

        <nav>
          {MENU.map((item) => (
            <button
              key={item.id}
              className={aba === item.id ? "adm-menu adm-menu--ativo" : "adm-menu"}
              onClick={() => irPara(item.id)}
            >
              {item.id === "form" && editando ? "Editar oferta" : item.nome}
            </button>
          ))}
        </nav>

        <div className="adm-rodape">
          <Link href="/" target="_blank">
            Ver o site
          </Link>
          <button onClick={() => supabase.auth.signOut()}>Sair</button>
        </div>
      </aside>

      <main className="adm-conteudo">
        {aba === "resumo" && <Resumo />}
        {aba === "ofertas" && <ListaAdmin aoEditar={editar} />}
        {aba === "form" && (
          <FormOferta
            key={editando?.id ?? "nova"}
            oferta={editando}
            aoSalvar={depoisDeSalvar}
          />
        )}
        {aba === "vendas" && <Vendas />}
      </main>
    </div>
  );
}
