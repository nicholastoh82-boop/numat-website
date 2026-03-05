import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Mail } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-serif">Check Your Email</CardTitle>
            <CardDescription>
              We sent a confirmation link to your email
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center gap-2 p-4 bg-muted rounded-lg">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click the link in your email to verify your account
              </p>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {"Didn't receive the email? Check your spam folder or try signing up again."}
            </p>
          </CardContent>
          
          <CardFooter className="flex flex-col gap-4">
            <Button asChild className="w-full">
              <Link href="/auth/login">
                Go to Login
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/">
                Return Home
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </main>
      
      <Footer />
    </div>
  )
}
