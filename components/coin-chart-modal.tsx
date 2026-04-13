'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Area,
  AreaChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Brush,
  ReferenceLine,
  Scatter,
  ZAxis,
} from 'recharts'
import { TrendingUpIcon, TrendingDownIcon, ActivityIcon, BarChart3Icon, FishIcon } from 'lucide-react'

interface MarketChartDataPoint {
  date: string
  timestamp: number
  price: number
  marketCap: number
  volume: number
  volMcRatio: number
}

interface ProcessedDataPoint extends MarketChartDataPoint {
  sma20Volume: number | null
  priceChangePct: number | null
  isAnomaly: boolean
  volumeRatio: number | null // Volume / SMA_20_Volume
}

interface CoinChartModalProps {
  isOpen: boolean
  onClose: () => void
  coinId: string
  coinName: string
  coinSymbol: string
  coinImage?: string
  currentPrice?: number
}

type ChartType = 'price-volume' | 'marketcap-volume'

// Define colors directly instead of CSS variables
const CHART_COLORS = {
  price: '#3b82f6', // blue-500
  volume: '#8b5cf6', // violet-500
  marketCap: '#10b981', // emerald-500
  volMcRatio: '#f59e0b', // amber-500
  whaleSignal: '#ef4444', // red-500 - whale footprint signal
}

// Whale detection algorithm parameters
const WHALE_DETECTION_CONFIG = {
  SMA_PERIOD: 20, // 20-day Simple Moving Average
  VOLUME_SPIKE_THRESHOLD: 2.5, // Volume > 4x SMA_20_Volume
  PRICE_CHANGE_THRESHOLD: 7, // |Price Change| < 5%
}

