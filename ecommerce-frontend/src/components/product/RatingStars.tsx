/** Star rating display — replaces the Django template star loop. */
export function RatingStars({
  rating,
  count,
  size = 'sm',
}: {
  rating: number | string
  count?: number
  size?: 'sm' | 'md'
}) {
  const value = typeof rating === 'string' ? parseFloat(rating) : rating
  const rounded = Math.round(Number.isNaN(value) ? 0 : value)
  const textSize = size === 'sm' ? 'text-sm' : 'text-base'

  return (
    <div className="flex items-center">
      <div className={`flex text-yellow-400 ${textSize}`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <i
            key={i}
            className={`${i <= rounded ? 'fas' : 'far'} fa-star ${size === 'sm' ? 'text-sm' : ''}`}
          ></i>
        ))}
      </div>
      {count !== undefined && (
        <span className={`text-gray-500 ml-2 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          ({count})
        </span>
      )}
    </div>
  )
}
