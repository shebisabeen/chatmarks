/**
 * BookmarkButton.tsx
 * ─────────────────────────────────────────────────────────────
 * A ⭐ button injected into each ChatGPT message.
 * Rendered inside a Shadow DOM to avoid CSS conflicts.
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import type { ParsedMessage } from '../../shared/types'
import { toggleBookmark, isBookmarked } from '../bookmarkManager'
import { showBookmarkedToast, showRemovedToast, showErrorToast } from './Toast'

// ─── Component ────────────────────────────────────────────────

interface BookmarkButtonProps {
  message: ParsedMessage
  conversationId: string
}

function BookmarkButton({ message, conversationId }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    let cancelled = false
    isBookmarked(message).then((result) => {
      if (!cancelled) setBookmarked(result)
    })
    return () => { cancelled = true }
  }, [message, conversationId])

  useEffect(() => {
    const handler = () => {
      isBookmarked(message).then(setBookmarked)
    }
    chrome.storage.onChanged.addListener(handler)
    return () => chrome.storage.onChanged.removeListener(handler)
  }, [message])

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    try {
      const result = await toggleBookmark(message)
      if (result) {
        setBookmarked(true)
        showBookmarkedToast()
      } else {
        setBookmarked(false)
        showRemovedToast()
      }
    } catch (err) {
      console.error('[ChatGPT Bookmarks] Toggle failed:', err)
      showErrorToast('Could not bookmark message')
    } finally {
      setLoading(false)
    }
  }, [message, loading])

  const isDark = document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={bookmarked ? 'Remove bookmark' : 'Bookmark this message'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        borderRadius: '6px',
        border: 'none',
        cursor: loading ? 'wait' : 'pointer',
        background: hovered
          ? isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'
          : 'transparent',
        transition: 'background 0.15s ease, transform 0.1s ease',
        transform: hovered ? 'scale(1.1)' : 'scale(1)',
        padding: 0,
        outline: 'none',
        flexShrink: 0,
      }}
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this message'}
      aria-pressed={bookmarked}
    >
      <span style={{ fontSize: '16px', lineHeight: 1 }}>
        {loading ? '⏳' : bookmarked ? '⭐' : '☆'}
      </span>
    </button>
  )
}

// ─── Injection Logic ──────────────────────────────────────────

const INJECTED_ATTR = 'data-cbm-btn-injected'
const HOST_CLASS = 'cbm-btn-host'

/**
 * Find the best place to inject the bookmark button within a message turn.
 *
 * ChatGPT's current DOM structure (2024-2025):
 *   article[data-testid="conversation-turn-N"]
 *     └── div (outer)
 *         └── div (inner)
 *             ├── div (message content)
 *             └── div (action buttons: copy, thumbs up/down, etc.)
 *
 * We look for the action button row and append to it.
 */
function findActionBar(messageEl: HTMLElement): HTMLElement | null {
  // Strategy 1: Look for the specific action bar ChatGPT uses
  // These are the copy/thumbs-up/thumbs-down buttons
  const actionBarSelectors = [
    // Current ChatGPT (2025) — action buttons container
    '[data-testid="copy-turn-action-button"]',
    '[data-testid="good-response-turn-action-button"]',
    '[data-testid="bad-response-turn-action-button"]',
    '[data-testid="voice-play-turn-action-button"]',
    // Older selectors
    'button[aria-label="Copy"]',
    'button[aria-label="Good response"]',
  ]

  for (const sel of actionBarSelectors) {
    const btn = messageEl.querySelector(sel)
    if (btn) {
      // Return the parent container of this button
      return btn.parentElement as HTMLElement
    }
  }

  // Strategy 2: Find a flex row with 2-6 icon buttons (the action bar)
  // Walk from the bottom of the article upward
  const allDivs = Array.from(messageEl.querySelectorAll('div'))
  // Reverse to find the deepest matching container first
  for (let i = allDivs.length - 1; i >= 0; i--) {
    const div = allDivs[i]
    const buttons = Array.from(div.querySelectorAll('button'))
    // Must be direct children buttons or very close
    const directButtons = buttons.filter(b => b.parentElement === div || b.parentElement?.parentElement === div)
    if (directButtons.length >= 2 && directButtons.length <= 8) {
      // Make sure this looks like an action bar (small buttons)
      const firstBtn = directButtons[0]
      const rect = firstBtn.getBoundingClientRect()
      if (rect.width > 0 && rect.width <= 48 && rect.height <= 48) {
        return div as HTMLElement
      }
    }
  }

  return null
}

export function injectBookmarkButton(
  messageEl: HTMLElement,
  message: ParsedMessage,
  conversationId: string,
): void {
  if (messageEl.hasAttribute(INJECTED_ATTR)) return
  messageEl.setAttribute(INJECTED_ATTR, 'true')

  const host = document.createElement('span')
  host.className = HOST_CLASS
  host.style.cssText = 'display:inline-flex;align-items:center;vertical-align:middle;'

  const actionBar = findActionBar(messageEl)

  if (actionBar) {
    actionBar.appendChild(host)
  } else {
    // Fallback: create a small floating button at the bottom-right of the message
    const footer = document.createElement('div')
    footer.style.cssText = [
      'display:flex',
      'justify-content:flex-end',
      'padding:4px 8px 0',
      'opacity:0',
      'transition:opacity 0.15s',
    ].join(';')

    // Show on hover of the message
    messageEl.addEventListener('mouseenter', () => { footer.style.opacity = '1' })
    messageEl.addEventListener('mouseleave', () => { footer.style.opacity = '0' })

    footer.appendChild(host)
    messageEl.appendChild(footer)
  }

  const shadow = host.attachShadow({ mode: 'open' })
  const container = document.createElement('div')
  shadow.appendChild(container)

  const root = createRoot(container)
  root.render(
    <BookmarkButton message={message} conversationId={conversationId} />
  )
}

export function removeAllBookmarkButtons(): void {
  document.querySelectorAll(`.${HOST_CLASS}`).forEach((el) => el.remove())
  document.querySelectorAll(`[${INJECTED_ATTR}]`).forEach((el) => {
    el.removeAttribute(INJECTED_ATTR)
  })
}
