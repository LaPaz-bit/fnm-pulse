import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { AuthShell } from './LoginPage'
import { CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: err } = await resetPassword(email)
    setLoading(false)
    if (err) {
      setError("Couldn't send the reset email. Double-check your address.")
    } else {
      setSent(true)
    }
  }

  return (
    <AuthShell
      heading="Reset your password"
      subheading="We'll send you a link to get back in."
    >
      {sent ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <CheckCircle size={48} className="text-brand-pink" />
          <p className="font-bold text-gray-900">Email sent!</p>
          <p className="text-sm text-gray-500">
            Check your inbox for a password reset link. You'll be back in no time 💪
          </p>
          <Link to="/login" className="text-brand-pink font-bold hover:underline text-sm">
            Back to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
          <Button fullWidth size="lg" loading={loading} type="submit">
            Send Reset Link
          </Button>
          <Link
            to="/login"
            className="text-sm text-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Back to Login
          </Link>
        </form>
      )}
    </AuthShell>
  )
}
