'use client'

import { useCallback, useState } from 'react'
import { Upload, FileSpreadsheet, X, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface FileUploadProps {
  title: string
  description: string
  accept: string
  onFileSelect: (file: File) => void
  isLoading?: boolean
  uploadedFileName?: string | null
  onClear?: () => void
}

export function FileUpload({
  title,
  description,
  accept,
  onFileSelect,
  isLoading = false,
  uploadedFileName = null,
  onClear,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
        onFileSelect(file)
      }
    },
    [onFileSelect]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        onFileSelect(file)
      }
    },
    [onFileSelect]
  )

  if (uploadedFileName) {
    return (
      <Card className="bg-emerald-950/30 border-emerald-800/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-emerald-300">{title}</p>
                <p className="text-sm text-emerald-400/70 truncate max-w-[200px]">
                  {uploadedFileName}
                </p>
              </div>
            </div>
            {onClear && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/50"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white">{title}</CardTitle>
        <CardDescription className="text-slate-400">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <label
          className={`
            relative flex flex-col items-center justify-center w-full h-32 
            border-2 border-dashed rounded-lg cursor-pointer
            transition-all duration-200
            ${
              isDragging
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/30'
            }
            ${isLoading ? 'opacity-50 pointer-events-none' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isLoading ? (
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <div className="w-12 h-12 mb-3 bg-slate-700/50 rounded-full flex items-center justify-center">
                  {isDragging ? (
                    <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <Upload className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <p className="mb-1 text-sm text-slate-300">
                  <span className="font-semibold">Drop file here</span> or click to browse
                </p>
                <p className="text-xs text-slate-500">CSV files only</p>
              </>
            )}
          </div>
          <input
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleFileInput}
            disabled={isLoading}
          />
        </label>
      </CardContent>
    </Card>
  )
}
