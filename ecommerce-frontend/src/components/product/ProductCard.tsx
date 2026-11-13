import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { productsApi } from '../../api/products'
import type { ProductListItem } from '../../api/types'
import { useAddToCart } from '../../hooks/useCart'
import { useAuth } from '../../context/AuthContext'
import { formatPrice } from '../../lib/format'
import { RatingStars } from './RatingStars'

/**
 * Product card — used by Home, ProductList and SearchResults.
 * Converted from the product-grid card in products/list.html / home.html.
 */
export function ProductCard({ product }: { product: ProductListItem }) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const addToCart = useAddToCart()
  const addToWishlist = useAddToWishlist()

  const discount = parseFloat(String(product.discount_percentage))
  const lowStock = product.stock > 0 && product.stock <= 5

  function handleAddToCart() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${product.slug}` } })
      return
    }
    addToCart.mutate(
      { productId: product.id },
      {
        onSuccess: () => {
          alert('Product added to cart!')
        },
        onError: (error) => {
          const message =
            error instanceof ApiError ? error.displayMessage : 'Failed to add product to cart.'
          alert(message)
        },
      },
    )
  }

  function handleAddToWishlist() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${product.slug}` } })
      return
    }
    addToWishlist.mutate(product.slug, {
      onSuccess: () => alert('Added to wishlist!'),
      onError: (error) => {
        const message =
          error instanceof ApiError ? error.displayMessage : 'Failed to add to wishlist.'
        alert(message)
      },
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition group flex flex-col">
      <div className="relative overflow-hidden rounded-t-lg h-64">
        {product.default_image ? (
          <img
            src={product.default_image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <i className="fas fa-image text-gray-400 text-4xl"></i>
          </div>
        )}

        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
            -{Math.round(discount)}%
          </span>
        )}

        {lowStock && (
          <span className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
            Low Stock
          </span>
        )}

        {product.stock === 0 && (
          <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
            <span className="bg-white text-gray-800 px-4 py-2 rounded-lg text-sm font-semibold">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="text-xs text-gray-500 mb-1">{product.brand_name || 'Generic'}</div>
        <Link to={`/products/${product.slug}`} className="block">
          <h3 className="font-semibold text-gray-800 hover:text-blue-600 mb-2 truncate">
            {product.name}
          </h3>
        </Link>

        <div className="mb-2">
          <RatingStars rating={product.average_rating} count={product.review_count} />
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-blue-600">{formatPrice(product.price)}</span>
            {product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price) && (
              <span className="text-sm text-gray-400 line-through ml-2">
                {formatPrice(product.compare_at_price)}
              </span>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleAddToWishlist}
              disabled={addToWishlist.isPending}
              className="text-gray-400 hover:text-red-500 p-2"
              aria-label="Add to wishlist"
            >
              <i className="fas fa-heart"></i>
            </button>
            <button
              onClick={handleAddToCart}
              disabled={addToCart.isPending || product.stock === 0}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Add to cart"
            >
              {addToCart.isPending ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-shopping-cart"></i>
              )}
            </button>
          </div>
        </div>

        {product.stock === 0 && (
          <p className="text-xs text-green-600 mt-2">
            <i className="fas fa-clock mr-1"></i> Available for backorder
          </p>
        )}
      </div>
    </div>
  )
}

function useAddToWishlist() {
  return useMutation({
    mutationFn: (slug: string) => productsApi.addToWishlist(slug),
  })
}
