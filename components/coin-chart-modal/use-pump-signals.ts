import { useState, useEffect, useMemo } from 'react'
import { MarketChartDataPoint, ProcessedDataPoint, ChartType } from './types'
import {
  filterByTimeRange,
  processChartData,
  calculateSignalCounts,
  calculateChartStats,
} from '@/lib/services/analysis-engine'

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

  // Filter data based on time range (delegated to shared engine)
  const filteredData = useMemo(
    () => filterByTimeRange(chartData, timeRange),
    [chartData, timeRange]
  )

  // Process data with pump signal detection (delegated to shared engine)
  const processedData = useMemo(
    (): ProcessedDataPoint[] => processChartData(filteredData),
    [filteredData]
  )

  // Count pump signals by level (delegated to shared engine)
  const pumpSignalCounts = useMemo(
    () => calculateSignalCounts(processedData),
    [processedData]
  )

  // Calculate stats (delegated to shared engine)
  const stats = useMemo(
    () => calculateChartStats(filteredData),
    [filteredData]
  )

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
