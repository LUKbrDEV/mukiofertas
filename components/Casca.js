"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LinkAtivo from "./LinkAtivo";
import BotaoConta from "./BotaoConta";
import MenuDepartamentos from "./MenuDepartamentos";
import { atalhos } from "../data/atalhos";
import { EnfeiteCabecalho } from "./Halloween";

const TAMANHO_LOGO = 48; // tamanho do boneco, em pixels

// Cabeçalho no estilo "loja grande": linha de cima com logo | busca | conta,
// barra de baixo com Departamentos + atalhos espalhados pela largura toda.
// Seletores com vários níveis (e !important onde o globals.css sobrescrevia).
const CSS_CABECALHO = `
  .cabecalho-fixo {
    --mk-azul: #0a4bb8;
    --mk-azul-barra: #083a8f;
    --mk-azul-marinho: #062a66;
    --mk-laranja: #ff7a1a;
    --mk-gutter: 24px;
    --mk-altura-busca: 44px;
    --mk-altura-atalho: 34px;
  }

  /* ================= Linha de cima ================= */
  .cabecalho-fixo .topo {
    background: var(--mk-azul) !important;
  }

  .cabecalho-fixo .topo .topo-interno {
    box-sizing: border-box !important;
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 12px var(--mk-gutter) !important;
    display: flex !important;
    align-items: center !important;
    gap: 32px !important;
  }

  .cabecalho-fixo .topo .logo {
    display: flex !important;
    align-items: center !important;
    gap: 12px !important;
    flex: none !important;
    width: max-content !important;
    max-width: none !important;
    min-width: max-content !important;
    overflow: visible !important;
    line-height: 1;
    white-space: nowrap !important;
    text-decoration: none;
    font-size: clamp(1.4rem, 4.5vw, 2.1rem);
    font-weight: 800;
    font-family: var(--fonte-titulo), system-ui, sans-serif;
  }

  .cabecalho-fixo .topo .logo span {
    display: inline !important;
    width: auto !important;
    max-width: none !important;
    overflow: visible !important;
    text-overflow: clip !important;
    white-space: nowrap !important;
  }

  .cabecalho-fixo .topo .logo img {
    display: block;
    flex: none;
    border-radius: 50%;
    object-fit: contain;
  }

  /* Busca grande no centro, com botão de lupa */
  .cabecalho-fixo .topo .busca {
    flex: 1 1 auto !important;
    max-width: 820px !important;
    min-width: 0 !important;
    margin: 0 auto !important;
    padding: 0 !important;
    display: flex !important;
    align-items: stretch !important;
    height: var(--mk-altura-busca);
    background: #ffffff;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  }

  .cabecalho-fixo .topo .busca input {
    box-sizing: border-box !important;
    flex: 1 1 auto;
    min-width: 0;
    width: auto !important;
    height: 100% !important;
    margin: 0 !important;
    padding: 0 16px !important;
    border: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    font-size: 15px;
    color: #1e293b;
    outline: none;
  }

  .cabecalho-fixo .topo .busca button {
    flex: none;
    width: 52px;
    height: 100%;
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--mk-azul-marinho);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .cabecalho-fixo .topo .busca button:hover {
    color: var(--mk-laranja);
  }

  .cabecalho-fixo .topo .topo-acoes {
    display: flex !important;
    align-items: center !important;
    flex: none !important;
    margin: 0 !important;
  }

  .cabecalho-fixo .topo .topo-acoes > * {
    box-sizing: border-box;
    margin: 0;
  }

  /* ================= Barra de baixo ================= */
  .cabecalho-fixo .categorias {
    background: var(--mk-azul-barra) !important;
  }

  .cabecalho-fixo .categorias .categorias-interno {
    box-sizing: border-box !important;
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 6px var(--mk-gutter) !important;
    display: flex !important;
    align-items: center !important;
    gap: 24px !important;
    overflow: visible !important;
  }

  /* Botão Departamentos: bloco azul-marinho, como o preto do exemplo */
  .cabecalho-fixo .categorias .slot-departamentos {
    flex: none;
  }

  .cabecalho-fixo .categorias .slot-departamentos > button:first-child,
  .cabecalho-fixo .categorias .slot-departamentos > :first-child > button:first-child {
    box-sizing: border-box !important;
    height: var(--mk-altura-atalho) !important;
    margin: 0 !important;
    padding: 0 18px !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 10px !important;
    border: none !important;
    border-radius: 6px !important;
    background: var(--mk-azul-marinho) !important;
    color: #ffffff !important;
    font-size: 14px !important;
    font-weight: 700 !important;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    line-height: 1 !important;
    white-space: nowrap;
    cursor: pointer;
  }

  .cabecalho-fixo .categorias .slot-departamentos > button:first-child:hover,
  .cabecalho-fixo .categorias .slot-departamentos > :first-child > button:first-child:hover {
    background: #041d47 !important;
  }

  /* Atalhos espalhados pela largura toda */
  .cabecalho-fixo .categorias .atalhos {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .cabecalho-fixo .categorias .atalhos::-webkit-scrollbar {
    display: none;
  }

  .cabecalho-fixo .categorias .atalhos a.atalho {
    box-sizing: border-box !important;
    position: relative;
    flex: none;
    height: var(--mk-altura-atalho) !important;
    margin: 0 !important;
    padding: 0 12px !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 6px;
    border: none !important;
    border-radius: 6px !important;
    background: transparent !important;
    color: #ffffff !important;
    font-size: 14px !important;
    font-weight: 700 !important;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    line-height: 1 !important;
    white-space: nowrap;
    text-decoration: none !important;
    box-shadow: none !important;
    transform: none !important;
  }

  .cabecalho-fixo .categorias .atalhos a.atalho:hover {
    color: var(--mk-laranja) !important;
  }

  /* Atalho simples ativo: texto laranja com traço embaixo */
  .cabecalho-fixo .categorias .atalhos a.atalho[aria-current="page"] {
    color: var(--mk-laranja) !important;
  }

  .cabecalho-fixo .categorias .atalhos a.atalho[aria-current="page"]::after {
    content: "";
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 3px;
    height: 3px;
    border-radius: 3px;
    background: var(--mk-laranja);
  }

  /* ================= Telas médias ================= */
  @media (max-width: 1100px) {
    .cabecalho-fixo .categorias .atalhos { justify-content: flex-start; }
  }

  /* ================= Celular ================= */
  @media (max-width: 768px) {
    .cabecalho-fixo { --mk-gutter: 16px; --mk-altura-busca: 42px; }

    .cabecalho-fixo .topo .topo-interno {
      flex-wrap: wrap !important;
      gap: 10px 12px !important;
      padding-top: 10px !important;
      padding-bottom: 10px !important;
    }

    .cabecalho-fixo .topo .topo-acoes { margin-left: auto !important; }

    .cabecalho-fixo .topo .busca {
      order: 3;
      flex: 1 1 100% !important;
      max-width: none !important;
      margin: 0 !important;
    }

    .cabecalho-fixo .categorias .categorias-interno { gap: 12px !important; }
  }
`;

