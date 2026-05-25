import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, mkdir, readFile } from 'fs/promises'
import path from 'path'
import os from 'os'
import { lintLatex } from '@/lib/latex-lint'
import { parseLatexLog } from '@/lib/latex-errors'

const execAsync = promisify(exec)

const PDFLATEX =
  process.env.PDFLATEX_PATH ??
  '/usr/local/texlive/2026basic/bin/universal-darwin/pdflatex'

export async function POST(req: NextRequest) {
  const { content, filename = 'research' }: { content: string; filename?: string } =
    await req.json()

  if (!content?.trim()) {
    return NextResponse.json({ error: 'No LaTeX content provided' }, { status: 400 })
  }

  const lintErrors = lintLatex(content)
  const criticalLint = lintErrors.filter(e => e.severity === 'error')
  if (criticalLint.length > 0) {
    return NextResponse.json({ success: false, lintErrors })
  }

  const safe = filename.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
  const tmpDir = await mkTmp()

  try {
    const texPath = path.join(tmpDir, `${safe}.tex`)
    await writeFile(texPath, content, 'utf-8')

    const cmd = `"${PDFLATEX}" -interaction=nonstopmode -output-directory="${tmpDir}" "${texPath}"`
    await execAsync(cmd).catch(() => {})
    await execAsync(cmd).catch(() => {})

    const pdfTmp = path.join(tmpDir, `${safe}.pdf`)
    const pdfBytes = await readFile(pdfTmp).catch(() => null)

    if (!pdfBytes) {
      const logPath = path.join(tmpDir, `${safe}.log`)
      const log = await readFile(logPath, 'utf-8').catch(() => 'No log available')
      const parsedErrors = parseLatexLog(log)
      return NextResponse.json({ success: false, log, lintErrors: [], parsedErrors }, { status: 422 })
    }

    const outDir = path.join(process.cwd(), 'public', 'output')
    await mkdir(outDir, { recursive: true })
    const outPath = path.join(outDir, `${safe}.pdf`)
    await writeFile(outPath, pdfBytes)

    return NextResponse.json({
      success: true,
      pdfUrl: `/output/${safe}.pdf?t=${Date.now()}`,
      lintErrors: lintErrors.filter(e => e.severity !== 'error'),
    })
  } finally {
    await cleanup(tmpDir)
  }
}

async function mkTmp(): Promise<string> {
  const dir = path.join(os.tmpdir(), `llm-wiki-${Date.now()}`)
  await mkdir(dir, { recursive: true })
  return dir
}

async function cleanup(dir: string) {
  try {
    const { rm } = await import('fs/promises')
    await rm(dir, { recursive: true, force: true })
  } catch {}
}
