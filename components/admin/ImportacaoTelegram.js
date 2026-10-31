"use client";

// O que aconteceu com cada postagem do canal do Telegram nas últimas horas:
// quantas entraram no site e por que as outras ficaram de fora.
// Salve como components/admin/ImportacaoTelegram.js (é usado dentro da aba Saúde do robô).

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Barras, ha, dataHora } from "./util";

// Nome e explicação de cada resultado
const MOTIVOS = {
  salva: { nome: "Entrou no site", dica: "Publicada", cor: "verde" },
  renovada: { nome: "Renovada", dica: "Já estava no site e ganhou mais dias", cor: "verde" },
  publicada_manual: { nome: "Publicada por você", dica: "Publicada pelo botão \"Publicar mesmo assim\"", cor: "verde" },
  sem_desconto: {
    nome: "Sem preço antigo",
    dica: "A postagem não tinha o preço \"de\" e o site não conseguiu descobrir na loja. Coloque \"De R$ X por R$ Y\" na postagem ou desligue \"Só aceitar ofertas com preço antigo\" nas Configurações.",
    cor: "vermelho",
  },
  desconto_baixo: {
    nome: "Desconto baixo",
    dica: "Desconto menor que o mínimo das Configurações.",
    cor: "amarelo",
  },
  limite_por_hora: {
    nome: "Limite por hora",
    dica: "Passou do máximo de ofertas novas por hora (Configurações → Telegram).",
    cor: "amarelo",
  },
  duplicada: { nome: "Repetida", dica: "O mesmo link já estava no site.", cor: "cinza" },
  duplicada_titulo: { nome: "Repetida", dica: "Mesmo produto, loja e preço já estavam no site.", cor: "cinza" },
  sem_preco: { nome: "Sem preço", dica: "Não foi possível ler o preço na postagem.", cor: "vermelho" },
  sem_titulo_ou_link: { nome: "Não é oferta", dica: "Postagem sem título ou sem link (avisos, enquetes etc.).", cor: "cinza" },
  sem_categoria: {
    nome: "Sem categoria",
    dica: "O site não reconheceu o produto pelo título, então não sabe em que departamento colocar. \"Publicar mesmo assim\" coloca a oferta só na página inicial (sem departamento). Mande o título para acrescentar a palavra no classificador.",
    cor: "amarelo",
  },
  categoria_ignorada: { nome: "Categoria ignorada", dica: "Categoria que você escolheu não receber.", cor: "cinza" },
  importacao_pausada: { nome: "Importação pausada", dica: "A importação está pausada nas Configurações.", cor: "amarelo" },
  erro_busca: { nome: "Erro", dica: "Erro ao consultar o banco.", cor: "vermelho" },
  erro_insert: { nome: "Erro", dica: "Erro ao gravar a oferta.", cor: "vermelho" },
};
const motivo = (m) => MOTIVOS[m] ?? { nome: m, dica: "", cor: "cinza" };
const ENTRARAM = new Set(["salva", "renovada", "publicada_manual"]);
// Recusas que dá para ignorar com o botão "Publicar mesmo assim"
const PUBLICAVEIS = new Set(["sem_desconto", "desconto_baixo", "limite_por_hora", "importacao_pausada", "sem_categoria"]);

const PERIODOS = [
  [6, "6 horas"],
  [24, "24 horas"],
  [48, "48 horas"],
  [168, "7 dias"],
];

