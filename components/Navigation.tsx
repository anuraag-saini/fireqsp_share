// components/Navigation.tsx
'use client'

import { UserButton, useUser, SignInButton } from '@clerk/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { brandConfig } from '@/lib/brand-config'

export function Navigation() {
  const { isSignedIn, user } = useUser()
  const pathname = usePathname()
  
  // Hide navigation on dashboard pages
  const isDashboardPage = pathname?.startsWith('/dashboard')
  
  if (isDashboardPage) {
    return null
  }

  return (
    <nav className="bg-white border-b border-gray-200" style={{ borderColor: brandConfig.colors.secondary[200] }}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold" style={{ color: brandConfig.colors.primary[600] }}>
            🔥 FireQSP
          </Link>

          {/* Navigation Items */}
          <div className="flex items-center gap-6">
            {/* Main Navigation Links */}
            <div className="hidden md:flex gap-6">
              <Link 
                href="/about"
                className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                About
              </Link>
              <Link 
                href="/dashboard"
                className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                Dashboard
              </Link>
              <Link 
                href="/community"
                className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                Community
              </Link>
              <Link 
                href="/help"
                className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                Help
              </Link>
              <Link 
                href="/pricing"
                className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                Pricing
              </Link>
            </div>
            
            {/* Auth Section */}
            {isSignedIn ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 hidden sm:block">
                  {user?.firstName || user?.emailAddresses[0]?.emailAddress}
                </span>
                <UserButton afterSignOutUrl="/" />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <SignInButton mode="modal">
                  <button className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                    Sign In
                  </button>
                </SignInButton>
                <Link href="/sign-up">
                  <button 
                    className="px-4 py-2 text-white rounded hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: brandConfig.colors.primary[600] }}
                  >
                    Sign Up
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}