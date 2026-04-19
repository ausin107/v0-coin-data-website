import { useState, useRef, useCallback } from 'react'
import type { CoinData } from '@/lib/services/coin-service'
import type { BatchScanState, BatchScanReport, BatchScanResult } from './types'
import { BatchScanService } from '@/lib/services/batch-scan-service'
import { saveScanReport, getScanReports } from '@/lib/services/batch-scan-report'

export function useBatchScan() {
  const [state, setState] = useState<BatchScanState>({
    isRunning: false,
    isPaused: false,
    progress: { completed: 0, total: 0, cached: 0, failed: 0 },
    currentCoin: null,
    results: [],
    error: null,
    startedAt: null,
    estimatedTimeLeft: 0,
  })

  // Attempt to load latest report from localStorage
  const [latestReport, setLatestReport] = useState<BatchScanReport | null>(() => {
    if (typeof window === 'undefined') return null
    const reports = getScanReports()
    return reports.length > 0 ? reports[0] : null
  })

  const serviceRef = useRef<BatchScanService | null>(null)

  const updateReport = useCallback((report: BatchScanReport) => {
    const saved = saveScanReport(report)
    setLatestReport(saved)
  }, [])

  const startScan = useCallback(
    async (coins: CoinData[], filterDescription: string) => {
      if (coins.length === 0) return

      const startTime = Date.now()
      setState({
        isRunning: true,
        isPaused: false,
        progress: { completed: 0, total: coins.length, cached: 0, failed: 0 },
        currentCoin: null,
        results: [],
        error: null,
        startedAt: startTime,
        estimatedTimeLeft: coins.length * 2.1,
      })

      const service = new BatchScanService()
      serviceRef.current = service

      try {
        const results = await service.scanCoins(coins, (progress) => {
          setState((prev) => {
            const elapsed = (Date.now() - startTime) / 1000
            const rate = progress.completed > 0 ? elapsed / progress.completed : 2.1
            const remaining = progress.total - progress.completed
            const estimatedTimeLeft = remaining * rate

            return {
              ...prev,
              progress: {
                completed: progress.completed,
                total: progress.total,
                cached: progress.cached,
                failed: progress.failed,
              },
              currentCoin: progress.currentCoin,
              estimatedTimeLeft,
            }
          })
        })

        // Generate highlights
        const noContract = results.filter((r) => !r.contractAddress)
        const highConcentration = results.filter((r) => {
            if (r.owners && r.owners.length > 0) {
                return r.owners[0].percentage_relative_to_total_supply > 10
            }
            return false
        })

        const failedCoinsCount = results.filter(r => r.error).length
        const durationSeconds = Math.round((Date.now() - startTime) / 1000)

        const report: BatchScanReport = {
          id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          createdAt: Date.now(),
          filterSnapshot: filterDescription,
          totalCoins: coins.length,
          scannedCoins: results.length - failedCoinsCount,
          failedCoins: failedCoinsCount,
          cachedCoins: results.filter((r) => r.fromCache).length,
          duration: durationSeconds,
          results,
          highlights: {
            highConcentration,
            noContract,
          },
        }

        updateReport(report)

        setState((prev) => ({
          ...prev,
          isRunning: false,
          results,
          progress: { ...prev.progress, completed: coins.length },
          estimatedTimeLeft: 0,
          currentCoin: null,
        }))
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isRunning: false,
          error: err instanceof Error ? err.message : 'Scan failed',
          estimatedTimeLeft: 0,
          currentCoin: null,
        }))
      } finally {
        serviceRef.current = null
      }
    },
    [updateReport]
  )

  const pauseScan = useCallback(() => {
    if (serviceRef.current && state.isRunning) {
      serviceRef.current.pause()
      setState((prev) => ({ ...prev, isPaused: true }))
    }
  }, [state.isRunning])

  const resumeScan = useCallback(() => {
    if (serviceRef.current && state.isPaused) {
      serviceRef.current.resume()
      setState((prev) => ({ ...prev, isPaused: false }))
    }
  }, [state.isPaused])

  const cancelScan = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.cancel()
      serviceRef.current = null
      setState((prev) => ({
        ...prev,
        isRunning: false,
        isPaused: false,
        estimatedTimeLeft: 0,
        currentCoin: null,
      }))
    }
  }, [])

  const resetState = useCallback(() => {
    setState({
      isRunning: false,
      isPaused: false,
      progress: { completed: 0, total: 0, cached: 0, failed: 0 },
      currentCoin: null,
      results: [],
      error: null,
      startedAt: null,
      estimatedTimeLeft: 0,
    })
  }, [])

  return {
    state,
    latestReport,
    startScan,
    pauseScan,
    resumeScan,
    cancelScan,
    resetState,
  }
}
