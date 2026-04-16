import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { fetchCoinsFromAPI, fetchAlphaCoinsFromAPI, fetchFavoriteCoins, type CoinData, type FavoriteCoin } from '@/lib/services/coin-service'
import { TabId, TabState, SortField, Coin } from './types'
import { loadFavoritesFromStorage, saveFavoritesToStorage, defaultTabState, isStablecoin, removeDuplicateCoins, parseValueWithSuffix, ROWS_PER_PAGE } from './utils'
import type { BatchReport } from '@/components/batch-analysis/types'

export function useCoinTracker() {
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [allState, setAllState] = useState<TabState>(defaultTabState())
  const [alphaState, setAlphaState] = useState<TabState>(defaultTabState())
  const [favState, setFavState] = useState<TabState>({ ...defaultTabState(), loading: false })

  // Favorites
  const [favorites, setFavorites] = useState<FavoriteCoin[]>([])
  const [favCoins, setFavCoins] = useState<CoinData[]>([])
  const [favLoading, setFavLoading] = useState(false)
  const [favError, setFavError] = useState<string | null>(null)
  const hasFetchedFavs = useRef(false)

  const [isDarkMode, setIsDarkMode] = useState(false)
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null)
  const [isChartModalOpen, setIsChartModalOpen] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [nextUpdateIn, setNextUpdateIn] = useState<number>(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Batch Analysis
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [activeReport, setActiveReport] = useState<BatchReport | null>(null)

  // Cache: track if each tab has been fetched at least once
  const hasFetchedAll = useRef(false)
  const hasFetchedAlpha = useRef(false)
  
  const AUTO_REFRESH_INTERVAL = 60 * 60 * 1000 // 1 hour in milliseconds

  const getState = useCallback((tab: TabId) => {
    if (tab === 'alpha') return alphaState
    if (tab === 'favorites') return favState
    return allState
  }, [alphaState, allState, favState])

  const setState = useCallback((tab: TabId, updater: (prev: TabState) => TabState) => {
    if (tab === 'alpha') setAlphaState(updater)
    else if (tab === 'favorites') setFavState(updater)
    else setAllState(updater)
  }, [])

  // Initialize dark mode + load favorites from storage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark)
    setIsDarkMode(shouldBeDark)
    document.documentElement.classList.toggle('dark', shouldBeDark)
    setFavorites(loadFavoritesFromStorage())
  }, [])

  // Toggle a coin in favorites
  const toggleFavorite = useCallback((coin: CoinData) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === coin.id)
      const next = exists
        ? prev.filter((f) => f.id !== coin.id)
        : [...prev, { id: coin.id, symbol: coin.symbol, name: coin.name, image: coin.image }]
      saveFavoritesToStorage(next)
      return next
    })
    // Reset fetch flag so favorites tab re-fetches fresh data
    hasFetchedFavs.current = false
  }, [])

  const isFavorited = useCallback((coinId: string) => favorites.some((f) => f.id === coinId), [favorites])

  // Fetch live data for favorites
  const loadFavorites = useCallback(async (force = false) => {
    if (hasFetchedFavs.current && !force) return
    if (favorites.length === 0) { setFavCoins([]); return }
    setFavLoading(true)
    setFavError(null)
    try {
      const data = await fetchFavoriteCoins(favorites.map((f) => f.id))
      setFavCoins(data)
      hasFetchedFavs.current = true
    } catch (err) {
      setFavError(err instanceof Error ? err.message : 'Failed to load favorites')
    } finally {
      setFavLoading(false)
    }
  }, [favorites])

  // Fetch favorites when tab is active or favorites list changes
  useEffect(() => {
    if (activeTab === 'favorites') {
      hasFetchedFavs.current = false
      loadFavorites()
    }
  }, [activeTab, favorites, loadFavorites])

  const toggleDarkMode = useCallback(() => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    document.documentElement.classList.toggle('dark', newMode)
    localStorage.setItem('theme', newMode ? 'dark' : 'light')
  }, [isDarkMode])

  const loadCoins = useCallback(async (tab: TabId, force = false) => {
    // Skip if already fetched and not forced
    if (tab === 'all' && hasFetchedAll.current && !force) return
    if (tab === 'alpha' && hasFetchedAlpha.current && !force) return

    setState(tab, (prev) => ({ ...prev, loading: true, error: null }))

    let retries = 0
    const maxRetries = 3
    const delayMs = 1000

    const attemptFetch = async (): Promise<void> => {
      try {
        const data = tab === 'all'
          ? await fetchCoinsFromAPI()
          : await fetchAlphaCoinsFromAPI()

        setState(tab, (prev) => ({ ...prev, coins: data, loading: false, error: null }))

        if (tab === 'all') hasFetchedAll.current = true
        else hasFetchedAlpha.current = true
        
        setLastUpdated(new Date())
        setNextUpdateIn(AUTO_REFRESH_INTERVAL)
      } catch (err) {
        retries++
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch coins'

        if (retries < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs * retries))
          return attemptFetch()
        }

        setState(tab, (prev) => ({
          ...prev,
          loading: false,
          error: `Failed to load coins (${errorMessage}). Please check your connection and try again.`,
          coins: [],
        }))
      }
    }

    await attemptFetch()
  }, [setState, AUTO_REFRESH_INTERVAL])

  // Fetch "all" tab on mount and auto-refresh every hour
  useEffect(() => {
    loadCoins('all')
    const interval = setInterval(() => {
      loadCoins('all', true)
      if (hasFetchedAlpha.current) loadCoins('alpha', true)
    }, AUTO_REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [loadCoins, AUTO_REFRESH_INTERVAL])
  
  // Countdown timer for next update
  useEffect(() => {
    if (nextUpdateIn <= 0) return
    const timer = setInterval(() => {
      setNextUpdateIn((prev) => Math.max(0, prev - 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [nextUpdateIn])

  // Fetch "alpha" tab only when first switched to
  useEffect(() => {
    if (activeTab === 'alpha' && !hasFetchedAlpha.current) {
      loadCoins('alpha')
    }
  }, [activeTab, loadCoins])

  const handleApiKeyChange = useCallback(() => {
    hasFetchedAll.current = false
    hasFetchedAlpha.current = false
    loadCoins('all', true)
    if (hasFetchedAlpha.current) loadCoins('alpha', true)
  }, [loadCoins])
  
  // Manual refresh all data
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        loadCoins('all', true),
        hasFetchedAlpha.current ? loadCoins('alpha', true) : Promise.resolve(),
        activeTab === 'favorites' ? loadFavorites(true) : Promise.resolve(),
      ])
    } finally {
      setIsRefreshing(false)
    }
  }, [loadCoins, loadFavorites, activeTab])

  const handleCoinClick = useCallback((coin: Coin) => {
    setSelectedCoin(coin)
    setIsChartModalOpen(true)
  }, [])

  const s = getState(activeTab)

  const update = useCallback((tab: TabId, patch: Partial<TabState>) => {
    setState(tab, (prev) => ({ ...prev, ...patch }))
  }, [setState])

  const handleSort = useCallback((field: SortField) => {
    const tab = activeTab
    const { sortField, sortDirection } = getState(tab)
    if (sortField === field) {
      if (sortDirection === 'desc') update(tab, { sortDirection: 'asc', currentPage: 1 })
      else if (sortDirection === 'asc') update(tab, { sortField: null, sortDirection: null, currentPage: 1 })
      else update(tab, { sortDirection: 'desc', currentPage: 1 })
    } else {
      update(tab, { sortField: field, sortDirection: 'desc', currentPage: 1 })
    }
  }, [activeTab, getState, update])

  const clearFilters = useCallback(() => {
    update(activeTab, {
      minMarketCap: '', maxMarketCap: '',
      minVolume: '', maxVolume: '',
      minVolMcRatio: '', maxVolMcRatio: '',
      min24h: '', max24h: '',
      min7d: '', max7d: '',
      min14d: '', max14d: '',
      min30d: '', max30d: '',
      min200d: '', max200d: '',
      hideStablecoins: true,
    })
  }, [activeTab, update])

  const hasActiveFilters = !!(
    s.minMarketCap || s.maxMarketCap || s.minVolume || s.maxVolume ||
    s.minVolMcRatio || s.maxVolMcRatio || s.min24h || s.max24h ||
    s.min7d || s.max7d || s.min14d || s.max14d ||
    s.min30d || s.max30d || s.min200d || s.max200d || !s.hideStablecoins
  )

  // Shared filter+sort pipeline — works for any source array + TabState
  const applyFilterAndSort = useCallback((sourceCoins: CoinData[], state: TabState): CoinData[] => {
    let result = removeDuplicateCoins(sourceCoins)
    if (state.hideStablecoins) result = result.filter((c) => !isStablecoin(c))
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        c.symbol.toLowerCase().includes(state.searchTerm.toLowerCase())
    )

    const minMC = parseValueWithSuffix(state.minMarketCap)
    const maxMC = parseValueWithSuffix(state.maxMarketCap)
    if (minMC !== null) result = result.filter((c) => (c.market_cap ?? 0) >= minMC)
    if (maxMC !== null) result = result.filter((c) => (c.market_cap ?? 0) <= maxMC)

    const minVol = parseValueWithSuffix(state.minVolume)
    const maxVol = parseValueWithSuffix(state.maxVolume)
    if (minVol !== null) result = result.filter((c) => (c.total_volume ?? 0) >= minVol)
    if (maxVol !== null) result = result.filter((c) => (c.total_volume ?? 0) <= maxVol)

    const minRatio = state.minVolMcRatio ? parseFloat(state.minVolMcRatio) : null
    const maxRatio = state.maxVolMcRatio ? parseFloat(state.maxVolMcRatio) : null
    if (minRatio !== null && !isNaN(minRatio)) result = result.filter((c) => (c.volume_to_mc_ratio ?? 0) >= minRatio)
    if (maxRatio !== null && !isNaN(maxRatio)) result = result.filter((c) => (c.volume_to_mc_ratio ?? 0) <= maxRatio)

    const p = (v: string) => (v ? parseFloat(v) : null)
    const checks: [string, string, keyof CoinData][] = [
      [state.min24h, state.max24h, 'price_change_percentage_24h'],
      [state.min7d, state.max7d, 'price_change_percentage_7d_in_currency'],
      [state.min14d, state.max14d, 'price_change_percentage_14d_in_currency'],
      [state.min30d, state.max30d, 'price_change_percentage_30d_in_currency'],
      [state.min200d, state.max200d, 'price_change_percentage_200d_in_currency'],
    ]
    for (const [min, max, field] of checks) {
      const minV = p(min); const maxV = p(max)
      if (minV !== null && !isNaN(minV)) result = result.filter((c) => ((c[field] as number) ?? -Infinity) >= minV)
      if (maxV !== null && !isNaN(maxV)) result = result.filter((c) => ((c[field] as number) ?? Infinity) <= maxV)
    }

    if (state.sortField && state.sortDirection) {
      result = [...result].sort((a, b) => {
        const aV = (a[state.sortField!] as number) ?? 0
        const bV = (b[state.sortField!] as number) ?? 0
        return state.sortDirection === 'asc' ? aV - bV : bV - aV
      })
    }

    return result
  }, [])

  // For non-favorites tabs: filter s.coins
  const filteredAndSortedCoins = useMemo(
    () => applyFilterAndSort(s.coins, s),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s]
  )

  // For favorites tab: filter favCoins through favState pipeline
  const favFilteredAndSortedCoins = useMemo(
    () => applyFilterAndSort(favCoins, favState),
    [favCoins, favState, applyFilterAndSort]
  )

  // The coins to actually display (unified for all tabs)
  const displayedFilteredCoins = activeTab === 'favorites' ? favFilteredAndSortedCoins : filteredAndSortedCoins

  // Reset to page 1 when filters/search change
  useEffect(() => {
    update(activeTab, { currentPage: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    s.searchTerm, s.hideStablecoins,
    s.minMarketCap, s.maxMarketCap, s.minVolume, s.maxVolume,
    s.minVolMcRatio, s.maxVolMcRatio,
    s.min24h, s.max24h, s.min7d, s.max7d,
    s.min14d, s.max14d, s.min30d, s.max30d,
    s.min200d, s.max200d,
  ])

  const totalPages = Math.ceil(displayedFilteredCoins.length / ROWS_PER_PAGE)
  const startIndex = (s.currentPage - 1) * ROWS_PER_PAGE
  const endIndex = startIndex + ROWS_PER_PAGE
  const paginatedCoins = displayedFilteredCoins.slice(startIndex, endIndex)

  // Generate a human-readable filter description
  const filterDescription = useMemo(() => {
    const parts: string[] = []
    if (s.minMarketCap || s.maxMarketCap) parts.push(`MCap: ${s.minMarketCap || '*'}-${s.maxMarketCap || '*'}`)
    if (s.minVolume || s.maxVolume) parts.push(`Vol: ${s.minVolume || '*'}-${s.maxVolume || '*'}`)
    if (s.minVolMcRatio || s.maxVolMcRatio) parts.push(`V/MC: ${s.minVolMcRatio || '*'}-${s.maxVolMcRatio || '*'}`)
    if (s.min24h || s.max24h) parts.push(`24h: ${s.min24h || '*'}-${s.max24h || '*'}%`)
    if (s.min7d || s.max7d) parts.push(`7d: ${s.min7d || '*'}-${s.max7d || '*'}%`)
    if (s.searchTerm) parts.push(`Search: "${s.searchTerm}"`)
    const desc = parts.length > 0 ? parts.join(' · ') : 'No filters'
    return `${displayedFilteredCoins.length} coins (${activeTab}) — ${desc}`
  }, [s, displayedFilteredCoins.length, activeTab])

  // Open coin chart from batch report
  const openCoinFromReport = useCallback((coinId: string, coinName: string, coinSymbol: string, coinImage: string, currentPrice: number) => {
    setSelectedCoin({
      id: coinId,
      name: coinName,
      symbol: coinSymbol,
      image: coinImage,
      current_price: currentPrice,
    } as Coin)
    setIsChartModalOpen(true)
  }, [])

  // Open a batch report
  const handleOpenReport = useCallback((report: BatchReport) => {
    setActiveReport(report)
    setIsReportModalOpen(true)
  }, [])

  return {
    activeTab,
    setActiveTab,
    favorites,
    favCoins,
    favLoading,
    favError,
    isDarkMode,
    toggleDarkMode,
    selectedCoin,
    setSelectedCoin,
    isChartModalOpen,
    setIsChartModalOpen,
    lastUpdated,
    nextUpdateIn,
    isRefreshing,
    s,
    update,
    handleSort,
    clearFilters,
    hasActiveFilters,
    totalPages,
    startIndex,
    endIndex,
    filteredAndSortedCoins: displayedFilteredCoins,
    paginatedCoins,
    handleManualRefresh,
    handleApiKeyChange,
    handleCoinClick,
    toggleFavorite,
    isFavorited,
    // Batch analysis
    isBatchModalOpen,
    setIsBatchModalOpen,
    isReportModalOpen,
    setIsReportModalOpen,
    activeReport,
    setActiveReport,
    filterDescription,
    openCoinFromReport,
    handleOpenReport,
  }
}
