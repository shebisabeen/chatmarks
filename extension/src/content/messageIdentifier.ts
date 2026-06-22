/**
 * messageIdentifier.ts
 * ─────────────────────────────────────────────────────────────
 * Generates stable, unique identifiers for ChatGPT messages.
 *
 * Priority:
 *  1. Native ChatGPT data-message-id (UUID from their API)
 *  2. data-testid UUID extraction
 *  3. URL anchor (if present)
 *  4. Hash of message text content
 *  5. conversationId:index (last resort)
 * ─────────────────────────────────────────────────────────────
 */

import type { ParsedMessage } from '../shared/types'
import { getConversationIdFromUrl } from './domAdapter'

// ─── Hash Utility ─────────────────────────────────────────────

/**
 * djb2 hash — fast, deterministic, good enough for message IDs.
 */
function djb2Hash(text: string, maxChars = 300): string {
  let hash = 5381
  const len = Math.min(text.length, maxChars)
  for (let i = 0; i < len; i++) {
    hash = (hash * 33) ^ text.charCodeAt(i)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

// ─── ID Extraction Strategies ─────────────────────────────────

function tryNativeMessageId(element: HTMLElement): string | null {
  // Direct attribute
  const direct = element.getAttribute('data-message-id')
  if (direct) return direct

  // Child element with data-message-id
  const child = element.querySelector('[data-message-id]')
  if (child) {
    const id = child.getAttribute('data-message-id')
    if (id) return id
  }

  return null
}

function tryTestIdUuid(element: HTMLElement): string | null {
  const testId = element.getAttribute('data-testid') ?? ''
  const match = testId.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  return match ? match[0] : null
}

function tryUrlAnchor(): string | null {
  const hash = window.location.hash
  if (hash && hash.length > 1) {
    return hash.slice(1) // remove the '#'
  }
  return null
}

function buildHashId(text: string, conversationId: string | null, index: number): string {
  const textHash = djb2Hash(text)
  const convPart = conversationId ? conversationId.slice(0, 8) : 'unknown'
  return `cbm_${convPart}_${index}_${textHash}`
}

// ─── Main API ─────────────────────────────────────────────────

/**
 * Get a stable identifier for a parsed message.
 * This is the single source of truth for message IDs.
 */
export function getMessageId(message: ParsedMessage): string {
  const { element, text, index } = message

  // Priority 1: Native ChatGPT message ID (most stable)
  const nativeId = tryNativeMessageId(element)
  if (nativeId) return nativeId

  // Priority 2: UUID from data-testid
  const testIdUuid = tryTestIdUuid(element)
  if (testIdUuid) return testIdUuid

  // Priority 3: URL anchor (only useful for the currently focused message)
  const urlAnchor = tryUrlAnchor()
  if (urlAnchor && urlAnchor.length > 8) return urlAnchor

  // Priority 4: Hash of text content
  const conversationId = getConversationIdFromUrl()
  return buildHashId(text, conversationId, index)
}

/**
 * Check if two message IDs refer to the same message.
 * Handles cases where the same message might have different ID formats.
 */
export function isSameMessage(id1: string, id2: string): boolean {
  if (id1 === id2) return true

  // Both might be UUIDs — compare case-insensitively
  return id1.toLowerCase() === id2.toLowerCase()
}
