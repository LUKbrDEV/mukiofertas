"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { categorias } from "../../data/ofertas";
import { formatarPreco } from "../../lib/ofertas";

const nomeCategoria = (slug) => categorias.find((c) => c.slug === slug)?.nome ?? slug;

function enderecoDe(link) {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

export default function ListaSugestoes({ aoRevisar }) {
  const [sugestoes, setSugestoes] = useState([]);
  const [status, setStatus] = useState("pendente");
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState("");

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from("sugestoes")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(200);
    if (error) {
      setAviso(`${error.message} (o arquivo supabase-comunidade.sql foi executado no Supabase?)`);
    } else {
      setSugestoes(data ?? []);
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function mudarStatus(s, novoStatus) {
    const { error } = await supabase.from("sugestoes").update({ status: novoStatus }).eq("id", s.id);
    setAviso(error ? error.message : "");
    carregar();
  }

  async function apagar(s) {
    if (!confirm(`Apagar a sugestão "${s.titulo}"? O e-mail de quem enviou também será apagado.`)) return;
    const { error } = await supabase.from("sugestoes").delete().eq("id", s.id);
    setAviso(error ? error.message : "");
    carregar();
  }

  const lista = sugestoes.filter((s) => status === "todas" || s.status === status);
  const pendentes = sugestoes.filter((s) => s.status === "pendente").length;

  return (
    <>
      <h1>Comunidade</h1>
      <p className="adm-sub">
        Promoções enviadas pelos membros. {pendentes} aguardando revisão.
      </p>

      <div className="adm-filtros">
        <select className="adm-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="pendente">Pendentes</option>
          <option value="aprovada">Aprovadas</option>
          <option value="rejeitada">Rejeitadas</option>
          <option value="todas">Todas</option>
        </select>
      </div>

      {aviso && <p className="adm-aviso">{aviso}</p>}
      {carregando && <p className="adm-centro">Carregando...</p>}
      {!carregando && lista.length === 0 && (
        <p className="adm-vazio">Nenhuma sugestão nesta lista.</p>
      )}

      <div className="adm-lista">
        {lista.map((s) => (
          <div key={s.id} className="adm-linha">
            <div className="adm-linha-info">
              <strong>{s.titulo}</strong>
              <div className="adm-linha-meta">
                <span>{s.loja}</span>
                <span>{nomeCategoria(s.categoria)}</span>
                <span>
                  {formatarPreco(s.preco_atual)}
                  {s.preco_antigo ? ` (antes ${formatarPreco(s.preco_antigo)})` : ""}
                </span>
                {s.cupom && <span>Cupom {s.cupom}</span>}
              </div>
              <div className="adm-linha-meta">
                <span>Por {s.usuario}</span>
                <span>{s.email}</span>
                <span>{new Date(s.criado_em).toLocaleString("pt-BR")}</span>
              </div>
              <p className="adm-linha-link">
                Link para {enderecoDe(s.link)}:{" "}
                <a href={s.link} target="_blank" rel="noopener noreferrer nofollow">
                  abrir em nova aba
                </a>
              </p>
              <div className="adm-etiquetas">
                <span
                  className={
                    s.status === "pendente"
                      ? "adm-etiqueta adm-etiqueta--amarela"
                      : s.status === "aprovada"
                        ? "adm-etiqueta adm-etiqueta--verde"
                        : "adm-etiqueta adm-etiqueta--cinza"
                  }
                >
                  {s.status === "pendente" ? "Pendente" : s.status === "aprovada" ? "Aprovada" : "Rejeitada"}
                </span>
              </div>
            </div>

            <div className="adm-acoes">
              {s.status === "pendente" && (
                <>
                  <button className="adm-btn adm-btn--primario" onClick={() => aoRevisar(s)}>
                    Revisar e publicar
                  </button>
                  <button className="adm-btn" onClick={() => mudarStatus(s, "rejeitada")}>
                    Rejeitar
                  </button>
                </>
              )}
              {s.status === "rejeitada" && (
                <button className="adm-btn" onClick={() => mudarStatus(s, "pendente")}>
                  Voltar para pendentes
                </button>
              )}
              <button className="adm-btn adm-btn--perigo" onClick={() => apagar(s)}>
                Apagar
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
