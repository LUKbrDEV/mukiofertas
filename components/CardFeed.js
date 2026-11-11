"use client";

// Card de oferta da página inicial e das páginas de loja (visual do Home_desktop):
//   foto com selo no canto (Relâmpago com contagem · Super desconto · Menor preço em 30 dias) e a % de desconto,
//   loja com a sigla em bolinha, selo de verificada e "há 22 min", título em 2 linhas,
//   cupom (clica e copia) ou frete grátis, preço "de" riscado, preço grande,
//   botão "Pegar no Mercado Livre" e, no pé, o UP (a galera avisa que é boa oferta), comentários,
//   quantos viram, compartilhar no WhatsApp e salvar.
// No celular o card fica "deitado" (foto à esquerda, compra à direita) e mais enxuto.
// Salve como components/CardFeed.js. É o card do site todo: o components/CardOferta.js também desenha este card.
// previa = true: prévia do painel admin (links desativados). Oferta expirada: foto cinza e tag "Expirado".

import { useEffect, useState } from "react";
import BotaoDesejo from "./BotaoDesejo";
import BotaoUp from "./BotaoUp";
import BotaoPrecoSubiu from "./BotaoPrecoSubiu";
import { lojaDoNome } from "../data/lojas";
import { tituloDoCupom } from "../lib/titulo-cupom.mjs";
import { SITE } from "../lib/site";

// Os estilos ficam no app/card-novo.css (importado no app/layout.js, vale para o site todo).
// CSS_CARD continua exportado (vazio) para não quebrar quem ainda importa.
export const CSS_CARD = "";

const reais = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numero = (v) => Number(v).toLocaleString("pt-BR");

function desconto(o) {
  const a = Number(o.preco_antigo);
  const p = Number(o.preco_atual);
  return a > 0 && p > 0 && a > p ? Math.round(((a - p) / a) * 100) : 0;
}

