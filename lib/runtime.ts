import { access } from 'fs/promises'
import { constants } from 'fs'

export const isVercel = process.env.VERCEL === '1'

export function hasGitHubConfig(): boolean {
  return !!(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO)
}

export function canWriteProjectFiles(): boolean {
  if (isVercel) return hasGitHubConfig()
  return true
}

export async function hasExecutable(pathname: string | undefined): Promise<boolean> {
  if (!pathname) return false
  try {
    await access(pathname, constants.X_OK)
    return true
  } catch {
    return false
  }
}
