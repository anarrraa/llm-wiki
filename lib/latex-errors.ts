export interface ParsedError {
  line?: number
  message: string
  hint?: string
  raw: string
}

const ERROR_MAP: Array<[RegExp, string, string]> = [
  [/Undefined control sequence/, 'Undefined command', 'Check for typos in the command name or missing package'],
  [/Missing \$ inserted/, 'Math mode error', 'Wrap the expression in $ ... $ or \\( ... \\)'],
  [/File `.+' not found/, 'Missing file or package', 'Check that the package is installed and the filename is correct'],
  [/Overfull \\hbox/, 'Line too wide', 'Add \\sloppy or break long words with \\-'],
  [/LaTeX Error: Environment (.+) undefined/, 'Undefined environment', 'Check the environment name or add the required package'],
  [/LaTeX Error: (.+)/, 'LaTeX error', ''],
  [/! (.+)/, 'TeX error', ''],
]

export function parseLatexLog(log: string): ParsedError[] {
  const errors: ParsedError[] = []
  const lines = log.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.startsWith('!') && !line.includes('LaTeX Error:') && !line.includes('Overfull')) continue
    let lineNum: number | undefined
    const lineMatch = lines[i + 1]?.match(/l\.(\d+)/)
    if (lineMatch) lineNum = parseInt(lineMatch[1], 10)

    let matched = false
    for (const [re, msg, hint] of ERROR_MAP) {
      const m = line.match(re)
      if (m) {
        errors.push({ line: lineNum, message: msg, hint: hint || undefined, raw: line })
        matched = true
        break
      }
    }
    if (!matched && line.startsWith('!')) {
      errors.push({ line: lineNum, message: line.slice(2), raw: line })
    }
  }
  return errors
}
