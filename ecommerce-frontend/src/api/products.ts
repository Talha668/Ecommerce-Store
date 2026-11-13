/**
 * Products endpoints — apps/products/views.py + urls.py
 *
 * Router: /api/products/products/, /api/products/categories/, ...
 */
import { api, extractResults } from './client'
import type {
  ApiList,
  Brand,
  Category,
  Paginated,
  ProductDetail,
  ProductListItem,
  Review,
  Wishlist,
} from './types'

export interface ProductQueryParams {
  search?: string
  category?: string // category slug
  brand?: string // brand slug
  min_price?: number
  max_price?: number
  min_rating?: number
  in_stock?: boolean
  on_sale?: boolean
  is_featured?: boolean
  ordering?: string // e.g. '-price', 'price', '-created_at', '-sales_count', '-average_rating'
  page?: number
  page_size?: number
}

function buildQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export const productsApi = {
  /** GET /api/products/products/ — filterable, paginated product list. */
  list(params: ProductQueryParams = {}): Promise<Paginated<ProductListItem>> {
    return api.get(`/api/products/products/${buildQueryString({ ...params })}`)
  },

  /** GET /api/products/products/{slug}/ */
  detail(slug: string): Promise<ProductDetail> {
    return api.get(`/api/products/products/${encodeURIComponent(slug)}/`)
  },

  featured(): Promise<ProductListItem[]> {
    return api
      .get<unknown>('/api/products/products/featured/')
      .then((d) => extractResults<ProductListItem>(d))
  },

  bestSelling(): Promise<ProductListItem[]> {
    return api
      .get<unknown>('/api/products/products/best_selling/')
      .then((d) => extractResults<ProductListItem>(d))
  },

  newArrivals(): Promise<ProductListItem[]> {
    return api
      .get<unknown>('/api/products/products/new_arrivals/')
      .then((d) => extractResults<ProductListItem>(d))
  },

  onSale(): Promise<ProductListItem[]> {
    return api
      .get<unknown>('/api/products/products/on_sale/')
      .then((d) => extractResults<ProductListItem>(d))
  },

  /** GET /api/products/categories/ (top-level categories by default). */
  categories(): Promise<Category[]> {
    return api
      .get<unknown>('/api/products/categories/')
      .then((d) => extractResults<Category>(d))
  },

  /** GET /api/products/brands/ */
  brands(): Promise<Brand[]> {
    return api
      .get<unknown>('/api/products/brands/')
      .then((d) => extractResults<Brand>(d))
  },

  /** POST /api/products/products/{slug}/add-review/ */
  addReview(
    slug: string,
    payload: { title: string; content: string; rating: number },
  ): Promise<Review> {
    return api.post(
      `/api/products/products/${encodeURIComponent(slug)}/add-review/`,
      payload,
    )
  },

  /** POST /api/products/products/{slug}/add-to-wishlist/ */
  addToWishlist(slug: string, wishlistName = 'My Wishlist'): Promise<{ message: string }> {
    return api.post(
      `/api/products/products/${encodeURIComponent(slug)}/add-to-wishlist/`,
      { wishlist_name: wishlistName },
    )
  },

  /** GET /api/products/wishlists/ */
  wishlists(): Promise<ApiList<Wishlist>> {
    return api.get('/api/products/wishlists/')
  },
}
