/**
 * Core hook for batch analysis of coins.
 * Manages the rate-limited queue, progress tracking, and result aggregation.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import type { CoinData } from '@/lib/services/coin-service'
import type {
  BatchAnalysisState,
  BatchCoinResult,
  BatchReport,
  CoinAnalysisCache,
} from './types'
import { analyzeChartData } from '@/lib/services/analysis-engine'
import { getCachedAnalysis, setCachedAnalysis } from '@/lib/services/batch-analysis-cache'
import { saveReport } from '@/lib/services/batch-analysis-report'

const RATE_LIMIT_INTERVAL_MS = 2400 // ~25 requests per minute (safe margin for 30/min limit)
const RATE_LIMIT_PAUSE_MS = 65000   // 65 seconds pause on 429
const MAX_RETRIES = 3

const initialState: BatchAnalysisState = {
  isRunning: false,
  isPaused: false,
  progress: { completed: 0, total: 0, cached: 0, failed: 0 },
  currentCoin: null,
  results: [],
  error: null,
  startedAt: null,
  estimatedTimeLeft: 0,
}

export function useBatchAnalysis() {
  const [state, setState] = useState<BatchAnalysisState>(initialState)
  const [latestReport, setLatestReport] = useState<BatchReport | null>(null)

  // Refs for persistent state across re-renders
  const isRunningRef = useRef(false)
  const isPausedRef = useRef(false)
  const isCancelledRef = useRef(false)
  const resultsRef = useRef<BatchCoinResult[]>([])
  const startTimeRef = useRef<number>(0)

  // Helper to update state safely
  const updateState = useCallback((patch: Partial<BatchAnalysisState>) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])

  // Sleep helper
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  // Wait while paused
  const waitWhilePaused = async () => {
    while (isPausedRef.current && !isCancelledRef.current) {
      await sleep(500)
    }
  }

  // Fetch chart data for a single coin with retry
  const fetchCoinChartData = async (coinId: string): Promise<{ success: boolean; data?: unknown[]; error?: string }> => {
    let retries = 0

    while (retries < MAX_RETRIES) {
      try {
        const response = await fetch(`/api/coins/${coinId}/market-chart`)

        if (response.status === 429) {
          console.warn(`[BatchAnalysis] 429 rate limited on ${coinId}, pausing ${RATE_LIMIT_PAUSE_MS / 1000}s...`)
          updateState({ isPaused: true, error: `Rate limited. Auto-resuming in ${Math.round(RATE_LIMIT_PAUSE_MS / 1000)}s...` })
          isPausedRef.current = true
          await sleep(RATE_LIMIT_PAUSE_MS)
          isPausedRef.current = false
          updateState({ isPaused: false, error: null })
          retries++
          continue
        }

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }

        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch chart data')
        }

        return { success: true, data: result.data }
      } catch (err) {
        retries++
        if (retries < MAX_RETRIES) {
          await sleep(1000 * retries) // backoff
        } else {
          return {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          }
        }
      }
    }

    return { success: false, error: 'Max retries exceeded' }
  }

  // Build a BatchCoinResult from cache data
  const buildResultFromCache = (coin: CoinData, cached: CoinAnalysisCache): BatchCoinResult => ({
    coinId: coin.id,
    coinName: coin.name,
    coinSymbol: coin.symbol,
    coinImage: coin.image,
    currentPrice: coin.current_price,
    marketCap: coin.market_cap,
    maxPumpScore: cached.maxPumpScore,
    maxPumpLevel: cached.maxPumpLevel,
    pumpSignalCounts: cached.pumpSignalCounts,
    recentSignals: cached.recentSignals,
    stats: cached.stats,
    fromCache: true,
  })

  // Build a BatchCoinResult from fresh analysis
  const buildResultFromAnalysis = (coin: CoinData, analysis: CoinAnalysisCache): BatchCoinResult => ({
    coinId: coin.id,
    coinName: coin.name,
    coinSymbol: coin.symbol,
    coinImage: coin.image,
    currentPrice: coin.current_price,
    marketCap: coin.market_cap,
    maxPumpScore: analysis.maxPumpScore,
    maxPumpLevel: analysis.maxPumpLevel,
    pumpSignalCounts: analysis.pumpSignalCounts,
    recentSignals: analysis.recentSignals,
    stats: analysis.stats,
    fromCache: false,
  })

  // Build a failed BatchCoinResult
  const buildFailedResult = (coin: CoinData, error: string): BatchCoinResult => ({
    coinId: coin.id,
    coinName: coin.name,
    coinSymbol: coin.symbol,
    coinImage: coin.image,
    currentPrice: coin.current_price,
    marketCap: coin.market_cap,
    maxPumpScore: 0,
    maxPumpLevel: 'tier1',
    pumpSignalCounts: { tier1: 0, tier2: 0, tier3: 0, tier4: 0, total: 0, recentTotal: 0 },
    recentSignals: [],
    stats: null,
    fromCache: false,
    error,
  })

  // Generate filter description from current filter state
  const generateFilterDescription = (coins: CoinData[]): string => {
    return `${coins.length} coins analyzed`
  }

  // ─── Main batch analysis function ───

  const startAnalysis = useCallback(async (coins: CoinData[], filterDescription?: string) => {
    if (isRunningRef.current) return

    // Reset state
    isRunningRef.current = true
    isPausedRef.current = false
    isCancelledRef.current = false
    resultsRef.current = []
    startTimeRef.current = Date.now()

    const totalCoins = coins.length
    let completedCount = 0
    let cachedCount = 0
    let failedCount = 0

    updateState({
      isRunning: true,
      isPaused: false,
      progress: { completed: 0, total: totalCoins, cached: 0, failed: 0 },
      currentCoin: null,
      results: [],
      error: null,
      startedAt: Date.now(),
      estimatedTimeLeft: 0,
    })

    // Separate cached vs uncached coins
    const cachedCoins: { coin: CoinData; cache: CoinAnalysisCache }[] = []
    const uncachedCoins: CoinData[] = []

    for (const coin of coins) {
      const cached = getCachedAnalysis(coin.id)
      if (cached) {
        cachedCoins.push({ coin, cache: cached })
      } else {
        uncachedCoins.push(coin)
      }
    }

    // Process cached coins instantly
    for (const { coin, cache } of cachedCoins) {
      if (isCancelledRef.current) break

      const result = buildResultFromCache(coin, cache)
      resultsRef.current.push(result)
      completedCount++
      cachedCount++

      updateState({
        progress: { completed: completedCount, total: totalCoins, cached: cachedCount, failed: failedCount },
        results: [...resultsRef.current],
      })
    }

    // Process uncached coins with rate limiting
    for (let i = 0; i < uncachedCoins.length; i++) {
      if (isCancelledRef.current) break

      // Wait while paused
      await waitWhilePaused()
      if (isCancelledRef.current) break

      const coin = uncachedCoins[i]

      // Update current coin
      updateState({
        currentCoin: { id: coin.id, name: coin.name, image: coin.image },
      })

      // Fetch and analyze
      const fetchResult = await fetchCoinChartData(coin.id)

      if (isCancelledRef.current) break

      if (fetchResult.success && fetchResult.data) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const analysis = analyzeChartData(coin.id, fetchResult.data as any[], 180)
          setCachedAnalysis(coin.id, analysis)
          const result = buildResultFromAnalysis(coin, analysis)
          resultsRef.current.push(result)
        } catch (err) {
          const result = buildFailedResult(coin, err instanceof Error ? err.message : 'Analysis failed')
          resultsRef.current.push(result)
          failedCount++
        }
      } else {
        const result = buildFailedResult(coin, fetchResult.error || 'Fetch failed')
        resultsRef.current.push(result)
        failedCount++
      }

      completedCount++

      // Calculate estimated time left
      const uncachedCompleted = completedCount - cachedCount
      const uncachedRemaining = uncachedCoins.length - (i + 1)
      const avgTimePerCoin = uncachedCompleted > 0
        ? (Date.now() - startTimeRef.current) / uncachedCompleted
        : RATE_LIMIT_INTERVAL_MS
      const estimatedTimeLeft = Math.round((uncachedRemaining * avgTimePerCoin) / 1000)

      updateState({
        progress: { completed: completedCount, total: totalCoins, cached: cachedCount, failed: failedCount },
        results: [...resultsRef.current],
        estimatedTimeLeft,
      })

      // Rate limit delay (skip for last item)
      if (i < uncachedCoins.length - 1 && !isCancelledRef.current) {
        await sleep(RATE_LIMIT_INTERVAL_MS)
      }
    }

    // Finished
    isRunningRef.current = false
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000)

    // Save report
    const report = saveReport(
      resultsRef.current,
      filterDescription || generateFilterDescription(coins),
      totalCoins,
      duration
    )

    setLatestReport(report)

    updateState({
      isRunning: false,
      isPaused: false,
      currentCoin: null,
      estimatedTimeLeft: 0,
      progress: { completed: completedCount, total: totalCoins, cached: cachedCount, failed: failedCount },
      results: [...resultsRef.current],
    })

    return report
  }, [updateState])

  // ─── Control functions ───

  const pauseAnalysis = useCallback(() => {
    isPausedRef.current = true
    updateState({ isPaused: true })
  }, [updateState])

  const resumeAnalysis = useCallback(() => {
    isPausedRef.current = false
    updateState({ isPaused: false, error: null })
  }, [updateState])

  const cancelAnalysis = useCallback(() => {
    isCancelledRef.current = true
    isRunningRef.current = false
    isPausedRef.current = false

    // Still save partial report if there are results
    if (resultsRef.current.length > 0) {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000)
      const report = saveReport(
        resultsRef.current,
        `Cancelled (partial) - ${resultsRef.current.length} coins`,
        state.progress.total,
        duration
      )
      setLatestReport(report)
    }

    updateState({
      isRunning: false,
      isPaused: false,
      currentCoin: null,
      error: 'Analysis cancelled',
    })
  }, [updateState, state.progress.total])

  const resetState = useCallback(() => {
    setState(initialState)
    setLatestReport(null)
    resultsRef.current = []
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't cancel on unmount — analysis continues in background via refs
    }
  }, [])

  return {
    state,
    latestReport,
    startAnalysis,
    pauseAnalysis,
    resumeAnalysis,
    cancelAnalysis,
    resetState,
  }
}
