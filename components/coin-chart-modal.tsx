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
import { TrendingUpIcon, ActivityIcon, BarChart3Icon } from 'lucide-react'

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
  // Pump Signal Indicators
  vExhaust: boolean // Volume exhaustion signal
  pSqueeze: boolean // Price squeeze signal
  whaleAcc: boolean // Whale accumulation signal
  vmcRatioSpike: number // V/MC ratio spike score (0, 15, 25, or 40)
  vmcBaseline: number | null // SMA20 of V/MC ratio (baseline)
  vmcMultiple: number | null // Current V/MC / Baseline
  recentSignal: boolean // Signal appeared within last 15 days
  pumpScore: number // Total pump score (0-165)
  pumpLevel: 'low' | 'medium' | 'high' // Pump level classification
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
  // Pump level colors
  pumpLow: '#22c55e', // green-500 - Low pump probability (0-35)
  pumpMedium: '#eab308', // yellow-500 - Medium pump probability (36-65)
  pumpHigh: '#ef4444', // red-500 - High pump probability (66-100)
}

// Pump signal detection algorithm parameters
const PUMP_DETECTION_CONFIG = {
  SMA_PERIOD: 20, // 20-day Simple Moving Average for volume and V/MC
  // V_Exhaust: Volume exhaustion detection
  V_EXHAUST_THRESHOLD: 0.3, // Volume < 30% of SMA20_Volume
  // P_Squeeze: Price squeeze detection
  P_SQUEEZE_PERIOD: 10, // Number of periods to check for price squeeze
  P_SQUEEZE_THRESHOLD: 6, // Price volatility < 6%
  // Whale_Acc: Whale accumulation detection
  WHALE_VOLUME_SPIKE: 3, // Volume > 3x SMA20_Volume
  WHALE_PRICE_CHANGE_MAX: 10, // |Price Change| < 10%
  // V/MC Ratio spike thresholds (based on SMA20 baseline)
  VMC_MIN_THRESHOLD: 0.10, // Skip if V/MC < 10% (too weak)
  VMC_TIER1_MIN: 2.5, // 2.5x baseline = +15 points (attention)
  VMC_TIER1_MAX: 3.0,
  VMC_TIER1_SCORE: 15,
  VMC_TIER2_MIN: 4.0, // 4x baseline = +25 points (whale alert)
  VMC_TIER2_MAX: 7.0,
  VMC_TIER2_SCORE: 25,
  VMC_TIER3_MIN: 10.0, // >10x baseline = +40 points (super spike)
  VMC_TIER3_SCORE: 40,
  // Recent signal bonus: signal within last N days
  RECENT_SIGNAL_DAYS: 15,
  RECENT_SIGNAL_BONUS: 50,
  // Scoring thresholds (max base score = 20+20+35+40 = 115, max total = 165)
  SCORE_LOW_MAX: 70,
  SCORE_MEDIUM_MAX: 110,
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

  // Process data with pump signal detection algorithm
  const processedData = useMemo((): ProcessedDataPoint[] => {
    if (!filteredData.length) return []

    const {
      SMA_PERIOD,
      V_EXHAUST_THRESHOLD,
      P_SQUEEZE_PERIOD,
      P_SQUEEZE_THRESHOLD,
      WHALE_VOLUME_SPIKE,
      WHALE_PRICE_CHANGE_MAX,
      VMC_MIN_THRESHOLD,
      VMC_TIER1_MIN,
      VMC_TIER1_MAX,
      VMC_TIER1_SCORE,
      VMC_TIER2_MIN,
      VMC_TIER2_MAX,
      VMC_TIER2_SCORE,
      VMC_TIER3_MIN,
      VMC_TIER3_SCORE,
      RECENT_SIGNAL_DAYS,
      RECENT_SIGNAL_BONUS,
      SCORE_LOW_MAX,
      SCORE_MEDIUM_MAX,
    } = PUMP_DETECTION_CONFIG

    // Cutoff timestamp for "recent signal" bonus (last 15 days)
    const recentCutoff = Date.now() - RECENT_SIGNAL_DAYS * 24 * 60 * 60 * 1000

    // First pass: calculate basic indicators including SMA20 of V/MC
    const intermediateData = filteredData.map((point, index, arr) => {
      // Calculate SMA_20_Volume
      let sma20Volume: number | null = null
      if (index >= SMA_PERIOD - 1) {
        const volumeSum = arr
          .slice(index - SMA_PERIOD + 1, index + 1)
          .reduce((sum, p) => sum + p.volume, 0)
        sma20Volume = volumeSum / SMA_PERIOD
      }

      // Calculate SMA_20 of V/MC Ratio (Baseline)
      let vmcBaseline: number | null = null
      if (index >= SMA_PERIOD - 1) {
        const vmcSum = arr
          .slice(index - SMA_PERIOD + 1, index + 1)
          .reduce((sum, p) => sum + p.volMcRatio, 0)
        vmcBaseline = vmcSum / SMA_PERIOD
      }

      // Calculate Price Change Percentage (compared to previous day)
      let priceChangePct: number | null = null
      if (index > 0) {
        const prevPrice = arr[index - 1].price
        priceChangePct = ((point.price - prevPrice) / prevPrice) * 100
      }

      // Calculate volume ratio
      const volumeRatio = sma20Volume ? point.volume / sma20Volume : null

      // Calculate V/MC multiple (current / baseline)
      const vmcMultiple = vmcBaseline && vmcBaseline > 0 ? point.volMcRatio / vmcBaseline : null

      // Calculate price range for P_Squeeze (volatility over P_SQUEEZE_PERIOD)
      let priceVolatility: number | null = null
      if (index >= P_SQUEEZE_PERIOD - 1) {
        const priceSlice = arr.slice(index - P_SQUEEZE_PERIOD + 1, index + 1)
        const highPrice = Math.max(...priceSlice.map(p => p.price))
        const lowPrice = Math.min(...priceSlice.map(p => p.price))
        priceVolatility = ((highPrice - lowPrice) / lowPrice) * 100
      }

      return {
        ...point,
        sma20Volume,
        vmcBaseline,
        vmcMultiple,
        priceChangePct,
        volumeRatio,
        priceVolatility,
      }
    })

    // Second pass: calculate signals and scores
    return intermediateData.map((point, index, arr) => {
      const { sma20Volume, priceChangePct, priceVolatility, vmcBaseline, vmcMultiple } = point

      // Signal 1: V_Exhaust - Volume exhaustion (Volume < 30% of SMA20)
      const vExhaust = sma20Volume !== null && point.volume < V_EXHAUST_THRESHOLD * sma20Volume

      // Signal 2: P_Squeeze - Price squeeze (volatility < 6% over last P_SQUEEZE_PERIOD candles)
      const pSqueeze = priceVolatility !== null && priceVolatility < P_SQUEEZE_THRESHOLD

      // Signal 3: Whale_Acc - Whale accumulation (Volume > 3x SMA20 AND |Price Change| < 10%)
      const whaleAcc =
        sma20Volume !== null &&
        priceChangePct !== null &&
        point.volume > WHALE_VOLUME_SPIKE * sma20Volume &&
        Math.abs(priceChangePct) < WHALE_PRICE_CHANGE_MAX

      // Signal 4: V/MC Ratio spike (tiered scoring based on baseline multiple)
      // Skip if current V/MC < 10% (too weak)
      let vmcRatioSpike = 0
      if (point.volMcRatio >= VMC_MIN_THRESHOLD && vmcMultiple !== null) {
        if (vmcMultiple >= VMC_TIER3_MIN) {
          // Super spike: >10x baseline = +40 points
          vmcRatioSpike = VMC_TIER3_SCORE
        } else if (vmcMultiple >= VMC_TIER2_MIN && vmcMultiple <= VMC_TIER2_MAX) {
          // Whale alert: 4x-7x baseline = +25 points
          vmcRatioSpike = VMC_TIER2_SCORE
        } else if (vmcMultiple >= VMC_TIER1_MIN && vmcMultiple <= VMC_TIER1_MAX) {
          // Attention: 2.5x-3x baseline = +15 points
          vmcRatioSpike = VMC_TIER1_SCORE
        }
      }

      // Check for sustained P_Squeeze (10+ periods)
      let sustainedPSqueeze = false
      if (index >= P_SQUEEZE_PERIOD) {
        const recentPoints = arr.slice(index - P_SQUEEZE_PERIOD, index + 1)
        sustainedPSqueeze = recentPoints.every(
          p => p.priceVolatility !== null && p.priceVolatility < P_SQUEEZE_THRESHOLD
        )
      }

      // Check for sustained V_Exhaust (3+ consecutive candles)
      let sustainedVExhaust = false
      if (index >= 2) {
        sustainedVExhaust = arr
          .slice(index - 2, index + 1)
          .every(p => p.sma20Volume !== null && p.volume < V_EXHAUST_THRESHOLD * p.sma20Volume)
      }

      // Calculate base Pump Score (max 165)
      let pumpScore = 0

      // Signal 1: Sustained P_Squeeze (+20 points)
      if (sustainedPSqueeze) pumpScore += 20

      // Signal 2: Sustained V_Exhaust (+20 points)
      if (sustainedVExhaust) pumpScore += 20

      // Signal 3: Whale_Acc (+35 points)
      if (whaleAcc) pumpScore += 35

      // Signal 4: V/MC Ratio spike (tiered: +15, +25, or +40 points)
      pumpScore += vmcRatioSpike

      // Bonus: +50 points if any signal appeared within the last 15 days
      const isRecent = point.timestamp >= recentCutoff
      const recentSignal = isRecent && pumpScore > 0
      if (recentSignal) pumpScore += RECENT_SIGNAL_BONUS

      // Determine pump level (max possible score = 165)
      let pumpLevel: 'low' | 'medium' | 'high' = 'low'
      if (pumpScore > SCORE_MEDIUM_MAX) {
        pumpLevel = 'high'
      } else if (pumpScore > SCORE_LOW_MAX) {
        pumpLevel = 'medium'
      }

      // isAnomaly = any signal detected with score > 0
      const isAnomaly = pumpScore > 0

      return {
        ...point,
        vExhaust,
        pSqueeze,
        whaleAcc,
        vmcRatioSpike,
        vmcBaseline,
        vmcMultiple,
        recentSignal,
        pumpScore,
        pumpLevel,
        isAnomaly,
      }
    })
  }, [filteredData])

  // Count pump signals by level and track recent signals
  const pumpSignalCounts = useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0, total: 0, recentTotal: 0 }
    processedData.forEach((d) => {
      if (d.pumpScore > 0) {
        if (d.pumpLevel === 'low') counts.low++
        else if (d.pumpLevel === 'medium') counts.medium++
        else if (d.pumpLevel === 'high') counts.high++
        if (d.recentSignal) counts.recentTotal++
      }
    })
    counts.total = counts.low + counts.medium + counts.high
    return counts
  }, [processedData])

  // For backward compatibility
  const whaleSignalCount = pumpSignalCounts.total

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
                {pumpSignalCounts.high > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-red-500/20 text-red-600 dark:text-red-400">
                    {pumpSignalCounts.high}
                  </span>
                )}
                {pumpSignalCounts.medium > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                    {pumpSignalCounts.medium}
                  </span>
                )}
                {pumpSignalCounts.low > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-green-500/20 text-green-600 dark:text-green-400">
                    {pumpSignalCounts.low}
                  </span>
                )}
              </span>
            )}
          </Button>
        </div>

        {/* Stats Bar */}
        {stats && !loading && (
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
                {pumpSignalCounts.high > 0 && (
                  <span className="text-sm font-semibold text-red-500">{pumpSignalCounts.high}H</span>
                )}
                {pumpSignalCounts.medium > 0 && (
                  <span className="text-sm font-semibold text-yellow-500">{pumpSignalCounts.medium}M</span>
                )}
                {pumpSignalCounts.low > 0 && (
                  <span className="text-sm font-semibold text-green-500">{pumpSignalCounts.low}L</span>
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
                              <span className={`font-medium ${dataPoint.volumeRatio >= PUMP_DETECTION_CONFIG.WHALE_VOLUME_SPIKE ? 'text-red-500' : 'text-foreground'}`}>
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
                          {/* Pump Score and Level Display */}
                          {dataPoint && dataPoint.pumpScore > 0 && (
                            <div className="mt-1 pt-1 border-t border-border/40 space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Pump Score:</span>
                                <span className={`font-semibold ${dataPoint.pumpLevel === 'high' ? 'text-red-500' :
                                  dataPoint.pumpLevel === 'medium' ? 'text-yellow-500' : 'text-green-500'
                                  }`}>
                                  {dataPoint.pumpScore}/140
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1 text-xs">
                                {dataPoint.vExhaust && <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">V_Exhaust</span>}
                                {dataPoint.pSqueeze && <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">P_Squeeze</span>}
                                {dataPoint.whaleAcc && <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">Whale_Acc</span>}
                                {dataPoint.vmcRatioSpike && <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded">V/MC Spike</span>}
                                {dataPoint.recentSignal && <span className="px-1.5 py-0.5 bg-blue-600/20 text-blue-300 rounded">Recent</span>}
                              </div>
                              {dataPoint.pumpLevel !== 'low' && (
                                <div className="flex items-center gap-2 text-sm">
                                  <ActivityIcon className={`h-3.5 w-3.5 ${dataPoint.pumpLevel === 'high' ? 'text-red-500' : 'text-yellow-500'}`} />
                                  <span className={`font-semibold ${dataPoint.pumpLevel === 'high' ? 'text-red-500' : 'text-yellow-500'}`}>
                                    {dataPoint.pumpLevel === 'high' ? 'HIGH Pump Probability!' : 'Medium Pump Probability'}
                                  </span>
                                </div>
                              )}
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
                  {/* Pump Signal Markers - only show medium (yellow) and high (red) */}
                  {showWhaleSignals && (
                    <Scatter
                      yAxisId="price"
                      data={processedData}
                      fill={CHART_COLORS.pumpHigh}
                      name="Pump Signal"
                      shape={(props: { cx?: number; cy?: number; payload?: ProcessedDataPoint }) => {
                        const { cx, cy, payload } = props
                        // Only render marker for medium or high pump levels (skip low/green)
                        if (cx === undefined || cy === undefined || !payload || payload.pumpLevel === 'low') return null

                        // Get color based on pump level (only medium or high)
                        const color = payload.pumpLevel === 'high'
                          ? CHART_COLORS.pumpHigh
                          : CHART_COLORS.pumpMedium

                        // Same size for all levels
                        const outerRadius = 10
                        const innerRadius = 5

                        return (
                          <g>
                            {/* Outer pulse circle */}
                            <circle
                              cx={cx}
                              cy={cy + 12}
                              r={outerRadius}
                              fill={color}
                              fillOpacity={0.3}
                            />
                            {/* Inner circle */}
                            <circle
                              cx={cx}
                              cy={cy + 12}
                              r={innerRadius}
                              fill={color}
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
