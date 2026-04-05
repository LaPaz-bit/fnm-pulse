import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { AuthShell } from './LoginPage'

export default function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters.')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores.')
      return
    }

    setLoading(true)
    const { data, error: err } = await signUp(email, password, username)
    setLoading(false)

    if (err) {
      setError(err.message)
      return
    }

    // If email confirmation is enabled, show a message
    if (data?.user && !data?.session) {
      setSuccess(true)
      return
    }

    navigate('/onboarding', { replace: true })
  }

  if (success) {
    return (
      <AuthShell heading="Check your email! 📬" subheading="">
        <div className="flex flex-col gap-4 text-center">
          <p className="text-gray-600">
            We sent a confirmation link to <strong>{email}</strong>.
            Click the link to activate your account and join the FNM Community!
          </p>
          <p className="text-sm text-gray-400">Don't see it? Check your spam folder.</p>
          <Link to="/login" className="text-brand-pink font-bold hover:underline text-sm">
            Back to Login
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      heading="Join the FNM Community! 🚀"
      subheading="Sign up — it's free and totally worth it."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Username"
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          placeholder="yourname"
          autoComplete="username"
          required
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="8+ characters"
          autoComplete="new-password"
          required
        />
        <Input
          label="Confirm Password"
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Confirm your password"
          autoComplete="new-password"
          required
        />
        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
        <Button fullWidth size="lg" loading={loading} type="submit">
          Create My Account 🎉
        </Button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-pink font-bold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
