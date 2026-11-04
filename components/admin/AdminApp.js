"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import Resumo from "./Resumo";
import ListaAdmin from "./ListaAdmin";
import FormOferta from "./FormOferta";
import ListaSugestoes from "./ListaSugestoes";
import AdminCupons from "./AdminCupons";
import SaudeRobo from "./SaudeRobo";
import Configuracoes from "./Configuracoes";
import UsuariosTags from "./UsuariosTags";
import "./admin.css";

const MENU = [
  { id: "resumo", nome: "Resumo", icone: "📊" },
  { id: "ofertas", nome: "Ofertas", icone: "🏷️" },
  { id: "form", nome: "Nova oferta", icone: "➕" },
  { id: "comunidade", nome: "Comunidade", icone: "👥" },
  { id: "usuarios", nome: "Usuários e tags", icone: "🏆" },
  { id: "cupons", nome: "Cupons", icone: "🎟️" },
  { id: "robo", nome: "Saúde do robô", icone: "🤖" },
  { id: "config", nome: "Configurações", icone: "⚙️" },
  { id: "vendas", nome: "Vendas", icone: "💰" },
];

// Tela para quem entrou com uma conta que não é de administrador
function SemAcesso({ email }) {
  return (
    <div className="adm-login">
      <div className="adm-login-caixa">
        <h1>
          Muki<span>Ofertas</span>
        </h1>
        <p>
          A conta <strong>{email}</strong> não tem acesso ao painel admin.
        </p>
        <p>
          Se ela deveria ter, coloque este e-mail na lista do passo 1 do arquivo <strong>admin-painel.sql</strong> e
          rode o arquivo de novo no Supabase.
        </p>
        <button className="adm-btn adm-btn--primario" onClick={() => supabase.auth.signOut()}>
          Sair
        </button>
      </div>
    </div>
  );
}

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
  const [sugestao, setSugestao] = useState(null); // sugestão da comunidade sendo revisada
  const [admin, setAdmin] = useState(undefined); // undefined = verificando; null = não deu para verificar
  const [pendentes, setPendentes] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data: ouvinte } = supabase.auth.onAuthStateChange((_evento, nova) => {
      setSessao(nova);
    });
    return () => ouvinte.subscription.unsubscribe();
  }, []);

  // Confere se a conta é de administrador (tabela admins, criada pelo admin-painel.sql).
  // Se a função ainda não existir no banco, o painel abre como antes.
  useEffect(() => {
    if (!sessao) return;
    setAdmin(undefined);
    supabase.rpc("eh_admin").then(({ data, error }) => setAdmin(error ? null : Boolean(data)));
  }, [sessao]);

  // Quantas sugestões da comunidade aguardam revisão (aparece no menu)
  useEffect(() => {
    if (!sessao || admin === false) return;
    supabase
      .from("sugestoes")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendente")
      .then(({ count }) => setPendentes(count ?? 0));
  }, [sessao, admin, aba]);

  if (sessao === undefined) return <p className="adm-centro">Carregando...</p>;
  if (!sessao) return <Login />;
  if (admin === undefined) return <p className="adm-centro">Verificando acesso...</p>;
  if (admin === false) return <SemAcesso email={sessao.user?.email} />;

  function irPara(id) {
    setEditando(null);
    setSugestao(null);
    setAba(id);
  }

  function editar(oferta) {
    setEditando(oferta);
    setAba("form");
  }

  function revisar(s) {
    setSugestao(s);
    setEditando(null);
    setAba("form");
  }

  function depoisDeSalvar() {
    const veioDaComunidade = Boolean(sugestao);
    setEditando(null);
    setSugestao(null);
    setAba(veioDaComunidade ? "comunidade" : "ofertas");
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
              <span className="adm-menu-icone" aria-hidden="true">
                {item.icone}
              </span>
              <span className="adm-menu-nome">
                {item.id === "form" && editando
                  ? "Editar oferta"
                  : item.id === "form" && sugestao
                    ? "Publicar sugestão"
                    : item.nome}
              </span>
              {item.id === "comunidade" && pendentes > 0 && <span className="adm-menu-badge">{pendentes}</span>}
            </button>
          ))}
        </nav>

        <div className="adm-rodape">
          {sessao.user?.email && <small className="adm-usuario">{sessao.user.email}</small>}
          {admin === null && (
            <small className="adm-usuario adm-usuario--alerta">Rode o admin-painel.sql para ativar o controle de acesso</small>
          )}
          <Link href="/" target="_blank">
            Ver o site
          </Link>
          <button onClick={() => supabase.auth.signOut()}>Sair</button>
        </div>
      </aside>

      <main className="adm-conteudo">
        {aba === "resumo" && <Resumo irPara={irPara} />}
        {aba === "ofertas" && <ListaAdmin aoEditar={editar} />}
        {aba === "form" && (
          <FormOferta
            key={editando ? `e${editando.id}` : sugestao ? `s${sugestao.id}` : "nova"}
            oferta={editando}
            sugestao={sugestao}
            aoSalvar={depoisDeSalvar}
          />
        )}
        {aba === "comunidade" && <ListaSugestoes aoRevisar={revisar} />}
        {aba === "usuarios" && <UsuariosTags />}
        {aba === "cupons" && <AdminCupons />}
        {aba === "robo" && <SaudeRobo aoEditar={editar} />}
        {aba === "config" && <Configuracoes />}
        {aba === "vendas" && <Vendas />}
      </main>
    </div>
  );
}
