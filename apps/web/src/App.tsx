import { useAuthStore } from '@/store/auth-store'
import { LoginPage } from '@/features/auth/login-page'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { VerificationPage } from '@/features/verification/VerificationPage'
import { useState } from 'react'

function App() {
  const { isAuthenticated, user, tenant, logout } = useAuthStore()
  const [showVerify, setShowVerify] = useState(false)

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
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