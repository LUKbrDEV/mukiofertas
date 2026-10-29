"use client";

// Aba Configurações do painel admin.
// Salve como components/admin/Configuracoes.js.
//
// As regras ficam na tabela config_site do Supabase. O banco usa as de Relâmpago e Destaque
// na hora em que a oferta entra (ou muda de preço) e o robô lê as outras a cada execução.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { DIAS_NO_SITE, DIAS_EXPIRADA_VISIVEL, DIAS_BLOQUEIO_REPUBLICAR } from "../../lib/prazos.mjs";

const PADRAO = {
  relampago_preco_minimo: 500,
  relampago_desconto_minimo: 40,
  destaque_desconto_minimo: 60,
  desconto_minimo_publicar: 20,
  tolerancia_percentual: 10,
  horas_entre_conferencias: 5,
  renovar_se_preco_mantido: true,
  dias_renovacao: 5,
  max_renovacoes: 2,
  coleta_pausada: false,
  conferencia_pausada: false,
};

function Numero({ rotulo, dica, valor, aoMudar, sufixo, min = 0, max, passo = 1 }) {
  return (
    <label className="adm-campo">
      <span className="adm-rotulo">{rotulo}</span>
      <span className="adm-input-sufixo">
        <input
          className="adm-input"
          type="number"
          min={min}
          max={max}
          step={passo}
          value={valor ?? ""}
          onChange={(e) => aoMudar(e.target.value === "" ? "" : Number(e.target.value))}
        />
        {sufixo && <span>{sufixo}</span>}
      </span>
      {dica && <small>{dica}</small>}
    </label>
  );
}

function Chave({ rotulo, dica, ligado, aoMudar, perigo }) {
  return (
    <label className={`adm-chave${perigo && ligado ? " adm-chave--perigo" : ""}`}>
      <input type="checkbox" checked={Boolean(ligado)} onChange={(e) => aoMudar(e.target.checked)} />
      <span className="adm-chave-trilho" aria-hidden="true" />
      <span>
        <strong>{rotulo}</strong>
        {dica && <small>{dica}</small>}
      </span>
    </label>
  );
}

