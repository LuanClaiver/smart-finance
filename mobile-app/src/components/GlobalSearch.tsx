import { useEffect, useRef, useState } from 'react'
import { api, money } from '../services/api'
import { navigateTo } from '../services/navigation'
import type { SearchResult } from '../types'

export default function GlobalSearch({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    const timer = window.setTimeout(() => {
      api<SearchResult[]>(`/search?q=${encodeURIComponent(query.trim())}`)
        .then(setResults)
        .catch(() => setResults([]))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!host.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function choose(item: SearchResult) {
    setOpen(false)
    setQuery('')
    setResults([])
    navigateTo(item.page, item.id, item.month)
    onNavigate?.(item.page)
  }

  return <div className="global-search" ref={host}>
    <span className="global-search-icon" aria-hidden="true">⌕</span>
    <input
      value={query}
      onFocus={() => setOpen(true)}
      onChange={e => {
        setQuery(e.target.value)
        setOpen(true)
      }}
      placeholder="Buscar lançamentos..."
      aria-label="Buscar no Smart Finance"
    />
    {open && query.trim().length >= 2 && (
      <div className="global-search-results">
        {results.length
          ? results.map((item, index) => (
              <button key={`${item.kind}-${item.id}-${index}`} onClick={() => choose(item)}>
                <span><strong>{item.title}</strong><small>{item.subtitle}</small></span>
                {typeof item.amount === 'number' && <b>{money(item.amount)}</b>}
              </button>
            ))
          : <div className="global-search-empty">Nenhum resultado.</div>}
      </div>
    )}
  </div>
}
