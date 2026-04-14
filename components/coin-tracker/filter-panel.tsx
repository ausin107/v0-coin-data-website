import { Input } from '@/components/ui/input'
import { XIcon } from 'lucide-react'
import { TabId, TabState } from './types'

interface FilterPanelProps {
  s: TabState
  activeTab: TabId
  update: (tab: TabId, patch: Partial<TabState>) => void
  hasActiveFilters: boolean
  clearFilters: () => void
}

export function FilterPanel({
  s,
  activeTab,
  update,
  hasActiveFilters,
  clearFilters,
}: FilterPanelProps) {
  if (!s.showFilters) return null

  return (
    <div className="border-b border-border/40 bg-muted/20">
      <div className="mx-auto max-w-8xl px-3 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Filters</h3>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <XIcon className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Row 1: Market Cap & Volume */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Min Market Cap</label>
                <Input type="text" placeholder="e.g. 100M" value={s.minMarketCap} onChange={(e) => update(activeTab, { minMarketCap: e.target.value })} className="h-8 text-xs bg-background" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Max Market Cap</label>
                <Input type="text" placeholder="e.g. 10B" value={s.maxMarketCap} onChange={(e) => update(activeTab, { maxMarketCap: e.target.value })} className="h-8 text-xs bg-background" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Min Volume</label>
                <Input type="text" placeholder="e.g. 50M" value={s.minVolume} onChange={(e) => update(activeTab, { minVolume: e.target.value })} className="h-8 text-xs bg-background" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Max Volume</label>
                <Input type="text" placeholder="e.g. 5B" value={s.maxVolume} onChange={(e) => update(activeTab, { maxVolume: e.target.value })} className="h-8 text-xs bg-background" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Min Vol/MC</label>
                <Input type="text" placeholder="e.g. 0.1" value={s.minVolMcRatio} onChange={(e) => update(activeTab, { minVolMcRatio: e.target.value })} className="h-8 text-xs bg-background" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Max Vol/MC</label>
                <Input type="text" placeholder="e.g. 0.5" value={s.maxVolMcRatio} onChange={(e) => update(activeTab, { maxVolMcRatio: e.target.value })} className="h-8 text-xs bg-background" />
              </div>
            </div>

            {/* Row 2: Price Change Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Min 24h%</label>
                <Input type="text" placeholder="-10" value={s.min24h} onChange={(e) => update(activeTab, { min24h: e.target.value })} className="h-8 text-xs bg-background" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Max 24h%</label>
                <Input type="text" placeholder="50" value={s.max24h} onChange={(e) => update(activeTab, { max24h: e.target.value })} className="h-8 text-xs bg-background" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Min 7d%</label>
                <Input type="text" placeholder="-20" value={s.min7d} onChange={(e) => update(activeTab, { min7d: e.target.value })} className="h-8 text-xs bg-background" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Max 7d%</label>
                <Input type="text" placeholder="100" value={s.max7d} onChange={(e) => update(activeTab, { max7d: e.target.value })} className="h-8 text-xs bg-background" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Min 14d%</label>
                <Input type="text" placeholder="-30" value={s.min14d} onChange={(e) => update(activeTab, { min14d: e.target.value })} className="h-8 text-xs bg-background" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Max 14d%</label>
                <Input type="text" placeholder="150" value={s.max14d} onChange={(e) => update(activeTab, { max14d: e.target.value })} className="h-8 text-xs bg-background" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Min 30d%</label>
                <Input type="text" placeholder="-50" value={s.min30d} onChange={(e) => update(activeTab, { min30d: e.target.value })} className="h-8 text-xs bg-background" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Max 30d%</label>
                <Input type="text" placeholder="200" value={s.max30d} onChange={(e) => update(activeTab, { max30d: e.target.value })} className="h-8 text-xs bg-background" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Min 200d%</label>
                <Input type="text" placeholder="-80" value={s.min200d} onChange={(e) => update(activeTab, { min200d: e.target.value })} className="h-8 text-xs bg-background" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Max 200d%</label>
                <Input type="text" placeholder="500" value={s.max200d} onChange={(e) => update(activeTab, { max200d: e.target.value })} className="h-8 text-xs bg-background" />
              </div>
            </div>

            {/* Row 3: Toggle & Helper */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={s.hideStablecoins}
                  onChange={(e) => update(activeTab, { hideStablecoins: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-xs text-muted-foreground">Hide Stablecoins</span>
              </label>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Market Cap/Volume: use K, M, B suffixes (e.g. 100M). Price changes: enter percentage values.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
