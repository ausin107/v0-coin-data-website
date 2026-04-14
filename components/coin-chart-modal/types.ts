export interface MarketChartDataPoint {
  date: string
  timestamp: number
  price: number
  marketCap: number
  volume: number
  volMcRatio: number
}

export interface ProcessedDataPoint extends MarketChartDataPoint {
  sma20Volume: number | null
  priceChangePct: number | null
  isAnomaly: boolean
  volumeRatio: number | null // Volume / SMA_20_Volume
  // Pump Signal Indicators
  vExhaust: boolean // Volume exhaustion signal
  pSqueeze: boolean // Price squeeze signal
  whaleAcc: boolean // Whale accumulation signal
  vmcRatioSpike: number // V/MC ratio spike score (0, 15, 25, or 40)
  vmcBaseline: number | null // SMA20 of V/MC ratio (baseline)
  vmcMultiple: number | null // Current V/MC / Baseline
  recentSignal: boolean // Signal appeared within last 15 days
  pumpScore: number // Total pump score (0-165)
  pumpLevel: 'tier1' | 'tier2' | 'tier3' | 'tier4' // Pump level classification
}

export interface CoinChartModalProps {
  isOpen: boolean
  onClose: () => void
  coinId: string
  coinName: string
  coinSymbol: string
  coinImage?: string
  currentPrice?: number
}

export type ChartType = 'price-volume' | 'marketcap-volume'
