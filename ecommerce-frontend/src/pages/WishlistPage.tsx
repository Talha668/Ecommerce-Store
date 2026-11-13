import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { productsApi } from '../api/products'
import { EmptyState, Spinner } from '../components/ui/ui'
import { ProductCard } from '../components/product/ProductCard'
import { useAuth } from '../context/AuthContext'
import { extractResults } from '../api/client'
import type { Wishlist } from '../api/types'

/**
 * Wishlist — the navbar heart icon pointed at a Django URL that didn't exist
 * ('wishlist-list'). This page lists the user's wishlists and their products
 * from GET /api/products/wishlists/.
 */
export function WishlistPage() {
  const { isAuthenticated } = useAuth()

  const wishlists = useQuery({
    queryKey: ['wishlists'],
    queryFn: () => productsApi.wishlists(),
    enabled: isAuthenticated,
  })

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <EmptyState
          icon="fa-heart"
          title="Log in to see your wishlist"
          description="Save products you love and find them here anytime."
          action={
            <Link to="/login" className="bg-blue-600 text-white px-6 py-2 rounded-lg">
              Login
            </Link>
          }
        />
      </div>
    )
  }

  if (wishlists.isLoading) {
    return <Spinner label="Loading your wishlist..." />
  }

  const lists = extractResults<Wishlist>(wishlists.data)
  const allProducts = lists.flatMap((w) => w.products)

  if (allProducts.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <EmptyState
          icon="fa-heart"
          title="Your wishlist is empty"
          description="Tap the heart on any product to save it here."
          action={
            <Link to="/products" className="bg-blue-600 text-white px-6 py-2 rounded-lg">
              Browse Products
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">My Wishlist</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {allProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
