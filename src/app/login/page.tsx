'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const verified = searchParams.get('verified')
  const { signInWithGoogle, signUpWithEmail, signInWithEmail, resetPasswordForEmail } = useAuthStore()
  const { toast } = useToast()

  useEffect(() => {
    if (verified === 'true') {
      setIsSignUp(false)
      // Remove query param to avoid re-triggering on refresh
      window.history.replaceState(null, '', '/login')
      
      toast({
        title: "Account verified",
        description: "Email verified successfully! You can now sign in.",
        variant: "success",
        duration: 7000,
      })
    }
  }, [verified, toast])

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first to reset your password.")
      return
    }
    setLoading(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const { error } = await resetPasswordForEmail(email, `${window.location.origin}/auth/callback?next=/create-pass`)
      if (error) throw error
      setSuccessMsg('Password reset link sent! Check your email.')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      if (isSignUp) {
        const { data, error } = await signUpWithEmail(email, password, `${window.location.origin}/auth/callback?next=${encodeURIComponent('/login?verified=true')}`)
        if (error) throw error
        
        if (data?.session) {
          // If session exists, email confirmation is disabled/verified immediately
          router.push('/home')
        } else {
          setSuccessMsg('Check your email for the confirmation link.')
        }
      } else {
        const { error } = await signInWithEmail(email, password)
        if (error) throw error
        router.push('/home')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle(`${window.location.origin}/auth/callback`)
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="flex-1 w-full flex items-center justify-center bg-background p-4 sm:p-8">
      <div className="relative w-full max-w-[1000px] min-h-[600px] bg-card rounded-2xl shadow-2xl overflow-hidden flex border border-border">
        
        {/* Form Container */}
        <div 
          className={`absolute top-0 w-full md:w-1/2 h-full bg-card flex flex-col justify-center px-8 sm:px-16 transition-transform duration-700 ease-in-out z-10 ${
            isSignUp ? 'translate-x-0' : 'md:translate-x-full'
          }`}
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-card-foreground">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </h2>
          </div>
          
          <form className="space-y-5" onSubmit={handleAuth}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email-address" className="text-sm font-medium text-muted-foreground">Email address</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-1 appearance-none rounded-lg block w-full px-4 py-3 border border-border placeholder-muted-foreground text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-shadow bg-muted/30 focus:bg-background"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="text-sm font-medium text-muted-foreground">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  required
                  className="mt-1 appearance-none rounded-lg block w-full px-4 py-3 border border-border placeholder-muted-foreground text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm transition-shadow bg-muted/30 focus:bg-background"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            
            {!isSignUp && (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm font-semibold text-primary hover:text-primary/80"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-md text-sm bg-destructive/10 text-destructive border border-destructive/20">
                {error}
              </div>
            )}
            
            {successMsg && (
              <div className="p-3 rounded-md text-sm bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                {successMsg}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 rounded-lg shadow-md text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-card text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                className="w-full flex justify-center py-3 px-4 border-2 border-border rounded-lg shadow-sm text-sm font-semibold text-card-foreground bg-background hover:bg-accent transition-colors"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>
            </div>
          </div>

          {/* Mobile toggle link (hidden on desktop) */}
          <div className="text-center mt-6 text-sm md:hidden">
            <button
              type="button"
              className="text-primary hover:text-primary/80 font-semibold"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccessMsg(null);
              }}
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>

        {/* Colored Banner Container (Hidden on mobile) */}
        <div 
          className={`hidden md:flex absolute top-0 left-0 w-1/2 h-full bg-primary text-primary-foreground flex-col justify-center items-center p-12 transition-all duration-700 ease-in-out z-20 ${
            isSignUp ? 'translate-x-full rounded-tl-3xl rounded-bl-3xl' : 'translate-x-0 rounded-tr-3xl rounded-br-3xl'
          }`}
        >
          <div className="text-center max-w-sm">
            <h2 className="text-4xl font-extrabold mb-6 tracking-tight">
              {isSignUp ? 'Already have an account?' : 'New here?'}
            </h2>
            <p className="text-lg mb-10 text-primary-foreground/80 leading-relaxed">
              {isSignUp 
                ? 'Sign in to access your saved resumes and track your job applications.' 
                : 'Create an account to start building tailored resumes and tracking jobs.'}
            </p>
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccessMsg(null);
              }}
              className="px-10 py-3 rounded-full border-2 border-primary-foreground text-primary-foreground font-bold hover:bg-primary-foreground hover:text-primary transition-all transform hover:scale-105 active:scale-95"
            >
              {isSignUp ? 'Switch to Sign In' : 'Create an Account'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
