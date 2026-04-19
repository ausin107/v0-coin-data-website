import { type CoinData } from '@/lib/services/coin-service'

// ─── Scan Data Types ───

export interface TokenOwnershipData {
  owner_address: string
  percentage_relative_to_total_supply: number
  balance_formatted: string
  is_contract: boolean
  entity: string | null
  owner_address_label: string | null
}

export interface CoinScanCache {
  coinId: string
  scannedAt: number
  contractAddress: string | null
  chain: string | null
  owners: TokenOwnershipData[]
}

// ─── Batch Result Types ───

export interface BatchScanResult {
  coinId: string
  coinName: string
  coinSymbol: string
  coinImage: string
  contractAddress: string | null
  chain: string | null
  owners: TokenOwnershipData[]
  fromCache: boolean
  error?: string
}

// ─── Report Types ───

export interface BatchScanReport {
  id: string
  createdAt: number
  filterSnapshot: string
  totalCoins: number
  scannedCoins: number
  failedCoins: number
  cachedCoins: number
  duration: number // seconds
  results: BatchScanResult[]
  highlights: {
    highConcentration: BatchScanResult[] // Top 1 owner has > 10%
    noContract: BatchScanResult[]        // Could not resolve a contract
  }
}

// ─── Batch Scan State ───

export interface BatchScanProgress {
  completed: number
  total: number
  cached: number
  failed: number
}

export interface BatchScanState {
  isRunning: boolean
  isPaused: boolean
  progress: BatchScanProgress
  currentCoin: { id: string; name: string; image: string } | null
  results: BatchScanResult[]
  error: string | null
  startedAt: number | null
  estimatedTimeLeft: number // seconds
}

// ─── Props ───

export interface BatchScanModalProps {
  isOpen: boolean
  onClose: () => void
  coins: CoinData[]
  onOpenReport: (report: BatchScanReport) => void
  filterDescription: string
}

export interface BatchScanReportModalProps {
  isOpen: boolean
  onClose: () => void
  report: BatchScanReport | null
  onCoinClick: (coin: CoinData) => void
}

export interface BatchScanReportHistoryProps {
  onOpenReport: (report: BatchScanReport) => void
}