export default function ImportacaoTelegram() {
  const [linhas, setLinhas] = useState(null);
  const [erro, setErro] = useState("");
  const [horas, setHoras] = useState(24);
  const [loja, setLoja] = useState("todas");
  const [soRecusadas, setSoRecusadas] = useState(true);
  const [publicando, setPublicando] = useState(null);
  const [aviso, setAviso] = useState("");

  const carregar = useCallback(async () => {
    setErro("");
    const desde = new Date(Date.now() - horas * 3600000).toISOString();
    const { data, error } = await supabase
      .from("telegram_log")
      .select("id, criado_em, origem, motivo, loja, titulo, link, preco, desconto, detalhe")
      .gte("criado_em", desde)
      .order("criado_em", { ascending: false })
      .limit(2000);
    if (error) {
      setErro(
        `O registro ainda não está ativo (${error.message}). Rode o arquivo telegram-log.sql no Supabase e suba o novo lib/salvar-oferta.js.`
      );
      setLinhas([]);
      return;
    }
    setLinhas(data ?? []);
  }, [horas]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function publicar(l) {
    if (!confirm(`Publicar "${l.titulo}" no site mesmo assim?`)) return;
    setPublicando(l.id);
    setAviso("");
    try {
      const { data } = await supabase.auth.getSession();
      const r = await fetch("/api/admin/telegram-publicar", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` },
        body: JSON.stringify({ id: l.id }),
      });
      const json = await r.json().catch(() => ({}));
      setAviso(json.mensagem || json.erro || (r.ok ? "Publicada!" : "Não foi possível publicar."));
      if (r.ok) carregar();
    } catch (e) {
      setAviso(`Não foi possível publicar: ${e.message}`);
    }
    setPublicando(null);
  }

  const lojas = useMemo(
    () => [...new Set((linhas ?? []).map((l) => l.loja).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [linhas]
  );

  if (linhas === null) return <section className="adm-bloco"><p>Carregando o registro do Telegram...</p></section>;

  const daLoja = linhas.filter((l) => loja === "todas" || l.loja === loja);
  // "Não é oferta" (avisos do canal) não conta no total
  const ofertas = daLoja.filter((l) => l.motivo !== "sem_titulo_ou_link");
  const entraram = ofertas.filter((l) => ENTRARAM.has(l.motivo)).length;

  const porMotivo = new Map();
  for (const l of ofertas) {
    const nome = motivo(l.motivo).nome;
    porMotivo.set(nome, (porMotivo.get(nome) ?? 0) + 1);
  }
  const barras = [...porMotivo.entries()].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total);

  const lista = ofertas.filter((l) => !soRecusadas || !ENTRARAM.has(l.motivo)).slice(0, 40);

  return (
    <section className="adm-bloco">
      <div className="adm-titulo-linha">
        <h2>📨 Postagens do canal do Telegram</h2>
        <div className="adm-acoes">
          <select className="adm-input adm-input--curto" value={horas} onChange={(e) => setHoras(Number(e.target.value))}>
            {PERIODOS.map(([h, nome]) => (
              <option key={h} value={h}>
                Últimas {nome}
              </option>
            ))}
          </select>
          <select className="adm-input adm-input--curto" value={loja} onChange={(e) => setLoja(e.target.value)}>
            <option value="todas">Todas as lojas</option>
            {lojas.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <button className="adm-btn" onClick={carregar}>
            ↻
          </button>
        </div>
      </div>

      {aviso && (
        <p className="adm-aviso">
          {aviso}
          <button className="adm-aviso-fechar" onClick={() => setAviso("")} aria-label="Fechar aviso">
            ×
          </button>
        </p>
      )}

      {erro ? (
        <p className="adm-aviso">{erro}</p>
      ) : ofertas.length === 0 ? (
        <p className="adm-vazio">Nenhuma postagem de oferta neste período{loja !== "todas" ? ` da ${loja}` : ""}.</p>
      ) : (
        <>
          <p>
            <strong>{ofertas.length}</strong> ofertas postadas{loja !== "todas" ? ` da ${loja}` : ""} ·{" "}
            <strong style={{ color: "#15803d" }}>
              {entraram} {entraram === 1 ? "entrou" : "entraram"} no site
            </strong>{" "}
            ·{" "}
            <strong style={{ color: "#b42318" }}>
              {ofertas.length - entraram} {ofertas.length - entraram === 1 ? "ficou" : "ficaram"} de fora
            </strong>
          </p>
          <Barras itens={barras} />

          <div className="adm-titulo-linha" style={{ marginTop: 18 }}>
            <h2 className="adm-bloco-sub" style={{ margin: 0 }}>
              {soRecusadas ? "Últimas que ficaram de fora" : "Últimas postagens"}
            </h2>
            <label className="adm-massa-check" style={{ fontWeight: 600 }}>
              <input type="checkbox" checked={soRecusadas} onChange={(e) => setSoRecusadas(e.target.checked)} />
              Só as que ficaram de fora
            </label>
          </div>

          {lista.length === 0 ? (
            <p className="adm-vazio">Nenhuma ficou de fora neste período. 🎉</p>
          ) : (
            <ul className="adm-alerta-lista">
              {lista.map((l) => {
                const m = motivo(l.motivo);
                return (
                  <li key={l.id}>
                    <span className={`adm-exec-status adm-exec-status--${m.cor}`} title={m.dica}>
                      {m.nome}
                    </span>
                    <span className="adm-ranking-titulo" title={m.dica}>
                      {l.titulo || "(sem título)"}
                      <small>
                        {l.loja ?? "loja ?"}
                        {l.preco ? ` · R$ ${Number(l.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""}
                        {l.desconto !== null && l.desconto !== undefined ? ` · ${l.desconto}% de desconto` : ""}
                        {l.detalhe ? ` · ${l.detalhe}` : ""} · {ha(l.criado_em)} ({dataHora(l.criado_em)})
                      </small>
                    </span>
                    <span className="adm-alerta-acoes">
                      {PUBLICAVEIS.has(l.motivo) && (
                        <button
                          className="adm-btn adm-btn--publicar"
                          disabled={publicando === l.id}
                          onClick={() => publicar(l)}
                          title="Publica no site ignorando o preço antigo, o desconto mínimo e o limite por hora"
                        >
                          {publicando === l.id ? "Publicando..." : "Publicar mesmo assim"}
                        </button>
                      )}
                      {l.link && (
                        <a className="adm-btn" href={l.link} target="_blank" rel="noopener noreferrer nofollow">
                          Abrir ↗
                        </a>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="adm-legenda" style={{ margin: "10px 0 0" }}>
            Passe o mouse sobre o motivo para ver o que fazer.
          </p>
        </>
      )}
    </section>
  );
}
