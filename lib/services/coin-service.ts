import { API_CONFIG, getApiKey } from '@/lib/config'

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
}

export interface FetchCoinsOptions {
  apiKey?: string
  limit?: number
  page?: number
}

/**
 * Fetch cryptocurrency market data from CoinGecko API
 * @param options - Optional configuration for the API call
 * @returns Promise of coin data array
 */
export async function fetchCoinsFromAPI(
  options: FetchCoinsOptions = {}
): Promise<CoinData[]> {
  try {
    const apiKey = options.apiKey || getApiKey()
    const limit = options.limit || API_CONFIG.DEFAULT_PARAMS.per_page
    
    const params = new URLSearchParams({
      vs_currency: API_CONFIG.DEFAULT_PARAMS.vs_currency,
      price_change_percentage: API_CONFIG.DEFAULT_PARAMS.price_change_percentage,
      per_page: limit.toString(),
      order: API_CONFIG.DEFAULT_PARAMS.order,
      sparkline: API_CONFIG.DEFAULT_PARAMS.sparkline.toString(),
      locale: API_CONFIG.DEFAULT_PARAMS.locale,
    })

    const headers: Record<string, string> = {}
    
    // Add API key to headers if available
    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey
    }

    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MARKETS}?${params.toString()}`

    console.log('[v0] Fetching coins from API:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data: CoinData[] = await response.json()
    console.log('[v0] Successfully fetched', data.length, 'coins')
    return data
  } catch (error) {
    console.error('[v0] Error fetching coins from API:', error)
    throw error
  }
}
