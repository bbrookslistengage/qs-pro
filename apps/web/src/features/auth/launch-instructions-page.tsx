import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Rocket } from '@solar-icons/react'

export function LaunchInstructionsPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[450px] border-primary/20 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Rocket size={24} weight="Bold" className="text-primary" />
          </div>
          <CardTitle className="text-2xl">Launch Query++</CardTitle>
          <CardDescription>
            Query++ must be accessed directly through Salesforce Marketing Cloud Engagement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>To access this application safely and securely:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              Log in to your <strong>Salesforce Marketing Cloud Engagement</strong> account.
            </li>
            <li>
              Go to the <strong>App Exchange</strong> menu (top right).
            </li>
            <li>
              Select <strong>Query++</strong> from the list of installed applications.
            </li>
          </ol>
          <div className="bg-muted p-3 rounded-md text-xs italic">
            Note: This application uses Marketing Cloud Single Sign-On (SSO) for security.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
