import { type CoinData } from '@/lib/services/coin-service'

// ─── Signal Types (shared with chart modal) ───

export interface RecentSignal {
  date: string
  timestamp: number
  pumpScore: number
  pumpLevel: 'tier1' | 'tier2' | 'tier3' | 'tier4'
  signals: {
    vExhaust: boolean
    pSqueeze: boolean
    whaleAcc: boolean
    vmcRatioSpike: number
  }
}

export interface PumpSignalCounts {
  tier1: number
  tier2: number
  tier3: number
  tier4: number
  total: number
  recentTotal: number
}

export interface ChartStats {
  priceChange: number
  highPrice: number
  lowPrice: number
  avgVolume: number
  avgVolMcRatio: number
}

// ─── Cache Types ───

export interface CoinAnalysisCache {
  coinId: string
  analyzedAt: number // Date.now()
  pumpSignalCounts: PumpSignalCounts
  maxPumpScore: number
  maxPumpLevel: 'tier1' | 'tier2' | 'tier3' | 'tier4'
  recentSignals: RecentSignal[]
  stats: ChartStats | null
}

// ─── Batch Result Types ───

export interface BatchCoinResult {
  coinId: string
  coinName: string
  coinSymbol: string
  coinImage: string
  currentPrice: number
  marketCap: number
  maxPumpScore: number
  maxPumpLevel: 'tier1' | 'tier2' | 'tier3' | 'tier4'
  pumpSignalCounts: PumpSignalCounts
  recentSignals: RecentSignal[]
  stats: ChartStats | null
  fromCache: boolean
  error?: string
}

// ─── Report Types ───

export interface BatchReport {
  id: string
  createdAt: number
  filterSnapshot: string
  totalCoins: number
  analyzedCoins: number
  failedCoins: number
  cachedCoins: number
  duration: number // seconds
  results: BatchCoinResult[]
  highlights: {
    highScore: BatchCoinResult[]    // maxPumpScore >= 85
    recentSignals: BatchCoinResult[] // signal within 7 days
    whaleActivity: BatchCoinResult[] // whaleAcc recently
  }
}

// ─── Batch Analysis State ───

export interface BatchAnalysisProgress {
  completed: number
  total: number
  cached: number
  failed: number
}

export interface BatchAnalysisState {
  isRunning: boolean
  isPaused: boolean
  progress: BatchAnalysisProgress
  currentCoin: { id: string; name: string; image: string } | null
  results: BatchCoinResult[]
  error: string | null
  startedAt: number | null
  estimatedTimeLeft: number // seconds
}

// ─── Props ───

export interface BatchAnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  coins: CoinData[]
  onOpenReport: (report: BatchReport) => void
  filterDescription: string
}

export interface BatchReportModalProps {
  isOpen: boolean
  onClose: () => void
  report: BatchReport | null
  onCoinClick: (coin: CoinData) => void
}

export interface BatchReportHistoryProps {
  onOpenReport: (report: BatchReport) => void
}
