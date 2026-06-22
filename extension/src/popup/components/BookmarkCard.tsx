/**
 * BookmarkCard.tsx
 * A single bookmark item in the popup list.
 */

import { useState, useRef, useEffect } from 'react'
import type { Bookmark } from '../../shared/types'

interface BookmarkCardProps {
  bookmark: Bookmark
  onJump: (bookmark: Bookmark) => void
  onDelete: (id: string) => void
  onRename: (id: string, newTitle: string) => void
  isDark?: boolean
}

// ─── Shared SVG Icons ─────────────────────────────────────────

/** Person silhouette — user messages */
export function UserIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#6366f1" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  )
}

/** ChatGPT-style circle logo — AI responses */
export function ChatGPTIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835 9.964 9.964 0 0 0-6.211-2.681 10.079 10.079 0 0 0-9.592 6.977 9.967 9.967 0 0 0-6.664 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 6.211 2.682 10.08 10.08 0 0 0 9.593-6.979 9.967 9.967 0 0 0 6.663-4.834 10.079 10.079 0 0 0-1.24-11.817zm-17.297 24.12a7.474 7.474 0 0 1-4.799-1.735c.061-.033.168-.091.237-.134l7.964-4.6a1.294 1.294 0 0 0 .655-1.134V19.054l3.366 1.944a.12.12 0 0 1 .066.092v9.299a7.505 7.505 0 0 1-7.49 7.601zm-16.124-6.908a7.471 7.471 0 0 1-.894-5.023c.06.036.162.099.237.141l7.964 4.6a1.297 1.297 0 0 0 1.308 0l9.724-5.614v3.888a.12.12 0 0 1-.048.103l-8.051 4.649a7.504 7.504 0 0 1-10.24-2.744zm-2.09-17.496a7.47 7.47 0 0 1 3.908-3.285c0 .068-.004.19-.004.274v9.201a1.294 1.294 0 0 0 .654 1.132l9.723 5.614-3.366 1.944a.12.12 0 0 1-.114.012L8.017 21.439a7.504 7.504 0 0 1-3.996-8.853zm27.658 6.437l-9.724-5.615 3.367-1.943a.121.121 0 0 1 .114-.012l8.048 4.648a7.498 7.498 0 0 1-1.158 13.528v-9.476a1.293 1.293 0 0 0-.647-1.13zm3.35-5.043c-.059-.037-.162-.099-.236-.141l-7.965-4.6a1.298 1.298 0 0 0-1.308 0l-9.723 5.614v-3.888a.12.12 0 0 1 .048-.103l8.05-4.645a7.497 7.497 0 0 1 11.135 7.763zm-21.063 6.929l-3.367-1.944a.12.12 0 0 1-.065-.092v-9.299a7.497 7.497 0 0 1 12.293-5.756 6.94 6.94 0 0 0-.236.134l-7.965 4.6a1.294 1.294 0 0 0-.654 1.132l-.006 11.225zm1.829-3.943l4.33-2.501 4.332 2.498v4.996l-4.331 2.5-4.331-2.5V21.967z"
        fill="#10a37f"
      />
    </svg>
  )
}

/** Bookmark ribbon icon */
export function BookmarkIcon({ size = 14, filled = true, color = '#10a37f', strokeColor = 'rgba(0,0,0,0.4)' }: { size?: number; filled?: boolean; color?: string; strokeColor?: string }) {
  if (filled) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
        <path d="M5 3a2 2 0 0 0-2 2v16l9-4 9 4V5a2 2 0 0 0-2-2H5z" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 3a2 2 0 0 0-2 2v16l9-4 9 4V5a2 2 0 0 0-2-2H5z" />
    </svg>
  )
}

// ─── BookmarkCard ─────────────────────────────────────────────

export function BookmarkCard({ bookmark, onJump, onDelete, onRename, isDark = false }: BookmarkCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const timeAgo = formatTimeAgo(bookmark.createdAt)
  const roleIcon = bookmark.role === 'user' ? <UserIcon size={14} /> : <ChatGPTIcon size={14} />
  const displayTitle = bookmark.title.replace(/^[💬🤖]\s*/, '')

  // Focus input when editing starts
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirmDelete) {
      onDelete(bookmark.id)
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 2000)
    }
  }

  function handleEditStart(e: React.MouseEvent) {
    e.stopPropagation()
    setEditValue(displayTitle)
    setEditing(true)
  }

  function handleEditSave(e?: React.MouseEvent) {
    e?.stopPropagation()
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== displayTitle) {
      onRename(bookmark.id, trimmed)
    }
    setEditing(false)
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleEditSave()
    } else if (e.key === 'Escape') {
      setEditing(false)
    }
  }

  return (
    <div
      onClick={() => !editing && onJump(bookmark)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false) }}
      style={{
        padding: '12px 14px',
        borderRadius: '10px',
        cursor: editing ? 'default' : 'pointer',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
        marginBottom: '8px',
        transition: 'background 0.15s ease',
        position: 'relative',
        background: hovered && !editing
          ? isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)'
          : isDark ? 'rgba(255,255,255,0.04)' : 'transparent',
      }}
      className="bookmark-card"
      title={editing ? undefined : 'Click to jump to this message'}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
        <span style={{ flexShrink: 0, marginTop: editing ? '6px' : '2px', display: 'inline-flex' }}>{roleIcon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleEditKeyDown}
              onClick={(e) => e.stopPropagation()}
              placeholder="Bookmark name…"
              style={{
                width: '100%',
                fontSize: '13px',
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: '5px',
                border: `1px solid #10a37f`,
                outline: 'none',
                background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                color: isDark ? '#ececec' : '#0d0d0d',
                boxSizing: 'border-box',
              }}
            />
          ) : (
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                fontWeight: 600,
                lineHeight: '1.4',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: isDark ? '#ececec' : '#0d0d0d',
              }}
            >
              {displayTitle}
            </p>
          )}
        </div>

        {/* Action buttons — shown on hover or while editing */}
        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
          {editing ? (
            <>
              {/* Save */}
              <button
                onClick={handleEditSave}
                title="Save name"
                style={{
                  background: '#10a37f',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: '#fff',
                  fontWeight: 600,
                }}
              >
                Save
              </button>
              {/* Cancel */}
              <button
                onClick={(e) => { e.stopPropagation(); setEditing(false) }}
                title="Cancel"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
                }}
              >
                ✕
              </button>
            </>
          ) : hovered ? (
            <>
              {/* Edit */}
              <button
                onClick={handleEditStart}
                title="Rename bookmark"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                  transition: 'color 0.15s',
                }}
              >
                ✏️
              </button>
              {/* Delete */}
              <button
                onClick={handleDelete}
                title={confirmDelete ? 'Click again to confirm' : 'Delete bookmark'}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: confirmDelete ? '#ef4444' : isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
                  transition: 'color 0.15s',
                }}
              >
                {confirmDelete ? '✓' : '🗑️'}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Snippet */}
      <p
        style={{
          margin: '0 0 8px 22px',
          fontSize: '12px',
          color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.55)',
          lineHeight: '1.5',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {bookmark.snippet}
      </p>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginLeft: '22px',
        }}
      >
        <span style={{ fontSize: '11px', color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)' }}>{timeAgo}</span>
        {bookmark.tags.length > 0 && (
          <>
            <span style={{ color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', fontSize: '11px' }}>·</span>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {bookmark.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
                    color: '#818cf8',
                    fontWeight: 500,
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}
