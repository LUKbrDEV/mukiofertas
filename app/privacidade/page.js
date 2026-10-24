import { SITE } from "../../lib/site";

export const metadata = {
  title: "Política de Privacidade | MukiOfertas",
  description:
    "Saiba quais dados o MukiOfertas coleta, como usamos cookies e anúncios e como exercer seus direitos pela LGPD.",
  alternates: { canonical: "/privacidade" },
};

export default function Privacidade() {
  return (
    <article className="texto-pagina">
      <h1>Política de Privacidade</h1>
      <p className="texto-data">Última atualização: {SITE.atualizadoEm}</p>

      <p>
        Esta política explica como o {SITE.nome} ({SITE.url}) trata os dados pessoais de quem
        visita o site, de acordo com a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
      </p>

      <h2>1. Quem é o responsável</h2>
      <p>
        O controlador dos dados é {SITE.responsavel}. Para qualquer assunto sobre privacidade,
        escreva para <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>

      <h2>2. Dados que coletamos</h2>
      <ul>
        <li>
          <strong>Dados da conta:</strong> e-mail, nome de usuário e senha. A senha é guardada de
          forma criptografada pelo nosso provedor de autenticação e não conseguimos vê-la.
        </li>
        <li>
          <strong>Comentários:</strong> o texto que você publica nas ofertas e o seu nome de
          usuário, que ficam visíveis para todos.
        </li>
        <li>
          <strong>Dados de navegação:</strong> endereço IP, tipo de navegador e dispositivo,
          páginas visitadas e cliques nas ofertas.
        </li>
        <li>
          <strong>Cookies e tecnologias parecidas:</strong> veja o item 5.
        </li>
      </ul>
      <p>Você pode navegar e ver as ofertas sem criar conta e sem nos informar dados pessoais.</p>

      <h2>3. Para que usamos os dados</h2>
      <ul>
        <li>Criar e manter a sua conta e permitir que você comente nas ofertas.</li>
        <li>Proteger o site contra spam, fraudes e abusos.</li>
        <li>Entender quais ofertas e páginas são mais usadas, para melhorar o site.</li>
        <li>Exibir anúncios e receber comissão pelas compras feitas pelos nossos links.</li>
        <li>Cumprir obrigações legais.</li>
      </ul>

      <h2>4. Bases legais</h2>
      <p>
        Tratamos os dados para executar o serviço que você pediu (conta e comentários), com base
        no nosso legítimo interesse (segurança, estatísticas e funcionamento do site) e, quando
        necessário, com o seu consentimento (por exemplo, cookies de publicidade).
      </p>

      <h2>5. Cookies, anúncios e Google AdSense</h2>
      <p>
        Usamos cookies para manter você conectado, medir o uso do site e exibir anúncios. O site
        usa o Google AdSense para veicular anúncios. Fornecedores terceiros, incluindo o Google,
        usam cookies para exibir anúncios com base nas suas visitas anteriores a este e a outros
        sites. O uso de cookies de publicidade permite que o Google e seus parceiros exibam
        anúncios para você com base na sua navegação.
      </p>
      <p>
        Você pode desativar a publicidade personalizada em{" "}
        <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
          adssettings.google.com
        </a>{" "}
        ou em{" "}
        <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer">
          aboutads.info
        </a>
        . Também é possível bloquear cookies nas configurações do seu navegador, mas algumas
        partes do site, como o login, podem deixar de funcionar.
      </p>

      <h2>6. Links de afiliados</h2>
      <p>
        Muitos links do site levam a lojas parceiras, como Amazon e Mercado Livre. Quando você
        clica e compra, podemos receber uma comissão, sem custo extra para você. Essas lojas
        podem usar os próprios cookies para registrar a compra, e o tratamento desses dados segue
        as políticas de privacidade delas.
      </p>

      <h2>7. Com quem compartilhamos</h2>
      <p>Não vendemos seus dados pessoais. Eles podem ser tratados por:</p>
      <ul>
        <li>provedores de hospedagem e de banco de dados e autenticação, que armazenam as informações do site;</li>
        <li>o Google, para exibição de anúncios;</li>
        <li>lojas parceiras, quando você clica em um link de oferta;</li>
        <li>autoridades, quando houver obrigação legal.</li>
      </ul>

      <h2>8. Por quanto tempo guardamos</h2>
      <p>
        Mantemos os dados da conta enquanto ela existir. Você pode pedir a exclusão da conta e dos
        seus comentários a qualquer momento. Alguns registros técnicos podem ser mantidos pelo
        prazo exigido por lei.
      </p>

      <h2>9. Seus direitos</h2>
      <p>Pela LGPD, você pode pedir:</p>
      <ul>
        <li>confirmação de que tratamos seus dados e acesso a eles;</li>
        <li>correção de dados incompletos ou desatualizados;</li>
        <li>anonimização, bloqueio ou eliminação de dados desnecessários;</li>
        <li>portabilidade dos dados;</li>
        <li>informação sobre com quem compartilhamos seus dados;</li>
        <li>revogação do consentimento, quando o tratamento for baseado nele.</li>
      </ul>
      <p>
        Para exercer qualquer direito, envie um e-mail para{" "}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>

      <h2>10. Segurança</h2>
      <p>
        Usamos conexão segura (HTTPS) e provedores que adotam medidas técnicas de proteção.
        Nenhum sistema é totalmente imune a falhas, mas trabalhamos para reduzir os riscos.
      </p>

      <h2>11. Crianças e adolescentes</h2>
      <p>
        O site não é direcionado a menores de 18 anos e não coletamos dados deles de forma
        intencional. Se você é responsável por um menor que criou conta, entre em contato para
        removermos os dados.
      </p>

      <h2>12. Mudanças nesta política</h2>
      <p>
        Podemos atualizar esta política de tempos em tempos. A data da última atualização fica no
        topo desta página.
      </p>
    </article>
  );
}