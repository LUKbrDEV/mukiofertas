/** @type {import('next').NextConfig} */

// Cabeçalhos de segurança enviados em todas as páginas do site.
const cabecalhosSeguranca = [
  // Força HTTPS no navegador por 2 anos
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Impede que outro site coloque o MukiOfertas dentro de um iframe (golpe de "clickjacking")
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Navegador não "adivinha" o tipo de arquivo
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Site não pede câmera, microfone nem localização
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: cabecalhosSeguranca },
      // Painel admin nunca fica guardado em cache
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
