import { Button } from '@/components/ui/button'
import { StarIcon, RefreshCwIcon } from 'lucide-react'
import { TabId } from './types'
import { FavoriteCoin } from '@/lib/services/coin-service'

interface TabBarProps {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
  favorites: FavoriteCoin[]
  lastUpdated: Date | null
  nextUpdateIn: number
  isRefreshing: boolean
  isLoading: boolean
  handleManualRefresh: () => void
}

export function TabBar({
  activeTab,
  setActiveTab,
  favorites,
  lastUpdated,
  nextUpdateIn,
  isRefreshing,
  isLoading,
  handleManualRefresh,
}: TabBarProps) {
  // Format countdown time
  const formatCountdown = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
  }

  return (
    <div className="flex gap-0 border-t border-border/40">
      <button
        onClick={() => setActiveTab('all')}
        className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
          activeTab === 'all'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        All Coins
      </button>
      <button
        onClick={() => setActiveTab('alpha')}
        className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
          activeTab === 'alpha'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        <span>Binance Alpha</span>
        <span className="inline-flex items-center rounded-full bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-600 dark:text-yellow-400">
          NEW
        </span>
      </button>
      <button
        onClick={() => setActiveTab('favorites')}
        className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
          activeTab === 'favorites'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        <StarIcon className="h-3.5 w-3.5" />
        <span>Favorites</span>
        {favorites.length > 0 && (
          <span className="inline-flex items-center justify-center rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            {favorites.length}
          </span>
        )}
      </button>

      {/* Update Status */}
      <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
        {lastUpdated && (
          <span className="hidden sm:inline">
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
        {nextUpdateIn > 0 && (
          <span className="hidden md:inline">
            Next update in: {formatCountdown(nextUpdateIn)}
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRefresh}
          disabled={isLoading || isRefreshing}
          className="h-7 px-2 text-xs gap-1.5"
        >
          <RefreshCwIcon className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </Button>
      </div>
    </div>
  )
}
