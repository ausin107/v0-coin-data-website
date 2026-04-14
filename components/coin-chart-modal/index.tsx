import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { CoinChartModalProps } from './types'
import { usePumpSignals } from './use-pump-signals'
import { ChartControls } from './chart-controls'
import { ChartStats } from './chart-stats'
import { PriceVolumeChart, MarketCapVolumeChart } from './charts'
import { formatPrice } from './utils'

export function CoinChartModal({
  isOpen,
  onClose,
  coinId,
  coinName,
  coinSymbol,
  coinImage,
  currentPrice,
}: CoinChartModalProps) {
  const {
    chartData,
    loading,
    error,
    chartType,
    setChartType,
    timeRange,
    setTimeRange,
    showWhaleSignals,
    setShowWhaleSignals,
    filteredData,
    processedData,
    pumpSignalCounts,
    stats,
    whaleSignalCount,
    fetchChartData
  } = usePumpSignals(coinId, isOpen)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-[95vw] w-[95vw] sm:!max-w-[95vw] lg:w-[1400px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {coinImage && (
              <img
                src={coinImage}
                alt={coinName}
                className="h-8 w-8 rounded-full"
              />
            )}
            <div>
              <DialogTitle className="text-xl">
                {coinName} ({coinSymbol.toUpperCase()})
              </DialogTitle>
              {currentPrice && (
                <p className="text-sm text-muted-foreground">
                  Current Price: {formatPrice(currentPrice)}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Controls */}
        <ChartControls 
          chartType={chartType}
          setChartType={setChartType}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          showWhaleSignals={showWhaleSignals}
          setShowWhaleSignals={setShowWhaleSignals}
          whaleSignalCount={whaleSignalCount}
          pumpSignalCounts={pumpSignalCounts}
        />

        {/* Stats Bar */}
        <ChartStats 
          stats={stats}
          timeRange={timeRange}
          whaleSignalCount={whaleSignalCount}
          pumpSignalCounts={pumpSignalCounts}
        />

        {/* Chart Content */}
        <div className="min-h-[400px]">
          {loading ? (
            <div className="flex h-[400px] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Spinner className="h-8 w-8 text-primary" />
                <p className="text-sm text-muted-foreground">Loading chart data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-[400px] items-center justify-center">
              <div className="text-center">
                <p className="text-destructive font-medium">Error loading chart</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchChartData} className="mt-3">
                  Try Again
                </Button>
              </div>
            </div>
          ) : chartType === 'price-volume' ? (
            <PriceVolumeChart data={processedData} showWhaleSignals={showWhaleSignals} />
          ) : (
            <MarketCapVolumeChart data={processedData} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
