"use client";

import { usePathname } from "next/navigation";
import Casca from "./Casca";

// Páginas que aparecem sozinhas, sem cabeçalho, categorias e barra lateral do site
const SEM_CASCA = ["/bio", "/entrar"];

export default function CascaCondicional({ children, ...props }) {
  const pathname = usePathname();

  const semCasca = SEM_CASCA.some(
    (rota) => pathname === rota || pathname?.startsWith(rota + "/")
  );

  if (semCasca) return <>{children}</>;

  return <Casca {...props}>{children}</Casca>;
}