import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)', // For webhook endpoints
  '/about',
  '/pricing',
  '/api/process-background(.*)',
])

const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)'
])

export default clerkMiddleware(async (auth, request) => {
  const { userId, sessionClaims, redirectToSignIn } = await auth()
  
  // Redirect unauthenticated users trying to access protected routes
  if (!isPublicRoute(request) && !userId) {
    return redirectToSignIn()
  }
  
  // Check admin access for admin routes
  if (isAdminRoute(request)) {
    // Add your admin check logic here
    // For example: check if user has admin role
    // if (!sessionClaims?.metadata?.role === 'admin') {
    //   return new Response('Forbidden', { status: 403 })
    // }
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
