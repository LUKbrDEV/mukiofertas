// Atalhos da faixa do topo (a ordem aqui é a ordem na tela)
// "tambem": outros endereços em que o atalho também aparece como ativo
export const atalhos = [
  { href: "/", nome: "🔥 Promoções", tambem: ["/maiores-descontos", "/relampago"] },
  { href: "/black-friday", nome: "🖤 Black Friday" },
  { href: "/cupons", nome: "🎟️ Ofertas com cupom" },
  {
    href: "/categoria/hardware",
    nome: "🖥️ Hardware",
    tambem: ["/hardware", "/categoria/processadores", "/categoria/placa-mae", "/categoria/ssd", "/categoria/placa-de-video", "/categoria/memoria-ram"],
  },
  { href: "/categoria/monitores", nome: "📺 Monitores", tambem: ["/monitores"] },
  { href: "/comunidade", nome: "👥 Comunidade" },
  
];

// Palavras procuradas no título. O _ vale por qualquer letra (assim "vídeo" e "video" casam).
// (usadas pelas páginas antigas /hardware e /monitores, se ainda existirem)
export const termosHardware = [
  "placa de v_deo",
  "placa m_e",
  "processador",
  "ryzen",
  "intel core",
  "mem_ria ram",
  "ddr4",
  "ddr5",
  "ssd",
  "nvme",
  "fonte de aliment",
  "gabinete",
  "cooler",
  "rtx",
  "geforce",
  "radeon",
];

export const termosMonitores = ["monitor"];