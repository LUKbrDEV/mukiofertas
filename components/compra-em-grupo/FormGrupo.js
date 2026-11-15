"use client";

// Formulário "Divulgar meu grupo". Salve como components/compra-em-grupo/FormGrupo.js.
// Precisa estar logado (igual ao "Enviar promoção" da comunidade).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function FormGrupo({ produtoId = null }) {
  const router = useRouter();
  const [sessao, setSessao] = useState(undefined); // undefined = carregando
  const [linkGrupo, setLinkGrupo] = useState("");
  const [linkProduto, setLinkProduto] = useState(produtoId ? `https://pt.aliexpress.com/item/${produtoId}.html` : "");
  const [pedirProduto, setPedirProduto] = useState(false);
  const [precoGrupo, setPrecoGrupo] = useState("");
  const [faltam, setFaltam] = useState("2");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session ?? null));
  }, []);

  async function enviar(e) {
    e.preventDefault();
    setErro("");
    if (!/aliexpress/i.test(linkGrupo)) return setErro("Cole o link do grupo que o AliExpress deu (a.aliexpress.com/...).");
    setEnviando(true);
    const { data } = await supabase.auth.getSession();
    try {
      const r = await fetch("/api/compra-em-grupo", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify({
          link_grupo: linkGrupo,
          link_produto: linkProduto || null,
          preco_grupo: precoGrupo || null,
          faltam,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (j.precisaProduto) setPedirProduto(true);
        if (j.produto_id && r.status === 409) {
          setErro(j.erro);
          setEnviando(false);
          return;
        }
        setErro(j.erro || "Não deu certo agora. Tente de novo.");
        setEnviando(false);
        return;
      }
      router.push(`/compra-em-grupo/p/${j.produto_id}`);
      router.refresh();
    } catch {
      setErro("Sem conexão. Tente de novo.");
      setEnviando(false);
    }
  }

  if (sessao === undefined) return <p className="cg-aviso">Carregando...</p>;
  if (!sessao) {
    return (
      <div className="cg-form">
        <p style={{ margin: 0 }}>Entre na sua conta para divulgar um grupo. É rápido e grátis.</p>
        <Link className="cg-btn" href="/entrar?voltar=/compra-em-grupo/divulgar" style={{ alignSelf: "flex-start" }}>
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <form className="cg-form" onSubmit={enviar}>
      <label>
        Link do grupo
        <input
          type="url"
          inputMode="url"
          placeholder="https://a.aliexpress.com/_..."
          value={linkGrupo}
          onChange={(e) => setLinkGrupo(e.target.value)}
          required
        />
        <small>
          No app do AliExpress, depois de pagar na opção de grupo, toque em &quot;Convidar&quot; e copie o link.
        </small>
      </label>

      {(pedirProduto || produtoId) && (
        <label>
          Link da página do produto
          <input
            type="url"
            inputMode="url"
            placeholder="https://pt.aliexpress.com/item/....html"
            value={linkProduto}
            onChange={(e) => setLinkProduto(e.target.value)}
            required={pedirProduto}
          />
          <small>Só se o grupo não for reconhecido sozinho: abra o produto no AliExpress e copie o link.</small>
        </label>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label>
          Preço no grupo (R$)
          <input inputMode="decimal" placeholder="4,99" value={precoGrupo} onChange={(e) => setPrecoGrupo(e.target.value)} />
          <small>Opcional.</small>
        </label>
        <label>
          Quantas pessoas faltam?
          <select value={faltam} onChange={(e) => setFaltam(e.target.value)}>
            <option value="2">Faltam 2</option>
            <option value="1">Falta 1</option>
          </select>
        </label>
      </div>

      {erro && <p className="cg-erro">{erro}</p>}

      <button className="cg-btn" disabled={enviando} style={{ alignSelf: "flex-start" }}>
        {enviando ? "Conferindo o link..." : "Divulgar grupo"}
      </button>
      <p className="cg-aviso" style={{ margin: 0 }}>
        O grupo aparece no mural na hora e sai sozinho depois de 24 horas ou quando completar.
      </p>
    </form>
  );
}
