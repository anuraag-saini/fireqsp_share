'use client'

import { useState, useMemo } from 'react'
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
  source: string
  target: string
  interaction_type: 'positive' | 'negative' | 'regulatory' | 'binding' | 'transport'
  details: string
  confidence: 'high' | 'medium' | 'low'
  filename: string
  selected?: boolean
}

interface InteractionTableProps {
  onSelectionChange?: (selectedInteractions: Interaction[]) => void
}

export function InteractionTable({ onSelectionChange }: InteractionTableProps) {
  const { 
    interactions, 
    toggleInteractionSelection, 
    selectAllInteractions, 
    clearAllSelections,
    setCurrentStep 
  } = useAppStore()
  
  const [globalFilter, setGlobalFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [confidenceFilter, setConfidenceFilter] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const columnHelper = createColumnHelper<Interaction>()

  const columns = [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => {
        const isIndeterminate = table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()
        return (
          <input
            type="checkbox"
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            checked={table.getIsAllRowsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = isIndeterminate
            }}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        )
      },
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      size: 50
    }),

    columnHelper.accessor('source', {
      header: 'Source',
      cell: info => (
        <span className="font-medium text-blue-600 text-sm">
          {info.getValue()}
        </span>
      ),
      size: 120
    }),

    columnHelper.accessor('target', {
      header: 'Target', 
      cell: info => (
        <span className="font-medium text-green-600 text-sm">
          {info.getValue()}
        </span>
      ),
      size: 120
    }),

    columnHelper.accessor('interaction_type', {
      header: 'Type',
      cell: info => {
        const type = info.getValue()
        const colorMap = {
          positive: 'bg-green-100 text-green-800 border-green-200',
          negative: 'bg-red-100 text-red-800 border-red-200',
          regulatory: 'bg-purple-100 text-purple-800 border-purple-200',
          binding: 'bg-blue-100 text-blue-800 border-blue-200',
          transport: 'bg-orange-100 text-orange-800 border-orange-200'
        }
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${colorMap[type] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
            {type}
          </span>
        )
      },
      size: 100
    }),

    columnHelper.accessor('confidence', {
      header: 'Confidence',
      cell: info => {
        const confidence = info.getValue()
        const colorMap = {
          high: 'text-green-600',
          medium: 'text-yellow-600',
          low: 'text-red-600'
        }
        return (
          <span className={`text-xs font-medium ${colorMap[confidence] || 'text-gray-600'}`}>
            {confidence.toUpperCase()}
          </span>
        )
      },
      size: 80
    }),

    columnHelper.accessor('mechanism', {
      header: 'Mechanism',
      cell: info => (
        <div className="max-w-xs">
          <p className="text-sm text-gray-900 truncate" title={info.getValue()}>
            {info.getValue()}
          </p>
        </div>
      ),
      size: 200
    }),

    columnHelper.accessor('details', {
      header: 'Details',
      cell: info => (
        <div className="max-w-xs">
          <p className="text-xs text-gray-600 truncate" title={info.getValue()}>
            {info.getValue()}
          </p>
        </div>
      ),
      size: 150
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

  // Apply filters
  const filteredData = useMemo(() => {
    return interactions.filter(item => {
      const matchesGlobal = !globalFilter || 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(globalFilter.toLowerCase())
        )
      
      const matchesType = !typeFilter || item.interaction_type === typeFilter
      const matchesConfidence = !confidenceFilter || item.confidence === confidenceFilter
      
      return matchesGlobal && matchesType && matchesConfidence
    })
  }, [interactions, globalFilter, typeFilter, confidenceFilter])

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
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter
  })

  // Get selected interactions
  const selectedInteractions = useMemo(() => {
    const selectedRows = table.getSelectedRowModel().rows
    return selectedRows.map(row => row.original)
  }, [table, rowSelection])

  // Handle bulk selection
  const handleSelectAll = () => {
    table.toggleAllRowsSelected(true)
  }

  const handleClearAll = () => {
    table.toggleAllRowsSelected(false)
  }

  // Generate diagram from selected interactions
  const handleCreateDiagram = () => {
    if (selectedInteractions.length === 0) {
      alert('Please select at least one interaction to create a diagram')
      return
    }
    
    onSelectionChange?.(selectedInteractions)
    setCurrentStep('diagram')
  }

  // Export selected interactions to CSV
  const handleExportCSV = () => {
    if (selectedInteractions.length === 0) {
      alert('Please select interactions to export')
      return
    }

    const headers = ['Source', 'Target', 'Type', 'Confidence', 'Mechanism', 'Details', 'Source File']
    const csvData = [
      headers.join(','),
      ...selectedInteractions.map(row => [
        `"${row.source}"`,
        `"${row.target}"`,
        `"${row.interaction_type}"`,
        `"${row.confidence}"`,
        `"${row.mechanism}"`,
        `"${row.details}"`,
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Interactions Available</h3>
        <p className="text-gray-600">Upload and extract PDFs to see interactions here</p>
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
            Choose interactions to include in your model ({Object.keys(rowSelection).length} of {filteredData.length} selected)
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleCreateDiagram}
            disabled={Object.keys(rowSelection).length === 0}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            <Eye className="h-4 w-4 mr-2" />
            Create Diagram ({Object.keys(rowSelection).length})
          </button>
          
          <button
            onClick={handleExportCSV}
            disabled={Object.keys(rowSelection).length === 0}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-3">
        {/* Search */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search interactions..."
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

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
              <option value="regulatory">Regulatory</option>
              <option value="binding">Binding</option>
              <option value="transport">Transport</option>
            </select>
            
            <select
              value={confidenceFilter}
              onChange={(e) => setConfidenceFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Confidence</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <button
              onClick={() => {
                setTypeFilter('')
                setConfidenceFilter('')
                setGlobalFilter('')
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Bulk Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Select All Visible ({filteredData.length})
          </button>
          <button
            onClick={handleClearAll}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Clear Selection
          </button>
        </div>
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
                className={`hover:bg-gray-50 ${row.getIsSelected() ? 'bg-blue-50' : ''}`}
              >
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className="px-4 py-3 whitespace-nowrap"
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
            {Object.keys(rowSelection).length > 0 && (
              <span className="text-blue-600 font-medium">
                {Object.keys(rowSelection).length} selected for diagram
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}