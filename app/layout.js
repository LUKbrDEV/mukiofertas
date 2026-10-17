import Link from "next/link";
import "./globals.css";
import { categorias } from "../data/ofertas";

export const metadata = {
  title: "MukiOfertas - As melhores ofertas e promoções",
  description: "Ofertas, cupons e promoções relâmpago das maiores lojas do Brasil.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="topo">
          <Link href="/" className="logo">
            Muki<span>Ofertas</span>
          </Link>
          <nav>
            {categorias.map((cat) => (
              <Link key={cat.slug} href={`/categoria/${cat.slug}`}>
                {cat.emoji} {cat.nome}
              </Link>
            ))}
          </nav>
        </header>
        <main className="conteudo">{children}</main>
        <footer className="rodape">
          <p>
            O MukiOfertas pode receber comissão por compras feitas através dos
            links. Preços e disponibilidade podem mudar sem aviso.
          </p>
        </footer>
      </body>
    </html>
  );
}