function IconeLupa() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.5" />
      <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// Moldura do site público. Nas páginas do /admin ela some e o painel usa a tela inteira.
export default function Casca({ departamentos, telegram, children }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return <>{children}</>;

  const emComunidade = pathname.startsWith("/comunidade");

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS_CABECALHO }} />

      <div className="cabecalho-fixo">
        <header className="topo">
          <div className="topo-interno">
            <Link href="/" className="logo" aria-label="MukiOfertas, página inicial">
              <Image
                src="/logo-cabecalho.png"
                alt=""
                width={TAMANHO_LOGO}
                height={TAMANHO_LOGO}
                priority
                style={{ width: TAMANHO_LOGO, height: TAMANHO_LOGO, minWidth: TAMANHO_LOGO }}
              />
              <span style={{ color: "#ffffff" }}>
                Muki<span style={{ color: "#ff8a1f" }}>Ofertas</span>
              </span>
            </Link>

            {/* Halloween: some sozinho depois de 01/11 */}
            <EnfeiteCabecalho lado="esq" />

            <form className="busca" action="/busca" role="search">
              <input
                type="search"
                name="q"
                placeholder="Encontre ofertas no MukiOfertas"
                aria-label="Buscar ofertas e produtos"
              />
              <button type="submit" aria-label="Buscar">
                <IconeLupa />
              </button>
            </form>

            {/* Halloween no celular */}
            <EnfeiteCabecalho lado="cel" />

            <EnfeiteCabecalho lado="dir" />

            <div className="topo-acoes">
              <BotaoConta />
            </div>
          </div>
        </header>

        <nav className="categorias" aria-label="Departamentos e atalhos">
          <div className="categorias-interno">
            <div className="slot-departamentos">
              <MenuDepartamentos departamentos={departamentos} />
            </div>

            <div className="atalhos">
              {atalhos.map((a) => (
                <LinkAtivo
                  key={a.href}
                  href={a.href}
                  tambem={a.tambem}
                  className="atalho"
                >
                  {a.nome}
                </LinkAtivo>
              ))}
            </div>
          </div>
        </nav>
      </div>

      <div className={emComunidade ? "pagina" : "pagina pagina--cheia"}>
        <main>{children}</main>

        {emComunidade && (
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
        )}
      </div>

      <footer className="rodape">
        <p>
          O MukiOfertas pode receber comissão pelas compras feitas através dos links, sem custo
          extra para você. Como Associado da Amazon, ganhamos com compras qualificadas.
        </p>
        <nav className="rodape-links" aria-label="Links do rodapé">
          <Link href="/sobre">Sobre</Link>
          <Link href="/guias">Guias de compra</Link>
          <Link href="/contato">Contato</Link>
          <Link href="/privacidade">Política de Privacidade</Link>
          <Link href="/termos">Termos de Uso</Link>
        </nav>
      </footer>
    </>
  );
}