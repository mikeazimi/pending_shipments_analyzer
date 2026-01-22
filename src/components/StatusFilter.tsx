'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

interface StatusFilterProps {
  statuses: string[]
  selectedStatuses: string[]
  onChange: (selected: string[]) => void
}

export function StatusFilter({ statuses, selectedStatuses, onChange }: StatusFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleStatus = (status: string) => {
    if (selectedStatuses.includes(status)) {
      onChange(selectedStatuses.filter(s => s !== status))
    } else {
      onChange([...selectedStatuses, status])
    }
  }

  const selectAll = () => {
    onChange([...statuses])
  }

  const clearAll = () => {
    onChange([])
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700/50 hover:text-white"
      >
        <span className="truncate">
          {selectedStatuses.length === 0
            ? 'All Statuses'
            : `${selectedStatuses.length} selected`}
        </span>
        <ChevronDown
          className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
          <div className="p-2 border-b border-slate-700 flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAll}
              className="text-xs text-slate-400 hover:text-white"
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-xs text-slate-400 hover:text-white"
            >
              Clear All
            </Button>
          </div>
          <div className="max-h-60 overflow-y-auto p-2 space-y-1">
            {statuses.map(status => (
              <label
                key={status}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-700/50 cursor-pointer"
              >
                <Checkbox
                  checked={selectedStatuses.includes(status)}
                  onCheckedChange={() => toggleStatus(status)}
                  className="border-slate-500 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
                <span className="text-sm text-slate-200 truncate">{status}</span>
                {selectedStatuses.includes(status) && (
                  <Check className="w-4 h-4 text-emerald-400 ml-auto" />
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {selectedStatuses.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedStatuses.slice(0, 3).map(status => (
            <Badge
              key={status}
              variant="secondary"
              className="bg-emerald-900/50 text-emerald-300 border-emerald-800 text-xs"
            >
              {status.length > 15 ? status.slice(0, 15) + '...' : status}
              <button
                onClick={() => toggleStatus(status)}
                className="ml-1 hover:text-emerald-100"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {selectedStatuses.length > 3 && (
            <Badge
              variant="secondary"
              className="bg-slate-700 text-slate-300 text-xs"
            >
              +{selectedStatuses.length - 3} more
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
