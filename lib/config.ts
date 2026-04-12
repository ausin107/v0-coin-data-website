// API Configuration
export const API_CONFIG = {
  BASE_URL: 'https://api.coingecko.com/api/v3',
  ENDPOINTS: {
    MARKETS: '/coins/markets',
  },
  DEFAULT_PARAMS: {
    vs_currency: 'usd',
    price_change_percentage: '7d,14d,30d,200d,1y',
    per_page: 250,
    order: 'market_cap_desc',
    sparkline: false,
    locale: 'en',
  },
}

// Get API key from environment or localStorage
export const getApiKey = (): string => {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_COINGECKO_API_KEY || ''
  }
  return (
    localStorage.getItem('COINGECKO_API_KEY') ||
    process.env.NEXT_PUBLIC_COINGECKO_API_KEY ||
    ''
  )
}

// Set API key in localStorage
export const setApiKey = (key: string): void => {
  localStorage.setItem('COINGECKO_API_KEY', key)
}

// Clear API key
export const clearApiKey = (): void => {
  localStorage.removeItem('COINGECKO_API_KEY')
}
