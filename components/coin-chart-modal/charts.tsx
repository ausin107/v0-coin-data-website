import {
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart'
import {
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Brush,
  ReferenceLine,
  Scatter,
  Bar,
} from 'recharts'
import { ActivityIcon } from 'lucide-react'
import { ProcessedDataPoint } from './types'
import { 
  CHART_COLORS, 
  formatPrice, 
  formatVolume, 
  formatMarketCap, 
  formatDate, 
  priceVolumeConfig, 
  marketCapConfig, 
  PUMP_DETECTION_CONFIG 
} from './utils'

export function PriceVolumeChart({ data, showWhaleSignals }: { data: ProcessedDataPoint[], showWhaleSignals: boolean }) {
  return (
    <ChartContainer config={priceVolumeConfig} className="h-[400px] w-full">
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.price} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.price} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="price"
            orientation="left"
            tickFormatter={(v) => formatPrice(v)}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={70}
          />
          <YAxis
            yAxisId="volume"
            orientation="right"
            tickFormatter={(v) => formatVolume(v)}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <ChartTooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const dataPoint = payload[0]?.payload as ProcessedDataPoint | undefined
              return (
                <div className="rounded-lg border bg-background p-3 shadow-md">
                  <p className="text-sm font-medium text-foreground mb-2">{label}</p>
                  {payload.map((entry, index) => {
                    if (entry.dataKey === 'isAnomaly') return null
                    return (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-muted-foreground">
                          {entry.name === 'Price' ? 'Price:' : 'Volume:'}
                        </span>
                        <span className="font-medium text-foreground">
                          {entry.name === 'Price'
                            ? formatPrice(entry.value as number)
                            : formatVolume(entry.value as number)}
                        </span>
                      </div>
                    )
                  })}
                  {dataPoint?.sma20Volume && (
                    <div className="flex items-center gap-2 text-sm mt-1 pt-1 border-t border-border/40">
                      <span className="text-muted-foreground">SMA20 Vol:</span>
                      <span className="font-medium text-foreground">
                        {formatVolume(dataPoint.sma20Volume)}
                      </span>
                    </div>
                  )}
                  {dataPoint?.volumeRatio && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Vol Ratio:</span>
                      <span className={`font-medium ${dataPoint.volumeRatio >= PUMP_DETECTION_CONFIG.WHALE_VOLUME_SPIKE ? 'text-red-500' : 'text-foreground'}`}>
                        {dataPoint.volumeRatio.toFixed(2)}x
                      </span>
                    </div>
                  )}
                  {dataPoint?.priceChangePct !== null && dataPoint?.priceChangePct !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Price Change:</span>
                      <span className={`font-medium ${dataPoint.priceChangePct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {dataPoint.priceChangePct >= 0 ? '+' : ''}{dataPoint.priceChangePct.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {/* Pump Score and Level Display */}
                  {dataPoint && dataPoint.pumpScore > 0 && (
                    <div className="mt-1 pt-1 border-t border-border/40 space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Pump Score:</span>
                        <span className={`font-semibold ${dataPoint.pumpLevel === 'tier4' ? 'text-purple-500' :
                          dataPoint.pumpLevel === 'tier3' ? 'text-red-500' :
                          dataPoint.pumpLevel === 'tier2' ? 'text-yellow-500' : 'text-green-500'
                          }`}>
                          {dataPoint.pumpScore}/165
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 text-xs">
                        {dataPoint.vExhaust && <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">V_Exhaust</span>}
                        {dataPoint.pSqueeze && <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">P_Squeeze</span>}
                        {dataPoint.whaleAcc && <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">Whale_Acc</span>}
                        {dataPoint.vmcRatioSpike && <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded">V/MC Spike</span>}
                        {dataPoint.recentSignal && <span className="px-1.5 py-0.5 bg-blue-600/20 text-blue-300 rounded">Recent</span>}
                      </div>
                      {dataPoint.pumpLevel !== 'tier1' && (
                        <div className="flex items-center gap-2 text-sm">
                          <ActivityIcon className={`h-3.5 w-3.5 ${dataPoint.pumpLevel === 'tier4' ? 'text-purple-500' : dataPoint.pumpLevel === 'tier3' ? 'text-red-500' : 'text-yellow-500'}`} />
                          <span className={`font-semibold ${dataPoint.pumpLevel === 'tier4' ? 'text-purple-500' : dataPoint.pumpLevel === 'tier3' ? 'text-red-500' : 'text-yellow-500'}`}>
                            {dataPoint.pumpLevel === 'tier4' ? 'TIER 4 Pump Probability!' : dataPoint.pumpLevel === 'tier3' ? 'TIER 3 Pump Probability!' : 'TIER 2 Pump Probability'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            }}
          />
          <Legend />
          <Bar
            yAxisId="volume"
            dataKey="volume"
            fill={CHART_COLORS.volume}
            opacity={0.4}
            name="Volume"
          />
          <Area
            yAxisId="price"
            type="monotone"
            dataKey="price"
            stroke={CHART_COLORS.price}
            strokeWidth={2}
            fill="url(#priceGradient)"
            name="Price"
          />
          {/* Pump Signal Markers - only show tier2, tier3, tier4 */}
          {showWhaleSignals && (
            <Scatter
              yAxisId="price"
              data={data}
              fill={CHART_COLORS.pumpTier3}
              name="Pump Signal"
              shape={(props: any) => {
                const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: ProcessedDataPoint }
                // Only render marker for tier2, tier3, or tier4 pump levels
                if (cx === undefined || cy === undefined || !payload || payload.pumpLevel === 'tier1') return <g />

                // Get color based on pump tier level
                const color = payload.pumpLevel === 'tier4'
                  ? CHART_COLORS.pumpTier4
                  : payload.pumpLevel === 'tier3'
                    ? CHART_COLORS.pumpTier3
                    : CHART_COLORS.pumpTier2

                // Same size for all levels
                const outerRadius = 10
                const innerRadius = 5

                return (
                  <g>
                    {/* Outer pulse circle */}
                    <circle
                      cx={cx}
                      cy={cy + 12}
                      r={outerRadius}
                      fill={color}
                      fillOpacity={0.3}
                    />
                    {/* Inner circle */}
                    <circle
                      cx={cx}
                      cy={cy + 12}
                      r={innerRadius}
                      fill={color}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  </g>
                )
              }}
            />
          )}
          <Brush
            dataKey="date"
            height={30}
            stroke={CHART_COLORS.price}
            tickFormatter={formatDate}
          />
        </ComposedChart>
    </ChartContainer>
  )
}

export function MarketCapVolumeChart({ data }: { data: ProcessedDataPoint[] }) {
  return (
    <ChartContainer config={marketCapConfig} className="h-[400px] w-full">
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="mcGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.marketCap} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS.marketCap} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="marketCap"
            orientation="left"
            tickFormatter={(v) => formatMarketCap(v)}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={70}
          />
          <YAxis
            yAxisId="volMcRatio"
            orientation="right"
            tickFormatter={(v) => v.toFixed(2)}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={50}
            domain={[0, 'auto']}
          />
          <ChartTooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <div className="rounded-lg border bg-background p-3 shadow-md">
                  <p className="text-sm font-medium text-foreground mb-2">{label}</p>
                  {payload.map((entry, index) => {
                    let labelText = ''
                    let formattedValue = ''
                    if (entry.dataKey === 'marketCap') {
                      labelText = 'Market Cap:'
                      formattedValue = formatMarketCap(entry.value as number)
                    } else if (entry.dataKey === 'volMcRatio') {
                      labelText = 'Vol/MC Ratio:'
                      formattedValue = (entry.value as number).toFixed(4)
                    }
                    if (!labelText) return null
                    return (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-muted-foreground">{labelText}</span>
                        <span className="font-medium text-foreground">{formattedValue}</span>
                      </div>
                    )
                  })}
                </div>
              )
            }}
          />
          <Legend />
          <Bar
            yAxisId="volMcRatio"
            dataKey="volMcRatio"
            fill={CHART_COLORS.volMcRatio}
            opacity={0.5}
            name="Vol/MC Ratio"
          />
          <Area
            yAxisId="marketCap"
            type="monotone"
            dataKey="marketCap"
            stroke={CHART_COLORS.marketCap}
            strokeWidth={2}
            fill="url(#mcGradient)"
            name="Market Cap"
          />
          <ReferenceLine
            yAxisId="volMcRatio"
            y={0.1}
            stroke={CHART_COLORS.volMcRatio}
            strokeDasharray="5 5"
            label={{ value: '0.1', fontSize: 10, fill: CHART_COLORS.volMcRatio }}
          />
          <Brush
            dataKey="date"
            height={30}
            stroke={CHART_COLORS.marketCap}
            tickFormatter={formatDate}
          />
        </ComposedChart>
    </ChartContainer>
  )
}
