/**
 * pageDetector.ts
 * ─────────────────────────────────────────────────────────────
 * Detects ChatGPT page state and SPA navigation changes.
 * Emits events: PageLoaded, ConversationChanged, MessageAdded
 * ─────────────────────────────────────────────────────────────
 */

import type { PageEvent } from '../shared/types'
import { getConversationIdFromUrl } from './domAdapter'

type EventHandler = (event: PageEvent) => void

// ─── State ───────────────────────────────────────────────────

let currentConversationId: string | null = null
let observers: MutationObserver[] = []
const handlers: EventHandler[] = []

// ─── Public API ──────────────────────────────────────────────

export function onPageEvent(handler: EventHandler): () => void {
  handlers.push(handler)
  return () => {
    const idx = handlers.indexOf(handler)
    if (idx !== -1) handlers.splice(idx, 1)
  }
}

function emit(event: PageEvent): void {
  handlers.forEach((h) => h(event))
}

// ─── URL / SPA Detection ─────────────────────────────────────

function checkConversationChange(): void {
  const newId = getConversationIdFromUrl()
  if (newId !== currentConversationId) {
    currentConversationId = newId
    if (newId) {
      emit({ type: 'ConversationChanged', conversationId: newId })
    }
  }
}

/**
 * Intercept history.pushState and history.replaceState
 * to detect SPA navigation in ChatGPT.
 */
function patchHistory(): void {
  const originalPushState = history.pushState.bind(history)
  const originalReplaceState = history.replaceState.bind(history)

  history.pushState = function (...args) {
    originalPushState(...args)
    setTimeout(checkConversationChange, 100)
  }

  history.replaceState = function (...args) {
    originalReplaceState(...args)
    setTimeout(checkConversationChange, 100)
  }

  window.addEventListener('popstate', () => {
    setTimeout(checkConversationChange, 100)
  })
}

// ─── DOM Mutation Observer ────────────────────────────────────

/**
 * Watch for new message elements being added to the conversation.
 * Uses a debounced approach to avoid firing too frequently.
 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function watchForNewMessages(): void {
  // Clean up existing observers
  observers.forEach((o) => o.disconnect())
  observers = []

  const observer = new MutationObserver((mutations) => {
    let hasNewNodes = false

    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        hasNewNodes = true
        break
      }
    }

    if (!hasNewNodes) return

    // Debounce to avoid firing on every tiny DOM change
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      checkConversationChange()
    }, 300)
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  observers.push(observer)
}

// ─── Title Observer ───────────────────────────────────────────

/**
 * Watch for title changes as a secondary signal for navigation.
 */
function watchTitle(): void {
  const titleObserver = new MutationObserver(() => {
    setTimeout(checkConversationChange, 200)
  })

  const titleEl = document.querySelector('title')
  if (titleEl) {
    titleObserver.observe(titleEl, { childList: true })
    observers.push(titleObserver)
  }
}

// ─── Init ─────────────────────────────────────────────────────

export function initPageDetector(): void {
  // Patch history API for SPA navigation
  patchHistory()

  // Watch DOM for changes
  watchForNewMessages()

  // Watch title changes
  watchTitle()

  // Emit initial page load event
  currentConversationId = getConversationIdFromUrl()
  emit({ type: 'PageLoaded', conversationId: currentConversationId })
}

export function destroyPageDetector(): void {
  observers.forEach((o) => o.disconnect())
  observers = []
  handlers.length = 0
}

export function getCurrentConversationId(): string | null {
  return currentConversationId
}
