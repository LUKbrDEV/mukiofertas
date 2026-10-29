// Aciona o robô (GitHub Actions) a partir do painel admin e mostra as últimas execuções.
// Salve como app/api/admin/robo/route.js
//
// Variáveis necessárias (no .env.local e na Vercel → Settings → Environment Variables):
//   GITHUB_TOKEN_ROBO = token do GitHub com permissão "Actions: Read and write" só neste repositório
//   GITHUB_REPO       = SEU_USUARIO/SEU_REPOSITORIO   (ex.: lucas/mukiofertas)
//   GITHUB_BRANCH     = main   (opcional; é a branch onde está o .github/workflows/coleta.yml)
//
// Só administradores (tabela admins do Supabase) conseguem usar.

import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const WORKFLOW = "coleta.yml";
const TAREFAS = ["tudo", "coletar", "conferir-precos", "importar-telegram", "postar-telegram"];

function resposta(dados, status = 200) {
  return Response.json(dados, { status });
}

// Confere se quem chamou está logado e é administrador
async function ehAdmin(request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data, error } = await db.rpc("eh_admin");
  return !error && data === true;
}

function github(caminho, opcoes = {}) {
  return fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO}${caminho}`, {
    ...opcoes,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN_ROBO}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opcoes.headers || {}),
    },
    cache: "no-store",
  });
}

function faltaConfigurar() {
  if (!process.env.GITHUB_TOKEN_ROBO || !process.env.GITHUB_REPO) {
    return resposta(
      { erro: "Faltam as variáveis GITHUB_TOKEN_ROBO e GITHUB_REPO na Vercel (veja as instruções).", configurado: false },
      503
    );
  }
  return null;
}

// Últimas execuções do robô
export async function GET(request) {
  if (!(await ehAdmin(request))) return resposta({ erro: "Somente administradores." }, 403);
  const falta = faltaConfigurar();
  if (falta) return falta;

  const r = await github(`/actions/workflows/${WORKFLOW}/runs?per_page=8`);
  if (!r.ok) return resposta({ erro: `GitHub respondeu ${r.status}: ${(await r.text()).slice(0, 200)}` }, 502);
  const json = await r.json();

  return resposta({
    configurado: true,
    execucoes: (json.workflow_runs ?? []).map((run) => ({
      id: run.id,
      status: run.status, // queued, in_progress, completed
      resultado: run.conclusion, // success, failure, cancelled...
      evento: run.event, // schedule (automática) ou workflow_dispatch (pelo painel)
      titulo: run.display_title,
      criado_em: run.created_at,
      atualizado_em: run.updated_at,
      link: run.html_url,
    })),
  });
}

// Rodar agora
export async function POST(request) {
  if (!(await ehAdmin(request))) return resposta({ erro: "Somente administradores." }, 403);
  const falta = faltaConfigurar();
  if (falta) return falta;

  const { tarefa = "tudo" } = await request.json().catch(() => ({}));
  if (!TAREFAS.includes(tarefa)) return resposta({ erro: "Tarefa inválida." }, 400);

  const r = await github(`/actions/workflows/${WORKFLOW}/dispatches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref: process.env.GITHUB_BRANCH || "main", inputs: { tarefa } }),
  });

  if (r.status !== 204) {
    return resposta({ erro: `GitHub respondeu ${r.status}: ${(await r.text()).slice(0, 200)}` }, 502);
  }
  return resposta({ ok: true });
}
