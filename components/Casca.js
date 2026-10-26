"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LinkAtivo from "./LinkAtivo";
import BotaoConta from "./BotaoConta";
import MenuDepartamentos from "./MenuDepartamentos";
import { atalhos } from "../data/atalhos";

const TAMANHO_LOGO = 56; // tamanho do boneco, em pixels

// Moldura do site público. Nas páginas do /admin ela some e o painel usa a tela inteira.
export default function Casca({ departamentos, telegram, children }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return <>{children}</>;

  return (
    <>
      <header className="topo">
        <div className="topo-interno">
          <Link
            href="/"
            className="logo"
            aria-label="MukiOfertas, página inicial"
            style={{
              fontSize: "clamp(1.4rem, 4.5vw, 2.1rem)",
              fontWeight: 800,
              gap: 12,
              fontFamily: "var(--fonte-titulo), system-ui, sans-serif",
              flex: "none",
              width: "max-content",
              maxWidth: "none",
              overflow: "visible",
              whiteSpace: "nowrap",
            }}
          >
            <Image
              src="/logo-cabecalho.png"
              alt=""
              width={TAMANHO_LOGO}
              height={TAMANHO_LOGO}
              priority
              style={{
                width: TAMANHO_LOGO,
                height: TAMANHO_LOGO,
                minWidth: TAMANHO_LOGO,
                flex: "none",
                borderRadius: "50%",
                objectFit: "contain",
              }}
            />
            <span style={{ color: "var(--tinta)", whiteSpace: "nowrap" }}>
              Muki<span>Ofertas</span>
            </span>
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

      <nav className="categorias" aria-label="Departamentos e atalhos">
        <div className="categorias-interno">
          <MenuDepartamentos departamentos={departamentos} />
          {atalhos.map((a) => (
            <LinkAtivo key={a.href} href={a.href} tambem={a.tambem} className="chip">
              {a.nome}
            </LinkAtivo>
          ))}
        </div>
      </nav>

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
        <p>
          O MukiOfertas pode receber comissão pelas compras feitas através dos links, sem custo
          extra para você. Como Associado da Amazon, ganhamos com compras qualificadas.
        </p>
        <nav className="rodape-links" aria-label="Links do rodapé">
          <Link href="/sobre">Sobre</Link>
          <Link href="/contato">Contato</Link>
          <Link href="/privacidade">Política de Privacidade</Link>
          <Link href="/termos">Termos de Uso</Link>
          <Link href="/admin" className="rodape-admin">
            Acesso admin
          </Link>
        </nav>
      </footer>
    </>
  );
}