// lib/brand-config.ts
export const brandConfig = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe', 
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Main blue
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a'
    },
    secondary: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a'
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d'
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      500: '#f59e0b',
      600: '#d97706'
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      500: '#ef4444',
      600: '#dc2626'
    }
  },
  
  spacing: {
    header: '4rem', // 64px
    sidebar: '20rem', // 320px
    sidebarCollapsed: '4rem' // 64px
  },
  
  borderRadius: {
    small: '0.5rem',
    medium: '0.75rem',
    large: '1rem'
  },
  
  shadows: {
    small: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    medium: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    large: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
  }
} as const

// Utility function to get color values
export const getColor = (color: string, shade: number = 500) => {
  const [colorName, colorShade] = color.includes('-') 
    ? color.split('-') 
    : [color, shade.toString()]
  
  const colorGroup = brandConfig.colors[colorName as keyof typeof brandConfig.colors]
  
  if (!colorGroup) return color
  
  // Use type assertion with Record<string, string> for flexibility
  const colorRecord = colorGroup as Record<string, string>
  
  return colorRecord[colorShade] || color
}

// CSS custom properties for dynamic theming
export const cssVariables = {
  '--color-primary': brandConfig.colors.primary[500],
  '--color-primary-hover': brandConfig.colors.primary[600],
  '--color-primary-light': brandConfig.colors.primary[50],
  '--color-secondary': brandConfig.colors.secondary[500],
  '--color-background': '#ffffff',
  '--color-surface': '#f8fafc',
  '--color-border': brandConfig.colors.secondary[200],
  '--header-height': brandConfig.spacing.header,
  '--sidebar-width': brandConfig.spacing.sidebar,
  '--border-radius': brandConfig.borderRadius.medium,
  '--shadow-small': brandConfig.shadows.small,
  '--shadow-medium': brandConfig.shadows.medium,
  '--shadow-large': brandConfig.shadows.large
}