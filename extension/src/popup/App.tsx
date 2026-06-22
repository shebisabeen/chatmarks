/**
 * App.tsx
 * ─────────────────────────────────────────────────────────────
 * Main popup UI.
 * Shows bookmarks, search, sort, stats, and jump-to-message.
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Bookmark, Platform } from '../shared/types'
import * as db from '../storage/bookmarkDB'
import { BookmarkCard } from './components/BookmarkCard'
import { SearchBar } from './components/SearchBar'

type SortOrder = 'newest' | 'oldest'
type PlatformFilter = Platform | 'all'

export default function App() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [query, setQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [loading, setLoading] = useState(true)
  const [jumpStatus, setJumpStatus] = useState<string | null>(null)

  // ─── Load bookmarks ─────────────────────────────────────────

  const loadBookmarks = useCallback(async () => {
    const all = await db.list()
    setBookmarks(all)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadBookmarks()
  }, [loadBookmarks])

  // Live sync: listen for storage changes
  useEffect(() => {
    const handler = () => loadBookmarks()
    chrome.storage.onChanged.addListener(handler)
    return () => chrome.storage.onChanged.removeListener(handler)
  }, [loadBookmarks])

  // ─── Filter + Sort ──────────────────────────────────────────

  // Which platforms actually have bookmarks (for showing filter tabs)
  const activePlatforms = useMemo(() => {
    const platforms = new Set(bookmarks.map((b) => b.platform ?? 'unknown'))
    return Array.from(platforms).filter((p) => p !== 'unknown') as Platform[]
  }, [bookmarks])

  const filtered = useMemo(() => {
    let result = bookmarks

    // Platform filter
    if (platformFilter !== 'all') {
      result = result.filter((b) => (b.platform ?? 'unknown') === platformFilter)
    }

    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.snippet.toLowerCase().includes(q) ||
          b.note.toLowerCase().includes(q) ||
          b.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }

    return [...result].sort((a, b) =>
      sortOrder === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt,
    )
  }, [bookmarks, query, sortOrder, platformFilter])

  // ─── Actions ────────────────────────────────────────────────

  const handleJump = useCallback(async (bookmark: Bookmark) => {
    setJumpStatus('Jumping…')

    // Update visitedAt
    await db.update(bookmark.id, { visitedAt: Date.now() })

    // Send jump message to background
    chrome.runtime.sendMessage(
      {
        type: 'JUMP_TO_MESSAGE',
        payload: {
          conversationId: bookmark.conversationId,
          messageId: bookmark.messageId,
          conversationUrl: bookmark.conversationUrl,
          messageIndex: bookmark.messageIndex,
        },
      },
      () => {
        setJumpStatus(null)
        // Close popup after jump
        window.close()
      },
    )
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    await db.remove(id)
    setBookmarks((prev) => prev.filter((b) => b.id !== id))
  }, [])

  const handleRename = useCallback(async (id: string, newTitle: string) => {
    await db.update(id, { title: newTitle })
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, title: newTitle } : b)),
    )
  }, [])

  // ─── Render ─────────────────────────────────────────────────

  const isDark =
    window.matchMedia('(prefers-color-scheme: dark)').matches

  const colors = {
    bg: isDark ? '#212121' : '#ffffff',
    surface: isDark ? '#2d2d2d' : '#f9f9f9',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    text: isDark ? '#ececec' : '#0d0d0d',
    muted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
    accent: '#10a37f',
  }

  return (
    <div
      style={{
        width: '400px',
        minHeight: '500px',
        maxHeight: '600px',
        display: 'flex',
        flexDirection: 'column',
        background: colors.bg,
        color: colors.text,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 16px 12px',
          borderBottom: `1px solid ${colors.border}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="#10a37f"
            xmlns="http://www.w3.org/2000/svg"
            style={{ marginRight: '8px', flexShrink: 0 }}
          >
            <path d="M5 3a2 2 0 0 0-2 2v16l9-4 9 4V5a2 2 0 0 0-2-2H5z" />
          </svg>
          <h1
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 700,
              flex: 1,
            }}
          >
            AI Bookmarks
          </h1>
          <span
            style={{
              fontSize: '12px',
              color: colors.muted,
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              padding: '2px 8px',
              borderRadius: '10px',
            }}
          >
            {bookmarks.length} saved
          </span>
        </div>

        {/* Search */}
        <SearchBar value={query} onChange={setQuery} isDark={isDark} />

        {/* Platform filter tabs — only shown when bookmarks from multiple platforms exist */}
        {activePlatforms.length > 1 && (
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
            {(['all', ...activePlatforms] as PlatformFilter[]).map((p) => {
              const platformMeta: Record<string, { label: string; activeColor: string }> = {
                all:     { label: 'All',     activeColor: colors.accent },
                chatgpt: { label: 'ChatGPT', activeColor: '#10a37f' },
                claude:  { label: 'Claude',  activeColor: '#d28250' },
                gemini:  { label: 'Gemini',  activeColor: '#4285f4' },
              }
              const meta = platformMeta[p] ?? { label: p, activeColor: colors.accent }
              const isActive = platformFilter === p
              return (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    border: `1px solid ${isActive ? meta.activeColor : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: isActive
                      ? `${meta.activeColor}20`
                      : 'transparent',
                    color: isActive ? meta.activeColor : colors.muted,
                    transition: 'all 0.15s',
                  }}
                >
                  {meta.label}
                  {p !== 'all' && (
                    <span style={{ marginLeft: '4px', opacity: 0.7 }}>
                      {bookmarks.filter((b) => (b.platform ?? 'unknown') === p).length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Sort controls */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['newest', 'oldest'] as SortOrder[]).map((order) => (
            <button
              key={order}
              onClick={() => setSortOrder(order)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 500,
                background:
                  sortOrder === order
                    ? colors.accent
                    : isDark
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(0,0,0,0.06)',
                color: sortOrder === order ? '#fff' : colors.muted,
                transition: 'all 0.15s',
              }}
            >
              {order === 'newest' ? '↓ Newest' : '↑ Oldest'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
        }}
      >
        {loading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: colors.muted,
              fontSize: '14px',
            }}
          >
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState query={query} colors={colors} />
        ) : (
          <>
            {jumpStatus && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(16, 163, 127, 0.1)',
                  color: colors.accent,
                  fontSize: '13px',
                  marginBottom: '10px',
                  textAlign: 'center',
                }}
              >
                {jumpStatus}
              </div>
            )}
            {filtered.map((bookmark) => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                onJump={handleJump}
                onDelete={handleDelete}
                onRename={handleRename}
                isDark={isDark}
              />
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '10px 16px',
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '11px', color: colors.muted }}>
          {filtered.length !== bookmarks.length
            ? `${filtered.length} of ${bookmarks.length} bookmarks`
            : `${bookmarks.length} bookmark${bookmarks.length !== 1 ? 's' : ''}`}
        </span>
        <a
          href="https://chatgpt.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '11px',
            color: colors.accent,
            textDecoration: 'none',
          }}
        >
          Open ChatGPT →
        </a>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────

interface EmptyStateProps {
  query: string
  colors: Record<string, string>
}

function EmptyState({ query, colors }: EmptyStateProps) {
  if (query) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '200px',
          gap: '8px',
          color: colors.muted,
        }}
      >
        <span style={{ fontSize: '32px' }}>🔍</span>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>No results found</p>
        <p style={{ margin: 0, fontSize: '12px' }}>
          No bookmarks match "<strong>{query}</strong>"
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '280px',
        gap: '12px',
        color: colors.muted,
        textAlign: 'center',
        padding: '0 24px',
      }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="#10a37f"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.4 }}
      >
        <path d="M5 3a2 2 0 0 0-2 2v16l9-4 9 4V5a2 2 0 0 0-2-2H5z" />
      </svg>
      <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: colors.text }}>
        No bookmarks yet
      </p>
      <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5' }}>
        Open ChatGPT and click the bookmark button next to any message to save it.
      </p>
    </div>
  )
}
