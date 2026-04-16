/**
 * LocalStorage cache for batch analysis results.
 * Each coin's analysis is cached with a 24-hour TTL.
 */

import type { CoinAnalysisCache } from '@/components/batch-analysis/types'

const CACHE_KEY = 'batch_analysis_cache'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours in ms

// ─── Internal helpers ───

function loadCache(): Record<string, CoinAnalysisCache> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, CoinAnalysisCache>
  } catch {
    return {}
  }
}

function saveCache(cache: Record<string, CoinAnalysisCache>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch (e) {
    console.warn('[BatchCache] Failed to save cache, possibly full:', e)
    clearExpiredCache()
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    } catch {
      console.error('[BatchCache] Storage still full after cleanup')
    }
  }
}

function isExpired(entry: CoinAnalysisCache): boolean {
  return Date.now() - entry.analyzedAt > CACHE_TTL
}

// ─── Public API ───

/**
 * Get cached analysis for a coin. Returns null if not found or expired.
 */
export function getCachedAnalysis(coinId: string): CoinAnalysisCache | null {
  const cache = loadCache()
  const entry = cache[coinId]
  if (!entry) return null
  if (isExpired(entry)) {
    // Remove expired entry
    delete cache[coinId]
    saveCache(cache)
    return null
  }
  return entry
}

/**
 * Save analysis result to cache.
 */
export function setCachedAnalysis(coinId: string, data: CoinAnalysisCache): void {
  const cache = loadCache()
  cache[coinId] = data
  saveCache(cache)
}

/**
 * Clear all expired cache entries.
 */
export function clearExpiredCache(): void {
  const cache = loadCache()
  let changed = false
  for (const key of Object.keys(cache)) {
    if (isExpired(cache[key])) {
      delete cache[key]
      changed = true
    }
  }
  if (changed) saveCache(cache)
}

/**
 * Get list of coin IDs that are currently cached and not expired.
 */
export function getAllCachedIds(): string[] {
  const cache = loadCache()
  return Object.keys(cache).filter((id) => !isExpired(cache[id]))
}

/**
 * Get all valid (non-expired) cached entries.
 */
export function getAllValidCache(): CoinAnalysisCache[] {
  const cache = loadCache()
  return Object.values(cache).filter((entry) => !isExpired(entry))
}

/**
 * Clear all cache.
 */
export function clearAllCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CACHE_KEY)
}

/**
 * Get cache statistics.
 */
export function getCacheStats(): { totalEntries: number; validEntries: number; sizeKB: number } {
  if (typeof window === 'undefined') return { totalEntries: 0, validEntries: 0, sizeKB: 0 }
  const raw = localStorage.getItem(CACHE_KEY)
  const cache = loadCache()
  const valid = Object.values(cache).filter((e) => !isExpired(e))
  return {
    totalEntries: Object.keys(cache).length,
    validEntries: valid.length,
    sizeKB: raw ? Math.round(new Blob([raw]).size / 1024) : 0,
  }
}