export default function Configuracoes() {
  const [c, setC] = useState(null);
  const [original, setOriginal] = useState(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [atualizadoEm, setAtualizadoEm] = useState(null);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from("config_site").select("dados, atualizado_em").eq("id", 1).maybeSingle();
    if (error || !data) {
      setErro(
        error
          ? `Não foi possível ler as configurações (${error.message}).`
          : "As configurações ainda não existem no banco."
      );
      return;
    }
    const dados = { ...PADRAO, ...data.dados };
    setC(dados);
    setOriginal(dados);
    setAtualizadoEm(data.atualizado_em);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const mudar = (campo) => (valor) => setC((atual) => ({ ...atual, [campo]: valor }));
  const alterado = c && original && JSON.stringify(c) !== JSON.stringify(original);
  const regrasMudaram =
    c &&
    original &&
    ["relampago_preco_minimo", "relampago_desconto_minimo", "destaque_desconto_minimo"].some(
      (k) => c[k] !== original[k]
    );

  async function salvar() {
    setAviso("");
    for (const [k, v] of Object.entries(c)) {
      if (v === "") return setAviso("Preencha todos os campos antes de salvar.");
      if (typeof v === "number" && v < 0) return setAviso("Os valores não podem ser negativos.");
    }
    if (c.horas_entre_conferencias < 1) return setAviso("A conferência de preço precisa ser de no mínimo 1 em 1 hora.");

    setSalvando(true);
    const agora = new Date().toISOString();
    const { error } = await supabase.from("config_site").update({ dados: c, atualizado_em: agora }).eq("id", 1);
    setSalvando(false);
    if (error) return setAviso(`Não foi possível salvar: ${error.message}`);

    setOriginal(c);
    setAtualizadoEm(agora);
    setAviso(
      regrasMudaram
        ? "Salvo! As regras novas valem para as próximas ofertas. Para aplicar nas que já estão no site, clique em \"Aplicar às ofertas atuais\"."
        : "Salvo! O robô usa os valores novos a partir da próxima execução."
    );
  }

  async function aplicarAtuais() {
    if (alterado) return setAviso("Salve as alterações antes de aplicar às ofertas atuais.");
    if (!confirm("Recalcular Relâmpago e Destaque de todas as ofertas com as regras atuais? As marcações feitas à mão serão substituídas.")) return;
    setAplicando(true);
    const { data, error } = await supabase.rpc("reaplicar_regras_destaque");
    setAplicando(false);
    setAviso(error ? `Não foi possível aplicar: ${error.message}` : `Pronto! ${data ?? 0} ofertas foram ajustadas.`);
  }

  if (erro)
    return (
      <>
        <h1>Configurações</h1>
        <p className="adm-aviso">
          {erro} Rode o arquivo <strong>admin-painel.sql</strong> no Supabase (SQL Editor) e confira se o seu
          e-mail está na lista de administradores.
        </p>
      </>
    );
  if (!c) return <p className="adm-centro">Carregando configurações...</p>;

  return (
    <>
      <div className="adm-titulo-linha">
        <div>
          <h1>Configurações</h1>
          <p className="adm-sub">
            Regras do site e do robô
            {atualizadoEm && ` · salvas em ${new Date(atualizadoEm).toLocaleString("pt-BR")}`}
          </p>
        </div>
        <button className="adm-btn adm-btn--primario" onClick={salvar} disabled={!alterado || salvando}>
          {salvando ? "Salvando..." : alterado ? "Salvar alterações" : "Tudo salvo"}
        </button>
      </div>

      {aviso && (
        <p className="adm-aviso">
          {aviso}
          <button className="adm-aviso-fechar" onClick={() => setAviso("")} aria-label="Fechar aviso">
            ×
          </button>
        </p>
      )}

      <section className="adm-bloco">
        <h2>⚡ Promoção relâmpago</h2>
        <p>A tag Relâmpago e a faixa do topo da página inicial. A oferta precisa ter as duas coisas.</p>
        <div className="adm-duas-colunas">
          <Numero
            rotulo="Preço acima de"
            sufixo="R$"
            valor={c.relampago_preco_minimo}
            aoMudar={mudar("relampago_preco_minimo")}
            passo={10}
          />
          <Numero
            rotulo="Desconto de pelo menos"
            sufixo="%"
            max={99}
            valor={c.relampago_desconto_minimo}
            aoMudar={mudar("relampago_desconto_minimo")}
          />
        </div>
      </section>

      <section className="adm-bloco">
        <h2>⭐ Destaque</h2>
        <p>Ofertas em destaque ganham a borda laranja e sobem na lista.</p>
        <div className="adm-duas-colunas">
          <Numero
            rotulo="Desconto de pelo menos"
            sufixo="%"
            max={99}
            valor={c.destaque_desconto_minimo}
            aoMudar={mudar("destaque_desconto_minimo")}
          />
        </div>
        <div className="adm-bloco-rodape">
          <button className="adm-btn" onClick={aplicarAtuais} disabled={aplicando}>
            {aplicando ? "Aplicando..." : "Aplicar Relâmpago e Destaque às ofertas atuais"}
          </button>
          <small>As regras sempre valem para ofertas novas e quando o preço muda. Este botão recalcula as que já estão no site.</small>
        </div>
      </section>

      <section className="adm-bloco">
        <h2>🤖 Robô</h2>
        <div className="adm-duas-colunas">
          <Numero
            rotulo="Publicar só com desconto de pelo menos"
            sufixo="%"
            max={99}
            dica="Vale para as ofertas da Lomadee."
            valor={c.desconto_minimo_publicar}
            aoMudar={mudar("desconto_minimo_publicar")}
          />
        </div>
        <div className="adm-chaves">
          <Chave
            rotulo="Pausar a coleta da Lomadee"
            dica="Enquanto ligado, o robô não traz ofertas novas nem atualiza as que já existem."
            ligado={c.coleta_pausada}
            aoMudar={mudar("coleta_pausada")}
            perigo
          />
          <Chave
            rotulo="Pausar a conferência de preços"
            dica="Enquanto ligado, os preços das ofertas do Telegram e manuais não são conferidos."
            ligado={c.conferencia_pausada}
            aoMudar={mudar("conferencia_pausada")}
            perigo
          />
        </div>
      </section>

      <section className="adm-bloco">
        <h2>💲 Conferência de preço</h2>
        <div className="adm-duas-colunas">
          <Numero
            rotulo="Conferir o preço de cada oferta a cada"
            sufixo="horas"
            min={1}
            max={72}
            valor={c.horas_entre_conferencias}
            aoMudar={mudar("horas_entre_conferencias")}
          />
          <Numero
            rotulo="O preço pode subir até"
            sufixo="%"
            max={100}
            dica="Passando disso, a oferta fica como Expirada. Se o preço cair, a oferta continua."
            valor={c.tolerancia_percentual}
            aoMudar={mudar("tolerancia_percentual")}
          />
        </div>
      </section>

      <section className="adm-bloco">
        <h2>🔄 Renovação</h2>
        <p>Oferta perto de expirar que continua com o preço de promoção ganha mais dias no site.</p>
        <div className="adm-chaves">
          <Chave
            rotulo="Renovar ofertas que mantêm o preço"
            ligado={c.renovar_se_preco_mantido}
            aoMudar={mudar("renovar_se_preco_mantido")}
          />
        </div>
        <div className="adm-duas-colunas">
          <Numero
            rotulo="Dias a mais em cada renovação"
            sufixo="dias"
            min={1}
            max={30}
            valor={c.dias_renovacao}
            aoMudar={mudar("dias_renovacao")}
          />
          <Numero
            rotulo="Máximo de renovações"
            sufixo="vezes"
            dica="0 = sem limite."
            max={20}
            valor={c.max_renovacoes}
            aoMudar={mudar("max_renovacoes")}
          />
        </div>
      </section>

      <section className="adm-bloco adm-bloco--info">
        <h2>📅 Prazos fixos</h2>
        <p>
          Estes ficam no arquivo <code>lib/prazos.mjs</code> porque o site também usa para mostrar a tag Expirado:
        </p>
        <ul className="adm-lista-simples">
          <li>
            Oferta fica no ar por <strong>{DIAS_NO_SITE} dias</strong> antes de expirar
          </li>
          <li>
            Expirada continua visível por <strong>{DIAS_EXPIRADA_VISIVEL} dias</strong> e depois é apagada
          </li>
          <li>
            Oferta apagada não volta pelo robô por <strong>{DIAS_BLOQUEIO_REPUBLICAR} dias</strong>
          </li>
        </ul>
      </section>
    </>
  );
}
