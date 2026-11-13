/**
 * Search results — in the old Django templates this was a separate
 * search_results.html with a simplified card. In the SPA the navbar search
 * routes to /products?search=..., which renders the full ProductListPage
 * (DRF ?search= filter). Kept as a re-export so the route structure stays
 * readable and the old URL /search/?q= still works.
 */
export { ProductListPage as SearchResultsPage } from './products/ProductListPage'
