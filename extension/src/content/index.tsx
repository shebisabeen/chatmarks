/**
 * content/index.tsx
 * ─────────────────────────────────────────────────────────────
 * Content script entry point.
 * Orchestrates all content-side modules.
 * ─────────────────────────────────────────────────────────────
 */

import { initPageDetector, onPageEvent } from './pageDetector'
import { parseMessages, getConversationIdFromUrl } from './domAdapter'
import { injectBookmarkButton, removeAllBookmarkButtons } from './ui/BookmarkButton'
import { checkPendingJump, jumpToBookmark } from './ui/highlighter'
import { injectBookmarkPanel } from './ui/BookmarkPanel'
import type { ChromeMessage, JumpToMessagePayload } from '../shared/types'

// ─── Button Injection ─────────────────────────────────────────

let injectionTimer: ReturnType<typeof setTimeout> | null = null

function injectButtons(): void {
  const conversationId = getConversationIdFromUrl()
  if (!conversationId) return

  const messages = parseMessages()
  console.log(`[ChatGPT Bookmarks] Found ${messages.length} messages, injecting buttons`)

  messages.forEach((message) => {
    injectBookmarkButton(message.element, message, conversationId)
  })
}

function scheduleInjection(delay = 500): void {
  if (injectionTimer) clearTimeout(injectionTimer)
  injectionTimer = setTimeout(injectButtons, delay)
}

// ─── Message Listener (from popup/background) ─────────────────

chrome.runtime.onMessage.addListener(
  (message: ChromeMessage, _sender, sendResponse) => {
    if (message.type === 'JUMP_TO_MESSAGE') {
      const payload = message.payload as JumpToMessagePayload
      jumpToBookmark(payload.conversationUrl, payload.messageId, payload.messageIndex)
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: String(err) }))
      return true
    }

    if (message.type === 'GET_CURRENT_CONVERSATION') {
      const conversationId = getConversationIdFromUrl()
      sendResponse({ conversationId, url: window.location.href })
      return false
    }
  }
)

// ─── Page Event Handling ──────────────────────────────────────

function handlePageEvents(): void {
  onPageEvent((event) => {
    switch (event.type) {
      case 'PageLoaded':
        scheduleInjection(1200)
        checkPendingJump()
        break

      case 'ConversationChanged':
        removeAllBookmarkButtons()
        scheduleInjection(1200)
        // Re-inject panel for the new conversation
        setTimeout(() => injectBookmarkPanel(), 1500)
        // Check for pending cross-conversation jump
        checkPendingJump()
        break
    }
  })
}

// ─── MutationObserver for new messages ───────────────────────

function watchForNewMessages(): void {
  let lastMessageCount = 0
  let debounce: ReturnType<typeof setTimeout> | null = null

  const observer = new MutationObserver(() => {
    if (debounce) clearTimeout(debounce)
    debounce = setTimeout(() => {
      const conversationId = getConversationIdFromUrl()
      if (!conversationId) return

      const messages = parseMessages()
      if (messages.length !== lastMessageCount) {
        lastMessageCount = messages.length
        // Inject immediately for new messages (no extra delay)
        injectButtons()
      }
    }, 400)
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

// ─── Init ─────────────────────────────────────────────────────

function init(): void {
  console.log('[ChatGPT Bookmarks] Content script initialized')

  initPageDetector()
  handlePageEvents()
  watchForNewMessages()

  // Multiple injection attempts to handle slow-loading conversations
  scheduleInjection(800)
  scheduleInjection(2000)
  scheduleInjection(4000)

  // Inject the in-chat bookmark panel
  setTimeout(() => injectBookmarkPanel(), 1500)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
