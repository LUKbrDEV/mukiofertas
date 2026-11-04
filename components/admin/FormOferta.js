"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { categorias } from "../../data/ofertas";
import CardOferta from "../CardOferta";

const SELOS = [
  "MENOR PREÇO",
  "IMPERDÍVEL",
  "FRETE GRÁTIS",
  "ÚLTIMAS UNIDADES",
  "OFERTA DO DIA",
  "CUPOM",
];

const LOJAS = ["Amazon", "Mercado Livre", "Shopee", "KaBuM!", "Magalu", "AliExpress"];

const vazio = {
  titulo: "",
  loja: "",
  categoria: categorias[0].slug,
  preco_atual: "",
  preco_antigo: "",
  link: "",
  imagem: "",
  selo: "",
  cupom: "",
  relampago: false,
  destaque: false,
  telegram: true,
};

// Aceita "1.299,90" e também "1299.90"
function numero(valor) {
  const texto = String(valor).trim();
  if (!texto) return NaN;
  return Number(texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto);
}

function iniciar(oferta, sugestao) {
  if (!oferta && sugestao) {
    return {
      ...vazio,
      titulo: sugestao.titulo,
      loja: sugestao.loja,
      categoria: sugestao.categoria,
      preco_atual: String(sugestao.preco_atual),
      preco_antigo: sugestao.preco_antigo ? String(sugestao.preco_antigo) : "",
      link: sugestao.link,
      imagem: sugestao.imagem ?? "",
      cupom: sugestao.cupom ?? "",
      telegram: false,
    };
  }
  if (!oferta) return vazio;
  return {
    titulo: oferta.titulo ?? "",
    loja: oferta.loja ?? "",
    categoria: oferta.categoria ?? categorias[0].slug,
    preco_atual: String(oferta.preco_atual ?? ""),
    preco_antigo: oferta.preco_antigo ? String(oferta.preco_antigo) : "",
    link: oferta.link ?? "",
    imagem: oferta.imagem ?? "",
    selo: oferta.selo ?? "",
    cupom: oferta.cupom ?? "",
    relampago: Boolean(oferta.relampago),
    destaque: Boolean(oferta.destaque),
    telegram: false,
  };
}

function Campo({ rotulo, dica, children }) {
  return (
    <label className="adm-campo">
      <span className="adm-rotulo">{rotulo}</span>
      {children}
      {dica && <small>{dica}</small>}
    </label>
  );
}

