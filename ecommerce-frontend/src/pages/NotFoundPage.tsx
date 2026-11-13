import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/ui'

/** 404 page. */
export function NotFoundPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <EmptyState
        icon="fa-compass"
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <Link to="/" className="bg-blue-600 text-white px-6 py-2 rounded-lg">
            Back to Home
          </Link>
        }
      />
    </div>
  )
}
