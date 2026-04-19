import { getApiKey, getMoralisApiKey } from '@/lib/config'
import type { CoinData } from './coin-service'
import type { BatchScanResult, TokenOwnershipData, CoinScanCache } from '@/components/batch-scan/types'
import { getCachedScan, setCachedScan } from './batch-scan-cache'

const DELAY_BETWEEN_COINS = 2100 // ~ 2.1 seconds to stay under 30/min rate limits

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type ScanProgressCallback = (progress: {
  completed: number
  total: number
  cached: number
  failed: number
  currentCoin: { id: string; name: string; image: string } | null
  error?: string
}) => void

export class BatchScanService {
  private isCancelled = false
  private isPaused = false
  private pausePromise: Promise<void> | null = null
  private pauseResolve: (() => void) | null = null

  async scanCoins(
    coins: CoinData[],
    onProgress: ScanProgressCallback
  ): Promise<BatchScanResult[]> {
    this.isCancelled = false
    this.isPaused = false
    const results: BatchScanResult[] = []
    
    let completed = 0
    let cachedCount = 0
    let failedCount = 0

    const cgApiKey = getApiKey()
    const moralisApiKey = getMoralisApiKey()

    if (!moralisApiKey) {
      throw new Error('Moralis API Key is required for scanning. Please add it in settings.')
    }

    for (let i = 0; i < coins.length; i++) {
      const coin = coins[i]

      // Handle cancel
      if (this.isCancelled) {
        break
      }

      // Handle pause
      if (this.isPaused) {
        onProgress({
          completed,
          total: coins.length,
          cached: cachedCount,
          failed: failedCount,
          currentCoin: null,
        })
        await this.waitForResume()
      }

      onProgress({
        completed,
        total: coins.length,
        cached: cachedCount,
        failed: failedCount,
        currentCoin: { id: coin.id, name: coin.name, image: coin.image },
      })

      // Check cache
      const cached = getCachedScan(coin.id)
      if (cached) {
        results.push({
          coinId: coin.id,
          coinName: coin.name,
          coinSymbol: coin.symbol,
          coinImage: coin.image,
          contractAddress: cached.contractAddress,
          chain: cached.chain,
          owners: cached.owners,
          fromCache: true,
        })
        cachedCount++
        completed++
        continue
      }

      // Start actual analysis -> Delay to respect rate limits
      if (i > 0 && !cached) {
        await delay(DELAY_BETWEEN_COINS)
      }

      if (this.isCancelled) break

      try {
        // Step 1: Get Details from CoinGecko
        const cgHeaders: HeadersInit = {}
        if (cgApiKey) cgHeaders['x-cg-demo-api-key'] = cgApiKey

        const cgRes = await fetch(`/api/coins/${coin.id}`, { headers: cgHeaders })
        if (!cgRes.ok) throw new Error(`CoinGecko Failed to fetch details (${cgRes.status})`)
        const cgData = await cgRes.json()

        if (!cgData.success) throw new Error(cgData.error || 'Failed to parse Coingecko response')
        
        const platforms = cgData.data.platforms || {}
        if (!platforms['binance-smart-chain'] && !platforms['ethereum']) {
          completed++
          continue
        }

        let contractAddress: string | null = null
        let chain: string | null = null

        // Default to binance-smart-chain, fallback to ethereum
        if (platforms['binance-smart-chain']) {
          contractAddress = platforms['binance-smart-chain']
          chain = 'bsc'
        } else if (platforms['ethereum']) {
          contractAddress = platforms['ethereum']
          chain = 'eth'
        }

        if (this.isCancelled) break

        await delay(1000) // extra delay before Moralis call

        // Step 2: Get Owners from Moralis
        const mHeaders: HeadersInit = {}
        if (moralisApiKey) mHeaders['X-API-Key'] = moralisApiKey

        const mRes = await fetch(`/api/moralis/owners/${contractAddress}?chain=${chain}`, { headers: mHeaders })
        if (!mRes.ok) throw new Error(`Moralis Failed to fetch owners (${mRes.status})`)
        const mData = await mRes.json()
        
        if (!mData.success) throw new Error(mData.error || 'Failed to parse Moralis response')

        // Process Owners data to format it correctly for the UI format
        let ownersList: TokenOwnershipData[] = []
        if (mData.data && mData.data.result) {
            ownersList = mData.data.result.map((item: any) => ({
                owner_address: item.owner_address,
                percentage_relative_to_total_supply: parseFloat(item.percentage_relative_to_total_supply) || 0,
                balance_formatted: item.balance_formatted || '0',
                is_contract: item.is_contract || false,
                entity: item.entity || null,
                owner_address_label: item.owner_address_label || null
            }))

            if (ownersList.length > 0) {
                const totalSum = ownersList.reduce((sum, o) => sum + o.percentage_relative_to_total_supply, 0)
                if (totalSum > 100) {
                    ownersList.shift()
                }
            }
        }

        const scanData: CoinScanCache = {
          coinId: coin.id,
          scannedAt: Date.now(),
          contractAddress,
          chain,
          owners: ownersList
        }

        // Save to cache
        setCachedScan(coin.id, scanData)

        results.push({
          coinId: coin.id,
          coinName: coin.name,
          coinSymbol: coin.symbol,
          coinImage: coin.image,
          contractAddress,
          chain,
          owners: ownersList,
          fromCache: false,
        })

      } catch (err) {
        console.error(`[BatchScanService] Failed ${coin.id}:`, err)
        failedCount++
        results.push({
          coinId: coin.id,
          coinName: coin.name,
          coinSymbol: coin.symbol,
          coinImage: coin.image,
          contractAddress: null,
          chain: null,
          owners: [],
          fromCache: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }

      completed++
    }

    onProgress({
      completed,
      total: coins.length,
      cached: cachedCount,
      failed: failedCount,
      currentCoin: null,
    })

    return results
  }

  pause() {
    if (this.isPaused) return
    this.isPaused = true
    this.pausePromise = new Promise((resolve) => {
      this.pauseResolve = resolve
    })
  }

  resume() {
    if (!this.isPaused) return
    this.isPaused = false
    if (this.pauseResolve) {
      this.pauseResolve()
      this.pausePromise = null
      this.pauseResolve = null
    }
  }

  cancel() {
    this.isCancelled = true
    this.resume() // if it was paused, let it unblock so it can exit
  }

  private async waitForResume() {
    if (this.pausePromise) {
      await this.pausePromise
    }
  }
}
