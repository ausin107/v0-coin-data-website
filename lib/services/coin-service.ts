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
 * Fetch cryptocurrency market data from the internal proxy API
 * This route handler performs 6 concurrent fetches from CoinGecko API,
 * calculates volume_to_mc_ratio, and filters coins
 * @returns Promise of filtered and transformed coin data array
 */
export async function fetchCoinsFromAPI(): Promise<CoinData[]> {
  try {
    console.log('[v0] Fetching coins from internal proxy API')

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/coins`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Revalidate cache every 30 seconds
      next: { revalidate: 30 },
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
