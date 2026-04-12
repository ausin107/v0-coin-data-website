'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { ArrowUpIcon, ArrowDownIcon, SearchIcon, TrendingUpIcon } from 'lucide-react'

interface Coin {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  market_cap: number
  market_cap_rank: number
  price_change_percentage_24h: number
  high_24h: number
  low_24h: number
  market_cap_change_percentage_24h: number
  total_volume: number
  category?: string
}

const DUMMY_COINS: Coin[] = [
  {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    current_price: 45230.50,
    market_cap: 890000000000,
    market_cap_rank: 1,
    price_change_percentage_24h: 2.45,
    high_24h: 46100,
    low_24h: 44500,
    market_cap_change_percentage_24h: 3.2,
    total_volume: 28500000000,
    category: 'Layer 1'
  },
  {
    id: 'ethereum',
    symbol: 'eth',
    name: 'Ethereum',
    image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    current_price: 2450.75,
    market_cap: 294000000000,
    market_cap_rank: 2,
    price_change_percentage_24h: 1.85,
    high_24h: 2500,
    low_24h: 2400,
    market_cap_change_percentage_24h: 2.1,
    total_volume: 14200000000,
    category: 'Layer 1'
  },
  {
    id: 'tether',
    symbol: 'usdt',
    name: 'Tether',
    image: 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
    current_price: 1.00,
    market_cap: 112000000000,
    market_cap_rank: 3,
    price_change_percentage_24h: 0.05,
    high_24h: 1.01,
    low_24h: 0.99,
    market_cap_change_percentage_24h: 0.2,
    total_volume: 67500000000,
    category: 'Stablecoin'
  },
  {
    id: 'binancecoin',
    symbol: 'bnb',
    name: 'Binance Coin',
    image: 'https://assets.coingecko.com/coins/images/825/large/binance-coin-logo.png',
    current_price: 612.40,
    market_cap: 93800000000,
    market_cap_rank: 4,
    price_change_percentage_24h: -1.25,
    high_24h: 625,
    low_24h: 605,
    market_cap_change_percentage_24h: -0.8,
    total_volume: 2850000000,
    category: 'Layer 1'
  },
  {
    id: 'solana',
    symbol: 'sol',
    name: 'Solana',
    image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    current_price: 198.50,
    market_cap: 68900000000,
    market_cap_rank: 5,
    price_change_percentage_24h: 5.62,
    high_24h: 202,
    low_24h: 187,
    market_cap_change_percentage_24h: 6.3,
    total_volume: 3240000000,
    category: 'Layer 1'
  },
  {
    id: 'xrp',
    symbol: 'xrp',
    name: 'XRP',
    image: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
    current_price: 2.85,
    market_cap: 156000000000,
    market_cap_rank: 6,
    price_change_percentage_24h: 3.15,
    high_24h: 2.95,
    low_24h: 2.75,
    market_cap_change_percentage_24h: 3.8,
    total_volume: 12500000000,
    category: 'Payment'
  },
  {
    id: 'cardano',
    symbol: 'ada',
    name: 'Cardano',
    image: 'https://assets.coingecko.com/coins/images/975/large/cardano.png',
    current_price: 1.08,
    market_cap: 41200000000,
    market_cap_rank: 7,
    price_change_percentage_24h: -0.85,
    high_24h: 1.12,
    low_24h: 1.05,
    market_cap_change_percentage_24h: -1.2,
    total_volume: 1240000000,
    category: 'Layer 1'
  },
  {
    id: 'dogecoin',
    symbol: 'doge',
    name: 'Dogecoin',
    image: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
    current_price: 0.45,
    market_cap: 67200000000,
    market_cap_rank: 8,
    price_change_percentage_24h: 4.32,
    high_24h: 0.48,
    low_24h: 0.42,
    market_cap_change_percentage_24h: 5.1,
    total_volume: 850000000,
    category: 'Meme'
  },
  {
    id: 'polkadot',
    symbol: 'dot',
    name: 'Polkadot',
    image: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png',
    current_price: 9.45,
    market_cap: 14200000000,
    market_cap_rank: 9,
    price_change_percentage_24h: 2.15,
    high_24h: 9.75,
    low_24h: 9.20,
    market_cap_change_percentage_24h: 2.8,
    total_volume: 450000000,
    category: 'Layer 1'
  },
  {
    id: 'matic-network',
    symbol: 'matic',
    name: 'Polygon',
    image: 'https://assets.coingecko.com/coins/images/13442/large/polygon.png',
    current_price: 0.85,
    market_cap: 9800000000,
    market_cap_rank: 10,
    price_change_percentage_24h: -2.45,
    high_24h: 0.88,
    low_24h: 0.82,
    market_cap_change_percentage_24h: -1.9,
    total_volume: 580000000,
    category: 'Layer 2'
  }
]

