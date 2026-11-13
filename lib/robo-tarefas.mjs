// Tarefas que o painel admin pode mandar a VPS rodar (botões da Saúde do robô).
// Salve como lib/robo-tarefas.mjs
//
// Aqui só ficam nome e descrição. Os comandos de verdade ficam SÓ na VPS
// (scripts/executar-pedidos.mjs): o painel nunca manda um comando, só o id da tarefa.

export const TAREFAS_ROBO = [
  { id: "coleta", icone: "📦", nome: "Coleta completa", descricao: "Coleta, conferência de preços, Telegram e alertas (o mesmo da rodada de 30 min)", pesada: true },
  { id: "mercadolivre", icone: "🛒", nome: "Robô do Mercado Livre", descricao: "Publica as melhores do ML e enche a fila" },
  { id: "precos", icone: "💲", nome: "Conferir preços", descricao: "Só a conferência de preços" },
  { id: "telegram", icone: "✈️", nome: "Postar no Telegram", descricao: "Posta no canal as ofertas que estão na fila" },
  { id: "whatsapp", icone: "🟢", nome: "Postar no WhatsApp", descricao: "Envia para o grupo (respeita o horário do painel)" },
  { id: "kabum", icone: "🖥️", nome: "Buscar KaBuM!", descricao: "Busca as ofertas da KaBuM!" },
  { id: "alertas", icone: "🔔", nome: "Avisar alertas de preço", descricao: "Confere os alertas dos membros e manda os avisos" },
  { id: "leitor", icone: "👂", nome: "Reiniciar leitor de canais", descricao: "Reinicia o leitor do Telegram (pm2)" },
  { id: "atualizar", icone: "⬇️", nome: "Atualizar código da VPS", descricao: "git pull + npm ci + reinicia o leitor (depois de um push)", pesada: true },
];

export const IDS_TAREFAS = TAREFAS_ROBO.map((t) => t.id);
export const tarefaPorId = (id) => TAREFAS_ROBO.find((t) => t.id === id) ?? null;
