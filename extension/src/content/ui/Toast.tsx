/**
 * Toast.tsx
 * ─────────────────────────────────────────────────────────────
 * Lightweight toast notification system.
 * Renders into a Shadow DOM container to avoid CSS conflicts.
 * ─────────────────────────────────────────────────────────────
 */

import { createRoot } from 'react-dom/client'
import { useState, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

// ─── Toast Store (simple module-level state) ──────────────────

let addToastFn: ((item: ToastItem) => void) | null = null

// ─── React Component ──────────────────────────────────────────

function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    addToastFn = (item: ToastItem) => {
      setToasts((prev) => [...prev, item])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== item.id))
      }, 3000)
    }
    return () => {
      addToastFn = null
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 2147483647,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#fff',
            backgroundColor:
              toast.type === 'success'
                ? '#10a37f'
                : toast.type === 'error'
                  ? '#ef4444'
                  : '#6366f1',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            animation: 'cbm-toast-in 0.2s ease-out',
            pointerEvents: 'auto',
            maxWidth: '320px',
            lineHeight: '1.4',
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}

// ─── Shadow DOM Mount ─────────────────────────────────────────

let toastRoot: ReturnType<typeof createRoot> | null = null

function ensureToastMount(): void {
  if (toastRoot) return

  const host = document.createElement('div')
  host.id = 'cbm-toast-host'
  document.body.appendChild(host)

  const shadow = host.attachShadow({ mode: 'open' })

  // Inject animation keyframes into shadow DOM
  const style = document.createElement('style')
  style.textContent = `
    @keyframes cbm-toast-in {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `
  shadow.appendChild(style)

  const container = document.createElement('div')
  shadow.appendChild(container)

  toastRoot = createRoot(container)
  toastRoot.render(<ToastContainer />)
}

// ─── Public API ───────────────────────────────────────────────

function generateId(): string {
  return `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

export function showToast(message: string, type: ToastType = 'success'): void {
  ensureToastMount()

  // Wait a tick for React to mount the component
  setTimeout(() => {
    if (addToastFn) {
      addToastFn({ id: generateId(), message, type })
    }
  }, 50)
}

export function showBookmarkedToast(): void {
  showToast('⭐ Bookmarked!', 'success')
}

export function showRemovedToast(): void {
  showToast('🗑️ Bookmark removed', 'info')
}

export function showErrorToast(message = 'Something went wrong'): void {
  showToast(`❌ ${message}`, 'error')
}
