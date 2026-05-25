import { access } from 'fs/promises'
import { constants } from 'fs'

export const isVercel = process.env.VERCEL === '1'

export function canWriteProjectFiles(): boolean {
  return !isVercel
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
