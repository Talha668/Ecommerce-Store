/**
 * Auth + user profile endpoints — apps/users/views.py + urls.py
 * Base path: /api/auth/
 */
import { api, clearTokens, setTokens } from './client'
import type {
  AddressPayload,
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  User,
  UserAddress,
  UserProfile,
} from './types'

export const authApi = {
  /** POST /api/auth/register/ — registers AND logs the user in (returns tokens). */
  register(payload: RegisterPayload): Promise<AuthResponse> {
    return api
      .post<AuthResponse>('/api/auth/register/', payload)
      .then((res) => {
        setTokens(res.access, res.refresh)
        return res
      })
  },

  /** POST /api/auth/login/ */
  login(payload: LoginPayload): Promise<AuthResponse> {
    return api.post<AuthResponse>('/api/auth/login/', payload).then((res) => {
      setTokens(res.access, res.refresh)
      return res
    })
  },

  /** POST /api/auth/logout/ — blacklists the refresh token. */
  logout(): Promise<{ message: string }> {
    const refresh = localStorage.getItem('mastershop_refresh_token')
    return api
      .post<{ message: string }>('/api/auth/logout/', refresh ? { refresh } : undefined)
      .finally(() => clearTokens())
  },

  /** POST /api/auth/forgot-password/ */
  forgotPassword(email: string): Promise<{ message: string; reset_link?: string }> {
    return api.post('/api/auth/forgot-password/', { email })
  },

  /** POST /api/auth/reset-password/ */
  resetPassword(payload: {
    token: string
    new_password: string
    new_password2: string
  }): Promise<{ message: string }> {
    return api.post('/api/auth/reset-password/', payload)
  },

  /** POST /api/auth/me/change-password/ */
  changePassword(payload: {
    old_password: string
    new_password: string
    new_password2: string
  }): Promise<{ message: string; user: User }> {
    return api.post('/api/auth/me/change-password/', payload)
  },
}

export const usersApi = {
  /** GET /api/auth/me/ */
  me(): Promise<User> {
    return api.get('/api/auth/me/')
  },

  /** PATCH /api/auth/me/ — update first_name / last_name / phone_number. */
  updateUser(patch: Partial<Pick<User, 'first_name' | 'last_name' | 'phone_number'>>): Promise<User> {
    return api.patch('/api/auth/me/', patch)
  },

  /** GET /api/auth/me/profile/ (also PATCH to update). */
  profile(): Promise<UserProfile> {
    return api.get('/api/auth/me/profile/')
  },

  updateProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
    return api.patch('/api/auth/me/profile/', patch)
  },

  /** GET /api/auth/addresses/ */
  addresses(): Promise<UserAddress[]> {
    return api.get<unknown>('/api/auth/addresses/').then((d) => {
      // Could be a bare array or paginated depending on DRF settings.
      if (Array.isArray(d)) return d as UserAddress[]
      if (d && typeof d === 'object' && 'results' in d) {
        return (d as { results: UserAddress[] }).results
      }
      return []
    })
  },

  /** POST /api/auth/addresses/add/ */
  addAddress(payload: AddressPayload): Promise<{ message: string; data: UserAddress }> {
    return api.post('/api/auth/addresses/add/', payload)
  },

  /** DELETE /api/auth/addresses/{id}/ */
  deleteAddress(id: number): Promise<void> {
    return api.delete(`/api/auth/addresses/${id}/`)
  },

  /** PATCH /api/auth/addresses/{id}/ */
  updateAddress(id: number, patch: Partial<AddressPayload>): Promise<UserAddress> {
    return api.patch(`/api/auth/addresses/${id}/`, patch)
  },
}
