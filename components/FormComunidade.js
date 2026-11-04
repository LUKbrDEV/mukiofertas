"use client";

// Formulário "Enviar promoção" no estilo passo a passo:
//   1) cola o link  →  2) confere título e foto (a categoria sai do título)  →  3) confere o preço e envia
// Ao colar o link, o site puxa as informações sozinho e troca pelo link de afiliado.
// Salve como components/FormComunidade.js (substitui o atual).
// Usa as rotas app/api/comunidade/extrair e app/api/comunidade/enviar.

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";


const PASSOS = ["Cole o link da oferta", "Confira o título da oferta", "Confira o preço da oferta"];

const DICAS = [
  {
    titulo: "Confira se o preço está realmente bom",
    texto: "Compare com o preço de outras lojas e com o histórico do produto. Promoção boa é preço abaixo do normal, não só um desconto em cima de um preço inflado.",
  },
  {
    titulo: "Evite conteúdo duplicado",
    texto: "Procure no site antes de enviar. Se a oferta já estiver no ar, avisamos aqui mesmo depois que você colar o link.",
  },
  {
    titulo: "Informe o cupom, se tiver",
    texto: "Se o preço só sai com cupom, coloque o código no passo 3. Assim todo mundo consegue o mesmo preço que você.",
  },
  {
    titulo: "Ganhe XP no ranking",
    texto: "Cada oferta aprovada pela equipe vale XP. Os que mais postam aparecem no ranking do mês e no Hall da Fama da página inicial.",
  },
];

