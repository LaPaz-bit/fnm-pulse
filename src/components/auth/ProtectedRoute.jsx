import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Spinner from '@/components/ui/Spinner'

export default function ProtectedRoute({ children, requireOnboarding = false }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <span className="text-2xl font-black text-brand-pink">FNM Pulse</span>
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // On onboarding page: redirect away if already completed
  if (location.pathname === '/onboarding' && profile?.onboarding_completed) {
    return <Navigate to="/" replace />
  }

  // On app pages: redirect to onboarding if not completed
  if (requireOnboarding && profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}
