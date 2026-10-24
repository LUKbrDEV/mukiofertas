"use client";

import { usePathname } from "next/navigation";
import Casca from "./Casca";

export default function CascaCondicional({ children, ...props }) {
  const pathname = usePathname();

  // Na página /bio, mostra só o conteúdo, sem cabeçalho nem categorias
  if (pathname === "/bio" || pathname?.startsWith("/bio/")) {
    return <>{children}</>;
  }

  return <Casca {...props}>{children}</Casca>;
}