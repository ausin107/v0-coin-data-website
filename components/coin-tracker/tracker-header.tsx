import { Input } from '@/components/ui/input'
import { TrendingUpIcon, FilterIcon, MoonIcon, SunIcon, RefreshCwIcon, SearchIcon, ZapIcon } from 'lucide-react'
import { ApiSettings } from '@/components/api-settings'
import { BatchReportHistory } from '@/components/batch-analysis/batch-report-history'
import { TabId, TabState } from './types'
import type { BatchReport } from '@/components/batch-analysis/types'

interface TrackerHeaderProps {
  s: TabState
  activeTab: TabId
  isDarkMode: boolean
  isRefreshing: boolean
  hasActiveFilters: boolean
  filteredCoinCount: number
  toggleDarkMode: () => void
  handleManualRefresh: () => void
  handleApiKeyChange: () => void
  update: (tab: TabId, patch: Partial<TabState>) => void
  onBatchAnalyze: () => void
  onOpenReport: (report: BatchReport) => void
}

export function TrackerHeader({
  s,
  activeTab,
  isDarkMode,
  isRefreshing,
  hasActiveFilters,
  filteredCoinCount,
  toggleDarkMode,
  handleManualRefresh,
  handleApiKeyChange,
  update,
  onBatchAnalyze,
  onOpenReport,
}: TrackerHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      {/* Logo and Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary">
            <TrendingUpIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl sm:text-3xl font-bold text-foreground">CryptoTracker</h1>
        </div>
        {/* Mobile action buttons */}
        <div className="flex items-center gap-1 sm:hidden">
          <button
            onClick={onBatchAnalyze}
            disabled={filteredCoinCount === 0 || s.loading}
            className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            title={`Analyze ${filteredCoinCount} coins`}
          >
            <ZapIcon className="h-4 w-4" />
            <span>{filteredCoinCount}</span>
          </button>
          <BatchReportHistory onOpenReport={onOpenReport} />
          <button
            onClick={() => update(activeTab, { showFilters: !s.showFilters })}
            className={`inline-flex items-center justify-center p-2 rounded-md transition-colors ${s.showFilters || hasActiveFilters ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
            title="Filters"
          >
            <FilterIcon className="h-5 w-5" />
          </button>
          <button
            onClick={toggleDarkMode}
            className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title={isDarkMode ? 'Light mode' : 'Dark mode'}
          >
            {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>
          <button
            onClick={handleManualRefresh}
            disabled={s.loading || isRefreshing}
            className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
            title="Refresh all data"
          >
            <RefreshCwIcon className={`h-5 w-5 ${s.loading || isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <ApiSettings onApiKeyChange={handleApiKeyChange} />
        </div>
      </div>

      {/* Search and Desktop Actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 sm:w-64 sm:flex-none">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search coins..."
            value={s.searchTerm}
            onChange={(e) => update(activeTab, { searchTerm: e.target.value })}
            className="pl-9 sm:pl-10 bg-card/50 border-border/60 focus:border-primary h-9 sm:h-10 text-sm"
          />
        </div>
        <div className="hidden sm:flex items-center gap-1">
          {/* Batch Analyze Button */}
          <button
            onClick={onBatchAnalyze}
            disabled={filteredCoinCount === 0 || s.loading}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed border border-primary/20 hover:border-primary/40"
            title={`Batch analyze ${filteredCoinCount} filtered coins`}
          >
            <ZapIcon className="h-4 w-4" />
            Analyze {filteredCoinCount}
          </button>
          <BatchReportHistory onOpenReport={onOpenReport} />
          <button
            onClick={() => update(activeTab, { showFilters: !s.showFilters })}
            className={`inline-flex items-center justify-center p-2 rounded-md transition-colors ${s.showFilters || hasActiveFilters ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
            title="Filters"
          >
            <FilterIcon className="h-5 w-5" />
          </button>
          <button
            onClick={toggleDarkMode}
            className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title={isDarkMode ? 'Light mode' : 'Dark mode'}
          >
            {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>
          <ApiSettings onApiKeyChange={handleApiKeyChange} />
        </div>
      </div>
    </div>
  )
}

