import { useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { productsApi } from '../../api/products'
import { Pagination } from '../../components/ui/Pagination'
import { EmptyState, Spinner } from '../../components/ui/ui'
import { ProductCard } from '../../components/product/ProductCard'

const SORT_OPTIONS: { value: string; label: string; ordering: string }[] = [
  { value: 'newest', label: 'Newest', ordering: '-created_at' },
  { value: 'price_low', label: 'Price: Low to High', ordering: 'price' },
  { value: 'price_high', label: 'Price: High to Low', ordering: '-price' },
  { value: 'rating', label: 'Highest Rated', ordering: '-average_rating' },
  { value: 'bestselling', label: 'Best Selling', ordering: '-sales_count' },
]

/**
 * Product catalog — converted from templates/products/list.html.
 *
 * The old template posted full page reloads via `window.location.href` on every
 * checkbox change. Now filters live in the URL query string and drive a
 * TanStack Query against GET /api/products/products/ (DjangoFilterBackend),
 * so pagination/back-button/deep-linking all work naturally.
 */
export function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [priceRange, setPriceRange] = useState(
    searchParams.get('max_price') ?? '',
  )

  const filters = useMemo(
    () => ({
      search: searchParams.get('search') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      brand: searchParams.get('brand') ?? undefined,
      min_rating: searchParams.get('min_rating')
        ? Number(searchParams.get('min_rating'))
        : undefined,
      in_stock: searchParams.get('in_stock') === 'true' || undefined,
      on_sale: searchParams.get('on_sale') === 'true' || undefined,
      max_price: searchParams.get('max_price')
        ? Number(searchParams.get('max_price'))
        : undefined,
      ordering:
        SORT_OPTIONS.find((o) => o.value === (searchParams.get('sort') ?? 'newest'))
          ?.ordering ?? '-created_at',
      page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
    }),
    [searchParams],
  )

  const products = useQuery({
    queryKey: ['products', 'list', filters],
    queryFn: () => productsApi.list(filters),
    placeholderData: keepPreviousData,
  })

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => productsApi.categories(),
    staleTime: 300_000,
  })

  const brands = useQuery({
    queryKey: ['brands'],
    queryFn: () => productsApi.brands(),
    staleTime: 300_000,
  })

  /** Update one query param and reset the page (replaces filterProducts()). */
  function setFilter(key: string, value: string | null) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
      next.delete('page')
      return next
    })
  }

  function toggleMulti(key: string, value: string, checked: boolean) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      // The DRF filterset takes a single category/brand slug — for multi-select
      // we keep the last-selected value. (Backend upgrade: support multiple.)
      if (checked) next.set(key, value)
      else if (next.get(key) === value) next.delete(key)
      next.delete('page')
      return next
    })
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams())
    setPriceRange('')
  }

  const results = products.data?.results ?? []
  const totalPages = products.data?.total_pages ?? 1
  const currentPage = products.data?.page ?? filters.page ?? 1
  const total = products.data?.total ?? 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex mb-8 text-sm">
        <Link to="/" className="text-gray-500 hover:text-blue-600">Home</Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-800 font-semibold">Products</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <div className="lg:w-1/4">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
            <h3 className="font-semibold text-lg mb-4">Filters</h3>

            {/* Categories */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">Categories</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(categories.data ?? []).map((category) => (
                  <label key={category.id} className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded text-blue-600 focus:ring-blue-500"
                      checked={searchParams.get('category') === category.slug}
                      onChange={(e) =>
                        toggleMulti('category', category.slug, e.target.checked)
                      }
                    />
                    <span className="ml-2 text-gray-600">{category.name}</span>
                    <span className="ml-auto text-xs text-gray-400">
                      ({category.product_count})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">Price Range</h4>
              <div className="space-y-2">
                <input
                  type="range"
                  min={0}
                  max={1000}
                  step={10}
                  value={priceRange || '1000'}
                  onChange={(e) => setPriceRange(e.target.value)}
                  onMouseUp={() => setFilter('max_price', priceRange === '1000' ? null : priceRange)}
                  onTouchEnd={() => setFilter('max_price', priceRange === '1000' ? null : priceRange)}
                  className="w-full"
                />
                <div className="flex justify-between text-sm">
                  <span>$0</span>
                  <span>${priceRange || '1000'}</span>
                  <span>$1000+</span>
                </div>
              </div>
            </div>

            {/* Brands */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">Brands</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(brands.data ?? []).map((brand) => (
                  <label key={brand.id} className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded text-blue-600 focus:ring-blue-500"
                      checked={searchParams.get('brand') === brand.slug}
                      onChange={(e) => toggleMulti('brand', brand.slug, e.target.checked)}
                    />
                    <span className="ml-2 text-gray-600">{brand.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">Customer Rating</h4>
              <div className="space-y-2">
                {[4, 3, 2, 1].map((rating) => (
                  <label key={rating} className="flex items-center">
                    <input
                      type="radio"
                      name="rating"
                      className="text-blue-600 focus:ring-blue-500"
                      checked={searchParams.get('min_rating') === String(rating)}
                      onChange={() => setFilter('min_rating', String(rating))}
                    />
                    <span className="ml-2 text-gray-600">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <i
                          key={i}
                          className={`${i <= rating ? 'fas' : 'far'} fa-star text-yellow-400 mr-0.5`}
                        ></i>
                      ))}
                      &nbsp;&amp; Up
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div className="mb-6">
              <h4 className="font-medium mb-2">Availability</h4>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded text-blue-600 focus:ring-blue-500"
                  checked={searchParams.get('in_stock') === 'true'}
                  onChange={(e) => setFilter('in_stock', e.target.checked ? 'true' : null)}
                />
                <span className="ml-2 text-gray-600">In Stock</span>
              </label>
            </div>

            {/* On Sale */}
            <div className="mb-6">
              <label className="flex items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <input
                  type="checkbox"
                  className="rounded text-yellow-600 focus:ring-yellow-500"
                  checked={searchParams.get('on_sale') === 'true'}
                  onChange={(e) => setFilter('on_sale', e.target.checked ? 'true' : null)}
                />
                <span className="ml-2 text-sm">
                  <span className="font-semibold text-yellow-700">On Sale</span>
                  <span className="text-gray-600 block text-xs">Discounted items</span>
                </span>
              </label>
            </div>

            <button
              onClick={clearFilters}
              className="w-full bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition text-sm"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        {/* Product Grid */}
        <div className="lg:w-3/4">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex justify-between items-center">
            <div>
              <span className="text-gray-600 text-sm">
                {products.isLoading
                  ? 'Loading…'
                  : `Showing ${results.length} of ${total} results`}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <label className="text-gray-600 text-sm">Sort by:</label>
              <select
                value={searchParams.get('sort') ?? 'newest'}
                onChange={(e) => setFilter('sort', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products */}
          {products.isLoading ? (
            <Spinner label="Loading products..." />
          ) : results.length === 0 ? (
            <EmptyState
              title="No products found"
              description="Try adjusting your filters or search criteria."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination */}
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            buildHref={(page) => {
              const next = new URLSearchParams(searchParams)
              next.set('page', String(page))
              return `/products?${next.toString()}`
            }}
          />
        </div>
      </div>
    </div>
  )
}
