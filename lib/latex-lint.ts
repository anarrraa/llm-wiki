export interface LintMessage {
  line?: number
  severity: 'error' | 'warning' | 'info'
  message: string
  hint?: string
}

export function lintLatex(source: string): LintMessage[] {
  const msgs: LintMessage[] = []

  if (!source.includes('\\documentclass')) {
    msgs.push({ severity: 'error', message: 'Missing \\documentclass declaration' })
  }
  if (!source.includes('\\begin{document}')) {
    msgs.push({ severity: 'error', message: 'Missing \\begin{document}' })
  }
  if (!source.includes('\\end{document}')) {
    msgs.push({ severity: 'error', message: 'Missing \\end{document}' })
  }

  // Scan \begin and \end in document order (interleaved by position) for correct nesting
  const tokenRe = /\\(begin|end)\{([^}]+)\}/g
  const stack: string[] = []
  let m: RegExpExecArray | null
  while ((m = tokenRe.exec(source)) !== null) {
    const [, kind, env] = m
    if (kind === 'begin') {
      stack.push(env)
    } else {
      const top = stack.pop()
      if (top !== env) {
        msgs.push({
          severity: 'error',
          message: `Unmatched \\end{${env}}${top ? ` — expected \\end{${top}}` : ''}`,
        })
      }
    }
  }
  if (stack.length > 0) {
    msgs.push({ severity: 'warning', message: `Unclosed environments: ${stack.join(', ')}` })
  }

  // \cite{} without matching \bibitem{}
  const citeKeys = new Set<string>()
  const bibKeys = new Set<string>()
  const citeRe = /\\cite\{([^}]+)\}/g
  const bibRe = /\\bibitem\{([^}]+)\}/g
  while ((m = citeRe.exec(source)) !== null) {
    for (const k of m[1].split(',')) citeKeys.add(k.trim())
  }
  while ((m = bibRe.exec(source)) !== null) bibKeys.add(m[1].trim())
  for (const k of citeKeys) {
    if (!bibKeys.has(k)) {
      msgs.push({ severity: 'warning', message: `\\cite{${k}} has no matching \\bibitem`, hint: `Add \\bibitem{${k}} to the bibliography` })
    }
  }

  // \ref{} without matching \label{}
  const refKeys = new Set<string>()
  const labelKeys = new Set<string>()
  const refRe = /\\ref\{([^}]+)\}/g
  const labelRe = /\\label\{([^}]+)\}/g
  while ((m = refRe.exec(source)) !== null) refKeys.add(m[1].trim())
  while ((m = labelRe.exec(source)) !== null) labelKeys.add(m[1].trim())
  for (const k of refKeys) {
    if (!labelKeys.has(k)) {
      msgs.push({ severity: 'warning', message: `\\ref{${k}} has no matching \\label`, hint: `Add \\label{${k}} near the referenced element` })
    }
  }

  return msgs
}
