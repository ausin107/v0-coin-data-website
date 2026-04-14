import { type CoinData, type FavoriteCoin } from '@/lib/services/coin-service'
import { TabState } from './types'

export function getVolMcRatioColor(ratio: number): string {
  if (ratio < 0.05) return 'bg-muted/50 text-muted-foreground'
  if (ratio < 0.1) return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
  if (ratio < 0.2) return 'bg-emerald-500/40 text-emerald-700 dark:text-emerald-300'
  if (ratio < 0.3) return 'bg-emerald-500/60 text-emerald-800 dark:text-emerald-200'
  if (ratio < 0.5) return 'bg-emerald-500/80 text-emerald-900 dark:text-emerald-100'
  return 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-white'
}

export function isStablecoin(coin: CoinData): boolean {
  const priceNearOne = Math.abs((coin.current_price ?? 0) - 1) < 0.02
  const lowVolatility24h = Math.abs(coin.price_change_percentage_24h ?? 0) < 0.5
  const lowVolatility1y = Math.abs(coin.price_change_percentage_1y_in_currency ?? 0) < 2
  return priceNearOne && lowVolatility24h && lowVolatility1y
}

export function removeDuplicateCoins(coins: CoinData[]): CoinData[] {
  const seen = new Map<string, CoinData>()
  for (const coin of coins) {
    const key = `${coin.id}-${coin.symbol}-${coin.name}-${coin.current_price}-${coin.market_cap}`
    if (!seen.has(key)) seen.set(key, coin)
  }
  return Array.from(seen.values())
}

export function parseValueWithSuffix(value: string): number | null {
  if (!value.trim()) return null
  const cleanValue = value.trim().toUpperCase().replace(/,/g, '')
  const match = cleanValue.match(/^(\d+\.?\d*)\s*([KMB]?)$/)
  if (!match) return null
  const num = parseFloat(match[1])
  const suffix = match[2]
  if (isNaN(num)) return null
  switch (suffix) {
    case 'K': return num * 1e3
    case 'M': return num * 1e6
    case 'B': return num * 1e9
    default: return num
  }
}

export const FAVORITES_STORAGE_KEY = 'crypto_tracker_favorites'

export function loadFavoritesFromStorage(): FavoriteCoin[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as FavoriteCoin[]) : []
  } catch {
    return []
  }
}

export function saveFavoritesToStorage(favs: FavoriteCoin[]) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favs))
  } catch {
    // ignore storage errors
  }
}

export const ROWS_PER_PAGE = 100

export const defaultTabState = (): TabState => ({
  coins: [],
  loading: true,
  error: null,
  searchTerm: '',
  currentPage: 1,
  sortField: null,
  sortDirection: null,
  hideStablecoins: true,
  showFilters: false,
  minMarketCap: '',
  maxMarketCap: '',
  minVolume: '',
  maxVolume: '',
  minVolMcRatio: '',
  maxVolMcRatio: '',
  min24h: '',
  max24h: '',
  min7d: '',
  max7d: '',
  min14d: '',
  max14d: '',
  min30d: '',
  max30d: '',
  min200d: '',
  max200d: '',
})
