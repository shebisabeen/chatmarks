/**
 * SearchBar.tsx
 * Search input for filtering bookmarks.
 */

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  isDark?: boolean
}

export function SearchBar({ value, onChange, placeholder = 'Search bookmarks…', isDark = false }: SearchBarProps) {
  return (
    <div style={{ position: 'relative', marginBottom: '12px' }}>
      <span
        style={{
          position: 'absolute',
          left: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '14px',
          pointerEvents: 'none',
          opacity: 0.5,
        }}
      >
        🔍
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '8px 32px 8px 32px',
          borderRadius: '8px',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
          fontSize: '13px',
          outline: 'none',
          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
          color: isDark ? '#ececec' : '#0d0d0d',
          transition: 'border-color 0.15s',
          boxSizing: 'border-box',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#10a37f'
          e.target.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'transparent'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
          e.target.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            opacity: 0.5,
            padding: '2px',
            color: isDark ? '#ececec' : '#0d0d0d',
          }}
          title="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  )
}
