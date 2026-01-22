'use client'

import { Button } from '@/components/ui/button'
import { Download, Printer } from 'lucide-react'
import { downloadCSV, generateFullReport, getTimestampString } from '@/lib/export/csv-export'
import type { AnalysisOutput } from '@/lib/parsers/types'

interface ExportButtonsProps {
  analysisOutput: AnalysisOutput
}

export function ExportButtons({ analysisOutput }: ExportButtonsProps) {
  const handleExportCSV = () => {
    const csv = generateFullReport(analysisOutput)
    const filename = `sku-analysis-${getTimestampString()}.csv`
    downloadCSV(csv, filename)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportCSV}
        className="border-slate-600 text-slate-300 hover:bg-slate-700"
      >
        <Download className="w-4 h-4 mr-2" />
        Export CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="border-slate-600 text-slate-300 hover:bg-slate-700"
      >
        <Printer className="w-4 h-4 mr-2" />
        Print
      </Button>
    </div>
  )
}