export default function FormOferta({ oferta, sugestao = null, aoSalvar }) {
  const editando = Boolean(oferta);
  const automatica = editando && (oferta.origem ?? "automatica") !== "manual";

  const [f, setF] = useState(() => iniciar(oferta, sugestao));
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const mudar = (campo, valor) => setF((atual) => ({ ...atual, [campo]: valor }));

  const atual = numero(f.preco_atual);
  const antigo = numero(f.preco_antigo);

  const previa = {
    id: 0,
    titulo: f.titulo || "Título da oferta",
    loja: f.loja || "Loja",
    categoria: f.categoria,
    preco_atual: atual > 0 ? atual : 0,
    preco_antigo: antigo > 0 ? antigo : null,
    link: "#",
    imagem: f.imagem.trim() || null,
    selo: f.selo.trim(),
    cupom: f.cupom.trim(),
    relampago: f.relampago,
    destaque: f.destaque,
    atualizado_em: new Date().toISOString(),
  };

  async function salvar(e) {
    e.preventDefault();
    setErro("");

    if (!f.titulo.trim()) return setErro("Informe o título.");
    if (!f.loja.trim()) return setErro("Informe a loja.");
    if (!/^https?:\/\//i.test(f.link.trim()))
      return setErro("O link de afiliado precisa começar com http:// ou https://");
    if (!(atual > 0)) return setErro("Informe o preço atual (por exemplo, 199,90).");
    if (f.preco_antigo.trim() && !(antigo > atual))
      return setErro("O preço antigo precisa ser maior que o preço atual.");
    if (f.imagem.trim() && !/^https?:\/\//i.test(f.imagem.trim()))
      return setErro("O endereço da imagem precisa começar com http:// ou https://");

    setSalvando(true);

    const dados = {
      titulo: f.titulo.trim(),
      loja: f.loja.trim(),
      categoria: f.categoria,
      preco_atual: atual,
      preco_antigo: f.preco_antigo.trim() ? antigo : null,
      link: f.link.trim(),
      imagem: f.imagem.trim() || null,
      selo: f.selo.trim() || null,
      cupom: f.cupom.trim() || null,
      relampago: f.relampago,
      destaque: f.destaque,
      atualizado_em: new Date().toISOString(),
    };

    let resposta;
    if (editando) {
      if (f.telegram) dados.postada_telegram_em = null;
      resposta = await supabase.from("ofertas").update(dados).eq("id", oferta.id);
    } else {
      resposta = await supabase
        .from("ofertas")
        .insert({
          ...dados,
          id_externo: `${sugestao ? "comunidade" : "manual"}-${crypto.randomUUID()}`,
          origem: sugestao ? "comunidade" : "manual",
          autor: sugestao ? sugestao.usuario : null,
          ativa: true,
          // desmarcado = marca como já postada, para o robô não enviar ao Telegram
          postada_telegram_em: f.telegram ? null : new Date().toISOString(),
        })
        .select("id")
        .single();

      if (!resposta.error && sugestao) {
        await supabase
          .from("sugestoes")
          .update({ status: "aprovada", oferta_id: resposta.data.id })
          .eq("id", sugestao.id);
      }
    }

    setSalvando(false);
    if (resposta.error) return setErro(`Não foi possível salvar: ${resposta.error.message}`);
    aoSalvar();
  }

  return (
    <>
      <h1>{editando ? "Editar oferta" : sugestao ? "Publicar sugestão da comunidade" : "Nova oferta"}</h1>
      <p className="adm-sub">
        {editando
          ? "Altere os campos e salve."
          : sugestao
            ? "Revise os dados. Se puder, troque o link pelo seu link de afiliado antes de publicar."
            : "Cadastre um produto com o seu link de afiliado. A prévia mostra como ele aparece no site."}
      </p>

      {sugestao && (
        <p className="adm-aviso">
          Enviada por <strong>{sugestao.usuario}</strong> ({sugestao.email}). O nome de usuário
          aparece publicamente na promoção; o e-mail não.
        </p>
      )}

      {automatica && (
        <p className="adm-aviso">
          Esta oferta é automática. Selo, cupom e destaque são mantidos, mas o robô volta a
          atualizar preço, link e relâmpago a cada coleta. Para controlar tudo, cadastre a oferta
          à mão.
        </p>
      )}

      <div className="adm-form-grade">
        <form onSubmit={salvar} className="adm-form">
          <Campo rotulo="Título do produto">
            <input
              className="adm-input"
              value={f.titulo}
              onChange={(e) => mudar("titulo", e.target.value)}
              maxLength={200}
            />
          </Campo>

          <div className="adm-duas-colunas">
            <Campo rotulo="Loja">
              <input
                className="adm-input"
                list="lojas-sugeridas"
                value={f.loja}
                onChange={(e) => mudar("loja", e.target.value)}
              />
              <datalist id="lojas-sugeridas">
                {LOJAS.map((loja) => (
                  <option key={loja} value={loja} />
                ))}
              </datalist>
            </Campo>

            <Campo rotulo="Categoria">
              <select
                className="adm-input"
                value={f.categoria}
                onChange={(e) => mudar("categoria", e.target.value)}
              >
                {categorias.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <div className="adm-duas-colunas">
            <Campo rotulo="Preço atual (R$)">
              <input
                className="adm-input"
                inputMode="decimal"
                placeholder="199,90"
                value={f.preco_atual}
                onChange={(e) => mudar("preco_atual", e.target.value)}
              />
            </Campo>
            <Campo rotulo="Preço antigo (R$)" dica="Opcional. Gera o selo de desconto.">
              <input
                className="adm-input"
                inputMode="decimal"
                placeholder="299,90"
                value={f.preco_antigo}
                onChange={(e) => mudar("preco_antigo", e.target.value)}
              />
            </Campo>
          </div>

          <Campo
            rotulo="Link de afiliado"
            dica="Cole o link gerado no painel do seu programa de afiliados."
          >
            <input
              className="adm-input"
              type="url"
              placeholder="https://..."
              value={f.link}
              onChange={(e) => mudar("link", e.target.value)}
            />
          </Campo>

          <Campo
            rotulo="Endereço da imagem"
            dica="Opcional. Clique com o botão direito na foto do produto, copie o endereço da imagem e cole aqui."
          >
            <input
              className="adm-input"
              type="url"
              placeholder="https://..."
              value={f.imagem}
              onChange={(e) => mudar("imagem", e.target.value)}
            />
          </Campo>

          <div className="adm-campo">
            <span className="adm-rotulo">Selo chamativo</span>
            <div className="adm-chips">
              {SELOS.map((selo) => (
                <button
                  key={selo}
                  type="button"
                  className={f.selo === selo ? "adm-chip adm-chip--ativo" : "adm-chip"}
                  onClick={() => mudar("selo", f.selo === selo ? "" : selo)}
                >
                  {selo}
                </button>
              ))}
            </div>
            <input
              className="adm-input"
              placeholder="Ou escreva o seu (ex.: SÓ HOJE)"
              value={f.selo}
              onChange={(e) => mudar("selo", e.target.value)}
              maxLength={30}
            />
          </div>

          <Campo rotulo="Cupom de desconto" dica="Opcional. Aparece em destaque na oferta.">
            <input
              className="adm-input"
              placeholder="MUKI10"
              value={f.cupom}
              onChange={(e) => mudar("cupom", e.target.value)}
              maxLength={30}
            />
          </Campo>

          <div className="adm-opcoes">
            <label>
              <input
                type="checkbox"
                checked={f.relampago}
                onChange={(e) => mudar("relampago", e.target.checked)}
              />
              Promoção relâmpago
            </label>
            <label>
              <input
                type="checkbox"
                checked={f.destaque}
                onChange={(e) => mudar("destaque", e.target.checked)}
              />
              Destacar no topo da lista
            </label>
            <label>
              <input
                type="checkbox"
                checked={f.telegram}
                onChange={(e) => mudar("telegram", e.target.checked)}
              />
              {editando ? "Reenviar ao Telegram" : "Publicar no Telegram"}
            </label>
          </div>

          {erro && <p className="adm-erro">{erro}</p>}

          <div className="adm-botoes-form">
            <button className="adm-btn adm-btn--primario" disabled={salvando}>
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : sugestao ? "Publicar promoção" : "Cadastrar oferta"}
            </button>
          </div>
        </form>

        <div className="adm-previa">
          <p className="adm-rotulo">Prévia no site</p>
          <div className="adm-previa-card">
            <CardOferta oferta={previa} previa />
          </div>
        </div>
      </div>
    </>
  );
}
