export interface FavoriteCoin {
  id: string
  symbol: string
  name: string
  image: string
}

/**
 * Fetch live market data for a list of favorite coin ids from CoinGecko
 */
export async function fetchFavoriteCoins(ids: string[]): Promise<CoinData[]> {
  if (!ids.length) return []
  const idsParam = ids.join('%2C')
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${idsParam}&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h%2C7d%2C14d%2C30d%2C200d`
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate: 300 },
  })
  if (!response.ok) throw new Error(`CoinGecko error: ${response.status}`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[] = await response.json()
  return raw.map((c) => ({
    id: c.id,
    symbol: c.symbol,
    name: c.name,
    image: c.image,
    current_price: c.current_price,
    market_cap: c.market_cap,
    market_cap_rank: c.market_cap_rank,
    price_change_percentage_24h: c.price_change_percentage_24h,
    price_change_percentage_7d_in_currency: c.price_change_percentage_7d_in_currency,
    price_change_percentage_14d_in_currency: c.price_change_percentage_14d_in_currency,
    price_change_percentage_30d_in_currency: c.price_change_percentage_30d_in_currency,
    price_change_percentage_200d_in_currency: c.price_change_percentage_200d_in_currency,
    high_24h: c.high_24h,
    low_24h: c.low_24h,
    market_cap_change_percentage_24h: c.market_cap_change_percentage_24h,
    total_volume: c.total_volume,
    circulating_supply: c.circulating_supply,
    max_supply: c.max_supply,
    ath: c.ath,
    atl: c.atl,
    last_updated: c.last_updated,
    volume_to_mc_ratio: c.market_cap > 0 ? c.total_volume / c.market_cap : 0,
  }))
}

export interface CoinData {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  market_cap: number
  market_cap_rank: number
  price_change_percentage_24h: number
  price_change_percentage_7d_in_currency: number
  price_change_percentage_30d_in_currency: number
  price_change_percentage_200d_in_currency: number
  high_24h: number
  low_24h: number
  market_cap_change_percentage_24h: number
  total_volume: number
  circulating_supply: number
  max_supply: number
  ath: number
  atl: number
  last_updated: string
  volume_to_mc_ratio: number
}

interface ApiResponse {
  success: boolean
  data: CoinData[]
  meta: {
    total_coins: number
    filtered_coins: number
    filter_threshold: number
    pages_fetched: number
    coins_per_page: number
  }
  error?: string
  timestamp: string
}

/**
 * Fetch Binance Alpha Spotlight coins from the internal proxy API
 * @returns Promise of transformed coin data array
 */
export async function fetchAlphaCoinsFromAPI(): Promise<CoinData[]> {
  try {
    const response = await fetch('/api/coins/alpha', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const apiResponse: ApiResponse = await response.json()

    if (!apiResponse.success) {
      throw new Error(apiResponse.error || 'Failed to fetch alpha coins')
    }

    return apiResponse.data
  } catch (error) {
    console.error('[v0] Error fetching alpha coins from proxy API:', error)
    throw error
  }
}

/**
 * Fetch cryptocurrency market data from the internal proxy API
 * This route handler performs 6 concurrent fetches from CoinGecko API,
 * calculates volume_to_mc_ratio, and filters coins
 * @returns Promise of filtered and transformed coin data array
 */
export async function fetchCoinsFromAPI(): Promise<CoinData[]> {
  try {
    console.log('[v0] Fetching coins from internal proxy API')

    // Use relative URL for both client and server-side rendering
    const response = await fetch('/api/coins', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const apiResponse: ApiResponse = await response.json()

    if (!apiResponse.success) {
      throw new Error(apiResponse.error || 'Failed to fetch coins')
    }

    console.log(
      '[v0] Successfully fetched',
      apiResponse.data.length,
      'coins from proxy API'
    )
    console.log('[v0] API meta:', apiResponse.meta)

    return apiResponse.data
  } catch (error) {
    console.error('[v0] Error fetching coins from proxy API:', error)
    throw error
  }
}
