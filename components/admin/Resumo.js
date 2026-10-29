"use client";

// Aba Resumo do painel admin: números das ofertas e dos cliques.
// Salve como components/admin/Resumo.js.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { estaExpirada } from "../../lib/ofertas";
import {
  DIA,
  buscarTudo,
  nomeCategoria,
  nomeOrigem,
  diaSP,
  ultimosDias,
  contarPor,
  Barras,
  Colunas,
} from "./util";

const COLUNAS =
  "id, titulo, loja, categoria, origem, ativa, expires_at, publicada_em, atualizado_em, preco_atual, preco_antigo, relampago, destaque, imagem, postada_telegram_em";

function Card({ valor, nome, detalhe, cor, aoClicar }) {
  return (
    <button type="button" className={`adm-card adm-card--${cor ?? "neutro"}`} onClick={aoClicar} disabled={!aoClicar}>
      <strong>{valor}</strong>
      <span>{nome}</span>
      {detalhe && <small>{detalhe}</small>}
    </button>
  );
}

export default function Resumo({ irPara }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [atualizadoEm, setAtualizadoEm] = useState(null);

  const carregar = useCallback(async () => {
    setErro("");
    const [ofertasR, porDia, porOferta, porOrigem, pendentesR] = await Promise.all([
      buscarTudo(() => supabase.from("ofertas").select(COLUNAS).order("id")),
      supabase.from("cliques_por_dia").select("*").order("dia", { ascending: false }).limit(31),
      supabase.from("cliques_por_oferta").select("*").order("total", { ascending: false }).limit(10),
      supabase.from("cliques_por_origem").select("*"),
      supabase.from("sugestoes").select("id", { count: "exact", head: true }).eq("status", "pendente"),
    ]);

    if (ofertasR.error) {
      setErro(`Não foi possível carregar as ofertas: ${ofertasR.error.message}`);
      return;
    }
    const semCliques = [porDia, porOferta, porOrigem].some((r) => r.error);

    const ofertas = ofertasR.data;
    const agora = Date.now();
    const noAr = ofertas.filter((o) => o.ativa && !estaExpirada(o));
    const expiradas = ofertas.filter((o) => o.ativa && estaExpirada(o));
    const ocultas = ofertas.filter((o) => !o.ativa);

    // Cliques
    const mapaDias = new Map((porDia.data ?? []).map((l) => [l.dia, l.total]));
    const somaDias = (dias) => dias.reduce((t, d) => t + (mapaDias.get(d) ?? 0), 0);

    // Novas ofertas por dia (pela data de publicação)
    const novasPorDia = new Map();
    for (const o of ofertas) {
      if (!o.publicada_em) continue;
      const d = diaSP(o.publicada_em);
      novasPorDia.set(d, (novasPorDia.get(d) ?? 0) + 1);
    }

    setDados({
      total: ofertas.length,
      noAr: noAr.length,
      expiradas: expiradas.length,
      ocultas: ocultas.length,
      novas24h: ofertas.filter((o) => o.publicada_em && agora - new Date(o.publicada_em).getTime() < DIA).length,
      relampago: noAr.filter((o) => o.relampago).length,
      destaque: noAr.filter((o) => o.destaque).length,
      filaTelegram: noAr.filter((o) => !o.postada_telegram_em).length,
      semFoto: noAr.filter((o) => !o.imagem).length,
      pendentes: pendentesR.count ?? 0,
      semCliques,
      cliquesHoje: mapaDias.get(diaSP(agora)) ?? 0,
      cliques7: somaDias(ultimosDias(7)),
      cliques30: somaDias(ultimosDias(30)),
      cliques14: ultimosDias(14).map((dia) => ({ dia, total: mapaDias.get(dia) ?? 0 })),
      novas14: ultimosDias(14).map((dia) => ({ dia, total: novasPorDia.get(dia) ?? 0 })),
      topOfertas: porOferta.data ?? [],
      origensClique: porOrigem.data ?? [],
      lojas: contarPor(noAr, (o) => o.loja, 10),
      categorias: contarPor(noAr, (o) => nomeCategoria(o.categoria), 12),
      origens: contarPor(noAr, (o) => nomeOrigem(o.origem), 6),
    });
    setAtualizadoEm(new Date());
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (erro) return <p className="adm-aviso">{erro}</p>;
  if (!dados) return <p className="adm-centro">Carregando números...</p>;

  const ir = (aba) => (irPara ? () => irPara(aba) : undefined);

  return (
    <>
      <div className="adm-titulo-linha">
        <div>
          <h1>Resumo</h1>
          <p className="adm-sub">
            Visão geral do site
            {atualizadoEm && ` · atualizado às ${atualizadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
          </p>
        </div>
        <button className="adm-btn" onClick={carregar}>
          ↻ Atualizar
        </button>
      </div>

      <h2 className="adm-secao">Ofertas</h2>
      <div className="adm-cards">
        <Card valor={dados.noAr} nome="No ar agora" cor="verde" aoClicar={ir("ofertas")} />
        <Card valor={dados.novas24h} nome="Novas nas últimas 24h" />
        <Card valor={dados.expiradas} nome="Expiradas (ainda visíveis)" cor="vermelho" />
        <Card valor={dados.ocultas} nome="Ocultas" cor="cinza" />
        <Card valor={dados.relampago} nome="Relâmpago no ar" cor="laranja" />
        <Card valor={dados.destaque} nome="Destaque no ar" cor="laranja" />
        <Card
          valor={dados.filaTelegram}
          nome="Na fila do Telegram"
          detalhe="no ar e ainda não postadas"
          aoClicar={ir("robo")}
        />
        <Card
          valor={dados.pendentes}
          nome="Sugestões pendentes"
          cor={dados.pendentes > 0 ? "amarelo" : "neutro"}
          aoClicar={ir("comunidade")}
        />
      </div>

      <h2 className="adm-secao">Cliques</h2>
      {dados.semCliques ? (
        <p className="adm-aviso">
          Os números de cliques não carregaram. Confira se o arquivo supabase-admin.sql foi executado no Supabase.
        </p>
      ) : (
        <div className="adm-cards">
          <Card valor={dados.cliquesHoje} nome="Cliques hoje" cor="azul" />
          <Card valor={dados.cliques7} nome="Cliques em 7 dias" cor="azul" />
          <Card valor={dados.cliques30} nome="Cliques em 30 dias" cor="azul" />
          <Card
            valor={dados.noAr ? (dados.cliques7 / dados.noAr).toFixed(1) : "0"}
            nome="Cliques por oferta no ar"
            detalhe="média dos últimos 7 dias"
          />
        </div>
      )}

      <div className="adm-duas">
        <section className="adm-bloco">
          <h2>Cliques nos últimos 14 dias</h2>
          <Colunas dias={dados.cliques14} rotulo="cliques" />
        </section>
        <section className="adm-bloco">
          <h2>Ofertas novas por dia</h2>
          <Colunas dias={dados.novas14} rotulo="ofertas novas" />
        </section>
      </div>

      <div className="adm-duas">
        <section className="adm-bloco">
          <h2>Ofertas mais clicadas</h2>
          {dados.topOfertas.length === 0 ? (
            <p className="adm-vazio">Ainda não há cliques registrados.</p>
          ) : (
            <ol className="adm-ranking">
              {dados.topOfertas.map((o, i) => (
                <li key={o.id}>
                  <span className="adm-pos">{i + 1}</span>
                  <span className="adm-ranking-titulo">
                    <a href={`/oferta/${o.id}`} target="_blank" rel="noopener noreferrer">
                      {o.titulo}
                    </a>
                    <small>{o.loja}</small>
                  </span>
                  <strong>{o.total}</strong>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="adm-bloco">
          <h2>De onde vêm os cliques</h2>
          <Barras
            itens={dados.origensClique.map((o) => ({
              nome: o.origem === "telegram" ? "Telegram" : "Site",
              total: o.total,
            }))}
            vazio="Ainda não há cliques registrados."
          />
          <h2 className="adm-bloco-sub">De onde vêm as ofertas no ar</h2>
          <Barras itens={dados.origens} />
        </section>
      </div>

      <div className="adm-duas">
        <section className="adm-bloco">
          <h2>Lojas com mais ofertas no ar</h2>
          <Barras itens={dados.lojas} />
        </section>
        <section className="adm-bloco">
          <h2>Categorias com mais ofertas no ar</h2>
          <Barras itens={dados.categorias} />
        </section>
      </div>
    </>
  );
}
