import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) {
      setError('Invalid email or password. Try again!')
    } else {
      navigate(from, { replace: true })
    }
  }

  return (
    <AuthShell heading="Welcome back" subheading="Your community is waiting for you.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
        {error && (
          <p className="text-sm text-red-500 font-medium bg-red-50 px-4 py-2.5 rounded-2xl">
            {error}
          </p>
        )}
        <Button fullWidth size="lg" loading={loading} type="submit" className="mt-1">
          Log In
        </Button>
        <Link to="/forgot-password"
          className="text-sm text-center text-gray-400 hover:text-brand-pink font-medium transition-colors">
          Forgot your password?
        </Link>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-400">
          New here?{' '}
          <Link to="/signup" className="text-brand-pink font-bold hover:underline">
            Join the FNM Community
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}

export function AuthShell({ heading, subheading, children }) {
  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto overflow-hidden">
      {/* Hero */}
      <div className="relative bg-brand-gradient px-6 pt-16 pb-14 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 -left-10 w-52 h-52 rounded-full bg-white/8" />
        <div className="absolute top-8 right-20 w-16 h-16 rounded-full bg-white/10" />

        <div className="relative">
          <h1 className="font-display text-5xl font-black text-white italic tracking-tight leading-none">
            FNM<br />Pulse
          </h1>
          <p className="text-white/70 text-sm mt-3 font-medium tracking-wide">
            Your community. Your journey.
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 px-6 py-8 -mt-5 bg-white rounded-t-[2rem] shadow-[0_-4px_30px_rgba(250,94,189,0.1)]">
        <h2 className="font-display text-3xl font-black text-gray-900 italic mb-1">{heading}</h2>
        {subheading && <p className="text-gray-400 text-sm mb-7 font-medium">{subheading}</p>}
        {children}
      </div>
    </div>
  )
}
