'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Code,
  FilePdf,
  Play,
  DownloadSimple,
  CopySimple,
  Check,
  FileText,
  CaretDown,
  CaretRight,
  Warning,
  Info,
  XCircle,
} from '@phosphor-icons/react'
import { useResearchStore } from '@/store/researchStore'
import { ARTICLE_TEMPLATE } from '@/lib/latex'
import type { LintMessage } from '@/lib/latex-lint'
import type { ParsedError } from '@/lib/latex-errors'

export function LatexWorkspace() {
  const {
    latexContent, setLatex,
    pdfUrl, setPdfUrl,
    status, setStatus, setError, error,
    activeTab, setActiveTab,
  } = useResearchStore()

  const [copied, setCopied] = useState(false)
  const [compileLog, setCompileLog] = useState<string | null>(null)
  const [lintErrors, setLintErrors] = useState<LintMessage[]>([])
  const [parsedErrors, setParsedErrors] = useState<ParsedError[]>([])
  const [logOpen, setLogOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isCompiling = status === 'compiling'
  const isGenerating = status === 'generating'
  const hasContent = latexContent.trim().length > 0

  const displayContent = hasContent ? latexContent : ARTICLE_TEMPLATE

  const compile = useCallback(async () => {
    if (!hasContent || isCompiling) return
    setStatus('compiling')
    setError(null)
    setCompileLog(null)
    setLintErrors([])
    setParsedErrors([])

    try {
      const res = await fetch('/api/latex/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: latexContent, filename: 'research' }),
      })

      const data = await res.json()

      if (data.lintErrors?.length) setLintErrors(data.lintErrors)
      if (data.parsedErrors?.length) setParsedErrors(data.parsedErrors)
      if (data.log) setCompileLog(data.log)

      if (!data.success && !data.pdfUrl) {
        const msg = data.error ?? 'Compilation failed'
        throw new Error(msg)
      }

      setPdfUrl(data.pdfUrl)
      setActiveTab('preview')
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compilation failed')
      setStatus('error')
    }
  }, [hasContent, isCompiling, latexContent, setStatus, setError, setPdfUrl, setActiveTab])

  const copy = useCallback(() => {
    navigator.clipboard.writeText(displayContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [displayContent])

  return (
    <aside
      className="flex flex-col h-full overflow-hidden"
      style={{ background: 'var(--color-surface)' }}
    >
      {/* Tab bar */}
      <div
        className="flex items-center border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <TabButton
          active={activeTab === 'source'}
          onClick={() => setActiveTab('source')}
          icon={<Code size={13} />}
          label="Source"
        />
        <TabButton
          active={activeTab === 'preview'}
          onClick={() => setActiveTab('preview')}
          icon={<FilePdf size={13} />}
          label="PDF"
          disabled={!pdfUrl}
        />
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-1 pr-3">
          <IconBtn onClick={copy} title="Copy LaTeX">
            {copied ? (
              <Check size={14} style={{ color: '#34d399' }} />
            ) : (
              <CopySimple size={14} style={{ color: 'var(--color-text-muted)' }} />
            )}
          </IconBtn>

          {pdfUrl && (
            <a href={pdfUrl} download="research.pdf">
              <IconBtn as="span" title="Download PDF">
                <DownloadSimple size={14} style={{ color: 'var(--color-text-muted)' }} />
              </IconBtn>
            </a>
          )}

          <button
            onClick={compile}
            disabled={!hasContent || isCompiling || isGenerating}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium ml-1 transition-all duration-150 active:scale-[0.97] disabled:opacity-40"
            style={{
              background: 'var(--color-accent)',
              color: '#09090b',
            }}
          >
            <Play size={11} weight="fill" />
            {isCompiling ? 'Compiling…' : 'Compile'}
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'source' && (
            <motion.div
              key="source"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex flex-col"
            >
              {isGenerating && (
                <div
                  className="flex items-center gap-2 px-4 py-2 border-b text-xs"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent)' }}
                >
                  <GeneratingPulse />
                  Generating LaTeX…
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={displayContent}
                onChange={(e) => setLatex(e.target.value)}
                spellCheck={false}
                className="flex-1 resize-none bg-transparent px-4 py-3 text-xs leading-relaxed w-full h-full"
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-text)',
                  caretColor: 'var(--color-accent)',
                }}
                placeholder="LaTeX source will appear here after generation…"
              />

              {/* Structured error panel */}
              <AnimatePresence>
                {(lintErrors.length > 0 || parsedErrors.length > 0) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t overflow-auto max-h-56"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {lintErrors.length > 0 && (
                      <ErrorSection title="Pre-compile issues" messages={lintErrors} />
                    )}
                    {parsedErrors.length > 0 && (
                      <ParsedErrorSection title="Compile errors" errors={parsedErrors} />
                    )}

                    {/* Collapsible raw log */}
                    {compileLog && (
                      <div className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                        <button
                          onClick={() => setLogOpen((o) => !o)}
                          className="flex items-center gap-1.5 w-full px-3 py-1.5 text-[10px]"
                          style={{ color: 'var(--color-text-dim)' }}
                        >
                          {logOpen ? <CaretDown size={10} /> : <CaretRight size={10} />}
                          Raw log
                        </button>
                        <AnimatePresence>
                          {logOpen && (
                            <motion.pre
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="text-[10px] leading-relaxed whitespace-pre-wrap px-3 pb-2 overflow-auto max-h-32"
                              style={{ color: '#f87171' }}
                            >
                              {compileLog}
                            </motion.pre>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Raw log only (no structured errors) */}
              <AnimatePresence>
                {compileLog && lintErrors.length === 0 && parsedErrors.length === 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t overflow-auto max-h-32 px-4 py-2"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <pre
                      className="text-[10px] leading-relaxed whitespace-pre-wrap"
                      style={{ color: '#f87171' }}
                    >
                      {compileLog}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0"
            >
              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full"
                  style={{ border: 'none', background: '#fff' }}
                  title="Compiled PDF"
                />
              ) : (
                <NoPdfState />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status bar */}
      <div
        className="flex items-center px-4 py-1.5 border-t gap-2"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {hasContent ? (
          <span
            className="text-[10px] font-mono"
            style={{ color: 'var(--color-text-dim)' }}
          >
            {latexContent.split('\n').length} lines · {latexContent.length} chars
          </span>
        ) : (
          <span className="text-[10px]" style={{ color: 'var(--color-text-dim)' }}>
            template
          </span>
        )}
        <div className="flex-1" />
        {status === 'done' && pdfUrl && (
          <span className="text-[10px]" style={{ color: '#34d399' }}>
            compiled
          </span>
        )}
        {status === 'error' && (
          <span className="text-[10px]" style={{ color: '#f87171' }}>
            error
          </span>
        )}
      </div>
    </aside>
  )
}

function TabButton({
  active, onClick, icon, label, disabled,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-4 py-2.5 text-xs border-b-2 transition-colors duration-150 disabled:opacity-30"
      style={{
        borderBottomColor: active ? 'var(--color-accent)' : 'transparent',
        color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
      }}
    >
      {icon}
      {label}
    </button>
  )
}

function IconBtn({
  onClick,
  title,
  children,
  as,
}: {
  onClick?: () => void
  title?: string
  children: React.ReactNode
  as?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded transition-colors hover:bg-zinc-800 active:scale-[0.95]"
    >
      {children}
    </button>
  )
}

function GeneratingPulse() {
  return (
    <motion.span
      className="w-1.5 h-1.5 rounded-full inline-block"
      style={{ background: 'var(--color-accent)' }}
      animate={{ opacity: [1, 0.3, 1] }}
      transition={{ duration: 1, repeat: Infinity }}
    />
  )
}

function NoPdfState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <FileText size={28} style={{ color: 'var(--color-text-dim)' }} />
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Write or generate LaTeX, then click Compile.
      </p>
    </div>
  )
}

const SEVERITY_STYLES: Record<LintMessage['severity'], { bg: string; color: string; label: string }> = {
  error: { bg: 'rgba(248,113,113,0.12)', color: '#f87171', label: 'error' },
  warning: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', label: 'warning' },
  info: { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa', label: 'info' },
}

function SeverityBadge({ severity }: { severity: LintMessage['severity'] }) {
  const s = SEVERITY_STYLES[severity]
  return (
    <span
      className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded font-mono flex-shrink-0"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}

function ErrorSection({ title, messages }: { title: string; messages: LintMessage[] }) {
  return (
    <div className="px-3 py-2">
      <p className="text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
        {title}
      </p>
      <div className="flex flex-col gap-1">
        {messages.map((m, i) => (
          <div key={i} className="flex items-start gap-2">
            <SeverityBadge severity={m.severity} />
            <div className="flex-1 min-w-0">
              <span className="text-[11px]" style={{ color: 'var(--color-text)' }}>
                {m.message}
              </span>
              {m.line != null && (
                <span
                  className="ml-1.5 text-[10px] px-1 py-0.5 rounded"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-dim)' }}
                >
                  line {m.line}
                </span>
              )}
              {m.hint && (
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
                  {m.hint}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ParsedErrorSection({ title, errors }: { title: string; errors: ParsedError[] }) {
  return (
    <div className="px-3 py-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <p className="text-[10px] font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
        {title}
      </p>
      <div className="flex flex-col gap-1">
        {errors.map((e, i) => (
          <div key={i} className="flex items-start gap-2">
            <SeverityBadge severity="error" />
            <div className="flex-1 min-w-0">
              <span className="text-[11px]" style={{ color: 'var(--color-text)' }}>
                {e.message}
              </span>
              {e.line != null && (
                <span
                  className="ml-1.5 text-[10px] px-1 py-0.5 rounded"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-dim)' }}
                >
                  line {e.line}
                </span>
              )}
              {e.hint && (
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-dim)' }}>
                  {e.hint}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
