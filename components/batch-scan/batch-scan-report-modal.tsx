'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { FileCodeIcon, CheckCircle2, AlertCircle, ExternalLink, CopyIcon, ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
import type { BatchScanReport, BatchScanResult } from './types'
import type { CoinData } from '@/lib/services/coin-service'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface BatchScanReportModalProps {
  isOpen: boolean
  onClose: () => void
  report: BatchScanReport | null
  onCoinClick: (coinId: string, coinName: string, coinSymbol: string, coinImage: string, currentPrice: number) => void
}

export function BatchScanReportModal({
  isOpen,
  onClose,
  report,
  onCoinClick,
}: BatchScanReportModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'high_concentration' | 'errors'>('all')
  const [selectedDetail, setSelectedDetail] = useState<BatchScanResult | null>(null)
  const [sortField, setSortField] = useState<'coinName' | 'chain' | 'top5' | 'top10' | 'top25' | 'top50' | 'top100' | 'exchange'>('top5')
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc')

  if (!report) return null

  // Filter results
  const filteredResults = report.results.filter((result) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      if (
        !result.coinName.toLowerCase().includes(q) &&
        !result.coinSymbol.toLowerCase().includes(q)
      ) {
        return false
      }
    }
    if (filterMode === 'high_concentration') {
      const topOwner = result.owners?.[0]
      if (!topOwner || topOwner.percentage_relative_to_total_supply <= 10) return false
    }
    if (filterMode === 'errors') {
      if (!result.error && result.contractAddress) return false
    }
    return true
  })

  const sumOwners = (result: BatchScanResult, n: number) => (result.owners || []).slice(0, n).reduce((sum, o) => sum + o.percentage_relative_to_total_supply, 0)
  const exchangeOwners = (result: BatchScanResult) => (result.owners || []).filter(o => o.entity).reduce((sum, o) => sum + o.percentage_relative_to_total_supply, 0)

  filteredResults.sort((a, b) => {
    let aVal: string | number = 0
    let bVal: string | number = 0
    if (sortField === 'coinName') {
      aVal = a.coinName; bVal = b.coinName;
    } else if (sortField === 'chain') {
      aVal = a.chain || ''; bVal = b.chain || '';
    } else if (sortField === 'top5') {
      aVal = sumOwners(a, 5); bVal = sumOwners(b, 5);
    } else if (sortField === 'top10') {
      aVal = sumOwners(a, 10); bVal = sumOwners(b, 10);
    } else if (sortField === 'top25') {
      aVal = sumOwners(a, 25); bVal = sumOwners(b, 25);
    } else if (sortField === 'top50') {
      aVal = sumOwners(a, 50); bVal = sumOwners(b, 50);
    } else if (sortField === 'top100') {
      aVal = sumOwners(a, 100); bVal = sumOwners(b, 100);
    } else if (sortField === 'exchange') {
      aVal = exchangeOwners(a); bVal = exchangeOwners(b);
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
       return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    
    return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
  })

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc') // default descending for numbers usually better
    }
  }

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <ArrowUpIcon className="w-3 h-3 ml-1 inline" /> : <ArrowDownIcon className="w-3 h-3 ml-1 inline" />
  }

  const getColorClass = (percent: number) => {
    if (percent >= 80) return 'text-red-600 font-black'
    if (percent >= 50) return 'text-red-500 font-bold'
    if (percent >= 30) return 'text-orange-500 font-semibold'
    if (percent >= 10) return 'text-yellow-500 font-medium'
    return 'text-muted-foreground font-medium'
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:!max-w-[800px] max-h-[90vh] flex flex-col p-0">
        <div className="p-6 pb-2 border-b border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCodeIcon className="h-5 w-5 text-primary" />
              Token Scan Report
              <Badge variant="outline" className="ml-2 font-mono text-xs">
                {new Date(report.createdAt).toLocaleString()}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="bg-muted/10 px-6 py-2 border-b border-border/50 text-xs text-muted-foreground">
            <AlertCircle className="w-3.5 h-3.5 inline mr-1.5 text-blue-500" />
            Lưu ý: Dữ liệu API (Holders) được lưu cache tại local với thời hạn <strong className="text-foreground">tối đa 1 ngày (24h)</strong> để giảm tần suất gọi API.
          </div>

          {/* Report Summary */}
          <div className="mt-4 grid grid-cols-4 gap-3">
            <div className="rounded-lg bg-muted/20 border border-border/50 p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Scanned</p>
              <p className="text-xl font-bold font-mono text-foreground leading-none">
                {report.scannedCoins} <span className="text-sm font-normal text-muted-foreground">/ {report.totalCoins}</span>
              </p>
            </div>
            <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-3">
              <p className="text-xs text-orange-500 uppercase tracking-wider mb-1 truncate">High Concentration</p>
              <p className="text-xl font-bold font-mono text-orange-500 leading-none">
                {report.highlights.highConcentration.length}
              </p>
            </div>
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-xs text-red-500 uppercase tracking-wider mb-1">Errors</p>
              <p className="text-xl font-bold font-mono text-red-500 leading-none">
                {report.failedCoins + report.highlights.noContract.length}
              </p>
            </div>
            <div className="rounded-lg bg-muted/20 border border-border/50 p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Duration</p>
              <p className="text-xl font-bold font-mono text-foreground leading-none">
                {formatDuration(report.duration)}
              </p>
            </div>
          </div>

          <div className="mt-4 mb-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Filter applied:</span> {report.filterSnapshot}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-border/50 bg-muted/5 flex items-center justify-between gap-4">
          <Input
            placeholder="Search coin..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs h-8 text-xs"
          />
          <div className="flex bg-muted p-1 rounded-md">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterMode('all')}
              className={`h-7 px-3 text-xs ${filterMode === 'all' ? 'bg-background shadow-sm' : ''}`}
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterMode('high_concentration')}
              className={`h-7 px-3 text-xs ${filterMode === 'high_concentration' ? 'bg-background shadow-sm text-orange-500' : ''}`}
            >
              High Conc. (&gt;10%)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterMode('errors')}
              className={`h-7 px-3 text-xs ${filterMode === 'errors' ? 'bg-background shadow-sm text-red-500' : ''}`}
            >
              Issues
            </Button>
          </div>
        </div>

        {/* Results Table */}
        <div className="flex-1 overflow-auto p-4">
          {filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <p>No results match the current filter.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[130px] cursor-pointer hover:bg-muted/50" onClick={() => toggleSort('coinName')}>
                    Coin <SortIcon field="coinName" />
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort('chain')}>
                    Chain <SortIcon field="chain" />
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort('top5')}>
                    Top 5% <SortIcon field="top5" />
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort('top10')}>
                    Top 10% <SortIcon field="top10" />
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort('top25')}>
                    Top 25% <SortIcon field="top25" />
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort('top50')}>
                    Top 50% <SortIcon field="top50" />
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort('top100')}>
                    Top 100% <SortIcon field="top100" />
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort('exchange')}>
                    Exchange % <SortIcon field="exchange" />
                  </TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.map((result) => {
                  const hasError = result.error || !result.contractAddress
                  const topOwner = result.owners?.[0]
                  const topPercent = topOwner ? topOwner.percentage_relative_to_total_supply : 0
                  const sumTop = (n: number) => (result.owners || []).slice(0, n).reduce((sum, o) => sum + o.percentage_relative_to_total_supply, 0)
                  const top5 = sumTop(5)
                  const top10 = sumTop(10)
                  const top25 = sumTop(25)
                  const top50 = sumTop(50)
                  const top100 = sumTop(100)
                  const exchangePercent = (result.owners || []).filter(o => o.entity).reduce((sum, o) => sum + o.percentage_relative_to_total_supply, 0)
                  
                  return (
                    <TableRow key={result.coinId} className="group hover:bg-muted/10 cursor-pointer text-sm" onClick={() => setSelectedDetail(result)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={result.coinImage}
                            alt={result.coinName}
                            className="w-5 h-5 rounded-full"
                          />
                          <div className="flex flex-col max-w-[120px]">
                            <span className="truncate">{result.coinName}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{result.coinSymbol}</span>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {result.chain ? (
                           <Badge variant="outline" className="text-[10px] uppercase">{result.chain}</Badge>
                        ) : (
                           <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {hasError ? (
                           <div className="flex items-center gap-1.5 text-xs text-red-500" title={result.error || 'No contract'}>
                             <AlertCircle className="w-3 h-3" />
                             <span>Error</span>
                           </div>
                        ) : (
                           <span className={`text-[11px] ${getColorClass(top5)}`}>
                             {top5.toFixed(2)}%
                           </span>
                        )}
                      </TableCell>

                      <TableCell>
                         {!hasError && (
                           <span className={`text-[11px] ${getColorClass(top10)}`}>{top10.toFixed(2)}%</span>
                         )}
                      </TableCell>

                      <TableCell>
                         {!hasError && (
                           <span className={`text-[11px] ${getColorClass(top25)}`}>{top25.toFixed(2)}%</span>
                         )}
                      </TableCell>

                      <TableCell>
                         {!hasError && (
                           <span className={`text-[11px] ${getColorClass(top50)}`}>{top50.toFixed(2)}%</span>
                         )}
                      </TableCell>

                      <TableCell>
                         {!hasError && (
                           <span className={`text-[11px] ${getColorClass(top100)}`}>{top100.toFixed(2)}%</span>
                         )}
                      </TableCell>

                      <TableCell>
                         {!hasError && (
                           <Badge variant="secondary" className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/20">
                             {exchangePercent > 0 ? exchangePercent.toFixed(2) + '%' : '-'}
                           </Badge>
                         )}
                      </TableCell>

                      <TableCell className="text-right">
                        {!hasError && result.contractAddress && (
                          <a 
                            href={result.chain === 'bsc' ? `https://bscscan.com/token/${result.contractAddress}` : `https://etherscan.io/token/${result.contractAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded transition-colors"
                            title="Open Explorer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Holder Detail Modal */}
    {selectedDetail && (
      <Dialog open={!!selectedDetail} onOpenChange={(open) => !open && setSelectedDetail(null)}>
        <DialogContent className="sm:!max-w-[800px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-muted/5 relative">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedDetail.coinImage} alt={selectedDetail.coinName} className="h-10 w-10 rounded-full border border-border/50 bg-background" />
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  {selectedDetail.coinName} 
                  <span className="text-muted-foreground font-medium text-sm">({selectedDetail.coinSymbol.toUpperCase()})</span>
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Top 100 Holders Analysis</p>
              </div>
            </div>
            {selectedDetail.contractAddress && (
               <div className="mt-3 flex items-center gap-2">
                 <Badge variant="outline" className="text-[10px] font-mono bg-background">
                   {selectedDetail.chain?.toUpperCase()} : {selectedDetail.contractAddress.slice(0, 6)}...{selectedDetail.contractAddress.slice(-4)}
                   <button
                      onClick={() => navigator.clipboard.writeText(selectedDetail.contractAddress!)}
                      className="ml-2 text-muted-foreground hover:text-foreground"
                   >
                     <CopyIcon className="h-3 w-3" />
                   </button>
                 </Badge>
               </div>
            )}
          </DialogHeader>

          {/* Quick Stats Summary */}
          {(() => {
            const owners = selectedDetail.owners || []
            const sumT = (n: number) => owners.slice(0, n).reduce((s, o) => s + o.percentage_relative_to_total_supply, 0)
            const exchangePerc = owners.filter(o => o.entity).reduce((s, o) => s + o.percentage_relative_to_total_supply, 0)
            return (
              <div className="grid grid-cols-4 gap-3 p-4 bg-muted/10 border-b border-border/50">
                <div className="rounded-lg bg-background border border-border/50 p-2 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Top 10</p>
                  <p className="text-sm font-bold font-mono">{sumT(10).toFixed(2)}%</p>
                </div>
                <div className="rounded-lg bg-background border border-border/50 p-2 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Top 50</p>
                  <p className="text-sm font-bold font-mono">{sumT(50).toFixed(2)}%</p>
                </div>
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2 text-center">
                  <p className="text-[10px] text-blue-500 uppercase tracking-wider mb-0.5">Exchange</p>
                  <p className="text-sm font-bold font-mono text-blue-500">{exchangePerc > 0 ? exchangePerc.toFixed(2) + '%' : '-'}</p>
                </div>
                <div className="rounded-lg bg-background border border-border/50 p-2 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Total Indexed</p>
                  <p className="text-sm font-bold font-mono">{owners.length}</p>
                </div>
              </div>
            )
          })()}

          <div className="flex-1 overflow-auto p-0">
            <Table>
              <TableHeader className="bg-muted/5 sticky top-0 backdrop-blur-sm z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Held %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedDetail.owners.map((owner, i) => {
                  let badgeVariant = 'outline'
                  let badgeClass = 'text-[10px] font-medium'
                  let name = 'Whale'
                  
                  if (owner.owner_address_label || owner.entity) {
                    name = owner.owner_address_label || owner.entity!
                    badgeVariant = 'default'
                    badgeClass += ' bg-blue-500 hover:bg-blue-600 text-white border-transparent'
                  } else if (owner.is_contract) {
                    name = 'Contract'
                    badgeVariant = 'secondary'
                    badgeClass += ' bg-muted-foreground/10 text-muted-foreground'
                  } else {
                    badgeClass += ' text-foreground bg-transparent'
                  }
                  
                  return (
                    <TableRow key={owner.owner_address + i} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-[10px] text-muted-foreground text-center font-mono">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-2 group">
                          {owner.owner_address.slice(0, 8)}...{owner.owner_address.slice(-6)}
                          <button
                            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(owner.owner_address) }}
                            className="text-muted-foreground/50 hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted opacity-0 group-hover:opacity-100"
                            title="Copy Address"
                          >
                            <CopyIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={badgeVariant as any} className={badgeClass}>
                          {name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">
                        <span className={owner.percentage_relative_to_total_supply >= 5 ? 'text-orange-500' : ''}>
                          {owner.percentage_relative_to_total_supply.toFixed(2)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    )}
    </>
  )
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}
