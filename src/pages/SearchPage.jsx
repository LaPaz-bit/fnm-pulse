import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import SearchResults from '@/components/feed/SearchResults'

export default function SearchPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  return (
    <div>
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Search size={17} className="text-brand-pink shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts or members…"
            className="flex-1 text-base text-gray-900 placeholder:text-gray-300 outline-none bg-transparent"
          />
          <button
            onClick={() => (query ? setQuery('') : navigate(-1))}
            className="text-gray-300 hover:text-gray-500 shrink-0 transition"
          >
            <X size={17} />
          </button>
        </div>
      </header>
      <SearchResults query={query} />
    </div>
  )
}
