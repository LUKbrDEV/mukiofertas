import FormComunidade from "../../../components/FormComunidade";

export const metadata = { title: "Enviar promoção - MukiOfertas" };

export default function EnviarPromocao() {
  return (
    <>
      <h1 className="titulo-pagina">Enviar promoção</h1>
      <p className="subtitulo-pagina">
        Achou um preço bom? Conte para a comunidade. A equipe revisa cada envio antes de publicar.
      </p>
      <FormComunidade />
    </>
  );
}
