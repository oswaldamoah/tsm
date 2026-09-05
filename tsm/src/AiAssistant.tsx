import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './AiAssistant.css'

// ============ TYPES ============

type ChartSeries = {
  name: string
  values: number[]
}

export type ChartSpec = {
  title: string
  type: 'bar' | 'stacked_bar' | 'line' | 'area' | 'pie' | 'doughnut'
  categories: string[]
  series: ChartSeries[]
  xLabel?: string
  yLabel?: string
}

type SlideSpec = {
  title: string
  bullets: string[]
  chartIndex: number | null
  notes?: string
}

export type PresentationSpec = {
  title: string
  subtitle?: string
  slides: SlideSpec[]
}

type ChatResponse = {
  answer: string
  charts: ChartSpec[]
  presentation: PresentationSpec | null
  toolsUsed: string[]
  provider: string
  model: string
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  charts?: ChartSpec[]
  presentation?: PresentationSpec | null
  isError?: boolean
}

type AssistantStatus =
  | { state: 'checking' }
  | { state: 'ready'; provider: string; model: string }
  | { state: 'unavailable'; reason: string }

// ============ CONSTANTS ============

const CHART_COLORS = ['#2563eb', '#059669', '#b45309', '#7c3aed', '#dc2626', '#0891b2', '#c2410c']

const SUGGESTIONS = [
  'What are our total costs so far?',
  'Chart the cost breakdown by region',
  'Which sites are over budget compared to the others?',
  'What activities are overdue?',
  'Build a presentation summarising this quarter',
]

// How many past turns to send back as context. Keeps prompts small and fast.
const HISTORY_TURNS = 8

// Must exceed the server's own budget (AI_TOTAL_BUDGET, 90s) plus a cold start,
// so this only fires when the request is genuinely lost.
const CHAT_TIMEOUT_MS = 150_000

// ============ API ============

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const readError = async (res: Response, fallback: string): Promise<string> => {
  try {
    const body = await res.json()
    if (typeof body?.detail === 'string') return body.detail
  } catch {
    // non-JSON error body; fall through
  }
  return fallback
}

// ============ MARKDOWN-LITE ============
// The model answers in light markdown. We parse it into React elements rather
// than injecting HTML, so there is no way for model output to become markup.

const renderInline = (text: string): ReactNode[] => {
  const nodes: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index))
    const token = match[0]
    if (token.startsWith('**')) {
      nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>)
    } else {
      nodes.push(<code key={key++}>{token.slice(1, -1)}</code>)
    }
    lastIndex = match.index + token.length
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

const splitTableRow = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())

const isTableDivider = (line: string): boolean => /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes('-')

function Markdown({ text }: { text: string }) {
  const blocks = useMemo(() => {
    const lines = text.split('\n')
    const output: ReactNode[] = []
    let index = 0
    let key = 0

    while (index < lines.length) {
      const line = lines[index]

      if (!line.trim()) {
        index += 1
        continue
      }

      // Table: header row, divider, then body rows.
      if (line.includes('|') && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
        const headers = splitTableRow(line)
        index += 2
        const rows: string[][] = []
        while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
          rows.push(splitTableRow(lines[index]))
          index += 1
        }
        output.push(
          <div className="ai-table-wrap" key={key++}>
            <table className="ai-table">
              <thead>
                <tr>
                  {headers.map((header, i) => (
                    <th key={i}>{renderInline(header)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{renderInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        )
        continue
      }

      const heading = /^(#{1,4})\s+(.*)$/.exec(line)
      if (heading) {
        output.push(
          <p className="ai-md-heading" key={key++}>
            {renderInline(heading[2])}
          </p>,
        )
        index += 1
        continue
      }

      if (/^\s*[-*]\s+/.test(line)) {
        const items: string[] = []
        while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
          items.push(lines[index].replace(/^\s*[-*]\s+/, ''))
          index += 1
        }
        output.push(
          <ul className="ai-md-list" key={key++}>
            {items.map((item, i) => (
              <li key={i}>{renderInline(item)}</li>
            ))}
          </ul>,
        )
        continue
      }

      if (/^\s*\d+[.)]\s+/.test(line)) {
        const items: string[] = []
        while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
          items.push(lines[index].replace(/^\s*\d+[.)]\s+/, ''))
          index += 1
        }
        output.push(
          <ol className="ai-md-list" key={key++}>
            {items.map((item, i) => (
              <li key={i}>{renderInline(item)}</li>
            ))}
          </ol>,
        )
        continue
      }

      const paragraph: string[] = []
      while (
        index < lines.length &&
        lines[index].trim() &&
        !/^\s*[-*]\s+/.test(lines[index]) &&
        !/^\s*\d+[.)]\s+/.test(lines[index]) &&
        !/^#{1,4}\s+/.test(lines[index]) &&
        !lines[index].includes('|')
      ) {
        paragraph.push(lines[index])
        index += 1
      }
      if (paragraph.length) {
        output.push(
          <p className="ai-md-paragraph" key={key++}>
            {renderInline(paragraph.join(' '))}
          </p>,
        )
      } else {
        // A lone pipe-containing line that isn't a table - emit it as text.
        output.push(
          <p className="ai-md-paragraph" key={key++}>
            {renderInline(lines[index])}
          </p>,
        )
        index += 1
      }
    }

    return output
  }, [text])

  return <div className="ai-markdown">{blocks}</div>
}

