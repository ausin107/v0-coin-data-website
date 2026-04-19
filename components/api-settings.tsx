'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getApiKey, setApiKey, clearApiKey, getMoralisApiKey, setMoralisApiKey, clearMoralisApiKey } from '@/lib/config'
import {
  SettingsIcon,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
  Info,
  ShieldCheck,
} from 'lucide-react'

interface ApiSettingsProps {
  onApiKeyChange?: () => void
}

export function ApiSettings({ onApiKeyChange }: ApiSettingsProps) {
  const [open, setOpen] = useState(false)
  
  // CoinGecko
  const [apiKey, setLocalApiKey] = useState('')
  const [tempKey, setTempKey] = useState('')
  
  // Moralis
  const [moralisKey, setLocalMoralisKey] = useState('')
  const [tempMoralisKey, setTempMoralisKey] = useState('')

  const [saved, setSaved] = useState(false)
  
  const [showKey, setShowKey] = useState(false)
  const [showMoralisKey, setShowMoralisKey] = useState(false)

  // Load key on mount (client-only)
  useEffect(() => {
    const cgKey = getApiKey()
    setLocalApiKey(cgKey)
    setTempKey(cgKey)

    const mKey = getMoralisApiKey()
    setLocalMoralisKey(mKey)
    setTempMoralisKey(mKey)
  }, [])

  const handleSave = () => {
    let changed = false
    
    // CoinGecko Save
    const trimmed = tempKey.trim()
    if (trimmed !== apiKey && (trimmed || apiKey)) {
       if (trimmed) {
         setApiKey(trimmed)
       } else {
         clearApiKey()
       }
       setLocalApiKey(trimmed)
       changed = true
    }

    // Moralis Save
    const trimmedMoralis = tempMoralisKey.trim()
    if (trimmedMoralis !== moralisKey && (trimmedMoralis || moralisKey)) {
       if (trimmedMoralis) {
         setMoralisApiKey(trimmedMoralis)
       } else {
         clearMoralisApiKey()
       }
       setLocalMoralisKey(trimmedMoralis)
       changed = true
    }

    if (changed) {
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setOpen(false)
        onApiKeyChange?.()
      }, 1500)
    } else {
      setOpen(false)
    }
  }

  const handleClearCG = () => {
    clearApiKey()
    setLocalApiKey('')
    setTempKey('')
    setSaved(false)
    onApiKeyChange?.()
  }

  const handleClearMoralis = () => {
    clearMoralisApiKey()
    setLocalMoralisKey('')
    setTempMoralisKey('')
    setSaved(false)
    onApiKeyChange?.()
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      const cgKey = getApiKey()
      setLocalApiKey(cgKey)
      setTempKey(cgKey)

      const mKey = getMoralisApiKey()
      setLocalMoralisKey(mKey)
      setTempMoralisKey(mKey)

      setSaved(false)
      setShowKey(false)
      setShowMoralisKey(false)
    }
    setOpen(newOpen)
  }

  const maskedKey = apiKey
    ? apiKey.slice(0, 8) + '••••••••' + apiKey.slice(-4)
    : ''
  
  const maskedMoralisKey = moralisKey
    ? moralisKey.slice(0, 8) + '••••••••' + moralisKey.slice(-4)
    : ''

  const isDirty = tempKey.trim() !== apiKey || tempMoralisKey.trim() !== moralisKey

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => handleOpenChange(true)}
        className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200"
        title="Settings & API Keys"
      >
        <SettingsIcon className="h-4 w-4" />
        {(apiKey || moralisKey) && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
        )}
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-border/60 sticky top-0 bg-background z-10">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 rounded-lg bg-primary/10">
                  <KeyRound className="h-5 w-5 text-primary" />
                </div>
                <DialogTitle className="text-lg">Cài đặt API Key</DialogTitle>
              </div>
              <DialogDescription className="text-sm leading-relaxed">
                Cấu hình API keys để tăng giới hạn request và sử dụng các tính năng nâng cao như Scan.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-6">
            
            {/* --- CoinGecko Section --- */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">CoinGecko API Key (Market Data)</h3>
                <a href="https://www.coingecko.com/api/pricing" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Get key <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              
              {apiKey ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-300">Đã cấu hình CoinGecko Key</p>
                      <p className="text-xs text-emerald-400/70 font-mono mt-0.5">{maskedKey}</p>
                    </div>
                  </div>
                  <button onClick={handleClearCG} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                    Xoá
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-300">Đang dùng chế độ public (giới hạn thấp)</p>
                </div>
              )}

              <div className="relative">
                <Input
                  id="cg-api-key-input"
                  type={showKey ? 'text' : 'password'}
                  placeholder="Enter CoinGecko API key..."
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isDirty) handleSave()
                  }}
                  className="font-mono text-sm pr-10"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="h-px bg-border/60 w-full" />

            {/* --- Moralis Section --- */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Moralis API Key (Token Scan)</h3>
                <a href="https://admin.moralis.io/" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Get key <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              
              {moralisKey ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-300">Đã cấu hình Moralis Key</p>
                      <p className="text-xs text-emerald-400/70 font-mono mt-0.5">{maskedMoralisKey}</p>
                    </div>
                  </div>
                  <button onClick={handleClearMoralis} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                    Xoá
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-300">Cần có Moralis Key để sử dụng tính năng Scan Token</p>
                </div>
              )}

              <div className="relative">
                <Input
                  id="moralis-api-key-input"
                  type={showMoralisKey ? 'text' : 'password'}
                  placeholder="Enter Moralis API key..."
                  value={tempMoralisKey}
                  onChange={(e) => setTempMoralisKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isDirty) handleSave()
                  }}
                  className="font-mono text-sm pr-10"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowMoralisKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showMoralisKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* How it works */}
            <div className="rounded-lg border border-border/60 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Cách hoạt động
                </span>
              </div>
              <div className="px-3 py-3 space-y-1.5">
                {[
                  'Key lưu trong localStorage trình duyệt của bạn',
                  'Client gửi key lên server thông qua header request',
                  'Proxy server dùng key để gọi API từ hãng thứ 3',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-primary text-xs mt-0.5">✓</span>
                    <p className="text-xs text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Security note */}
            <div className="flex items-start gap-2 text-xs text-muted-foreground/70 pb-4">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <p>
                Key không bao giờ được ghi ra hệ thống server. Để xoá hoàn toàn, nhấn "Xoá".
              </p>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/60 bg-muted/20 sticky bottom-0 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
              className="text-muted-foreground"
            >
              Đóng
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isDirty || saved}
              size="sm"
              className="min-w-[90px] transition-all"
            >
              {saved ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Đã lưu!
                </span>
              ) : (
                'Lưu thay đổi'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

