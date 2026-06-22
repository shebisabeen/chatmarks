/**
 * domAdapter.ts
 * ─────────────────────────────────────────────────────────────
 * THE single module that knows ChatGPT's DOM structure.
 *
 * If OpenAI changes their UI, only this file needs updating.
 * ─────────────────────────────────────────────────────────────
 */

import type { MessageRole, ParsedMessage, ParsedConversation } from '../shared/types'

// ─── Selectors ────────────────────────────────────────────────

/**
 * Individual message turn containers — ordered by specificity.
 * ChatGPT 2024/2025 uses article elements with data-testid="conversation-turn-N"
 */
const MESSAGE_TURN_SELECTORS = [
  // Most specific — current ChatGPT DOM (2024-2025)
  'article[data-testid^="conversation-turn-"]',
  // Fallback variants
  '[data-testid^="conversation-turn-"]',
  'article[data-scroll-anchor]',
  // Generic article fallback
  'main article',
]

// ─── Helpers ─────────────────────────────────────────────────

function findAll(parent: Element | Document, selectors: string[]): Element[] {
  for (const sel of selectors) {
    try {
      const els = Array.from(parent.querySelectorAll(sel))
      if (els.length > 0) return els
    } catch {
      // ignore invalid selectors
    }
  }
  return []
}

function extractRole(turnEl: Element): MessageRole {
  // Most reliable: data-message-author-role on a child element
  const withRole = turnEl.querySelector('[data-message-author-role]')
  if (withRole) {
    const role = withRole.getAttribute('data-message-author-role')
    if (role === 'user') return 'user'
    if (role === 'assistant') return 'assistant'
  }

  // Check data-testid on the turn element itself
  const testId = turnEl.getAttribute('data-testid') ?? ''
  // ChatGPT uses even indices for user, odd for assistant (not reliable, skip)
  // Check for class hints
  if (turnEl.querySelector('[class*="user-message"]')) return 'user'
  if (turnEl.querySelector('[class*="agent-turn"]')) return 'assistant'

  // Check if there's a user avatar vs assistant avatar
  if (turnEl.querySelector('[data-testid="user-avatar"]')) return 'user'
  if (turnEl.querySelector('[data-testid="assistant-avatar"]')) return 'assistant'

  // Fallback: look at the turn number — even = user, odd = assistant in ChatGPT
  const turnMatch = testId.match(/conversation-turn-(\d+)/)
  if (turnMatch) {
    const n = parseInt(turnMatch[1], 10)
    return n % 2 === 1 ? 'user' : 'assistant'
  }

  return 'assistant'
}

function extractMessageId(turnEl: Element): string | null {
  // Priority 1: data-message-id on a child element
  const withMsgId = turnEl.querySelector('[data-message-id]')
  if (withMsgId) {
    const id = withMsgId.getAttribute('data-message-id')
    if (id) return id
  }

  // Priority 2: UUID in data-testid
  const testId = turnEl.getAttribute('data-testid') ?? ''
  const uuidMatch = testId.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  if (uuidMatch) return uuidMatch[0]

  return null
}

function extractText(turnEl: Element): string {
  // Try message content selectors in order of preference
  const contentSelectors = [
    '[data-message-id]',           // ChatGPT's message content wrapper
    '.markdown.prose',             // Rendered markdown
    '[class*="prose"]',            // Prose container
    '[class*="whitespace-pre-wrap"]', // User messages
    '[class*="text-message"]',     // Text message container
  ]

  for (const sel of contentSelectors) {
    try {
      const el = turnEl.querySelector(sel)
      if (el && el.textContent?.trim()) {
        return el.textContent.trim()
      }
    } catch {
      // ignore
    }
  }

  // Last resort: full text content of the turn
  return turnEl.textContent?.trim() ?? ''
}

function hashText(text: string): string {
  let hash = 5381
  for (let i = 0; i < Math.min(text.length, 200); i++) {
    hash = (hash * 33) ^ text.charCodeAt(i)
  }
  return (hash >>> 0).toString(16)
}

// ─── Conversation ID ─────────────────────────────────────────

export function getConversationIdFromUrl(url: string = window.location.href): string | null {
  // chatgpt.com/c/<uuid>
  const match = url.match(/\/c\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
    ?? url.match(/\/chat\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
  return match ? match[1] : null
}

// ─── Main Parser ─────────────────────────────────────────────

export function parseMessages(): ParsedMessage[] {
  const turnEls = findAll(document, MESSAGE_TURN_SELECTORS)

  if (turnEls.length === 0) {
    return []
  }

  const messages: ParsedMessage[] = []
  const conversationId = getConversationIdFromUrl()

  turnEls.forEach((el, index) => {
    const role = extractRole(el)
    const text = extractText(el)

    if (!text) return

    const nativeId = extractMessageId(el)
    const id = nativeId ?? `${conversationId ?? 'unknown'}:${index}:${hashText(text)}`

    // Tag the element for later lookup
    el.setAttribute('data-cbm-id', id)
    el.setAttribute('data-cbm-index', String(index))

    messages.push({
      id,
      role,
      text,
      element: el as HTMLElement,
      index,
    })
  })

  return messages
}

export function parseConversation(): ParsedConversation | null {
  const conversationId = getConversationIdFromUrl()
  if (!conversationId) return null

  return {
    id: conversationId,
    messages: parseMessages(),
    url: window.location.href,
  }
}

export function findMessageElement(messageId: string): HTMLElement | null {
  // Try our injected attribute first
  const byAttr = document.querySelector(`[data-cbm-id="${messageId}"]`)
  if (byAttr) return byAttr as HTMLElement

  // Try native data-message-id — find the article ancestor
  const native = document.querySelector(`[data-message-id="${messageId}"]`)
  if (native) {
    const article = native.closest('article')
    return (article ?? native) as HTMLElement
  }

  return null
}

export function getConversationContainer(): Element | null {
  return document.querySelector('main') ?? null
}
