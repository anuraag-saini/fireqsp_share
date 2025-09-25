// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Define public routes (accessible without authentication)
const isPublicRoute = createRouteMatcher([
  '/',                      // Home page
  '/sign-in(.*)',          // Sign in pages
  '/sign-up(.*)',          // Sign up pages
  '/api/webhooks(.*)',     // Webhook endpoints
  '/about',                // About page
  '/pricing',              // Pricing page
  // Add more public routes as needed
])

// Define admin-only routes
const isAdminRoute = createRouteMatcher([
  '/admin(.*)',            // Admin dashboard
  '/api/admin(.*)'         // Admin API routes
])

export default clerkMiddleware(async (auth, request) => {
  const { userId, sessionClaims, redirectToSignIn } = await auth()
  
  // Redirect unauthenticated users trying to access protected routes
  if (!isPublicRoute(request) && !userId) {
    return redirectToSignIn()
  }
  
  // Check admin access for admin routes
  if (isAdminRoute(request)) {
    // Check if user has admin role in public metadata
    // To set: Clerk Dashboard → Users → [User] → Public metadata → Add { "role": "admin" }
    const isAdmin = sessionClaims?.metadata?.role === 'admin'
    
    if (!isAdmin) {
      return new Response('Forbidden - Admin access required', { status: 403 })
    }
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
