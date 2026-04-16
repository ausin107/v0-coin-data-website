/**
 * Report storage service for batch analysis.
 * Reports are stored in localStorage with a max of 20 entries.
 */

import type { BatchReport, BatchCoinResult } from '@/components/batch-analysis/types'

const REPORTS_KEY = 'batch_reports'
const MAX_REPORTS = 20

// ─── Internal helpers ───

function loadReports(): BatchReport[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(REPORTS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as BatchReport[]
  } catch {
    return []
  }
}

function persistReports(reports: BatchReport[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports))
  } catch (e) {
    console.warn('[BatchReports] Failed to save reports:', e)
  }
}

// ─── Public API ───

/**
 * Generate a unique report ID.
 */
function generateId(): string {
  return `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Build highlight sections from results.
 */
export function buildHighlights(results: BatchCoinResult[]): BatchReport['highlights'] {
  const successful = results.filter((r) => !r.error)

  // High score: maxPumpScore >= 85, sorted descending
  const highScore = successful
    .filter((r) => r.maxPumpScore >= 85)
    .sort((a, b) => b.maxPumpScore - a.maxPumpScore)

  // Recent signals: coins with signals within last 7 days
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recentSignals = successful
    .filter((r) =>
      r.recentSignals.some((s) => s.timestamp >= sevenDaysAgo)
    )
    .sort((a, b) => {
      const aLatest = Math.max(...a.recentSignals.map((s) => s.timestamp))
      const bLatest = Math.max(...b.recentSignals.map((s) => s.timestamp))
      return bLatest - aLatest
    })

  // Whale activity: coins with whaleAcc in recent signals
  const whaleActivity = successful
    .filter((r) =>
      r.recentSignals.some((s) => s.signals.whaleAcc)
    )
    .sort((a, b) => b.maxPumpScore - a.maxPumpScore)

  return { highScore, recentSignals, whaleActivity }
}

/**
 * Create and save a new batch report.
 */
export function saveReport(
  results: BatchCoinResult[],
  filterSnapshot: string,
  totalCoins: number,
  duration: number
): BatchReport {
  const highlights = buildHighlights(results)
  const report: BatchReport = {
    id: generateId(),
    createdAt: Date.now(),
    filterSnapshot,
    totalCoins,
    analyzedCoins: results.filter((r) => !r.error).length,
    failedCoins: results.filter((r) => !!r.error).length,
    cachedCoins: results.filter((r) => r.fromCache).length,
    duration,
    results: results.sort((a, b) => b.maxPumpScore - a.maxPumpScore),
    highlights,
  }

  const reports = loadReports()
  reports.unshift(report) // newest first

  // Trim to max
  if (reports.length > MAX_REPORTS) {
    reports.splice(MAX_REPORTS)
  }

  persistReports(reports)
  return report
}

/**
 * Get all reports, newest first.
 */
export function getReports(): BatchReport[] {
  return loadReports()
}

/**
 * Get a single report by ID.
 */
export function getReportById(id: string): BatchReport | null {
  const reports = loadReports()
  return reports.find((r) => r.id === id) ?? null
}

/**
 * Delete a report by ID.
 */
export function deleteReport(id: string): void {
  const reports = loadReports().filter((r) => r.id !== id)
  persistReports(reports)
}

/**
 * Clear all reports.
 */
export function clearAllReports(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(REPORTS_KEY)
}
