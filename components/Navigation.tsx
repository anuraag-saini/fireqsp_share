'use client'

import { UserButton, useUser, SignInButton } from '@clerk/nextjs'
import Link from 'next/link'

export function Navigation() {
  const { isSignedIn, user } = useUser()

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-blue-600">
            🔥 FireQSP
          </Link>

          {/* Navigation Items */}
          <div className="flex items-center gap-4">
            <Link href="/pricing">
              <button className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded">
                Pricing
              </button>
            </Link>
            
            {isSignedIn ? (
              <>
                <Link href="/dashboard">
                  <button className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded">
                    Dashboard
                  </button>
                </Link>
                <span className="text-sm text-gray-600">
                  {user?.firstName || user?.emailAddresses[0]?.emailAddress}
                </span>
                <UserButton afterSignOutUrl="/" />
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <button className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded">
                    Sign In
                  </button>
                </SignInButton>
                <Link href="/sign-up">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Sign Up
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}