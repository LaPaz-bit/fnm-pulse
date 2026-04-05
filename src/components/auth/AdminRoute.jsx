import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Spinner from '@/components/ui/Spinner'

export default function AdminRoute({ children }) {
  const { user, profile } = useAuth()

  if (user === undefined || (user && !profile)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user || profile?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}
