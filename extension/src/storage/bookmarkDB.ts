/**
 * bookmarkDB.ts
 * Chrome Storage API wrapper for bookmarks.
 * All bookmark persistence lives here.
 */

import type { Bookmark } from '../shared/types'

const STORAGE_KEY = 'chatgpt_bookmarks'

// ─── Helpers ────────────────────────────────────────────────

async function readAll(): Promise<Record<string, Bookmark>> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  return (result[STORAGE_KEY] as Record<string, Bookmark>) ?? {}
}

async function writeAll(data: Record<string, Bookmark>): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: data })
}

// ─── Public API ─────────────────────────────────────────────

/** Save (create or overwrite) a bookmark */
export async function save(bookmark: Bookmark): Promise<void> {
  const all = await readAll()
  all[bookmark.id] = bookmark
  await writeAll(all)
}

/** Delete a bookmark by id */
export async function remove(id: string): Promise<void> {
  const all = await readAll()
  delete all[id]
  await writeAll(all)
}

/** Get a single bookmark by id */
export async function get(id: string): Promise<Bookmark | undefined> {
  const all = await readAll()
  return all[id]
}

/** List all bookmarks, sorted by createdAt descending */
export async function list(): Promise<Bookmark[]> {
  const all = await readAll()
  return Object.values(all).sort((a, b) => b.createdAt - a.createdAt)
}

/** List bookmarks for a specific conversation */
export async function listByConversation(conversationId: string): Promise<Bookmark[]> {
  const all = await readAll()
  return Object.values(all)
    .filter((b) => b.conversationId === conversationId)
    .sort((a, b) => a.createdAt - b.createdAt)
}

/** Update specific fields of a bookmark */
export async function update(id: string, fields: Partial<Bookmark>): Promise<Bookmark | null> {
  const all = await readAll()
  if (!all[id]) return null
  all[id] = { ...all[id], ...fields, updatedAt: Date.now() }
  await writeAll(all)
  return all[id]
}

/** Search bookmarks by query string (title, note, tags, snippet) */
export async function search(query: string): Promise<Bookmark[]> {
  if (!query.trim()) return list()
  const q = query.toLowerCase()
  const all = await readAll()
  return Object.values(all)
    .filter((b) => {
      return (
        b.title.toLowerCase().includes(q) ||
        b.note.toLowerCase().includes(q) ||
        b.snippet.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
    .sort((a, b) => b.createdAt - a.createdAt)
}

/** Find a bookmark by conversationId + messageId */
export async function findByMessageId(
  conversationId: string,
  messageId: string,
): Promise<Bookmark | undefined> {
  const all = await readAll()
  return Object.values(all).find(
    (b) => b.conversationId === conversationId && b.messageId === messageId,
  )
}

/** Clear all bookmarks (for testing / reset) */
export async function clearAll(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY)
}
