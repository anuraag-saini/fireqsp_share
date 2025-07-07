'use client'

import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { useAppStore } from '@/stores/appStore'
import { 
  Download, 
  Eye, 
  Code, 
  Settings, 
  Maximize2, 
  RotateCcw,
  Palette,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface DiagramViewerProps {
  interactions?: any[]
}

export function DiagramViewer({ interactions: propInteractions }: DiagramViewerProps) {
  const { 
    selectedInteractions, 
    diagramCode, 
    setDiagramCode, 
    setCurrentStep 
  } = useAppStore()
  
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCode, setShowCode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  
  // Diagram settings
  const [theme, setTheme] = useState<'default' | 'dark' | 'forest' | 'neutral'>('default')
  const [direction, setDirection] = useState<'LR' | 'TD' | 'RL' | 'BT'>('LR')
  const [showLabels, setShowLabels] = useState(true)
  const [nodeShape, setNodeShape] = useState<'rect' | 'circle' | 'rounded'>('rounded')

  // Use prop interactions or store interactions
  const interactions = propInteractions || selectedInteractions

  // Generate Mermaid code from interactions
  const generateMermaidCode = (interactions: any[]) => {
    if (!interactions.length) return ''
    
    const lines = [`flowchart ${direction}`]
    const nodes = new Set<string>()
    const edges: string[] = []
    const nodeStyles: string[] = []
    
    // Node shape mapping
    const shapeMap = {
      rect: (id: string, label: string) => `${id}["${label}"]`,
      circle: (id: string, label: string) => `${id}(("${label}"))`,
      rounded: (id: string, label: string) => `${id}("${label}")`
    }
    
    interactions.forEach((interaction, idx) => {
      const sourceId = `node_${interaction.source.replace(/[^a-zA-Z0-9]/g, '_')}`
      const targetId = `node_${interaction.target.replace(/[^a-zA-Z0-9]/g, '_')}`
      
      // Add nodes with chosen shape
      const shapeFunc = shapeMap[nodeShape]
      nodes.add(`    ${shapeFunc(sourceId, interaction.source)}`)
      nodes.add(`    ${shapeFunc(targetId, interaction.target)}`)
      
      // Determine arrow style and color based on interaction type
      let arrowType = '-->'
      let linkClass = 'default'
      
      switch (interaction.interaction_type) {
        case 'positive':
          arrowType = '-->'
          linkClass = 'positive'
          break
        case 'negative':
          arrowType = '-.->'; 
          linkClass = 'negative'
          break
        case 'regulatory':
          arrowType = '==>'
          linkClass = 'regulatory'
          break
        case 'binding':
          arrowType = '-->'
          linkClass = 'binding'
          break
        case 'transport':
          arrowType = '-->'
          linkClass = 'transport'
          break
        default:
          arrowType = '-->'
          linkClass = 'default'
      }
      
      // Create edge with optional label
      let edgeLine = `    ${sourceId} ${arrowType} ${targetId}`
      if (showLabels && interaction.interaction_type) {
        const label = interaction.interaction_type.charAt(0).toUpperCase()
        edgeLine = `    ${sourceId} ${arrowType}|"${label}"| ${targetId}`
      }
      
      edges.push(edgeLine)
      
      // Add link styling
      edges.push(`    linkStyle ${idx} stroke:${getLinkColor(interaction.interaction_type)},stroke-width:2px`)
    })
    
    // Combine all parts
    lines.push(...Array.from(nodes))
    lines.push(...edges)
    
    // Add node styling based on biological levels if available
    const levels = ['molecular', 'cellular', 'organ', 'clinical']
    levels.forEach(level => {
      lines.push(`    classDef ${level} fill:${getLevelColor(level)},stroke:#333,stroke-width:2px,color:#000`)
    })
    
    return lines.join('\n')
  }
  
  // Get colors for different interaction types
  const getLinkColor = (type: string) => {
    const colorMap: Record<string, string> = {
      positive: '#10b981',    // green
      negative: '#ef4444',    // red
      regulatory: '#8b5cf6',  // purple
      binding: '#3b82f6',     // blue
      transport: '#f59e0b',   // orange
      default: '#6b7280'      // gray
    }
    return colorMap[type] || colorMap.default
  }
  
  // Get colors for biological levels
  const getLevelColor = (level: string) => {
    const colorMap: Record<string, string> = {
      molecular: '#dcfce7',   // light green
      cellular: '#dbeafe',    // light blue
      organ: '#fecaca',       // light red
      clinical: '#fef3c7',    // light yellow
      default: '#f3f4f6'      // light gray
    }
    return colorMap[level] || colorMap.default
  }

  // Generate diagram when interactions or settings change
  useEffect(() => {
    if (interactions.length > 0) {
      const code = generateMermaidCode(interactions)
      setDiagramCode(code)
    }
  }, [interactions, direction, showLabels, nodeShape, setDiagramCode])

  // Render diagram when code changes
  useEffect(() => {
    if (!diagramCode || !containerRef.current) return

    const renderDiagram = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Initialize Mermaid with theme
        mermaid.initialize({
          startOnLoad: false,
          theme,
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis',
            padding: 20
          },
          themeVariables: {
            primaryColor: '#3b82f6',
            primaryTextColor: '#1f2937',
            primaryBorderColor: '#1e40af',
            lineColor: '#6b7280',
            sectionBkgColor: '#f9fafb',
            altSectionBkgColor: '#f3f4f6',
            gridColor: '#e5e7eb'
          }
        })

        // Clear container
        if (containerRef.current) {
          containerRef.current.innerHTML = ''
        }

        // Render diagram
        const { svg } = await mermaid.render('diagram-' + Date.now(), diagramCode)

        if (containerRef.current) {
          containerRef.current.innerHTML = svg
          
          // Add click handlers for nodes
          const nodes = containerRef.current.querySelectorAll('.node')
          nodes.forEach(node => {
            node.addEventListener('click', (e) => {
              const nodeId = (e.target as Element).closest('.node')?.id
              console.log('Node clicked:', nodeId)
              // Could add node detail popup here
            })
          })
        }

      } catch (err) {
        console.error('Mermaid rendering error:', err)
        setError(err instanceof Error ? err.message : 'Failed to render diagram')
      } finally {
        setIsLoading(false)
      }
    }

    renderDiagram()
  }, [diagramCode, theme])

  // Download SVG
  const downloadSVG = () => {
    const svg = containerRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `fireqsp_network_${new Date().toISOString().split('T')[0]}.svg`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Download PNG
  const downloadPNG = async () => {
    const svg = containerRef.current?.querySelector('svg')
    if (!svg) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    // Get SVG dimensions
    const svgRect = svg.getBoundingClientRect()
    canvas.width = svgRect.width * 2  // 2x for better quality
    canvas.height = svgRect.height * 2

    const svgData = new XMLSerializer().serializeToString(svg)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    img.onload = () => {
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      canvas.toBlob((blob) => {
        if (blob) {
          const pngUrl = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = pngUrl
          link.download = `fireqsp_network_${new Date().toISOString().split('T')[0]}.png`
          link.click()
          URL.revokeObjectURL(pngUrl)
        }
      })
      
      URL.revokeObjectURL(url)
    }

    img.src = url
  }

  // Regenerate diagram
  const regenerateDiagram = () => {
    if (interactions.length > 0) {
      const code = generateMermaidCode(interactions)
      setDiagramCode(code)
    }
  }

  if (interactions.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center">
        <div className="text-gray-400 mb-4">
          <Eye className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Interactions Selected</h3>
        <p className="text-gray-600">Select interactions from the table above to generate a network diagram</p>
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">🎨 Network Diagram</h2>
          <p className="text-gray-600 text-sm">
            Interactive visualization of {interactions.length} selected interactions
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            <Settings className="h-4 w-4 mr-1" />
            Settings
            {showSettings ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </button>
          
          <button
            onClick={() => setShowCode(!showCode)}
            className="flex items-center px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            <Code className="h-4 w-4 mr-1" />
            {showCode ? 'Hide' : 'Show'} Code
          </button>
          
          <button
            onClick={downloadSVG}
            className="flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            <Download className="h-4 w-4 mr-1" />
            SVG
          </button>
          
          <button
            onClick={downloadPNG}
            className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-1" />
            PNG
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="default">Default</option>
                <option value="dark">Dark</option>
                <option value="forest">Forest</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Direction</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="LR">Left to Right</option>
                <option value="TD">Top to Bottom</option>
                <option value="RL">Right to Left</option>
                <option value="BT">Bottom to Top</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Node Shape</label>
              <select
                value={nodeShape}
                onChange={(e) => setNodeShape(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="rounded">Rounded</option>
                <option value="rect">Rectangle</option>
                <option value="circle">Circle</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-gray-700">Show Edge Labels</span>
              </label>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <button
              onClick={regenerateDiagram}
              className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Apply Changes
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Generating network diagram...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-red-600 text-center p-8 bg-red-50 rounded-lg border border-red-200">
          <p className="font-medium">Error rendering diagram</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={regenerateDiagram}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Diagram Container */}
      <div 
        ref={containerRef}
        className={`flex justify-center ${isLoading || error ? 'hidden' : 'block'}`}
        style={{ 
          minHeight: '400px',
          background: theme === 'dark' ? '#1f2937' : '#ffffff'
        }}
      />

      {/* Code Display */}
      {showCode && diagramCode && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-gray-900">Mermaid Code</h4>
            <button
              onClick={() => {
                navigator.clipboard.writeText(diagramCode)
                // Could add toast notification here
              }}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Copy Code
            </button>
          </div>
          <pre className="p-4 bg-gray-100 rounded text-sm overflow-x-auto border">
            <code>{diagramCode}</code>
          </pre>
        </div>
      )}

      {/* Diagram Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-blue-600">
              {new Set(interactions.flatMap(i => [i.source, i.target])).size}
            </div>
            <div className="text-sm text-gray-600">Nodes</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-green-600">{interactions.length}</div>
            <div className="text-sm text-gray-600">Edges</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-purple-600">
              {new Set(interactions.map(i => i.interaction_type)).size}
            </div>
            <div className="text-sm text-gray-600">Edge Types</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-orange-600">
              {new Set(interactions.map(i => i.filename)).size}
            </div>
            <div className="text-sm text-gray-600">Source Files</div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {diagramCode && !isLoading && !error && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm font-medium">
            ✅ Network diagram generated successfully! 
            <span className="font-normal ml-2">
              You can customize appearance using the settings panel above.
            </span>
          </p>
        </div>
      )}
    </div>
  )
} 
