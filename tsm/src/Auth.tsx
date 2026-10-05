import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { authApi, storeSession, warmUpServer } from './api'
import type { AuthUser } from './api'
import './Auth.css'
import { FIBER_COLORS } from './fiber'

type Mode = 'signin' | 'signup' | 'forgot' | 'forgot-sent' | 'reset'

function FiberStrands() {
  // A cable enters bottom-left and fans out into its twelve strands.
  const paths = useMemo(
    () =>
      FIBER_COLORS.map((color, i) => {
        const startX = 150 + (i - 5.5) * 3.4
        const endY = 250 + i * 36
        return { color, d: `M ${startX} 720 C ${startX} 560, 260 ${endY}, 620 ${endY}` }
      }),
    [],
  )
  return (
    <svg className="fiber-strands" viewBox="0 0 600 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {paths.map((p, i) => (
        <path key={p.color} d={p.d} stroke={p.color} style={{ animationDelay: `${i * 45}ms` }} />
      ))}
      <path className="fiber-jacket" d="M 150 730 L 150 690" />
    </svg>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  hint,
  autoFocus,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  hint?: ReactNode
  autoFocus?: boolean
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-password">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required
        />
        <button
          type="button"
          className="auth-reveal"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {hint ? <p className="auth-hint">{hint}</p> : null}
    </div>
  )
}

function readResetToken(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('reset_token')
}

function clearResetTokenFromUrl() {
  const url = new URL(window.location.href)
  url.searchParams.delete('reset_token')
  window.history.replaceState(null, '', url.pathname + url.search + url.hash)
}

