import { NextResponse } from 'next/server'

export async function GET() {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO
  const branch = process.env.GITHUB_BRANCH ?? 'main'

  const info = {
    GITHUB_REPO: repo ?? '(not set)',
    GITHUB_BRANCH: branch,
    GITHUB_TOKEN: token ? `set (${token.length} chars, starts: ${token.slice(0, 6)}...)` : '(not set)',
  }

  if (!token || !repo) {
    return NextResponse.json({ ok: false, info, error: 'Missing env vars' })
  }

  // Test 1: repo exists and token works
  const repoRes = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  })

  const repoData = await repoRes.json() as { full_name?: string; private?: boolean; message?: string }

  if (!repoRes.ok) {
    return NextResponse.json({
      ok: false, info,
      repoStatus: repoRes.status,
      repoError: repoData.message,
    })
  }

  // Test 2: wiki/papers/ directory
  const dirRes = await fetch(`https://api.github.com/repos/${repo}/contents/wiki/papers?ref=${branch}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  })

  const dirData = await dirRes.json() as unknown

  return NextResponse.json({
    ok: repoRes.ok,
    info,
    repo: { full_name: repoData.full_name, private: repoData.private },
    wikiPapersStatus: dirRes.status,
    wikiPapersContent: Array.isArray(dirData)
      ? `${dirData.length} files found`
      : dirData,
  })
}
