/**
 * highlighter.ts
 * ─────────────────────────────────────────────────────────────
 * Jump to a bookmarked message and highlight it.
 *
 * The core challenge: ChatGPT uses virtual scrolling.
 * Messages not near the viewport are NOT in the DOM.
 * We must scroll through the conversation to force rendering,
 * then find and highlight the target message.
 * ─────────────────────────────────────────────────────────────
 */

import { findMessageElement, parseMessages, getConversationIdFromUrl } from '../domAdapter'
import { injectBookmarkButton } from './BookmarkButton'

const HIGHLIGHT_CLASS = 'cbm-highlight'
const HIGHLIGHT_STYLE_ID = 'cbm-highlight-styles'

// ─── Inject CSS ───────────────────────────────────────────────

function ensureStyles(): void {
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) return

  const style = document.createElement('style')
  style.id = HIGHLIGHT_STYLE_ID
  style.textContent = `
    @keyframes cbm-fade-yellow {
      0%   { background-color: rgba(250, 204, 21, 0.5); }
      60%  { background-color: rgba(250, 204, 21, 0.3); }
      100% { background-color: transparent; }
    }
    .cbm-highlight {
      animation: cbm-fade-yellow 2s ease-out forwards !important;
      border-radius: 8px;
      outline: 2px solid rgba(250, 204, 21, 0.6);
      outline-offset: 4px;
    }
  `
  document.head.appendChild(style)
}

// ─── Highlight ────────────────────────────────────────────────

let currentHighlightEl: HTMLElement | null = null
let removeHighlightTimer: ReturnType<typeof setTimeout> | null = null

function removeCurrentHighlight(): void {
  if (currentHighlightEl) {
    currentHighlightEl.classList.remove(HIGHLIGHT_CLASS)
    currentHighlightEl = null
  }
  if (removeHighlightTimer) {
    clearTimeout(removeHighlightTimer)
    removeHighlightTimer = null
  }
}

function highlightElement(el: HTMLElement): void {
  ensureStyles()
  removeCurrentHighlight()
  el.classList.add(HIGHLIGHT_CLASS)
  currentHighlightEl = el
  removeHighlightTimer = setTimeout(removeCurrentHighlight, 2500)
}

// ─── Conversation Scroll Container ───────────────────────────

function getScrollContainer(): HTMLElement | null {
  const selectors = [
    '[class*="overflow-y-auto"]',
    'main [class*="scroll"]',
    'main > div',
  ]

  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (el && (el as HTMLElement).scrollHeight > (el as HTMLElement).clientHeight) {
      return el as HTMLElement
    }
  }

  const candidates = Array.from(document.querySelectorAll('div'))
    .filter((el) => el.scrollHeight > el.clientHeight + 100)
    .sort((a, b) => b.scrollHeight - a.scrollHeight)

  return candidates[0] as HTMLElement ?? null
}

// ─── Virtual Scroll Reveal ────────────────────────────────────

async function scrollToRevealMessage(
  messageId: string,
  messageIndex?: number,
): Promise<HTMLElement | null> {
  const scrollContainer = getScrollContainer()

  if (!scrollContainer) {
    return scrollRevealViaWindow(messageId, messageIndex)
  }

  const totalHeight = scrollContainer.scrollHeight
  const viewportHeight = scrollContainer.clientHeight

  if (messageIndex !== undefined && messageIndex >= 0) {
    const renderedMessages = document.querySelectorAll(
      'article[data-testid^="conversation-turn-"]',
    ).length

    if (renderedMessages > 0) {
      const estimatedFraction = messageIndex / Math.max(renderedMessages * 2, messageIndex + 1)
      const targetScroll = Math.floor(totalHeight * estimatedFraction)

      scrollContainer.scrollTo({ top: targetScroll, behavior: 'smooth' })
      await sleep(600)

      const el = findMessageElement(messageId)
      if (el) return el
    }
  }

  const currentScroll = scrollContainer.scrollTop
  const stepSize = viewportHeight * 0.8
  const scanFromTop = messageIndex !== undefined && messageIndex < 5

  if (scanFromTop) {
    scrollContainer.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    await sleep(300)
  }

  let scanned = scrollContainer.scrollTop
  const maxScroll = totalHeight - viewportHeight
  let found: HTMLElement | null = null

  while (scanned <= maxScroll) {
    found = findMessageElement(messageId)
    if (found) break
    scanned = Math.min(scanned + stepSize, maxScroll)
    scrollContainer.scrollTo({ top: scanned, behavior: 'instant' as ScrollBehavior })
    await sleep(200)
  }

  if (!found) found = findMessageElement(messageId)

  if (!found && !scanFromTop) {
    scanned = currentScroll
    while (scanned >= 0) {
      found = findMessageElement(messageId)
      if (found) break
      scanned = Math.max(scanned - stepSize, 0)
      scrollContainer.scrollTo({ top: scanned, behavior: 'instant' as ScrollBehavior })
      await sleep(200)
    }
  }

  return found
}

