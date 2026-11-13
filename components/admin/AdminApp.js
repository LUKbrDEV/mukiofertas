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
import OfertasAtencao from "./OfertasAtencao";
import ImportacaoTelegram from "./ImportacaoTelegram";
import ComandosVPS from "./ComandosVPS";
import AvisosComunidade from "./AvisosComunidade";
import "./admin.css";

// Menu lateral, em grupos. "Nova oferta" não está aqui: é o botão em destaque no topo do menu.
const MENU = [
  { id: "resumo", nome: "Resumo", icone: "📊", grupo: "Visão geral" },
  { id: "robo", nome: "Saúde do robô", icone: "🤖", grupo: "Visão geral" },
  { id: "ofertas", nome: "Todas as ofertas", icone: "🏷️", grupo: "Ofertas" },
  { id: "atencao", nome: "Precisam de atenção", icone: "⚠️", grupo: "Ofertas" },
  { id: "mlfila", nome: "Fila Mercado Livre", icone: "🛒", grupo: "Ofertas" },
  { id: "telegram", nome: "Canal do Telegram", icone: "📨", grupo: "Ofertas" },
  { id: "inicial", nome: "Página inicial", icone: "🏠", grupo: "Site" },
  { id: "cupons", nome: "Cupons", icone: "🎟️", grupo: "Site" },
  { id: "comunidade", nome: "Sugestões", icone: "💡", grupo: "Comunidade" },
  { id: "avisos", nome: "Avisos e alertas", icone: "🔔", grupo: "Comunidade" },
  { id: "usuarios", nome: "Usuários e tags", icone: "🏆", grupo: "Comunidade" },
  { id: "config", nome: "Configurações", icone: "⚙️", grupo: "Sistema" },
  { id: "vps", nome: "Comandos da VPS", icone: "🖥️", grupo: "Sistema" },
  { id: "vendas", nome: "Vendas", icone: "💰", grupo: "Sistema" },
];

// Grupos do menu, na ordem em que aparecem no topo
const GRUPOS = [
  { nome: "Visão geral", icone: "📊" },
  { nome: "Ofertas", icone: "🏷️" },
  { nome: "Site", icone: "🏠" },
  { nome: "Comunidade", icone: "👥" },
  { nome: "Sistema", icone: "⚙️" },
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

  // Grupo aberto no topo: o da aba atual (a tela de Nova/Editar oferta fica no grupo Ofertas)
  const grupoAtual = MENU.find((m) => m.id === aba)?.grupo ?? "Ofertas";

  return (
    <div className="adm adm3-layout">
      <header className="adm3-topo">
        <div className="adm3-topo-linha">
          <div className="adm-marca">
            Muki<span>Ofertas</span>
            <small>Painel admin</small>
          </div>

          {/* Grupos do menu (1ª linha). As abas do grupo escolhido aparecem na 2ª linha. */}
          <nav className="adm3-grupos" aria-label="Seções do painel">
            {GRUPOS.map((g) => (
              <button
                key={g.nome}
                className={grupoAtual === g.nome ? "adm3-grupo adm3-grupo--ativo" : "adm3-grupo"}
                onClick={() => irPara(MENU.find((m) => m.grupo === g.nome).id)}
              >
                <span aria-hidden="true">{g.icone}</span> {g.nome}
                {g.nome === "Comunidade" && pendentes > 0 && <span className="adm-menu-badge">{pendentes}</span>}
              </button>
            ))}
          </nav>

          <div className="adm3-topo-acoes">
            <button
              className={aba === "form" ? "adm3-nova adm3-nova--ativa" : "adm3-nova"}
              onClick={() => {
                if (editando || sugestao) return setAba("form");
                irPara("form");
              }}
            >
              {editando ? "✏️ Editando oferta" : sugestao ? "💡 Publicando sugestão" : "＋ Nova oferta"}
            </button>
            <Link className="adm3-topo-link" href="/" target="_blank" title="Abrir o site em outra aba">
              Ver o site ↗
            </Link>
            <button className="adm3-topo-link" onClick={() => supabase.auth.signOut()} title={sessao.user?.email ?? ""}>
              Sair
            </button>
          </div>
        </div>

        <nav className="adm3-abas" aria-label={grupoAtual}>
          {MENU.filter((m) => m.grupo === grupoAtual).map((item) => (
            <button
              key={item.id}
              className={aba === item.id ? "adm3-aba adm3-aba--ativa" : "adm3-aba"}
              onClick={() => irPara(item.id)}
            >
              <span aria-hidden="true">{item.icone}</span>
              {item.nome}
              {item.id === "comunidade" && pendentes > 0 && <span className="adm-menu-badge">{pendentes}</span>}
            </button>
          ))}
          {aba === "form" && (
            <span className="adm3-aba adm3-aba--ativa">
              {editando ? "✏️ Editar oferta" : sugestao ? "💡 Publicar sugestão" : "＋ Nova oferta"}
            </span>
          )}
          {admin === null && <small className="adm3-alerta-acesso">Rode o admin-painel.sql para ativar o controle de acesso</small>}
        </nav>
      </header>

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
        {aba === "robo" && <SaudeRobo irPara={irPara} />}
        {aba === "atencao" && <OfertasAtencao aoEditar={editar} />}
        {aba === "telegram" && (
          <>
            <h1>Canal do Telegram</h1>
            <p className="adm-sub">
              O que aconteceu com cada postagem do canal: quantas entraram no site e por que as outras ficaram de fora.
            </p>
            <ImportacaoTelegram />
          </>
        )}
        {aba === "avisos" && <AvisosComunidade />}
        {aba === "vps" && <ComandosVPS />}
        {aba === "config" && <Configuracoes />}
        {aba === "vendas" && <Vendas />}
      </main>
    </div>
  );
}
