import { Button } from '@/components/ui/button'
import { TrendingUpIcon, ActivityIcon, BarChart3Icon } from 'lucide-react'
import { ChartType } from './types'

interface ChartControlsProps {
  chartType: ChartType
  setChartType: (type: ChartType) => void
  timeRange: number
  setTimeRange: (days: number) => void
  showWhaleSignals: boolean
  setShowWhaleSignals: (show: boolean) => void
  whaleSignalCount: number
  pumpSignalCounts: { tier1: number; tier2: number; tier3: number; tier4: number }
}

export function ChartControls({
  chartType,
  setChartType,
  timeRange,
  setTimeRange,
  showWhaleSignals,
  setShowWhaleSignals,
  whaleSignalCount,
  pumpSignalCounts,
}: ChartControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
      {/* Chart Type Selector */}
      <div className="flex gap-1">
        <Button
          variant={chartType === 'price-volume' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setChartType('price-volume')}
          className="gap-1.5"
        >
          <TrendingUpIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Price & Volume</span>
          <span className="sm:hidden">Price</span>
        </Button>
        <Button
          variant={chartType === 'marketcap-volume' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setChartType('marketcap-volume')}
          className="gap-1.5"
        >
          <BarChart3Icon className="h-4 w-4" />
          <span className="hidden sm:inline">MC & Vol/MC</span>
          <span className="sm:hidden">MC</span>
        </Button>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-1">
        {[7, 30, 90, 180, 300].map((days) => (
          <Button
            key={days}
            variant={timeRange === days ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setTimeRange(days)}
            className="px-2 sm:px-3"
          >
            {days}D
          </Button>
        ))}
      </div>

      {/* Pump Signal Detection Toggle */}
      <Button
        variant={showWhaleSignals ? 'default' : 'outline'}
        size="sm"
        onClick={() => setShowWhaleSignals(!showWhaleSignals)}
        className="gap-1.5"
        title="Toggle Pump Signal Detection"
      >
        <ActivityIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Pump Signals</span>
        {whaleSignalCount > 0 && (
          <span className="inline-flex items-center gap-1">
            {pumpSignalCounts.tier4 > 0 && (
              <span className="inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-purple-500/20 text-purple-600 dark:text-purple-400">
                {pumpSignalCounts.tier4}
              </span>
            )}
            {pumpSignalCounts.tier3 > 0 && (
              <span className="inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-red-500/20 text-red-600 dark:text-red-400">
                {pumpSignalCounts.tier3}
              </span>
            )}
            {pumpSignalCounts.tier2 > 0 && (
              <span className="inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                {pumpSignalCounts.tier2}
              </span>
            )}
            {pumpSignalCounts.tier1 > 0 && (
              <span className="inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-green-500/20 text-green-600 dark:text-green-400">
                {pumpSignalCounts.tier1}
              </span>
            )}
          </span>
        )}
      </Button>
    </div>
  )
}
