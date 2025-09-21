'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  RowSelectionState
} from '@tanstack/react-table'
import { useAppStore } from '@/stores/appStore'
import { Search, Filter, Download, Eye, ChevronDown, ChevronUp } from 'lucide-react'

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
  selected?: boolean
}

interface InteractionTableProps {
  onSelectionChange?: (selectedInteractions: Interaction[]) => void
}

export function InteractionTable({ onSelectionChange }: InteractionTableProps) {
  const { 
    interactions, 
    selectedInteractions,
    toggleInteractionSelection,
    selectAllInteractions,
    clearAllSelections,
    setCurrentStep 
  } = useAppStore()
  
  const [globalFilter, setGlobalFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Apply filters
  const filteredData = useMemo(() => {
    return interactions.filter(item => {
      const matchesGlobal = !globalFilter || 
        Object.values(item).some(value => {
          if (typeof value === 'object' && value !== null) {
            return Object.values(value).some(nestedValue => 
              String(nestedValue).toLowerCase().includes(globalFilter.toLowerCase())
            )
          }
          return String(value).toLowerCase().includes(globalFilter.toLowerCase())
        })
      
      const matchesType = !typeFilter || item.interaction_type === typeFilter
      
      return matchesGlobal && matchesType
    })
  }, [interactions, globalFilter, typeFilter])

  // Create row selection state based on filtered data and store selections
  const rowSelection = useMemo(() => {
    const selection: RowSelectionState = {}
    filteredData.forEach((item, index) => {
      if (selectedInteractions.some(selected => selected.id === item.id)) {
        selection[index] = true
      }
    })
    return selection
  }, [filteredData, selectedInteractions])

  const columnHelper = createColumnHelper<Interaction>()

  const columns = [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          checked={table.getIsAllRowsSelected()}
          ref={(el) => {
            if (el) el.indeterminate = table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()
          }}
          onChange={(e) => {
            if (e.target.checked) {
              // Select all visible rows
              filteredData.forEach(item => {
                if (!selectedInteractions.some(selected => selected.id === item.id)) {
                  toggleInteractionSelection(item.id)
                }
              })
            } else {
              // Deselect all visible rows
              filteredData.forEach(item => {
                if (selectedInteractions.some(selected => selected.id === item.id)) {
                  toggleInteractionSelection(item.id)
                }
              })
            }
          }}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          checked={selectedInteractions.some(selected => selected.id === row.original.id)}
          onChange={() => toggleInteractionSelection(row.original.id)}
        />
      ),
      size: 30
    }),

    // Updated header names for user-friendly display
    columnHelper.accessor('source', {
      header: 'Source Biological Entity',
      cell: info => {
        const source = info.getValue()
        return (
          <div>
            <span className="font-medium text-blue-600 text-sm block">
              {source.name}
            </span>
            {/* Hide level from user view - commenting out 
            <span className="text-xs text-gray-500">
              {source.level}
            </span>
            */}
          </div>
        )
      },
      size: 120
    }),

    columnHelper.accessor('target', {
      header: 'Target Biological Entity', 
      cell: info => {
        const target = info.getValue()
        return (
          <div>
            <span className="font-medium text-green-600 text-sm block">
              {target.name}
            </span>
            {/* Hide level from user view - commenting out 
            <span className="text-xs text-gray-500">
              {target.level}
            </span>
            */}
          </div>
        )
      },
      size: 120
    }),

    columnHelper.accessor('interaction_type', {
      header: 'Interaction Type',
      cell: info => {
        const type = info.getValue()
        const colorMap = {
          upregulation: 'bg-green-100 text-green-800 border-green-200',
          activation: 'bg-green-100 text-green-800 border-green-200',
          inhibition: 'bg-red-100 text-red-800 border-red-200',
          downregulation: 'bg-purple-100 text-purple-800 border-purple-200',
          binding: 'bg-blue-100 text-blue-800 border-blue-200',
          transport: 'bg-orange-100 text-orange-800 border-orange-200'
        }
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${colorMap[type as keyof typeof colorMap] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
            {type}
          </span>
        )
      },
      size: 110
    }),

    columnHelper.accessor('mechanism', {
      header: 'Mechanism Description',
      cell: info => (
        <div className="max-w-xs">
          <p className="text-sm text-gray-900 line-clamp-2" title={info.getValue()}>
            {info.getValue()}
          </p>
        </div>
      ),
      size: 200
    }),

    // NEW: Page Number column
    columnHelper.accessor('page_number', {
      header: 'Page #',
      cell: info => {
        const pageNum = info.getValue()
        return pageNum && pageNum !== '' ? (
          <span className="text-xs text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded">
            {pageNum}
          </span>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )
      },
      size: 60
    }),

    // NEW: Reference Text column (truncated with tooltip)
    columnHelper.accessor('reference_text', {
      header: 'Reference Text',
      cell: info => {
        const refText = info.getValue()
        if (!refText || refText.trim() === '') {
          return <span className="text-xs text-gray-400">No reference text</span>
        }
        
        const truncated = refText.length > 100 ? refText.substring(0, 100) + '...' : refText
        return (
          <div className="max-w-sm">
            <p className="text-xs text-gray-700 leading-tight" title={refText}>
              {truncated}
            </p>
          </div>
        )
      },
      size: 180
    }),

    columnHelper.accessor('filename', {
      header: 'Source File',
      cell: info => (
        <span className="text-xs text-gray-500 font-mono">
          {info.getValue()}
        </span>
      ),
      size: 120
    })
  ]

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    state: {
      rowSelection,
      globalFilter
    },
    onRowSelectionChange: () => {}, // Disable table's internal selection handling
    onGlobalFilterChange: setGlobalFilter
  })

  const handleCreateDiagram = () => {
    if (selectedInteractions.length === 0) {
      alert('Please select at least one interaction to create a diagram')
      return
    }
    
    setCurrentStep('diagram')
    onSelectionChange?.(selectedInteractions)
  }

  const handleExportCSV = () => {
    if (selectedInteractions.length === 0) {
      alert('Please select interactions to export')
      return
    }

    const headers = [
      'Source Biological Entity',
      'Target Biological Entity', 
      'Interaction Type',
      'Mechanism Description',
      'Page Number',
      'Reference Text',
      'Source File'
    ]
    
    const csvData = [
      headers.join(','),
      ...selectedInteractions.map(row => [
        `"${row.source.name}"`,
        `"${row.target.name}"`,
        `"${row.interaction_type}"`,
        `"${row.mechanism}"`,
        `"${row.page_number || 'N/A'}"`,
        `"${(row.reference_text || 'No reference text').replace(/"/g, '""')}"`, // Escape quotes
        `"${row.filename}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvData], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `fireqsp_interactions_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (interactions.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-8 text-center">
        <div className="text-gray-400 mb-4">
          <Filter className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Interactions Found</h3>
        <p className="text-gray-600">The document was processed successfully, but no biological interactions were detected. Try uploading a different research paper.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">📊 Select Interactions</h2>
          <p className="text-gray-600 text-sm">
            Choose interactions to include in your model ({selectedInteractions.length} of {filteredData.length} selected)
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleCreateDiagram}
            disabled={selectedInteractions.length === 0}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            <Eye className="h-4 w-4 mr-2" />
            Create Diagram ({selectedInteractions.length})
          </button>
          
          <button
            onClick={handleExportCSV}
            disabled={selectedInteractions.length === 0}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-3">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search biological entities, mechanisms, or reference text..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {showAdvancedFilters ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </button>
        </div>

        {showAdvancedFilters && (
          <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Interaction Types</option>
              <option value="upregulation">Upregulation</option>
              <option value="activation">Activation</option>
              <option value="inhibition">Inhibition</option>
              <option value="downregulation">Downregulation</option>
              <option value="binding">Binding</option>
              <option value="transport">Transport</option>
            </select>

            <button
              onClick={() => {
                setTypeFilter('')
                setGlobalFilter('')
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    style={{ width: header.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: ' 🔼',
                        desc: ' 🔽',
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map(row => (
              <tr 
                key={row.id} 
                className={`hover:bg-gray-50 ${selectedInteractions.some(selected => selected.id === row.original.id) ? 'bg-blue-50' : ''}`}
              >
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className="px-4 py-3 text-sm"
                    style={{ width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Stats */}
      {filteredData.length > 0 && (
        <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
          <div>
            Showing {table.getRowModel().rows.length} of {interactions.length} interactions
            {globalFilter && ` (filtered by "${globalFilter}")`}
          </div>
          <div>
            {selectedInteractions.length > 0 && (
              <span className="text-blue-600 font-medium">
                {selectedInteractions.length} selected for diagram
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
