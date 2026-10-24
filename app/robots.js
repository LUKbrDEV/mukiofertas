import { SITE } from "../lib/site";

export default function robots() {
  return {
    rules: [
      // O robô do AdSense precisa ver todas as páginas para escolher os anúncios
      { userAgent: "Mediapartners-Google", allow: "/" },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/entrar", "/bio", "/ir/"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}