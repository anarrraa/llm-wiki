'use strict'
const http = require('http')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { randomUUID } = require('crypto')

const PORT = process.env.PORT || 3001
const PDFLATEX = process.env.PDFLATEX_PATH ?? 'pdflatex'
const MAX_CONTENT_BYTES = 10 * 1024 * 1024 // 10 MB

function json(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let total = 0
    req.on('data', chunk => {
      total += chunk.length
      if (total > MAX_CONTENT_BYTES) {
        reject(new Error('Request too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

async function handleCompile(req, res) {
  let body
  try {
    body = await readBody(req)
  } catch (err) {
    return json(res, 400, { error: String(err) })
  }

  let content, filename
  try {
    ;({ content, filename = 'document' } = JSON.parse(body))
  } catch {
    return json(res, 400, { error: 'Invalid JSON' })
  }

  if (!content?.trim()) {
    return json(res, 400, { error: 'content required' })
  }

  const safe = String(filename).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
  const dir = path.join(os.tmpdir(), `compile-${randomUUID()}`)

  try {
    fs.mkdirSync(dir)
    const texPath = path.join(dir, `${safe}.tex`)
    fs.writeFileSync(texPath, content, 'utf-8')

    const cmd = `"${PDFLATEX}" -interaction=nonstopmode -output-directory="${dir}" "${texPath}"`
    // Two passes for cross-references
    try { execSync(cmd, { stdio: 'pipe', timeout: 60_000 }) } catch {}
    try { execSync(cmd, { stdio: 'pipe', timeout: 60_000 }) } catch {}

    const pdfPath = path.join(dir, `${safe}.pdf`)
    if (!fs.existsSync(pdfPath)) {
      const logPath = path.join(dir, `${safe}.log`)
      const log = fs.existsSync(logPath)
        ? fs.readFileSync(logPath, 'utf-8').slice(-8000)
        : 'No log available'
      return json(res, 422, { success: false, log })
    }

    const pdfBase64 = fs.readFileSync(pdfPath).toString('base64')
    return json(res, 200, { success: true, pdfBase64 })
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }) } catch {}
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return json(res, 200, { ok: true, engine: PDFLATEX })
  }

  if (req.method === 'POST' && req.url === '/compile') {
    try {
      await handleCompile(req, res)
    } catch (err) {
      json(res, 500, { error: String(err) })
    }
    return
  }

  json(res, 404, { error: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`LaTeX compile service on :${PORT} (engine: ${PDFLATEX})`)
})
