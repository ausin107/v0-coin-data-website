import { NextResponse } from 'next/server'

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/coins'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Coin ID is required' }, { status: 400 })
    }

    // Extract API key from headers if passed by client
    const apiKeyFromHeader = request.headers.get('x-cg-demo-api-key') || ''
    const apiKey = apiKeyFromHeader || process.env.COINGECKO_API_KEY

    const url = new URL(`${COINGECKO_API_URL}/${id}`)
    url.searchParams.append('localization', 'false')
    url.searchParams.append('tickers', 'false')
    url.searchParams.append('community_data', 'false')
    url.searchParams.append('developer_data', 'false')
    url.searchParams.append('market_data', 'false')

    const headers: HeadersInit = {
      Accept: 'application/json',
    }

    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      // Cache details for an hour to reduce rate limits
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    return NextResponse.json(
      {
        success: true,
        data,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    )
  } catch (error) {
    console.error(`[v0] Error in coins/[id] API route:`, error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
