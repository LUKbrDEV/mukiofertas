"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Ativo no endereço exato ou em subpáginas dele (ex.: /comunidade/enviar ativa "Comunidade").
// O "/" (Promoções) só fica ativo na página inicial, senão ficaria ativo no site inteiro.
function combina(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

// "tambem": outros endereços em que este link também aparece como ativo
export default function LinkAtivo({ href, className, tambem = [], children }) {
  const pathname = usePathname();
  const ativo = [href, ...tambem].some((h) => combina(pathname, h));
  return (
    <Link href={href} className={className} aria-current={ativo ? "page" : undefined}>
      {children}
    </Link>
  );
}