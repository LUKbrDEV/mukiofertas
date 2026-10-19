"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const fusoSP = { timeZone: "America/Sao_Paulo" };

function dataSP(data) {
  // formato AAAA-MM-DD, igual ao que o banco devolve
  return data.toLocaleDateString("sv-SE", fusoSP);
}

function ultimosDias(quantidade) {
  const agora = Date.now();
  const dias = [];
  for (let i = quantidade - 1; i >= 0; i--) {
    dias.push(dataSP(new Date(agora - i * 86400000)));
  }
  return dias;
}

export default function Resumo() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      const contar = () =>
        supabase.from("ofertas").select("*", { count: "exact", head: true });

      const [ativas, relampagos, manuais, porDia, porOferta, porOrigem] = await Promise.all([
        contar().eq("ativa", true),
        contar().eq("ativa", true).eq("relampago", true),
        contar().eq("origem", "manual"),
        supabase.from("cliques_por_dia").select("*").order("dia", { ascending: false }).limit(30),
        supabase.from("cliques_por_oferta").select("*").order("total", { ascending: false }).limit(8),
        supabase.from("cliques_por_origem").select("*"),
      ]);

      const falha = [ativas, relampagos, manuais, porDia, porOferta, porOrigem].find(
        (r) => r.error
      );
      if (falha) {
        setErro(
          `Não foi possível carregar os números (${falha.error.message}). ` +
            "Confira se o arquivo supabase-admin.sql foi executado no Supabase."
        );
        return;
      }

      const mapaDias = new Map((porDia.data ?? []).map((l) => [l.dia, l.total]));
      const dias14 = ultimosDias(14).map((dia) => ({ dia, total: mapaDias.get(dia) ?? 0 }));
      const dias7 = ultimosDias(7);
      const soma = (lista) => lista.reduce((t, dia) => t + (mapaDias.get(dia) ?? 0), 0);

      setDados({
        ativas: ativas.count ?? 0,
        relampagos: relampagos.count ?? 0,
        manuais: manuais.count ?? 0,
        hoje: mapaDias.get(dataSP(new Date())) ?? 0,
        semana: soma(dias7),
        mes: [...mapaDias.values()].reduce((t, n) => t + n, 0),
        dias14,
        topOfertas: porOferta.data ?? [],
        origens: porOrigem.data ?? [],
      });
    }
    carregar();
  }, []);

  if (erro) return <p className="adm-aviso">{erro}</p>;
  if (!dados) return <p className="adm-centro">Carregando números...</p>;

  const maior = Math.max(1, ...dados.dias14.map((d) => d.total));

  return (
    <>
      <h1>Resumo</h1>
      <p className="adm-sub">Visão geral das ofertas e dos cliques.</p>

      <div className="adm-cards">
        <div className="adm-card">
          <strong>{dados.ativas}</strong>
          <span>Ofertas ativas</span>
        </div>
        <div className="adm-card">
          <strong>{dados.relampagos}</strong>
          <span>Relâmpagos ativas</span>
        </div>
        <div className="adm-card">
          <strong>{dados.manuais}</strong>
          <span>Cadastradas à mão</span>
        </div>
        <div className="adm-card">
          <strong>{dados.hoje}</strong>
          <span>Cliques hoje</span>
        </div>
        <div className="adm-card">
          <strong>{dados.semana}</strong>
          <span>Cliques em 7 dias</span>
        </div>
        <div className="adm-card">
          <strong>{dados.mes}</strong>
          <span>Cliques em 30 dias</span>
        </div>
      </div>

      <section className="adm-bloco">
        <h2>Cliques nos últimos 14 dias</h2>
        <div className="adm-grafico">
          {dados.dias14.map((d) => (
            <div key={d.dia} className="adm-barra-wrap" title={`${d.dia}: ${d.total} cliques`}>
              <div className="adm-barra-area">
                <div className="adm-barra" style={{ height: `${(d.total / maior) * 100}%` }} />
              </div>
              <span>{d.dia.slice(8, 10)}</span>
            </div>
          ))}
        </div>
      </section>

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
                    {o.titulo}
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
          {dados.origens.length === 0 ? (
            <p className="adm-vazio">Ainda não há cliques registrados.</p>
          ) : (
            <ul className="adm-ranking">
              {dados.origens.map((o) => (
                <li key={o.origem}>
                  <span className="adm-pos" />
                  <span className="adm-ranking-titulo">
                    {o.origem === "telegram" ? "Telegram" : "Site"}
                  </span>
                  <strong>{o.total}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
