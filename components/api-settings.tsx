'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldGroup, FieldLabel } from '@/components/ui/field'
import { getApiKey, setApiKey, clearApiKey } from '@/lib/config'
import { SettingsIcon } from 'lucide-react'

interface ApiSettingsProps {
  onApiKeyChange?: () => void
}

export function ApiSettings({ onApiKeyChange }: ApiSettingsProps) {
  const [open, setOpen] = useState(false)
  const [apiKey, setLocalApiKey] = useState(() => getApiKey())
  const [tempKey, setTempKey] = useState(apiKey)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    if (tempKey.trim()) {
      setApiKey(tempKey.trim())
      setLocalApiKey(tempKey.trim())
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        onApiKeyChange?.()
      }, 2000)
    }
  }

  const handleClear = () => {
    clearApiKey()
    setApiKey('')
    setLocalApiKey('')
    setTempKey('')
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTempKey(apiKey)
    }
    setOpen(newOpen)
  }

  return (
    <>
      <button
        onClick={() => handleOpenChange(true)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        title="API Settings"
      >
        <SettingsIcon className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>API Configuration</DialogTitle>
            <DialogDescription>
              Configure your CoinGecko API key for enhanced data access.{' '}
              <a
                href="https://www.coingecko.com/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Get a free API key
              </a>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <FieldGroup>
              <FieldLabel htmlFor="api-key">CoinGecko API Key (Optional)</FieldLabel>
              <Input
                id="api-key"
                type="password"
                placeholder="x-cg-demo-api-key or your API key"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                className="font-mono text-sm"
              />
            </FieldGroup>

            <div className="text-xs text-muted-foreground space-y-2">
              <div className="bg-card/50 rounded p-2">
                <p className="font-medium text-foreground mb-1">How it works:</p>
                <ul className="space-y-1">
                  <li>✓ Uses internal proxy: <code className="bg-background px-1 rounded">/api/coins</code></li>
                  <li>✓ Fetches 6 concurrent pages (1,500 coins)</li>
                  <li>✓ Calculates volume-to-market-cap ratio</li>
                  <li>✓ Filters coins with ratio {'>'}0.05</li>
                  <li>✓ Server-side caching for performance</li>
                </ul>
              </div>
              <p>
                Set your API key in <code className="bg-background px-1 rounded text-xs">.env.local</code> to
                increase rate limits
              </p>
            </div>

            {apiKey && (
              <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                ✓ API key configured in localStorage
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            {apiKey && (
              <Button variant="outline" onClick={handleClear} size="sm">
                Clear Key
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!tempKey.trim() || tempKey === apiKey}
              size="sm"
            >
              {saved ? 'Saved!' : 'Save Key'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
