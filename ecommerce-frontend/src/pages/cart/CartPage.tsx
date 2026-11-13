import { Link } from 'react-router-dom'
import { useCart, useClearCart, useRemoveCartItem, useUpdateCartItem } from '../../hooks/useCart'
import { formatPrice } from '../../lib/format'
import { EmptyState, Spinner } from '../../components/ui/ui'

const FREE_SHIPPING_THRESHOLD = 100

/**
 * Shopping cart — converted from templates/cart/cart.html.
 * Every action used to POST then `location.reload()`; now the mutations
 * invalidate the ['cart'] query and TanStack Query refetches automatically.
 */
export function CartPage() {
  const cart = useCart()
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()
  const clearCart = useClearCart()

  if (cart.isLoading) {
    return <Spinner label="Loading your cart..." />
  }

  const data = cart.data
  const items = data?.items ?? []

  if (!data || items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Shopping Cart</h1>
        <EmptyState
          icon="fa-shopping-cart"
          title="Your Cart is Empty"
          description="Looks like you haven't added any items to your cart yet."
          action={
            <Link
              to="/products"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Start Shopping
            </Link>
          }
        />
      </div>
    )
  }

  const subtotal = parseFloat(data.subtotal)
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
  const progressPercent = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)

  function changeQuantity(itemId: number, current: number, delta: number) {
    const next = current + delta
    if (next < 1) return
    updateItem.mutate({ itemId, quantity: next })
  }

  function removeOne(itemId: number) {
    if (confirm('Remove this item from your cart?')) removeItem.mutate(itemId)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 space-y-6">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex flex-col sm:flex-row sm:items-center gap-4 py-4 ${
                    index < items.length - 1 ? 'border-b border-gray-200' : ''
                  }`}
                >
                  {/* Product Image */}
                  <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.product.default_image ? (
                      <img
                        src={item.product.default_image}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <i className="fas fa-image text-gray-400 text-3xl"></i>
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 hover:text-blue-600">
                      <Link to={`/products/${item.product.slug}`}>{item.product.name}</Link>
                    </h3>

                    {item.variant && (
                      <p className="text-sm text-gray-500 mt-1">
                        {item.variant.name}: {item.variant.value}
                      </p>
                    )}

                    <div className="flex items-center mt-2 text-sm">
                      <span className="text-gray-500">Price:</span>
                      <span className="font-semibold text-blue-600 ml-1">
                        {formatPrice(item.unit_price)}
                      </span>
                    </div>

                    <div className="sm:hidden mt-2">
                      <span className="text-lg font-bold text-blue-600">
                        {formatPrice(item.total)}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center">
                    <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                      <button
                        onClick={() => changeQuantity(item.id, item.quantity, -1)}
                        disabled={updateItem.isPending}
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200"
                        aria-label="Decrease quantity"
                      >
                        <i className="fas fa-minus text-xs"></i>
                      </button>
                      <span className="px-3 py-1 text-center w-10">{item.quantity}</span>
                      <button
                        onClick={() => changeQuantity(item.id, item.quantity, 1)}
                        disabled={updateItem.isPending}
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200"
                        aria-label="Increase quantity"
                      >
                        <i className="fas fa-plus text-xs"></i>
                      </button>
                    </div>
                  </div>

                  {/* Price & Remove */}
                  <div className="sm:text-right">
                    <div className="hidden sm:block">
                      <span className="text-lg font-bold text-blue-600">
                        {formatPrice(item.total)}
                      </span>
                    </div>
                    <button
                      onClick={() => removeOne(item.id)}
                      disabled={removeItem.isPending}
                      className="text-red-500 hover:text-red-700 mt-2 disabled:opacity-50"
                    >
                      <i className="fas fa-trash-alt"></i>
                      <span className="text-sm ml-1">Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Actions */}
            <div className="bg-gray-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <Link
                  to="/products"
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  Continue Shopping
                </Link>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to clear your cart?'))
                      clearCart.mutate()
                  }}
                  disabled={clearCart.isPending}
                  className="text-red-500 hover:text-red-700 text-sm disabled:opacity-50"
                >
                  <i className="fas fa-trash-alt mr-1"></i>
                  Clear Cart
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Order Summary</h2>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">{formatPrice(data.subtotal)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-semibold">
                  {parseFloat(data.shipping_cost) === 0 ? (
                    <span className="text-green-600">Free</span>
                  ) : (
                    formatPrice(data.shipping_cost)
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Tax (10%)</span>
                <span className="font-semibold">{formatPrice(data.tax_amount)}</span>
              </div>

              {parseFloat(data.discount_amount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatPrice(data.discount_amount)}</span>
                </div>
              )}

              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-gray-800">Total</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatPrice(data.total)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Including all taxes and fees
                </p>
              </div>
            </div>

            {/* Checkout Button */}
            <Link
              to="/checkout"
              className="block w-full bg-blue-600 text-white text-center px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition mt-6"
            >
              <i className="fas fa-lock mr-2"></i>
              Proceed to Checkout
            </Link>

            {/* Payment Methods */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500 mb-3">We accept:</p>
              <div className="flex justify-center space-x-3">
                <div className="bg-gray-100 p-2 rounded">
                  <i className="fab fa-cc-mastercard text-2xl text-gray-700"></i>
                </div>
                <div className="bg-gray-100 p-2 rounded">
                  <i className="fab fa-cc-visa text-2xl text-gray-700"></i>
                </div>
                <div className="bg-gray-100 p-2 rounded">
                  <i className="fab fa-cc-amex text-2xl text-gray-700"></i>
                </div>
              </div>
            </div>

            {/* Free Shipping Progress */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              {remainingForFreeShipping > 0 ? (
                <>
                  <p className="text-sm text-gray-600 mb-2">
                    <i className="fas fa-truck text-blue-600 mr-1"></i>
                    Add {formatPrice(remainingForFreeShipping)} more for FREE shipping!
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-green-600 font-semibold">
                  <i className="fas fa-circle-check mr-1"></i>
                  Your order qualifies for FREE shipping!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
