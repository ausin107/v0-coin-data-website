/**
 * Main Batch Analysis Modal.
 * Confirmation → Progress → Completion flow.
 */

'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  ZapIcon,
  PlayIcon,
  PauseIcon,
  XIcon,
  CheckCircleIcon,
  ClockIcon,
  ActivityIcon,
} from 'lucide-react'
import type { CoinData } from '@/lib/services/coin-service'
import type { BatchReport } from './types'
import { useBatchAnalysis } from './use-batch-analysis'
import { BatchProgress } from './batch-progress'
import { getCacheStats } from '@/lib/services/batch-analysis-cache'

interface BatchAnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  coins: CoinData[]
  onOpenReport: (report: BatchReport) => void
  filterDescription: string
}

export function BatchAnalysisModal({
  isOpen,
  onClose,
  coins,
  onOpenReport,
  filterDescription,
}: BatchAnalysisModalProps) {
  const {
    state,
    latestReport,
    startAnalysis,
    pauseAnalysis,
    resumeAnalysis,
    cancelAnalysis,
    resetState,
  } = useBatchAnalysis()

  const { isRunning, isPaused, progress } = state
  const isComplete = !isRunning && progress.completed > 0 && progress.completed === progress.total
  const isIdle = !isRunning && progress.completed === 0

  const cacheStats = getCacheStats()

  // Estimate analysis time
  const RATE_LIMIT_INTERVAL = 2.4 // seconds
  const estimatedSeconds = Math.round(coins.length * RATE_LIMIT_INTERVAL)
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60)

  const handleStart = () => {
    startAnalysis(coins, filterDescription)
  }

  const handleClose = () => {
    if (isRunning) {
      // Don't close while running, user must cancel first
      return
    }
    resetState()
    onClose()
  }

  const handleViewReport = () => {
    if (latestReport) {
      resetState()
      onClose()
      onOpenReport(latestReport)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:!max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <ZapIcon className="h-5 w-5 text-primary" />
            Batch Analysis
          </DialogTitle>
        </DialogHeader>

        {/* ─── Idle State: Confirmation ─── */}
        {isIdle && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Coins to analyze</span>
                <span className="text-sm font-bold text-foreground">{coins.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Already cached</span>
                <span className="text-sm font-medium text-blue-500">{cacheStats.validEntries} coins</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estimated time</span>
                <span className="text-sm font-medium text-foreground flex items-center gap-1">
                  <ClockIcon className="h-3.5 w-3.5" />
                  ~{estimatedMinutes > 1 ? `${estimatedMinutes} min` : '< 1 min'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rate limit</span>
                <span className="text-xs text-muted-foreground">25 req/min (safe margin)</span>
              </div>
            </div>

            {/* Filter description */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <p className="text-xs text-muted-foreground">Filter applied:</p>
              <p className="text-sm text-foreground mt-0.5">{filterDescription}</p>
            </div>

            {/* Info note */}
            <p className="text-xs text-muted-foreground">
              ℹ️ Cached results (≤24h old) will be reused. Analysis may take several minutes for large lists.
              You can pause or cancel at any time.
            </p>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleStart}
                className="flex-1 gap-2"
                disabled={coins.length === 0}
              >
                <PlayIcon className="h-4 w-4" />
                Start Analysis
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ─── Running State: Progress ─── */}
        {isRunning && (
          <div className="space-y-4">
            <BatchProgress state={state} />

            {/* Controls */}
            <div className="flex gap-2">
              {isPaused ? (
                <Button onClick={resumeAnalysis} className="flex-1 gap-2" variant="outline">
                  <PlayIcon className="h-4 w-4" />
                  Resume
                </Button>
              ) : (
                <Button onClick={pauseAnalysis} className="flex-1 gap-2" variant="outline">
                  <PauseIcon className="h-4 w-4" />
                  Pause
                </Button>
              )}
              <Button onClick={cancelAnalysis} variant="destructive" className="gap-2">
                <XIcon className="h-4 w-4" />
                Cancel
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
              ⚠ Closing this dialog will NOT cancel the analysis
            </p>
          </div>
        )}

        {/* ─── Complete State ─── */}
        {isComplete && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-4">
              <CheckCircleIcon className="h-12 w-12 text-green-500 mb-3" />
              <h3 className="text-lg font-semibold text-foreground">Analysis Complete!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {progress.completed} coins analyzed in {latestReport ? formatDuration(latestReport.duration) : ''}
              </p>
            </div>

            {/* Quick highlights preview */}
            {latestReport && (
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">🔥 High Score</p>
                  <p className="text-lg font-bold text-red-500">{latestReport.highlights.highScore.length}</p>
                </div>
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">⚡ Recent</p>
                  <p className="text-lg font-bold text-blue-500">{latestReport.highlights.recentSignals.length}</p>
                </div>
                <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">🐋 Whale</p>
                  <p className="text-lg font-bold text-purple-500">{latestReport.highlights.whaleActivity.length}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={handleViewReport} className="flex-1 gap-2">
                <ActivityIcon className="h-4 w-4" />
                View Report
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        )}

        {/* ─── Cancelled State ─── */}
        {!isRunning && !isIdle && !isComplete && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-4">
              <XIcon className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <h3 className="text-lg font-semibold text-foreground">Analysis Cancelled</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {progress.completed} of {progress.total} coins analyzed
              </p>
            </div>

            {latestReport && (
              <div className="flex gap-2">
                <Button onClick={handleViewReport} variant="outline" className="flex-1 gap-2">
                  <ActivityIcon className="h-4 w-4" />
                  View Partial Report
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </div>
            )}
            {!latestReport && (
              <Button variant="outline" onClick={handleClose} className="w-full">
                Close
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}
