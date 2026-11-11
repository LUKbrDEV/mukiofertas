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
import PaginaInicial from "./PaginaInicial";
import FilaMercadoLivre from "./FilaMercadoLivre";
import DoisFatores from "./DoisFatores";
import "./admin.css";

const MENU = [
  { id: "resumo", nome: "Resumo", icone: "📊", grupo: "Geral" },
  { id: "ofertas", nome: "Ofertas", icone: "🏷️", grupo: "Conteúdo" },
  { id: "form", nome: "Nova oferta", icone: "➕", grupo: "Conteúdo" },
  { id: "inicial", nome: "Página inicial", icone: "🏠", grupo: "Conteúdo" },
  { id: "cupons", nome: "Cupons", icone: "🎟️", grupo: "Conteúdo" },
  { id: "mlfila", nome: "Fila Mercado Livre", icone: "🛒", grupo: "Conteúdo" },
  { id: "comunidade", nome: "Comunidade", icone: "👥", grupo: "Pessoas" },
  { id: "usuarios", nome: "Usuários e tags", icone: "🏆", grupo: "Pessoas" },
  { id: "robo", nome: "Saúde do robô", icone: "🤖", grupo: "Sistema" },
  { id: "config", nome: "Configurações", icone: "⚙️", grupo: "Sistema" },
  { id: "vendas", nome: "Vendas", icone: "💰", grupo: "Sistema" },
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
    // Ao voltar para a aba, o Supabase renova o login e avisa aqui. Isso não pode recarregar o painel:
    // só troca a sessão quando a PESSOA muda (entrou, saiu ou trocou de conta).
    const { data: ouvinte } = supabase.auth.onAuthStateChange((evento, nova) => {
      if (evento === "TOKEN_REFRESHED") return;
      setSessao((atual) => (atual && nova && atual.user?.id === nova.user?.id ? atual : nova));
    });
    return () => ouvinte.subscription.unsubscribe();
  }, []);

  // Confere se a conta é de administrador (tabela admins, criada pelo admin-painel.sql).
  // Se a função ainda não existir no banco, o painel abre como antes.
  // Primeiro confere só se o e-mail está na lista de admins (eh_admin_sem_2fa, criada pelo admin-2fa.sql);
  // a eh_admin "de verdade" só libera depois do 2FA.
  const usuarioId = sessao?.user?.id;
  useEffect(() => {
    if (!usuarioId) return;
    setAdmin(undefined);
    supabase.rpc("eh_admin_sem_2fa").then(async ({ data, error }) => {
      if (!error) return setAdmin(Boolean(data));
      const antiga = await supabase.rpc("eh_admin"); // admin-2fa.sql ainda não rodado
      setAdmin(antiga.error ? null : Boolean(antiga.data));
    });
  }, [usuarioId]);

  // Verificação em 2 etapas: "ok" = já passou; "cadastrar" = ainda não ativou; "verificar" = pedir o código
  const [nivel2fa, setNivel2fa] = useState(undefined);
  const [conferir2fa, setConferir2fa] = useState(0);
  useEffect(() => {
    if (!usuarioId || !admin) return;
    setNivel2fa(undefined);
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data, error }) => {
      if (error) return setNivel2fa("verificar");
      if (data.currentLevel === "aal2") setNivel2fa("ok");
      else if (data.nextLevel === "aal2") setNivel2fa("verificar");
      else setNivel2fa("cadastrar");
    });
  }, [usuarioId, admin, conferir2fa]);

  // Quantas sugestões da comunidade aguardam revisão (aparece no menu)
  useEffect(() => {
    if (!usuarioId || admin === false) return;
    supabase
      .from("sugestoes")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendente")
      .then(({ count }) => setPendentes(count ?? 0));
  }, [usuarioId, admin, aba]);

  if (sessao === undefined) return <p className="adm-centro">Carregando...</p>;
  if (!sessao) return <Login />;
  if (admin === undefined) return <p className="adm-centro">Verificando acesso...</p>;
  if (admin === false) return <SemAcesso email={sessao.user?.email} />;
  if (admin && nivel2fa === undefined) return <p className="adm-centro">Verificando acesso...</p>;
  if (admin && nivel2fa !== "ok")
    return (
      <DoisFatores
        key={nivel2fa}
        modo={nivel2fa}
        email={sessao.user?.email}
        aoConcluir={() => setConferir2fa((n) => n + 1)}
      />
    );

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
          {MENU.map((item, i) => (
            <div key={item.id} style={{ display: "contents" }}>
              {item.grupo !== MENU[i - 1]?.grupo && <span className="adm2-grupo">{item.grupo}</span>}
            <button
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
            </div>
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
        {aba === "inicial" && <PaginaInicial />}
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
        {aba === "mlfila" && <FilaMercadoLivre />}
        {aba === "robo" && <SaudeRobo aoEditar={editar} />}
        {aba === "config" && <Configuracoes />}
        {aba === "vendas" && <Vendas />}
      </main>
    </div>
  );
}
