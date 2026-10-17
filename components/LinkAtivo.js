"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function LinkAtivo({ href, className, children }) {
  const pathname = usePathname();
  return (
    <Link
      href={href}
      className={className}
      aria-current={pathname === href ? "page" : undefined}
    >
      {children}
    </Link>
  );
}