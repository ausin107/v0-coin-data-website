import { NextRequest, NextResponse } from 'next/server'

interface CoinGeckoMarketData {
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
  total_volume: number
  price_change_percentage_7d_in_currency?: number
  price_change_percentage_14d_in_currency?: number
  price_change_percentage_30d_in_currency?: number
  price_change_percentage_200d_in_currency?: number
  price_change_percentage_1y_in_currency?: number
}

interface TransformedCoin extends CoinGeckoMarketData {
  volume_to_mc_ratio: number
}

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/coins/markets'
const API_KEY = process.env.COINGECKO_API_KEY
const PAGES = 6
const PER_PAGE = 250
const MIN_VOLUME_MC_RATIO = 0.05

/**
 * Fetch coins from CoinGecko API with pagination
 * @param page - Page number (1-indexed)
 * @returns Array of coin market data
 */
async function fetchCoinsPage(page: number): Promise<CoinGeckoMarketData[]> {
  const params = new URLSearchParams({
    vs_currency: 'usd',
    price_change_percentage: '7d,14d,30d,200d,1y',
    per_page: PER_PAGE.toString(),
    page: page.toString(),
    order: 'market_cap_desc',
    sparkline: 'false',
  })

  const headers: HeadersInit = {
    'Accept': 'application/json',
  }

  // Add API key to headers if available
  if (API_KEY) {
    headers['x-cg-demo-api-key'] = API_KEY
  }

  const url = `${COINGECKO_API_URL}?${params.toString()}`

  const response = await fetch(url, {
    method: 'GET',
    headers,
    // Cache for 30 seconds to reduce API calls
    next: { revalidate: 30 },
  })

  if (!response.ok) {
    throw new Error(
      `CoinGecko API error: ${response.status} ${response.statusText}`
    )
  }

  const data = await response.json()
  return data
}

/**
 * Calculate volume to market cap ratio
 * @param coin - Coin data
 * @returns Coin with calculated ratio
 */
function transformCoin(coin: CoinGeckoMarketData): TransformedCoin {
  const volume = coin.total_volume || 0
  const marketCap = coin.market_cap || 1 // Prevent division by zero

  // Calculate ratio and round to 2 decimal places
  const volume_to_mc_ratio = Math.round((volume / marketCap) * 100) / 100

  return {
    ...coin,
    volume_to_mc_ratio,
  }
}

/**
 * Filter coins based on volume to market cap ratio
 * @param coins - Array of transformed coins
 * @returns Filtered coins
 */
function filterCoins(coins: TransformedCoin[]): TransformedCoin[] {
  return coins.filter((coin) => coin.volume_to_mc_ratio > MIN_VOLUME_MC_RATIO)
}

export async function GET(request: NextRequest) {
  try {
    console.log('[v0] Starting concurrent API calls for 6 pages...')

    // Create concurrent fetch promises for all pages
    const pagePromises = Array.from({ length: PAGES }, (_, i) =>
      fetchCoinsPage(i + 1)
    )

    // Execute all requests concurrently
    const pagesData = await Promise.all(pagePromises)

    console.log('[v0] All pages fetched successfully')

    // Merge all pages into a single array
    const allCoins: CoinGeckoMarketData[] = pagesData.flat()
    console.log(`[v0] Total coins fetched: ${allCoins.length}`)

    // Transform coins (add volume_to_mc_ratio)
    const transformedCoins = allCoins.map(transformCoin)

    // Filter coins based on volume_to_mc_ratio threshold
    const filteredCoins = filterCoins(transformedCoins)
    console.log(
      `[v0] Coins after filtering (ratio > ${MIN_VOLUME_MC_RATIO}): ${filteredCoins.length}`
    )

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        data: filteredCoins,
        meta: {
          total_coins: allCoins.length,
          filtered_coins: filteredCoins.length,
          filter_threshold: MIN_VOLUME_MC_RATIO,
          pages_fetched: PAGES,
          coins_per_page: PER_PAGE,
        },
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    )
  } catch (error) {
    console.error('[v0] Error in coins API route:', error)

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
