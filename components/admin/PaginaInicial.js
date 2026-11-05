"use client";

// Aba "Página inicial" do painel admin: escolha quais ofertas ficam FIXAS no topo da página inicial
// (aba Destaques e faixa "Escolhas do Muki") e em que ordem.
// Salve como components/admin/PaginaInicial.js. Usa as colunas fixada_home e fixada_ordem (supabase-admin.sql).
// As regras automáticas da vitrine (pontuação, variedade) continuam em Configurações → Página inicial.

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { calcularDesconto, formatarPreco, estaExpirada } from "../../lib/ofertas";
import { buscarTudo, ha } from "./util";

function Linha({ o, posicao, total, aoSubir, aoDescer, aoTirar }) {
  const desconto = calcularDesconto(o);
  const expirada = estaExpirada(o) || !o.ativa;
  return (
    <li className={`adm2-fixa${expirada ? " adm2-fixa--off" : ""}`}>
      <span className="adm2-fixa-pos">{posicao}</span>
      <span className="adm2-fixa-foto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {o.imagem ? <img src={o.imagem} alt="" loading="lazy" /> : null}
      </span>
      <span className="adm2-fixa-info">
        <strong>{o.titulo}</strong>
        <small>
          {o.loja} · {formatarPreco(o.preco_atual)}
          {desconto > 0 && ` · -${desconto}%`}
          {expirada && " · ⚠️ expirada ou oculta (não aparece no site)"}
        </small>
      </span>
      <span className="adm2-fixa-botoes">
        <button className="adm-btn adm2-icone" onClick={aoSubir} disabled={posicao === 1} title="Subir">
          ↑
        </button>
        <button className="adm-btn adm2-icone" onClick={aoDescer} disabled={posicao === total} title="Descer">
          ↓
        </button>
        <button className="adm-btn adm-btn--perigo" onClick={aoTirar}>
          Tirar
        </button>
      </span>
    </li>
  );
}

