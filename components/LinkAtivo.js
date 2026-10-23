"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// "tambem": outros endereços em que este link também aparece como ativo
export default function LinkAtivo({ href, className, tambem = [], children }) {
  const pathname = usePathname();
  const ativo = pathname === href || tambem.includes(pathname);
  return (
    <Link href={href} className={className} aria-current={ativo ? "page" : undefined}>
      {children}
    </Link>
  );
}
