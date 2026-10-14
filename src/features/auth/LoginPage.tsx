import { FileText, Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, type Location } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { errorMessage } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { useAuth } from './auth-context'

type Mode = 'sign-in' | 'sign-up'

export function LoginPage() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: Location } | null)?.from?.pathname ?? '/'
  if (!loading && user) return <Navigate to={from} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setSubmitting(true)
    const credentials = { email: email.trim(), password }
    try {
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword(credentials)
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp(credentials)
        if (error) throw error
        // Only happens if email confirmation is enabled on the Supabase project.
        if (!data.session) setNotice('Check your inbox to confirm your email, then sign in.')
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Ajaia Docs</h1>
            <p className="text-sm text-muted-foreground">Write, import and share documents with your team.</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-xs">
          <Tabs value={mode} onValueChange={(v) => { setMode(v as Mode); setError(null); setNotice(null) }}>
            <TabsList className="mb-5 w-full">
              <TabsTrigger value="sign-in">Sign in</TabsTrigger>
              <TabsTrigger value="sign-up">Create account</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby={mode === 'sign-up' ? 'password-hint' : undefined}
              />
              {mode === 'sign-up' && (
                <p id="password-hint" className="text-xs text-muted-foreground">At least 6 characters.</p>
              )}
            </div>

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" aria-hidden />}
              {mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