const CSS = `
  .fc { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 20px; align-items: start; margin-top: 8px; }
  .fc-principal { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px; }
  .fc-painel { background: #e8f1ff; border: 1px solid #c9dcfb; border-radius: 12px; padding: 22px; }
  .fc-painel h2 { margin: 0 0 6px; font-size: 22px; font-weight: 800; color: #0f172a; }
  .fc-painel > p { margin: 0 0 14px; color: #334155; font-size: 14px; }
  .fc-linha { height: 1px; background: #c9dcfb; margin: 0 0 14px; }
  .fc-rotulo { display: block; margin: 0 0 6px; font-size: 14px; font-weight: 700; color: #1e293b; }
  .fc-campo { box-sizing: border-box; width: 100%; height: 46px; padding: 0 14px; border: 1px solid #94a3b8;
              border-radius: 8px; font-size: 15px; background: #fff; color: #0f172a; }
  .fc-campo:focus { outline: 2px solid #0a4bb8; outline-offset: 1px; border-color: transparent; }
  textarea.fc-campo { height: auto; min-height: 70px; padding: 10px 14px; resize: vertical; font-family: inherit; }
  .fc-ajuda { margin: 6px 0 0; font-size: 12.5px; color: #64748b; }
  .fc-grupo { display: grid; gap: 14px; }
  .fc-duas { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .fc-acoes { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
  .fc-btn { height: 46px; padding: 0 22px; border: none; border-radius: 10px; font-size: 15px; font-weight: 800; cursor: pointer;
            background: #ff7a1a; color: #fff; }
  .fc-btn:hover { background: #f06a0a; }
  .fc-btn:disabled { background: #e2e8f0; color: #94a3b8; cursor: default; }
  .fc-btn--claro { background: #f1f5f9; color: #0f172a; }
  .fc-btn--claro:hover { background: #e2e8f0; }
  .fc-erro { margin: 12px 0 0; padding: 10px 12px; border-radius: 8px; background: #fef2f2; color: #b42318; font-size: 14px; }
  .fc-aviso { margin: 0; padding: 9px 12px; border-radius: 8px; background: #fffbeb; color: #92400e; font-size: 13px; }
  .fc-duplicada { padding: 10px 12px; border-radius: 8px; background: #fff7ed; border: 1px solid #fed7aa; color: #7c2d12; font-size: 13.5px; }
  .fc-produto { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 16px; align-items: start; }
  .fc-foto { width: 120px; height: 120px; border-radius: 10px; border: 1px solid #e5e7eb; background: #f8fafc;
             object-fit: contain; display: flex; align-items: center; justify-content: center; font-size: 40px; }
  .fc-selos { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .fc-selo { padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; background: #e2e8f0; color: #334155; }
  .fc-selo--ok { background: #dcfce7; color: #166534; }
  .fc-selo--loja { background: #0a4bb8; color: #fff; }
  .fc-desconto { margin: 2px 0 0; font-size: 14px; font-weight: 800; color: #15803d; }
  .fc-lateral { display: grid; gap: 14px; }
  .fc-caixa { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px; }
  .fc-caixa h3 { margin: 0 0 12px; font-size: 17px; font-weight: 800; color: #0f172a; }
  .fc-passo { display: flex; align-items: center; gap: 10px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 10px;
              color: #94a3b8; font-size: 14px; }
  .fc-passo + .fc-passo { margin-top: 8px; }
  .fc-passo b { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%;
                background: #cbd5e1; color: #fff; font-size: 12px; flex: none; }
  .fc-passo--atual { color: #0f172a; border-color: #0a4bb8; }
  .fc-passo--atual b { background: #0a4bb8; }
  .fc-passo--feito { color: #15803d; }
  .fc-passo--feito b { background: #15803d; }
  .fc-dica { border-radius: 10px; background: #f1f5f9; }
  .fc-dica + .fc-dica { margin-top: 8px; }
  .fc-dica summary { padding: 11px 14px; cursor: pointer; font-weight: 800; font-size: 14px; color: #0f172a; list-style: none;
                     display: flex; justify-content: space-between; gap: 8px; }
  .fc-dica summary::-webkit-details-marker { display: none; }
  .fc-dica summary::after { content: "▾"; color: #64748b; }
  .fc-dica[open] summary::after { content: "▴"; }
  .fc-dica p { margin: 0; padding: 0 14px 12px; font-size: 13px; color: #475569; line-height: 1.45; }
  .fc-carregando { display: flex; align-items: center; gap: 10px; margin-top: 14px; color: #0a4bb8; font-weight: 700; font-size: 14px; }
  .fc-giro { width: 18px; height: 18px; border: 3px solid #c9dcfb; border-top-color: #0a4bb8; border-radius: 50%;
             animation: fc-girar .8s linear infinite; }
  @keyframes fc-girar { to { transform: rotate(360deg); } }
  .fc-pronto { text-align: center; padding: 30px 10px; }
  .fc-pronto div { font-size: 52px; }
  .fc-pronto h2 { margin: 8px 0; font-size: 24px; font-weight: 800; color: #0f172a; }
  .fc-pronto p { margin: 0 auto 18px; max-width: 460px; color: #475569; }
  @media (max-width: 900px) {
    .fc { grid-template-columns: minmax(0, 1fr); }
    .fc-produto { grid-template-columns: 84px minmax(0, 1fr); }
    .fc-foto { width: 84px; height: 84px; }
    .fc-duas { grid-template-columns: 1fr; }
  }
`;

const formatar = (n) =>
  n ? Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