export default function PaginaInicial() {
  const [ofertas, setOfertas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState("");
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    const r = await buscarTudo(() => supabase.from("ofertas").select("*").eq("ativa", true).order("atualizado_em", { ascending: false }));
    if (r.error) setAviso(r.error.message);
    else setOfertas(r.data);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const fixadas = useMemo(
    () => ofertas.filter((o) => o.fixada_home).sort((a, b) => (a.fixada_ordem ?? 999) - (b.fixada_ordem ?? 999)),
    [ofertas]
  );

  const resultados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const noAr = ofertas.filter((o) => !o.fixada_home && !estaExpirada(o));
    const lista = termo ? noAr.filter((o) => `${o.titulo} ${o.loja}`.toLowerCase().includes(termo)) : noAr;
    // sem busca: sugere as com mais desconto e mais likes
    return [...lista]
      .sort((a, b) => (termo ? 0 : calcularDesconto(b) + (b.likes ?? 0) * 5 - (calcularDesconto(a) + (a.likes ?? 0) * 5)))
      .slice(0, 20);
  }, [ofertas, busca]);

  // Grava a ordem 1, 2, 3... de uma lista
  async function salvarOrdem(lista, mensagem) {
    setOfertas((todas) =>
      todas.map((o) => {
        const i = lista.findIndex((x) => x.id === o.id);
        return i === -1 ? o : { ...o, fixada_home: true, fixada_ordem: i + 1 };
      })
    );
    for (let i = 0; i < lista.length; i++) {
      if (lista[i].fixada_ordem !== i + 1 || !lista[i].fixada_home) {
        const { error } = await supabase.from("ofertas").update({ fixada_home: true, fixada_ordem: i + 1 }).eq("id", lista[i].id);
        if (error) return setAviso(error.message.includes("fixada") ? `${error.message} (rode o supabase-admin.sql no Supabase)` : error.message);
      }
    }
    setAviso(mensagem);
  }

  function mover(indice, passo) {
    const lista = [...fixadas];
    const [item] = lista.splice(indice, 1);
    lista.splice(indice + passo, 0, item);
    salvarOrdem(lista, "Ordem salva.");
  }

  async function tirar(o) {
    setOfertas((todas) => todas.map((x) => (x.id === o.id ? { ...x, fixada_home: false, fixada_ordem: null } : x)));
    const { error } = await supabase.from("ofertas").update({ fixada_home: false, fixada_ordem: null }).eq("id", o.id);
    if (error) return setAviso(error.message);
    await salvarOrdem(fixadas.filter((x) => x.id !== o.id), `"${o.titulo}" saiu da página inicial.`);
  }

  function fixar(o, noTopo = false) {
    const lista = noTopo ? [o, ...fixadas] : [...fixadas, o];
    salvarOrdem(lista, `"${o.titulo}" fixada ${noTopo ? "no topo" : "no fim da lista"}.`);
  }

  return (
    <>
      <div className="adm-titulo-linha">
        <div>
          <h1>Página inicial</h1>
          <p className="adm-sub">
            Escolha as ofertas que aparecem <strong>primeiro</strong> na página inicial (aba Destaques e faixa Escolhas do Muki).
            Depois delas, a vitrine continua automática.
          </p>
        </div>
        <a className="adm-btn" href="/" target="_blank" rel="noopener noreferrer">
          Ver a página inicial ↗
        </a>
      </div>

      {aviso && (
        <p className="adm-aviso">
          {aviso}
          <button className="adm-aviso-fechar" onClick={() => setAviso("")} aria-label="Fechar aviso">
            ×
          </button>
        </p>
      )}

      <div className="adm2-duas">
        <section className="adm-bloco">
          <h2>📌 Fixadas na página inicial ({fixadas.length})</h2>
          {carregando ? (
            <p>Carregando...</p>
          ) : fixadas.length === 0 ? (
            <p>
              Nenhuma oferta fixada. Procure ao lado e clique em <strong>Fixar</strong>, ou use o botão <strong>📌 Inicial</strong> na aba
              Ofertas.
            </p>
          ) : (
            <ol className="adm2-fixas">
              {fixadas.map((o, i) => (
                <Linha
                  key={o.id}
                  o={o}
                  posicao={i + 1}
                  total={fixadas.length}
                  aoSubir={() => mover(i, -1)}
                  aoDescer={() => mover(i, 1)}
                  aoTirar={() => tirar(o)}
                />
              ))}
            </ol>
          )}
          <p className="adm2-dica">
            Dica: fixe de 4 a 12 ofertas. Oferta que expira continua na lista, mas some do site sozinha até você tirar ou reativar.
          </p>
        </section>

        <section className="adm-bloco">
          <h2>➕ Adicionar ofertas</h2>
          <input
            className="adm-input"
            type="search"
            placeholder="🔎 Buscar oferta no ar por título ou loja"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ width: "100%", marginBottom: 10 }}
          />
          {!busca && <p className="adm2-dica">Sugestões: as com mais desconto e mais likes.</p>}
          <ul className="adm2-fixas">
            {resultados.map((o) => (
              <li key={o.id} className="adm2-fixa">
                <span className="adm2-fixa-foto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {o.imagem ? <img src={o.imagem} alt="" loading="lazy" /> : null}
                </span>
                <span className="adm2-fixa-info">
                  <strong>{o.titulo}</strong>
                  <small>
                    {o.loja} · {formatarPreco(o.preco_atual)}
                    {calcularDesconto(o) > 0 && ` · -${calcularDesconto(o)}%`} · {ha(o.publicada_em)}
                  </small>
                </span>
                <span className="adm2-fixa-botoes">
                  <button className="adm-btn" onClick={() => fixar(o, true)} title="Fixar como a primeira">
                    No topo
                  </button>
                  <button className="adm-btn adm-btn--primario" onClick={() => fixar(o)}>
                    Fixar
                  </button>
                </span>
              </li>
            ))}
            {!carregando && resultados.length === 0 && <p>Nenhuma oferta no ar com essa busca.</p>}
          </ul>
        </section>
      </div>
    </>
  );
}
