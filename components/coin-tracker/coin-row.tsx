import { ArrowUpIcon, ArrowDownIcon, StarIcon } from 'lucide-react'
import { TableCell, TableRow } from '@/components/ui/table'
import { Coin } from './types'
import { getVolMcRatioColor } from './utils'

interface CoinRowProps {
  coin: Coin
  index: number
  onCoinClick: (coin: Coin) => void
  isFavorited?: boolean
  onToggleFavorite?: (coin: Coin) => void
}

export function CoinRow({
  coin,
  index,
  onCoinClick,
  isFavorited = false,
  onToggleFavorite,
}: CoinRowProps) {
  const formatPercent = (value: number | undefined) => {
    if (value === undefined || value === null)
      return <span className="text-muted-foreground text-xs sm:text-sm">N/A</span>
    const isPositive = value >= 0
    return (
      <span className={`inline-flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {isPositive ? <ArrowUpIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : <ArrowDownIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
        {Math.abs(value).toFixed(2)}%
      </span>
    )
  }

  const formatMarketCap = (value: number | undefined) => {
    if (!value) return 'N/A'
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
    return `$${value.toLocaleString()}`
  }

  return (
    <TableRow className="hover:bg-muted/30">
      {/* Star / Favorite button */}
      <TableCell className="w-10 px-2">
        <button
          onClick={() => onToggleFavorite?.(coin)}
          className={`p-1 rounded transition-colors ${isFavorited ? 'text-yellow-400 hover:text-yellow-300' : 'text-muted-foreground/30 hover:text-yellow-400'}`}
          title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <StarIcon className={`h-4 w-4 ${isFavorited ? 'fill-yellow-400' : ''}`} />
        </button>
      </TableCell>
      <TableCell className="text-center font-medium text-muted-foreground text-xs sm:text-sm">{index}</TableCell>
      <TableCell className="min-w-[140px] sm:min-w-[180px]">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0 overflow-hidden rounded-full bg-muted">
            {coin.image ? (
              <img
                src={coin.image}
                alt={coin.name}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => { const img = e.target as HTMLImageElement; img.style.display = 'none' }}
              />
            ) : null}
          </div>
          <button
            onClick={() => onCoinClick(coin)}
            className="min-w-0 text-left hover:opacity-80 transition-opacity group"
          >
            <p className="font-medium text-foreground text-sm sm:text-base truncate group-hover:text-primary transition-colors">{coin.name}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase group-hover:text-primary/70 transition-colors">{coin.symbol}</p>
          </button>
        </div>
      </TableCell>
      <TableCell className="text-right font-semibold text-foreground text-xs sm:text-sm whitespace-nowrap">
        ${coin.current_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: coin.current_price < 1 ? 8 : 2 }) || 'N/A'}
      </TableCell>
      <TableCell className="text-right">{formatPercent(coin.price_change_percentage_24h)}</TableCell>
      <TableCell className="text-right">{formatPercent(coin.price_change_percentage_7d_in_currency)}</TableCell>
      <TableCell className="text-right">{formatPercent(coin.price_change_percentage_14d_in_currency)}</TableCell>
      <TableCell className="text-right">{formatPercent(coin.price_change_percentage_30d_in_currency)}</TableCell>
      <TableCell className="text-right">{formatPercent(coin.price_change_percentage_200d_in_currency)}</TableCell>
      <TableCell className="text-right text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">{formatMarketCap(coin.market_cap)}</TableCell>
      <TableCell className="text-right text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">{formatMarketCap(coin.total_volume)}</TableCell>
      <TableCell className="text-right">
        <span className={`inline-flex items-center justify-center px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold ${getVolMcRatioColor(coin.volume_to_mc_ratio ?? 0)}`}>
          {coin.volume_to_mc_ratio?.toFixed(3) ?? 'N/A'}
        </span>
      </TableCell>
    </TableRow>
  )
}
