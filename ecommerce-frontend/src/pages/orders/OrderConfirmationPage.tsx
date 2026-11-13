import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ordersApi } from '../../api/orders'
import type { Order } from '../../api/types'
import { Spinner, EmptyState } from '../../components/ui/ui'
import { formatDate, formatPrice } from '../../lib/format'

/**
 * Order confirmation — converted from templates/orders/confirmation.html.
 *
 * The order object normally arrives via router state from CheckoutPage.
 * Fallback (e.g. page reload): we fetch the user's orders and match by
 * order_number. (Backend note: add an ?order_number= filter to OrderViewSet
 * so this can be a single cheap lookup.)
 */
export function OrderConfirmationPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const location = useLocation()
  const stateOrder = (location.state as { order?: Order } | null)?.order ?? null

  const orders = useQuery({
    queryKey: ['orders', 'find', orderNumber],
    queryFn: () => ordersApi.list(),
    // Only needed when we didn't get the order from checkout state.
    enabled: stateOrder === null,
    select: (data) =>
      data.results.find((o) => o.order_number === orderNumber) ?? null,
  })

  const order = stateOrder ?? orders.data
  const isLoading = stateOrder === null && orders.isLoading

  if (isLoading) {
    return <Spinner label="Loading your order..." />
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <EmptyState
          icon="fa-circle-question"
          title="Order not found"
          description={`We couldn't find order ${orderNumber ?? ''}. Check My Orders for your purchase history.`}
          action={
            <Link to="/my-orders" className="bg-blue-600 text-white px-6 py-2 rounded-lg">
              My Orders
            </Link>
          }
        />
      </div>
    )
  }

  const transaction = order.payment_transaction

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Success header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
          <i className="fas fa-circle-check text-green-600 text-4xl"></i>
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Thank You for Your Order!</h1>
        <p className="text-gray-600">Your order has been placed successfully.</p>
        <p className="text-gray-500 text-sm mt-2">
          Order Number:{' '}
          <span className="font-mono font-semibold text-blue-600">{order.order_number}</span>
        </p>
      </div>

      {/* Order Status */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-sm text-gray-500">Order Status</span>
            <div className="flex items-center mt-1">
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                {order.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
              <span className="ml-3 text-sm text-gray-500">
                Placed on {formatDate(order.created_at)}
              </span>
            </div>
          </div>
          <div className="sm:text-right">
            <span className="text-sm text-gray-500">Payment Status</span>
            <div className="flex items-center mt-1">
              {order.payment_status === 'paid' || order.payment_transaction ? (
                <>
                  <i className="fas fa-circle-check text-green-600 mr-1"></i>
                  <span className="font-semibold text-green-600">Paid</span>
                </>
              ) : (
                <span className="font-semibold text-yellow-600">
                  {order.payment_status.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Order Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Shipping Address */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
            <i className="fas fa-truck text-blue-600 mr-2"></i>
            Shipping Address
          </h3>
          {order.shipping_address_detail ? (
            <div className="text-sm text-gray-600 space-y-1">
              <p className="font-semibold text-gray-800">
                {order.shipping_address_detail.full_name}
              </p>
              <p>{order.shipping_address_detail.street}</p>
              <p>
                {order.shipping_address_detail.city}, {order.shipping_address_detail.state}{' '}
                {order.shipping_address_detail.zip_code}
              </p>
              <p>{order.shipping_address_detail.country}</p>
              <p className="mt-2">
                <i className="fas fa-phone-alt mr-1"></i>{' '}
                {order.shipping_address_detail.phone_number}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Address details unavailable.</p>
          )}
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
            <i className="fas fa-credit-card text-blue-600 mr-2"></i>
            Payment Method
          </h3>
          <div className="flex items-center space-x-2 mb-3">
            <i className="fab fa-cc-mastercard text-2xl text-gray-600"></i>
            <span className="font-semibold text-gray-800 capitalize">
              {order.payment_method}
            </span>
          </div>
          {transaction ? (
            <div className="text-sm text-gray-600">
              <p>Card ending in {transaction.card_last_four}</p>
              <p className="text-xs text-gray-500 mt-1">
                Transaction ID: {transaction.mastercard_transaction_id || transaction.transaction_id}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Transaction details unavailable.</p>
          )}
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
            <i className="fas fa-box text-blue-600 mr-2"></i>
            Order Summary
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold text-gray-800">{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Shipping</span>
              <span className="font-semibold text-gray-800">
                {parseFloat(order.shipping_cost) === 0
                  ? 'Free'
                  : formatPrice(order.shipping_cost)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax</span>
              <span className="font-semibold text-gray-800">{formatPrice(order.tax_amount)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-bold text-gray-800">Total</span>
                <span className="font-bold text-blue-600">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-800">Order Items</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {order.items.map((item, index) => (
              <div
                key={index}
                className={`flex items-center justify-between py-4 ${
                  index < order.items.length - 1 ? 'border-b border-gray-200' : ''
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.product?.default_image ? (
                      <img
                        src={item.product.default_image}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <i className="fas fa-image text-gray-400"></i>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">{item.product?.name}</h4>
                    <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                    {item.variant && (
                      <p className="text-xs text-gray-500">
                        {item.variant.name}: {item.variant.value}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-blue-600">
                    {formatPrice(item.total)}
                  </span>
                  <p className="text-xs text-gray-500">{formatPrice(item.unit_price)} each</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <Link
          to="/my-orders"
          className="text-blue-600 hover:text-blue-700 font-semibold flex items-center"
        >
          <i className="fas fa-arrow-left mr-2"></i>
          View All Orders
        </Link>

        <div className="flex space-x-4">
          <button
            onClick={() => window.print()}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
          >
            <i className="fas fa-print mr-2"></i>
            Print
          </button>
          <Link
            to="/products"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <i className="fas fa-shopping-bag mr-2"></i>
            Continue Shopping
          </Link>
        </div>
      </div>

      {/* Email Confirmation */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <i className="fas fa-envelope mr-1"></i>
        We've sent a confirmation email to{' '}
        <span className="font-semibold text-gray-700">{order.user_email}</span>
      </div>
    </div>
  )
}
