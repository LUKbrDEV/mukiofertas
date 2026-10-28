"use client";

// Página "Meu perfil": foto ou ícone, nome de usuário, e-mail, senha e sair de todos os aparelhos.
// Salve como app/perfil/page.js (crie a pasta "perfil" dentro de "app").

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import Avatar, { CORES, ICONES, nomeDoUsuario } from "../../components/Avatar";

const BUCKET = "avatares";
const TAMANHO_FOTO = 256; // a foto é reduzida para 256x256 antes de enviar
const MAX_MB = 5;

const CSS = `
  .perfil { max-width: 760px; margin: 0 auto; padding: 8px 0 40px; display: flex; flex-direction: column; gap: 20px; }
  .perfil h1 { margin: 0; font-size: 28px; font-weight: 800; font-family: var(--fonte-titulo), system-ui, sans-serif; color: #0f172a; }
  .perfil-sub { margin: 4px 0 0; color: #64748b; }
  .perfil-caixa { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 22px; }
  .perfil-caixa h2 { margin: 0 0 4px; font-size: 18px; font-weight: 800; color: #0f172a; }
  .perfil-caixa > p { margin: 0 0 16px; color: #64748b; font-size: 14px; }
  .perfil-topo { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
  .perfil-topo-info strong { display: block; font-size: 20px; color: #0f172a; }
  .perfil-topo-info span { color: #64748b; font-size: 14px; }
  .perfil-rotulo { display: block; margin: 0 0 6px; font-size: 14px; font-weight: 600; color: #334155; }
  .perfil-campo { box-sizing: border-box; width: 100%; height: 44px; padding: 0 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 15px; background: #fff; color: #0f172a; }
  .perfil-campo:focus { outline: 2px solid #0a4bb8; outline-offset: 1px; border-color: transparent; }
  .perfil-grupo { display: flex; flex-direction: column; gap: 14px; }
  .perfil-linha { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-top: 4px; }
  .perfil-btn { height: 42px; padding: 0 18px; border: none; border-radius: 8px; background: #ff7a1a; color: #fff; font-weight: 700; font-size: 15px; cursor: pointer; }
  .perfil-btn:hover { background: #f06a0a; }
  .perfil-btn:disabled { opacity: .6; cursor: default; }
  .perfil-btn--claro { background: #f1f5f9; color: #0f172a; }
  .perfil-btn--claro:hover { background: #e2e8f0; }
  .perfil-btn--perigo { background: #fff; color: #b42318; border: 1px solid #fecaca; }
  .perfil-btn--perigo:hover { background: #fef2f2; }
  .perfil-msg { margin: 10px 0 0; font-size: 14px; }
  .perfil-msg--ok { color: #15803d; }
  .perfil-msg--erro { color: #b42318; }
  .perfil-icones { display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 8px; margin: 14px 0 12px; }
  .perfil-icone { height: 44px; border-radius: 50%; border: 2px solid transparent; background: #f1f5f9; font-size: 22px; cursor: pointer; }
  .perfil-icone[aria-pressed="true"] { border-color: #ff7a1a; background: #fff7ed; }
  .perfil-cores { display: flex; gap: 8px; flex-wrap: wrap; }
  .perfil-cor { width: 30px; height: 30px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 0 1px #cbd5e1; cursor: pointer; }
  .perfil-cor[aria-pressed="true"] { box-shadow: 0 0 0 2px #0f172a; }
  .perfil-ajuda { margin: 6px 0 0; font-size: 13px; color: #64748b; }
  @media (max-width: 600px) { .perfil-caixa { padding: 16px; } .perfil h1 { font-size: 24px; } }
`;

// Reduz e recorta a imagem em um quadrado, devolvendo um arquivo WebP leve
function prepararFoto(arquivo) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(arquivo);
    img.onload = () => {
      const lado = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = TAMANHO_FOTO;
      canvas.height = TAMANHO_FOTO;
      canvas
        .getContext("2d")
        .drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, TAMANHO_FOTO, TAMANHO_FOTO);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível ler a imagem"))), "image/webp", 0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Arquivo de imagem inválido"));
    };
    img.src = url;
  });
}

