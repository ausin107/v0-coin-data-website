/**
 * API Configuration
 * The CoinGecko API key is now managed server-side in the /api/coins route handler
 * This provides better security and CORS bypass functionality
 */
export const API_CONFIG = {
  // Internal proxy endpoint
  COINS_ENDPOINT: '/api/coins',
  
  // Cache configuration
  CACHE_REVALIDATE: 30, // seconds
  
  // API limits
  MAX_RETRIES: 3,
  TIMEOUT: 30000, // milliseconds
}

// Store API key in localStorage for settings UI only
export const getApiKey = (): string => {
  if (typeof window === 'undefined') {
    return ''
  }
  return localStorage.getItem('COINGECKO_API_KEY') || ''
}

export const setApiKey = (key: string): void => {
  localStorage.setItem('COINGECKO_API_KEY', key)
}

export const clearApiKey = (): void => {
  localStorage.removeItem('COINGECKO_API_KEY')
}
