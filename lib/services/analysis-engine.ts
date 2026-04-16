/**
 * Pure functions for pump signal analysis.
 * Extracted from use-pump-signals.ts so both the chart modal
 * and the batch analysis system can share the same logic.
 */

import { PUMP_DETECTION_CONFIG } from '@/components/coin-chart-modal/utils'
import type { MarketChartDataPoint, ProcessedDataPoint } from '@/components/coin-chart-modal/types'
import type { PumpSignalCounts, ChartStats, RecentSignal, CoinAnalysisCache } from '@/components/batch-analysis/types'

// ─── 1. Filter chart data by time range ───

export function filterByTimeRange(
  chartData: MarketChartDataPoint[],
  timeRangeDays: number
): MarketChartDataPoint[] {
  if (!chartData.length) return []
  const cutoffDate = Date.now() - timeRangeDays * 24 * 60 * 60 * 1000
  return chartData.filter((d) => d.timestamp >= cutoffDate)
}

// ─── 2. Process chart data into pump signals ───

export function processChartData(filteredData: MarketChartDataPoint[]): ProcessedDataPoint[] {
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
  } = PUMP_DETECTION_CONFIG

  // First pass: calculate basic indicators
  const intermediateData = filteredData.map((point, index, arr) => {
    let sma20Volume: number | null = null
    if (index >= SMA_PERIOD - 1) {
      const volumeSum = arr
        .slice(index - SMA_PERIOD + 1, index + 1)
        .reduce((sum, p) => sum + p.volume, 0)
      sma20Volume = volumeSum / SMA_PERIOD
    }

    let vmcBaseline: number | null = null
    if (index >= SMA_PERIOD - 1) {
      const vmcSum = arr
        .slice(index - SMA_PERIOD + 1, index + 1)
        .reduce((sum, p) => sum + p.volMcRatio, 0)
      vmcBaseline = vmcSum / SMA_PERIOD
    }

    let priceChangePct: number | null = null
    if (index > 0) {
      const prevPrice = arr[index - 1].price
      priceChangePct = ((point.price - prevPrice) / prevPrice) * 100
    }

    const volumeRatio = sma20Volume ? point.volume / sma20Volume : null
    const vmcMultiple = vmcBaseline && vmcBaseline > 0 ? point.volMcRatio / vmcBaseline : null

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

    const vExhaust = sma20Volume !== null && point.volume < V_EXHAUST_THRESHOLD * sma20Volume
    const pSqueeze = priceVolatility !== null && priceVolatility < P_SQUEEZE_THRESHOLD

    const whaleAcc =
      sma20Volume !== null &&
      priceChangePct !== null &&
      point.volume > WHALE_VOLUME_SPIKE * sma20Volume &&
      Math.abs(priceChangePct) < WHALE_PRICE_CHANGE_MAX

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

    let sustainedPSqueeze = false
    if (index >= P_SQUEEZE_PERIOD) {
      const recentPoints = arr.slice(index - P_SQUEEZE_PERIOD, index + 1)
      sustainedPSqueeze = recentPoints.every(
        p => p.priceVolatility !== null && p.priceVolatility < P_SQUEEZE_THRESHOLD
      )
    }

    let sustainedVExhaust = false
    if (index >= 2) {
      sustainedVExhaust = arr
        .slice(index - 2, index + 1)
        .every(p => p.sma20Volume !== null && p.volume < V_EXHAUST_THRESHOLD * p.sma20Volume)
    }

    let pumpScore = 0
    if (sustainedPSqueeze) pumpScore += 20
    if (sustainedVExhaust) pumpScore += 20
    if (whaleAcc) pumpScore += 35
    pumpScore += vmcRatioSpike

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

    let pumpLevel: 'tier1' | 'tier2' | 'tier3' | 'tier4' = 'tier1'
    if (pumpScore >= 120) pumpLevel = 'tier4'
    else if (pumpScore >= 85) pumpLevel = 'tier3'
    else if (pumpScore >= 40) pumpLevel = 'tier2'

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
}

// ─── 3. Calculate pump signal counts ───

export function calculateSignalCounts(processedData: ProcessedDataPoint[]): PumpSignalCounts {
  const counts: PumpSignalCounts = { tier1: 0, tier2: 0, tier3: 0, tier4: 0, total: 0, recentTotal: 0 }
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
}

// ─── 4. Calculate chart statistics ───

export function calculateChartStats(filteredData: MarketChartDataPoint[]): ChartStats | null {
  if (!filteredData.length) return null

  const prices = filteredData.map((d) => d.price)
  const firstPrice = prices[0]
  const lastPrice = prices[prices.length - 1]
  const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100
  const highPrice = Math.max(...prices)
  const lowPrice = Math.min(...prices)
  const avgVolume = filteredData.reduce((sum, d) => sum + d.volume, 0) / filteredData.length
  const avgVolMcRatio = filteredData.reduce((sum, d) => sum + d.volMcRatio, 0) / filteredData.length

  return { priceChange, highPrice, lowPrice, avgVolume, avgVolMcRatio }
}

// ─── 5. Summarize processed data for cache storage ───

export function summarizeForCache(
  coinId: string,
  processedData: ProcessedDataPoint[],
  stats: ChartStats | null
): CoinAnalysisCache {
  const signalCounts = calculateSignalCounts(processedData)

  // Find max pump score and its level
  let maxPumpScore = 0
  let maxPumpLevel: 'tier1' | 'tier2' | 'tier3' | 'tier4' = 'tier1'
  processedData.forEach((d) => {
    if (d.pumpScore > maxPumpScore) {
      maxPumpScore = d.pumpScore
      maxPumpLevel = d.pumpLevel
    }
  })

  // Extract recent signals (within last 15 days) for the report
  const recentSignals: RecentSignal[] = processedData
    .filter((d) => d.pumpScore > 0 && d.recentSignal)
    .map((d) => ({
      date: d.date,
      timestamp: d.timestamp,
      pumpScore: d.pumpScore,
      pumpLevel: d.pumpLevel,
      signals: {
        vExhaust: d.vExhaust,
        pSqueeze: d.pSqueeze,
        whaleAcc: d.whaleAcc,
        vmcRatioSpike: d.vmcRatioSpike,
      },
    }))

  return {
    coinId,
    analyzedAt: Date.now(),
    pumpSignalCounts: signalCounts,
    maxPumpScore,
    maxPumpLevel,
    recentSignals,
    stats,
  }
}

// ─── 6. Full analysis pipeline (convenience) ───

export function analyzeChartData(
  coinId: string,
  rawChartData: MarketChartDataPoint[],
  timeRangeDays: number = 180
): CoinAnalysisCache {
  const filtered = filterByTimeRange(rawChartData, timeRangeDays)
  const processed = processChartData(filtered)
  const stats = calculateChartStats(filtered)
  return summarizeForCache(coinId, processed, stats)
}
