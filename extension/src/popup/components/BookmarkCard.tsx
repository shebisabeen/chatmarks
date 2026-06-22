/**
 * BookmarkCard.tsx
 * A single bookmark item in the popup list.
 */

import { useState } from 'react'
import type { Bookmark } from '../../shared/types'

interface BookmarkCardProps {
  bookmark: Bookmark
  onJump: (bookmark: Bookmark) => void
  onDelete: (id: string) => void
}

export function BookmarkCard({ bookmark, onJump, onDelete }: BookmarkCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const timeAgo = formatTimeAgo(bookmark.createdAt)
  const roleIcon = bookmark.role === 'user' ? '💬' : '🤖'

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirmDelete) {
      onDelete(bookmark.id)
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 2000)
    }
  }

  return (
    <div
      onClick={() => onJump(bookmark)}
      style={{
        padding: '12px 14px',
        borderRadius: '10px',
        cursor: 'pointer',
        border: '1px solid rgba(0,0,0,0.08)',
        marginBottom: '8px',
        transition: 'background 0.15s ease',
        position: 'relative',
      }}
      className="bookmark-card"
      title="Click to jump to this message"
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
        <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>{roleIcon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              fontWeight: 600,
              lineHeight: '1.4',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {bookmark.title.replace(/^[💬🤖]\s*/, '')}
          </p>
        </div>
        <button
          onClick={handleDelete}
          title={confirmDelete ? 'Click again to confirm' : 'Delete bookmark'}
          style={{
            flexShrink: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
            borderRadius: '4px',
            fontSize: '12px',
            color: confirmDelete ? '#ef4444' : 'rgba(0,0,0,0.35)',
            transition: 'color 0.15s',
          }}
        >
          {confirmDelete ? '✓ Confirm' : '🗑️'}
        </button>
      </div>

      {/* Snippet */}
      <p
        style={{
          margin: '0 0 8px 22px',
          fontSize: '12px',
          color: 'rgba(0,0,0,0.55)',
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
        <span style={{ fontSize: '11px', color: 'rgba(0,0,0,0.4)' }}>{timeAgo}</span>
        {bookmark.tags.length > 0 && (
          <>
            <span style={{ color: 'rgba(0,0,0,0.2)', fontSize: '11px' }}>·</span>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {bookmark.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: '#6366f1',
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
