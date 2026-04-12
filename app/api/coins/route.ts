import { NextResponse } from 'next/server'

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
const REQUEST_DELAY_MS = 1500 // Delay between requests to avoid rate limiting
const MAX_RETRIES = 3

/**
 * Helper to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Fetch coins from CoinGecko API with pagination and retry logic
 * @param page - Page number (1-indexed)
 * @param retryCount - Current retry attempt
 * @returns Array of coin market data
 */
async function fetchCoinsPage(
  page: number,
  retryCount = 0
): Promise<CoinGeckoMarketData[]> {
  const params = new URLSearchParams({
    vs_currency: 'usd',
    price_change_percentage: '7d,14d,30d,200d,1y',
    per_page: PER_PAGE.toString(),
    page: page.toString(),
    order: 'market_cap_desc',
    sparkline: 'false',
  })

  const headers: HeadersInit = {
    Accept: 'application/json',
  }

  // Add API key to headers if available
  if (API_KEY) {
    headers['x-cg-demo-api-key'] = API_KEY
  }

  const url = `${COINGECKO_API_URL}?${params.toString()}`

  const response = await fetch(url, {
    method: 'GET',
    headers,
    // Cache for 60 seconds to reduce API calls
    next: { revalidate: 60 },
  })

  // Handle rate limiting with exponential backoff
  if (response.status === 429 && retryCount < MAX_RETRIES) {
    const backoffDelay = Math.pow(2, retryCount) * 2000 // 2s, 4s, 8s
    console.log(
      `[v0] Rate limited on page ${page}, retrying in ${backoffDelay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`
    )
    await delay(backoffDelay)
    return fetchCoinsPage(page, retryCount + 1)
  }

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

export async function GET() {
  try {
    console.log('[v0] Starting sequential API calls for 6 pages...')

    // Fetch pages sequentially with delay to avoid rate limiting
    const pagesData: CoinGeckoMarketData[][] = []

    for (let i = 0; i < PAGES; i++) {
      const pageNum = i + 1
      console.log(`[v0] Fetching page ${pageNum}/${PAGES}...`)

      try {
        const pageData = await fetchCoinsPage(pageNum)
        pagesData.push(pageData)
        console.log(`[v0] Page ${pageNum} fetched: ${pageData.length} coins`)

        // Add delay between requests (except after the last one)
        if (i < PAGES - 1) {
          await delay(REQUEST_DELAY_MS)
        }
      } catch (pageError) {
        console.error(`[v0] Failed to fetch page ${pageNum}:`, pageError)
        // Continue with remaining pages even if one fails
      }
    }

    // If no pages were fetched successfully, throw an error
    if (pagesData.length === 0) {
      throw new Error('Failed to fetch any coin data from CoinGecko')
    }

    console.log(`[v0] Successfully fetched ${pagesData.length}/${PAGES} pages`)

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
          pages_fetched: pagesData.length,
          pages_requested: PAGES,
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
