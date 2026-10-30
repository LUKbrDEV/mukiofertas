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
  desconto_minimo_tecnologia: 15,
  tolerancia_percentual: 10,
  horas_entre_conferencias: 5,
  renovar_se_preco_mantido: true,
  dias_renovacao: 5,
  max_renovacoes: 2,
  coleta_pausada: false,
  conferencia_pausada: false,
  telegram_max_por_hora: 20,
  aliexpress_ativo: true,
  aliexpress_preco_minimo: 50,
  aliexpress_avaliacao_minima: 90,
  aliexpress_vendas_minimas: 50,
  aliexpress_por_busca: 20,
  aliexpress_max_por_execucao: 12,
  aliexpress_buscas_tecnologia: 3,
  aliexpress_buscas_outras: 2,
  aliexpress_max_por_busca: 3,
  aliexpress_entrega_dias: 7,
  aliexpress_so_mais_vendidos: true,
  telegram_desconto_minimo: 25,
  telegram_exigir_desconto: true,
  telegram_pausado: false,
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
            dica="Vale para as ofertas da Lomadee, Shopee e AliExpress."
            valor={c.desconto_minimo_publicar}
            aoMudar={mudar("desconto_minimo_publicar")}
          />
          <Numero
            rotulo="Para tecnologia, desconto de pelo menos"
            sufixo="%"
            max={99}
            dica="TVs, monitores, notebooks, tablets, celulares e hardware. Vale para o robô e para o Telegram."
            valor={c.desconto_minimo_tecnologia}
            aoMudar={mudar("desconto_minimo_tecnologia")}
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
        <h2>📨 Ofertas do canal do Telegram</h2>
        <p>
          As postagens do canal chegam ao site na hora, pelo webhook. Estas regras decidem quais entram. Valem
          a partir da próxima postagem (em até 1 minuto).
        </p>
        <div className="adm-duas-colunas">
          <Numero
            rotulo="Máximo de ofertas novas por hora"
            sufixo="por hora"
            max={500}
            dica="0 = sem limite. Passando do limite, as postagens daquela hora são ignoradas."
            valor={c.telegram_max_por_hora}
            aoMudar={mudar("telegram_max_por_hora")}
          />
          <Numero
            rotulo="Desconto mínimo"
            sufixo="%"
            max={99}
            dica="Quando o desconto é conhecido e é menor que isso, a oferta não entra."
            valor={c.telegram_desconto_minimo}
            aoMudar={mudar("telegram_desconto_minimo")}
          />
        </div>
        <div className="adm-chaves">
          <Chave
            rotulo="Só aceitar ofertas com preço antigo"
            dica="Desligado: entram também as postagens sem o preço 'de' (aparecem sem a tag de desconto)."
            ligado={c.telegram_exigir_desconto}
            aoMudar={mudar("telegram_exigir_desconto")}
          />
          <Chave
            rotulo="Pausar a importação do Telegram"
            dica="Enquanto ligado, nenhuma postagem do canal entra no site."
            ligado={c.telegram_pausado}
            aoMudar={mudar("telegram_pausado")}
            perigo
          />
        </div>
      </section>

      <section className="adm-bloco">
        <h2>🛒 AliExpress</h2>
        <p>O robô do AliExpress roda junto com a coleta, a cada 30 minutos.</p>
        <div className="adm-chaves">
          <Chave
            rotulo="Coletar ofertas do AliExpress"
            dica="Desligado: o robô não traz ofertas novas do AliExpress (as que já estão no site continuam)."
            ligado={c.aliexpress_ativo}
            aoMudar={mudar("aliexpress_ativo")}
          />
          <Chave
            rotulo="Só os mais vendidos (top sellers)"
            dica="Busca na lista de produtos em alta do AliExpress. Se ela não tiver nada para a busca, usa a busca comum pelos mais vendidos."
            ligado={c.aliexpress_so_mais_vendidos}
            aoMudar={mudar("aliexpress_so_mais_vendidos")}
          />
        </div>
        <label className="adm-campo" style={{ marginBottom: 14 }}>
          <span className="adm-rotulo">Vem do Brasil: entrega em até</span>
          <select
            className="adm-input adm-input--curto"
            value={c.aliexpress_entrega_dias}
            onChange={(e) => mudar("aliexpress_entrega_dias")(Number(e.target.value))}
          >
            <option value={3}>3 dias</option>
            <option value={5}>5 dias</option>
            <option value={7}>7 dias (recomendado)</option>
            <option value={10}>10 dias</option>
            <option value={0}>Qualquer prazo (inclui envio da China)</option>
          </select>
          <small>
            A API do AliExpress não tem um filtro &quot;Vem do Brasil&quot;. Entrega rápida é o que separa os produtos que já estão
            no estoque nacional dos que vêm da China (20 dias ou mais).
          </small>
        </label>
        <div className="adm-duas-colunas">
          <Numero
            rotulo="Só ofertas acima de"
            sufixo="R$"
            passo={5}
            valor={c.aliexpress_preco_minimo}
            aoMudar={mudar("aliexpress_preco_minimo")}
          />
          <Numero
            rotulo="Máximo de ofertas novas por execução"
            sufixo="ofertas"
            min={1}
            max={50}
            valor={c.aliexpress_max_por_execucao}
            aoMudar={mudar("aliexpress_max_por_execucao")}
          />
          <Numero
            rotulo="Buscas de tecnologia por execução"
            sufixo="buscas"
            max={15}
            dica="TV, monitor, notebook, celular, hardware."
            valor={c.aliexpress_buscas_tecnologia}
            aoMudar={mudar("aliexpress_buscas_tecnologia")}
          />
          <Numero
            rotulo="Buscas de outras categorias por execução"
            sufixo="buscas"
            max={15}
            valor={c.aliexpress_buscas_outras}
            aoMudar={mudar("aliexpress_buscas_outras")}
          />
          <Numero
            rotulo="Produtos pedidos à API em cada busca"
            sufixo="produtos"
            min={5}
            max={50}
            dica="Quanto menor, mais rápido e menos chamadas (máximo 50)."
            valor={c.aliexpress_por_busca}
            aoMudar={mudar("aliexpress_por_busca")}
          />
          <Numero
            rotulo="Máximo de ofertas de cada busca"
            sufixo="ofertas"
            min={1}
            max={20}
            valor={c.aliexpress_max_por_busca}
            aoMudar={mudar("aliexpress_max_por_busca")}
          />
          <Numero
            rotulo="Avaliação positiva mínima"
            sufixo="%"
            max={100}
            valor={c.aliexpress_avaliacao_minima}
            aoMudar={mudar("aliexpress_avaliacao_minima")}
          />
          <Numero
            rotulo="Vendas mínimas do produto"
            sufixo="vendas"
            passo={10}
            valor={c.aliexpress_vendas_minimas}
            aoMudar={mudar("aliexpress_vendas_minimas")}
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
