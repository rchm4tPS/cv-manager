import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase-server'

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isProtectedPage = request.nextUrl.pathname.startsWith('/home') || 
                          request.nextUrl.pathname.startsWith('/editor') || 
                          request.nextUrl.pathname.startsWith('/jobs')

  if (isAuthPage && user) {
    // If user is already logged in, redirect them away from the login page
    return NextResponse.redirect(new URL('/home', request.url))
  }

  if (isProtectedPage && !user) {
    // If user is not logged in and trying to access a protected page
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
