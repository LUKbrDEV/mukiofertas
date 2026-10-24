"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LinkAtivo from "./LinkAtivo";
import BotaoConta from "./BotaoConta";

const SECOES = [
  {
    href: "/",
    nome: "Ofertas",
    ativa: (p) => !p.startsWith("/cupons") && !p.startsWith("/comunidade"),
  },
  { href: "/cupons", nome: "Cupons", ativa: (p) => p.startsWith("/cupons") },
  {
    href: "/comunidade",
    nome: "Promoções da Comunidade",
    ativa: (p) => p.startsWith("/comunidade"),
  },
];

// Moldura do site público. Nas páginas do /admin ela some e o painel usa a tela inteira.
export default function Casca({ categorias, telegram, children }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return <>{children}</>;

  const emOfertas = SECOES[0].ativa(pathname);

  return (
    <>
      <header className="topo">
        <div className="topo-interno">
          <Link href="/" className="logo" aria-label="MukiOfertas, página inicial">
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path
                d="M3 12.5V4a1 1 0 0 1 1-1h8.5a1 1 0 0 1 .7.3l7.5 7.5a1 1 0 0 1 0 1.4l-8.5 8.5a1 1 0 0 1-1.4 0L3.3 13.2a1 1 0 0 1-.3-.7z"
                fill="currentColor"
              />
              <circle cx="8" cy="8" r="1.7" fill="#fff" />
            </svg>
            Muki<span>Ofertas</span>
          </Link>

          <form className="busca" action="/busca" role="search">
            <input
              type="search"
              name="q"
              placeholder="Buscar ofertas e produtos"
              aria-label="Buscar ofertas e produtos"
            />
          </form>

          <div className="topo-acoes">
            <BotaoConta />
         </div>
        </div>
      </header>

      <nav className="secoes" aria-label="Seções do site">
        <div className="secoes-interno">
          {SECOES.map((secao) => (
            <Link
              key={secao.href}
              href={secao.href}
              className="secao-aba"
              aria-current={secao.ativa(pathname) ? "page" : undefined}
            >
              {secao.nome}
            </Link>
          ))}
        </div>
      </nav>

      {emOfertas && (
        <nav className="categorias" aria-label="Categorias">
          <div className="categorias-interno">
            <LinkAtivo href="/" tambem={["/maiores-descontos", "/relampago"]} className="chip">
              Todas as Ofertas
            </LinkAtivo>
            {categorias.map((cat) => (
              <LinkAtivo key={cat.slug} href={`/categoria/${cat.slug}`} className="chip">
                {cat.nome}
              </LinkAtivo>
            ))}
          </div>
        </nav>
      )}

      <div className="pagina">
        <main>{children}</main>

        <aside className="lateral">
          {telegram && (
            <section className="caixa caixa-telegram">
              <h2>Ofertas no seu Telegram</h2>
              <p>Receba as promoções assim que elas aparecem.</p>
              <a href={telegram} className="botao" target="_blank" rel="noopener noreferrer">
                Entrar no canal
              </a>
            </section>
          )}
          <section className="caixa">
            <h2>Achou uma promoção?</h2>
            <p>Envie para a comunidade. Cada promoção é revisada antes de aparecer.</p>
            <Link href="/comunidade/enviar" className="botao">
              Enviar promoção
            </Link>
          </section>
          <section className="caixa">
            <h2>Antes de comprar</h2>
            <p>Preço e estoque mudam rápido. Confira o valor final no site da loja.</p>
          </section>
        </aside>
      </div>

      <footer className="rodape">
        O MukiOfertas pode receber comissão pelas compras feitas através dos links.
        <Link href="/admin" className="rodape-admin">
        </Link>
      </footer>
    </>
  );
}
