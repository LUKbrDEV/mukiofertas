"use client";

// Moldura das telas de entrada do painel admin (login, código de 2 etapas e "sem acesso").
// Salve como components/admin/MolduraLogin.js.
// À esquerda: o mascote e o que dá para fazer no painel. À direita: o formulário (children).

import Link from "next/link";

export default function MolduraLogin({ children }) {
  return (
    <div className="adm-entrada">
      <aside className="adm-entrada-marca" aria-hidden="true">
        <span className="adm-entrada-bolha adm-entrada-bolha--1" />
        <span className="adm-entrada-bolha adm-entrada-bolha--2" />
        <div className="adm-entrada-marca-conteudo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mukiofertas.png" alt="" width={132} height={132} className="adm-entrada-logo" />
          <h2>
            Painel <span>MukiOfertas</span>
          </h2>
          <p>Tudo o que acontece no site, num lugar só.</p>
          <ul>
            <li>🏷️ Ofertas, cupons e página inicial</li>
            <li>🤖 Robôs de coleta, Telegram e WhatsApp</li>
            <li>👥 Comunidade, avisos e alertas de preço</li>
          </ul>
        </div>
      </aside>

      <main className="adm-entrada-lado">
        <div className="adm-entrada-caixa">{children}</div>
        <Link href="/" className="adm-entrada-voltar">
          ← Voltar ao site
        </Link>
      </main>
    </div>
  );
}
