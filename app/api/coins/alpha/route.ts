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
const PAGES = 2
const PER_PAGE = 250
const REQUEST_DELAY_MS = 1500
const MAX_RETRIES = 3
const CATEGORY = 'binance-alpha-spotlight'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchCoinsPage(
  page: number,
  retryCount = 0
): Promise<CoinGeckoMarketData[]> {
  const params = new URLSearchParams({
    vs_currency: 'usd',
    category: CATEGORY,
    price_change_percentage: '7d,14d,30d,200d,1y',
    per_page: PER_PAGE.toString(),
    page: page.toString(),
    order: 'market_cap_desc',
    sparkline: 'false',
  })

  const headers: HeadersInit = {
    Accept: 'application/json',
  }

  if (API_KEY) {
    headers['x-cg-demo-api-key'] = API_KEY
  }

  const url = `${COINGECKO_API_URL}?${params.toString()}`

  const response = await fetch(url, {
    method: 'GET',
    headers,
    next: { revalidate: 60 },
  })

  if (response.status === 429 && retryCount < MAX_RETRIES) {
    const backoffDelay = Math.pow(2, retryCount) * 2000
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

function transformCoin(coin: CoinGeckoMarketData): TransformedCoin {
  const volume = coin.total_volume || 0
  const marketCap = coin.market_cap || 1
  const volume_to_mc_ratio = Math.round((volume / marketCap) * 100) / 100
  return { ...coin, volume_to_mc_ratio }
}

export async function GET() {
  try {
    const pagesData: CoinGeckoMarketData[][] = []

    for (let i = 0; i < PAGES; i++) {
      const pageNum = i + 1
      try {
        const pageData = await fetchCoinsPage(pageNum)
        pagesData.push(pageData)

        if (i < PAGES - 1) {
          await delay(REQUEST_DELAY_MS)
        }
      } catch (pageError) {
        console.error(`[alpha] Failed to fetch page ${pageNum}:`, pageError)
      }
    }

    if (pagesData.length === 0) {
      throw new Error('Failed to fetch any coin data from CoinGecko')
    }

    const allCoins: CoinGeckoMarketData[] = pagesData.flat()
    const transformedCoins = allCoins.map(transformCoin)

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        data: transformedCoins,
        meta: {
          total_coins: allCoins.length,
          pages_fetched: pagesData.length,
          pages_requested: PAGES,
          coins_per_page: PER_PAGE,
          category: CATEGORY,
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
    console.error('[alpha] Error in alpha coins API route:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { success: false, error: errorMessage, timestamp: new Date().toISOString() },
      { status: 500 }
    )
  }
}
