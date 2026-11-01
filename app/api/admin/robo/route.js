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
const TAREFAS = ["tudo", "coletar", "conferir-precos", "postar-telegram", "kabum", "postar-whatsapp"];

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

// Aceita "usuario/repo" e também o endereço completo (https://github.com/usuario/repo)
function repositorio() {
  return String(process.env.GITHUB_REPO || "")
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "")
    .split("/")
    .slice(0, 2)
    .join("/");
}

function github(caminho, opcoes = {}) {
  return fetch(`https://api.github.com/repos/${repositorio()}${caminho}`, {
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

// Descobre o workflow do robô (coleta.yml) e explica o problema se não achar
async function acharWorkflow() {
  const repo = await github("");
  if (repo.status === 404 || repo.status === 403) {
    return {
      erro:
        `O GitHub não encontrou o repositório "${repositorio()}". Confira se GITHUB_REPO está no formato ` +
        `usuario/repositorio (igual ao endereço do GitHub) e se o token foi criado com acesso a esse repositório ` +
        `(Repository access → Only select repositories).`,
    };
  }
  if (repo.status === 401) return { erro: "O token GITHUB_TOKEN_ROBO é inválido ou expirou. Gere outro no GitHub." };
  if (!repo.ok) return { erro: `GitHub respondeu ${repo.status} ao abrir o repositório.` };

  const r = await github("/actions/workflows?per_page=100");
  if (!r.ok) {
    return {
      erro: `Sem permissão para ver o GitHub Actions (${r.status}). No token, a permissão Actions precisa estar em "Read and write".`,
    };
  }
  const { workflows = [] } = await r.json();
  const wf =
    workflows.find((w) => w.path.endsWith(`/${WORKFLOW}`)) ||
    workflows.find((w) => /colet/i.test(w.path) || /colet/i.test(w.name));
  if (!wf) {
    const lista = workflows.map((w) => w.path).join(", ") || "nenhum";
    return {
      erro: `Não achei o arquivo .github/workflows/${WORKFLOW} no GitHub. Workflows encontrados: ${lista}. Confira se a pasta .github foi enviada no push.`,
    };
  }
  return { id: wf.id };
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

  const wf = await acharWorkflow();
  if (wf.erro) return resposta({ erro: wf.erro }, 502);

  const r = await github(`/actions/workflows/${wf.id}/runs?per_page=8`);
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

  const wf = await acharWorkflow();
  if (wf.erro) return resposta({ erro: wf.erro }, 502);

  const r = await github(`/actions/workflows/${wf.id}/dispatches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref: process.env.GITHUB_BRANCH || "main", inputs: { tarefa } }),
  });

  if (r.status !== 204) {
    const texto = (await r.text()).slice(0, 300);
    const dica = /inputs|Unexpected inputs/i.test(texto)
      ? " O coleta.yml que está no GitHub ainda é o antigo: envie o novo (pasta .github/workflows) com git push."
      : /No ref found/i.test(texto)
        ? " A branch não existe: confira a variável GITHUB_BRANCH (normalmente main ou master)."
        : "";
    return resposta({ erro: `GitHub respondeu ${r.status}: ${texto}.${dica}` }, 502);
  }
  return resposta({ ok: true });
}
