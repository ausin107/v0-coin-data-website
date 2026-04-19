'use client'

import { Progress } from '@/components/ui/progress'
import { AlertCircleIcon, FileCodeIcon, CheckCircle2 } from 'lucide-react'
import type { BatchScanState } from './types'

interface BatchScanProgressProps {
  state: BatchScanState
}

export function BatchScanProgress({ state }: BatchScanProgressProps) {
  const { progress, currentCoin, estimatedTimeLeft, isPaused } = state
  const percentage = Math.round((progress.completed / Math.max(1, progress.total)) * 100)

  // Status message
  let statusMsg = 'Initializing...'
  if (isPaused) {
    statusMsg = 'Paused'
  } else if (currentCoin) {
    statusMsg = `Scanning ${currentCoin.name} (${currentCoin.id})`
  } else if (progress.completed > 0) {
    statusMsg = 'Processing...'
  }

  return (
    <div className="space-y-4 rounded-lg border border-border/50 bg-muted/10 p-4">
      {/* Header Stats */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{statusMsg}</span>
        <span className="font-mono text-muted-foreground">{percentage}%</span>
      </div>

      {/* Progress Bar */}
      <Progress value={percentage} className="h-2" />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="space-y-1">
          <p className="text-[10px] uppercase text-muted-foreground">Scanned</p>
          <p className="font-mono font-medium text-foreground">
            {progress.completed} <span className="text-muted-foreground text-xs">/ {progress.total}</span>
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-blue-500" /> Cached
          </p>
          <p className="font-mono font-medium text-blue-500">{progress.cached}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
            <AlertCircleIcon className="h-3 w-3 text-red-500" /> Failed
          </p>
          <p className="font-mono font-medium text-red-500">{progress.failed}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase text-muted-foreground">Est. time</p>
          <p className="font-mono font-medium text-foreground">
            {estimatedTimeLeft > 0 ? formatDuration(estimatedTimeLeft) : '--:--'}
          </p>
        </div>
      </div>

      {/* Current Coin Info */}
      {currentCoin && (
        <div className="mt-4 flex items-center gap-3 rounded-md bg-background px-3 py-2 border border-border/50">
          <div className="relative h-6 w-6 overflow-hidden rounded-full shrink-0 bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={currentCoin.image} 
              alt={currentCoin.name} 
              className="h-full w-full object-cover"
              onError={(e) => {
                ;(e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PC9zdmc+'
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-medium text-foreground">
              {currentCoin.name} <span className="text-muted-foreground text-[10px]">fetching ownership info...</span>
            </p>
          </div>
          <FileCodeIcon className="h-4 w-4 text-muted-foreground/50 shrink-0 animate-pulse" />
        </div>
      )}
    </div>
  )
}

function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
