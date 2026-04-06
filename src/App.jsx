import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AdminRoute from '@/components/auth/AdminRoute'
import AppLayout from '@/components/layout/AppLayout'

import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import OnboardingPage from '@/pages/OnboardingPage'
import FeedPage from '@/pages/FeedPage'
import GoalsPage from '@/pages/GoalsPage'
import GoalThreadPage from '@/pages/GoalThreadPage'
import WinsWallPage from '@/pages/WinsWallPage'
import ProfilePage from '@/pages/ProfilePage'
import LeaderboardPage from '@/pages/LeaderboardPage'
import NotificationsPage from '@/pages/NotificationsPage'
import InboxPage from '@/pages/InboxPage'
import ConversationPage from '@/pages/ConversationPage'
import EditProfilePage from '@/pages/EditProfilePage'
import SearchPage from '@/pages/SearchPage'
import AdminPage from '@/pages/AdminPage'
import CommunityGuidelinesPage from '@/pages/CommunityGuidelinesPage'

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Onboarding (auth required, but doesn't need onboarding complete) */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />

      {/* Conversation — full screen, no bottom nav */}
      <Route
        path="/messages/:partnerId"
        element={
          <ProtectedRoute requireOnboarding>
            <ConversationPage />
          </ProtectedRoute>
        }
      />

      {/* App shell (auth + onboarding required) */}
      <Route
        element={
          <ProtectedRoute requireOnboarding>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<FeedPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/goals/:goalId" element={<GoalThreadPage />} />
        <Route path="/challenges/:challengeId" element={<GoalThreadPage />} />
        <Route path="/wins" element={<WinsWallPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/edit" element={<EditProfilePage />} />
        <Route path="/profile/:userId" element={<ProfilePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/messages" element={<InboxPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/guidelines" element={<CommunityGuidelinesPage />} />
      </Route>

      {/* Admin (auth + admin role required, no AppLayout shell) */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
