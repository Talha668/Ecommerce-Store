import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { productsApi } from '../../api/products'
import { useAuth } from '../../context/AuthContext'
import { useAddToCart } from '../../hooks/useCart'
import { formatPrice } from '../../lib/format'
import { Alert, EmptyState, Field, Spinner, inputClass } from '../../components/ui/ui'
import { ProductCard } from '../../components/product/ProductCard'
import { RatingStars } from '../../components/product/RatingStars'

/**
 * Product detail page — converted from templates/products/detail.html.
 *
 * NOTE: the original detail.html in your repo accidentally contained a copy of
 * cart.html, so this page was rebuilt from ProductDetailSerializer +
 * the site's design language (same cards, colors and Tailwind patterns).
 */
export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()
  const addToCart = useAddToCart()

  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<number | undefined>(undefined)
  const [quantity, setQuantity] = useState(1)
  const [cartError, setCartError] = useState<string | null>(null)

  const product = useQuery({
    queryKey: ['products', 'detail', slug],
    queryFn: () => productsApi.detail(slug!),
    enabled: slug !== undefined,
  })

  const related = useQuery({
    queryKey: ['products', 'related', slug],
    queryFn: () =>
      productsApi.list({ category: product.data!.category.slug, page_size: 5 }),
    enabled: product.data !== undefined,
    select: (data) => data.results.filter((p) => p.slug !== slug).slice(0, 4),
  })

  const addReview = useMutation({
    mutationFn: (payload: { title: string; content: string; rating: number }) =>
      productsApi.addReview(slug!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', 'detail', slug] })
    },
  })

  if (product.isLoading) {
    return <Spinner label="Loading product..." />
  }

  if (product.isError || !product.data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState
          icon="fa-circle-exclamation"
          title="Product not found"
          description="It may have been removed or the link is wrong."
          action={
            <Link to="/products" className="bg-blue-600 text-white px-6 py-2 rounded-lg">
              Browse Products
            </Link>
          }
        />
      </div>
    )
  }

  const p = product.data
  const images = p.images.length > 0 ? p.images : []
  const mainImage = selectedImage ?? images.find((i) => i.is_default)?.image_url ?? images[0]?.image_url ?? null
  const discount = parseFloat(String(p.discount_percentage))

  function handleAddToCart() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${p.slug}` } })
      return
    }
    setCartError(null)
    addToCart.mutate(
      { productId: p.id, quantity, variantId: selectedVariant },
      {
        onSuccess: () => {
          alert('Product added to cart!')
        },
        onError: (error) => {
          const data = (error as { data?: Record<string, unknown> }).data
          if (data && typeof data === 'object') {
            const first = Object.values(data)[0]
            setCartError(Array.isArray(first) ? String(first[0]) : String(first))
          } else {
            setCartError('Failed to add product to cart.')
          }
        },
      },
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center mb-8 text-sm">
        <Link to="/" className="text-gray-500 hover:text-blue-600">Home</Link>
        <span className="mx-2 text-gray-400">/</span>
        <Link to="/products" className="text-gray-500 hover:text-blue-600">Products</Link>
        <span className="mx-2 text-gray-400">/</span>
        <Link
          to={`/products?category=${p.category.slug}`}
          className="text-gray-500 hover:text-blue-600"
        >
          {p.category.name}
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-800 font-semibold truncate">{p.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Image gallery */}
        <div>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="h-96 bg-gray-100 flex items-center justify-center">
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={p.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <i className="fas fa-image text-gray-400 text-8xl"></i>
              )}
            </div>
          </div>
          {images.length > 1 && (
            <div className="flex space-x-3 mt-4">
              {images.map((image) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImage(image.image_url)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 ${
                    mainImage === image.image_url
                      ? 'border-blue-600'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <img
                    src={image.image_url ?? image.image}
                    alt={image.alt_text || p.name}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="text-xs text-gray-500 mb-1">{p.brand?.name ?? 'Generic'}</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{p.name}</h1>

          <div className="flex items-center mb-4">
            <RatingStars rating={p.average_rating} count={p.review_count} size="md" />
            <span className="text-sm text-gray-500 ml-4">SKU: {p.sku}</span>
          </div>

          <div className="flex items-baseline mb-4">
            <span className="text-3xl font-bold text-blue-600">{formatPrice(p.price)}</span>
            {p.compare_at_price && parseFloat(p.compare_at_price) > parseFloat(p.price) && (
              <>
                <span className="text-lg text-gray-400 line-through ml-3">
                  {formatPrice(p.compare_at_price)}
                </span>
                <span className="ml-3 bg-red-100 text-red-600 text-sm font-semibold px-2 py-1 rounded-full">
                  Save {Math.round(discount)}%
                </span>
              </>
            )}
          </div>

          {p.short_description && (
            <p className="text-gray-600 mb-6">{p.short_description}</p>
          )}

          {/* Stock status */}
          <div className="mb-6">
            {p.stock === 0 ? (
              <p className="text-red-600 font-semibold">
                <i className="fas fa-circle-xmark mr-1"></i> Out of stock
                {p.allow_backorders && ' — backorders allowed'}
              </p>
            ) : p.is_low_stock ? (
              <p className="text-orange-600 font-semibold">
                <i className="fas fa-triangle-exclamation mr-1"></i>
                Low stock — only {p.stock} left
              </p>
            ) : (
              <p className="text-green-600 font-semibold">
                <i className="fas fa-circle-check mr-1"></i> In stock ({p.stock} available)
              </p>
            )}
          </div>

          {/* Variants */}
          {p.variants.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-800 mb-2">Options</h3>
              <div className="flex flex-wrap gap-2">
                {p.variants.map((variant) => (
                  <button
                    key={variant.id}
                    disabled={!variant.is_active || variant.stock === 0}
                    onClick={() => setSelectedVariant(variant.id)}
                    className={`px-4 py-2 rounded-lg border text-sm ${
                      selectedVariant === variant.id
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-blue-400'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {variant.name}: {variant.value}
                    {variant.price_adjustment !== '0.00' &&
                      ` (${formatPrice(variant.current_price)})`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + Add to cart */}
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200"
                aria-label="Decrease quantity"
              >
                <i className="fas fa-minus text-xs"></i>
              </button>
              <span className="px-4 py-2 w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(p.stock || 99, q + 1))}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200"
                aria-label="Increase quantity"
              >
                <i className="fas fa-plus text-xs"></i>
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={addToCart.isPending || (p.stock === 0 && !p.allow_backorders)}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addToCart.isPending ? (
                <i className="fas fa-spinner fa-spin mr-2"></i>
              ) : (
                <i className="fas fa-shopping-cart mr-2"></i>
              )}
              Add to Cart
            </button>

            <button
              onClick={() =>
                isAuthenticated
                  ? productsApi
                      .addToWishlist(p.slug)
                      .then(() => alert('Added to wishlist!'))
                      .catch(() => alert('Failed to add to wishlist.'))
                  : navigate('/login', { state: { from: `/products/${p.slug}` } })
              }
              className="text-gray-400 hover:text-red-500 p-3 border border-gray-300 rounded-lg"
              aria-label="Add to wishlist"
            >
              <i className="fas fa-heart text-xl"></i>
            </button>
          </div>

          {cartError && <Alert type="error" onClose={() => setCartError(null)}>{cartError}</Alert>}

          {/* Description + specifications */}
          <div className="mt-8 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Description</h3>
              <p className="text-gray-600 whitespace-pre-line">{p.description}</p>
            </div>
            {Object.keys(p.specifications).length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Specifications</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {Object.entries(p.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between bg-gray-50 rounded px-3 py-2">
                      <dt className="text-gray-500">{key}</dt>
                      <dd className="font-medium text-gray-800">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Customer Reviews ({p.review_count})
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {p.reviews.length === 0 ? (
              <p className="text-gray-500">No reviews yet. Be the first to review this product.</p>
            ) : (
              p.reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-2">
                    <RatingStars rating={review.rating} />
                    <span className="text-xs text-gray-400">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-800">{review.title}</h4>
                  <p className="text-gray-600 text-sm mt-1">{review.content}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    By {review.user?.full_name || review.user_email}
                    {review.is_verified_purchase && (
                      <span className="text-green-600 ml-2">
                        <i className="fas fa-circle-check mr-1"></i>Verified purchase
                      </span>
                    )}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Write a review */}
          {isAuthenticated ? (
            <div className="bg-white rounded-lg shadow-md p-6 h-fit">
              <h3 className="font-semibold text-gray-800 mb-4">Write a Review</h3>
              {addReview.isSuccess ? (
                <Alert type="success">Thanks! Your review was submitted for approval.</Alert>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const form = new FormData(e.currentTarget)
                    addReview.mutate({
                      title: String(form.get('title') ?? ''),
                      content: String(form.get('content') ?? ''),
                      rating: Number(form.get('rating') ?? 5),
                    })
                  }}
                  className="space-y-4"
                >
                  <Field label="Rating">
                    <select name="rating" defaultValue="5" className={inputClass}>
                      {[5, 4, 3, 2, 1].map((r) => (
                        <option key={r} value={r}>
                          {r} star{r > 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Title">
                    <input name="title" required className={inputClass} placeholder="Great product!" />
                  </Field>
                  <Field label="Review">
                    <textarea
                      name="content"
                      required
                      rows={4}
                      className={inputClass}
                      placeholder="What did you like or dislike?"
                    ></textarea>
                  </Field>
                  {addReview.isError && (
                    <Alert type="error">
                      {(() => {
                        const errData = addReview.error as unknown as {
                          data?: Record<string, unknown>
                        }
                        return errData.data
                          ? String(Object.values(errData.data)[0])
                          : 'Failed to submit review.'
                      })()}
                    </Alert>
                  )}
                  <button
                    type="submit"
                    disabled={addReview.isPending}
                    className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addReview.isPending ? 'Submitting…' : 'Submit Review'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="bg-blue-50 rounded-lg p-6 h-fit text-center">
              <p className="text-gray-600 text-sm mb-3">Log in to write a review.</p>
              <Link
                to="/login"
                state={{ from: `/products/${p.slug}` }}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg inline-block"
              >
                Login
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Related products */}
      {related.data && related.data.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">You May Also Like</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.data.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
