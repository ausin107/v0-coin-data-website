import { NextRequest, NextResponse } from 'next/server'

interface MarketChartData {
  prices: [number, number][]
  market_caps: [number, number][]
  total_volumes: [number, number][]
}

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/coins'
const API_KEY = process.env.COINGECKO_API_KEY

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Coin ID is required' },
        { status: 400 }
      )
    }

    const headers: HeadersInit = {
      Accept: 'application/json',
    }

    if (API_KEY) {
      headers['x-cg-demo-api-key'] = API_KEY
    }

    const url = `${COINGECKO_API_URL}/${id}/market_chart?vs_currency=usd&days=180&interval=daily`

    const response = await fetch(url, {
      method: 'GET',
      headers,
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      if (response.status === 429) {
        return NextResponse.json(
          { success: false, error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const data: MarketChartData = await response.json()

    // Transform data for easier use in charts
    const transformedData = data.prices.map((price, index) => {
      const timestamp = price[0]
      const priceValue = price[1]
      const marketCap = data.market_caps[index]?.[1] ?? 0
      const volume = data.total_volumes[index]?.[1] ?? 0
      const volMcRatio = marketCap > 0 ? volume / marketCap : 0

      return {
        date: new Date(timestamp).toISOString().split('T')[0],
        timestamp,
        price: priceValue,
        marketCap,
        volume,
        volMcRatio,
      }
    })

    return NextResponse.json(
      {
        success: true,
        data: transformedData,
        raw: data,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error) {
    console.error('[v0] Error fetching market chart:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch market chart data',
      },
      { status: 500 }
    )
  }
}