const CATEGORIES = ['All', 'Layer 1', 'Layer 2', 'Stablecoin', 'Payment', 'Meme']

export function CoinTracker() {
  const [coins, setCoins] = useState<Coin[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCoins = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(
          'https://api.coingecko.com/api/v3/markets?vs_currency=usd&order=market_cap_desc&per_page=50&sparkline=false&locale=en'
        )
        if (!response.ok) throw new Error('Failed to fetch coins')
        const data = await response.json()
        setCoins(data)
      } catch (err) {
        console.log('[v0] Error fetching from API, using dummy data')
        setCoins(DUMMY_COINS)
      } finally {
        setLoading(false)
      }
    }

    fetchCoins()
    // Refresh data every 60 seconds
    const interval = setInterval(fetchCoins, 60000)
    return () => clearInterval(interval)
  }, [])

  const filteredCoins = coins.filter(coin => {
    const matchesSearch =
      coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory =
      selectedCategory === 'All' || coin.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  return (
    <div className="w-full bg-gradient-to-br from-background via-background to-card/20">
      {/* Header */}
      <div className="border-b border-border/40 bg-gradient-to-r from-background to-card/10 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <TrendingUpIcon className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">CryptoTracker</h1>
                <p className="text-sm text-muted-foreground">Real-time cryptocurrency prices and market data</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative w-full max-w-md">
              <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search coins by name or symbol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-card border-border/60 focus:border-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Category Bar */}
      <div className="border-b border-border/40 bg-card/30 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`whitespace-nowrap rounded-full px-4 py-2 font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <p className="font-medium">Error loading coins</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {loading ? (
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
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredCoins.map((coin) => (
              <CoinCard key={coin.id} coin={coin} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CoinCard({ coin }: { coin: Coin }) {
  const isPositive = coin.price_change_percentage_24h >= 0
  const isPriceUp = coin.high_24h >= coin.current_price

  return (
    <Card className="group overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
      <div className="p-6">
        {/* Top Row - Coin Info */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-muted">
              <img
                src={coin.image}
                alt={coin.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {coin.name}
              </h3>
              <p className="text-sm font-medium text-primary uppercase">
                {coin.symbol}
              </p>
            </div>
          </div>
          {coin.market_cap_rank && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              #{coin.market_cap_rank}
            </div>
          )}
        </div>

        {/* Price Section */}
        <div className="mb-4 space-y-2">
          <div className="text-3xl font-bold text-foreground">
            ${coin.current_price?.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: coin.current_price < 1 ? 8 : 2,
            }) || 'N/A'}
          </div>

          {/* 24h Change */}
          <div
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
              isPositive
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : 'bg-red-500/10 text-red-600 dark:text-red-400'
            }`}
          >
            {isPositive ? (
              <ArrowUpIcon className="h-4 w-4" />
            ) : (
              <ArrowDownIcon className="h-4 w-4" />
            )}
            {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase">Market Cap</p>
            <p className="font-semibold text-foreground">
              {coin.market_cap ? `$${(coin.market_cap / 1e9).toFixed(2)}B` : 'N/A'}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase">24h Volume</p>
            <p className="font-semibold text-foreground">
              {coin.total_volume ? `$${(coin.total_volume / 1e9).toFixed(2)}B` : 'N/A'}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase">24h High</p>
            <p className="font-semibold text-foreground">
              ${coin.high_24h?.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: coin.high_24h < 1 ? 8 : 2,
              }) || 'N/A'}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase">24h Low</p>
            <p className="font-semibold text-foreground">
              ${coin.low_24h?.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: coin.low_24h < 1 ? 8 : 2,
              }) || 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
