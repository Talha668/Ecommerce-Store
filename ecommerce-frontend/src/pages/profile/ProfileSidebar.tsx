import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { to: '/profile', icon: 'fa-user', label: 'Profile' },
  { to: '/my-orders', icon: 'fa-box', label: 'Orders' },
  { to: '/saved-cards', icon: 'fa-credit-card', label: 'Payment Methods' },
  { to: '/addresses', icon: 'fa-map-marker-alt', label: 'Addresses' },
  { to: '/wishlist', icon: 'fa-heart', label: 'Wishlist' },
  { to: '/profile#change-password', icon: 'fa-key', label: 'Change Password' },
]

/** Sidebar card — converted from profile.html (shared by profile sub-pages). */
export function ProfileSidebar() {
  const { user } = useAuth()
  const location = useLocation()

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-center mb-6">
        <div className="w-24 h-24 rounded-full bg-blue-100 mx-auto mb-4 flex items-center justify-center border-4 border-blue-200">
          <span className="text-blue-600 text-3xl font-bold">
            {user?.email.charAt(0).toUpperCase()}
          </span>
        </div>
        <h3 className="font-semibold text-gray-800">{user?.full_name}</h3>
        <p className="text-sm text-gray-500">{user?.email}</p>
      </div>

      <nav className="space-y-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.to === location.pathname
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center px-4 py-2 rounded-lg transition ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <i className={`fas ${item.icon} mr-3 w-4`}></i>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
