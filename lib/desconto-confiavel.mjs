// Trava do "preço antigo": evita descontos inflados (o famoso "metade do dobro").
// Salve como lib/desconto-confiavel.mjs
//
// Quando o desconto parece inventado, a oferta CONTINUA no site, mas sem o preço antigo:
// some a tag de desconto / "Super desconto" e ela não entra nos destaques por desconto.
// O valor original fica guardado na coluna preco_antigo_bruto (dá para desfazer).

export const LIMITES = {
  geral: 70, // % — acima disso o preço antigo é tratado como suspeito
  marketplace: 60, // % — AliExpress e Shopee inflam mais o "de"
  redondo: 50, // % — preço antigo "redondo/repetido" + desconto acima disso = suspeito
  folgaHistorico: 1.15, // preço antigo pode ser no máximo 15% acima do maior preço já visto
};

const MARKETPLACES = ["aliexpress", "shopee"];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Preço com cara de inventado: R$ 12.000,00 · R$ 17.777,77 · R$ 1.111,10
export function precoComCaraDeInventado(valor) {
  const v = num(valor);
  if (v < 100) return false;
  const centavos = Math.round(v * 100);
  if (centavos % 100000 === 0) return true; // milhar redondo: 1.000, 5.000, 12.000...
  const digitos = String(centavos).replace(/0+$/, ""); // ignora os zeros do final
  if (digitos.length >= 4) {
    const conta = {};
    for (const d of digitos) conta[d] = (conta[d] ?? 0) + 1;
    if (Math.max(...Object.values(conta)) / digitos.length >= 0.8) return true; // quase tudo o mesmo dígito
  }
  return false;
}

// Diz se o desconto da oferta é confiável.
// maiorPrecoVisto (opcional): maior preço registrado no histórico desse produto.
export function avaliarDesconto(oferta, { maiorPrecoVisto } = {}) {
  const atual = num(oferta.preco_atual);
  const antigo = num(oferta.preco_antigo);
  if (!(atual > 0 && antigo > atual)) return { ok: true, desconto: 0, motivo: null };

  const desconto = Math.round(((antigo - atual) / antigo) * 100);
  const loja = String(oferta.loja ?? "").toLowerCase();
  const limite = MARKETPLACES.some((m) => loja.includes(m)) ? LIMITES.marketplace : LIMITES.geral;

  let motivo = null;
  if (desconto > limite) {
    motivo = `desconto de ${desconto}% acima do limite de ${limite}%`;
  } else if (desconto >= LIMITES.redondo && precoComCaraDeInventado(antigo)) {
    motivo = `preço antigo com cara de inventado e ${desconto}% de desconto`;
  } else if (num(maiorPrecoVisto) > 0 && antigo > num(maiorPrecoVisto) * LIMITES.folgaHistorico) {
    motivo = "preço antigo acima do maior preço já visto no histórico";
  }
  return { ok: !motivo, desconto: motivo ? 0 : desconto, motivo };
}

// Devolve a oferta pronta para salvar: se o desconto for suspeito, tira o preço antigo
// e guarda o original em preco_antigo_bruto.
export function aplicarTravaDeDesconto(oferta, opcoes) {
  const r = avaliarDesconto(oferta, opcoes);
  if (r.ok) return { ...oferta, desconto_suspeito: null };
  return {
    ...oferta,
    preco_antigo: null,
    preco_antigo_bruto: oferta.preco_antigo,
    desconto_suspeito: r.motivo,
  };
}
