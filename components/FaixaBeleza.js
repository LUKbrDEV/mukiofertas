// Faixa do topo das categorias de Beleza (Perfumes, Maquiagem, Skincare, Cabelos) e Moda feminina.
// Usada em app/categoria/[slug]/page.js junto com o tema rosé (app/tema-beleza.css).
// Para tirar o tema: apague o <FaixaBeleza /> e a classe "tema-beleza" da página de categoria.
import Link from "next/link";

export const SLUGS_BELEZA = ["perfumaria", "maquiagem", "skincare", "cabelos", "moda-feminina"];

// a página é de Beleza se for uma das 4 categorias (ou uma subcategoria delas)
export const ehBeleza = (slug, pai) => SLUGS_BELEZA.includes(slug) || SLUGS_BELEZA.includes(pai?.slug);

const ABAS = [
  { slug: "perfumaria", nome: "Perfumes", icone: "🌸" },
  { slug: "maquiagem", nome: "Maquiagem e unhas", icone: "💄" },
  { slug: "skincare", nome: "Skincare", icone: "🫧" },
  { slug: "cabelos", nome: "Cabelos", icone: "💇‍♀️" },
  { slug: "moda-feminina", nome: "Moda feminina", icone: "👗" },
];

// dica de cuidado na hora de comprar, diferente para cada categoria
const DICAS = {
  perfumaria: "Para garantir que o perfume é original, prefira a loja oficial da marca ou produtos vendidos e entregues pela própria loja (Amazon, Mercado Livre, Magalu).",
  maquiagem: "Antes de comprar, confira o tom, a validade e se o vendedor é a loja oficial da marca.",
  skincare: "Produto novo na rotina? Teste um pouquinho na parte de dentro do braço antes de usar no rosto.",
  cabelos: "Secador, chapinha e escova secadora: confira a voltagem (110V ou 220V) antes de comprar.",
  "moda-feminina": "Cada marca veste de um jeito: confira a tabela de medidas da loja e a política de troca antes de comprar.",
};

export default function FaixaBeleza({ atual }) {
  const dica = DICAS[atual] ?? DICAS.perfumaria;
  return (
    <section className="beleza-faixa" aria-label="Beleza">
      <div className="beleza-faixa-topo">
        <span className="beleza-selo">✿ Beleza e Moda</span>
        <p className="beleza-frase">Beleza e moda feminina em promoção, para você se cuidar pagando menos.</p>
      </div>
      <nav className="beleza-abas" aria-label="Categorias de beleza e moda">
        {ABAS.map((a) => (
          <Link
            key={a.slug}
            href={`/categoria/${a.slug}`}
            className="beleza-aba"
            aria-current={a.slug === atual ? "page" : undefined}
          >
            <span aria-hidden="true">{a.icone}</span> {a.nome}
          </Link>
        ))}
      </nav>
      <p className="beleza-dica">
        <span className="beleza-dica-icone" aria-hidden="true">💗</span>
        <span><strong>Dica de cuidado:</strong> {dica}</span>
      </p>
    </section>
  );
}
