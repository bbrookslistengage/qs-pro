import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export function LoginPage() {
  const [tssd, setTssd] = useState('')

  const handleLogin = () => {
    if (!tssd) return
    // Redirect to backend auth initiator
    window.location.href = `/api/auth/login?tssd=${tssd}`
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Query++ Login</CardTitle>
          <CardDescription>Enter your SFMC Tenant-Specific Subdomain (TSSD) to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Input
                id="tssd"
                placeholder="e.g. mc-v2-xxxx"
                value={tssd}
                onChange={(e) => setTssd(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setTssd('')}>Clear</Button>
          <Button onClick={handleLogin}>Login with SFMC</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
