// app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs'

/**
 * Sign In Page
 * Uses Clerk's pre-built SignIn component
 * 
 * The [[...sign-in]] folder structure is a catch-all route
 * that handles all sign-in related paths
 */
export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn 
        appearance={{
          elements: {
            // Optional: Customize the appearance
            rootBox: "mx-auto",
            card: "shadow-xl",
          }
        }}
      />
    </div>
  )
}
