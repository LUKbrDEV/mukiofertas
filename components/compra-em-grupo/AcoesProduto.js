"use client";

// Partes interativas da página do produto da compra em grupo.
// Salve como components/compra-em-grupo/AcoesProduto.js.
//   <ContarVisita id />          conta 1 visualização por visita
//   <DivulgarRapido produtoId /> caixa "Já criou o grupo?" (cola o link e divulga)
//   <AvisarNovosGrupos produtoId /> botão "Avisar sobre novos grupos"

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

async function token() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function ContarVisita({ id }) {
  useEffect(() => {
    const chave = `mk-visita-grupo-${id}`;
    try {
      if (sessionStorage.getItem(chave)) return;
      sessionStorage.setItem(chave, "1");
    } catch {}
    fetch("/api/compra-em-grupo/visita", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }, [id]);
  return null;
}

const IconeColar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="8" y="3" width="8" height="4" rx="1" />
    <path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
  </svg>
);

export function DivulgarRapido({ produtoId }) {
  const router = useRouter();
  const caminho = usePathname();
  const [link, setLink] = useState("");
  const [faltam, setFaltam] = useState("2");
  const [msg, setMsg] = useState(null); // { tipo: "erro" | "ok", texto }
  const [enviando, setEnviando] = useState(false);
  const [semConta, setSemConta] = useState(false);

  async function colar() {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setLink(t.trim());
    } catch {
      setMsg({ tipo: "erro", texto: "Não deu para colar sozinho. Segure no campo e escolha Colar." });
    }
  }

  async function enviar(e) {
    e.preventDefault();
    setMsg(null);
    const t = await token();
    if (!t) return setSemConta(true);
    setEnviando(true);
    try {
      const r = await fetch("/api/compra-em-grupo", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          link_grupo: link,
          // estamos na página do produto: o produto já é conhecido
          link_produto: `https://pt.aliexpress.com/item/${produtoId}.html`,
          faltam,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg({ tipo: "erro", texto: j.erro || "Não deu certo agora. Tente de novo." });
      } else {
        setLink("");
        setMsg({ tipo: "ok", texto: "Pronto! Seu grupo já está na lista. Compartilhe esta página para fechar mais rápido." });
        router.refresh();
      }
    } catch {
      setMsg({ tipo: "erro", texto: "Sem conexão. Tente de novo." });
    }
    setEnviando(false);
  }

  return (
    <form className="cg-caixa" onSubmit={enviar}>
      <strong className="cg-caixa-titulo">Já criou o grupo?</strong>
      <p className="cg-caixa-texto">Cole o link que o AliExpress deu quando você criou o grupo. Ele entra na lista na hora.</p>
      <div className="cg-colar">
        <div className="cg-colar-campo">
          <input
            type="url"
            inputMode="url"
            placeholder="Cole o link do grupo"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            aria-label="Link do grupo"
          />
          <button type="button" className="cg-colar-icone" onClick={colar} title="Colar" aria-label="Colar o link">
            <IconeColar />
          </button>
        </div>
        <select value={faltam} onChange={(e) => setFaltam(e.target.value)} aria-label="Quantas pessoas faltam" className="cg-colar-faltam">
          <option value="2">Faltam 2</option>
          <option value="1">Falta 1</option>
        </select>
        <button className="cg-btn" disabled={enviando || !link.trim()}>
          {enviando ? "Conferindo..." : "＋ Divulgar grupo"}
        </button>
      </div>
      {semConta && (
        <p className="cg-erro" style={{ marginTop: 10 }}>
          Entre na sua conta para divulgar. <Link href={`/entrar?voltar=${encodeURIComponent(caminho)}`}>Entrar</Link>
        </p>
      )}
      {msg && (
        <p className={msg.tipo === "ok" ? "cg-ok" : "cg-erro"} style={{ marginTop: 10 }}>
          {msg.texto}
        </p>
      )}
    </form>
  );
}

const IconeSino = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

export function AvisarNovosGrupos({ produtoId }) {
  const caminho = usePathname();
  const [ligado, setLigado] = useState(false);
  const [estado, setEstado] = useState("pronto"); // pronto | enviando | sem-conta | erro
  const [erro, setErro] = useState("");

  useEffect(() => {
    (async () => {
      const t = await token();
      if (!t) return;
      const r = await fetch(`/api/compra-em-grupo/avisar?produto=${produtoId}`, { headers: { Authorization: `Bearer ${t}` } });
      const j = await r.json().catch(() => ({}));
      setLigado(Boolean(j.ligado));
    })().catch(() => {});
  }, [produtoId]);

  async function alternar() {
    const t = await token();
    if (!t) return setEstado("sem-conta");
    setEstado("enviando");
    const r = await fetch("/api/compra-em-grupo/avisar", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ produto_id: produtoId, desligar: ligado }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r || !r.ok) {
      setErro(j.erro || "Não deu certo agora. Tente de novo.");
      return setEstado("erro");
    }
    setLigado(Boolean(j.ligado));
    setEstado("pronto");
  }

  return (
    <div>
      <button type="button" className={`cg-btn cg-btn--contorno cg-btn--largo${ligado ? " cg-btn--ligado" : ""}`} onClick={alternar} disabled={estado === "enviando"}>
        <IconeSino /> {ligado ? "Aviso ligado: você recebe um e-mail quando abrir um grupo" : "Avisar sobre novos grupos"}
      </button>
      {estado === "sem-conta" && (
        <p className="cg-erro" style={{ marginTop: 8 }}>
          Entre na sua conta para receber o aviso por e-mail. <Link href={`/entrar?voltar=${encodeURIComponent(caminho)}`}>Entrar</Link>
        </p>
      )}
      {estado === "erro" && (
        <p className="cg-erro" style={{ marginTop: 8 }}>
          {erro}
        </p>
      )}
    </div>
  );
}
