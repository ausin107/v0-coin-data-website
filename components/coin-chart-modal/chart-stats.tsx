import { ActivityIcon } from 'lucide-react'
import { formatPrice, formatVolume } from './utils'

interface ChartStatsProps {
  stats: {
    priceChange: number
    highPrice: number
    lowPrice: number
    avgVolume: number
    avgVolMcRatio: number
  } | null
  timeRange: number
  whaleSignalCount: number
  pumpSignalCounts: {
    tier1: number
    tier2: number
    tier3: number
    tier4: number
    recentTotal: number
  }
}

export function ChartStats({
  stats,
  timeRange,
  whaleSignalCount,
  pumpSignalCounts,
}: ChartStatsProps) {
  if (!stats) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
      <div className="bg-muted/30 rounded-lg p-3">
        <p className="text-xs text-muted-foreground">Change ({timeRange}D)</p>
        <p className={`text-sm font-semibold ${stats.priceChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {stats.priceChange >= 0 ? '+' : ''}{stats.priceChange.toFixed(2)}%
        </p>
      </div>
      <div className="bg-muted/30 rounded-lg p-3">
        <p className="text-xs text-muted-foreground">High</p>
        <p className="text-sm font-semibold text-foreground">{formatPrice(stats.highPrice)}</p>
      </div>
      <div className="bg-muted/30 rounded-lg p-3">
        <p className="text-xs text-muted-foreground">Low</p>
        <p className="text-sm font-semibold text-foreground">{formatPrice(stats.lowPrice)}</p>
      </div>
      <div className="bg-muted/30 rounded-lg p-3">
        <p className="text-xs text-muted-foreground">Avg Volume</p>
        <p className="text-sm font-semibold text-foreground">{formatVolume(stats.avgVolume)}</p>
      </div>
      <div className="bg-muted/30 rounded-lg p-3">
        <p className="text-xs text-muted-foreground">Avg Vol/MC</p>
        <p className="text-sm font-semibold text-foreground">{stats.avgVolMcRatio.toFixed(4)}</p>
      </div>
      {/* Pump Signals stat */}
      <div className={`rounded-lg p-3 ${whaleSignalCount > 0 ? 'bg-gradient-to-r from-green-500/10 via-yellow-500/10 to-red-500/10 border border-orange-500/30' : 'bg-muted/30'}`}>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <ActivityIcon className="h-3 w-3" />
          Pump Signals
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {pumpSignalCounts.tier4 > 0 && (
            <span className="text-sm font-semibold text-purple-500">{pumpSignalCounts.tier4} T4</span>
          )}
          {pumpSignalCounts.tier3 > 0 && (
            <span className="text-sm font-semibold text-red-500">{pumpSignalCounts.tier3} T3</span>
          )}
          {pumpSignalCounts.tier2 > 0 && (
            <span className="text-sm font-semibold text-yellow-500">{pumpSignalCounts.tier2} T2</span>
          )}
          {whaleSignalCount === 0 && (
            <span className="text-sm font-semibold text-foreground">None</span>
          )}
        </div>
      </div>
      {/* Recent Signal stat (last 15 days) */}
      <div className={`rounded-lg p-3 ${pumpSignalCounts.recentTotal > 0 ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-muted/30'}`}>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <ActivityIcon className="h-3 w-3" />
          Recent (15d)
        </p>
        <p className={`text-sm font-semibold ${pumpSignalCounts.recentTotal > 0 ? 'text-blue-500' : 'text-foreground'}`}>
          {pumpSignalCounts.recentTotal > 0 ? `${pumpSignalCounts.recentTotal} signal${pumpSignalCounts.recentTotal > 1 ? 's' : ''}` : 'None'}
        </p>
      </div>
    </div>
  )
}
