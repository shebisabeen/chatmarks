/**
 * domAdapter.ts
 * ─────────────────────────────────────────────────────────────
 * THE single module that knows each AI platform's DOM structure.
 *
 * Supports: ChatGPT, Claude, Gemini
 * If a platform changes their UI, only this file needs updating.
 * ─────────────────────────────────────────────────────────────
 */

import type { MessageRole, ParsedMessage, ParsedConversation, Platform } from '../shared/types'

// ─── Platform Detection ───────────────────────────────────────

export function detectPlatform(url: string = window.location.href): Platform {
  if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) return 'chatgpt'
  if (url.includes('claude.ai')) return 'claude'
  if (url.includes('gemini.google.com')) return 'gemini'
  return 'unknown'
}

// ─── Conversation ID ─────────────────────────────────────────

export function getConversationIdFromUrl(url: string = window.location.href): string | null {
  // ChatGPT: chatgpt.com/c/<uuid> or chat.openai.com/c/<uuid>
  const chatgptMatch =
    url.match(/\/c\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i) ??
    url.match(/\/chat\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
  if (chatgptMatch) return chatgptMatch[1]

  // Claude: claude.ai/chat/<uuid>
  const claudeMatch = url.match(/claude\.ai\/chat\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
  if (claudeMatch) return claudeMatch[1]

  // Gemini: gemini.google.com/app/<id> (alphanumeric, no UUID format)
  const geminiMatch = url.match(/gemini\.google\.com\/app\/([a-zA-Z0-9_-]{8,})/i)
  if (geminiMatch) return `gemini_${geminiMatch[1]}`

  return null
}

// ─── Platform-specific Selectors ─────────────────────────────

interface PlatformConfig {
  messageTurnSelectors: string[]
  extractRole: (el: Element) => MessageRole
  extractMessageId: (el: Element, index: number, conversationId: string | null) => string | null
  extractText: (el: Element) => string
}

// ── ChatGPT ──────────────────────────────────────────────────

const CHATGPT_CONFIG: PlatformConfig = {
  messageTurnSelectors: [
    'article[data-testid^="conversation-turn-"]',
    '[data-testid^="conversation-turn-"]',
    'article[data-scroll-anchor]',
    'main article',
  ],

  extractRole(el) {
    const withRole = el.querySelector('[data-message-author-role]')
    if (withRole) {
      const role = withRole.getAttribute('data-message-author-role')
      if (role === 'user') return 'user'
      if (role === 'assistant') return 'assistant'
    }
    const testId = el.getAttribute('data-testid') ?? ''
    if (el.querySelector('[class*="user-message"]')) return 'user'
    if (el.querySelector('[class*="agent-turn"]')) return 'assistant'
    if (el.querySelector('[data-testid="user-avatar"]')) return 'user'
    if (el.querySelector('[data-testid="assistant-avatar"]')) return 'assistant'
    const turnMatch = testId.match(/conversation-turn-(\d+)/)
    if (turnMatch) {
      const n = parseInt(turnMatch[1], 10)
      return n % 2 === 1 ? 'user' : 'assistant'
    }
    return 'assistant'
  },

  extractMessageId(el) {
    const withMsgId = el.querySelector('[data-message-id]')
    if (withMsgId) {
      const id = withMsgId.getAttribute('data-message-id')
      if (id) return id
    }
    const testId = el.getAttribute('data-testid') ?? ''
    const uuidMatch = testId.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
    if (uuidMatch) return uuidMatch[0]
    return null
  },

  extractText(el) {
    const selectors = [
      '[data-message-id]',
      '.markdown.prose',
      '[class*="prose"]',
      '[class*="whitespace-pre-wrap"]',
      '[class*="text-message"]',
    ]
    for (const sel of selectors) {
      try {
        const found = el.querySelector(sel)
        if (found && found.textContent?.trim()) return found.textContent.trim()
      } catch { /* ignore */ }
    }
    return el.textContent?.trim() ?? ''
  },
}

// ── Claude ───────────────────────────────────────────────────

const CLAUDE_CONFIG: PlatformConfig = {
  messageTurnSelectors: [
    // Current Claude DOM (2025) — user message bubble
    '[data-user-message-bubble="true"]',
    // AI response — the outer group div that wraps the response + action bar
    // From the HTML: <div class="group" style="height: auto; opacity: 1; transform: none;">
    // which contains data-is-streaming inside it
    '[data-is-streaming]',
    // Broader fallback: the group div wrapping each AI response turn
    'div.group[style*="opacity"]',
  ],

  extractRole(el) {
    // User messages have data-user-message-bubble="true"
    if (el.getAttribute('data-user-message-bubble') === 'true') return 'user'

    // AI responses have data-is-streaming attribute
    if (el.hasAttribute('data-is-streaming')) return 'assistant'

    // Fallback: check for user message testid inside
    if (el.querySelector('[data-testid="user-message"]')) return 'user'

    return 'assistant'
  },

  extractMessageId(el, index, conversationId) {
    // Claude doesn't expose message IDs in the DOM — use index-based ID
    const role = el.getAttribute('data-user-message-bubble') === 'true' ? 'user' : 'assistant'
    return `claude_${conversationId ?? 'unknown'}_${role}_${index}`
  },

  extractText(el) {
    const selectors = [
      // Claude user message content
      '[data-testid="user-message"]',
      // Claude AI response content
      '.font-claude-response',
      // Fallback prose/markdown containers
      '[class*="prose"]',
      '[class*="markdown"]',
      'p',
    ]
    for (const sel of selectors) {
      try {
        const found = el.querySelector(sel)
        if (found && found.textContent?.trim()) return found.textContent.trim()
      } catch { /* ignore */ }
    }
    return el.textContent?.trim() ?? ''
  },
}

// ── Gemini ───────────────────────────────────────────────────

const GEMINI_CONFIG: PlatformConfig = {
  messageTurnSelectors: [
    // Current Gemini DOM (2024-2025)
    'user-query',
    'model-response',
    // Fallback
    '[class*="user-query"]',
    '[class*="model-response"]',
    'message-content',
  ],

  extractRole(el) {
    const tagName = el.tagName?.toLowerCase() ?? ''
    if (tagName === 'user-query') return 'user'
    if (tagName === 'model-response') return 'assistant'

    const className = el.className ?? ''
    if (className.includes('user') || className.includes('human')) return 'user'
    if (className.includes('model') || className.includes('assistant')) return 'assistant'

    return 'assistant'
  },

  extractMessageId(_el, _index, _conversationId) {
    // Gemini doesn't expose message IDs — use index-based ID
    return null
  },

  extractText(el) {
    const selectors = [
      // Gemini's message content
      'message-content',
      '[class*="response-content"]',
      '[class*="query-content"]',
      '[class*="markdown"]',
      'p',
    ]
    for (const sel of selectors) {
      try {
        const found = el.querySelector(sel)
        if (found && found.textContent?.trim()) return found.textContent.trim()
      } catch { /* ignore */ }
    }
    return el.textContent?.trim() ?? ''
  },
}

// ─── Platform Config Resolver ─────────────────────────────────

function getPlatformConfig(): PlatformConfig {
  const platform = detectPlatform()
  switch (platform) {
    case 'claude': return CLAUDE_CONFIG
    case 'gemini': return GEMINI_CONFIG
    default: return CHATGPT_CONFIG
  }
}

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

/**
 * For Claude: collect both user bubbles and AI responses in document order.
 * We can't use a single selector that returns both in order, so we merge and sort.
 */
function findAllClaude(): Element[] {
  const userEls = Array.from(document.querySelectorAll('[data-user-message-bubble="true"]'))
  const aiEls = Array.from(document.querySelectorAll('[data-is-streaming]'))

  if (userEls.length === 0 && aiEls.length === 0) return []

  // Merge and sort by DOM position
  const all = [...userEls, ...aiEls]
  all.sort((a, b) => {
    const pos = a.compareDocumentPosition(b)
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1
    return 0
  })

  return all
}

function hashText(text: string): string {
  let hash = 5381
  for (let i = 0; i < Math.min(text.length, 200); i++) {
    hash = (hash * 33) ^ text.charCodeAt(i)
  }
  return (hash >>> 0).toString(16)
}

// ─── Main Parser ─────────────────────────────────────────────

export function parseMessages(): ParsedMessage[] {
  const platform = detectPlatform()
  const config = getPlatformConfig()

  // Claude needs special handling to get both user + AI elements in order
  const turnEls = platform === 'claude'
    ? findAllClaude()
    : findAll(document, config.messageTurnSelectors)

  if (turnEls.length === 0) {
    return []
  }

  const messages: ParsedMessage[] = []
  const conversationId = getConversationIdFromUrl()

  turnEls.forEach((el, index) => {
    const role = config.extractRole(el)
    const text = config.extractText(el)

    if (!text) return

    const nativeId = config.extractMessageId(el, index, conversationId)
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
