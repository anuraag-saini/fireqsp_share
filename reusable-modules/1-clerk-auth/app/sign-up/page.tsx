// app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs'

/**
 * Sign Up Page
 * Uses Clerk's pre-built SignUp component
 * 
 * The [[...sign-up]] folder structure is a catch-all route
 * that handles all sign-up related paths
 */
export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp 
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
