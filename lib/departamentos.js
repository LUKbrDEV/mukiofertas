// Monta os departamentos do menu, com as subcategorias dentro de cada um.
// Salve como lib/departamentos.js.

import { menuDepartamentos, MOSTRAR_VAZIAS } from "../data/menu-departamentos";

// Lista para o menu: só departamentos principais, cada um com "filhos" e o total somado.
// Só entram os que têm ofertas no ar (se os totais vieram do banco).
export function montarDepartamentos(categorias, totais = {}) {
  const temTotais = Object.keys(totais).length > 0;
  const total = (slug) => totais[slug] ?? 0;

  return categorias
    .filter((c) => !c.pai)
    .map((c) => {
      const filhos = categorias
        .filter((f) => f.pai === c.slug)
        // Subcategorias aparecem sempre (mesmo vazias), para o submenu ficar completo
        .map((f) => ({ ...f, total: total(f.slug) }));
      const soma = total(c.slug) + filhos.reduce((s, f) => s + f.total, 0);
      return { ...c, total: soma, filhos };
    })
    .filter((c) => !temTotais || c.total > 0);
}

// Slugs que uma página de categoria mostra: ela mesma + as subcategorias dela
export function slugsDaCategoria(categorias, slug) {
  return [slug, ...categorias.filter((c) => c.pai === slug).map((c) => c.slug)];
}

export const subcategoriasDe = (categorias, slug) => categorias.filter((c) => c.pai === slug);
export const paiDe = (categorias, categoria) =>
  categoria?.pai ? categorias.find((c) => c.slug === categoria.pai) ?? null : null;
// ---------- Menu no estilo Promobit (data/menu-departamentos.js) ----------

// Monta o menu com os departamentos principais e as colunas de subcategorias.
// Com MOSTRAR_VAZIAS = false, some o que não tem oferta no ar (se os totais vieram do banco).
// A quantidade de ofertas não aparece na tela; ela só serve para esconder o que está vazio.
export function montarMenu(categorias, totais = {}) {
  const temTotais = Object.keys(totais).length > 0;
  const esconderPadrao = temTotais && !MOSTRAR_VAZIAS;
  const filhosDe = (slug) => categorias.filter((c) => c.pai === slug).map((c) => c.slug);
  const total = (slug) => (totais[slug] ?? 0) + filhosDe(slug).reduce((s, f) => s + (totais[f] ?? 0), 0);

  return menuDepartamentos
    .map((d) => {
      const esconder = esconderPadrao && !d.mostrarVazias;
      const colunas = d.colunas
        .map((c) => {
          let itens = c.itens.filter((i) => !esconder || total(i.slug) > 0);
          const tituloTem = c.slug ? total(c.slug) > 0 : false;
          // A coluna tem ofertas, mas nenhuma subcategoria (ainda) tem: mostra um link "Ver todos"
          // em vez de deixar a coluna vazia (ex.: ofertas que estão só em "Brinquedos").
          if (!itens.length && tituloTem) itens = [{ slug: c.slug, nome: `Ver todos` }];
          return { ...c, itens, vazia: itens.length === 0 && !tituloTem };
        })
        .filter((c) => !esconder || !c.vazia);
      return { ...d, colunas };
    })
    .filter((d) => d.colunas.length > 0);
}
