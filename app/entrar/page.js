"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

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
    // Depois de entrar, volta para a página onde a pessoa estava (ex.: o produto)
  function destino() {
    const voltar = new URLSearchParams(window.location.search).get("voltar");
    return voltar && voltar.startsWith("/") && !voltar.startsWith("//") ? voltar : "/";
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
}