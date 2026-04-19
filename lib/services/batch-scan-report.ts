/**
 * Report storage service for batch scan.
 * Reports are stored in localStorage with a max of 20 entries, keeping them for 1 day.
 */

import type { BatchScanReport } from '@/components/batch-scan/types'

const REPORTS_KEY = 'batch_scan_reports'
const MAX_REPORTS = 5
const ONE_DAY_MS = 24 * 60 * 60 * 1000

// ─── Internal helpers ───

function loadReports(): BatchScanReport[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(REPORTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as BatchScanReport[]
    
    // Filter out reports older than 1 day
    const now = Date.now()
    const validReports = parsed.filter(r => (now - r.createdAt) < ONE_DAY_MS)
    
    // If some expired, re-save
    if (validReports.length !== parsed.length) {
      persistReports(validReports)
    }
    
    return validReports
  } catch {
    return []
  }
}

function persistReports(reports: BatchScanReport[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports))
  } catch (e) {
    console.warn('[BatchScanReports] Failed to save reports:', e)
  }
}

// ─── Public API ───

export function getScanReports(): BatchScanReport[] {
  return loadReports()
}

export function deleteScanReport(id: string): void {
  const reports = loadReports().filter((r) => r.id !== id)
  persistReports(reports)
}

export function saveScanReport(
  report: BatchScanReport
): BatchScanReport {
  // Minimize payload size before saving to localStorage
  const minimizedReport: BatchScanReport = {
    ...report,
    results: report.results.map(r => ({
      ...r,
      owners: (r.owners || []).map(o => ({
        owner_address: o.owner_address,
        percentage_relative_to_total_supply: o.percentage_relative_to_total_supply,
        is_contract: o.is_contract,
        entity: o.entity,
        owner_address_label: o.owner_address_label,
        balance_formatted: '0' // Clear this to save characters
      }))
    })),
    highlights: {
      highConcentration: report.highlights.highConcentration.map(r => ({ ...r, owners: r.owners.slice(0, 1) })), // only need top 1 for highlight
      noContract: report.highlights.noContract.map(r => ({ ...r, owners: [] }))
    }
  }

  const reports = loadReports()
  reports.unshift(minimizedReport) // newest first

  // Trim to max
  if (reports.length > MAX_REPORTS) {
    reports.splice(MAX_REPORTS)
  }

  persistReports(reports)
  return report
}