const numero = (t) => {
  let s = String(t ?? "").replace(/[^\d.,]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export default function FormComunidade() {
  const [sessao, setSessao] = useState(undefined); // undefined = verificando
  const [passo, setPasso] = useState(1); // 1, 2, 3 ou 4 (enviado)
  const [link, setLink] = useState("");
  const [dados, setDados] = useState(null); // resposta da leitura do link
  const [titulo, setTitulo] = useState("");
  const [precoAtual, setPrecoAtual] = useState("");
  const [precoAntigo, setPrecoAntigo] = useState("");
  const [cupom, setCupom] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  async function chamar(rota, corpo) {
    const { data } = await supabase.auth.getSession();
    const r = await fetch(rota, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify(corpo),
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(json.erro || "Algo deu errado. Tente de novo.");
    return json;
  }

  async function lerLink(e, valor = link) {
    e?.preventDefault?.();
    setErro("");
    if (!/^\s*(https?:\/\/)?[\w-]+\.[\w.-]+/i.test(valor)) return setErro("Cole o link da oferta (ex.: https://www.loja.com.br/produto).");
    setCarregando(true);
    try {
      const r = await chamar("/api/comunidade/extrair", { link: valor });
      setDados(r);
      setTitulo(r.titulo || "");
      setPrecoAtual(formatar(r.preco_atual));
      setPrecoAntigo(formatar(r.preco_antigo));
      setPasso(2);
    } catch (err) {
      setErro(err.message);
    }
    setCarregando(false);
  }

  async function enviar(e) {
    e.preventDefault();
    setErro("");
    if (!numero(precoAtual)) return setErro("Informe o preço da oferta.");
    setCarregando(true);
    try {
      await chamar("/api/comunidade/enviar", {
        link: dados.link_original,
        titulo,
        preco_atual: precoAtual,
        preco_antigo: precoAntigo,
        cupom,
        imagem: dados.imagem,
      });
      setPasso(4);
    } catch (err) {
      setErro(err.message);
    }
    setCarregando(false);
  }

  function recomecar() {
    setPasso(1);
    setLink("");
    setDados(null);
    setTitulo("");
    setPrecoAtual("");
    setPrecoAntigo("");
    setCupom("");
    setErro("");
  }

  const atual = numero(precoAtual);
  const antigo = numero(precoAntigo);
  const desconto = atual && antigo && antigo > atual ? Math.round(((antigo - atual) / antigo) * 100) : 0;

  let conteudo;
  if (sessao === undefined) {
    conteudo = <p style={{ color: "#64748b" }}>Carregando...</p>;
  } else if (!sessao) {
    conteudo = (
      <div className="fc-painel">
        <h2>Entre para enviar uma oferta</h2>
        <p>Com a sua conta, cada oferta aprovada vale XP no ranking da comunidade.</p>
        <Link className="fc-btn" href="/entrar?voltar=/comunidade/enviar" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
          Entrar ou criar conta
        </Link>
      </div>
    );
  } else if (passo === 4) {
    conteudo = (
      <div className="fc-pronto">
        <div>🎉</div>
        <h2>Oferta enviada!</h2>
        <p>A equipe vai conferir e publicar em breve. Quando ela for aprovada, você ganha XP no ranking do mês.</p>
        <button type="button" className="fc-btn" onClick={recomecar}>
          Enviar outra oferta
        </button>
      </div>
    );
  } else if (passo === 1) {
    conteudo = (
      <form onSubmit={lerLink}>
        <div className="fc-painel">
          <h2>Encontrou uma boa oferta na internet?</h2>
          <p>Compartilhe com a comunidade do MukiOfertas para que todos possam aproveitar!</p>
          <div className="fc-linha" />
          <label className="fc-rotulo" htmlFor="fc-link">
            Link da oferta*
          </label>
          <input
            id="fc-link"
            className="fc-campo"
            type="url"
            inputMode="url"
            placeholder="https://www.site.com.br/oferta..."
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onPaste={(e) => {
              // colou o link: já lê sozinho, sem precisar clicar em Próximo
              const colado = e.clipboardData.getData("text").trim();
              if (colado) setTimeout(() => lerLink(null, colado), 0);
            }}
            autoFocus
            disabled={carregando}
          />
          <p className="fc-ajuda">Cole acima o link da oferta na loja onde as pessoas podem comprar. A gente puxa o resto.</p>
          {carregando && (
            <p className="fc-carregando">
              <span className="fc-giro" aria-hidden="true" /> Lendo a oferta...
            </p>
          )}
        </div>
        {erro && <p className="fc-erro">{erro}</p>}
        <div className="fc-acoes">
          <button type="submit" className="fc-btn" disabled={carregando || !link.trim()}>
            Próximo
          </button>
        </div>
      </form>
    );
  } else if (passo === 2) {
    conteudo = (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setErro("");
          if (titulo.trim().length < 8) return setErro("Escreva um título com pelo menos 8 letras.");
          setPasso(3);
        }}
      >
        <div className="fc-grupo">
          {dados?.duplicada && (
            <p className="fc-duplicada">
              ⚠️ Essa oferta já está no site:{" "}
              <Link href={`/oferta/${dados.duplicada.id}`} target="_blank">
                {dados.duplicada.titulo}
              </Link>
              . Só envie se o preço estiver menor.
            </p>
          )}
          <div className="fc-produto">
            {dados?.imagem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="fc-foto" src={dados.imagem} alt="" />
            ) : (
              <span className="fc-foto" aria-hidden="true">
                🛍️
              </span>
            )}
            <div>
              <div className="fc-selos">
                <span className="fc-selo fc-selo--loja">{dados?.loja}</span>
                <span className={`fc-selo${dados?.afiliado ? " fc-selo--ok" : ""}`}>
                  {dados?.afiliado ? "✓ Link pronto" : "Link original"}
                </span>
              </div>
              <label className="fc-rotulo" htmlFor="fc-titulo">
                Título da oferta*
              </label>
              <textarea
                id="fc-titulo"
                className="fc-campo"
                maxLength={200}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Smart TV Samsung 50 polegadas 4K Crystal UHD"
                required
              />
            </div>
          </div>
          {dados?.avisos?.map((a) => (
            <p key={a} className="fc-aviso">
              {a}
            </p>
          ))}
        </div>
        {erro && <p className="fc-erro">{erro}</p>}
        <div className="fc-acoes">
          <button type="button" className="fc-btn fc-btn--claro" onClick={() => setPasso(1)}>
            Voltar
          </button>
          <button type="submit" className="fc-btn">
            Próximo
          </button>
        </div>
      </form>
    );
  } else {
    conteudo = (
      <form onSubmit={enviar}>
        <div className="fc-grupo">
          <div className="fc-duas">
            <div>
              <label className="fc-rotulo" htmlFor="fc-preco">
                Preço com desconto (R$)*
              </label>
              <input
                id="fc-preco"
                className="fc-campo"
                inputMode="decimal"
                placeholder="0,00"
                value={precoAtual}
                onChange={(e) => setPrecoAtual(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="fc-rotulo" htmlFor="fc-antigo">
                Preço antes (R$)
              </label>
              <input
                id="fc-antigo"
                className="fc-campo"
                inputMode="decimal"
                placeholder="opcional"
                value={precoAntigo}
                onChange={(e) => setPrecoAntigo(e.target.value)}
              />
            </div>
          </div>
          {desconto > 0 && <p className="fc-desconto">🔥 {desconto}% de desconto</p>}
          <div>
            <label className="fc-rotulo" htmlFor="fc-cupom">
              Cupom (se tiver)
            </label>
            <input
              id="fc-cupom"
              className="fc-campo"
              placeholder="Ex.: MUKI10"
              maxLength={40}
              value={cupom}
              onChange={(e) => setCupom(e.target.value.toUpperCase())}
            />
            <p className="fc-ajuda">Se o preço só sai com cupom, coloque o código aqui.</p>
          </div>
        </div>
        {erro && <p className="fc-erro">{erro}</p>}
        <div className="fc-acoes">
          <button type="button" className="fc-btn fc-btn--claro" onClick={() => setPasso(2)} disabled={carregando}>
            Voltar
          </button>
          <button type="submit" className="fc-btn" disabled={carregando}>
            {carregando ? "Enviando..." : "Enviar oferta"}
          </button>
        </div>
      </form>
    );
  }

  const estadoDoPasso = (n) => (passo > n ? "fc-passo--feito" : passo === n ? "fc-passo--atual" : "");

  return (
    <div className="fc">
      <style>{CSS}</style>
      <section className="fc-principal">{conteudo}</section>

      <aside className="fc-lateral">
        <div className="fc-caixa">
          <h3>Siga o passo a passo</h3>
          {PASSOS.map((p, i) => (
            <div key={p} className={`fc-passo ${estadoDoPasso(i + 1)}`}>
              <b>{passo > i + 1 ? "✓" : i + 1}</b> {p}
            </div>
          ))}
        </div>
        <div className="fc-caixa">
          <h3>Dicas para compartilhar uma boa oferta</h3>
          {DICAS.map((d, i) => (
            <details key={d.titulo} className="fc-dica">
              <summary>
                {i + 1}. {d.titulo}
              </summary>
              <p>{d.texto}</p>
            </details>
          ))}
        </div>
      </aside>
    </div>
  );
}
