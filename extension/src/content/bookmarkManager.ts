/**
 * bookmarkManager.ts
 * ─────────────────────────────────────────────────────────────
 * Business logic layer for bookmarks.
 * Sits between the UI and the storage layer.
 * No DOM knowledge here — only data operations.
 * ─────────────────────────────────────────────────────────────
 */

import type { Bookmark, ParsedMessage, MessageRole } from '../shared/types'
import * as db from '../storage/bookmarkDB'
import { getMessageId } from './messageIdentifier'
import { getConversationIdFromUrl } from './domAdapter'

// ─── Helpers ─────────────────────────────────────────────────

function generateId(): string {
  return `bm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function makeSnippet(text: string, maxLen = 120): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > maxLen ? clean.slice(0, maxLen) + '…' : clean
}

function makeTitle(text: string, role: MessageRole): string {
  const snippet = makeSnippet(text, 60)
  const prefix = role === 'user' ? '💬' : '🤖'
  return `${prefix} ${snippet}`
}

// ─── Core Operations ─────────────────────────────────────────

/**
 * Create a new bookmark for a parsed message.
 */
export async function createBookmark(
  message: ParsedMessage,
  overrides: Partial<Pick<Bookmark, 'title' | 'note' | 'tags'>> = {},
): Promise<Bookmark> {
  const conversationId = getConversationIdFromUrl()
  if (!conversationId) throw new Error('No active conversation found')

  const messageId = getMessageId(message)
  const now = Date.now()

  const bookmark: Bookmark = {
    id: generateId(),
    conversationId,
    messageId,
    conversationUrl: window.location.href,
    title: overrides.title ?? makeTitle(message.text, message.role),
    note: overrides.note ?? '',
    tags: overrides.tags ?? [],
    snippet: makeSnippet(message.text),
    role: message.role,
    messageIndex: message.index,
    createdAt: now,
    updatedAt: now,
  }

  await db.save(bookmark)
  return bookmark
}

/**
 * Delete a bookmark by its ID.
 */
export async function deleteBookmark(bookmarkId: string): Promise<void> {
  await db.remove(bookmarkId)
}

/**
 * Check if a message is already bookmarked.
 */
export async function isBookmarked(message: ParsedMessage): Promise<boolean> {
  const conversationId = getConversationIdFromUrl()
  if (!conversationId) return false

  const messageId = getMessageId(message)
  const existing = await db.findByMessageId(conversationId, messageId)
  return !!existing
}

/**
 * Check if a message is bookmarked by its IDs directly.
 */
export async function isBookmarkedById(
  conversationId: string,
  messageId: string,
): Promise<boolean> {
  const existing = await db.findByMessageId(conversationId, messageId)
  return !!existing
}

/**
 * Toggle bookmark on a message.
 * Returns the created bookmark, or null if it was removed.
 */
export async function toggleBookmark(message: ParsedMessage): Promise<Bookmark | null> {
  const conversationId = getConversationIdFromUrl()
  if (!conversationId) throw new Error('No active conversation found')

  const messageId = getMessageId(message)
  const existing = await db.findByMessageId(conversationId, messageId)

  if (existing) {
    await db.remove(existing.id)
    return null
  } else {
    return createBookmark(message)
  }
}

/**
 * Update a bookmark's title, note, or tags.
 */
export async function updateBookmark(
  bookmarkId: string,
  fields: Partial<Pick<Bookmark, 'title' | 'note' | 'tags'>>,
): Promise<Bookmark | null> {
  return db.update(bookmarkId, fields)
}

/**
 * Get all bookmarks.
 */
export async function getAllBookmarks(): Promise<Bookmark[]> {
  return db.list()
}

/**
 * Get bookmarks for the current conversation.
 */
export async function getCurrentConversationBookmarks(): Promise<Bookmark[]> {
  const conversationId = getConversationIdFromUrl()
  if (!conversationId) return []
  return db.listByConversation(conversationId)
}

/**
 * Search bookmarks.
 */
export async function searchBookmarks(query: string): Promise<Bookmark[]> {
  return db.search(query)
}

/**
 * Mark a bookmark as visited (update visitedAt).
 */
export async function markVisited(bookmarkId: string): Promise<void> {
  await db.update(bookmarkId, { visitedAt: Date.now() })
}

/**
 * Find a bookmark by conversationId + messageId.
 */
export async function findBookmark(
  conversationId: string,
  messageId: string,
): Promise<Bookmark | undefined> {
  return db.findByMessageId(conversationId, messageId)
}
