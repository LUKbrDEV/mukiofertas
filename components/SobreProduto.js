// Seções "Sobre o produto" e "Especificações" da página da oferta.
// Salve como components/SobreProduto.js.
// Some sozinha se a oferta não tiver nenhum detalhe salvo.

const CSS = `
  .sobre-produto {
    margin-top: 24px;
    padding: 24px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    gap: 32px;
  }
  .sobre-produto h2 {
    margin: 0 0 14px;
    font-size: 20px;
    font-weight: 800;
    font-family: var(--fonte-titulo), system-ui, sans-serif;
    color: #0f172a;
  }
  .sobre-produto ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .sobre-produto li {
    position: relative;
    padding-left: 22px;
    color: #334155;
    line-height: 1.55;
    font-size: 15px;
  }
  .sobre-produto li::before {
    content: "";
    position: absolute;
    left: 4px;
    top: 0.6em;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #ff7a1a;
  }
  .sobre-produto table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
  }
  .sobre-produto th,
  .sobre-produto td {
    padding: 10px 12px;
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid #eef2f7;
  }
  .sobre-produto th {
    width: 42%;
    font-weight: 600;
    color: #475569;
    background: #f8fafc;
  }
  .sobre-produto td { color: #0f172a; }
  .sobre-produto tr:last-child th,
  .sobre-produto tr:last-child td { border-bottom: none; }
  .sobre-produto .sobre-tabela {
    border: 1px solid #eef2f7;
    border-radius: 10px;
    overflow: hidden;
  }
  .sobre-produto--uma-coluna { grid-template-columns: minmax(0, 1fr); }

  @media (max-width: 900px) {
    .sobre-produto { grid-template-columns: minmax(0, 1fr); padding: 18px; gap: 24px; }
  }
`;

export default function SobreProduto({ oferta }) {
  const sobre = Array.isArray(oferta?.sobre) ? oferta.sobre.filter(Boolean) : [];
  const especificacoes = Array.isArray(oferta?.especificacoes)
    ? oferta.especificacoes.filter((e) => e?.nome && e?.valor)
    : [];

  if (sobre.length === 0 && especificacoes.length === 0) return null;

  const umaColuna = sobre.length === 0 || especificacoes.length === 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <section
        className={umaColuna ? "sobre-produto sobre-produto--uma-coluna" : "sobre-produto"}
        aria-label="Detalhes do produto"
      >
        {sobre.length > 0 && (
          <div>
            <h2>Sobre o produto</h2>
            <ul>
              {sobre.map((topico, i) => (
                <li key={i}>{topico}</li>
              ))}
            </ul>
          </div>
        )}

        {especificacoes.length > 0 && (
          <div>
            <h2>Especificações</h2>
            <div className="sobre-tabela">
              <table>
                <tbody>
                  {especificacoes.map((e) => (
                    <tr key={e.nome}>
                      <th scope="row">{e.nome}</th>
                      <td>{e.valor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
