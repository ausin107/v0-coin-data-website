/**
 * Batch analysis progress indicator.
 * Shows animated progress bar, current coin, and ETA.
 */

import { Spinner } from '@/components/ui/spinner'
import type { BatchAnalysisState } from './types'

interface BatchProgressProps {
  state: BatchAnalysisState
}

export function BatchProgress({ state }: BatchProgressProps) {
  const { progress, currentCoin, isPaused, estimatedTimeLeft } = state
  const percentage = progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {progress.completed} / {progress.total} coins
          </span>
          <span className="font-mono font-medium text-foreground">{percentage}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-muted/50 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
            style={{
              width: `${percentage}%`,
              background: isPaused
                ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            }}
          >
            {/* Shimmer effect when running */}
            {!isPaused && (
              <div
                className="absolute inset-0 animate-shimmer"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                  backgroundSize: '200% 100%',
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-muted/30 p-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cached</p>
          <p className="text-sm font-semibold text-blue-500">{progress.cached}</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fetched</p>
          <p className="text-sm font-semibold text-green-500">
            {progress.completed - progress.cached - progress.failed}
          </p>
        </div>
        <div className="rounded-lg bg-muted/30 p-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Failed</p>
          <p className={`text-sm font-semibold ${progress.failed > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
            {progress.failed}
          </p>
        </div>
      </div>

      {/* Current coin being analyzed */}
      {currentCoin && (
        <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className="relative">
            {currentCoin.image && (
              <img
                src={currentCoin.image}
                alt={currentCoin.name}
                className="h-8 w-8 rounded-full"
              />
            )}
            {!isPaused && (
              <Spinner className="absolute -bottom-1 -right-1 h-4 w-4 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {isPaused ? '⏸ Paused' : '🔍 Analyzing'}: {currentCoin.name}
            </p>
            {estimatedTimeLeft > 0 && !isPaused && (
              <p className="text-xs text-muted-foreground">
                ~{formatTime(estimatedTimeLeft)} remaining
              </p>
            )}
          </div>
        </div>
      )}

      {/* Paused / rate limit warning */}
      {isPaused && state.error && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            ⚠ {state.error}
          </p>
        </div>
      )}
    </div>
  )
}
