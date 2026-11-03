import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Endpoint opcional para disparar um workflow externo/worker.
 * Não executa renderização na Vercel. Proteja com SOCIAL_RUN_SECRET.
 */
export async function POST(request) {
  const secret = process.env.SOCIAL_RUN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'SOCIAL_RUN_SECRET não configurado.' }, { status: 503 });
  }

  const authorization = request.headers.get('authorization');
  if (authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const githubToken = process.env.GITHUB_ACTIONS_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!githubToken || !repo) {
    return NextResponse.json({
      error: 'Configure GITHUB_ACTIONS_TOKEN e GITHUB_REPOSITORY para disparar o worker.',
      hint: 'O agendamento diário já é feito pelo GitHub Actions.'
    }, { status: 503 });
  }

  const response = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/social-media.yml/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ref: 'main' })
  });

  if (!response.ok) {
    return NextResponse.json({ error: await response.text() }, { status: response.status });
  }

  return NextResponse.json({ ok: true, message: 'Workflow solicitado ao GitHub Actions.' });
}
