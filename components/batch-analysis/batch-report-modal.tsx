/**
 * Modal to display batch analysis report results.
 * Shows highlights, all results, and failed coins.
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  FlameIcon,
  ZapIcon,
  ActivityIcon,
  XIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from 'lucide-react'
import type { BatchReport, BatchCoinResult } from './types'

interface BatchReportModalProps {
  isOpen: boolean
  onClose: () => void
  report: BatchReport | null
  onCoinClick: (coinId: string, coinName: string, coinSymbol: string, coinImage: string, currentPrice: number) => void
}

type TabId = 'highlights' | 'all' | 'failed'

// ─── Helpers ───

const tierColors: Record<string, string> = {
  tier1: 'text-green-500',
  tier2: 'text-yellow-500',
  tier3: 'text-red-500',
  tier4: 'text-purple-500',
}

const tierBgColors: Record<string, string> = {
  tier1: 'bg-green-500/10 border-green-500/30',
  tier2: 'bg-yellow-500/10 border-yellow-500/30',
  tier3: 'bg-red-500/10 border-red-500/30',
  tier4: 'bg-purple-500/10 border-purple-500/30',
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPrice(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
  if (value >= 1) return `$${value.toFixed(2)}`
  return `$${value.toFixed(6)}`
}

function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
  return `$${value.toFixed(0)}`
}

// ─── Coin Row Component ───

function CoinResultRow({
  result,
  onCoinClick,
}: {
  result: BatchCoinResult
  onCoinClick: BatchReportModalProps['onCoinClick']
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasRecentSignals = result.recentSignals.length > 0

  return (
    <div className={`rounded-lg border p-3 transition-colors hover:bg-muted/30 ${
      result.maxPumpScore >= 85 ? tierBgColors[result.maxPumpLevel] : 'border-border/50'
    }`}>
      <div className="flex items-center gap-3">
        {/* Coin info */}
        <button
          onClick={() => onCoinClick(result.coinId, result.coinName, result.coinSymbol, result.coinImage, result.currentPrice)}
          className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
        >
          {result.coinImage && (
            <img src={result.coinImage} alt={result.coinName} className="h-7 w-7 rounded-full flex-shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{result.coinName}</p>
            <p className="text-xs text-muted-foreground">{result.coinSymbol.toUpperCase()}</p>
          </div>
        </button>

        {/* Price & MCap */}
        <div className="hidden sm:block text-right flex-shrink-0">
          <p className="text-xs font-medium text-foreground">{formatPrice(result.currentPrice)}</p>
          <p className="text-[10px] text-muted-foreground">{formatMarketCap(result.marketCap)}</p>
        </div>

        {/* Pump Score */}
        <div className={`flex-shrink-0 text-center px-3 py-1 rounded-md border ${tierBgColors[result.maxPumpLevel]}`}>
          <p className={`text-lg font-bold ${tierColors[result.maxPumpLevel]}`}>
            {result.maxPumpScore}
          </p>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
            {result.maxPumpLevel.replace('tier', 'T')}
          </p>
        </div>

        {/* Signal counts */}
        <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
          {result.pumpSignalCounts.tier4 > 0 && (
            <span className="text-xs font-semibold text-purple-500">{result.pumpSignalCounts.tier4}×T4</span>
          )}
          {result.pumpSignalCounts.tier3 > 0 && (
            <span className="text-xs font-semibold text-red-500">{result.pumpSignalCounts.tier3}×T3</span>
          )}
          {result.pumpSignalCounts.tier2 > 0 && (
            <span className="text-xs font-semibold text-yellow-500">{result.pumpSignalCounts.tier2}×T2</span>
          )}
        </div>

        {/* Recent badge */}
        {hasRecentSignals && (
          <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-500 text-[10px] font-semibold">
            <ZapIcon className="h-3 w-3" />
            {result.recentSignals.length}
          </span>
        )}

        {/* Expand button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-shrink-0 p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
        </button>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
          {/* Stats */}
          {result.stats && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Price Δ</p>
                <p className={`text-xs font-semibold ${result.stats.priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {result.stats.priceChange >= 0 ? '+' : ''}{result.stats.priceChange.toFixed(1)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">High</p>
                <p className="text-xs font-semibold">{formatPrice(result.stats.highPrice)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Low</p>
                <p className="text-xs font-semibold">{formatPrice(result.stats.lowPrice)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Avg Vol/MC</p>
                <p className="text-xs font-semibold">{result.stats.avgVolMcRatio.toFixed(4)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Signals</p>
                <p className="text-xs font-semibold">{result.pumpSignalCounts.total} total</p>
              </div>
            </div>
          )}

          {/* Recent signals detail */}
          {result.recentSignals.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Recent Signals (≤15d)</p>
              <div className="flex flex-wrap gap-1.5">
                {result.recentSignals.slice(0, 5).map((sig, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border ${tierBgColors[sig.pumpLevel]}`}
                  >
                    <span className={`font-bold ${tierColors[sig.pumpLevel]}`}>{sig.pumpScore}pt</span>
                    <span className="text-muted-foreground">{sig.date}</span>
                    {sig.signals.whaleAcc && <span title="Whale Accumulation">🐋</span>}
                    {sig.signals.pSqueeze && <span title="Price Squeeze">📊</span>}
                    {sig.signals.vExhaust && <span title="Volume Exhaustion">📉</span>}
                  </span>
                ))}
                {result.recentSignals.length > 5 && (
                  <span className="text-[10px] text-muted-foreground">+{result.recentSignals.length - 5} more</span>
                )}
              </div>
            </div>
          )}

          {result.fromCache && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <ClockIcon className="h-3 w-3" /> From cache
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Report Modal ───

export function BatchReportModal({ isOpen, onClose, report, onCoinClick }: BatchReportModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('highlights')

  if (!report) return null

  const tabs: { id: TabId; label: string; count: number; icon: React.ReactNode }[] = [
    {
      id: 'highlights',
      label: 'Highlights',
      count:
        report.highlights.highScore.length +
        report.highlights.recentSignals.length +
        report.highlights.whaleActivity.length,
      icon: <FlameIcon className="h-4 w-4" />,
    },
    {
      id: 'all',
      label: 'All Results',
      count: report.results.filter((r) => !r.error).length,
      icon: <CheckCircleIcon className="h-4 w-4" />,
    },
    {
      id: 'failed',
      label: 'Failed',
      count: report.failedCoins,
      icon: <AlertTriangleIcon className="h-4 w-4" />,
    },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-[95vw] w-[95vw] sm:!max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg flex items-center gap-2">
                <ActivityIcon className="h-5 w-5 text-primary" />
                Batch Analysis Report
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(report.createdAt)} · {report.filterSnapshot} · {formatDuration(report.duration)}
              </p>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            <div className="rounded-lg bg-muted/30 p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Total</p>
              <p className="text-sm font-bold">{report.totalCoins}</p>
            </div>
            <div className="rounded-lg bg-green-500/10 p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Analyzed</p>
              <p className="text-sm font-bold text-green-500">{report.analyzedCoins}</p>
            </div>
            <div className="rounded-lg bg-blue-500/10 p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Cached</p>
              <p className="text-sm font-bold text-blue-500">{report.cachedCoins}</p>
            </div>
            <div className={`rounded-lg p-2 text-center ${report.failedCoins > 0 ? 'bg-red-500/10' : 'bg-muted/30'}`}>
              <p className="text-[10px] text-muted-foreground">Failed</p>
              <p className={`text-sm font-bold ${report.failedCoins > 0 ? 'text-red-500' : ''}`}>{report.failedCoins}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border/40 pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'text-primary border-primary bg-primary/5'
                  : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/30'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === tab.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto space-y-4 py-3">
          {activeTab === 'highlights' && (
            <HighlightsTab report={report} onCoinClick={onCoinClick} />
          )}
          {activeTab === 'all' && (
            <AllResultsTab results={report.results.filter((r) => !r.error)} onCoinClick={onCoinClick} />
          )}
          {activeTab === 'failed' && (
            <FailedTab results={report.results.filter((r) => !!r.error)} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Tab Components ───

function HighlightsTab({ report, onCoinClick }: { report: BatchReport; onCoinClick: BatchReportModalProps['onCoinClick'] }) {
  const { highScore, recentSignals, whaleActivity } = report.highlights

  const noHighlights = highScore.length === 0 && recentSignals.length === 0 && whaleActivity.length === 0

  if (noHighlights) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ActivityIcon className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-foreground">No notable signals found</p>
        <p className="text-xs text-muted-foreground mt-1">
          None of the analyzed coins show high-score or recent pump signals.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* High Score */}
      {highScore.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
            <FlameIcon className="h-4 w-4 text-red-500" />
            High Score (≥85 pts)
            <span className="text-xs text-muted-foreground font-normal">({highScore.length} coins)</span>
          </h3>
          <div className="space-y-2">
            {highScore.map((r) => (
              <CoinResultRow key={r.coinId} result={r} onCoinClick={onCoinClick} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Signals */}
      {recentSignals.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
            <ZapIcon className="h-4 w-4 text-blue-500" />
            Recent Signals (≤7 days)
            <span className="text-xs text-muted-foreground font-normal">({recentSignals.length} coins)</span>
          </h3>
          <div className="space-y-2">
            {recentSignals.map((r) => (
              <CoinResultRow key={r.coinId} result={r} onCoinClick={onCoinClick} />
            ))}
          </div>
        </section>
      )}

      {/* Whale Activity */}
      {whaleActivity.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
            🐋 Whale Activity
            <span className="text-xs text-muted-foreground font-normal">({whaleActivity.length} coins)</span>
          </h3>
          <div className="space-y-2">
            {whaleActivity.map((r) => (
              <CoinResultRow key={r.coinId} result={r} onCoinClick={onCoinClick} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function AllResultsTab({ results, onCoinClick }: { results: BatchCoinResult[]; onCoinClick: BatchReportModalProps['onCoinClick'] }) {
  const [sortBy, setSortBy] = useState<'score' | 'recent' | 'name'>('score')

  const sorted = [...results].sort((a, b) => {
    if (sortBy === 'score') return b.maxPumpScore - a.maxPumpScore
    if (sortBy === 'recent') return b.recentSignals.length - a.recentSignals.length
    return a.coinName.localeCompare(b.coinName)
  })

  return (
    <div className="space-y-3">
      {/* Sort controls */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Sort:</span>
        {(['score', 'recent', 'name'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              sortBy === s
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            {s === 'score' ? 'Score' : s === 'recent' ? 'Recent' : 'Name'}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {sorted.map((r) => (
          <CoinResultRow key={r.coinId} result={r} onCoinClick={onCoinClick} />
        ))}
      </div>
    </div>
  )
}

function FailedTab({ results }: { results: BatchCoinResult[] }) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircleIcon className="h-12 w-12 text-green-500/30 mb-3" />
        <p className="text-sm font-medium text-foreground">All coins analyzed successfully</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {results.map((r) => (
        <div
          key={r.coinId}
          className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3"
        >
          {r.coinImage && (
            <img src={r.coinImage} alt={r.coinName} className="h-6 w-6 rounded-full" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{r.coinName}</p>
            <p className="text-xs text-red-500">{r.error}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
