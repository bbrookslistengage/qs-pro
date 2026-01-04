import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { LaunchInstructionsPage } from '@/features/auth/launch-instructions-page'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { VerificationPage } from '@/features/verification/VerificationPage'
import axios from 'axios'

function App() {
  const { isAuthenticated, user, tenant, setAuth, logout } = useAuthStore()
  const [showVerify, setShowVerify] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get('/api/auth/me')
        setAuth(response.data.user, response.data.tenant)
      } catch (error) {
        logout()
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [setAuth, logout])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <>
        <LaunchInstructionsPage />
        <Toaster />
      </>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user?.name || user?.email}</h1>
          <p className="text-muted-foreground mt-2">
            Authenticated with Tenant: <span className="font-mono">{tenant?.eid}</span> ({tenant?.tssd})
          </p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => setShowVerify(!showVerify)}>
            {showVerify ? 'Back to Home' : 'Verify Metadata'}
          </Button>
          <Button variant="destructive" onClick={logout}>Logout</Button>
        </div>
      </div>
      
      <div className="mt-8">
        {showVerify ? <VerificationPage /> : (
          <p>Main Workspace coming soon...</p>
        )}
      </div>
      <Toaster />
    </div>
  )
}

export default App