async function scrollRevealViaWindow(
  messageId: string,
  messageIndex?: number,
): Promise<HTMLElement | null> {
  const totalHeight = document.body.scrollHeight
  const viewportHeight = window.innerHeight
  const stepSize = viewportHeight * 0.8

  if (messageIndex !== undefined) {
    const renderedMessages = document.querySelectorAll(
      'article[data-testid^="conversation-turn-"]',
    ).length
    if (renderedMessages > 0) {
      const fraction = messageIndex / Math.max(renderedMessages * 2, messageIndex + 1)
      window.scrollTo({ top: Math.floor(totalHeight * fraction), behavior: 'smooth' })
      await sleep(600)
      const el = findMessageElement(messageId)
      if (el) return el
    }
  }

  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  await sleep(300)

  let scanned = 0
  const maxScroll = totalHeight - viewportHeight

  while (scanned <= maxScroll) {
    const el = findMessageElement(messageId)
    if (el) return el
    scanned = Math.min(scanned + stepSize, maxScroll)
    window.scrollTo({ top: scanned, behavior: 'instant' as ScrollBehavior })
    await sleep(200)
  }

  return findMessageElement(messageId)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Public API ───────────────────────────────────────────────

export async function jumpToMessage(
  messageId: string,
  messageIndex?: number,
): Promise<boolean> {
  let el = findMessageElement(messageId)

  if (!el) {
    console.log(`[ChatGPT Bookmarks] Message not in DOM, scrolling to reveal: ${messageId}`)
    el = await scrollToRevealMessage(messageId, messageIndex)
  }

  if (!el) {
    console.warn(`[ChatGPT Bookmarks] Could not find message after scroll: ${messageId}`)
    return false
  }

  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  await sleep(500)
  highlightElement(el)

  const conversationId = getConversationIdFromUrl()
  if (conversationId) {
    const messages = parseMessages()
    const msg = messages.find((m) => m.id === messageId)
    if (msg) {
      injectBookmarkButton(msg.element, msg, conversationId)
    }
  }

  return true
}

export async function jumpToBookmark(
  conversationUrl: string,
  messageId: string,
  messageIndex?: number,
): Promise<void> {
  const currentUrl = window.location.href

  const targetConvId = conversationUrl.match(/\/c\/([0-9a-f-]{36})/i)?.[1]
  const currentConvId = currentUrl.match(/\/c\/([0-9a-f-]{36})/i)?.[1]

  const isSameConversation = targetConvId && currentConvId && targetConvId === currentConvId

  if (isSameConversation) {
    await jumpToMessage(messageId, messageIndex)
  } else {
    // For cross-conversation: background worker already stored the pending jump
    // in chrome.storage.local and navigated the tab. The content script will
    // pick it up via checkPendingJump() when the conversation loads.
    // This path is only hit if the content script itself triggers a cross-conv jump.
    sessionStorage.setItem('cbm_pending_jump', JSON.stringify({ messageId, messageIndex }))
    window.location.href = conversationUrl
  }
}

// ─── Pending Jump (cross-conversation) ───────────────────────

interface PendingJump {
  messageId: string
  messageIndex?: number
  conversationId?: string
  expiresAt?: number
}

/**
 * Check if there's a pending jump stored by the background worker
 * (in chrome.storage.local) or by the content script (in sessionStorage).
 * Called on every conversation load/change.
 */
export async function checkPendingJump(): Promise<void> {
  let pendingId: string | null = null
  let pendingIndex: number | undefined

  // Method 1: Check chrome.storage.local (set by background worker for cross-tab jumps)
  try {
    const result = await chrome.storage.local.get('cbm_pending_jump')
    const stored = result.cbm_pending_jump as PendingJump | undefined

    if (stored) {
      // Check TTL
      if (stored.expiresAt && Date.now() > stored.expiresAt) {
        // Expired — clean up
        await chrome.storage.local.remove('cbm_pending_jump')
      } else {
        // Check if this jump is for the current conversation
        const currentConvId = getConversationIdFromUrl()
        if (!stored.conversationId || stored.conversationId === currentConvId) {
          pendingId = stored.messageId
          pendingIndex = stored.messageIndex
          // Clear it so we don't jump again on next navigation
          await chrome.storage.local.remove('cbm_pending_jump')
        }
      }
    }
  } catch {
    // chrome.storage not available
  }

  // Method 2: Check sessionStorage (set by content script for same-origin jumps)
  if (!pendingId) {
    const raw = sessionStorage.getItem('cbm_pending_jump')
    if (raw) {
      sessionStorage.removeItem('cbm_pending_jump')
      try {
        const parsed = JSON.parse(raw) as PendingJump
        pendingId = parsed.messageId
        pendingIndex = parsed.messageIndex
      } catch {
        pendingId = raw
      }
    }
  }

  if (!pendingId) return

  const finalId = pendingId
  const finalIndex = pendingIndex

  console.log(`[ChatGPT Bookmarks] Pending jump found: ${finalId} (index: ${finalIndex})`)

  // Wait for the conversation to load and render initial messages
  await sleep(1500)

  let attempts = 0
  const maxAttempts = 20

  const tryJump = async (): Promise<void> => {
    attempts++
    console.log(`[ChatGPT Bookmarks] Jump attempt ${attempts}/${maxAttempts} for: ${finalId}`)

    const found = await jumpToMessage(finalId, finalIndex)

    if (!found && attempts < maxAttempts) {
      await sleep(600)
      await tryJump()
    }
  }

  await tryJump()
}
