import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi, usersApi } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { Alert, Field, inputClass } from '../../components/ui/ui'
import { ProfileSidebar } from './ProfileSidebar'

/**
 * Profile — converted from templates/profile/profile.html.
 *
 * Fixes applied vs. the original:
 *  - The template had its whole content pasted THREE times — now a single form.
 *  - User fields → PATCH /api/auth/me/ (UserSerializer)
 *  - Profile fields (DOB, gender, bio) → PATCH /api/auth/me/profile/
 *    (the old single Django form could never save both objects at once)
 *  - Change-password uses POST /api/auth/me/change-password/
 */
export function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const queryClient = useQueryClient()

  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: () => usersApi.profile(),
  })

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    date_of_birth: '',
    gender: '',
    bio: '',
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Seed the form once user + profile are loaded.
  useEffect(() => {
    if (!user) return
    setForm((prev) => ({
      ...prev,
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
    }))
  }, [user])

  useEffect(() => {
    if (!profile.data) return
    setForm((prev) => ({
      ...prev,
      date_of_birth: profile.data?.date_of_birth ?? '',
      gender: profile.data?.gender ?? '',
      bio: profile.data?.bio ?? '',
    }))
  }, [profile.data])

  const saveProfile = useMutation({
    mutationFn: async () => {
      await usersApi.updateProfile({
        date_of_birth: form.date_of_birth || null,
        gender: (form.gender || '') as 'male' | 'female' | 'other' | '',
        bio: form.bio,
      })
      // User-level fields live on /api/auth/me/ (PATCH via UserSerializer).
      await fetchPatchUser()
    },
    onSuccess: async () => {
      setMessage({ type: 'success', text: 'Profile updated successfully.' })
      await refreshUser()
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: () => {
      setMessage({ type: 'error', text: 'Failed to update profile. Please check your input.' })
    },
  })

  async function fetchPatchUser(): Promise<void> {
    await usersApi.updateUser({
      first_name: form.first_name,
      last_name: form.last_name,
      phone_number: form.phone_number,
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <ProfileSidebar />
        </div>

        {/* Main Content */}
        <div className="md:col-span-3">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Profile Information</h2>

            {message && (
              <Alert type={message.type} onClose={() => setMessage(null)}>
                {message.text}
              </Alert>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                saveProfile.mutate()
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="First Name">
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className={inputClass}
                  />
                </Field>

                <Field label="Last Name">
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className={inputClass}
                  />
                </Field>

                <Field label="Email">
                  <input
                    type="email"
                    value={user?.email ?? ''}
                    disabled
                    className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg"
                  />
                </Field>

                <Field label="Phone Number">
                  <input
                    type="text"
                    value={form.phone_number}
                    onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                    className={inputClass}
                  />
                </Field>

                <Field label="Date of Birth">
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                    className={inputClass}
                  />
                </Field>

                <Field label="Gender">
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </Field>

                <div className="md:col-span-2">
                  <Field label="Bio">
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={form.bio}
                      onChange={(e) => setForm({ ...form, bio: e.target.value })}
                      className={inputClass}
                    ></textarea>
                  </Field>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={saveProfile.isPending}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {saveProfile.isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div id="change-password" className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Change Password</h2>
            <ChangePasswordForm />
          </div>
        </div>
      </div>
    </div>
  )
}

function ChangePasswordForm() {
  const [form, setForm] = useState({ old_password: '', new_password: '', new_password2: '' })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const changePassword = useMutation({
    mutationFn: () =>
      authApi.changePassword({
        old_password: form.old_password,
        new_password: form.new_password,
        new_password2: form.new_password2,
      }),
    onSuccess: (res) => {
      setMessage({ type: 'success', text: res.message })
      setForm({ old_password: '', new_password: '', new_password2: '' })
    },
    onError: (err) => {
      const data = (err as { data?: Record<string, unknown> }).data
      const text = data
        ? Object.entries(data)
            .map(([field, value]) => `${field.replace(/_/g, ' ')}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join(' · ')
        : 'Failed to change password.'
      setMessage({ type: 'error', text })
    },
  })

  return (
    <>
      {message && (
        <Alert type={message.type} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          changePassword.mutate()
        }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Field label="Old Password">
          <input
            type="password"
            required
            autoComplete="current-password"
            value={form.old_password}
            onChange={(e) => setForm({ ...form, old_password: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="New Password">
          <input
            type="password"
            required
            autoComplete="new-password"
            value={form.new_password}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Confirm New Password">
          <input
            type="password"
            required
            autoComplete="new-password"
            value={form.new_password2}
            onChange={(e) => setForm({ ...form, new_password2: e.target.value })}
            className={inputClass}
          />
        </Field>
        <div className="md:col-span-3 flex justify-end">
          <button
            type="submit"
            disabled={changePassword.isPending}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {changePassword.isPending ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </form>
    </>
  )
}
