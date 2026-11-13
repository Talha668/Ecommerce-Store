import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { usersApi } from '../../api/auth'
import { cardsApi, ordersApi } from '../../api/orders'
import type { CheckoutPayload, MastercardCard, UserAddress } from '../../api/types'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../hooks/useCart'
import { formatPrice } from '../../lib/format'
import { Alert, EmptyState, Spinner, inputClass } from '../../components/ui/ui'

const SHIPPING_METHODS = [
  { value: 'standard', label: 'Standard Shipping', detail: '3-5 business days', cost: 5.99 },
  { value: 'express', label: 'Express Shipping', detail: '1-2 business days', cost: 12.99 },
  { value: 'overnight', label: 'Overnight Shipping', detail: 'Next business day', cost: 19.99 },
] as const

/**
 * Checkout — converted from templates/checkout/checkout.html.
 *
 * Old flow: Django form POST to CheckoutPageView (which had broken service
 * wiring). New flow: React state form → POST /api/orders/api/checkout/
 * (CheckoutAPIView + CheckoutService.process_checkout).
 */
export function CheckoutPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const cart = useCart()

  const addresses = useQuery({
    queryKey: ['addresses'],
    queryFn: () => usersApi.addresses(),
  })
  const cards = useQuery({
    queryKey: ['cards'],
    queryFn: () => cardsApi.list(),
  })

  const [shippingAddressId, setShippingAddressId] = useState<number | null>(null)
  const [shippingMethod, setShippingMethod] =
    useState<CheckoutPayload['shipping_method']>('standard')
  const [useSavedCard, setUseSavedCard] = useState<number | null>(null)
  const [customerNotes, setCustomerNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  // New card fields
  const [cardNumber, setCardNumber] = useState('')
  const [cardholderName, setCardholderName] = useState('')
  const [expiryMonth, setExpiryMonth] = useState('')
  const [expiryYear, setExpiryYear] = useState('')
  const [cvv, setCvv] = useState('')
  const [saveCard, setSaveCard] = useState(false)

  const checkout = useMutation({
    mutationFn: (payload: CheckoutPayload) => ordersApi.checkout(payload),
    onSuccess: (data) => {
      const orderNumber = data.order?.order_number
      if (orderNumber) {
        navigate(`/order-confirmation/${orderNumber}`, { state: { order: data.order } })
      } else {
        navigate('/my-orders')
      }
    },
    onError: (error) => {
      const data = (error as { data?: Record<string, unknown> }).data
      if (data && typeof data === 'object') {
        const first = Object.values(data)[0]
        setFormError(Array.isArray(first) ? String(first[0]) : String(first))
      } else {
        setFormError('Checkout failed. Please try again.')
      }
    },
  })

  if (cart.isLoading) {
    return <Spinner label="Loading checkout..." />
  }

  const cartData = cart.data
  if (!cartData || cartData.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <EmptyState
          icon="fa-shopping-cart"
          title="Your cart is empty"
          description="Add some products before checking out."
          action={
            <Link to="/products" className="bg-blue-600 text-white px-6 py-2 rounded-lg">
              Browse Products
            </Link>
          }
        />
      </div>
    )
  }

  /** Groups addresses by user defaults; auto-select default once loaded. */
  const addressList: UserAddress[] = addresses.data ?? []
  const effectiveShippingId =
    shippingAddressId ??
    addressList.find((a) => a.is_default)?.id ??
    addressList[0]?.id ??
    null

  function formatCardNumber(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 19)
    return digits.replace(/(.{4})/g, '$1 ').trim()
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)

    if (!effectiveShippingId) {
      setFormError('Please select or add a shipping address.')
      return
    }

    const payload: CheckoutPayload = {
      shipping_address_id: effectiveShippingId,
      shipping_method: shippingMethod,
      payment_method: 'mastercard',
      customer_notes: customerNotes || undefined,
    }

    if (useSavedCard !== null) {
      payload.card_id = useSavedCard
    } else {
      // New card payment — validate locally before hitting the API.
      if (!cardNumber || !cardholderName || !expiryMonth || !expiryYear || !cvv) {
        setFormError('Please enter complete card details.')
        return
      }
      payload.card_number = cardNumber.replace(/\s/g, '')
      payload.cardholder_name = cardholderName
      payload.expiry_month = Number(expiryMonth)
      payload.expiry_year = Number(expiryYear)
      payload.cvv = cvv
      payload.save_card = saveCard
    }

    checkout.mutate(payload)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Checkout Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          <div className="flex items-center">
            <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center">1</div>
            <span className="ml-2 font-semibold text-blue-600">Cart</span>
          </div>
          <div className="w-12 h-1 mx-2 bg-blue-600"></div>
          <div className="flex items-center">
            <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center">2</div>
            <span className="ml-2 font-semibold text-blue-600">Checkout</span>
          </div>
          <div className="w-12 h-1 mx-2 bg-gray-300"></div>
          <div className="flex items-center">
            <div className="bg-gray-300 text-gray-600 rounded-full w-8 h-8 flex items-center justify-center">3</div>
            <span className="ml-2 font-semibold text-gray-500">Confirmation</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            {formError && <Alert type="error" onClose={() => setFormError(null)}>{formError}</Alert>}

            <form onSubmit={handleSubmit}>
              {/* 1. Shipping Address */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">1. Shipping Address</h3>

                {addresses.isLoading ? (
                  <Spinner label="Loading addresses..." />
                ) : addressList.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {addressList.map((address) => (
                        <label
                          key={address.id}
                          className={`relative border rounded-lg p-4 cursor-pointer transition ${
                            effectiveShippingId === address.id
                              ? 'border-blue-600 bg-blue-50 border-2'
                              : 'border-gray-200 hover:border-blue-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name="shipping_address_id"
                            className="absolute top-4 right-4"
                            checked={effectiveShippingId === address.id}
                            onChange={() => setShippingAddressId(address.id)}
                          />
                          <div>
                            <p className="font-semibold text-gray-800 pr-8">{address.full_name}</p>
                            <p className="text-sm text-gray-600">{address.street}</p>
                            <p className="text-sm text-gray-600">
                              {address.city}, {address.state} {address.zip_code}
                            </p>
                            <p className="text-sm text-gray-600">{address.country}</p>
                            <p className="text-sm text-gray-600 mt-2">
                              <i className="fas fa-phone-alt mr-1"></i> {address.phone_number}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="text-center mt-4">
                      <Link
                        to="/add-address?next=/checkout"
                        className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
                      >
                        <i className="fas fa-plus-circle mr-1"></i> Add New Address
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 mb-4">You haven't added any shipping addresses yet.</p>
                    <Link
                      to="/add-address?next=/checkout"
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Add New Address
                    </Link>
                  </div>
                )}
              </div>

              {/* 2. Shipping Method */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">2. Shipping Method</h3>
                <div className="space-y-3">
                  {SHIPPING_METHODS.map((method) => (
                    <label
                      key={method.value}
                      className={`flex items-center justify-between border rounded-lg p-4 cursor-pointer transition ${
                        shippingMethod === method.value
                          ? 'border-blue-600 bg-blue-50 border-2'
                          : 'border-gray-200 hover:border-blue-600'
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="shipping_method"
                          className="mr-3"
                          checked={shippingMethod === method.value}
                          onChange={() => setShippingMethod(method.value)}
                        />
                        <div>
                          <span className="font-semibold text-gray-800">{method.label}</span>
                          <p className="text-sm text-gray-500">{method.detail}</p>
                        </div>
                      </div>
                      <span className="font-semibold text-gray-800">
                        {parseFloat(cartData.subtotal) >= 100 && method.value === 'standard'
                          ? 'Free'
                          : formatPrice(method.cost)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 3. Payment Method */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">3. Payment Method</h3>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <i className="fab fa-cc-mastercard text-2xl text-blue-600 mr-3"></i>
                    <div>
                      <p className="font-semibold text-blue-800">Mastercard Exclusive Offer</p>
                      <p className="text-sm text-blue-600">
                        Get 10% cashback on your first Mastercard payment
                      </p>
                    </div>
                  </div>
                </div>

                {/* Saved Cards */}
                {!cards.isLoading && (cards.data ?? []).length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select Saved Card
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(cards.data as MastercardCard[])
                        .filter((card) => !card.is_expired)
                        .map((card) => (
                          <label
                            key={card.id}
                            className={`border rounded-lg p-4 cursor-pointer transition ${
                              useSavedCard === card.id
                                ? 'border-blue-600 bg-blue-50 border-2'
                                : 'border-gray-200 hover:border-blue-600'
                            }`}
                          >
                            <input
                              type="radio"
                              name="card_id"
                              className="hidden"
                              checked={useSavedCard === card.id}
                              onChange={() => setUseSavedCard(card.id)}
                            />
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <i className="fab fa-cc-mastercard text-2xl text-gray-600"></i>
                                <div>
                                  <p className="font-semibold text-gray-800">
                                    •••• {card.last_four}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Expires {card.expiry_month}/{card.expiry_year}
                                  </p>
                                </div>
                              </div>
                              {useSavedCard === card.id && (
                                <i className="fas fa-circle-check text-blue-600"></i>
                              )}
                            </div>
                          </label>
                        ))}
                    </div>
                    <div className="mt-3 text-center">
                      <button
                        type="button"
                        onClick={() => setUseSavedCard(null)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Use a new card instead
                      </button>
                    </div>
                  </div>
                )}

                {/* New Card Form */}
                <div className={useSavedCard !== null ? 'opacity-50 pointer-events-none' : ''}>
                  <h4 className="font-semibold text-gray-800 mb-4">Enter Card Details</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Card Number
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                          maxLength={19}
                          placeholder="1234 5678 9012 3456"
                          className={inputClass}
                        />
                        <div className="absolute right-3 top-2.5">
                          <i className="fab fa-cc-mastercard text-xl text-gray-400"></i>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value)}
                        placeholder={user?.full_name || 'John Doe'}
                        className={inputClass}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                        <select
                          value={expiryMonth}
                          onChange={(e) => setExpiryMonth(e.target.value)}
                          className={inputClass}
                        >
                          <option value="">MM</option>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m}>
                              {String(m).padStart(2, '0')}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                        <select
                          value={expiryYear}
                          onChange={(e) => setExpiryYear(e.target.value)}
                          className={inputClass}
                        >
                          <option value="">YYYY</option>
                          {Array.from({ length: 11 }, (_, i) => 2025 + i).map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                        <input
                          type="text"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          maxLength={4}
                          placeholder="123"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="save_card"
                        checked={saveCard}
                        onChange={(e) => setSaveCard(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="save_card" className="ml-2 text-sm text-gray-600">
                        Save this card for future purchases
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Order Notes */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Notes (Optional)
                </label>
                <textarea
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  rows={3}
                  placeholder="Special instructions for delivery"
                  className={inputClass}
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={checkout.isPending}
                className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkout.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>Processing payment…</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-lock"></i>
                    <span>Place Order • {formatPrice(cartData.total)}</span>
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                By placing your order, you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Your Order</h3>

            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              {cartData.items.map((item) => (
                <div key={item.id} className="flex items-start space-x-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.product.default_image && (
                      <img
                        src={item.product.default_image}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{item.product.name}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    <p className="text-xs text-gray-600 mt-1">{formatPrice(item.unit_price)} each</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-800">
                    {formatPrice(item.total)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold text-gray-800">{formatPrice(cartData.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="font-semibold text-gray-800">{formatPrice(cartData.tax_amount)}</span>
              </div>
              {parseFloat(cartData.discount_amount) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatPrice(cartData.discount_amount)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex justify-between">
                <span className="text-base font-bold text-gray-800">Total</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatPrice(cartData.total)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Including all taxes</p>
            </div>

            <div className="mt-6 flex items-center justify-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center">
                <i className="fas fa-shield-halved text-green-600 mr-1"></i> Secure SSL
              </div>
              <div className="flex items-center">
                <i className="fas fa-lock text-green-600 mr-1"></i> Encrypted
              </div>
              <div className="flex items-center">
                <i className="fas fa-credit-card text-green-600 mr-1"></i> PCI DSS
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
