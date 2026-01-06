import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { LaunchInstructionsPage } from '@/features/auth/launch-instructions-page'
import { EditorWorkspacePage } from '@/features/editor-workspace/EditorWorkspacePage'
import { AppShell } from '@/components/app-shell'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import axios from 'axios'

function App() {
  const { isAuthenticated, setAuth, logout } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isEmbedded = useMemo(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.self !== window.top
    } catch {
      return true
    }
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get('/api/auth/me')
        setAuth(response.data.user, response.data.tenant)
      } catch (err) {
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 401) {
            logout()
            return
          }
          setError(err.message || 'Failed to connect to backend')
          return
        }
        setError('Failed to connect to backend')
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [setAuth, logout])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Initializing Query++...</p>
        </div>
      </div>
    )
  }

  if (error && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-destructive/5">
        <div className="p-8 max-w-md text-center space-y-4 border border-destructive/20 rounded-lg bg-background shadow-xl">
          <h2 className="text-xl font-bold text-destructive">Connection Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-xs">Please ensure the backend is running and reachable.</p>
          <Button onClick={() => window.location.reload()}>Retry Connection</Button>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <>
        {isEmbedded ? (
          <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="text-sm text-muted-foreground">
              Authenticating with Marketing Cloud...
            </div>
          </div>
        ) : (
          <LaunchInstructionsPage />
        )}
        <Toaster />
      </>
    )
  }

  return (
    <AppShell>
      <EditorWorkspacePage />
      <Toaster />
    </AppShell>
  )
}

export default App
