import LinkAtivo from "./LinkAtivo";

const abas = [
  { href: "/", nome: "Recentes" },
  { href: "/maiores-descontos", nome: "Maiores descontos" },
  { href: "/relampago", nome: "Relâmpago" },
];

export default function AbasFeed() {
  return (
    <nav className="abas" aria-label="Ordem das ofertas">
      {abas.map((aba) => (
        <LinkAtivo key={aba.href} href={aba.href} className="aba">
          {aba.nome}
        </LinkAtivo>
      ))}
    </nav>
  );
}