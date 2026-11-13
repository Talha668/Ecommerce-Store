import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Alert, Field, inputClass } from '../../components/ui/ui'

/**
 * Register — converted from templates/auth/register.html.
 * POST /api/auth/register/ (UserRegisterSerializer: email, first_name,
 * last_name, phone_number, password, password2). Successful registration
 * returns JWT tokens, so the user is logged in immediately.
 */
export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    password: '',
    password2: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (form.password !== form.password2) {
      setError("Passwords don't match.")
      return
    }

    setSubmitting(true)
    try {
      await register({
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        phone_number: form.phone_number || undefined,
        password: form.password,
        password2: form.password2,
      })
      navigate('/')
    } catch (err) {
      if (err instanceof ApiError) setError(err.displayMessage)
      else setError('Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <i className="fas fa-user-plus text-3xl text-blue-600 mb-3"></i>
          <h1 className="text-3xl font-bold text-gray-800">Register</h1>
          <p className="text-gray-500 text-sm mt-1">Create your MasterShop account</p>
        </div>

        {error && <Alert type="error" onClose={() => setError(null)}>{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name">
              <input
                type="text"
                required
                autoComplete="given-name"
                value={form.first_name}
                onChange={update('first_name')}
                className={inputClass}
              />
            </Field>
            <Field label="Last Name">
              <input
                type="text"
                required
                autoComplete="family-name"
                value={form.last_name}
                onChange={update('last_name')}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Email">
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={update('email')}
              placeholder="you@example.com"
              className={inputClass}
            />
          </Field>

          <Field label="Phone Number" hint="Optional — used for delivery updates">
            <input
              type="tel"
              autoComplete="tel"
              value={form.phone_number}
              onChange={update('phone_number')}
              placeholder="+1 555 000 0000"
              className={inputClass}
            />
          </Field>

          <Field
            label="Password"
            hint="At least 8 characters — can't be too similar to your email."
          >
            <input
              type="password"
              required
              autoComplete="new-password"
              value={form.password}
              onChange={update('password')}
              className={inputClass}
            />
          </Field>

          <Field label="Confirm Password">
            <input
              type="password"
              required
              autoComplete="new-password"
              value={form.password2}
              onChange={update('password2')}
              className={inputClass}
            />
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {submitting ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>Creating account…
              </>
            ) : (
              'Register'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 font-semibold hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}
