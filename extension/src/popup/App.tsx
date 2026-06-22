/**
 * App.tsx
 * ─────────────────────────────────────────────────────────────
 * Main popup UI — ChatMarks redesign.
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Bookmark, Platform } from '../shared/types'
import * as db from '../storage/bookmarkDB'
import { BookmarkCard } from './components/BookmarkCard'

type PlatformFilter = Platform | 'all'
type View = 'main' | 'settings'

export default function App() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [query, setQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [loading, setLoading] = useState(true)
  const [jumpStatus, setJumpStatus] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [view, setView] = useState<View>('main')

  // ─── Load bookmarks ─────────────────────────────────────────

  const loadBookmarks = useCallback(async () => {
    const all = await db.list()
    setBookmarks(all)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadBookmarks()
  }, [loadBookmarks])

  useEffect(() => {
    const handler = () => loadBookmarks()
    chrome.storage.onChanged.addListener(handler)
    return () => chrome.storage.onChanged.removeListener(handler)
  }, [loadBookmarks])

  // ─── Filter + Sort ──────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = bookmarks

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

    return [...result].sort((a, b) => b.createdAt - a.createdAt)
  }, [bookmarks, query, platformFilter])

  // ─── Actions ────────────────────────────────────────────────

  const handleJump = useCallback(async (bookmark: Bookmark) => {
    setJumpStatus('Jumping…')
    await db.update(bookmark.id, { visitedAt: Date.now() })
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

  // ─── Theme ──────────────────────────────────────────────────

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  const colors = {
    bg: isDark ? '#1a1a1a' : '#ffffff',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    text: isDark ? '#f0f0f0' : '#111111',
    muted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
    cardBg: isDark ? '#242424' : '#ffffff',
    hoverBg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
  }

  // Platform tab config
  const platformTabs: { id: PlatformFilter; label: string; icon: string | null }[] = [
    { id: 'all', label: 'All', icon: null },
    { id: 'chatgpt', label: 'ChatGPT', icon: '/icons/chatgpt-48.png' },
    { id: 'claude', label: 'Claude', icon: '/icons/claude-ai-48.png' },
    { id: 'gemini', label: 'Gemini', icon: '/icons/gemini-ai-48.png' },
  ]

  const sectionLabel =
    platformFilter === 'all'
      ? 'All Bookmarks'
      : platformFilter.charAt(0).toUpperCase() + platformFilter.slice(1) + ' Bookmarks'

  // ─── Settings View ──────────────────────────────────────────

  if (view === 'settings') {
    const version = chrome.runtime.getManifest().version

    return (
      <div
        style={{
          width: '400px',
          minHeight: '500px',
          maxHeight: '620px',
          display: 'flex',
          flexDirection: 'column',
          background: colors.bg,
          color: colors.text,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        {/* Settings Header */}
        <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
          <button
            onClick={() => setView('main')}
            title="Back"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '5px', borderRadius: '8px', color: colors.muted,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span style={{ fontSize: '15px', fontWeight: 700, color: colors.text }}>Settings</span>
        </div>

        {/* Settings Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 18px 20px' }}>

          {/* App identity block */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            padding: '16px', borderRadius: '14px',
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            marginBottom: '24px',
            boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
          }}>
            <img
              src="/icons/icon48.png"
              alt="ChatMarks"
              style={{ width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: colors.text }}>ChatMarks</div>
              <div style={{ fontSize: '12px', color: colors.muted, marginTop: '2px' }}>
              Bookmark chat messages across
              <br />
              ChatGPT, Claude &amp; Gemini
              </div>
              <div style={{
                display: 'inline-block', marginTop: '6px',
                fontSize: '10px', fontWeight: 600,
                padding: '2px 8px', borderRadius: '20px',
                background: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
                color: '#6366f1',
              }}>
                v{version}
              </div>
            </div>
          </div>

          {/* Links list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

            {/* GitHub repo */}
            <SettingsLink
              href="https://github.com/shebisabeen/chatmarks"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill={colors.text} xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              }
              label="GitHub Repository"
              sublabel="shebisabeen/chatmarks"
              colors={colors}
            />

            {/* Star CTA */}
            <a
              href="https://github.com/shebisabeen/chatmarks"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '13px 14px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'opacity 0.15s, transform 0.15s',
                  boxShadow: '0 2px 8px rgba(217,119,6,0.35)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0.92'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
              >
                <div style={{
                  width: '34px', height: '34px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', flexShrink: 0,
                }}>⭐</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>Star on GitHub</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', marginTop: '1px' }}>If you find it useful, a ⭐ means a lot!</div>
                </div>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </div>
            </a>

            {/* Developer */}
            <SettingsLink
              href="https://profile.sabeencs.com"
              icon={
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>S</div>
              }
              label="Built by Sabeen"
              sublabel="profile.sabeencs.com"
              colors={colors}
            />

          </div>
        </div>
      </div>
    )
  }

  // ─── Main View ──────────────────────────────────────────────

  return (
    <div
      style={{
        width: '400px',
        height: '600px',
        display: 'flex',
        flexDirection: 'column',
        background: colors.bg,
        color: colors.text,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div style={{ padding: '18px 18px 14px', background: colors.bg, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* App icon */}
          <img
            src="/icons/icon48.png"
            alt="ChatMarks"
            style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0 }}
          />

          {/* Title + subtitle */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '17px', fontWeight: 700, lineHeight: '1.2', color: colors.text }}>
              ChatMarks
            </div>
            <div style={{ fontSize: '11px', color: colors.muted, marginTop: '1px', lineHeight: '1.3' }}>
              Bookmark chat messages across 
              <br />
              ChatGPT, Claude & Gemini.
            </div>
          </div>

          {/* Search icon */}
          <button
            onClick={() => setSearchOpen((v) => !v)}
            title="Search bookmarks"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              color: colors.muted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          {/* Settings icon */}
          <button
            onClick={() => setView('settings')}
            title="Settings"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              color: colors.muted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>

        {/* Search bar (expandable) */}
        {searchOpen && (
          <div style={{ marginTop: '12px', position: 'relative' }}>
            <svg
              width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke={colors.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search bookmarks…"
              style={{
                width: '100%',
                padding: '8px 32px 8px 34px',
                borderRadius: '10px',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                fontSize: '13px',
                outline: 'none',
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                color: colors.text,
                boxSizing: 'border-box',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px',
                  color: colors.muted, padding: '2px',
                }}
              >✕</button>
            )}
          </div>
        )}
      </div>

      {/* ── Platform Filter Tabs ── */}
      <div style={{ padding: '0 18px 14px', display: 'flex', gap: '6px', flexShrink: 0 }}>
        {platformTabs.map((tab) => {
          const isActive = platformFilter === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setPlatformFilter(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 11px',
                borderRadius: '10px',
                border: `1.5px solid ${isActive ? 'rgba(99,102,241,0.3)' : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: isActive ? 600 : 500,
                background: isActive
                  ? isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)'
                  : isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                color: isActive ? '#6366f1' : colors.muted,
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                minWidth: tab.id === 'chatgpt' ? '105px' : undefined,
                justifyContent: 'center',
              }}
            >
              {tab.icon ? (
                <img src={tab.icon} alt={tab.label} style={{ width: '14px', height: '14px', borderRadius: '3px' }} />
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill={isActive ? '#6366f1' : colors.muted}>
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
              )}
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Divider ── */}
      <div style={{ height: '1px', background: colors.border, flexShrink: 0 }} />

      {/* ── Section Header ── */}
      <div style={{ padding: '14px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: colors.text }}>{sectionLabel}</span>
        <span style={{ fontSize: '13px', color: colors.muted }}>
          {filtered.length} bookmark{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: colors.muted, fontSize: '14px' }}>
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState query={query} colors={colors} />
        ) : (
          <>
            {jumpStatus && (
              <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontSize: '13px', marginBottom: '10px', textAlign: 'center' }}>
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
    </div>
  )
}

// ─── SettingsLink ─────────────────────────────────────────────

interface SettingsLinkProps {
  href: string
  icon: React.ReactNode
  label: string
  sublabel: string
  colors: Record<string, string>
}

function SettingsLink({ href, icon, label, sublabel, colors }: SettingsLinkProps) {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 14px', borderRadius: '12px',
          border: `1px solid ${colors.border}`,
          background: colors.cardBg,
          cursor: 'pointer', transition: 'background 0.15s',
          boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = colors.hoverBg)}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = colors.cardBg)}
      >
        <div style={{
          width: '34px', height: '34px', borderRadius: '10px',
          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>{label}</div>
          <div style={{ fontSize: '11px', color: colors.muted, marginTop: '1px' }}>{sublabel}</div>
        </div>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </div>
    </a>
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '8px', color: colors.muted }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: colors.text }}>No results found</p>
        <p style={{ margin: 0, fontSize: '12px' }}>No bookmarks match "<strong>{query}</strong>"</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '260px', gap: '12px', color: colors.muted, textAlign: 'center', padding: '0 24px' }}>
      <img src="/icons/icon48.png" alt="ChatMarks" style={{ width: '52px', height: '52px', borderRadius: '14px', opacity: 0.4 }} />
      <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: colors.text }}>No bookmarks yet</p>
      <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5' }}>
        Open ChatGPT, Claude, or Gemini and click the bookmark button next to any message to save it.
      </p>
    </div>
  )
}
