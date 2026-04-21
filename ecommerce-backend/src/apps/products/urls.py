from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views





router = DefaultRouter()
router.register(r'products', views.ProductViewSet, basename='product')
# router.register(r'categories', views.CategoryListView, basename='category')
# router.register(r'brands', views.BrandListView, basename='brand')
router.register(r'reviews', views.ReviewViewSet, basename='review')
router.register(r'wishlists', views.WishlistViewSet, basename='wishlist')

# Nested routers for product images and variants
product_router = DefaultRouter()
product_router.register(r'images', views.ProductImageViewSet, basename='product-images')
product_router.register(r'variants', views.ProductVariantViewSet, basename='product-variants')

urlpatterns = [
    # Include main router
    path('', include(router.urls)),

    # Search product
    path('search/', views.ProductSearchView.as_view(), name='product-search'),

    # Category
    path('categories/', views.CategoryListView.as_view(), name='categories'),
    path('category/<slug:slug>/', views.CategoryDetailView.as_view(), name='category-detail'),
    
    # Nested routes for products
    path('products/<slug:slug>/', include(product_router.urls)),
    
    # Additional product endpoints
    path('products/<slug:slug>/add-review/', 
         views.ProductViewSet.as_view({'post': 'add_review'}), 
         name='product-add-review'),
    path('products/<slug:slug>/add-to-wishlist/', 
         views.ProductViewSet.as_view({'post': 'add_to_wishlist'}), 
         name='product-add-to-wishlist'),
    
    # Category detail (needs to be after nested routes)
    path('categories/<int:pk>/', 
         views.CategoryDetailView.as_view(), 
         name='category-detail'),
    
    # Brand detail
    path('brands/<int:pk>/', 
         views.BrandDetailView.as_view(), 
         name='brand-detail'),     
]