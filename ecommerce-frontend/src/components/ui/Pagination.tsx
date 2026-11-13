import { Link } from 'react-router-dom'

/**
 * Pagination — matches the ProductPagination envelope:
 * { total, page, total_pages, next, previous, results }
 * Replaces the Django template ?page= links with React Router links.
 */
export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number
  totalPages: number
  /** Returns the URL for a given page number (preserves other query params). */
  buildHref: (page: number) => string
}) {
  if (totalPages <= 1) return null

  // Window of pages around the current one (same ±2 as the old template).
  const pages: number[] = []
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
    pages.push(i)
  }

  const linkClass =
    'px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm'

  return (
    <div className="flex justify-center mt-8">
      <div className="flex space-x-2">
        {page > 1 && (
          <Link to={buildHref(page - 1)} className={linkClass}>
            Previous
          </Link>
        )}

        {pages[0] > 1 && (
          <>
            <Link to={buildHref(1)} className={linkClass}>
              1
            </Link>
            {pages[0] > 2 && <span className="px-2 py-2 text-gray-400">…</span>}
          </>
        )}

        {pages.map((i) =>
          i === page ? (
            <span
              key={i}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
            >
              {i}
            </span>
          ) : (
            <Link key={i} to={buildHref(i)} className={linkClass}>
              {i}
            </Link>
          ),
        )}

        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && (
              <span className="px-2 py-2 text-gray-400">…</span>
            )}
            <Link to={buildHref(totalPages)} className={linkClass}>
              {totalPages}
            </Link>
          </>
        )}

        {page < totalPages && (
          <Link to={buildHref(page + 1)} className={linkClass}>
            Next
          </Link>
        )}
      </div>
    </div>
  )
}
