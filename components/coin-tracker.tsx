'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  SearchIcon,
  TrendingUpIcon,
  RefreshCwIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  MoonIcon,
  SunIcon,
  FilterIcon,
  XIcon,
  ChevronUpIcon,
} from 'lucide-react'
import { fetchCoinsFromAPI, fetchAlphaCoinsFromAPI, type CoinData } from '@/lib/services/coin-service'
import { ApiSettings } from '@/components/api-settings'
import { CoinChartModal } from '@/components/coin-chart-modal'

// Helper function to get vol/mc ratio color intensity
function getVolMcRatioColor(ratio: number): string {
  if (ratio < 0.05) return 'bg-muted/50 text-muted-foreground'
  if (ratio < 0.1) return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
  if (ratio < 0.2) return 'bg-emerald-500/40 text-emerald-700 dark:text-emerald-300'
  if (ratio < 0.3) return 'bg-emerald-500/60 text-emerald-800 dark:text-emerald-200'
  if (ratio < 0.5) return 'bg-emerald-500/80 text-emerald-900 dark:text-emerald-100'
  return 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-white'
}

function isStablecoin(coin: CoinData): boolean {
  const priceNearOne = Math.abs((coin.current_price ?? 0) - 1) < 0.02
  const lowVolatility24h = Math.abs(coin.price_change_percentage_24h ?? 0) < 0.5
  const lowVolatility1y = Math.abs(coin.price_change_percentage_1y_in_currency ?? 0) < 2
  return priceNearOne && lowVolatility24h && lowVolatility1y
}

function removeDuplicateCoins(coins: CoinData[]): CoinData[] {
  const seen = new Map<string, CoinData>()
  for (const coin of coins) {
    const key = `${coin.id}-${coin.symbol}-${coin.name}-${coin.current_price}-${coin.market_cap}`
    if (!seen.has(key)) seen.set(key, coin)
  }
  return Array.from(seen.values())
}

