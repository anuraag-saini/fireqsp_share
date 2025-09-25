// components/UserButton.tsx
'use client'

import { UserButton as ClerkUserButton, useUser } from '@clerk/nextjs'

/**
 * User Profile Button Component
 * Shows user avatar with dropdown menu
 * Includes sign out and profile management
 */
export function UserButton() {
  const { isSignedIn, isLoaded } = useUser()

  if (!isLoaded) {
    // Show loading skeleton
    return (
      <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
    )
  }

  if (!isSignedIn) {
    return null
  }

  return (
    <ClerkUserButton
      appearance={{
        elements: {
          avatarBox: "h-10 w-10"
        }
      }}
      afterSignOutUrl="/"
    />
  )
}

/**
 * Simple Sign In/Out Button
 */
export function AuthButton() {
  const { isSignedIn } = useUser()

  if (isSignedIn) {
    return <UserButton />
  }

  return (
    <a 
      href="/sign-in"
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      Sign In
    </a>
  )
}
