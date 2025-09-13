'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { Download } from 'lucide-react'
import { UserButton, useUser } from '@clerk/nextjs'

interface Interaction {
  id: string
  mechanism: string
  source: { name: string, level: string }
  target: { name: string, level: string }
  interaction_type: string
  details: string
  confidence: string
  filename: string
  page_number: string
  reference_text: string
}

interface DiagramViewerProps {
  interactions: Interaction[]
}

export function DiagramViewer({ interactions }: DiagramViewerProps) {
  const { user } = useUser()
  const [userLimits, setUserLimits] = useState<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLabels, setShowLabels] = useState(false)

  // Get user limits
  useEffect(() => {
    const checkLimits = async () => {
      try {
        const response = await fetch('/api/subscription/status')
        if (response.ok) {
          const limits = await response.json()
          setUserLimits(limits)
        }
      } catch (error) {
        console.error('Failed to get limits:', error)
      }
    }
    
    checkLimits()
  }, [user?.id])

  // Apply user plan limits AND diagram complexity limits
  const limitedInteractions = useMemo(() => {
    let result = interactions
    
    // Apply user plan limits first
    if (userLimits?.plan === 'basic') {
      result = interactions.slice(0, 50)
    } else if (userLimits?.plan === 'expired') {
      result = interactions.slice(0, 10)
    }
    
    // Apply diagram complexity limit for all users
    if (result.length > 270) {
      result = result.slice(0, 270)
    }
    
    return result
  }, [interactions, userLimits])

  // Check if we need to show complexity warning
  const showComplexityWarning = interactions.length > 270 && (!userLimits?.plan || (userLimits.plan !== 'basic' && userLimits.plan !== 'expired'))

  // Generate Mermaid code from interactions
  const generateMermaidCode = (interactions: Interaction[], showLabels: boolean): string => {
    if (!interactions.length) return ''

    try {
      const lines = ['flowchart LR']
      const nodes = new Map<string, { name: string, level: string }>()
      const edges: string[] = []
      const linkStyles: string[] = []
      let edgeCount = 0

      // Color mapping for biological levels
      const levelColors = {
        'Molecular': '#d0f0c0',
        'Cellular': '#add8e6', 
        'Organ': '#f08080',
        'Clinical': '#fffacd',
        'Unknown': '#d3d3d3'
      }

      // Arrow colors for interaction types
      const interactionColors = {
        'upregulation': '#28a745',
        'activation': '#28a745',
        'positive': '#28a745',
        'inhibition': '#dc3545',
        'downregulation': '#dc3545', 
        'negative': '#dc3545',
        'binding': '#007bff',
        'transport': '#fd7e14',
        'regulatory': '#6f42c1',
        'default': '#6c757d'
      }

      interactions.forEach((interaction) => {
        // Extract names safely
        const sourceName = typeof interaction.source === 'object' ? interaction.source.name : String(interaction.source)
        const targetName = typeof interaction.target === 'object' ? interaction.target.name : String(interaction.target)
        const sourceLevel = typeof interaction.source === 'object' ? interaction.source.level : 'Unknown'
        const targetLevel = typeof interaction.target === 'object' ? interaction.target.level : 'Unknown'

        // Create clean node IDs
        const sourceId = `node_${sourceName.replace(/[^a-zA-Z0-9]/g, '_')}`
        const targetId = `node_${targetName.replace(/[^a-zA-Z0-9]/g, '_')}`

        // Store node info
        nodes.set(sourceId, { name: sourceName, level: sourceLevel })
        nodes.set(targetId, { name: targetName, level: targetLevel })

        // Determine arrow type and label based on interaction type
        const interactionType = interaction.interaction_type?.toLowerCase() || 'default'
        let arrow = '-->'
        let arrowColor = interactionColors.default

        if (interactionType.includes('inhib') || interactionType.includes('negative') || interactionType.includes('downregulation')) {
          arrow = showLabels ? '-.->|inhibits|' : '-.->|⊣|'
          arrowColor = interactionColors.inhibition
        } else if (interactionType.includes('activ') || interactionType.includes('positive') || interactionType.includes('upregulation')) {
          arrow = showLabels ? '-->' : '-->'
          arrowColor = interactionColors.activation
        } else if (interactionType.includes('bind')) {
          arrow = showLabels ? '-->|binds|' : '-->'
          arrowColor = interactionColors.binding
        } else if (interactionType.includes('transport')) {
          arrow = showLabels ? '-->|transports|' : '-->'
          arrowColor = interactionColors.transport
        } else if (interactionType.includes('regulatory')) {
          arrow = showLabels ? '==>|regulates|' : '==>'
          arrowColor = interactionColors.regulatory
        } else {
          // Find best match
          for (const [key, color] of Object.entries(interactionColors)) {
            if (key !== 'default' && interactionType.includes(key)) {
              arrowColor = color
              break
            }
          }
          arrow = '-->'
        }

        edges.push(`    ${sourceId} ${arrow} ${targetId}`)
        
        // Add link styling for this edge
        linkStyles.push(`    linkStyle ${edgeCount} stroke:${arrowColor},stroke-width:3px`)
        edgeCount++
      })

      // Add node definitions with rounded rectangles
      nodes.forEach(({ name, level }, nodeId) => {
        const cleanName = name.substring(0, 20) // Limit name length
        lines.push(`    ${nodeId}("${cleanName}")`)
      })

      // Add edges
      lines.push(...edges)

      // Add link styles for colored arrows
      lines.push(...linkStyles)

      // Add class definitions for biological levels
      Object.entries(levelColors).forEach(([level, color]) => {
        lines.push(`    classDef ${level} fill:${color},stroke:#333,stroke-width:2px,color:#000`)
      })

      // Apply classes to nodes based on their biological level
      nodes.forEach(({ level }, nodeId) => {
        if (level in levelColors) {
          lines.push(`    class ${nodeId} ${level}`)
        }
      })

      return lines.join('\n')
    } catch (err) {
      console.error('Error generating Mermaid code:', err)
      return 'flowchart LR\n    A("Error generating diagram")'
    }
  }

  // Render Mermaid diagram
  useEffect(() => {
    if (!limitedInteractions.length) return

    const renderDiagram = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Generate Mermaid code
        const code = generateMermaidCode(limitedInteractions, showLabels)
        
        if (!code || code.trim() === '') {
          throw new Error('No Mermaid code generated')
        }

        // Dynamic import of Mermaid
        const mermaid = (await import('mermaid')).default

        // Initialize Mermaid with forest theme
        mermaid.initialize({
          startOnLoad: false,
          theme: 'forest',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis'
          }
        })

        // Clear container
        if (containerRef.current) {
          containerRef.current.innerHTML = ''
        }

        // Render diagram
        const { svg } = await mermaid.render('diagram-' + Date.now(), code)

        if (containerRef.current && svg) {
          containerRef.current.innerHTML = svg
        } else {
          throw new Error('Failed to render SVG')
        }

        setIsLoading(false)
      } catch (err) {
        console.error('Mermaid rendering error:', err)
        setError(err instanceof Error ? err.message : 'Failed to render diagram')
        setIsLoading(false)
      }
    }

    renderDiagram()
  }, [limitedInteractions, showLabels])

  const downloadSVG = () => {
    const svg = containerRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'interaction_diagram.svg'
    link.click()
    URL.revokeObjectURL(url)
  }

  const downloadPNG = async () => {
    const svg = containerRef.current?.querySelector('svg')
    if (!svg) return

    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      const svgData = new XMLSerializer().serializeToString(svg)
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      img.onload = () => {
        canvas.width = img.width * 2
        canvas.height = img.height * 2
        ctx?.scale(2, 2)
        ctx?.drawImage(img, 0, 0)

        canvas.toBlob((blob) => {
          if (blob) {
            const pngUrl = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = pngUrl
            link.download = 'interaction_diagram.png'
            link.click()
            URL.revokeObjectURL(pngUrl)
          }
        })

        URL.revokeObjectURL(url)
      }

      img.src = url
    } catch (err) {
      console.error('PNG export error:', err)
      alert('Failed to export PNG. Try SVG export instead.')
    }
  }

  if (!limitedInteractions.length) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Interactions Selected</h3>
        <p className="text-gray-600">Select interactions from the table to generate a diagram</p>
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">🎨 Interaction Network Diagram</h2>
          <p className="text-gray-600 text-sm">
            Visualizing {limitedInteractions.length} biological interactions
            {/* {limitedInteractions.length !== interactions.length && (
              <span className="text-yellow-600"> (limited by plan)</span>
            )} */}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Show Labels Checkbox */}
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Show Labels
          </label>
          
          {/* Download Buttons */}
          <div className="flex gap-2">
            <button
              onClick={downloadSVG}
              disabled={isLoading || !!error}
              className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              <Download className="h-4 w-4 mr-1" />
              SVG
            </button>
            <button
              onClick={downloadPNG}
              disabled={isLoading || !!error}
              className="flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              <Download className="h-4 w-4 mr-1" />
              PNG
            </button>
          </div>
        </div>
      </div>

      {/* Complexity Warning Banner */}
      {showComplexityWarning && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Too many interactions for diagram ({interactions.length} selected).</span>
                {' '}Showing first 270 to prevent rendering issues.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Diagram Container */}
      <div className="border border-gray-200 rounded-lg p-4 min-h-[400px] bg-white">
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Generating diagram...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-64 text-center">
            <div>
              <div className="text-red-500 mb-2">⚠️</div>
              <p className="text-red-600 font-medium">Failed to generate diagram</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        <div 
          ref={containerRef}
          className={`w-full ${isLoading || error ? 'hidden' : ''}`}
        />
      </div>

      {/* User plan limit warnings */}
      {userLimits?.plan === 'basic' && interactions.length > 50 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            Showing 50 of {interactions.length} interactions. 
            <button 
              onClick={() => window.location.href = '/pricing'}
              className="ml-2 text-yellow-900 underline hover:no-underline"
            >
              Upgrade to see all
            </button>
          </p>
        </div>
      )}
      {userLimits?.plan === 'expired' && interactions.length > 10 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">
            Showing 10 of {interactions.length} interactions. Trial expired.
            <button 
              onClick={() => window.location.href = '/pricing'}
              className="ml-2 text-red-900 underline hover:no-underline"
            >
              Upgrade now
            </button>
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-3">Legend</h3>
        
        {/* Node Colors */}
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Node Colors (Biological Levels):</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#d0f0c0' }}></div>
              <span className="ml-2">Molecular</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#add8e6' }}></div>
              <span className="ml-2">Cellular</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f08080' }}></div>
              <span className="ml-2">Organ</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fffacd' }}></div>
              <span className="ml-2">Clinical</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#d3d3d3' }}></div>
              <span className="ml-2">Unknown</span>
            </div>
          </div>
        </div>

        {/* Arrow Colors */}
        <div>
          <h4 className="text-sm font-medium mb-2">Arrow Colors (Interaction Types):</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center">
              <div className="w-6 h-1" style={{ backgroundColor: '#28a745' }}></div>
              <span className="ml-2">Activation/Positive</span>
            </div>
            <div className="flex items-center">
              <div className="w-6 h-1" style={{ backgroundColor: '#dc3545' }}></div>
              <span className="ml-2">Inhibition/Negative</span>
            </div>
            <div className="flex items-center">
              <div className="w-6 h-1" style={{ backgroundColor: '#007bff' }}></div>
              <span className="ml-2">Binding</span>
            </div>
            <div className="flex items-center">
              <div className="w-6 h-1" style={{ backgroundColor: '#fd7e14' }}></div>
              <span className="ml-2">Transport</span>
            </div>
            <div className="flex items-center">
              <div className="w-6 h-1" style={{ backgroundColor: '#6f42c1' }}></div>
              <span className="ml-2">Regulatory</span>
            </div>
            <div className="flex items-center">
              <div className="w-6 h-1" style={{ backgroundColor: '#6c757d' }}></div>
              <span className="ml-2">Other</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}