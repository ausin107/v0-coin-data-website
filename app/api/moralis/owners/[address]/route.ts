import { NextResponse } from 'next/server'

const MORALIS_API_URL = 'https://deep-index.moralis.io/api/v2.2/erc20'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params
    if (!address) {
      return NextResponse.json({ error: 'Token address is required' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const chain = searchParams.get('chain') || 'bsc'

    // Extract API key from headers if passed by client
    const apiKeyFromHeader = request.headers.get('X-API-Key') || ''
    const apiKey = apiKeyFromHeader || process.env.MORALIS_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Moralis API Key is missing. Please configure it in Settings.' }, { status: 401 })
    }

    const url = new URL(`${MORALIS_API_URL}/${address}/owners`)
    url.searchParams.append('chain', chain)
    url.searchParams.append('order', 'DESC')

    const headers: HeadersInit = {
      Accept: 'application/json',
      'X-API-Key': apiKey,
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      // Cache ownership data for faster rescans (e.g., 30 mins)
      next: { revalidate: 1800 },
    })

    if (!response.ok) {
      // Trying to parse moralis error message if any
      let rawMsg = response.statusText
      try {
        const d = await response.json()
        if (d.message) rawMsg = d.message
      } catch (e) {
        // ignore
      }
      throw new Error(`Moralis API error: ${response.status} ${rawMsg}`)
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
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      }
    )
  } catch (error) {
    console.error(`[v0] Error in moralis/owners API route:`, error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
