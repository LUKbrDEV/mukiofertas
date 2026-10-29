import Image from "next/image";
import styles from "./bio.module.css";

export const metadata = {
  title: "MukiOfertas | Ofertas, cupons e promoções",
  description:
    "Entre nos nossos grupos e receba as melhores promoções antes de todo mundo.",
};

const LINKS = [
  {
    nome: "Site MukiOfertas",
    frase: "Descontos, cupons e promoções relâmpago",
    url: "https://mukiofertas.com.br",
    classe: "site",
    icone: "🛒",
  },
  {
    nome: "Entrar no grupo do WhatsApp",
    frase: "Receba as promoções antes de todo mundo",
    url: process.env.NEXT_PUBLIC_WHATSAPP_URL || "https://chat.whatsapp.com/EjPNA5tB2g2BUIlJ701br2",
    classe: "whatsapp",
    icone: "💬",
  },
  {
    nome: "Entrar no canal do Telegram",
    frase: "Promoções relâmpago e cupons em tempo real",
    url: process.env.NEXT_PUBLIC_TELEGRAM_URL || "https://t.me/mukiofertas",
    classe: "telegram",
    icone: "✈️",
  },
  {
    nome: "Siga no Instagram",
    frase: "Instagram Oficial da MukiOfertas!",
    url: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/mukiofertas", // 👈 confira o usuário
    classe: "instagram",
    icone: "📸",
  },
  {
    nome: "Siga no TikTok",
    frase: "Vídeos das melhores ofertas do dia",
    url: process.env.NEXT_PUBLIC_TIKTOK_URL || "https://www.tiktok.com/@mukiofertas", // 👈 confira o usuário
    classe: "tiktok",
    icone: "🎵",
  },
];

export default function Bio() {
  return (
    <main className={styles.pagina}>
      <div className={styles.card}>
        <div className={styles.selo}>🔥 Promoções e cupons 24h por dia!</div>

        <div className={styles.logoBox}>
          <Image
            src="/logo-mukiofertas.png"
            alt="Logo MukiOfertas"
            width={150}
            height={150}
            priority
            className={styles.logo}
          />
        </div>

        <h1 className={styles.titulo}>
          <span className={styles.muki}>Muki</span>
          <span className={styles.ofertas}>Ofertas</span>
        </h1>

        <p className={styles.chamada}>
          Pare de pagar mais caro! 💸
          <br />
          Achamos as melhores promoções para você economizar.
        </p>

        <div className={styles.lista}>
          {LINKS.map((l) => (
            <a
              key={l.nome}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.botao} ${styles[l.classe]}`}
            >
              <span className={styles.icone}>{l.icone}</span>
              <span className={styles.texto}>
                <strong>{l.nome}</strong>
                <small>{l.frase}</small>
              </span>
              <span className={styles.seta}>→</span>
            </a>
          ))}
        </div>

        <p className={styles.rodape}>
          ⚡ As melhores ofertas acabam rápido. Entre agora e não perca nenhuma!
        </p>
      </div>
    </main>
  );
}