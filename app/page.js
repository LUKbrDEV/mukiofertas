import CardOferta from "../components/CardOferta";
import { supabase } from "../lib/supabase";

export const revalidate = 60; // atualiza a página a cada 60 segundos

export default async function Home() {
  const { data: ofertas = [] } = await supabase
    .from("ofertas")
    .select("*")
    .eq("ativa", true)
    .order("atualizado_em", { ascending: false })
    .limit(60);

  const relampago = ofertas.filter((o) => o.relampago);

  return (
    <>
      {relampago.length > 0 && (
        <section>
          <h2>⚡ Promoções Relâmpago</h2>
          <div className="grade">
            {relampago.map((o) => <CardOferta key={o.id} oferta={o} />)}
          </div>
        </section>
      )}

      <section>
        <h2>Ofertas recentes</h2>
        {ofertas.length === 0 ? (
          <p>Nenhuma oferta por enquanto. Volte em instantes!</p>
        ) : (
          <div className="grade">
            {ofertas.map((o) => <CardOferta key={o.id} oferta={o} />)}
          </div>
        )}
      </section>
    </>
  );
}