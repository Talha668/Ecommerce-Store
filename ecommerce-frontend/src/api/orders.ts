/**
 * Cart + orders + checkout endpoints — apps/orders/views.py + urls.py
 * Base path: /api/orders/
 */
import { api } from './client'
import type {
  Cart,
  CheckoutPayload,
  CheckoutResponse,
  MastercardCard,
  Order,
  Paginated,
} from './types'

export const cartApi = {
  /** GET /api/orders/cart/ — get (or implicitly create) the user's cart. */
  get(): Promise<Cart> {
    return api.get('/api/orders/cart/')
  },

  /** POST /api/orders/cart/add_item/ */
  addItem(productId: number, quantity = 1, variantId?: number): Promise<Cart> {
    return api.post('/api/orders/cart/add_item/', {
      product_id: productId,
      quantity,
      ...(variantId !== undefined ? { variant_id: variantId } : {}),
    })
  },

  /** POST /api/orders/cart/update_item/ */
  updateItem(itemId: number, quantity: number): Promise<Cart> {
    return api.post('/api/orders/cart/update_item/', {
      item_id: itemId,
      quantity,
    })
  },

  /** POST /api/orders/cart/remove_item/ */
  removeItem(itemId: number): Promise<Cart> {
    return api.post('/api/orders/cart/remove_item/', { item_id: itemId })
  },

  /** POST /api/orders/cart/clear/ */
  clear(): Promise<Cart> {
    return api.post('/api/orders/cart/clear/')
  },
}

export const ordersApi = {
  /** GET /api/orders/orders/ — the customer's own orders (paginated). */
  list(): Promise<Paginated<Order>> {
    return api.get('/api/orders/orders/')
  },

  /** GET /api/orders/orders/{id}/ */
  detail(id: number): Promise<Order> {
    return api.get(`/api/orders/orders/${id}/`)
  },

  /** POST /api/orders/orders/{id}/cancel/ */
  cancel(id: number): Promise<{ message: string; order: Order }> {
    return api.post(`/api/orders/orders/${id}/cancel/`)
  },

  /** POST /api/orders/orders/{id}/track/ */
  track(id: number): Promise<{
    order_number: string
    status: string
    carrier?: string
    tracking_number?: string
    tracking_url?: string
    estimated_delivery?: string | null
    delivered_at?: string | null
    message?: string
  }> {
    return api.post(`/api/orders/orders/${id}/track/`)
  },

  /**
   * POST /api/orders/api/checkout/
   * (orders/urls.py registers CheckoutAPIView at 'api/checkout/' inside the
   * /api/orders/ include — the path is ugly but that's the backend's current shape.)
   */
  checkout(payload: CheckoutPayload): Promise<CheckoutResponse> {
    return api.post('/api/orders/api/checkout/', payload)
  },
}

export const cardsApi = {
  /** GET /api/orders/cards/ — saved Mastercard cards (masked). */
  list(): Promise<MastercardCard[]> {
    return api.get<unknown>('/api/orders/cards/').then((d) => {
      if (Array.isArray(d)) return d as MastercardCard[]
      if (d && typeof d === 'object' && 'results' in d) {
        return (d as { results: MastercardCard[] }).results
      }
      return []
    })
  },

  /** POST /api/orders/cards/{id}/set_default/ */
  setDefault(id: number): Promise<{ status: string }> {
    return api.post(`/api/orders/cards/${id}/set_default/`)
  },

  /** POST /api/orders/cards/{id}/deactivate/ */
  deactivate(id: number): Promise<{ status: string }> {
    return api.post(`/api/orders/cards/${id}/deactivate/`)
  },
}
