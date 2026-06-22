/**
 * BookmarkCard.tsx
 * A single bookmark item in the popup list — ChatMarks redesign.
 */

import { useState, useRef, useEffect } from 'react'
import type { Bookmark, Platform } from '../../shared/types'

interface BookmarkCardProps {
  bookmark: Bookmark
  onJump: (bookmark: Bookmark) => void
  onDelete: (id: string) => void
  onRename: (id: string, newTitle: string) => void
  isDark?: boolean
}

// ─── Platform icon config ─────────────────────────────────────

const platformConfig: Record<
  string,
  { icon: string; bg: string; label: string; iconBg?: string }
> = {
  chatgpt: {
    icon: '/icons/chatgpt-48.png',
    bg: '#10a37f',
    label: 'ChatGPT',
  },
  claude: {
    icon: '/icons/claude-ai-48.png',
    bg: '#ffffff',
    label: 'Claude',
    iconBg: '#ffffff',
  },
  gemini: {
    icon: '/icons/gemini-ai-48.png',
    bg: '#ffffff',
    label: 'Gemini',
    iconBg: '#ffffff',
  },
}

// ─── Platform Icon (rounded square with colored bg) ───────────

function PlatformIcon({ platform }: { platform?: Platform }) {
  const config = platform ? platformConfig[platform] : null

  if (!config) {
    // Fallback generic bookmark icon
    return (
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: 'rgba(99,102,241,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#6366f1">
          <path d="M5 3a2 2 0 0 0-2 2v16l9-4 9 4V5a2 2 0 0 0-2-2H5z" />
        </svg>
      </div>
    )
  }

  return (
    <div
      style={{
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        background: config.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      <img
        src={config.icon}
        alt={config.label}
        style={{ width: '28px', height: '28px', objectFit: 'contain' }}
      />
    </div>
  )
}

// ─── SVG Icons ────────────────────────────────────────────────

function EditIcon({ size = 15, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon({ size = 15, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

// ─── BookmarkCard ─────────────────────────────────────────────

export function BookmarkCard({
  bookmark,
  onJump,
  onDelete,
  onRename,
  isDark = false,
}: BookmarkCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const displayTitle = bookmark.title.replace(/^[💬🤖]\s*/, '')
  const platformLabel =
    bookmark.platform && platformConfig[bookmark.platform]
      ? platformConfig[bookmark.platform].label
      : bookmark.platform ?? ''
  const dateStr = formatDate(bookmark.createdAt)

  const colors = {
    text: isDark ? '#f0f0f0' : '#111111',
    muted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    cardBg: isDark ? '#242424' : '#ffffff',
    hoverBg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
  }

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
    if (e.key === 'Enter') handleEditSave()
    else if (e.key === 'Escape') setEditing(false)
  }

  return (
    <div
      onClick={() => !editing && onJump(bookmark)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        setConfirmDelete(false)
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 14px',
        borderRadius: '12px',
        cursor: editing ? 'default' : 'pointer',
        border: `1px solid ${colors.border}`,
        marginBottom: '8px',
        transition: 'background 0.15s ease',
        background: hovered && !editing ? colors.hoverBg : colors.cardBg,
        position: 'relative',
      }}
      title={editing ? undefined : 'Click to jump to this message'}
    >
      {/* Platform icon */}
      <PlatformIcon platform={bookmark.platform} />

      {/* Content */}
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
              padding: '3px 7px',
              borderRadius: '6px',
              border: `1.5px solid #6366f1`,
              outline: 'none',
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
              color: colors.text,
              boxSizing: 'border-box',
              marginBottom: '4px',
            }}
          />
        ) : (
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: colors.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: '3px',
            }}
          >
            {displayTitle}
          </div>
        )}
        <div style={{ fontSize: '12px', color: colors.muted, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>{platformLabel}</span>
          {platformLabel && dateStr && (
            <span style={{ opacity: 0.5 }}>•</span>
          )}
          <span>{dateStr}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {editing ? (
          <>
            <button
              onClick={handleEditSave}
              title="Save"
              style={{
                background: '#6366f1',
                border: 'none',
                cursor: 'pointer',
                padding: '3px 9px',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#fff',
                fontWeight: 600,
              }}
            >
              Save
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(false) }}
              title="Cancel"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '3px 6px',
                borderRadius: '6px',
                fontSize: '11px',
                color: colors.muted,
              }}
            >
              ✕
            </button>
          </>
        ) : (
          <>
            {/* Edit button */}
            <button
              onClick={handleEditStart}
              title="Edit bookmark name"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '7px',
                color: hovered
                  ? isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'
                  : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none'
                e.currentTarget.style.color = hovered
                  ? isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'
                  : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
              }}
            >
              <EditIcon size={15} color="currentColor" />
            </button>

            {/* Delete button */}
            <button
              onClick={handleDelete}
              title={confirmDelete ? 'Click again to confirm delete' : 'Delete bookmark'}
              style={{
                background: confirmDelete ? 'rgba(239,68,68,0.1)' : 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '7px',
                color: confirmDelete
                  ? '#ef4444'
                  : hovered
                    ? isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'
                    : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!confirmDelete) {
                  e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
                  e.currentTarget.style.color = '#ef4444'
                }
              }}
              onMouseLeave={(e) => {
                if (!confirmDelete) {
                  e.currentTarget.style.background = 'none'
                  e.currentTarget.style.color = hovered
                    ? isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'
                    : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
                }
              }}
            >
              <TrashIcon size={15} color="currentColor" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Keep exports for any other files that may import these
export function UserIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#6366f1" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  )
}

export function BookmarkIcon({ size = 14, color = '#6366f1' }: { size?: number; filled?: boolean; color?: string; strokeColor?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M5 3a2 2 0 0 0-2 2v16l9-4 9 4V5a2 2 0 0 0-2-2H5z" />
    </svg>
  )
}

export function PlatformBadge({ platform }: { platform?: Platform }) {
  if (!platform || platform === 'unknown') return null
  const config = platformConfig[platform]
  if (!config) return null
  return (
    <span
      style={{
        fontSize: '9px',
        fontWeight: 600,
        padding: '1px 5px',
        borderRadius: '8px',
        background: `${config.bg}20`,
        color: config.bg,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        flexShrink: 0,
      }}
    >
      {config.label}
    </span>
  )
}
