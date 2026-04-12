'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
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
import { fetchCoinsFromAPI, type CoinData } from '@/lib/services/coin-service'
import { ApiSettings } from '@/components/api-settings'

// Helper function to get vol/mc ratio color intensity
function getVolMcRatioColor(ratio: number): string {
  // Starting from 0.05, higher ratio = darker/more intense green
  if (ratio < 0.05) return 'bg-muted/50 text-muted-foreground'
  if (ratio < 0.1) return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
  if (ratio < 0.2) return 'bg-emerald-500/40 text-emerald-700 dark:text-emerald-300'
  if (ratio < 0.3) return 'bg-emerald-500/60 text-emerald-800 dark:text-emerald-200'
  if (ratio < 0.5) return 'bg-emerald-500/80 text-emerald-900 dark:text-emerald-100'
  return 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-white'
}

// Helper function to check if a coin is a stablecoin
function isStablecoin(coin: CoinData): boolean {
  const priceNearOne = Math.abs((coin.current_price ?? 0) - 1) < 0.02 // Price around $1
  const lowVolatility24h = Math.abs(coin.price_change_percentage_24h ?? 0) < 0.5 // 24h volatility under 0.5%
  const lowVolatility1y = Math.abs(coin.price_change_percentage_1y_in_currency ?? 0) < 2 // 1 year volatility under 2%
  return priceNearOne && lowVolatility24h && lowVolatility1y
}

// Helper function to remove duplicate coins (same id, symbol, name, and price)
function removeDuplicateCoins(coins: CoinData[]): CoinData[] {
  const seen = new Map<string, CoinData>()
  for (const coin of coins) {
    // Create a unique key based on all important properties
    const key = `${coin.id}-${coin.symbol}-${coin.name}-${coin.current_price}-${coin.market_cap}`
    if (!seen.has(key)) {
      seen.set(key, coin)
    }
  }
  return Array.from(seen.values())
}

// Helper to parse value with K, M, B suffixes
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

