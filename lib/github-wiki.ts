// GitHub Contents API wrapper — wiki файлуудыг repo-д уншиж/бичнэ.
// Шаардлагатай env: GITHUB_TOKEN, GITHUB_REPO (e.g. "anar/llm-wiki")
// Заавал биш:      GITHUB_BRANCH (default: "main")

const GH_API = 'https://api.github.com'

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
}

const repo = () => process.env.GITHUB_REPO!
const branch = () => process.env.GITHUB_BRANCH ?? 'main'

interface GHFileResponse {
  content: string   // base64, GitHub splits with \n
  sha: string
}

// Файл уншиж raw content + sha буцаана. Олдохгүй бол null.
export async function ghGetFile(filePath: string): Promise<GHFileResponse | null> {
  const res = await fetch(
    `${GH_API}/repos/${repo()}/contents/${filePath}?ref=${branch()}`,
    { headers: headers(), cache: 'no-store' }
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub GET ${filePath}: ${res.status}`)
  return res.json() as Promise<GHFileResponse>
}

// Файл уншиж string буцаана. Олдохгүй бол null.
export async function ghReadFile(filePath: string): Promise<string | null> {
  const file = await ghGetFile(filePath)
  if (!file) return null
  // GitHub base64 мөр таслах \n тэмдэг оруулдаг тул арилгана
  return Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf-8')
}

// Файл үүсгэх эсвэл шинэчлэх (sha байвал update, байхгүй бол create).
export async function ghWriteFile(
  filePath: string,
  content: string,
  commitMessage: string,
  sha?: string
): Promise<void> {
  const encodedContent = Buffer.from(content, 'utf-8').toString('base64')

  const doPut = async (currentSha: string | undefined) => {
    const body: Record<string, string> = {
      message: commitMessage,
      content: encodedContent,
      branch: branch(),
    }
    if (currentSha) body.sha = currentSha
    return fetch(`${GH_API}/repos/${repo()}/contents/${filePath}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(body),
    })
  }

  let res = await doPut(sha)

  // 409 = SHA mismatch — файл хоорондоо update болсон, шинэ SHA авч дахин оролд
  if (res.status === 409) {
    const fresh = await ghGetFile(filePath)
    res = await doPut(fresh?.sha)
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(`GitHub PUT ${filePath}: ${res.status} — ${err.message ?? 'unknown'}`)
  }
}

// Файлын төгсгөлд мөр нэмж commit хийнэ (read → append → write).
export async function ghAppendFile(
  filePath: string,
  addition: string,
  commitMessage: string
): Promise<void> {
  const file = await ghGetFile(filePath)
  const existing = file
    ? Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf-8')
    : ''
  await ghWriteFile(filePath, existing + addition, commitMessage, file?.sha ?? undefined)
}

// Directory-н файлуудын нэрийн жагсаалт буцаана.
export async function ghListDir(dirPath: string): Promise<string[]> {
  const res = await fetch(
    `${GH_API}/repos/${repo()}/contents/${dirPath}?ref=${branch()}`,
    { headers: headers(), cache: 'no-store' }
  )
  if (!res.ok) return []
  const data = await res.json() as Array<{ type: string; name: string }>
  if (!Array.isArray(data)) return []
  return data.filter(f => f.type === 'file').map(f => f.name)
}
