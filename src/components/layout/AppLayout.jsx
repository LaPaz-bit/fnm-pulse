import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import PostComposer from '@/components/feed/PostComposer'

export default function AppLayout() {
  const [composerOpen, setComposerOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const location = useLocation()

  useEffect(() => {
    setComposerOpen(false)
  }, [location.pathname])

  function handlePostCreated() {
    setComposerOpen(false)
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="min-h-screen bg-canvas max-w-lg mx-auto relative">
      <main className="pb-24">
        <Outlet context={{ refreshKey, openComposer: () => setComposerOpen(true) }} />
      </main>

      <BottomNav />

      {composerOpen && (
        <PostComposer
          onClose={() => setComposerOpen(false)}
          onCreated={handlePostCreated}
        />
      )}
    </div>
  )
}
