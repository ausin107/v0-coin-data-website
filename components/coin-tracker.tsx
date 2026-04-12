'use client'

import { useEffect, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { ArrowUpIcon, ArrowDownIcon, SearchIcon, TrendingUpIcon, RefreshCwIcon } from 'lucide-react'
import { fetchCoinsFromAPI, type CoinData } from '@/lib/services/coin-service'
import { ApiSettings } from '@/components/api-settings'

type Coin = CoinData



export function CoinTracker() {
  const [coins, setCoins] = useState<Coin[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)

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
          await new Promise(resolve => setTimeout(resolve, delayMs * retries))
          return attemptFetch()
        }
        
        console.error('[v0] Error fetching coins after retries:', err)
        setError(`Failed to load coins (${errorMessage}). Please check your connection and try again.`)
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

  const filteredCoins = coins.filter(coin =>
    coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Header with Title and Search */}
      <div className="border-b border-border/40">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <TrendingUpIcon className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">CryptoTracker</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* Search Bar */}
              <div className="relative w-64">
                <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search coins..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-card/50 border-border/60 focus:border-primary h-10"
                />
              </div>

              {/* Refresh Button */}
              <button
                onClick={loadCoins}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-card/50 transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCwIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {/* API Settings */}
              <ApiSettings onApiKeyChange={handleApiKeyChange} />
            </div>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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
        ) : filteredCoins.length === 0 ? (
          <div className="flex h-96 items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">No coins found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search terms</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border/40 text-xs font-semibold text-muted-foreground uppercase">
                  <th className="px-4 py-3 text-left w-12">#</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">24h %</th>
                  <th className="px-4 py-3 text-right">7d %</th>
                  <th className="px-4 py-3 text-right">30d %</th>
                  <th className="px-4 py-3 text-right">200d %</th>
                  <th className="px-4 py-3 text-right">Market Cap</th>
                  <th className="px-4 py-3 text-right">Volume (24h)</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoins.map((coin, index) => (
                  <CoinRow key={coin.id} coin={coin} index={index + 1} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function CoinRow({ coin, index }: { coin: Coin; index: number }) {
  const formatPercent = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A'
    const isPositive = value >= 0
    return (
      <div
        className={`inline-flex items-center gap-1 text-sm font-medium ${
          isPositive ? 'text-green-500' : 'text-red-500'
        }`}
      >
        {isPositive ? (
          <ArrowUpIcon className="h-3 w-3" />
        ) : (
          <ArrowDownIcon className="h-3 w-3" />
        )}
        {Math.abs(value).toFixed(2)}%
      </div>
    )
  }

  return (
    <tr className="border-b border-border/20 hover:bg-card/30 transition-colors">
      <td className="px-4 py-4 text-sm font-medium text-muted-foreground">
        {index}
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-muted">
            <img
              src={coin.image}
              alt={coin.name}
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          </div>
          <div>
            <p className="font-medium text-foreground">{coin.name}</p>
            <p className="text-xs text-muted-foreground uppercase">{coin.symbol}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-right font-semibold text-foreground">
        ${coin.current_price?.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: coin.current_price < 1 ? 8 : 2,
        }) || 'N/A'}
      </td>
      <td className="px-4 py-4 text-right">
        {formatPercent(coin.price_change_percentage_24h)}
      </td>
      <td className="px-4 py-4 text-right">
        {formatPercent(coin.price_change_percentage_7d_in_currency)}
      </td>
      <td className="px-4 py-4 text-right">
        {formatPercent(coin.price_change_percentage_30d_in_currency)}
      </td>
      <td className="px-4 py-4 text-right">
        {formatPercent(coin.price_change_percentage_200d_in_currency)}
      </td>
      <td className="px-4 py-4 text-right text-sm font-medium text-foreground">
        {coin.market_cap ? `$${(coin.market_cap / 1e9).toFixed(2)}B` : 'N/A'}
      </td>
      <td className="px-4 py-4 text-right text-sm font-medium text-foreground">
        {coin.total_volume ? `$${(coin.total_volume / 1e9).toFixed(2)}B` : 'N/A'}
      </td>
    </tr>
  )
}