// "há 22 min", "há 1 hora", "há 3 horas", "há 1 dia"
function haQuanto(dataIso) {
  if (!dataIso) return "";
  const min = Math.max(0, Math.round((Date.now() - new Date(dataIso).getTime()) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.round(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

// "Mercado Livre" → "ML", "KaBuM!" → "K", "Amazon" → "A"
function sigla(nome) {
  const partes = String(nome ?? "?").replace(/[^\p{L}\p{N}\s]/gu, "").trim().split(/\s+/).filter(Boolean);
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  return (partes[0]?.[0] ?? "?").toUpperCase();
}

// "Pegar no Mercado Livre", "Pegar na KaBuM!"
function textoDoBotao(loja, nome, ehCupom) {
  if (ehCupom === "sem-codigo") return "Ativar cupom"; // (o nome da loja não cabe no botão do card)
  if (ehCupom) return "Pegar cupom";
  if (!loja) return "Pegar oferta";
  return `Pegar ${loja.artigo === "do" ? "no" : "na"} ${nome}`;
}

function IconeVerificada() {
  return (
    <svg className="cf-verificada" width="13" height="13" viewBox="0 0 24 24" aria-label="Loja verificada" role="img">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="m7.5 12.3 3 3 6-6.3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconeFoto() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-9 9" />
    </svg>
  );
}

// Selo "Relâmpago · 02:14:09" com a contagem regressiva (some quando acaba)
function SeloRelampago({ ate }) {
  const [agora, setAgora] = useState(null);
  useEffect(() => {
    setAgora(Date.now());
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const falta = new Date(ate).getTime() - (agora ?? Date.now());
  if (falta <= 0) return null;
  const s = Math.floor(falta / 1000);
  const dd = (n) => String(n).padStart(2, "0");
  return (
    <span className="cf-selo-topo cf-selo-topo--relampago" role="timer" suppressHydrationWarning>
      Relâmpago{agora ? ` · ${dd(Math.floor(s / 3600))}:${dd(Math.floor((s % 3600) / 60))}:${dd(s % 60)}` : ""}
    </span>
  );
}

// Cupom: clica e copia o código
function ChipCupom({ codigo }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar(e) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(codigo);
    } catch {
      const campo = document.createElement("textarea");
      campo.value = codigo;
      campo.style.position = "fixed";
      campo.style.opacity = "0";
      document.body.appendChild(campo);
      campo.select();
      document.execCommand("copy");
      campo.remove();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  }
  return (
    <button type="button" className="cf-cupom" onClick={copiar} title="Clique para copiar o cupom" data-copiado={copiado}>
      {copiado ? "Copiado!" : codigo}
      {!copiado && (
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2">
          <rect x="8" y="8" width="12" height="12" rx="2" />
          <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
        </svg>
      )}
    </button>
  );
}

export default function CardFeed({ oferta: o, previa = false }) {
  const ehCupom = o.categoria === "cupons";
  const semCodigo = ehCupom && !o.cupom; // cupom ativado direto na loja (ex.: Mercado Livre): não tem código para copiar
  const off = ehCupom ? 0 : desconto(o);
  const loja = lojaDoNome(o.loja);
  const nomeLoja = loja?.nome ?? o.loja;
  const quando = o.publicada_em ?? o.atualizado_em;
  const expirada = Boolean(o.expirada);
  const paginaDaOferta = previa ? "#" : `/oferta/${o.id}`;
  const linkDaLoja = previa ? "#" : expirada ? paginaDaOferta : `/ir/${o.id}`;
  const externoLoja = previa || expirada ? {} : { target: "_blank", rel: "sponsored noopener noreferrer" };
  // cupom não tem página de produto: foto e título vão direto para a loja
  const pagina = ehCupom && !expirada ? linkDaLoja : paginaDaOferta;
  const externo = ehCupom ? externoLoja : {};
  const pix = Number(o.preco_pix) > 0 && Number(o.preco_pix) < Number(o.preco_atual) ? o.preco_pix : null;
  const viram = Number(o.cliques) || 0;
  const relampago = !expirada && o.relampago_ate && new Date(o.relampago_ate).getTime() > Date.now();
  const linkDaOferta = `${SITE.url}/oferta/${o.id}`;
  const compartilhar = `https://wa.me/?text=${encodeURIComponent(
    ehCupom ? `${o.titulo} — ${linkDaOferta}` : `${o.titulo} por ${reais(o.preco_atual)} — ${linkDaOferta}`
  )}`;

  return (
    <article className={expirada ? "cf cf--expirada" : "cf"}>
      <div className="cf-foto">
        <a href={pagina} {...externo} tabIndex={-1} aria-hidden="true" className="cf-foto-link">
          {o.imagem && !(ehCupom && loja?.logo) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={o.imagem} alt="" loading="lazy" />
          ) : loja?.logo ? (
            <span className="cf-foto-loja" style={{ background: loja.cor }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={loja.logo} alt="" loading="lazy" />
            </span>
          ) : (
            <span className="cf-foto-vazia">
              <IconeFoto />
            </span>
          )}
        </a>

        {relampago ? (
          <SeloRelampago ate={o.relampago_ate} />
        ) : o.super_desconto && off > 0 && !expirada ? (
          <span className="cf-selo-topo cf-selo-topo--super">Super desconto</span>
        ) : o.menor_preco_30 ? (
          <span className="cf-selo-topo cf-selo-topo--menor">Menor preço em 30 dias</span>
        ) : null}
        {off > 0 && <span className="cf-off">-{off}%</span>}
        {expirada && <span className="cf-expirado">Expirado</span>}
        {!ehCupom && !previa && (
          <span className="cf-coracao cf-so-cel">
            <BotaoDesejo ofertaId={o.id} />
          </span>
        )}
      </div>

      <div className="cf-corpo">
        <div className="cf-loja">
          {/* logo da loja na bolinha (com a cor da loja); loja sem logo: a sigla */}
          {loja?.logo ? (
            <span className="cf-sigla cf-sigla--logo" aria-hidden="true" style={{ background: loja.cor }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={loja.logo} alt="" loading="lazy" />
            </span>
          ) : (
            <span className="cf-sigla" aria-hidden="true">
              {sigla(nomeLoja)}
            </span>
          )}
          <span className="cf-loja-txt">
            <span className="cf-loja-nome">
              {nomeLoja}
              {loja && <IconeVerificada />}
            </span>
            {quando && (
              <span className="cf-quando" suppressHydrationWarning>
                {haQuanto(quando)}
              </span>
            )}
          </span>
          {/* celular: o UP fica aqui (o pé do card some no celular) */}
          {!expirada && <BotaoUp ofertaId={o.id} ups={o.likes} previa={previa} className="cf-so-cel" />}
        </div>

        <h3 className="cf-titulo" title={o.titulo}>
          <a href={pagina} {...externo}>
            {ehCupom ? tituloDoCupom(o.titulo) : o.titulo}
          </a>
        </h3>

        <div className="cf-selos">
          {o.cupom && !expirada && <ChipCupom codigo={o.cupom} />}
          {semCodigo && !expirada && <span className="cf-selo cf-selo--ativar">Ativa direto na loja, sem código</span>}
          {o.frete_gratis && !expirada && <span className="cf-selo">Frete grátis</span>}
        </div>

        {!ehCupom && (
          <div className="cf-precos">
            <s className="cf-de">{off > 0 ? reais(o.preco_antigo) : " "}</s>
            <strong className="cf-por">{reais(o.preco_atual)}</strong>
            {pix && <span className="cf-pix">ou {reais(pix)} no PIX</span>}
          </div>
        )}

        <a className="cf-botao" href={linkDaLoja} {...externoLoja}>
          {expirada ? (
            "Ver comentários"
          ) : (
            <>
              <span className="cf-so-pc">{textoDoBotao(loja, nomeLoja, semCodigo ? "sem-codigo" : ehCupom)}</span>
              <span className="cf-so-cel">{semCodigo ? "Ativar cupom" : ehCupom ? "Pegar cupom" : "Pegar oferta"}</span>
            </>
          )}
        </a>
      </div>

      <div className="cf-pe">
        {!expirada && <BotaoUp ofertaId={o.id} ups={o.likes} previa={previa} />}
        {!ehCupom && (
          <a className="cf-pe-item" href={previa ? "#" : `/oferta/${o.id}#comentarios`} aria-label="Comentários">
            <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 5h16v11H9l-5 4z" strokeLinejoin="round" />
            </svg>
            {o.comentarios ?? ""}
          </a>
        )}
        {viram > 0 && (
          <span className="cf-pe-item cf-viram" title="Pessoas que abriram esta oferta">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M12 2s5 4.6 5 10a5 5 0 0 1-10 0c0-2 1-3.6 2-4.6 0 1.6 1 2.6 2 2.6 0-3 1-6 1-8Z" />
            </svg>
            + {numero(viram)}
          </span>
        )}
        <span className="cf-pe-acoes">
          {/* cupom: bandeira "O cupom não funcionou?" (com avisos suficientes a oferta sai do ar) */}
          {(o.cupom || ehCupom) && !expirada && !previa && (
            <BotaoPrecoSubiu ofertaId={o.id} cupom={o.cupom || "deste cupom"} compacto />
          )}
          <a className="cf-zap" href={previa ? "#" : compartilhar} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no WhatsApp" title="Compartilhar no WhatsApp">
            <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
              <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" />
            </svg>
          </a>
          {!ehCupom && !previa && <BotaoDesejo ofertaId={o.id} />}
        </span>
      </div>
    </article>
  );
}
