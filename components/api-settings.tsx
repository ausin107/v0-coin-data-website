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
import { getApiKey, setApiKey, clearApiKey } from '@/lib/config'
import {
  SettingsIcon,
  KeyRound,
  HardDrive,
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
  const [apiKey, setLocalApiKey] = useState('')
  const [tempKey, setTempKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)

  // Load key on mount (client-only)
  useEffect(() => {
    const stored = getApiKey()
    setLocalApiKey(stored)
    setTempKey(stored)
  }, [])

  const handleSave = () => {
    const trimmed = tempKey.trim()
    if (!trimmed) return
    setApiKey(trimmed)
    setLocalApiKey(trimmed)
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      setOpen(false)
      onApiKeyChange?.()
    }, 1500)
  }

  const handleClear = () => {
    clearApiKey()
    setLocalApiKey('')
    setTempKey('')
    setSaved(false)
    onApiKeyChange?.()
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      const stored = getApiKey()
      setLocalApiKey(stored)
      setTempKey(stored)
      setSaved(false)
      setShowKey(false)
    }
    setOpen(newOpen)
  }

  const maskedKey = apiKey
    ? apiKey.slice(0, 8) + '••••••••' + apiKey.slice(-4)
    : ''

  const isDirty = tempKey.trim() !== apiKey

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => handleOpenChange(true)}
        className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200"
        title="Cài đặt API Key"
      >
        <SettingsIcon className="h-4 w-4" />
        {apiKey && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
        )}
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-border/60">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 rounded-lg bg-primary/10">
                  <KeyRound className="h-5 w-5 text-primary" />
                </div>
                <DialogTitle className="text-lg">Cài đặt API Key</DialogTitle>
              </div>
              <DialogDescription className="text-sm leading-relaxed">
                Nhập CoinGecko API key để tăng giới hạn request và truy cập
                đầy đủ dữ liệu.{' '}
                <a
                  href="https://www.coingecko.com/api/pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                >
                  Lấy API key miễn phí
                  <ExternalLink className="h-3 w-3" />
                </a>
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Current key status */}
            {apiKey ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-300">
                      Đã cấu hình API key
                    </p>
                    <p className="text-xs text-emerald-400/70 font-mono mt-0.5">
                      {maskedKey}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClear}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xoá
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-300">
                  Chưa có API key — đang dùng chế độ công cộng (giới hạn thấp)
                </p>
              </div>
            )}

            {/* Input */}
            <div className="space-y-2">
              <label
                htmlFor="api-key-input"
                className="text-sm font-medium text-foreground flex items-center gap-2"
              >
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                CoinGecko API Key
              </label>
              <div className="relative">
                <Input
                  id="api-key-input"
                  type={showKey ? 'text' : 'password'}
                  placeholder="Enter your API key here..."
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isDirty && tempKey.trim()) {
                      handleSave()
                    }
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
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
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
                  'API key lưu trong localStorage trên máy bạn',
                  'Khi gọi API, key được đính kèm vào header request',
                  'Proxy server /api/coins nhận key và chuyển tiếp đến CoinGecko',
                  'Không có key → dùng Public API (30 req/min)',
                  'Có key → dùng Demo/Pro API (500+ req/min)',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-primary text-xs mt-0.5">✓</span>
                    <p className="text-xs text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Security note */}
            <div className="flex items-start gap-2 text-xs text-muted-foreground/70">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <p>
                Key không bao giờ được lưu lên server hay ghi ra file. Để xoá
                hoàn toàn, nhấn &quot;Xoá&quot; hoặc xoá thủ công trong{' '}
                <em>DevTools → Application → Local Storage</em>.
              </p>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/60 bg-muted/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
              className="text-muted-foreground"
            >
              Huỷ
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isDirty || !tempKey.trim() || saved}
              size="sm"
              className="min-w-[90px] transition-all"
            >
              {saved ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Đã lưu!
                </span>
              ) : (
                'Lưu API Key'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
