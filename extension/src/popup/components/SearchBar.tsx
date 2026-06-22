/**
 * SearchBar.tsx
 * Search input for filtering bookmarks.
 */

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'Search bookmarks…' }: SearchBarProps) {
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
          border: '1px solid rgba(0,0,0,0.12)',
          fontSize: '13px',
          outline: 'none',
          background: 'rgba(0,0,0,0.03)',
          color: 'inherit',
          transition: 'border-color 0.15s',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#10a37f'
          e.target.style.background = 'transparent'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'rgba(0,0,0,0.12)'
          e.target.style.background = 'rgba(0,0,0,0.03)'
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
          }}
          title="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  )
}
