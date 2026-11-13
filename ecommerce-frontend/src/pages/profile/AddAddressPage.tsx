import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { usersApi } from '../../api/auth'
import { CART_QUERY_KEY } from '../../hooks/useCart'
import { Alert, Field, inputClass } from '../../components/ui/ui'
import { ProfileSidebar } from './ProfileSidebar'

/**
 * Add Address — converted from templates/profile/add_address.html.
 * The old template was `{{ form.as_p }}` with no styling; this version has
 * proper fields matching UserAddressSerializer and redirects to ?next= (used
 * by the checkout flow).
 */
export function AddAddressPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next') ?? '/profile'
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
    street: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'United States',
    is_default: false,
  })
  const [error, setError] = useState<string | null>(null)

  const addAddress = useMutation({
    mutationFn: () =>
      usersApi.addAddress({
        ...form,
        address_type: 'shipping',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY })
      navigate(next)
    },
    onError: (err) => {
      const data = (err as { data?: Record<string, unknown> }).data
      const text = data
        ? Object.entries(data)
            .map(
              ([field, value]) =>
                `${field.replace(/_/g, ' ')}: ${Array.isArray(value) ? value.join(', ') : value}`,
            )
            .join(' · ')
        : 'Failed to save address.'
      setError(text)
    },
  })

  function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <ProfileSidebar />
        </div>

        <div className="md:col-span-3">
          <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Add New Address</h2>
              <Link to={next} className="text-gray-400 hover:text-gray-600 text-sm">
                <i className="fas fa-arrow-left mr-1"></i> Back
              </Link>
            </div>

            {error && <Alert type="error" onClose={() => setError(null)}>{error}</Alert>}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                addAddress.mutate()
              }}
              className="space-y-4"
            >
              <Field label="Full Name">
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={(e) => update('full_name', e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Phone Number">
                <input
                  type="tel"
                  required
                  value={form.phone_number}
                  onChange={(e) => update('phone_number', e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Street Address">
                <input
                  type="text"
                  required
                  value={form.street}
                  onChange={(e) => update('street', e.target.value)}
                  placeholder="123 Main St, Apt 4B"
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="City">
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="State">
                  <input
                    type="text"
                    required
                    value={form.state}
                    onChange={(e) => update('state', e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="ZIP Code">
                  <input
                    type="text"
                    required
                    value={form.zip_code}
                    onChange={(e) => update('zip_code', e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Country">
                <input
                  type="text"
                  required
                  value={form.country}
                  onChange={(e) => update('country', e.target.value)}
                  className={inputClass}
                />
              </Field>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => update('is_default', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-600">
                  Set as default shipping address
                </span>
              </label>

              <button
                type="submit"
                disabled={addAddress.isPending}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {addAddress.isPending ? 'Saving…' : 'Save Address'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
