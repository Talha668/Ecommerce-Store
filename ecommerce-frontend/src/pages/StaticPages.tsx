import { Link } from 'react-router-dom'

/** Static "About Us" page (the old pages/about.html TemplateView). */
export function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">About MasterShop</h1>
      <div className="bg-white rounded-lg shadow-md p-8 space-y-4 text-gray-600">
        <p>
          MasterShop is your trusted e-commerce platform for quality products and
          secure Mastercard payments. We hand-pick electronics, clothing, home goods
          and more from brands you trust.
        </p>
        <p>
          Every Mastercard payment earns you exclusive deals and cashback offers,
          and every order ships fast with tracked delivery.
        </p>
        <Link to="/products" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg">
          Shop Now
        </Link>
      </div>
    </div>
  )
}

/** Static "Contact" page (the old pages/contact.html TemplateView). */
export function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Contact Us</h1>
      <div className="bg-white rounded-lg shadow-md p-8 space-y-3 text-gray-600">
        <p>
          <i className="fas fa-envelope text-blue-600 mr-2"></i>
          support@mastershop.com
        </p>
        <p>
          <i className="fas fa-phone text-blue-600 mr-2"></i>
          +1 (555) 123-4567 — 24/7 support
        </p>
        <p>
          <i className="fas fa-clock text-blue-600 mr-2"></i>
          We respond to all emails within 24 hours.
        </p>
      </div>
    </div>
  )
}
