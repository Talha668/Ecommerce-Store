import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCartItemCount } from '../../hooks/useCart'

/**
 * Navigation bar — converted from templates/base.html.
 * Alpine.js dropdown → React state; Django form → controlled search box
 * that routes to /products?search=... (the DRF search filter).
 */
export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const cartCount = useCartItemCount()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [query, setQuery] = useState(searchParams.get('search') ?? '')
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close the user dropdown when clicking outside (replaces @click.away).
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSearch(event: React.FormEvent) {
    event.preventDefault()
    const q = query.trim()
    if (q) navigate(`/products?search=${encodeURIComponent(q)}`)
    else navigate('/products')
  }

  async function handleLogout() {
    setMenuOpen(false)
    await logout()
    navigate('/')
  }

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <i className="fas fa-credit-card text-2xl text-blue-600"></i>
              <span className="font-bold text-xl text-gray-800">
                Master<span className="text-blue-600">Shop</span>
              </span>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-lg mx-8 hidden md:block">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 text-gray-400 hover:text-blue-600"
                aria-label="Search"
              >
                <i className="fas fa-search"></i>
              </button>
            </form>
          </div>

          {/* Navigation Icons */}
          <div className="flex items-center space-x-6">
            <Link to="/cart" className="relative group" aria-label="Shopping cart">
              <i className="fas fa-shopping-cart text-xl text-gray-600 group-hover:text-blue-600"></i>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            <Link to="/wishlist" className="group" aria-label="Wishlist">
              <i className="fas fa-heart text-xl text-gray-600 group-hover:text-red-500"></i>
            </Link>

            {isAuthenticated && user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((open) => !open)}
                  className="flex items-center space-x-2 group"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center border-2 border-gray-200 group-hover:border-blue-600">
                    <span className="text-blue-600 font-semibold">
                      {user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-gray-600 group-hover:text-blue-600 hidden sm:block">
                    {user.first_name || user.email}
                  </span>
                  <i
                    className={`fas fa-chevron-down text-xs text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                  ></i>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 z-50">
                    <Link
                      to="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                    >
                      <i className="fas fa-user mr-2"></i> My Profile
                    </Link>
                    <Link
                      to="/my-orders"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                    >
                      <i className="fas fa-box mr-2"></i> My Orders
                    </Link>
                    <Link
                      to="/saved-cards"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                    >
                      <i className="fas fa-credit-card mr-2"></i> Saved Cards
                    </Link>
                    <hr className="my-2" />
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
                    >
                      <i className="fas fa-sign-out-alt mr-2"></i> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="text-gray-600 hover:text-blue-600" aria-label="Login">
                <i className="fas fa-user text-xl"></i>
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden text-gray-600"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label="Menu"
            >
              <i className={`fas ${mobileOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
            </button>
          </div>
        </div>

        {/* Mobile search row */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-3">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 text-gray-400 hover:text-blue-600"
                aria-label="Search"
              >
                <i className="fas fa-search"></i>
              </button>
            </form>
            <div className="flex flex-col space-y-2 text-gray-600">
              <Link to="/products" onClick={() => setMobileOpen(false)}>
                <i className="fas fa-store mr-2 w-5"></i> Products
              </Link>
              <Link to="/wishlist" onClick={() => setMobileOpen(false)}>
                <i className="fas fa-heart mr-2 w-5"></i> Wishlist
              </Link>
              <Link to="/cart" onClick={() => setMobileOpen(false)}>
                <i className="fas fa-shopping-cart mr-2 w-5"></i> Cart
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
