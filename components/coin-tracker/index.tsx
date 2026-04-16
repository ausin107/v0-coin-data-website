'use client'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, StarIcon } from 'lucide-react'
import { CoinChartModal } from '@/components/coin-chart-modal'
import { BatchAnalysisModal } from '@/components/batch-analysis'
import { BatchReportModal } from '@/components/batch-analysis/batch-report-modal'
import { TrackerHeader } from './tracker-header'
import { TabBar } from './tab-bar'
import { FilterPanel } from './filter-panel'
import { CoinTable } from './coin-table'
import { useCoinTracker } from './use-coin-tracker'

export function CoinTracker() {
  const {
    activeTab,
    setActiveTab,
    favorites,
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
    filterDescription,
    openCoinFromReport,
    handleOpenReport,
    filteredAndSortedCoins: allFilteredCoins,
  } = useCoinTracker()

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-8xl px-3 py-4 sm:px-6 lg:px-8">
          <TrackerHeader
            s={s}
            activeTab={activeTab}
            isDarkMode={isDarkMode}
            isRefreshing={isRefreshing}
            hasActiveFilters={hasActiveFilters}
            filteredCoinCount={allFilteredCoins.length}
            toggleDarkMode={toggleDarkMode}
            handleManualRefresh={handleManualRefresh}
            handleApiKeyChange={handleApiKeyChange}
            update={update}
            onBatchAnalyze={() => setIsBatchModalOpen(true)}
            onOpenReport={handleOpenReport}
          />
        </div>

        {/* Tab Bar */}
        <div className="mx-auto max-w-8xl px-3 sm:px-6 lg:px-8">
          <TabBar 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            favorites={favorites}
            lastUpdated={lastUpdated}
            nextUpdateIn={nextUpdateIn}
            isRefreshing={isRefreshing}
            isLoading={s.loading}
            handleManualRefresh={handleManualRefresh}
          />
        </div>
      </div>

      {/* Filter Panel */}
      <FilterPanel 
        s={s}
        activeTab={activeTab}
        update={update}
        hasActiveFilters={hasActiveFilters}
        clearFilters={clearFilters}
      />

      {/* Table Content */}
      <div className="mx-auto max-w-8xl px-2 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* Favorites Tab Content */}
        {activeTab === 'favorites' ? (
          <div className="space-y-4">
            {favError && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
                <p className="font-medium">Error loading favorites</p>
                <p className="text-sm">{favError}</p>
              </div>
            )}
            {favLoading ? (
              <div className="flex h-96 items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <Spinner className="h-8 w-8 text-primary" />
                  <p className="text-muted-foreground">Loading favorites...</p>
                </div>
              </div>
            ) : favorites.length === 0 ? (
              <div className="flex h-96 items-center justify-center">
                <div className="text-center space-y-2">
                  <StarIcon className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                  <p className="text-lg font-medium text-foreground">No favorites yet</p>
                  <p className="text-sm text-muted-foreground">Click the star icon next to any coin to add it here.</p>
                </div>
              </div>
            ) : paginatedCoins.length === 0 ? (
              <div className="flex h-96 items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-medium text-foreground">No coins found</p>
                  <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <CoinTable
                  coins={paginatedCoins}
                  startIndex={startIndex}
                  sortField={s.sortField}
                  sortDirection={s.sortDirection}
                  handleSort={handleSort}
                  onCoinClick={handleCoinClick}
                  isFavorited={isFavorited}
                  toggleFavorite={toggleFavorite}
                />
                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
                  <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                    Showing {startIndex + 1} to {Math.min(endIndex, allFilteredCoins.length)} of{' '}
                    {allFilteredCoins.length} favorites
                  </p>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => update(activeTab, { currentPage: Math.max(1, s.currentPage - 1) })}
                      disabled={s.currentPage === 1}
                      className="gap-1 h-8 px-2 sm:px-3 text-xs sm:text-sm"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </Button>
                    <div className="flex items-center gap-1 px-2">
                      <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                        {s.currentPage} / {totalPages || 1}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => update(activeTab, { currentPage: Math.min(totalPages, s.currentPage + 1) })}
                      disabled={s.currentPage >= totalPages}
                      className="gap-1 h-8 px-2 sm:px-3 text-xs sm:text-sm"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRightIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {s.error && (
              <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
                <p className="font-medium">Error loading coins</p>
                <p className="text-sm">{s.error}</p>
              </div>
            )}

            {s.loading && s.coins.length === 0 ? (
              <div className="flex h-96 items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <Spinner className="h-8 w-8 text-primary" />
                  <p className="text-muted-foreground">
                    {activeTab === 'alpha' ? 'Loading Binance Alpha coins...' : 'Loading coin data...'}
                  </p>
                </div>
              </div>
            ) : allFilteredCoins.length === 0 ? (
              <div className="flex h-96 items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-medium text-foreground">No coins found</p>
                  <p className="text-sm text-muted-foreground">Try adjusting your search terms</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Table */}
                <CoinTable 
                  coins={paginatedCoins}
                  startIndex={startIndex}
                  sortField={s.sortField}
                  sortDirection={s.sortDirection}
                  handleSort={handleSort}
                  onCoinClick={handleCoinClick}
                  isFavorited={isFavorited}
                  toggleFavorite={toggleFavorite}
                />

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
                  <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                    Showing {startIndex + 1} to {Math.min(endIndex, allFilteredCoins.length)} of{' '}
                    {allFilteredCoins.length} coins
                  </p>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => update(activeTab, { currentPage: Math.max(1, s.currentPage - 1) })}
                      disabled={s.currentPage === 1}
                      className="gap-1 h-8 px-2 sm:px-3 text-xs sm:text-sm"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </Button>
                    <div className="flex items-center gap-1 px-2">
                      <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                        {s.currentPage} / {totalPages || 1}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => update(activeTab, { currentPage: Math.min(totalPages, s.currentPage + 1) })}
                      disabled={s.currentPage >= totalPages}
                      className="gap-1 h-8 px-2 sm:px-3 text-xs sm:text-sm"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRightIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Scroll to Top */}
            <div className="flex justify-center pt-4 pb-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="gap-2"
              >
                <ChevronUpIcon className="h-4 w-4" />
                Back to Top
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Chart Modal */}
      {selectedCoin && (
        <CoinChartModal
          isOpen={isChartModalOpen}
          onClose={() => {
            setIsChartModalOpen(false)
            setSelectedCoin(null)
          }}
          coinId={selectedCoin.id}
          coinName={selectedCoin.name}
          coinSymbol={selectedCoin.symbol}
          coinImage={selectedCoin.image}
          currentPrice={selectedCoin.current_price}
        />
      )}

      {/* Batch Analysis Modal */}
      <BatchAnalysisModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        coins={allFilteredCoins}
        onOpenReport={handleOpenReport}
        filterDescription={filterDescription}
      />

      {/* Batch Report Modal */}
      <BatchReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        report={activeReport}
        onCoinClick={openCoinFromReport}
      />
    </div>
  )
}
