"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

// Nome de usuário a partir do nome da conta Google ("João da Silva" -> "joao_da_silva")
function nomeDoGoogle(usuario) {
  const meta = usuario?.user_metadata ?? {};
  const base = String(meta.full_name || meta.name || usuario?.email?.split("@")[0] || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
  return base.length >= 3 ? base : `membro_${Math.random().toString(36).slice(2, 7)}`;
}

function IconeGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default function Entrar() {
  const router = useRouter();
  const [modo, setModo] = useState("entrar"); // "entrar" ou "criar"
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [carregando, setCarregando] = useState(false);

  function trocarModo(novo) {
    setModo(novo);
    setErro("");
    setAviso("");
  }

  // Depois de entrar, volta para a página onde a pessoa estava (ex.: o produto)
  function destino() {
    const voltar = new URLSearchParams(window.location.search).get("voltar");
    return voltar && voltar.startsWith("/") && !voltar.startsWith("//") ? voltar : "/";
  }

  // Volta do Google: espera a sessão, cria o nome de usuário (se ainda não tiver) e segue
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const erroGoogle = params.get("error_description") || hash.get("error_description");
    if (erroGoogle) {
      setErro("Não foi possível entrar com o Google: " + erroGoogle);
      return;
    }
    if (params.get("google") !== "1") return;

    setCarregando(true);
    let feito = false;
    async function seguir(sessao) {
      if (feito || !sessao?.user) return;
      feito = true;
      if (!sessao.user.user_metadata?.nome) {
        await supabase.auth.updateUser({ data: { nome: nomeDoGoogle(sessao.user) } });
      }
      router.replace(destino());
      router.refresh();
    }
    const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => seguir(sessao));
    supabase.auth.getSession().then(({ data: d }) => seguir(d.session));
    // se em 15 s não chegou a sessão, libera a tela
    const limite = setTimeout(() => {
      if (!feito) {
        setCarregando(false);
        setErro("O login com o Google não terminou. Tente de novo.");
      }
    }, 15000);
    return () => {
      clearTimeout(limite);
      data.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function entrarComGoogle() {
    setErro("");
    setAviso("");
    setCarregando(true);
    const volta = new URL("/entrar", window.location.origin);
    volta.searchParams.set("google", "1");
    volta.searchParams.set("voltar", destino());
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: volta.toString(), queryParams: { prompt: "select_account" } },
    });
    if (error) {
      setCarregando(false);
      setErro("Não foi possível abrir o login do Google: " + error.message);
    }
  }

  async function enviar(e) {
    e.preventDefault();
    setErro("");
    setAviso("");

    if (modo === "criar") {
      if (!/^[A-Za-z0-9_]{3,20}$/.test(nome)) {
        setErro("O nome de usuário deve ter de 3 a 20 letras, números ou _ (sem espaços).");
        return;
      }
      if (senha.length < 6) {
        setErro("A senha precisa ter pelo menos 6 caracteres.");
        return;
      }
    }

    setCarregando(true);

    if (modo === "criar") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome } },
      });
      setCarregando(false);

      if (error) {
        setErro("Não foi possível criar a conta: " + error.message);
        return;
      }
      // Supabase devolve "identities" vazio quando o e-mail já tem cadastro
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setErro("Este e-mail já tem cadastro. Use a aba Entrar.");
        return;
      }
      if (data.session) {
        router.push(destino());
        router.refresh();
      } else {
        trocarModo("entrar");
        setAviso(
          "Conta criada! Enviamos um e-mail de confirmação. Clique no link dele e depois entre aqui."
        );
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        setErro("Confirme seu e-mail antes de entrar (veja a caixa de entrada e o spam).");
      } else if (error.message.includes("Invalid login credentials")) {
        setErro("E-mail ou senha incorretos.");
      } else {
        setErro("Não foi possível entrar: " + error.message);
      }
      return;
    }

    router.push(destino());
    router.refresh();
  }

  return (
    <main className="auth-pagina">
      <div className="auth-card">
        <div className="auth-topo">
          <Image
            src="/logo-mukiofertas.png"
            alt="Logo MukiOfertas"
            width={96}
            height={96}
            priority
            className="auth-logo"
          />
          <p className="auth-marca">
            <span className="auth-muki">Muki</span>
            <span className="auth-ofertas">Ofertas</span>
          </p>
        </div>

        <div className="auth-painel">
          <h1 className="auth-titulo">
            {modo === "entrar" ? "Bem-vindo de volta! 👋" : "Crie sua conta grátis 🎉"}
          </h1>
          <p className="auth-sub">
            {modo === "entrar"
              ? "Entre para comentar nas ofertas e ajudar a comunidade."
              : "Comente nas ofertas e avise a galera quando o preço mudar."}
          </p>

          <div className="auth-abas">
            <button
              type="button"
              className="auth-aba"
              aria-current={modo === "entrar" ? "page" : undefined}
              onClick={() => trocarModo("entrar")}
            >
              Entrar
            </button>
            <button
              type="button"
              className="auth-aba"
              aria-current={modo === "criar" ? "page" : undefined}
              onClick={() => trocarModo("criar")}
            >
              Criar conta
            </button>
          </div>

          <button
            type="button"
            onClick={entrarComGoogle}
            disabled={carregando}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              width: "100%",
              height: 46,
              marginBottom: 14,
              border: "1px solid #dadce0",
              borderRadius: 10,
              background: "#fff",
              color: "#1f1f1f",
              fontSize: 15,
              fontWeight: 600,
              cursor: carregando ? "default" : "pointer",
              opacity: carregando ? 0.7 : 1,
            }}
          >
            <IconeGoogle />
            {modo === "entrar" ? "Entrar com Google" : "Criar conta com Google"}
          </button>

          <div
            aria-hidden="true"
            style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 14px", color: "#94a3b8", fontSize: 13 }}
          >
            <span style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
            ou com e-mail
            <span style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
          </div>

          <form onSubmit={enviar} className="auth-form">
            {modo === "criar" && (
              <label>
                Nome de usuário
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="ex: joao_ofertas"
                  autoComplete="username"
                  required
                />
              </label>
            )}

            <label>
              E-mail
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                required
              />
            </label>

            <label>
              Senha
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="mínimo 6 caracteres"
                autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                required
              />
            </label>

            {erro && <p className="auth-erro">{erro}</p>}
            {aviso && <p className="auth-aviso">{aviso}</p>}

            <button type="submit" className="botao auth-enviar" disabled={carregando}>
              {carregando ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Criar conta"}
            </button>
          </form>
        </div>

        <Link href="/" className="auth-voltar">
          ← Voltar para as ofertas
        </Link>
      </div>
    </main>
  );
}