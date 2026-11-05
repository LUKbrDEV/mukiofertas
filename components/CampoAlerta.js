"use client";

// Campo "O que você procura" dos alertas, com sugestões das ofertas que estão no site.
// Salve como components/CampoAlerta.js. Usado em app/alertas/page.js e no sininho do topo (IconesTopo).
//
// Enquanto a pessoa digita, aparecem as ofertas no ar com aquele nome (foto, loja e preço).
// Escolheu uma: o alerta é preenchido com o nome do produto e o preço de hoje como máximo.
// Não achou: é só criar o alerta com o que digitou.

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const CSS = `
  .ca { position: relative; }
  .ca-lista { position: absolute; left: 0; right: 0; top: calc(100% + 6px); z-index: 90; max-height: 340px; overflow-y: auto;
              margin: 0; padding: 6px; list-style: none; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
              box-shadow: 0 16px 40px rgba(15, 23, 42, .18); }
  .ca .ca-item { height: auto; grid-column: auto; font-weight: 400; } /* não herda o estilo de botões do formulário */
  .ca-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 7px 8px; border: 0; border-radius: 9px;
             background: none; font: inherit; text-align: left; cursor: pointer; color: #0f172a; }
  .ca .ca-item { background: #fff; color: #0f172a; }
  .ca .ca-item:hover, .ca .ca-item[aria-selected="true"] { background: #f1f5f9; }
  .ca-foto { flex: none; width: 40px; height: 40px; border-radius: 8px; background: #f8fafc; overflow: hidden; display: grid; place-items: center; }
  .ca-foto img { width: 100%; height: 100%; object-fit: contain; }
  .ca-txt { min-width: 0; flex: 1; display: grid; gap: 1px; }
  .ca-txt strong { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ca-txt span { font-size: 12px; color: #64748b; }
  .ca-txt b { color: #0b8a4b; }
  .ca-rotulo { padding: 6px 8px 4px; font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #64748b; }
  .ca-nada { padding: 10px 8px; font-size: 13px; color: #475569; line-height: 1.4; }
`;

const preco = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const normalizar = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Palavras de acessório: "Capinha para iPhone" não é o iPhone
const ACESSORIOS = [
  "capa", "capinha", "case", "pelicula", "carregador", "cabo", "fonte", "adaptador", "suporte", "power bank",
  "bateria externa", "carregador portatil", "fone", "microfone", "controle", "lente", "protetor", "pulseira",
  "tripe", "estojo", "bolsa", "compativel", "para", "kit",
];

// Pontua o quanto o título parece ser O PRODUTO procurado (e não um acessório dele)
function pontuar(titulo, termo) {
  const t = normalizar(titulo);
  const q = normalizar(termo);
  if (!q) return 0;
  const palavrasQ = q.split(" ");
  const palavrasT = t.split(" ");
  let pontos = 0;

  if (t.startsWith(q)) pontos += 120; // "iPhone 15 128GB..."
  const pos = t.indexOf(q);
  if (pos >= 0) pontos += Math.max(0, 60 - pos); // quanto mais no começo, melhor
  // termo nas 4 primeiras palavras (ex.: "Apple iPhone 15")
  if (palavrasQ.every((p) => palavrasT.slice(0, 4).some((w) => w.startsWith(p)))) pontos += 70;
  // palavra inteira (não pedaço de outra)
  if (` ${t} `.includes(` ${q} `)) pontos += 20; // q já vem só com letras, números e espaços

  // acessório ANTES do termo ("carregador ... para iphone"): desce bastante, a menos que a pessoa procure o acessório
  const antes = pos > 0 ? t.slice(0, pos) : "";
  const procurandoAcessorio = ACESSORIOS.some((a) => q.includes(a));
  if (!procurandoAcessorio && ACESSORIOS.some((a) => ` ${antes} `.includes(` ${a} `))) pontos -= 150;
  return pontos;
}

// Nome curto do produto para o alerta: as primeiras palavras que dizem o que é
// ("Air Fryer Mondial 4L Preta Family" → "air fryer mondial 4l")
const FRACAS = new Set(["de", "da", "do", "das", "dos", "com", "para", "e", "a", "o", "em", "kit", "novo", "nova", "oferta", "original"]);
export function termoDoProduto(titulo, palavras = 4) {
  return String(titulo)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((p) => p.length > 1 && !FRACAS.has(p))
    .slice(0, palavras)
    .join(" ");
}

