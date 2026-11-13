/**
 * TypeScript types mirroring the Django REST Framework serializers.
 *
 * Source of truth:
 *   - apps/products/serializers.py  (Product*, Category, Brand, Review, Wishlist)
 *   - apps/users/serializers.py     (User, UserAddress, UserProfile)
 *   - apps/orders/serializers.py    (Cart, CartItem, MastercardCard, Order, Checkout)
 *   - apps/products/pagination.py   (ProductPagination envelope)
 */

// ---------------------------------------------------------------------------
// Pagination (ProductPagination.get_paginated_response)
// ---------------------------------------------------------------------------

export interface Paginated<T> {
  total: number
  page: number
  total_pages: number
  page_size: number
  next: string | null
  previous: string | null
  results: T[]
}

/** DRF PageNumberPagination shape (used by some endpoints). */
export interface DrfPaginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/** Some endpoints return a bare array, some a paginated object — handle both. */
export type ApiList<T> = Paginated<T> | DrfPaginated<T> | T[]

// ---------------------------------------------------------------------------
// Products app
// ---------------------------------------------------------------------------

export interface Category {
  id: number
  name: string
  slug: string
  parent: number | null
  full_path: string
  description: string
  image: string | null
  is_active: boolean
  order: number
  product_count: number
  created_at: string
  updated_at: string
}

export interface Brand {
  id: number
  name: string
  slug: string
  description: string
  logo: string | null
  website: string
  is_active: boolean
  product_count: number
  created_at: string
  updated_at: string
}

export interface ProductImage {
  id: number
  image: string
  image_url: string | null
  alt_text: string
  is_default: boolean
  order: number
}

export interface ProductVariant {
  id: number
  name: string
  value: string
  sku: string
  price_adjustment: string
  current_price: string
  stock: number
  image: string | null
  is_active: boolean
}

export interface Review {
  id: number
  user: User | null
  user_email: string
  title: string
  content: string
  rating: number
  is_verified_purchase: boolean
  helpful_votes: number
  unhelpful_votes: number
  images: unknown
  created_at: string
  updated_at: string
}

/** ProductListSerializer — used in grids, carts and wishlists. */
export interface ProductListItem {
  id: number
  name: string
  slug: string
  sku: string
  price: string
  compare_at_price: string | null
  discount_percentage: number
  category_name: string
  brand_name: string | null
  default_image: string | null
  stock: number
  is_active: boolean
  average_rating: string
  review_count: number
  is_featured: boolean
}

export interface ProductDetail extends Omit<ProductListItem, 'category_name' | 'brand_name' | 'default_image'> {
  name: string
  slug: string
  sku: string
  barcode: string
  short_description: string
  description: string
  specifications: Record<string, string>
  category: Category
  brand: Brand | null
  tags: string[]
  price: string
  compare_at_price: string | null
  stock: number
  low_stock_threshold: number
  track_inventory: boolean
  allow_backorders: boolean
  weight: string | null
  weight_unit: string
  dimensions: string
  is_active: boolean
  is_featured: boolean
  is_digital: boolean
  meta_title: string
  meta_description: string
  views_count: number
  sales_count: number
  average_rating: string
  review_count: number
  discount_percentage: number
  is_in_stock: boolean
  is_low_stock: boolean
  images: ProductImage[]
  variants: ProductVariant[]
  reviews: Review[]
  created_at: string
  updated_at: string
}

export interface Wishlist {
  id: number
  name: string
  products: ProductListItem[]
  product_count: number
  is_public: boolean
  share_token: string
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Users app
// ---------------------------------------------------------------------------

export type UserRole = 'customer' | 'admin' | 'staff'

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  phone_number: string
  role: UserRole
  email_verified: boolean
  date_joined: string
}

export interface UserProfile {
  id: number
  user: User
  date_of_birth: string | null
  gender: '' | 'male' | 'female' | 'other'
  bio: string
  preferences: Record<string, unknown>
  newsletter_subscription: boolean
  created_at: string
  updated_at: string
}

export type AddressType = 'shipping' | 'billing' | 'both'

export interface UserAddress {
  id: number
  user: number
  full_name: string
  phone_number: string
  street: string
  city: string
  state: string
  country: string
  zip_code: string
  is_default: boolean
  address_type: AddressType
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  user: User
  access: string
  refresh: string
  message: string
}

// ---------------------------------------------------------------------------
// Orders app
// ---------------------------------------------------------------------------

export interface CartItem {
  id: number
  product: ProductListItem
  product_id: number
  variant: ProductVariant | null
  variant_id: number | null
  quantity: number
  unit_price: string
  total: string
  added_at: string
}

export interface Cart {
  id: number
  items: CartItem[]
  subtotal: string
  tax_amount: string
  shipping_cost: string
  discount_amount: string
  total: string
  item_count: number
  created_at: string
  updated_at: string
}

export interface MastercardCard {
  id: number
  cardholder_name: string
  last_four: string
  masked_number: string
  card_type: string
  expiry_month: number
  expiry_year: number
  is_expired: boolean
  is_default: boolean
  is_active: boolean
  created_at: string
}

export interface PaymentTransaction {
  id: number
  transaction_id: string
  mastercard_transaction_id: string | null
  transaction_type: string
  status: string
  amount: string
  currency: string
  total_amount: string
  processing_fee: string
  card_last_four: string
  card_type: string
  card_masked: string | null
  auth_code: string
  response_code: string
  response_message: string
  initiated_at: string
  processed_at: string | null
  settled_at: string | null
}

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'payment_processing'
  | 'payment_received'
  | 'payment_failed'
  | 'confirmed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'disputed'

export interface OrderItem {
  product: {
    id: number
    name: string
    slug: string
    default_image?: string | null
  }
  variant?: { name: string; value: string } | null
  quantity: number
  unit_price: string
  total: string
}

export interface Order {
  id: number
  order_number: string
  user_email: string
  user_phone: string
  items: OrderItem[]
  item_count: number
  shipping_address: number | null
  shipping_address_detail: UserAddress | null
  billing_address: number | null
  billing_address_detail: UserAddress | null
  subtotal: string
  tax_amount: string
  shipping_cost: string
  discount_amount: string
  total: string
  shipping_method: 'standard' | 'express' | 'overnight'
  tracking_number: string
  status: OrderStatus
  payment_status: string
  payment_method: string
  payment_transaction: PaymentTransaction | null
  customer_notes: string
  created_at: string
  paid_at: string | null
  estimated_delivery: string | null
}

// ---------------------------------------------------------------------------
// Request payloads
// ---------------------------------------------------------------------------

export interface RegisterPayload {
  email: string
  first_name: string
  last_name: string
  phone_number?: string
  password: string
  password2: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface AddressPayload {
  full_name: string
  phone_number: string
  street: string
  city: string
  state: string
  country: string
  zip_code: string
  is_default?: boolean
  address_type?: AddressType
}

export interface CheckoutPayload {
  shipping_address_id: number
  billing_address_id?: number | null
  shipping_method: 'standard' | 'express' | 'overnight'
  payment_method: 'mastercard'
  card_id?: number
  save_card?: boolean
  card_number?: string
  cardholder_name?: string
  expiry_month?: number
  expiry_year?: number
  cvv?: string
  customer_notes?: string
}

export interface CheckoutResponse {
  success?: boolean
  message?: string
  order?: Order
  transaction?: PaymentTransaction
}
