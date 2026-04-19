'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  FileCodeIcon,
  Trash2Icon,
  ChevronRightIcon,
  ClockIcon,
  XIcon,
} from 'lucide-react'
import { getScanReports, deleteScanReport } from '@/lib/services/batch-scan-report'
import type { BatchScanReport, BatchScanReportHistoryProps } from './types'

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  return `${mins}m`
}

export function BatchScanReportHistory({ onOpenReport }: BatchScanReportHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [reports, setReports] = useState<BatchScanReport[]>([])

  useEffect(() => {
    if (isOpen) {
      setReports(getScanReports())
    }
  }, [isOpen])

  const handleDelete = (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation()
    deleteScanReport(reportId)
    setReports((prev) => prev.filter((r) => r.id !== reportId))
  }

  const handleOpenReport = (report: BatchScanReport) => {
    setIsOpen(false)
    onOpenReport(report)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-center gap-1.5 p-2 rounded-md transition-colors ${
          isOpen
            ? 'text-secondary-foreground bg-secondary/20'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
        title="Token Scan Reports"
      >
        <FileCodeIcon className="h-5 w-5" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-lg border border-border bg-popover shadow-lg">
            <div className="flex items-center justify-between border-b border-border/40 p-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileCodeIcon className="h-4 w-4 text-primary" />
                Scan History
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {reports.length === 0 ? (
                <div className="py-8 text-center">
                  <ClockIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No reports yet</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Scan tokens to generate reports (Stored for 24h)
                  </p>
                </div>
              ) : (
                reports.map((report) => {
                  const hasHighlights = report.highlights.highConcentration.length > 0

                  return (
                    <div
                      key={report.id}
                      onClick={() => handleOpenReport(report)}
                      className="flex items-center gap-3 p-3 border-b border-border/20 cursor-pointer hover:bg-muted/30 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-foreground truncate">
                            {report.filterSnapshot}
                          </p>
                          {hasHighlights && (
                            <span className="flex-shrink-0 inline-block w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {formatRelativeTime(report.createdAt)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">·</span>
                          <span className="text-[10px] text-muted-foreground">
                            {report.scannedCoins}/{report.totalCoins} coins
                          </span>
                          <span className="text-[10px] text-muted-foreground">·</span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDuration(report.duration)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {report.highlights.highConcentration.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500 font-medium">
                              ⚠️ {report.highlights.highConcentration.length} High Conc.
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => handleDelete(e, report.id)}
                          className="p-1 rounded text-muted-foreground/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete report"
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </button>
                        <ChevronRightIcon className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
