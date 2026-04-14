import { type CoinData, type FavoriteCoin } from '@/lib/services/coin-service'

export type Coin = CoinData
export type TabId = 'all' | 'alpha' | 'favorites'

export type SortField =
  | 'price_change_percentage_24h'
  | 'price_change_percentage_7d_in_currency'
  | 'price_change_percentage_14d_in_currency'
  | 'price_change_percentage_30d_in_currency'
  | 'price_change_percentage_200d_in_currency'
  | 'market_cap'
  | 'total_volume'
  | 'volume_to_mc_ratio'

export type SortDirection = 'asc' | 'desc' | null

export interface TabState {
  coins: Coin[]
  loading: boolean
  error: string | null
  searchTerm: string
  currentPage: number
  sortField: SortField | null
  sortDirection: SortDirection
  hideStablecoins: boolean
  showFilters: boolean
  minMarketCap: string
  maxMarketCap: string
  minVolume: string
  maxVolume: string
  minVolMcRatio: string
  maxVolMcRatio: string
  min24h: string
  max24h: string
  min7d: string
  max7d: string
  min14d: string
  max14d: string
  min30d: string
  max30d: string
  min200d: string
  max200d: string
}
