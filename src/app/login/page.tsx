import { Suspense } from 'react'
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex-1 w-full flex items-center justify-center p-8 text-muted-foreground">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
