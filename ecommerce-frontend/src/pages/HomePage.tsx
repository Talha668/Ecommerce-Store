import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { productsApi } from '../api/products'
import type { Category } from '../api/types'
import { ProductCard } from '../components/product/ProductCard'
import { Spinner } from '../components/ui/ui'

/** Category icons — the same icon_map from products/views.py home(). */
const CATEGORY_ICONS: Record<string, string> = {
  Electronics: 'mobile-screen-button',
  Clothing: 'shirt',
  'Home & Living': 'couch',
  'Beauty & Personal Care': 'spa',
  'Sports & Outdoors': 'dumbbell',
  Books: 'book',
  'Toys & Games': 'puzzle-piece',
}

/**
 * HomePage — converted from templates/home.html.
 * Data comes from the DRF endpoints instead of the (broken) template view:
 *   featured products → GET /api/products/products/featured/
 *   categories        → GET /api/products/categories/
 */
export function HomePage() {
  const featured = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => productsApi.featured(),
    staleTime: 60_000,
  })

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => productsApi.categories(),
    staleTime: 300_000,
  })

  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-4">
                <i className="fab fa-cc-mastercard text-4xl"></i>
                <span className="text-2xl font-bold">Mastercard</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                Shop Smarter with <br />
                <span className="text-yellow-300">Exclusive Mastercard</span> Deals
              </h1>
              <p className="text-lg text-blue-100">
                Enjoy 10% extra discount on all purchases made with your Mastercard.
                Plus free shipping on orders over $50.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/products"
                  className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
                >
                  Shop Now
                </Link>
                <a
                  href="#categories"
                  className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition"
                >
                  Browse Categories
                </a>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center gap-6 pt-8">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-shield-halved text-2xl"></i>
                  <span className="text-sm">Secure Payment</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-truck text-2xl"></i>
                  <span className="text-sm">Free Shipping</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-rotate-left text-2xl"></i>
                  <span className="text-sm">30-Day Returns</span>
                </div>
              </div>
            </div>

            {/* Right Content - Hero Image */}
            <div className="relative">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8">
                <img
                  src="https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&w=600"
                  alt="Shopping with Mastercard"
                  className="rounded-lg shadow-2xl w-full h-auto"
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://placehold.co/600x400/1e40af/white?text=MasterShop+Store'
                  }}
                />
              </div>
              <div className="absolute -top-4 -right-4 bg-yellow-400 rounded-full p-4 shadow-lg">
                <i className="fas fa-tag text-blue-800 text-xl"></i>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-red-500 rounded-full p-4 shadow-lg">
                <i className="fas fa-percent text-white text-xl"></i>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mastercard Exclusive Banner */}
      <section className="bg-yellow-50 border-b border-yellow-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="bg-yellow-400 p-3 rounded-full">
                <i className="fab fa-cc-mastercard text-3xl text-white"></i>
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-800">Mastercard Exclusive Offer</h3>
                <p className="text-gray-600">
                  Get an extra 10% off when you pay with your Mastercard. Use code:{' '}
                  <span className="font-mono bg-yellow-200 px-2 py-1 rounded">MASTER10</span>
                </p>
              </div>
            </div>
            <Link
              to="/products?on_sale=true"
              className="bg-yellow-400 text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition"
            >
              Shop Exclusive Deals
            </Link>
          </div>
        </div>
      </section>

      {/* Shop by Categories */}
      <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Shop by Categories</h2>

        {categories.isLoading ? (
          <Spinner label="Loading categories..." />
        ) : categories.data && categories.data.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.data.slice(0, 6).map((category) => (
              <CategoryTile key={category.id} category={category} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <CategoryTile category={{ id: 0, name: 'Electronics', slug: 'electronics' } as Category} />
            <CategoryTile category={{ id: 0, name: 'Clothing', slug: 'clothing' } as Category} />
            <CategoryTile category={{ id: 0, name: 'Home & Living', slug: 'home-living' } as Category} />
            <CategoryTile category={{ id: 0, name: 'Beauty & Personal Care', slug: 'beauty' } as Category} />
            <CategoryTile category={{ id: 0, name: 'Sports & Outdoors', slug: 'sports' } as Category} />
            <CategoryTile category={{ id: 0, name: 'Books', slug: 'books' } as Category} />
          </div>
        )}
      </section>

      {/* Featured Products */}
      <section className="bg-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Featured Products</h2>
            <Link to="/products" className="text-blue-600 hover:text-blue-700 font-semibold">
              View All <i className="fas fa-arrow-right ml-2"></i>
            </Link>
          </div>

          {featured.isLoading ? (
            <Spinner label="Loading featured products..." />
          ) : featured.data && featured.data.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured.data.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <i className="fas fa-box-open text-5xl mb-4"></i>
              <p>
                No featured products yet. Add products in the Django admin and mark
                them as featured.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Special Offers */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6">
            <i className="fas fa-truck text-4xl mb-4"></i>
            <h3 className="text-xl font-bold mb-2">Free Shipping</h3>
            <p className="text-blue-100">On all orders over $50. Fast and reliable delivery.</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-gray-800 rounded-lg p-6">
            <i className="fab fa-cc-mastercard text-4xl mb-4"></i>
            <h3 className="text-xl font-bold mb-2">Mastercard Exclusive</h3>
            <p className="text-gray-700">Extra 10% off with code MASTER10</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6">
            <i className="fas fa-headset text-4xl mb-4"></i>
            <h3 className="text-xl font-bold mb-2">24/7 Support</h3>
            <p className="text-purple-100">Our customer service team is always here to help.</p>
          </div>
        </div>
      </section>
    </>
  )
}

function CategoryTile({ category }: { category: Category }) {
  const icon = CATEGORY_ICONS[category.name] ?? 'tag'
  return (
    <Link
      to={`/products?category=${category.slug}`}
      className="group bg-white rounded-lg shadow-md hover:shadow-xl transition p-6 text-center"
    >
      <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center group-hover:scale-110 transition">
        {category.image ? (
          <img
            src={category.image}
            alt={category.name}
            className="w-12 h-12 object-contain"
          />
        ) : (
          <i className={`fas fa-${icon} text-3xl text-blue-600`}></i>
        )}
      </div>
      <h3 className="font-semibold text-gray-800 group-hover:text-blue-600">
        {category.name}
      </h3>
      {category.product_count > 0 && (
        <p className="text-xs text-gray-500 mt-1">{category.product_count}+ items</p>
      )}
    </Link>
  )
}
