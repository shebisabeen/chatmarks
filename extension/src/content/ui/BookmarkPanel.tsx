/**
 * BookmarkPanel.tsx
 * ─────────────────────────────────────────────────────────────
 * A floating in-chat bookmark panel injected into the ChatGPT page.
 * Shows bookmarks for the current conversation.
 * Rendered inside a Shadow DOM to avoid CSS conflicts.
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import type { Bookmark } from '../../shared/types'
import { getCurrentConversationBookmarks, deleteBookmark } from '../bookmarkManager'
import { jumpToMessage } from './highlighter'
import { UserIcon, ChatGPTIcon } from '../../popup/components/BookmarkCard'

// ─── Component ────────────────────────────────────────────────

function BookmarkPanel() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [collapsed, setCollapsed] = useState(true)
  const [jumping, setJumping] = useState<string | null>(null)

  const isDark =
    document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches

  const colors = {
    bg: isDark ? '#2d2d2d' : '#ffffff',
    border: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
    text: isDark ? '#ececec' : '#0d0d0d',
    muted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
    accent: '#10a37f',
    itemHover: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    shadow: isDark
      ? '0 4px 24px rgba(0,0,0,0.5)'
      : '0 4px 24px rgba(0,0,0,0.12)',
  }

  // ─── Load bookmarks ─────────────────────────────────────────

  const loadBookmarks = useCallback(async () => {
    const bms = await getCurrentConversationBookmarks()
    setBookmarks(bms)
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

  // ─── Actions ────────────────────────────────────────────────

  const handleJump = useCallback(async (bookmark: Bookmark) => {
    setJumping(bookmark.id)
    try {
      await jumpToMessage(bookmark.messageId, bookmark.messageIndex)
    } finally {
      setJumping(null)
    }
  }, [])

  const handleDelete = useCallback(
    async (e: React.MouseEvent, bookmarkId: string) => {
      e.stopPropagation()
      await deleteBookmark(bookmarkId)
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId))
    },
    [],
  )

  // Don't render if no bookmarks
  if (bookmarks.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        right: '16px',
        bottom: '100px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Expanded panel */}
      {!collapsed && (
        <div
          style={{
            width: '280px',
            maxHeight: '360px',
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            boxShadow: colors.shadow,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            marginBottom: '8px',
          }}
        >
          {/* Panel header */}
          <div
            style={{
              padding: '10px 12px',
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="#10a37f"
              xmlns="http://www.w3.org/2000/svg"
              style={{ flexShrink: 0 }}
            >
              <path d="M5 3a2 2 0 0 0-2 2v16l9-4 9 4V5a2 2 0 0 0-2-2H5z" />
            </svg>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: colors.text,
                flex: 1,
              }}
            >
              Bookmarks in this chat
            </span>
            <span
              style={{
                fontSize: '11px',
                color: colors.muted,
                background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                padding: '1px 7px',
                borderRadius: '10px',
              }}
            >
              {bookmarks.length}
            </span>
          </div>

          {/* Bookmark list */}
          <div
            style={{
              overflowY: 'auto',
              flex: 1,
              padding: '6px 0',
            }}
          >
            {bookmarks.map((bookmark) => (
              <BookmarkItem
                key={bookmark.id}
                bookmark={bookmark}
                isJumping={jumping === bookmark.id}
                onJump={handleJump}
                onDelete={handleDelete}
                colors={colors}
                isDark={isDark}
              />
            ))}
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? 'Show bookmarks in this chat' : 'Hide bookmarks'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          borderRadius: '20px',
          border: `1px solid ${colors.border}`,
          background: colors.bg,
          color: colors.text,
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 600,
          boxShadow: colors.shadow,
          transition: 'background 0.15s ease',
          outline: 'none',
        }}
      >
        {/* Bookmark ribbon icon in accent green */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="#10a37f"
          xmlns="http://www.w3.org/2000/svg"
          style={{ flexShrink: 0 }}
        >
          <path d="M5 3a2 2 0 0 0-2 2v16l9-4 9 4V5a2 2 0 0 0-2-2H5z" />
        </svg>
        <span>{bookmarks.length}</span>
        <span
          style={{
            fontSize: '10px',
            color: colors.muted,
            marginLeft: '2px',
          }}
        >
          {collapsed ? '▲' : '▼'}
        </span>
      </button>
    </div>
  )
}

// ─── Bookmark Item ────────────────────────────────────────────

interface BookmarkItemProps {
  bookmark: Bookmark
  isJumping: boolean
  onJump: (bookmark: Bookmark) => void
  onDelete: (e: React.MouseEvent, id: string) => void
  colors: Record<string, string>
  isDark: boolean
}

function BookmarkItem({
  bookmark,
  isJumping,
  onJump,
  onDelete,
  colors,
  isDark,
}: BookmarkItemProps) {
  const [hovered, setHovered] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const roleIcon =
    bookmark.role === 'user' ? <UserIcon size={13} /> : <ChatGPTIcon size={13} />

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirmDelete) {
      onDelete(e, bookmark.id)
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 2000)
    }
  }

  return (
    <div
      onClick={() => onJump(bookmark)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Click to jump to this message"
      style={{
        padding: '8px 12px',
        cursor: isJumping ? 'wait' : 'pointer',
        background: hovered ? colors.itemHover : 'transparent',
        transition: 'background 0.12s ease',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        opacity: isJumping ? 0.6 : 1,
      }}
    >
      <span style={{ flexShrink: 0, marginTop: '2px', display: 'inline-flex' }}>
        {isJumping ? (
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#10a37f"
            strokeWidth="2.5"
            strokeLinecap="round"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
        ) : (
          roleIcon
        )}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            fontWeight: 600,
            color: colors.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: '1.4',
          }}
        >
          {bookmark.title.replace(/^[💬🤖]\s*/, '')}
        </p>
        <p
          style={{
            margin: '2px 0 0',
            fontSize: '11px',
            color: colors.muted,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: '1.4',
          }}
        >
          {bookmark.snippet}
        </p>
      </div>
      {hovered && (
        <button
          onClick={handleDeleteClick}
          title={confirmDelete ? 'Click again to confirm' : 'Delete bookmark'}
          style={{
            flexShrink: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
            borderRadius: '4px',
            fontSize: '11px',
            color: confirmDelete
              ? '#ef4444'
              : isDark
                ? 'rgba(255,255,255,0.35)'
                : 'rgba(0,0,0,0.35)',
            transition: 'color 0.15s',
          }}
        >
          {confirmDelete ? '✓' : '🗑️'}
        </button>
      )}
    </div>
  )
}

// ─── Injection Logic ──────────────────────────────────────────

const PANEL_HOST_ID = 'cbm-panel-host'

export function injectBookmarkPanel(): void {
  // Remove existing panel if present
  const existing = document.getElementById(PANEL_HOST_ID)
  if (existing) existing.remove()

  const host = document.createElement('div')
  host.id = PANEL_HOST_ID

  document.body.appendChild(host)

  const shadow = host.attachShadow({ mode: 'open' })
  const container = document.createElement('div')
  shadow.appendChild(container)

  const root = createRoot(container)
  root.render(<BookmarkPanel />)
}

export function removeBookmarkPanel(): void {
  const host = document.getElementById(PANEL_HOST_ID)
  if (host) host.remove()
}
