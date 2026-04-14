import { useState, useEffect, useMemo } from 'react'
import { MarketChartDataPoint, ProcessedDataPoint, ChartType } from './types'
import { PUMP_DETECTION_CONFIG } from './utils'

export function usePumpSignals(coinId: string, isOpen: boolean) {
  const [chartData, setChartData] = useState<MarketChartDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<ChartType>('price-volume')
  const [timeRange, setTimeRange] = useState<number>(180) // days
  const [showWhaleSignals, setShowWhaleSignals] = useState(true)

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
      RECENT_SIGNAL_BONUS,
    } = PUMP_DETECTION_CONFIG

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
          vmcRatioSpike = VMC_TIER3_SCORE
        } else if (vmcMultiple >= VMC_TIER2_MIN && vmcMultiple <= VMC_TIER2_MAX) {
          vmcRatioSpike = VMC_TIER2_SCORE
        } else if (vmcMultiple >= VMC_TIER1_MIN && vmcMultiple <= VMC_TIER1_MAX) {
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

      // Signal 4: V/MC Ratio spike
      pumpScore += vmcRatioSpike

      // Bonus based on time decay (age of signal relative to today)
      let recentSignal = false
      if (pumpScore > 0) {
        const daysSinceLastSignal = (Date.now() - point.timestamp) / (1000 * 60 * 60 * 24)
        if (daysSinceLastSignal <= 3) {
          pumpScore += 50
        } else if (daysSinceLastSignal <= 7) {
          pumpScore += 30
        } else if (daysSinceLastSignal <= 15) {
          pumpScore += 10
        }
        
        if (daysSinceLastSignal <= 15) {
          recentSignal = true
        }
      }

      // Determine pump tier level
      let pumpLevel: 'tier1' | 'tier2' | 'tier3' | 'tier4' = 'tier1'
      if (pumpScore >= 120) {
        pumpLevel = 'tier4'
      } else if (pumpScore >= 85) {
        pumpLevel = 'tier3'
      } else if (pumpScore >= 40) {
        pumpLevel = 'tier2'
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
    const counts = { tier1: 0, tier2: 0, tier3: 0, tier4: 0, total: 0, recentTotal: 0 }
    processedData.forEach((d) => {
      if (d.pumpScore > 0) {
        if (d.pumpLevel === 'tier1') counts.tier1++
        else if (d.pumpLevel === 'tier2') counts.tier2++
        else if (d.pumpLevel === 'tier3') counts.tier3++
        else if (d.pumpLevel === 'tier4') counts.tier4++
        if (d.recentSignal) counts.recentTotal++
      }
    })
    counts.total = counts.tier1 + counts.tier2 + counts.tier3 + counts.tier4
    return counts
  }, [processedData])

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

  return {
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
    whaleSignalCount: pumpSignalCounts.total,
    fetchChartData
  }
}