export function CoinTracker() {
  const [coins, setCoins] = useState<Coin[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [hideStablecoins, setHideStablecoins] = useState(true)
  const [minMarketCap, setMinMarketCap] = useState('')
  const [maxMarketCap, setMaxMarketCap] = useState('')
  const [minVolume, setMinVolume] = useState('')
  const [maxVolume, setMaxVolume] = useState('')
  const [minVolMcRatio, setMinVolMcRatio] = useState('')
  const [maxVolMcRatio, setMaxVolMcRatio] = useState('')
  const [min24h, setMin24h] = useState('')
  const [max24h, setMax24h] = useState('')
  const [min7d, setMin7d] = useState('')
  const [max7d, setMax7d] = useState('')
  const [min14d, setMin14d] = useState('')
  const [max14d, setMax14d] = useState('')
  const [min30d, setMin30d] = useState('')
  const [max30d, setMax30d] = useState('')
  const [min200d, setMin200d] = useState('')
  const [max200d, setMax200d] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Initialize dark mode from system preference or localStorage
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

  const loadCoins = useCallback(async () => {
    let retries = 0
    const maxRetries = 3
    const delayMs = 1000

    const attemptFetch = async (): Promise<void> => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchCoinsFromAPI()
        setCoins(data)
      } catch (err) {
        retries++
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch coins'

        if (retries < maxRetries) {
          console.log(`[v0] Retry attempt ${retries}/${maxRetries} after ${delayMs}ms`)
          await new Promise((resolve) => setTimeout(resolve, delayMs * retries))
          return attemptFetch()
        }

        console.error('[v0] Error fetching coins after retries:', err)
        setError(
          `Failed to load coins (${errorMessage}). Please check your connection and try again.`
        )
        setCoins([])
      } finally {
        if (retries >= maxRetries || coins.length > 0) {
          setLoading(false)
        }
      }
    }

    await attemptFetch()
  }, [coins.length])

  useEffect(() => {
    loadCoins()
    // Refresh data every 60 seconds
    const interval = setInterval(loadCoins, 60000)
    return () => clearInterval(interval)
  }, [loadCoins])

  const handleApiKeyChange = useCallback(() => {
    loadCoins()
  }, [loadCoins])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: desc -> asc -> null
      if (sortDirection === 'desc') {
        setSortDirection('asc')
      } else if (sortDirection === 'asc') {
        setSortField(null)
        setSortDirection(null)
      } else {
        setSortDirection('desc')
      }
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
    setCurrentPage(1) // Reset to first page when sorting
  }

  const filteredAndSortedCoins = useMemo(() => {
    // First remove duplicates
    let result = removeDuplicateCoins(coins)

    // Filter out stablecoins if enabled
    if (hideStablecoins) {
      result = result.filter((coin) => !isStablecoin(coin))
    }

    // Search filter
    result = result.filter(
      (coin) =>
        coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Market cap filters
    const minMC = parseValueWithSuffix(minMarketCap)
    const maxMC = parseValueWithSuffix(maxMarketCap)
    if (minMC !== null) {
      result = result.filter((coin) => (coin.market_cap ?? 0) >= minMC)
    }
    if (maxMC !== null) {
      result = result.filter((coin) => (coin.market_cap ?? 0) <= maxMC)
    }

    // Volume filters
    const minVol = parseValueWithSuffix(minVolume)
    const maxVol = parseValueWithSuffix(maxVolume)
    if (minVol !== null) {
      result = result.filter((coin) => (coin.total_volume ?? 0) >= minVol)
    }
    if (maxVol !== null) {
      result = result.filter((coin) => (coin.total_volume ?? 0) <= maxVol)
    }

    // Vol/MC ratio filters
    const minRatio = minVolMcRatio ? parseFloat(minVolMcRatio) : null
    const maxRatio = maxVolMcRatio ? parseFloat(maxVolMcRatio) : null
    if (minRatio !== null && !isNaN(minRatio)) {
      result = result.filter((coin) => (coin.volume_to_mc_ratio ?? 0) >= minRatio)
    }
    if (maxRatio !== null && !isNaN(maxRatio)) {
      result = result.filter((coin) => (coin.volume_to_mc_ratio ?? 0) <= maxRatio)
    }

    // Price change percentage filters
    const parsePercent = (val: string) => (val ? parseFloat(val) : null)
    const min24hVal = parsePercent(min24h)
    const max24hVal = parsePercent(max24h)
    const min7dVal = parsePercent(min7d)
    const max7dVal = parsePercent(max7d)
    const min14dVal = parsePercent(min14d)
    const max14dVal = parsePercent(max14d)
    const min30dVal = parsePercent(min30d)
    const max30dVal = parsePercent(max30d)
    const min200dVal = parsePercent(min200d)
    const max200dVal = parsePercent(max200d)

    if (min24hVal !== null && !isNaN(min24hVal)) {
      result = result.filter((coin) => (coin.price_change_percentage_24h ?? -Infinity) >= min24hVal)
    }
    if (max24hVal !== null && !isNaN(max24hVal)) {
      result = result.filter((coin) => (coin.price_change_percentage_24h ?? Infinity) <= max24hVal)
    }
    if (min7dVal !== null && !isNaN(min7dVal)) {
      result = result.filter((coin) => (coin.price_change_percentage_7d_in_currency ?? -Infinity) >= min7dVal)
    }
    if (max7dVal !== null && !isNaN(max7dVal)) {
      result = result.filter((coin) => (coin.price_change_percentage_7d_in_currency ?? Infinity) <= max7dVal)
    }
    if (min14dVal !== null && !isNaN(min14dVal)) {
      result = result.filter((coin) => (coin.price_change_percentage_14d_in_currency ?? -Infinity) >= min14dVal)
    }
    if (max14dVal !== null && !isNaN(max14dVal)) {
      result = result.filter((coin) => (coin.price_change_percentage_14d_in_currency ?? Infinity) <= max14dVal)
    }
    if (min30dVal !== null && !isNaN(min30dVal)) {
      result = result.filter((coin) => (coin.price_change_percentage_30d_in_currency ?? -Infinity) >= min30dVal)
    }
    if (max30dVal !== null && !isNaN(max30dVal)) {
      result = result.filter((coin) => (coin.price_change_percentage_30d_in_currency ?? Infinity) <= max30dVal)
    }
    if (min200dVal !== null && !isNaN(min200dVal)) {
      result = result.filter((coin) => (coin.price_change_percentage_200d_in_currency ?? -Infinity) >= min200dVal)
    }
    if (max200dVal !== null && !isNaN(max200dVal)) {
      result = result.filter((coin) => (coin.price_change_percentage_200d_in_currency ?? Infinity) <= max200dVal)
    }

    // Sort
    if (sortField && sortDirection) {
      result = [...result].sort((a, b) => {
        const aValue = a[sortField] ?? 0
        const bValue = b[sortField] ?? 0
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      })
    }

    return result
  }, [coins, searchTerm, sortField, sortDirection, hideStablecoins, minMarketCap, maxMarketCap, minVolume, maxVolume, minVolMcRatio, maxVolMcRatio, min24h, max24h, min7d, max7d, min14d, max14d, min30d, max30d, min200d, max200d])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, hideStablecoins, minMarketCap, maxMarketCap, minVolume, maxVolume, minVolMcRatio, maxVolMcRatio, min24h, max24h, min7d, max7d, min14d, max14d, min30d, max30d, min200d, max200d])

  const clearFilters = () => {
    setMinMarketCap('')
    setMaxMarketCap('')
    setMinVolume('')
    setMaxVolume('')
    setMinVolMcRatio('')
    setMaxVolMcRatio('')
    setMin24h('')
    setMax24h('')
    setMin7d('')
    setMax7d('')
    setMin14d('')
    setMax14d('')
    setMin30d('')
    setMax30d('')
    setMin200d('')
    setMax200d('')
    setHideStablecoins(true)
  }

  const hasActiveFilters = minMarketCap || maxMarketCap || minVolume || maxVolume || minVolMcRatio || maxVolMcRatio || min24h || max24h || min7d || max7d || min14d || max14d || min30d || max30d || min200d || max200d || !hideStablecoins

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedCoins.length / ROWS_PER_PAGE)
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE
  const endIndex = startIndex + ROWS_PER_PAGE
  const paginatedCoins = filteredAndSortedCoins.slice(startIndex, endIndex)

  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField
    children: React.ReactNode
  }) => {
    const isActive = sortField === field
    return (
      <button
        onClick={() => handleSort(field)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors group"
      >
        {children}
        <span className="ml-1">
          {isActive && sortDirection === 'asc' ? (
            <ArrowUpIcon className="h-3.5 w-3.5 text-primary" />
          ) : isActive && sortDirection === 'desc' ? (
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
      {/* Header with Title and Search */}
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
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center justify-center p-2 rounded-md transition-colors ${showFilters || hasActiveFilters
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
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
                  onClick={loadCoins}
                  disabled={loading}
                  className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                  title="Refresh data"
                >
                  <RefreshCwIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <ApiSettings onApiKeyChange={handleApiKeyChange} />
              </div>
            </div>

            {/* Search and Desktop Actions */}
            <div className="flex items-center gap-2">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-64 sm:flex-none">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search coins..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 sm:pl-10 bg-card/50 border-border/60 focus:border-primary h-9 sm:h-10 text-sm"
                />
              </div>

              {/* Desktop action buttons */}
              <div className="hidden sm:flex items-center gap-1">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center justify-center p-2 rounded-md transition-colors ${showFilters || hasActiveFilters
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
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
                  onClick={loadCoins}
                  disabled={loading}
                  className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                  title="Refresh data"
                >
                  <RefreshCwIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <ApiSettings onApiKeyChange={handleApiKeyChange} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="border-b border-border/40 bg-muted/20">
          <div className="mx-auto max-w-8xl px-3 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4">
              {/* Filter Header */}
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

              {/* Filter Grid */}
              <div className="space-y-4">
                {/* Row 1: Market Cap & Volume */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Min Market Cap</label>
                    <Input
                      type="text"
                      placeholder="e.g. 100M"
                      value={minMarketCap}
                      onChange={(e) => setMinMarketCap(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Max Market Cap</label>
                    <Input
                      type="text"
                      placeholder="e.g. 10B"
                      value={maxMarketCap}
                      onChange={(e) => setMaxMarketCap(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Min Volume</label>
                    <Input
                      type="text"
                      placeholder="e.g. 50M"
                      value={minVolume}
                      onChange={(e) => setMinVolume(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Max Volume</label>
                    <Input
                      type="text"
                      placeholder="e.g. 5B"
                      value={maxVolume}
                      onChange={(e) => setMaxVolume(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Min Vol/MC</label>
                    <Input
                      type="text"
                      placeholder="e.g. 0.1"
                      value={minVolMcRatio}
                      onChange={(e) => setMinVolMcRatio(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Max Vol/MC</label>
                    <Input
                      type="text"
                      placeholder="e.g. 0.5"
                      value={maxVolMcRatio}
                      onChange={(e) => setMaxVolMcRatio(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                </div>

                {/* Row 2: Price Change Filters */}
                <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Min 24h%</label>
                    <Input
                      type="text"
                      placeholder="-10"
                      value={min24h}
                      onChange={(e) => setMin24h(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Max 24h%</label>
                    <Input
                      type="text"
                      placeholder="50"
                      value={max24h}
                      onChange={(e) => setMax24h(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Min 7d%</label>
                    <Input
                      type="text"
                      placeholder="-20"
                      value={min7d}
                      onChange={(e) => setMin7d(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Max 7d%</label>
                    <Input
                      type="text"
                      placeholder="100"
                      value={max7d}
                      onChange={(e) => setMax7d(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Min 14d%</label>
                    <Input
                      type="text"
                      placeholder="-30"
                      value={min14d}
                      onChange={(e) => setMin14d(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Max 14d%</label>
                    <Input
                      type="text"
                      placeholder="150"
                      value={max14d}
                      onChange={(e) => setMax14d(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Min 30d%</label>
                    <Input
                      type="text"
                      placeholder="-50"
                      value={min30d}
                      onChange={(e) => setMin30d(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Max 30d%</label>
                    <Input
                      type="text"
                      placeholder="200"
                      value={max30d}
                      onChange={(e) => setMax30d(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Min 200d%</label>
                    <Input
                      type="text"
                      placeholder="-80"
                      value={min200d}
                      onChange={(e) => setMin200d(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Max 200d%</label>
                    <Input
                      type="text"
                      placeholder="500"
                      value={max200d}
                      onChange={(e) => setMax200d(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                </div>

                {/* Row 3: Toggle & Helper */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hideStablecoins}
                      onChange={(e) => setHideStablecoins(e.target.checked)}
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
        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <p className="font-medium">Error loading coins</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {loading && coins.length === 0 ? (
          <div className="flex h-96 items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Spinner className="h-8 w-8 text-primary" />
              <p className="text-muted-foreground">Loading coin data...</p>
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
                        <SortableHeader field="price_change_percentage_7d_in_currency">
                          7d %
                        </SortableHeader>
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        <SortableHeader field="price_change_percentage_14d_in_currency">
                          14d %
                        </SortableHeader>
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        <SortableHeader field="price_change_percentage_30d_in_currency">
                          30d %
                        </SortableHeader>
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        <SortableHeader field="price_change_percentage_200d_in_currency">
                          200d %
                        </SortableHeader>
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
                      <CoinRow key={`${coin.id}-${startIndex + index}`} coin={coin} index={startIndex + index + 1} />
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
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="gap-1 h-8 px-2 sm:px-3 text-xs sm:text-sm"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                <div className="flex items-center gap-1 px-2">
                  <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                    {currentPage} / {totalPages || 1}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="gap-1 h-8 px-2 sm:px-3 text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Scroll to Top Button */}
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
    </div>
  )
}

function CoinRow({ coin, index }: { coin: Coin; index: number }) {
  const formatPercent = (value: number | undefined) => {
    if (value === undefined || value === null)
      return <span className="text-muted-foreground text-xs sm:text-sm">N/A</span>
    const isPositive = value >= 0
    return (
      <span
        className={`inline-flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}
      >
        {isPositive ? (
          <ArrowUpIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        ) : (
          <ArrowDownIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        )}
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
      <TableCell className="text-center font-medium text-muted-foreground text-xs sm:text-sm">
        {index}
      </TableCell>
      <TableCell className="min-w-[140px] sm:min-w-[180px]">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0 overflow-hidden rounded-full bg-muted">
            {coin.image ? (
              <img
                src={coin.image}
                alt={coin.name}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  const img = e.target as HTMLImageElement
                  img.style.display = 'none'
                }}
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm sm:text-base truncate">{coin.name}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase">{coin.symbol}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right font-semibold text-foreground text-xs sm:text-sm whitespace-nowrap">
        $
        {coin.current_price?.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: coin.current_price < 1 ? 8 : 2,
        }) || 'N/A'}
      </TableCell>
      <TableCell className="text-right">{formatPercent(coin.price_change_percentage_24h)}</TableCell>
      <TableCell className="text-right">
        {formatPercent(coin.price_change_percentage_7d_in_currency)}
      </TableCell>
      <TableCell className="text-right">
        {formatPercent(coin.price_change_percentage_14d_in_currency)}
      </TableCell>
      <TableCell className="text-right">
        {formatPercent(coin.price_change_percentage_30d_in_currency)}
      </TableCell>
      <TableCell className="text-right">
        {formatPercent(coin.price_change_percentage_200d_in_currency)}
      </TableCell>
      <TableCell className="text-right text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">
        {formatMarketCap(coin.market_cap)}
      </TableCell>
      <TableCell className="text-right text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">
        {formatMarketCap(coin.total_volume)}
      </TableCell>
      <TableCell className="text-right">
        <span
          className={`inline-flex items-center justify-center px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold ${getVolMcRatioColor(coin.volume_to_mc_ratio ?? 0)}`}
        >
          {coin.volume_to_mc_ratio?.toFixed(3) ?? 'N/A'}
        </span>
      </TableCell>
    </TableRow>
  )
}
