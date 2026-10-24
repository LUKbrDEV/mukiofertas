import "./bio.css";
import Image from "next/image";

export default function BioPage() {
  return (
    <main className="bio-container">
      <div className="bio-card">
        <div className="logo-area">
          <Image
            src="/logo.png"
            alt="MukiOfertas"
            width={120}
            height={120}
            priority
          />

          <h1>MukiOfertas</h1>

          <p>🔥 As melhores ofertas atualizadas diariamente</p>
        </div>

        <div className="buttons">
          <a
            href="https://mukiofertas.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-site"
          >
            🌐 Entrar no Site
          </a>

          <a
            href="https://chat.whatsapp.com/SEU-LINK"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp"
          >
            💬 Grupo WhatsApp
          </a>

          <a
            href="https://t.me/SEU-CANAL"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-telegram"
          >
            📢 Canal Telegram
          </a>
        </div>

        <footer>
          © {new Date().getFullYear()} MukiOfertas
        </footer>
      </div>
    </main>
  );
}