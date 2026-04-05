import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import Spinner from '@/components/ui/Spinner'
import { ArrowLeft } from 'lucide-react'

export default function CommunityGuidelinesPage() {
  const navigate = useNavigate()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('community_guidelines')
      .select('content')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        setContent(data?.content || '')
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-black text-gray-900">Community Guidelines</h1>
      </header>

      <div className="px-5 py-6 max-w-xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : (
          <div className="prose prose-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        )}
      </div>
    </div>
  )
}
