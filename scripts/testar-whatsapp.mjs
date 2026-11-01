// Testa a conexão com o servidor do WhatsApp (Evolution API) e lista os seus grupos.
// Salve como scripts/testar-whatsapp.mjs e rode na raiz do projeto:
//
//   node --env-file=.env.local scripts/testar-whatsapp.mjs
//       → mostra se o WhatsApp está conectado e o id de cada grupo (copie o do seu grupo de ofertas)
//
//   node --env-file=.env.local scripts/testar-whatsapp.mjs --enviar 120363012345678901@g.us
//       → manda uma mensagem de teste para esse grupo

import { evolution, estadoDaConexao } from "./postar-whatsapp.mjs";

const instancia = encodeURIComponent(process.env.EVOLUTION_INSTANCIA || "mukiofertas");

try {
  if (!process.env.EVOLUTION_URL || !process.env.EVOLUTION_API_KEY) {
    console.log("\nColoque EVOLUTION_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCIA no .env.local.\n");
    process.exit(1);
  }
  const estado = await estadoDaConexao();
  console.log(`\nConexão "${decodeURIComponent(instancia)}": ${estado === "open" ? "✅ conectado" : `❌ ${estado} (leia o QR Code no painel /manager)`}`);

  const i = process.argv.indexOf("--enviar");
  if (i > -1) {
    const grupo = process.argv[i + 1];
    await evolution(`/message/sendText/${instancia}`, {
      metodo: "POST",
      corpo: { number: grupo, text: "✅ Teste do MukiOfertas: o robô consegue enviar mensagens para este grupo." },
    });
    console.log(`Mensagem de teste enviada para ${grupo}.\n`);
    process.exit(0);
  }

  const grupos = await evolution(`/group/fetchAllGroups/${instancia}?getParticipants=false`);
  const lista = Array.isArray(grupos) ? grupos : grupos?.groups ?? [];
  console.log(`\n${lista.length} grupos. Copie o id do seu grupo de ofertas e cole em Configurações → WhatsApp:\n`);
  console.table(
    lista
      .map((g) => ({ grupo: String(g.subject ?? "").slice(0, 40), id: g.id, membros: g.size ?? "" }))
      .sort((a, b) => a.grupo.localeCompare(b.grupo))
  );
} catch (erro) {
  console.error("\nErro:", erro.message, "\n");
  process.exit(1);
}
