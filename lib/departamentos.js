// Monta os departamentos do menu, com as subcategorias dentro de cada um.
// Salve como lib/departamentos.js.

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