export function CoinChartModal({
  isOpen,
  onClose,
  coinId,
  coinName,
  coinSymbol,
  coinImage,
  currentPrice,
}: CoinChartModalProps) {
  const [chartData, setChartData] = useState<MarketChartDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<ChartType>('price-volume')
  const [timeRange, setTimeRange] = useState<number>(180) // days
  const [showWhaleSignals, setShowWhaleSignals] = useState(true) // Toggle whale detection

  useEffect(() => {
    if (isOpen && coinId) {
      fetchChartData()
    }
  }, [isOpen, coinId])

  const fetchChartData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/coins/${coinId}/market-chart`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch chart data')
      }

      setChartData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart data')
    } finally {
      setLoading(false)
    }
  }

  // Filter data based on time range
  const filteredData = useMemo(() => {
    if (!chartData.length) return []
    const cutoffDate = Date.now() - timeRange * 24 * 60 * 60 * 1000
    return chartData.filter((d) => d.timestamp >= cutoffDate)
  }, [chartData, timeRange])

  // Process data with whale detection algorithm
  const processedData = useMemo((): ProcessedDataPoint[] => {
    if (!filteredData.length) return []

    const { SMA_PERIOD, VOLUME_SPIKE_THRESHOLD, PRICE_CHANGE_THRESHOLD } = WHALE_DETECTION_CONFIG

    return filteredData.map((point, index, arr) => {
      // Calculate SMA_20_Volume (need at least SMA_PERIOD data points)
      let sma20Volume: number | null = null
      if (index >= SMA_PERIOD - 1) {
        const volumeSum = arr
          .slice(index - SMA_PERIOD + 1, index + 1)
          .reduce((sum, p) => sum + p.volume, 0)
        sma20Volume = volumeSum / SMA_PERIOD
      }

      // Calculate Price Change Percentage (compared to previous day)
      let priceChangePct: number | null = null
      if (index > 0) {
        const prevPrice = arr[index - 1].price
        priceChangePct = ((point.price - prevPrice) / prevPrice) * 100
      }

      // Calculate volume ratio
      const volumeRatio = sma20Volume ? point.volume / sma20Volume : null

      // Detect anomaly (whale footprint)
      // Condition 1: Volume > 4x SMA_20_Volume
      // Condition 2: |Price Change| < 5% (price stays relatively flat)
      const isAnomaly =
        sma20Volume !== null &&
        priceChangePct !== null &&
        point.volume > VOLUME_SPIKE_THRESHOLD * sma20Volume &&
        Math.abs(priceChangePct) < PRICE_CHANGE_THRESHOLD

      return {
        ...point,
        sma20Volume,
        priceChangePct,
        volumeRatio,
        isAnomaly,
      }
    })
  }, [filteredData])

  // Extract anomaly points for scatter plot
  const whaleSignalData = useMemo(() => {
    return processedData
      .filter((d) => d.isAnomaly)
      .map((d) => ({
        date: d.date,
        price: d.price,
        volume: d.volume,
        volumeRatio: d.volumeRatio,
        priceChangePct: d.priceChangePct,
      }))
  }, [processedData])

  // Count whale signals
  const whaleSignalCount = whaleSignalData.length

  // Calculate stats
  const stats = useMemo(() => {
    if (!filteredData.length) return null

    const prices = filteredData.map((d) => d.price)
    const firstPrice = prices[0]
    const lastPrice = prices[prices.length - 1]
    const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100
    const highPrice = Math.max(...prices)
    const lowPrice = Math.min(...prices)
    const avgVolume =
      filteredData.reduce((sum, d) => sum + d.volume, 0) / filteredData.length
    const avgVolMcRatio =
      filteredData.reduce((sum, d) => sum + d.volMcRatio, 0) / filteredData.length

    return {
      priceChange,
      highPrice,
      lowPrice,
      avgVolume,
      avgVolMcRatio,
    }
  }, [filteredData])

  // Format helpers
  const formatPrice = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    if (value >= 1) return `$${value.toFixed(2)}`
    return `$${value.toFixed(6)}`
  }

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`
    return `$${value.toFixed(0)}`
  }

  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
    return `$${value.toFixed(0)}`
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const priceVolumeConfig: ChartConfig = {
    price: {
      label: 'Price',
      color: CHART_COLORS.price,
    },
    volume: {
      label: 'Volume',
      color: CHART_COLORS.volume,
    },
  }

  const marketCapConfig: ChartConfig = {
    marketCap: {
      label: 'Market Cap',
      color: CHART_COLORS.marketCap,
    },
    volume: {
      label: 'Volume',
      color: CHART_COLORS.volume,
    },
    volMcRatio: {
      label: 'Vol/MC Ratio',
      color: CHART_COLORS.volMcRatio,
    },
  }

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

          {/* Whale Detection Toggle */}
          <Button
            variant={showWhaleSignals ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowWhaleSignals(!showWhaleSignals)}
            className="gap-1.5"
            title="Toggle Whale Footprint Detection"
          >
            <FishIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Whale Signals</span>
            {whaleSignalCount > 0 && (
              <span className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${showWhaleSignals
                ? 'bg-white/20 text-white'
                : 'bg-red-500/20 text-red-600 dark:text-red-400'
                }`}>
                {whaleSignalCount}
              </span>
            )}
          </Button>
        </div>

        {/* Stats Bar */}
        {stats && !loading && (
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Change ({timeRange}D)</p>
              <p
                className={`text-sm font-semibold ${stats.priceChange >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
                  }`}
              >
                {stats.priceChange >= 0 ? '+' : ''}
                {stats.priceChange.toFixed(2)}%
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">High</p>
              <p className="text-sm font-semibold text-foreground">
                {formatPrice(stats.highPrice)}
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Low</p>
              <p className="text-sm font-semibold text-foreground">
                {formatPrice(stats.lowPrice)}
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Avg Volume</p>
              <p className="text-sm font-semibold text-foreground">
                {formatVolume(stats.avgVolume)}
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Avg Vol/MC</p>
              <p className="text-sm font-semibold text-foreground">
                {stats.avgVolMcRatio.toFixed(4)}
              </p>
            </div>
            <div className={`rounded-lg p-3 ${whaleSignalCount > 0 ? 'bg-red-500/10 border border-red-500/30' : 'bg-muted/30'}`}>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FishIcon className="h-3 w-3" />
                Whale Signals
              </p>
              <p className={`text-sm font-semibold ${whaleSignalCount > 0 ? 'text-red-500' : 'text-foreground'}`}>
                {whaleSignalCount} detected
              </p>
            </div>
          </div>
        )}

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
            <ChartContainer config={priceVolumeConfig} className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={processedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.price} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.price} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="price"
                    orientation="left"
                    tickFormatter={(v) => formatPrice(v)}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                  />
                  <YAxis
                    yAxisId="volume"
                    orientation="right"
                    tickFormatter={(v) => formatVolume(v)}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const dataPoint = payload[0]?.payload as ProcessedDataPoint | undefined
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-md">
                          <p className="text-sm font-medium text-foreground mb-2">{label}</p>
                          {payload.map((entry, index) => {
                            if (entry.dataKey === 'isAnomaly') return null
                            return (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <div
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-muted-foreground">
                                  {entry.name === 'Price' ? 'Price:' : 'Volume:'}
                                </span>
                                <span className="font-medium text-foreground">
                                  {entry.name === 'Price'
                                    ? formatPrice(entry.value as number)
                                    : formatVolume(entry.value as number)}
                                </span>
                              </div>
                            )
                          })}
                          {dataPoint?.sma20Volume && (
                            <div className="flex items-center gap-2 text-sm mt-1 pt-1 border-t border-border/40">
                              <span className="text-muted-foreground">SMA20 Vol:</span>
                              <span className="font-medium text-foreground">
                                {formatVolume(dataPoint.sma20Volume)}
                              </span>
                            </div>
                          )}
                          {dataPoint?.volumeRatio && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Vol Ratio:</span>
                              <span className={`font-medium ${dataPoint.volumeRatio >= WHALE_DETECTION_CONFIG.VOLUME_SPIKE_THRESHOLD ? 'text-red-500' : 'text-foreground'}`}>
                                {dataPoint.volumeRatio.toFixed(2)}x
                              </span>
                            </div>
                          )}
                          {dataPoint?.priceChangePct !== null && dataPoint?.priceChangePct !== undefined && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Price Change:</span>
                              <span className={`font-medium ${dataPoint.priceChangePct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {dataPoint.priceChangePct >= 0 ? '+' : ''}{dataPoint.priceChangePct.toFixed(2)}%
                              </span>
                            </div>
                          )}
                          {dataPoint?.isAnomaly && (
                            <div className="flex items-center gap-2 text-sm mt-1 pt-1 border-t border-border/40">
                              <FishIcon className="h-3.5 w-3.5 text-red-500" />
                              <span className="font-semibold text-red-500">Whale Signal Detected!</span>
                            </div>
                          )}
                        </div>
                      )
                    }}
                  />
                  <Legend />
                  <Bar
                    yAxisId="volume"
                    dataKey="volume"
                    fill={CHART_COLORS.volume}
                    opacity={0.4}
                    name="Volume"
                  />
                  <Area
                    yAxisId="price"
                    type="monotone"
                    dataKey="price"
                    stroke={CHART_COLORS.price}
                    strokeWidth={2}
                    fill="url(#priceGradient)"
                    name="Price"
                  />
                  {/* Whale Signal Markers - only show when there are actual whale signals */}
                  {showWhaleSignals && whaleSignalCount > 0 && (
                    <Scatter
                      yAxisId="price"
                      data={processedData}
                      fill={CHART_COLORS.whaleSignal}
                      name="Whale Signal"
                      shape={(props: { cx?: number; cy?: number; payload?: ProcessedDataPoint }) => {
                        const { cx, cy, payload } = props
                        // Only render marker for anomaly points
                        if (cx === undefined || cy === undefined || !payload?.isAnomaly) return null
                        return (
                          <g>
                            {/* Outer pulse circle */}
                            <circle
                              cx={cx}
                              cy={cy + 12}
                              r={12}
                              fill={CHART_COLORS.whaleSignal}
                              fillOpacity={0.2}
                            />
                            {/* Inner circle */}
                            <circle
                              cx={cx}
                              cy={cy + 12}
                              r={6}
                              fill={CHART_COLORS.whaleSignal}
                              stroke="#fff"
                              strokeWidth={2}
                            />
                          </g>
                        )
                      }}
                    />
                  )}
                  <Brush
                    dataKey="date"
                    height={30}
                    stroke={CHART_COLORS.price}
                    tickFormatter={formatDate}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <ChartContainer config={marketCapConfig} className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={processedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mcGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.marketCap} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.marketCap} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="marketCap"
                    orientation="left"
                    tickFormatter={(v) => formatMarketCap(v)}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                  />
                  <YAxis
                    yAxisId="volMcRatio"
                    orientation="right"
                    tickFormatter={(v) => v.toFixed(2)}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                    domain={[0, 'auto']}
                  />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-md">
                          <p className="text-sm font-medium text-foreground mb-2">{label}</p>
                          {payload.map((entry, index) => {
                            let labelText = ''
                            let formattedValue = ''
                            if (entry.dataKey === 'marketCap') {
                              labelText = 'Market Cap:'
                              formattedValue = formatMarketCap(entry.value as number)
                            } else if (entry.dataKey === 'volMcRatio') {
                              labelText = 'Vol/MC Ratio:'
                              formattedValue = (entry.value as number).toFixed(4)
                            }
                            if (!labelText) return null
                            return (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <div
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-muted-foreground">{labelText}</span>
                                <span className="font-medium text-foreground">{formattedValue}</span>
                              </div>
                            )
                          })}
                        </div>
                      )
                    }}
                  />
                  <Legend />
                  <Bar
                    yAxisId="volMcRatio"
                    dataKey="volMcRatio"
                    fill={CHART_COLORS.volMcRatio}
                    opacity={0.5}
                    name="Vol/MC Ratio"
                  />
                  <Area
                    yAxisId="marketCap"
                    type="monotone"
                    dataKey="marketCap"
                    stroke={CHART_COLORS.marketCap}
                    strokeWidth={2}
                    fill="url(#mcGradient)"
                    name="Market Cap"
                  />
                  <ReferenceLine
                    yAxisId="volMcRatio"
                    y={0.1}
                    stroke={CHART_COLORS.volMcRatio}
                    strokeDasharray="5 5"
                    label={{ value: '0.1', fontSize: 10, fill: CHART_COLORS.volMcRatio }}
                  />
                  <Brush
                    dataKey="date"
                    height={30}
                    stroke={CHART_COLORS.marketCap}
                    tickFormatter={formatDate}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