export function AuthScreen({ onAuthenticated, notice }: { onAuthenticated: (user: AuthUser) => void; notice?: string | null }) {
  const [resetToken] = useState(readResetToken)
  const [mode, setMode] = useState<Mode>(resetToken ? 'reset' : 'signin')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [slowServer, setSlowServer] = useState(false)
  const [signupEnabled, setSignupEnabled] = useState(true)
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    warmUpServer()
    authApi
      .config()
      .then((config) => setSignupEnabled(config.signupEnabled))
      .catch(() => undefined)
  }, [])

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setPassword('')
  }

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    setSlowServer(false)
    // Free-tier servers sleep; say so instead of leaving a silent spinner.
    slowTimer.current = setTimeout(() => setSlowServer(true), 4000)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      if (slowTimer.current) clearTimeout(slowTimer.current)
      setSlowServer(false)
      setBusy(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    if (mode === 'signin') {
      run(async () => {
        const data = await authApi.login(email.trim(), password)
        onAuthenticated(storeSession(data))
      })
    } else if (mode === 'signup') {
      if (password.length < 8) {
        setError('Use at least 8 characters for your password.')
        return
      }
      run(async () => {
        const data = await authApi.signup({
          email: email.trim(),
          username: username.trim(),
          password,
          accessCode: accessCode.trim(),
        })
        onAuthenticated(storeSession(data))
      })
    } else if (mode === 'forgot') {
      run(async () => {
        await authApi.forgotPassword(email.trim())
        setMode('forgot-sent')
      })
    } else if (mode === 'reset' && resetToken) {
      if (password.length < 8) {
        setError('Use at least 8 characters for your password.')
        return
      }
      run(async () => {
        const data = await authApi.resetPassword(resetToken, password)
        clearResetTokenFromUrl()
        onAuthenticated(storeSession(data))
      })
    }
  }

  const headings: Record<Mode, { title: string; lede: string }> = {
    signin: { title: 'Sign in', lede: 'Welcome back. Pick up where your crews left off.' },
    signup: { title: 'Create your account', lede: 'You’ll need the access phrase your administrator gave you.' },
    forgot: { title: 'Reset your password', lede: 'Enter your account email and we’ll send you a link to choose a new password.' },
    'forgot-sent': { title: 'Check your email', lede: '' },
    reset: { title: 'Choose a new password', lede: 'Use at least 8 characters. You’ll be signed in right after.' },
  }
  const heading = headings[mode]
  const submitLabel: Partial<Record<Mode, [string, string]>> = {
    signin: ['Sign in', 'Signing in…'],
    signup: ['Create account', 'Creating account…'],
    forgot: ['Send reset link', 'Sending…'],
    reset: ['Save password and sign in', 'Saving…'],
  }

  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <FiberStrands />
        <div className="auth-brand-copy">
          <img src="/logo-192.png" alt="" className="auth-brand-mark" />
          <p className="auth-brand-name">Telecom Site Manager</p>
          <p className="auth-brand-line">Every tower, trench and cable run, from site survey to client handover.</p>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-panel">
          <div className="auth-mobile-brand">
            <img src="/logo-192.png" alt="" />
            <span>Telecom Site Manager</span>
          </div>

          <h1 className="auth-title">{heading.title}</h1>
          {heading.lede ? <p className="auth-lede">{heading.lede}</p> : null}

          {notice && mode === 'signin' && !error ? (
            <div className="auth-alert auth-alert-info" role="status">{notice}</div>
          ) : null}
          {error ? (
            <div className="auth-alert" role="alert">{error}</div>
          ) : null}

          {mode === 'forgot-sent' ? (
            <div className="auth-sent">
              <p>
                If <strong>{email.trim()}</strong> has an account, a reset link is on its way. It expires in 30 minutes.
              </p>
              <p className="auth-hint">Nothing after a few minutes? Check spam, or try again.</p>
              <button type="button" className="btn btn-primary btn-block" onClick={() => switchMode('signin')}>
                Back to sign in
              </button>
            </div>
          ) : mode === 'reset' && !resetToken ? null : (
            <form className="auth-form" onSubmit={handleSubmit} noValidate={false}>
              {mode !== 'reset' ? (
                <div className="auth-field">
                  <label htmlFor="auth-email">Work email</label>
                  <input
                    id="auth-email"
                    type="email"
                    className="input"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@company.com"
                    autoFocus
                    required
                  />
                </div>
              ) : null}

              {mode === 'signup' ? (
                <div className="auth-field">
                  <label htmlFor="auth-username">Username</label>
                  <input
                    id="auth-username"
                    className="input"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    pattern="[A-Za-z0-9_.\-]{3,32}"
                    title="3–32 letters, numbers, dots, dashes or underscores"
                    required
                  />
                  <p className="auth-hint">Shown to your team. Letters, numbers, dots and dashes.</p>
                </div>
              ) : null}

              {mode === 'signin' || mode === 'signup' || mode === 'reset' ? (
                <PasswordField
                  id="auth-password"
                  label={mode === 'reset' ? 'New password' : 'Password'}
                  value={password}
                  onChange={setPassword}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  autoFocus={mode === 'reset'}
                  hint={mode === 'signin' ? null : 'At least 8 characters.'}
                />
              ) : null}

              {mode === 'signin' ? (
                <button type="button" className="auth-link auth-forgot" onClick={() => switchMode('forgot')}>
                  Forgot password?
                </button>
              ) : null}

              {mode === 'signup' ? (
                <div className="auth-field">
                  <label htmlFor="auth-code">Access phrase</label>
                  <input
                    id="auth-code"
                    className="input"
                    value={accessCode}
                    onChange={(event) => setAccessCode(event.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    required
                  />
                  <p className="auth-hint">Only people with this phrase can join your workspace.</p>
                </div>
              ) : null}

              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
                {busy ? <span className="spinner" /> : null}
                <span>{busy ? submitLabel[mode]?.[1] : submitLabel[mode]?.[0]}</span>
              </button>

              {slowServer ? (
                <p className="auth-hint auth-slow" role="status">
                  Waking the server. The first request after a quiet spell can take up to a minute.
                </p>
              ) : null}
            </form>
          )}

          {mode === 'reset' && !resetToken ? (
            <p className="auth-lede">This reset link is missing its code. Request a new one.</p>
          ) : null}

          <div className="auth-switch">
            {mode === 'signin' ? (
              signupEnabled ? (
                <p>
                  New here?{' '}
                  <button type="button" className="auth-link" onClick={() => switchMode('signup')}>
                    Create an account
                  </button>
                </p>
              ) : (
                <p>Need an account? Ask your administrator.</p>
              )
            ) : mode !== 'forgot-sent' ? (
              <p>
                {mode === 'signup' ? 'Already have an account? ' : 'Remembered it? '}
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => {
                    if (mode === 'reset') clearResetTokenFromUrl()
                    switchMode('signin')
                  }}
                >
                  Sign in
                </button>
              </p>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  )
}