// Caminho do arquivo dentro do bucket a partir da URL pública
function caminhoNoBucket(url) {
  const marca = `/object/public/${BUCKET}/`;
  const i = String(url || "").indexOf(marca);
  return i >= 0 ? decodeURIComponent(url.slice(i + marca.length).split("?")[0]) : null;
}

function Mensagem({ msg }) {
  if (!msg) return null;
  return (
    <p className={`perfil-msg ${msg.ok ? "perfil-msg--ok" : "perfil-msg--erro"}`} role="status">
      {msg.texto}
    </p>
  );
}

export default function PaginaPerfil() {
  const router = useRouter();
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // Foto / ícone
  const [icone, setIcone] = useState("");
  const [cor, setCor] = useState(CORES[0]);
  const [msgAvatar, setMsgAvatar] = useState(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const entradaFoto = useRef(null);

  // Nome
  const [nome, setNome] = useState("");
  const [msgNome, setMsgNome] = useState(null);

  // E-mail
  const [email, setEmail] = useState("");
  const [msgEmail, setMsgEmail] = useState(null);

  // Senha
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [senhaConfirma, setSenhaConfirma] = useState("");
  const [msgSenha, setMsgSenha] = useState(null);

  const [salvando, setSalvando] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/entrar");
        return;
      }
      preencher(data.user);
      setCarregando(false);
    });
    const { data: escuta } = supabase.auth.onAuthStateChange((_e, sessao) => {
      if (sessao?.user) setUsuario(sessao.user);
    });
    return () => escuta.subscription.unsubscribe();
  }, [router]);

  function preencher(u) {
    setUsuario(u);
    setNome(nomeDoUsuario(u));
    setIcone(u.user_metadata?.avatar_icone || "");
    setCor(u.user_metadata?.avatar_cor || CORES[0]);
  }

  async function atualizarDados(dados) {
    const { data, error } = await supabase.auth.updateUser({ data: dados });
    if (error) throw error;
    preencher(data.user);
  }

  // ---------- Foto ----------
  async function enviarFoto(evento) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) {
      setMsgAvatar({ ok: false, texto: "Escolha um arquivo de imagem (JPG, PNG ou WebP)." });
      return;
    }
    if (arquivo.size > MAX_MB * 1024 * 1024) {
      setMsgAvatar({ ok: false, texto: `A imagem pode ter no máximo ${MAX_MB} MB.` });
      return;
    }

    setEnviandoFoto(true);
    setMsgAvatar(null);
    try {
      const foto = await prepararFoto(arquivo);
      const caminho = `${usuario.id}/${Date.now()}.webp`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(caminho, foto, { contentType: "image/webp", cacheControl: "31536000" });
      if (error) throw error;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
      const antiga = caminhoNoBucket(usuario.user_metadata?.avatar_url);
      await atualizarDados({ avatar_url: data.publicUrl, avatar_icone: null });
      if (antiga) await supabase.storage.from(BUCKET).remove([antiga]);
      setMsgAvatar({ ok: true, texto: "Foto atualizada." });
    } catch (erro) {
      setMsgAvatar({ ok: false, texto: `Não foi possível enviar a foto: ${erro.message}` });
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function salvarIcone() {
    setSalvando("icone");
    setMsgAvatar(null);
    try {
      const antiga = caminhoNoBucket(usuario.user_metadata?.avatar_url);
      await atualizarDados({ avatar_icone: icone || null, avatar_cor: cor, avatar_url: null });
      if (antiga) await supabase.storage.from(BUCKET).remove([antiga]);
      setMsgAvatar({ ok: true, texto: icone ? "Ícone salvo." : "Agora seu perfil mostra a inicial do nome." });
    } catch (erro) {
      setMsgAvatar({ ok: false, texto: erro.message });
    } finally {
      setSalvando("");
    }
  }

  // ---------- Nome ----------
  async function salvarNome(e) {
    e.preventDefault();
    const limpo = nome.trim().replace(/\s+/g, " ");
    if (limpo.length < 3 || limpo.length > 30) {
      setMsgNome({ ok: false, texto: "O nome precisa ter entre 3 e 30 caracteres." });
      return;
    }
    setSalvando("nome");
    try {
      await atualizarDados({ nome: limpo });
      setMsgNome({ ok: true, texto: "Nome de usuário atualizado." });
    } catch (erro) {
      setMsgNome({ ok: false, texto: erro.message });
    } finally {
      setSalvando("");
    }
  }

  // ---------- E-mail ----------
  async function salvarEmail(e) {
    e.preventDefault();
    const novo = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novo)) {
      setMsgEmail({ ok: false, texto: "Digite um e-mail válido." });
      return;
    }
    if (novo === usuario.email) {
      setMsgEmail({ ok: false, texto: "Esse já é o seu e-mail atual." });
      return;
    }
    setSalvando("email");
    try {
      const { error } = await supabase.auth.updateUser(
        { email: novo },
        { emailRedirectTo: `${window.location.origin}/perfil` }
      );
      if (error) throw error;
      setEmail("");
      setMsgEmail({
        ok: true,
        texto: `Enviamos um link de confirmação para ${novo}. O e-mail só muda depois que você clicar nele.`,
      });
    } catch (erro) {
      setMsgEmail({ ok: false, texto: erro.message });
    } finally {
      setSalvando("");
    }
  }

  // ---------- Senha ----------
  async function salvarSenha(e) {
    e.preventDefault();
    if (senhaNova.length < 8) {
      setMsgSenha({ ok: false, texto: "A nova senha precisa ter pelo menos 8 caracteres." });
      return;
    }
    if (senhaNova !== senhaConfirma) {
      setMsgSenha({ ok: false, texto: "A confirmação não é igual à nova senha." });
      return;
    }
    setSalvando("senha");
    try {
      // Confere a senha atual antes de trocar
      const { error: erroLogin } = await supabase.auth.signInWithPassword({
        email: usuario.email,
        password: senhaAtual,
      });
      if (erroLogin) throw new Error("A senha atual está incorreta.");

      const { error } = await supabase.auth.updateUser({ password: senhaNova });
      if (error) throw error;
      setSenhaAtual("");
      setSenhaNova("");
      setSenhaConfirma("");
      setMsgSenha({ ok: true, texto: "Senha alterada." });
    } catch (erro) {
      setMsgSenha({ ok: false, texto: erro.message });
    } finally {
      setSalvando("");
    }
  }

  async function sairDeTudo() {
    if (!confirm("Sair da sua conta em todos os aparelhos?")) return;
    await supabase.auth.signOut({ scope: "global" });
    router.replace("/");
  }

  if (carregando || !usuario) {
    return <p style={{ padding: 24, color: "#64748b" }}>Carregando seu perfil...</p>;
  }

  const temFoto = Boolean(usuario.user_metadata?.avatar_url);
  const previa = { ...usuario, user_metadata: { ...usuario.user_metadata, avatar_icone: icone, avatar_cor: cor, avatar_url: null } };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="perfil">
        <div>
          <p style={{ margin: "0 0 8px" }}>
            <Link href="/">← Voltar para as ofertas</Link>
          </p>
          <h1>Meu perfil</h1>
          <p className="perfil-sub">Essas informações aparecem nos seus comentários e promoções enviadas.</p>
        </div>

        {/* Foto ou ícone */}
        <section className="perfil-caixa">
          <div className="perfil-topo">
            <Avatar usuario={usuario} tamanho={84} borda={false} />
            <div className="perfil-topo-info">
              <strong>{nomeDoUsuario(usuario)}</strong>
              <span>{usuario.email}</span>
            </div>
          </div>

          <h2 style={{ marginTop: 22 }}>Foto do perfil</h2>
          <div className="perfil-linha">
            <input
              ref={entradaFoto}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={enviarFoto}
            />
            <button className="perfil-btn" onClick={() => entradaFoto.current?.click()} disabled={enviandoFoto}>
              {enviandoFoto ? "Enviando..." : temFoto ? "Trocar foto" : "Enviar foto"}
            </button>
          </div>
          <p className="perfil-ajuda">JPG, PNG ou WebP de até {MAX_MB} MB. A imagem é recortada em formato quadrado.</p>

          <h2 style={{ marginTop: 22 }}>Ou escolha um ícone</h2>
          <div className="perfil-icones" role="group" aria-label="Ícones">
            {ICONES.map((i) => (
              <button
                key={i}
                type="button"
                className="perfil-icone"
                aria-pressed={icone === i}
                onClick={() => setIcone(icone === i ? "" : i)}
              >
                {i}
              </button>
            ))}
          </div>
          <span className="perfil-rotulo">Cor do fundo</span>
          <div className="perfil-linha">
            <div className="perfil-cores" role="group" aria-label="Cores">
              {CORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="perfil-cor"
                  style={{ background: c }}
                  aria-label={`Cor ${c}`}
                  aria-pressed={cor === c}
                  onClick={() => setCor(c)}
                />
              ))}
            </div>
            <Avatar usuario={previa} tamanho={44} borda={false} />
            <button className="perfil-btn perfil-btn--claro" onClick={salvarIcone} disabled={salvando === "icone"}>
              {salvando === "icone" ? "Salvando..." : "Usar este ícone"}
            </button>
          </div>
          <Mensagem msg={msgAvatar} />
        </section>

        {/* Nome */}
        <section className="perfil-caixa">
          <h2>Nome de usuário</h2>
          <p>É o nome que aparece para os outros membros.</p>
          <form className="perfil-grupo" onSubmit={salvarNome}>
            <input className="perfil-campo" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={30} />
            <div className="perfil-linha">
              <button className="perfil-btn" disabled={salvando === "nome"}>
                {salvando === "nome" ? "Salvando..." : "Salvar nome"}
              </button>
            </div>
          </form>
          <Mensagem msg={msgNome} />
        </section>

        {/* E-mail */}
        <section className="perfil-caixa">
          <h2>E-mail</h2>
          <p>
            Atual: <strong>{usuario.email}</strong>
          </p>
          <form className="perfil-grupo" onSubmit={salvarEmail}>
            <div>
              <label className="perfil-rotulo" htmlFor="novo-email">Novo e-mail</label>
              <input
                id="novo-email"
                className="perfil-campo"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="perfil-linha">
              <button className="perfil-btn" disabled={salvando === "email"}>
                {salvando === "email" ? "Enviando..." : "Trocar e-mail"}
              </button>
            </div>
          </form>
          <Mensagem msg={msgEmail} />
        </section>

        {/* Senha */}
        <section className="perfil-caixa">
          <h2>Senha</h2>
          <p>Use pelo menos 8 caracteres.</p>
          <form className="perfil-grupo" onSubmit={salvarSenha}>
            <div>
              <label className="perfil-rotulo" htmlFor="senha-atual">Senha atual</label>
              <input
                id="senha-atual"
                className="perfil-campo"
                type="password"
                autoComplete="current-password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="perfil-rotulo" htmlFor="senha-nova">Nova senha</label>
              <input
                id="senha-nova"
                className="perfil-campo"
                type="password"
                autoComplete="new-password"
                value={senhaNova}
                onChange={(e) => setSenhaNova(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="perfil-rotulo" htmlFor="senha-confirma">Confirmar nova senha</label>
              <input
                id="senha-confirma"
                className="perfil-campo"
                type="password"
                autoComplete="new-password"
                value={senhaConfirma}
                onChange={(e) => setSenhaConfirma(e.target.value)}
                required
              />
            </div>
            <div className="perfil-linha">
              <button className="perfil-btn" disabled={salvando === "senha"}>
                {salvando === "senha" ? "Salvando..." : "Trocar senha"}
              </button>
            </div>
          </form>
          <Mensagem msg={msgSenha} />
        </section>

        {/* Sessões */}
        <section className="perfil-caixa">
          <h2>Segurança</h2>
          <p>Se você entrou em um computador que não é seu, encerre todas as sessões.</p>
          <button className="perfil-btn perfil-btn--perigo" onClick={sairDeTudo}>
            Sair de todos os aparelhos
          </button>
        </section>
      </div>
    </>
  );
}