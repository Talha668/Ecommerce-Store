import { Link } from 'react-router-dom'

/** Footer — converted from templates/base.html. */
export function Footer() {
  return (
    <footer className="bg-gray-800 text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-lg font-semibold mb-4">MasterShop</h3>
            <p className="text-gray-300 text-sm">
              Your trusted e-commerce platform for quality products and secure
              Mastercard payments.
            </p>
            <div className="flex space-x-4 mt-4">
              <a href="#" className="text-gray-300 hover:text-white" aria-label="Facebook">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" className="text-gray-300 hover:text-white" aria-label="Twitter">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className="text-gray-300 hover:text-white" aria-label="Instagram">
                <i className="fab fa-instagram"></i>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/products" className="text-gray-300 hover:text-white text-sm">
                  Products
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-gray-300 hover:text-white text-sm">
                  Categories
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-300 hover:text-white text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-300 hover:text-white text-sm">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Customer Service</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-white text-sm">FAQs</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white text-sm">Shipping Policy</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white text-sm">Returns</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white text-sm">Privacy Policy</a></li>
            </ul>
          </div>

          {/* Payment Methods */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Payment Methods</h3>
            <div className="flex space-x-2">
              <div className="bg-white p-2 rounded">
                <i className="fab fa-cc-mastercard text-2xl text-gray-800"></i>
              </div>
              <div className="bg-white p-2 rounded">
                <i className="fab fa-cc-visa text-2xl text-gray-800"></i>
              </div>
              <div className="bg-white p-2 rounded">
                <i className="fab fa-cc-amex text-2xl text-gray-800"></i>
              </div>
            </div>
            <p className="text-gray-300 text-sm mt-4">
              <i className="fas fa-lock mr-1"></i> Secure payments
            </p>
          </div>
        </div>

        <hr className="border-gray-700 my-8" />

        <div className="text-center text-gray-400 text-sm">
          &copy; {new Date().getFullYear()} MasterShop. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
