import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import BottomNav from './BottomNav'
import PostComposer from '@/components/feed/PostComposer'

const pageVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 400, damping: 35 } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.15, ease: 'easeIn' } },
}

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
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Outlet context={{ refreshKey, openComposer: () => setComposerOpen(true) }} />
          </motion.div>
        </AnimatePresence>
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
