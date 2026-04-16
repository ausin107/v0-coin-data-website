/**
 * Report history dropdown showing past batch analysis reports.
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  BarChart3Icon,
  Trash2Icon,
  ChevronRightIcon,
  ClockIcon,
  XIcon,
} from 'lucide-react'
import { getReports, deleteReport } from '@/lib/services/batch-analysis-report'
import type { BatchReport } from './types'

interface BatchReportHistoryProps {
  onOpenReport: (report: BatchReport) => void
}

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

export function BatchReportHistory({ onOpenReport }: BatchReportHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [reports, setReports] = useState<BatchReport[]>([])

  useEffect(() => {
    if (isOpen) {
      setReports(getReports())
    }
  }, [isOpen])

  const handleDelete = (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation()
    deleteReport(reportId)
    setReports((prev) => prev.filter((r) => r.id !== reportId))
  }

  const handleOpenReport = (report: BatchReport) => {
    setIsOpen(false)
    onOpenReport(report)
  }

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-center gap-1.5 p-2 rounded-md transition-colors ${
          isOpen
            ? 'text-primary bg-primary/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
        title="Analysis Reports"
      >
        <BarChart3Icon className="h-5 w-5" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-lg border border-border bg-popover shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/40 p-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3Icon className="h-4 w-4 text-primary" />
                Report History
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {reports.length === 0 ? (
                <div className="py-8 text-center">
                  <ClockIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No reports yet</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Run a batch analysis to generate reports
                  </p>
                </div>
              ) : (
                reports.map((report) => {
                  const hasHighlights =
                    report.highlights.highScore.length > 0 ||
                    report.highlights.recentSignals.length > 0

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
                            <span className="flex-shrink-0 inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {formatRelativeTime(report.createdAt)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">·</span>
                          <span className="text-[10px] text-muted-foreground">
                            {report.totalCoins} coins
                          </span>
                          <span className="text-[10px] text-muted-foreground">·</span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDuration(report.duration)}
                          </span>
                        </div>
                        {/* Quick highlights */}
                        <div className="flex items-center gap-1.5 mt-1">
                          {report.highlights.highScore.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 font-medium">
                              🔥 {report.highlights.highScore.length}
                            </span>
                          )}
                          {report.highlights.recentSignals.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-medium">
                              ⚡ {report.highlights.recentSignals.length}
                            </span>
                          )}
                          {report.highlights.whaleActivity.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 font-medium">
                              🐋 {report.highlights.whaleActivity.length}
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
