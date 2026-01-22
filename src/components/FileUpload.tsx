'use client'

import { useCallback, useState } from 'react'
import { Upload, FileSpreadsheet, X, CheckCircle2 } from 'lucide-react'
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
      <div className="p-3 bg-[#6de5a2]/10 border border-[#6de5a2]/30 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#6de5a2]/20 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-[#6de5a2]" />
            </div>
            <div>
              <p className="font-medium text-[#000000] text-sm">{title}</p>
              <p className="text-xs text-[#4db87a] truncate max-w-[180px]">
                {uploadedFileName}
              </p>
            </div>
          </div>
          {onClear && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-[#6b7a8c] hover:text-[#ef5252] hover:bg-[#ef5252]/10 h-7 w-7 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="font-medium text-[#000000] text-sm">{title}</p>
        <p className="text-xs text-[#6b7a8c]">{description}</p>
      </div>
      <label
        className={`
          relative flex flex-col items-center justify-center w-full py-6 
          border border-dashed rounded-lg cursor-pointer
          transition-all duration-200
          ${
            isDragging
              ? 'border-[#3281fd] bg-[#3281fd]/5'
              : 'border-[#c0ccdb] hover:border-[#3281fd] hover:bg-[#f4f7fa]'
          }
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center">
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-[#3281fd] border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <div className="w-10 h-10 mb-2 bg-[#f4f7fa] rounded-full flex items-center justify-center">
                {isDragging ? (
                  <FileSpreadsheet className="w-5 h-5 text-[#3281fd]" />
                ) : (
                  <Upload className="w-5 h-5 text-[#c0ccdb]" />
                )}
              </div>
              <p className="text-sm text-[#6b7a8c]">
                <span className="text-[#3281fd] font-medium">Browse</span> or drop file
              </p>
              <p className="text-xs text-[#c0ccdb] mt-1">CSV files only</p>
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
    </div>
  )
}
