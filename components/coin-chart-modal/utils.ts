export const CHART_COLORS = {
  price: '#3b82f6', // blue-500
  volume: '#8b5cf6', // violet-500
  marketCap: '#10b981', // emerald-500
  volMcRatio: '#f59e0b', // amber-500
  whaleSignal: '#ef4444', // red-500 - whale footprint signal
  // Pump level colors
  pumpTier1: '#22c55e', // green-500 - Tier 1 pump probability (0-35)
  pumpTier2: '#eab308', // yellow-500 - Tier 2 pump probability (40-80)
  pumpTier3: '#ef4444', // red-500 - Tier 3 pump probability (85-115)
  pumpTier4: '#a855f7', // purple-500 - Tier 4 pump probability (120-165)
}

// Pump signal detection algorithm parameters
export const PUMP_DETECTION_CONFIG = {
  SMA_PERIOD: 20, // 20-day Simple Moving Average for volume and V/MC
  // V_Exhaust: Volume exhaustion detection
  V_EXHAUST_THRESHOLD: 0.3, // Volume < 30% of SMA20_Volume
  // P_Squeeze: Price squeeze detection
  P_SQUEEZE_PERIOD: 10, // Number of periods to check for price squeeze
  P_SQUEEZE_THRESHOLD: 6, // Price volatility < 6%
  // Whale_Acc: Whale accumulation detection
  WHALE_VOLUME_SPIKE: 3, // Volume > 3x SMA20_Volume
  WHALE_PRICE_CHANGE_MAX: 10, // |Price Change| < 10%
  // V/MC Ratio spike thresholds (based on SMA20 baseline)
  VMC_MIN_THRESHOLD: 0.10, // Skip if V/MC < 10% (too weak)
  VMC_TIER1_MIN: 2.5, // 2.5x baseline = +15 points (attention)
  VMC_TIER1_MAX: 3.0,
  VMC_TIER1_SCORE: 15,
  VMC_TIER2_MIN: 4.0, // 4x baseline = +25 points (whale alert)
  VMC_TIER2_MAX: 7.0,
  VMC_TIER2_SCORE: 25,
  VMC_TIER3_MIN: 10.0, // >10x baseline = +40 points (super spike)
  VMC_TIER3_SCORE: 40,
  // Recent signal bonus: signal within last N days
  RECENT_SIGNAL_DAYS: 15,
  RECENT_SIGNAL_BONUS: 50,
}

// Format helpers
export const formatPrice = (value: number) => {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
  if (value >= 1) return `$${value.toFixed(2)}`
  return `$${value.toFixed(6)}`
}

export const formatVolume = (value: number) => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

export const formatMarketCap = (value: number) => {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  return `$${value.toFixed(0)}`
}

export const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export const priceVolumeConfig = {
  price: {
    label: 'Price',
    color: CHART_COLORS.price,
  },
  volume: {
    label: 'Volume',
    color: CHART_COLORS.volume,
  },
}

export const marketCapConfig = {
  marketCap: {
    label: 'Market Cap',
    color: CHART_COLORS.marketCap,
  },
  volume: {
    label: 'Volume',
    color: CHART_COLORS.volume,
  },
  volMcRatio: {
    label: 'Vol/MC Ratio',
    color: CHART_COLORS.volMcRatio,
  },
}