// ============ CHART ============

const formatAxisValue = (value: number): string => {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return String(value)
}

const formatTooltipValue = (value: unknown): string =>
  typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(value)

export function ChartView({ spec, height = 260 }: { spec: ChartSpec; height?: number }) {
  const data = useMemo(
    () =>
      spec.categories.map((category, index) => {
        const row: Record<string, string | number> = { name: category }
        spec.series.forEach((series) => {
          row[series.name] = series.values[index] ?? 0
        })
        return row
      }),
    [spec],
  )

  const showLegend = spec.series.length > 1
  const axisProps = { tick: { fontSize: 11 }, stroke: '#94a3b8' }

  const body = () => {
    switch (spec.type) {
      case 'pie':
      case 'doughnut': {
        const key = spec.series[0]?.name ?? 'value'
        return (
          <PieChart>
            <Tooltip formatter={formatTooltipValue} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Pie
              data={data}
              dataKey={key}
              nameKey="name"
              innerRadius={spec.type === 'doughnut' ? '45%' : 0}
              outerRadius="75%"
              paddingAngle={1}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        )
      }
      case 'line':
        return (
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis tickFormatter={formatAxisValue} {...axisProps} />
            <Tooltip formatter={formatTooltipValue} />
            {showLegend ? <Legend wrapperStyle={{ fontSize: 11 }} /> : null}
            {spec.series.map((series, index) => (
              <Line
                key={series.name}
                type="monotone"
                dataKey={series.name}
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        )
      case 'area':
        return (
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis tickFormatter={formatAxisValue} {...axisProps} />
            <Tooltip formatter={formatTooltipValue} />
            {showLegend ? <Legend wrapperStyle={{ fontSize: 11 }} /> : null}
            {spec.series.map((series, index) => (
              <Area
                key={series.name}
                type="monotone"
                dataKey={series.name}
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
                fillOpacity={0.18}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        )
      default:
        return (
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis tickFormatter={formatAxisValue} {...axisProps} />
            <Tooltip formatter={formatTooltipValue} />
            {showLegend ? <Legend wrapperStyle={{ fontSize: 11 }} /> : null}
            {spec.series.map((series, index) => (
              <Bar
                key={series.name}
                dataKey={series.name}
                stackId={spec.type === 'stacked_bar' ? 'stack' : undefined}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
                radius={[3, 3, 0, 0]}
              />
            ))}
          </BarChart>
        )
    }
  }

  return (
    <figure className="ai-chart">
      <figcaption className="ai-chart-title">{spec.title}</figcaption>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          {body()}
        </ResponsiveContainer>
      </div>
      {spec.yLabel ? <p className="ai-chart-axis">{spec.yLabel}</p> : null}
    </figure>
  )
}

// ============ DECK VIEWER ============

function DeckViewer({
  presentation,
  charts,
  apiBaseUrl,
  onClose,
}: {
  presentation: PresentationSpec
  charts: ChartSpec[]
  apiBaseUrl: string
  onClose: () => void
}) {
  const [index, setIndex] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  // Slide 0 is the cover; content slides follow.
  const total = presentation.slides.length + 1
  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])
  const goNext = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [total])

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') goPrev()
      if (event.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev, onClose])

  const downloadPptx = async () => {
    setDownloading(true)
    setDownloadError(null)
    try {
      const res = await fetch(`${apiBaseUrl}/ai/presentation.pptx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ presentation, charts }),
      })
      if (!res.ok) throw new Error(await readError(res, 'Could not build the PowerPoint file'))

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${presentation.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'presentation'}.pptx`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  const slide = index === 0 ? null : presentation.slides[index - 1]
  const slideChart =
    slide && slide.chartIndex !== null && slide.chartIndex !== undefined ? charts[slide.chartIndex] : undefined

  return (
    <div className="ai-deck-overlay" role="dialog" aria-modal="true" aria-label={presentation.title} onMouseDown={onClose}>
      <div className="ai-deck" onMouseDown={(event) => event.stopPropagation()}>
        <div className="ai-deck-bar">
          <span className="ai-deck-counter">
            {index + 1} / {total}
          </span>
          <div className="ai-deck-actions">
            <button type="button" className="ai-btn ai-btn-primary" onClick={downloadPptx} disabled={downloading}>
              {downloading ? 'Building…' : 'Download .pptx'}
            </button>
            <button type="button" className="ai-btn" onClick={onClose} aria-label="Close deck">
              Close
            </button>
          </div>
        </div>

        {downloadError ? <p className="ai-deck-error">{downloadError}</p> : null}

        <div className="ai-slide">
          {slide === null ? (
            <div className="ai-slide-cover">
              <h2>{presentation.title}</h2>
              {presentation.subtitle ? <p>{presentation.subtitle}</p> : null}
            </div>
          ) : (
            <>
              <h3 className="ai-slide-title">{slide.title}</h3>
              <div className={slideChart ? 'ai-slide-split' : 'ai-slide-body'}>
                {slide.bullets.length ? (
                  <ul className="ai-slide-bullets">
                    {slide.bullets.map((bullet, i) => (
                      <li key={i}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {slideChart ? <ChartView spec={slideChart} height={300} /> : null}
              </div>
            </>
          )}
        </div>

        <div className="ai-deck-nav">
          <button type="button" className="ai-btn" onClick={goPrev} disabled={index === 0}>
            ← Prev
          </button>
          <button type="button" className="ai-btn" onClick={goNext} disabled={index === total - 1}>
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}

// ============ ICONS ============

const SparkIcon = () => (
  <svg viewBox="0 0 24 24" className="ai-icon" aria-hidden="true">
    <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z" />
    <path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9L18 15z" />
  </svg>
)

const SendIcon = () => (
  <svg viewBox="0 0 24 24" className="ai-icon" aria-hidden="true">
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4 20-7z" />
  </svg>
)

// ============ MAIN PANEL ============

export default function AiAssistant({ apiBaseUrl }: { apiBaseUrl: string }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<AssistantStatus>({ state: 'checking' })
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [deck, setDeck] = useState<{ presentation: PresentationSpec; charts: ChartSpec[] } | null>(null)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  // Check availability the first time the panel is opened, not on page load.
  useEffect(() => {
    if (!open || status.state !== 'checking') return
    let cancelled = false

    const check = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/ai/status`, { headers: authHeaders() })
        if (!res.ok) throw new Error(await readError(res, 'Assistant is unavailable'))
        const body = await res.json()
        if (cancelled) return
        setStatus(
          body.enabled
            ? { state: 'ready', provider: body.provider, model: body.model }
            : { state: 'unavailable', reason: body.reason ?? 'The assistant is not configured.' },
        )
      } catch (error) {
        if (!cancelled) {
          setStatus({ state: 'unavailable', reason: error instanceof Error ? error.message : 'Assistant is unavailable' })
        }
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [apiBaseUrl, open, status.state])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isSending])

  const send = async (text: string) => {
    const question = text.trim()
    if (!question || isSending) return

    const history = messages
      .filter((message) => !message.isError)
      .slice(-HISTORY_TURNS)
      .map((message) => ({ role: message.role, content: message.content }))

    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: question }])
    setInput('')
    setIsSending(true)

    // A free-tier host can be cold-starting (~50s) on top of a slow model, so
    // give it room - but never hang the UI forever if it never answers.
    const abort = new AbortController()
    const timer = window.setTimeout(() => abort.abort(), CHAT_TIMEOUT_MS)

    try {
      const res = await fetch(`${apiBaseUrl}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ message: question, history }),
        signal: abort.signal,
      })
      if (!res.ok) throw new Error(await readError(res, 'The assistant could not answer that.'))

      const body: ChatResponse = await res.json()
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: body.answer,
          charts: body.charts,
          presentation: body.presentation,
        },
      ])
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === 'AbortError'
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: timedOut
            ? 'That took too long to come back. The server may be waking up from idle - try asking again.'
            : error instanceof Error
              ? error.message
              : 'Something went wrong.',
          isError: true,
        },
      ])
    } finally {
      window.clearTimeout(timer)
      setIsSending(false)
    }
  }

  const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send(input)
    }
  }

  return (
    <>
      <button
        type="button"
        className="ai-fab"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
        title="Ask AI about your data"
      >
        <SparkIcon />
      </button>

      {open ? (
        <aside className="ai-panel" aria-label="AI assistant">
          <header className="ai-panel-header">
            <div className="ai-panel-heading">
              <SparkIcon />
              <div>
                <h2>Ask your data</h2>
                {status.state === 'ready' ? <p className="ai-panel-sub">{status.model}</p> : null}
              </div>
            </div>
            <button type="button" className="ai-btn ai-btn-ghost" onClick={() => setOpen(false)} aria-label="Close assistant">
              ✕
            </button>
          </header>

          <div className="ai-messages" ref={scrollRef}>
            {status.state === 'unavailable' ? (
              <div className="ai-notice">
                <strong>Assistant unavailable</strong>
                <p>{status.reason}</p>
              </div>
            ) : null}

            {messages.length === 0 ? (
              <div className="ai-empty">
                <p>
                  Ask anything about your sites, costs, materials or activities. I can also draw charts and put a
                  presentation together.
                </p>
                <div className="ai-suggestions">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="ai-suggestion"
                      onClick={() => send(suggestion)}
                      disabled={isSending || status.state === 'unavailable'}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`ai-message ai-message-${message.role}${message.isError ? ' ai-message-error' : ''}`}
              >
                {message.role === 'user' ? (
                  <p className="ai-md-paragraph">{message.content}</p>
                ) : (
                  <>
                    <Markdown text={message.content} />
                    {message.charts?.map((chart, index) => (
                      <ChartView key={index} spec={chart} />
                    ))}
                    {message.presentation ? (
                      <button
                        type="button"
                        className="ai-deck-card"
                        onClick={() =>
                          setDeck({ presentation: message.presentation!, charts: message.charts ?? [] })
                        }
                      >
                        <span className="ai-deck-card-title">{message.presentation.title}</span>
                        <span className="ai-deck-card-meta">
                          {message.presentation.slides.length} slides · view or download
                        </span>
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            ))}

            {isSending ? (
              <div className="ai-message ai-message-assistant">
                <span className="ai-typing">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            ) : null}
          </div>

          <div className="ai-composer">
            <textarea
              ref={inputRef}
              className="ai-input"
              rows={1}
              value={input}
              placeholder="Ask about costs, sites, activities…"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onInputKeyDown}
              disabled={isSending || status.state === 'unavailable'}
            />
            <button
              type="button"
              className="ai-btn ai-btn-primary ai-send"
              onClick={() => send(input)}
              disabled={isSending || !input.trim() || status.state === 'unavailable'}
              aria-label="Send question"
            >
              <SendIcon />
            </button>
          </div>
        </aside>
      ) : null}

      {deck ? (
        <DeckViewer
          presentation={deck.presentation}
          charts={deck.charts}
          apiBaseUrl={apiBaseUrl}
          onClose={() => setDeck(null)}
        />
      ) : null}
    </>
  )
}
