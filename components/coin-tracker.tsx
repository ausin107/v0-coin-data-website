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

type Coin = CoinData

type SortField =
  | 'price_change_percentage_24h'
  | 'price_change_percentage_7d_in_currency'
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
    let result = coins.filter(
      (coin) =>
        coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (sortField && sortDirection) {
      result = [...result].sort((a, b) => {
        const aValue = a[sortField] ?? 0
        const bValue = b[sortField] ?? 0
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      })
    }

    return result
  }, [coins, searchTerm, sortField, sortDirection])

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

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
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 lg:px-8">
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

      {/* Table Content */}
      <div className="mx-auto max-w-7xl px-2 py-4 sm:px-6 sm:py-6 lg:px-8">
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
              <Table className="min-w-[900px]">
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
                    <CoinRow key={coin.id} coin={coin} index={startIndex + index + 1} />
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
        className={`inline-flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-medium ${
          isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
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
