import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FileQuestion, Loader2, Settings } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router'
import { StateMessage } from '@/components/StateMessage'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { LoginPage } from '@/features/auth/LoginPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { DocumentsPage } from '@/features/documents/DocumentsPage'
import { UserFacingError } from '@/lib/errors'
import { supabaseConfigError } from '@/lib/supabase'

// The editor (Tiptap + ProseMirror) is the heaviest chunk; load it only when a document is opened.
const EditorPage = lazy(() => import('@/features/editor/EditorPage').then((m) => ({ default: m.EditorPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry transient (network) failures, but not database errors with a SQLSTATE/PostgREST code,
      // which won't change on retry. supabase-js reports network failures with an empty code.
      retry: (failureCount, error) =>
        failureCount < 2 && !(error instanceof UserFacingError) && !(error as { code?: string }).code,
    },
  },
})

export default function App() {
  if (supabaseConfigError) {
    return (
      <div className="grid min-h-svh place-items-center px-4">
        <StateMessage tone="error" icon={Settings} title="App not configured" description={supabaseConfigError} />
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider delayDuration={400}>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route index element={<DocumentsPage />} />
                <Route
                  path="d/:id"
                  element={
                    <Suspense fallback={<PageSpinner />}>
                      <EditorPage />
                    </Suspense>
                  }
                />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

function PageSpinner() {
  return (
    <div className="grid min-h-svh place-items-center" aria-busy="true">
      <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  )
}

function NotFound() {
  return (
    <div className="grid min-h-svh place-items-center px-4">
      <StateMessage
        icon={FileQuestion}
        title="Page not found"
        action={
          <Button asChild>
            <Link to="/">Go to documents</Link>
          </Button>
        }
      />
    </div>
  )
}
