// components/layout/Header.tsx - No Auth Version
'use client'

import Link from 'next/link'
import { useState } from 'react'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navigation = [
    { name: 'Features', href: '/#features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'About', href: '/about' },
    { name: 'Docs', href: '/docs' },
  ]

  return (
    <header style={{
      backgroundColor: 'white',
      borderBottom: '1px solid #E5E7EB',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <nav style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1rem' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          height: '4rem' 
        }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <div style={{
              width: '2rem',
              height: '2rem',
              background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.25rem' }}>S</span>
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827' }}>SaaS Starter</span>
          </Link>

          {/* Desktop Navigation */}
          <div style={{ 
            display: 'none', 
            gap: '2rem',
            '@media (min-width: 768px)': { display: 'flex' }
          }} className="desktop-nav">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                style={{
                  color: '#4B5563',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div style={{ 
            display: 'none', 
            gap: '1rem',
            alignItems: 'center'
          }} className="desktop-nav">
            <Link
              href="/sign-in"
              style={{
                color: '#4B5563',
                fontWeight: 500,
                textDecoration: 'none'
              }}
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3B82F6',
                color: 'white',
                borderRadius: '0.5rem',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'background-color 0.2s'
              }}
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              padding: '0.5rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer'
            }}
            className="mobile-menu-btn"
          >
            <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div style={{ paddingBottom: '1rem', borderTop: '1px solid #E5E7EB' }}>
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                style={{
                  display: 'block',
                  paddingTop: '0.5rem',
                  paddingBottom: '0.5rem',
                  color: '#4B5563',
                  fontWeight: 500,
                  textDecoration: 'none'
                }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E5E7EB' }}>
              <Link
                href="/sign-in"
                style={{
                  display: 'block',
                  paddingTop: '0.5rem',
                  paddingBottom: '0.5rem',
                  color: '#4B5563',
                  fontWeight: 500,
                  textDecoration: 'none'
                }}
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                style={{
                  display: 'block',
                  marginTop: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3B82F6',
                  color: 'white',
                  borderRadius: '0.5rem',
                  fontWeight: 500,
                  textAlign: 'center',
                  textDecoration: 'none'
                }}
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>
      <style jsx>{`
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-menu-btn {
            display: none !important;
          }
        }
      `}</style>
    </header>
  )
}