export default function CampoAlerta({ valor, aoMudar, aoEscolher, placeholder, inputRef, className = "" }) {
  const [sugestoes, setSugestoes] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [indice, setIndice] = useState(-1);
  const caixa = useRef(null);

  // Busca as ofertas no ar com esse nome (espera a pessoa parar de digitar)
  useEffect(() => {
    const termo = valor.trim();
    if (termo.length < 2) {
      setSugestoes([]);
      return;
    }
    const id = setTimeout(async () => {
      setBuscando(true);
      const agora = new Date().toISOString();
      const limpo = termo.replace(/[%_,()]/g, " ").replace(/\s+/g, " ").trim();
      const base = () =>
        supabase
          .from("ofertas")
          .select("id, titulo, loja, preco_atual, imagem, expires_at, publicada_em")
          .eq("ativa", true)
          .or(`expires_at.is.null,expires_at.gt.${agora}`)
          .order("publicada_em", { ascending: false });

      // 1) títulos que COMEÇAM com o termo (ou com "Apple/Smartphone + termo"): quase sempre é o produto
      const comeco = base()
        .or(`titulo.ilike.${limpo}%,titulo.ilike.apple ${limpo}%,titulo.ilike.smartphone ${limpo}%,titulo.ilike.celular ${limpo}%`)
        .limit(30);
      // 2) qualquer título com todas as palavras (pega bastante e escolhe as melhores aqui embaixo)
      let geral = base().limit(120);
      for (const p of limpo.split(" ").filter(Boolean).slice(0, 5)) geral = geral.ilike("titulo", `%${p}%`);

      const [r1, r2] = await Promise.all([comeco, geral]);
      const data = [...(r1.data ?? []), ...(r2.data ?? [])];
      // Ordena: primeiro o produto em si, depois os acessórios; sem repetir o mesmo título
      const vistos = new Set();
      const ordenadas = data
        .map((o) => ({ o, p: pontuar(o.titulo, termo) }))
        .sort((a, b) => b.p - a.p || Number(b.o.preco_atual) - Number(a.o.preco_atual))
        .map((x) => x.o)
        .filter((o) => {
          const chave = normalizar(o.titulo).slice(0, 60);
          if (vistos.has(chave)) return false;
          vistos.add(chave);
          return true;
        })
        .slice(0, 8);
      setSugestoes(ordenadas);
      setBuscando(false);
      setIndice(-1);
    }, 250);
    return () => clearTimeout(id);
  }, [valor]);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => caixa.current && !caixa.current.contains(e.target) && setAberto(false);
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  function escolher(o) {
    aoEscolher?.(o);
    setAberto(false);
  }

  function teclado(e) {
    if (!aberto || sugestoes.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndice((i) => Math.min(sugestoes.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndice((i) => Math.max(-1, i - 1));
    } else if (e.key === "Enter" && indice >= 0) {
      e.preventDefault();
      escolher(sugestoes[indice]);
    } else if (e.key === "Escape") {
      setAberto(false);
    }
  }

  const mostrar = aberto && valor.trim().length >= 2;

  return (
    <div className="ca" ref={caixa}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <input
        ref={inputRef}
        className={className}
        value={valor}
        onChange={(e) => {
          aoMudar(e.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onKeyDown={teclado}
        placeholder={placeholder}
        maxLength={60}
        autoComplete="off"
        role="combobox"
        aria-expanded={mostrar}
        aria-autocomplete="list"
        aria-label="O que você procura"
      />
      {mostrar && (
        <ul className="ca-lista" role="listbox">
          {sugestoes.length > 0 && <li className="ca-rotulo">No site agora: escolha para criar o alerta</li>}
          {sugestoes.map((o, i) => (
            <li key={o.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === indice}
                className="ca-item"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(o)}
              >
                <span className="ca-foto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {o.imagem ? <img src={o.imagem} alt="" loading="lazy" /> : null}
                </span>
                <span className="ca-txt">
                  <strong>{o.titulo}</strong>
                  <span>
                    {o.loja} · <b>{preco(o.preco_atual)}</b>
                  </span>
                </span>
              </button>
            </li>
          ))}
          {!buscando && sugestoes.length === 0 && (
            <li className="ca-nada">
              Não tem <strong>“{valor.trim()}”</strong> no site agora. Crie o alerta assim mesmo: a gente te avisa quando aparecer.
            </li>
          )}
          {buscando && sugestoes.length === 0 && <li className="ca-nada">Procurando...</li>}
        </ul>
      )}
    </div>
  );
}