function parseValueWithSuffix(value: string): number | null {
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

type Coin = CoinData
type TabId = 'all' | 'alpha'

type SortField =
  | 'price_change_percentage_24h'
  | 'price_change_percentage_7d_in_currency'
  | 'price_change_percentage_14d_in_currency'
  | 'price_change_percentage_30d_in_currency'
  | 'price_change_percentage_200d_in_currency'
  | 'market_cap'
  | 'total_volume'
  | 'volume_to_mc_ratio'

type SortDirection = 'asc' | 'desc' | null

const ROWS_PER_PAGE = 100

// Per-tab state shape
interface TabState {
  coins: Coin[]
  loading: boolean
  error: string | null
  searchTerm: string
  currentPage: number
  sortField: SortField | null
  sortDirection: SortDirection
  hideStablecoins: boolean
  showFilters: boolean
  minMarketCap: string
  maxMarketCap: string
  minVolume: string
  maxVolume: string
  minVolMcRatio: string
  maxVolMcRatio: string
  min24h: string
  max24h: string
  min7d: string
  max7d: string
  min14d: string
  max14d: string
  min30d: string
  max30d: string
  min200d: string
  max200d: string
}

const defaultTabState = (): TabState => ({
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

export function CoinTracker() {
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [allState, setAllState] = useState<TabState>(defaultTabState())
  const [alphaState, setAlphaState] = useState<TabState>(defaultTabState())

  const [isDarkMode, setIsDarkMode] = useState(false)
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null)
  const [isChartModalOpen, setIsChartModalOpen] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [nextUpdateIn, setNextUpdateIn] = useState<number>(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Cache: track if each tab has been fetched at least once
  const hasFetchedAll = useRef(false)
  const hasFetchedAlpha = useRef(false)
  
  const AUTO_REFRESH_INTERVAL = 60 * 60 * 1000 // 1 hour in milliseconds

  const getState = (tab: TabId) => (tab === 'all' ? allState : alphaState)
  const setState = (tab: TabId, updater: (prev: TabState) => TabState) => {
    if (tab === 'all') setAllState(updater)
    else setAlphaState(updater)
  }

  // Initialize dark mode
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark)
    setIsDarkMode(shouldBeDark)
    document.documentElement.classList.toggle('dark', shouldBeDark)
  }, [])

  const toggleDarkMode = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    document.documentElement.classList.toggle('dark', newMode)
    localStorage.setItem('theme', newMode ? 'dark' : 'light')
  }

  const loadCoins = useCallback(async (tab: TabId, force = false) => {
    // Skip if already fetched and not forced
    if (tab === 'all' && hasFetchedAll.current && !force) return
    if (tab === 'alpha' && hasFetchedAlpha.current && !force) return

    setState(tab, (prev) => ({ ...prev, loading: true, error: null }))

    let retries = 0
    const maxRetries = 3
    const delayMs = 1000

    const attemptFetch = async (): Promise<void> => {
      try {
        const data = tab === 'all'
          ? await fetchCoinsFromAPI()
          : await fetchAlphaCoinsFromAPI()

        setState(tab, (prev) => ({ ...prev, coins: data, loading: false, error: null }))

        if (tab === 'all') hasFetchedAll.current = true
        else hasFetchedAlpha.current = true
        
        setLastUpdated(new Date())
        setNextUpdateIn(AUTO_REFRESH_INTERVAL)
      } catch (err) {
        retries++
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch coins'

        if (retries < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs * retries))
          return attemptFetch()
        }

        setState(tab, (prev) => ({
          ...prev,
          loading: false,
          error: `Failed to load coins (${errorMessage}). Please check your connection and try again.`,
          coins: [],
        }))
      }
    }

    await attemptFetch()
  }, [])

  // Fetch "all" tab on mount and auto-refresh every hour
  useEffect(() => {
    loadCoins('all')
    const interval = setInterval(() => {
      loadCoins('all', true)
      if (hasFetchedAlpha.current) loadCoins('alpha', true)
    }, AUTO_REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [loadCoins])
  
  // Countdown timer for next update
  useEffect(() => {
    if (nextUpdateIn <= 0) return
    const timer = setInterval(() => {
      setNextUpdateIn((prev) => Math.max(0, prev - 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [nextUpdateIn])

  // Fetch "alpha" tab only when first switched to
  useEffect(() => {
    if (activeTab === 'alpha' && !hasFetchedAlpha.current) {
      loadCoins('alpha')
    }
  }, [activeTab, loadCoins])

  const handleApiKeyChange = useCallback(() => {
    hasFetchedAll.current = false
    hasFetchedAlpha.current = false
    loadCoins('all', true)
    if (hasFetchedAlpha.current) loadCoins('alpha', true)
  }, [loadCoins])
  
  // Manual refresh all data
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        loadCoins('all', true),
        hasFetchedAlpha.current ? loadCoins('alpha', true) : Promise.resolve()
      ])
    } finally {
      setIsRefreshing(false)
    }
  }, [loadCoins])
  
  // Format countdown time
  const formatCountdown = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
  }

  const handleCoinClick = useCallback((coin: Coin) => {
    setSelectedCoin(coin)
    setIsChartModalOpen(true)
  }, [])

  const s = getState(activeTab)

  const update = useCallback((tab: TabId, patch: Partial<TabState>) => {
    setState(tab, (prev) => ({ ...prev, ...patch }))
  }, [])

  const handleSort = (field: SortField) => {
    const tab = activeTab
    const { sortField, sortDirection } = getState(tab)
    if (sortField === field) {
      if (sortDirection === 'desc') update(tab, { sortDirection: 'asc', currentPage: 1 })
      else if (sortDirection === 'asc') update(tab, { sortField: null, sortDirection: null, currentPage: 1 })
      else update(tab, { sortDirection: 'desc', currentPage: 1 })
    } else {
      update(tab, { sortField: field, sortDirection: 'desc', currentPage: 1 })
    }
  }

  const clearFilters = () => {
    update(activeTab, {
      minMarketCap: '', maxMarketCap: '',
      minVolume: '', maxVolume: '',
      minVolMcRatio: '', maxVolMcRatio: '',
      min24h: '', max24h: '',
      min7d: '', max7d: '',
      min14d: '', max14d: '',
      min30d: '', max30d: '',
      min200d: '', max200d: '',
      hideStablecoins: true,
    })
  }

  const hasActiveFilters = !!(
    s.minMarketCap || s.maxMarketCap || s.minVolume || s.maxVolume ||
    s.minVolMcRatio || s.maxVolMcRatio || s.min24h || s.max24h ||
    s.min7d || s.max7d || s.min14d || s.max14d ||
    s.min30d || s.max30d || s.min200d || s.max200d || !s.hideStablecoins
  )

  const filteredAndSortedCoins = useMemo(() => {
    let result = removeDuplicateCoins(s.coins)
    if (s.hideStablecoins) result = result.filter((c) => !isStablecoin(c))
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(s.searchTerm.toLowerCase()) ||
        c.symbol.toLowerCase().includes(s.searchTerm.toLowerCase())
    )

    const minMC = parseValueWithSuffix(s.minMarketCap)
    const maxMC = parseValueWithSuffix(s.maxMarketCap)
    if (minMC !== null) result = result.filter((c) => (c.market_cap ?? 0) >= minMC)
    if (maxMC !== null) result = result.filter((c) => (c.market_cap ?? 0) <= maxMC)

    const minVol = parseValueWithSuffix(s.minVolume)
    const maxVol = parseValueWithSuffix(s.maxVolume)
    if (minVol !== null) result = result.filter((c) => (c.total_volume ?? 0) >= minVol)
    if (maxVol !== null) result = result.filter((c) => (c.total_volume ?? 0) <= maxVol)

    const minRatio = s.minVolMcRatio ? parseFloat(s.minVolMcRatio) : null
    const maxRatio = s.maxVolMcRatio ? parseFloat(s.maxVolMcRatio) : null
    if (minRatio !== null && !isNaN(minRatio)) result = result.filter((c) => (c.volume_to_mc_ratio ?? 0) >= minRatio)
    if (maxRatio !== null && !isNaN(maxRatio)) result = result.filter((c) => (c.volume_to_mc_ratio ?? 0) <= maxRatio)

    const p = (v: string) => (v ? parseFloat(v) : null)
    const checks: [string, string, keyof CoinData][] = [
      [s.min24h, s.max24h, 'price_change_percentage_24h'],
      [s.min7d, s.max7d, 'price_change_percentage_7d_in_currency'],
      [s.min14d, s.max14d, 'price_change_percentage_14d_in_currency'],
      [s.min30d, s.max30d, 'price_change_percentage_30d_in_currency'],
      [s.min200d, s.max200d, 'price_change_percentage_200d_in_currency'],
    ]
    for (const [min, max, field] of checks) {
      const minV = p(min); const maxV = p(max)
      if (minV !== null && !isNaN(minV)) result = result.filter((c) => ((c[field] as number) ?? -Infinity) >= minV)
      if (maxV !== null && !isNaN(maxV)) result = result.filter((c) => ((c[field] as number) ?? Infinity) <= maxV)
    }

    if (s.sortField && s.sortDirection) {
      result = [...result].sort((a, b) => {
        const aV = (a[s.sortField!] as number) ?? 0
        const bV = (b[s.sortField!] as number) ?? 0
        return s.sortDirection === 'asc' ? aV - bV : bV - aV
      })
    }

    return result
  }, [s])

  // Reset to page 1 when filters/search change
  useEffect(() => {
    update(activeTab, { currentPage: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    s.searchTerm, s.hideStablecoins,
    s.minMarketCap, s.maxMarketCap, s.minVolume, s.maxVolume,
    s.minVolMcRatio, s.maxVolMcRatio,
    s.min24h, s.max24h, s.min7d, s.max7d,
    s.min14d, s.max14d, s.min30d, s.max30d,
    s.min200d, s.max200d,
  ])

  const totalPages = Math.ceil(filteredAndSortedCoins.length / ROWS_PER_PAGE)
  const startIndex = (s.currentPage - 1) * ROWS_PER_PAGE
  const endIndex = startIndex + ROWS_PER_PAGE
  const paginatedCoins = filteredAndSortedCoins.slice(startIndex, endIndex)

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = s.sortField === field
    return (
      <button
        onClick={() => handleSort(field)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors group"
      >
        {children}
        <span className="ml-1">
          {isActive && s.sortDirection === 'asc' ? (
            <ArrowUpIcon className="h-3.5 w-3.5 text-primary" />
          ) : isActive && s.sortDirection === 'desc' ? (
            <ArrowDownIcon className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ChevronsUpDownIcon className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />
          )}
        </span>
      </button>
    )
  }

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-8xl px-3 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            {/* Logo and Title */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary">
                  <TrendingUpIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
                </div>
                <h1 className="text-xl sm:text-3xl font-bold text-foreground">CryptoTracker</h1>
              </div>
              {/* Mobile action buttons */}
              <div className="flex items-center gap-1 sm:hidden">
                <button
                  onClick={() => update(activeTab, { showFilters: !s.showFilters })}
                  className={`inline-flex items-center justify-center p-2 rounded-md transition-colors ${s.showFilters || hasActiveFilters ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                  title="Filters"
                >
                  <FilterIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={toggleDarkMode}
                  className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  title={isDarkMode ? 'Light mode' : 'Dark mode'}
                >
                  {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                </button>
                <button
                  onClick={handleManualRefresh}
                  disabled={s.loading || isRefreshing}
                  className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                  title="Refresh all data"
                >
                  <RefreshCwIcon className={`h-5 w-5 ${s.loading || isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                <ApiSettings onApiKeyChange={handleApiKeyChange} />
              </div>
            </div>

            {/* Search and Desktop Actions */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64 sm:flex-none">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search coins..."
                  value={s.searchTerm}
                  onChange={(e) => update(activeTab, { searchTerm: e.target.value })}
                  className="pl-9 sm:pl-10 bg-card/50 border-border/60 focus:border-primary h-9 sm:h-10 text-sm"
                />
              </div>
              <div className="hidden sm:flex items-center gap-1">
                <button
                  onClick={() => update(activeTab, { showFilters: !s.showFilters })}
                  className={`inline-flex items-center justify-center p-2 rounded-md transition-colors ${s.showFilters || hasActiveFilters ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                  title="Filters"
                >
                  <FilterIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={toggleDarkMode}
                  className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  title={isDarkMode ? 'Light mode' : 'Dark mode'}
                >
                  {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                </button>
                <button
                  onClick={handleManualRefresh}
                  disabled={s.loading || isRefreshing}
                  className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                  title="Refresh all data"
                >
                  <RefreshCwIcon className={`h-5 w-5 ${s.loading || isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                <ApiSettings onApiKeyChange={handleApiKeyChange} />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="mx-auto max-w-8xl px-3 sm:px-6 lg:px-8">
          <div className="flex gap-0 border-t border-border/40">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              All Coins
            </button>
            <button
              onClick={() => setActiveTab('alpha')}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'alpha'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>Binance Alpha</span>
              <span className="inline-flex items-center rounded-full bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-600 dark:text-yellow-400">
                NEW
              </span>
            </button>
            
            {/* Update Status */}
            <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
              {lastUpdated && (
                <span className="hidden sm:inline">
                  Updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              {nextUpdateIn > 0 && (
                <span className="hidden md:inline">
                  Next update in: {formatCountdown(nextUpdateIn)}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={s.loading || isRefreshing}
                className="h-7 px-2 text-xs gap-1.5"
              >
                <RefreshCwIcon className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {s.showFilters && (
        <div className="border-b border-border/40 bg-muted/20">
          <div className="mx-auto max-w-8xl px-3 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Filters</h3>
                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <XIcon className="h-3 w-3" />
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {/* Row 1: Market Cap & Volume */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Min Market Cap</label>
                    <Input type="text" placeholder="e.g. 100M" value={s.minMarketCap} onChange={(e) => update(activeTab, { minMarketCap: e.target.value })} className="h-8 text-xs bg-background" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Max Market Cap</label>
                    <Input type="text" placeholder="e.g. 10B" value={s.maxMarketCap} onChange={(e) => update(activeTab, { maxMarketCap: e.target.value })} className="h-8 text-xs bg-background" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Min Volume</label>
                    <Input type="text" placeholder="e.g. 50M" value={s.minVolume} onChange={(e) => update(activeTab, { minVolume: e.target.value })} className="h-8 text-xs bg-background" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Max Volume</label>
                    <Input type="text" placeholder="e.g. 5B" value={s.maxVolume} onChange={(e) => update(activeTab, { maxVolume: e.target.value })} className="h-8 text-xs bg-background" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Min Vol/MC</label>
                    <Input type="text" placeholder="e.g. 0.1" value={s.minVolMcRatio} onChange={(e) => update(activeTab, { minVolMcRatio: e.target.value })} className="h-8 text-xs bg-background" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Max Vol/MC</label>
                    <Input type="text" placeholder="e.g. 0.5" value={s.maxVolMcRatio} onChange={(e) => update(activeTab, { maxVolMcRatio: e.target.value })} className="h-8 text-xs bg-background" />
                  </div>
                </div>

                {/* Row 2: Price Change Filters */}
                <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Min 24h%</label>
                    <Input type="text" placeholder="-10" value={s.min24h} onChange={(e) => update(activeTab, { min24h: e.target.value })} className="h-8 text-xs bg-background" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Max 24h%</label>
                    <Input type="text" placeholder="50" value={s.max24h} onChange={(e) => update(activeTab, { max24h: e.target.value })} className="h-8 text-xs bg-background" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Min 7d%</label>
                    <Input type="text" placeholder="-20" value={s.min7d} onChange={(e) => update(activeTab, { min7d: e.target.value })} className="h-8 text-xs bg-background" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Max 7d%</label>
                    <Input type="text" placeholder="100" value={s.max7d} onChange={(e) => update(activeTab, { max7d: e.target.value })} className="h-8 text-xs bg-background" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Min 14d%</label>
                    <Input type="text" placeholder="-30" value={s.min14d} onChange={(e) => update(activeTab, { min14d: e.target.value })} className="h-8 text-xs bg-background" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Max 14d%</label>
                    <Input type="text" placeholder="150" value={s.max14d} onChange={(e) => update(activeTab, { max14d: e.target.value })} className="h-8 text-xs bg-background" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Min 30d%</label>
                    <Input type="text" placeholder="-50" value={s.min30d} onChange={(e) => update(activeTab, { min30d: e.target.value })} className="h-8 text-xs bg-background" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Max 30d%</label>
                    <Input type="text" placeholder="200" value={s.max30d} onChange={(e) => update(activeTab, { max30d: e.target.value })} className="h-8 text-xs bg-background" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Min 200d%</label>
                    <Input type="text" placeholder="-80" value={s.min200d} onChange={(e) => update(activeTab, { min200d: e.target.value })} className="h-8 text-xs bg-background" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Max 200d%</label>
                    <Input type="text" placeholder="500" value={s.max200d} onChange={(e) => update(activeTab, { max200d: e.target.value })} className="h-8 text-xs bg-background" />
                  </div>
                </div>

                {/* Row 3: Toggle & Helper */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s.hideStablecoins}
                      onChange={(e) => update(activeTab, { hideStablecoins: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-xs text-muted-foreground">Hide Stablecoins</span>
                  </label>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Market Cap/Volume: use K, M, B suffixes (e.g. 100M). Price changes: enter percentage values.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table Content */}
      <div className="mx-auto max-w-8xl px-2 py-4 sm:px-6 sm:py-6 lg:px-8">
        {s.error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <p className="font-medium">Error loading coins</p>
            <p className="text-sm">{s.error}</p>
          </div>
        )}

        {s.loading && s.coins.length === 0 ? (
          <div className="flex h-96 items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Spinner className="h-8 w-8 text-primary" />
              <p className="text-muted-foreground">
                {activeTab === 'alpha' ? 'Loading Binance Alpha coins...' : 'Loading coin data...'}
              </p>
            </div>
          </div>
        ) : filteredAndSortedCoins.length === 0 ? (
          <div className="flex h-96 items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">No coins found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search terms</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Table */}
            <div className="rounded-lg border border-border/40 overflow-hidden">
              <div className="overflow-x-auto">
                <Table className="min-w-[1050px]">
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="w-16 text-center font-semibold">#</TableHead>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="text-right font-semibold">Price</TableHead>
                      <TableHead className="text-right font-semibold">
                        <SortableHeader field="price_change_percentage_24h">24h %</SortableHeader>
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        <SortableHeader field="price_change_percentage_7d_in_currency">7d %</SortableHeader>
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        <SortableHeader field="price_change_percentage_14d_in_currency">14d %</SortableHeader>
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        <SortableHeader field="price_change_percentage_30d_in_currency">30d %</SortableHeader>
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        <SortableHeader field="price_change_percentage_200d_in_currency">200d %</SortableHeader>
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        <SortableHeader field="market_cap">Market Cap</SortableHeader>
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        <SortableHeader field="total_volume">Volume (24h)</SortableHeader>
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        <SortableHeader field="volume_to_mc_ratio">Vol/MC</SortableHeader>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCoins.map((coin, index) => (
                      <CoinRow
                        key={`${coin.id}-${startIndex + index}`}
                        coin={coin}
                        index={startIndex + index + 1}
                        onCoinClick={handleCoinClick}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
              <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedCoins.length)} of{' '}
                {filteredAndSortedCoins.length} coins
              </p>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => update(activeTab, { currentPage: Math.max(1, s.currentPage - 1) })}
                  disabled={s.currentPage === 1}
                  className="gap-1 h-8 px-2 sm:px-3 text-xs sm:text-sm"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                <div className="flex items-center gap-1 px-2">
                  <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                    {s.currentPage} / {totalPages || 1}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => update(activeTab, { currentPage: Math.min(totalPages, s.currentPage + 1) })}
                  disabled={s.currentPage >= totalPages}
                  className="gap-1 h-8 px-2 sm:px-3 text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Scroll to Top */}
        <div className="flex justify-center pt-4 pb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="gap-2"
          >
            <ChevronUpIcon className="h-4 w-4" />
            Back to Top
          </Button>
        </div>
      </div>

      {/* Chart Modal */}
      {selectedCoin && (
        <CoinChartModal
          isOpen={isChartModalOpen}
          onClose={() => {
            setIsChartModalOpen(false)
            setSelectedCoin(null)
          }}
          coinId={selectedCoin.id}
          coinName={selectedCoin.name}
          coinSymbol={selectedCoin.symbol}
          coinImage={selectedCoin.image}
          currentPrice={selectedCoin.current_price}
        />
      )}
    </div>
  )
}

function CoinRow({ coin, index, onCoinClick }: { coin: Coin; index: number; onCoinClick: (coin: Coin) => void }) {
  const formatPercent = (value: number | undefined) => {
    if (value === undefined || value === null)
      return <span className="text-muted-foreground text-xs sm:text-sm">N/A</span>
    const isPositive = value >= 0
    return (
      <span className={`inline-flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {isPositive ? <ArrowUpIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : <ArrowDownIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
        {Math.abs(value).toFixed(2)}%
      </span>
    )
  }

  const formatMarketCap = (value: number | undefined) => {
    if (!value) return 'N/A'
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
    return `$${value.toLocaleString()}`
  }

  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell className="text-center font-medium text-muted-foreground text-xs sm:text-sm">{index}</TableCell>
      <TableCell className="min-w-[140px] sm:min-w-[180px]">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0 overflow-hidden rounded-full bg-muted">
            {coin.image ? (
              <img
                src={coin.image}
                alt={coin.name}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => { const img = e.target as HTMLImageElement; img.style.display = 'none' }}
              />
            ) : null}
          </div>
          <button
            onClick={() => onCoinClick(coin)}
            className="min-w-0 text-left hover:opacity-80 transition-opacity group"
          >
            <p className="font-medium text-foreground text-sm sm:text-base truncate group-hover:text-primary transition-colors">{coin.name}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase group-hover:text-primary/70 transition-colors">{coin.symbol}</p>
          </button>
        </div>
      </TableCell>
      <TableCell className="text-right font-semibold text-foreground text-xs sm:text-sm whitespace-nowrap">
        ${coin.current_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: coin.current_price < 1 ? 8 : 2 }) || 'N/A'}
      </TableCell>
      <TableCell className="text-right">{formatPercent(coin.price_change_percentage_24h)}</TableCell>
      <TableCell className="text-right">{formatPercent(coin.price_change_percentage_7d_in_currency)}</TableCell>
      <TableCell className="text-right">{formatPercent(coin.price_change_percentage_14d_in_currency)}</TableCell>
      <TableCell className="text-right">{formatPercent(coin.price_change_percentage_30d_in_currency)}</TableCell>
      <TableCell className="text-right">{formatPercent(coin.price_change_percentage_200d_in_currency)}</TableCell>
      <TableCell className="text-right text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">{formatMarketCap(coin.market_cap)}</TableCell>
      <TableCell className="text-right text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">{formatMarketCap(coin.total_volume)}</TableCell>
      <TableCell className="text-right">
        <span className={`inline-flex items-center justify-center px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold ${getVolMcRatioColor(coin.volume_to_mc_ratio ?? 0)}`}>
          {coin.volume_to_mc_ratio?.toFixed(3) ?? 'N/A'}
        </span>
      </TableCell>
    </TableRow>
  )
}
