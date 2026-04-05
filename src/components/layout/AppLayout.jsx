import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import PostComposer from '@/components/feed/PostComposer'

export default function AppLayout() {
  const [composerOpen, setComposerOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  function handlePostCreated() {
    setComposerOpen(false)
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="min-h-screen bg-canvas max-w-lg mx-auto relative">
      <main className="pb-24">
        <Outlet context={{ refreshKey, openComposer: () => setComposerOpen(true) }} />
      </main>

      <BottomNav onPostPress={() => setComposerOpen(true)} />

      {composerOpen && (
        <PostComposer
          onClose={() => setComposerOpen(false)}
          onCreated={handlePostCreated}
        />
      )}
    </div>
  )
}
