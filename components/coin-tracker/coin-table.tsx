import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowUpIcon, ArrowDownIcon, ChevronsUpDownIcon } from 'lucide-react'
import { SortField, SortDirection } from './types'
import { CoinRow } from './coin-row'

interface CoinTableProps {
  coins: any[]
  startIndex: number
  sortField: SortField | null
  sortDirection: SortDirection
  handleSort: (field: SortField) => void
  onCoinClick: (coin: any) => void
  isFavorited: (id: string) => boolean
  toggleFavorite: (coin: any) => void
}

export function CoinTable({
  coins,
  startIndex,
  sortField,
  sortDirection,
  handleSort,
  onCoinClick,
  isFavorited,
  toggleFavorite,
}: CoinTableProps) {
  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = sortField === field
    return (
      <button
        onClick={() => handleSort(field)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors group"
      >
        {children}
        <span className="ml-1">
          {isActive && sortDirection === 'asc' ? (
            <ArrowUpIcon className="h-3.5 w-3.5 text-primary" />
          ) : isActive && sortDirection === 'desc' ? (
            <ArrowDownIcon className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ChevronsUpDownIcon className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />
          )}
        </span>
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-border/40 overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="min-w-[1050px]">
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-10"></TableHead>
              <TableHead className="w-12 text-center font-semibold">#</TableHead>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="text-right font-semibold">Price</TableHead>
              <TableHead className="text-right font-semibold">
                <SortableHeader field="price_change_percentage_24h">24h %</SortableHeader>
              </TableHead>
              <TableHead className="text-right font-semibold">
                <SortableHeader field="price_change_percentage_7d_in_currency">7d %</SortableHeader>
              </TableHead>
              <TableHead className="text-right font-semibold">
                <SortableHeader field="price_change_percentage_14d_in_currency">14d %</SortableHeader>
              </TableHead>
              <TableHead className="text-right font-semibold">
                <SortableHeader field="price_change_percentage_30d_in_currency">30d %</SortableHeader>
              </TableHead>
              <TableHead className="text-right font-semibold">
                <SortableHeader field="price_change_percentage_200d_in_currency">200d %</SortableHeader>
              </TableHead>
              <TableHead className="text-right font-semibold">
                <SortableHeader field="market_cap">Market Cap</SortableHeader>
              </TableHead>
              <TableHead className="text-right font-semibold">
                <SortableHeader field="total_volume">Volume (24h)</SortableHeader>
              </TableHead>
              <TableHead className="text-right font-semibold">
                <SortableHeader field="volume_to_mc_ratio">Vol/MC</SortableHeader>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coins.map((coin, index) => (
              <CoinRow
                key={`${coin.id}-${startIndex + index}`}
                coin={coin}
                index={startIndex + index + 1}
                onCoinClick={onCoinClick}
                isFavorited={isFavorited(coin.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
