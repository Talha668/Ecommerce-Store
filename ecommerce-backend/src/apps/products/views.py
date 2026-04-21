from rest_framework import generics, status, filters, viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Avg, F
from django.shortcuts import get_object_or_404
from .models import (
    Category, Brand, Product, ProductImage, 
    ProductVariant, Review, Wishlist
)
from .serializers import (
    CategorySerializer, CategoryDetailSerializer, BrandSerializer,
    ProductListSerializer, ProductDetailSerializer, ProductCreateUpdateSerializer,
    ProductImageSerializer, ProductVariantSerializer,
    ReviewSerializer, ReviewCreateSerializer,
    WishlistSerializer, WishlistCreateSerializer
)
from .permissions import IsAdminOrReadOnly, IsReviewOwnerOrAdmin
from .filters import ProductFilter
from .pagination import ProductPagination
from django.views.generic import ListView, DetailView, TemplateView
from django.shortcuts import render









class CategoryListView(generics.ListCreateAPIView):
    """List and create categories"""
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'order', 'created_at']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Only return top-level categories if parent is not specified
        parent = self.request.query_params.get('parent')
        if parent == 'null' or parent is None:
            queryset = queryset.filter(parent__isnull=True)
        elif parent:
            queryset = queryset.filter(parent_id=parent)
        return queryset


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a category"""
    queryset = Category.objects.all()
    serializer_class = CategoryDetailSerializer
    permission_classes = [IsAdminOrReadOnly]


class BrandListView(generics.ListCreateAPIView):
    """List and create brands"""
    queryset = Brand.objects.filter(is_active=True)
    serializer_class = BrandSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']


class BrandDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a brand"""
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [IsAdminOrReadOnly]


class ProductViewSet(viewsets.ModelViewSet):
    """ViewSet for Product CRUD operations"""
    queryset = Product.objects.filter(is_active=True)
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = ProductPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'sku', 'description', 'short_description', 'tags']
    ordering_fields = ['price', 'created_at', 'sales_count', 'average_rating', 'name']
    lookup_field = 'slug'
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ProductCreateUpdateSerializer
        return ProductDetailSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Optimize with select_related and prefetch_related
        if self.action == 'list':
            queryset = queryset.select_related('category', 'brand')
            queryset = queryset.prefetch_related('images', 'variants')
        elif self.action == 'retrieve':
            # Increment view count
            product = self.get_object()
            product.views_count = F('views_count') + 1
            product.save(update_fields=['views_count'])
            product.refresh_from_db()
            queryset = queryset.select_related('category', 'brand')
            queryset = queryset.prefetch_related('images', 'variants', 'reviews')
        
        return queryset
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def featured(self, request):
        """Get featured products"""
        featured = self.get_queryset().filter(is_featured=True)[:10]
        serializer = ProductListSerializer(featured, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def best_selling(self, request):
        """Get best selling products"""
        best_selling = self.get_queryset().order_by('-sales_count')[:10]
        serializer = ProductListSerializer(best_selling, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def new_arrivals(self, request):
        """Get new arrivals"""
        new_arrivals = self.get_queryset().order_by('-created_at')[:10]
        serializer = ProductListSerializer(new_arrivals, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def on_sale(self, request):
        """Get products on sale"""
        on_sale = self.get_queryset().filter(
            compare_at_price__isnull=False,
            compare_at_price__gt=F('price')
        )[:10]
        serializer = ProductListSerializer(on_sale, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def add_review(self, request, slug=None):
        """Add a review to a product"""
        product = self.get_object()
        serializer = ReviewCreateSerializer(
            data=request.data,
            context={'request': request, 'product': product}
        )
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        
        # Update product rating
        product.review_count = product.reviews.filter(is_approved=True).count()
        product.average_rating = product.reviews.filter(
            is_approved=True
        ).aggregate(Avg('rating'))['rating__avg'] or 0
        product.save()
        
        return Response(
            ReviewSerializer(review, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def add_to_wishlist(self, request, slug=None):
        """Add product to user's wishlist"""
        product = self.get_object()
        wishlist_name = request.data.get('wishlist_name', 'My Wishlist')
        
        wishlist, created = Wishlist.objects.get_or_create(
            user=request.user,
            name=wishlist_name
        )
        wishlist.products.add(product)
        
        return Response({
            'message': f'Product added to {wishlist.name}',
            'wishlist': WishlistSerializer(wishlist, context={'request': request}).data
        }, status=status.HTTP_200_OK)


class ProductImageViewSet(viewsets.ModelViewSet):
    """ViewSet for Product Image CRUD operations"""
    serializer_class = ProductImageSerializer
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        return ProductImage.objects.filter(product_id=self.kwargs['product_pk'])
    
    def perform_create(self, serializer):
        product = get_object_or_404(Product, pk=self.kwargs['product_pk'])
        serializer.save(product=product)


class ProductVariantViewSet(viewsets.ModelViewSet):
    """ViewSet for Product Variant CRUD operations"""
    serializer_class = ProductVariantSerializer
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        return ProductVariant.objects.filter(product_id=self.kwargs['product_pk'])
    
    def perform_create(self, serializer):
        product = get_object_or_404(Product, pk=self.kwargs['product_pk'])
        serializer.save(product=product)


class ReviewViewSet(viewsets.ModelViewSet):
    """ViewSet for Review CRUD operations"""
    serializer_class = ReviewSerializer
    permission_classes = [IsReviewOwnerOrAdmin]
    
    def get_queryset(self):
        if self.kwargs.get('product_pk'):
            return Review.objects.filter(product_id=self.kwargs['product_pk'])
        return Review.objects.all()
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class WishlistViewSet(viewsets.ModelViewSet):
    """ViewSet for Wishlist CRUD operations"""
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return WishlistCreateSerializer
        return WishlistSerializer
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def add_product(self, request, pk=None):
        """Add product to wishlist"""
        wishlist = self.get_object()
        product_id = request.data.get('product_id')
        
        if not product_id:
            return Response(
                {'error': 'product_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            product = Product.objects.get(id=product_id, is_active=True)
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        wishlist.products.add(product)
        return Response({'message': 'Product added to wishlist'})
    
    @action(detail=True, methods=['post'])
    def remove_product(self, request, pk=None):
        """Remove product from wishlist"""
        wishlist = self.get_object()
        product_id = request.data.get('product_id')
        
        if not product_id:
            return Response(
                {'error': 'product_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        wishlist.products.remove(product_id)
        return Response({'message': 'Product removed from wishlist'})


class ProductListView(ListView):
    model = Product
    template_name = 'products/list.html'
    context_object_name = 'products'
    paginate_by = 12
    
    def get_queryset(self):
        queryset = Product.objects.filter(is_active=True)
        
        # Apply filters
        category_slug = self.request.GET.get('category')
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)
        
        brand_slug = self.request.GET.get('brand')
        if brand_slug:
            queryset = queryset.filter(brand__slug=brand_slug)
        
        min_price = self.request.GET.get('min_price')
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        
        max_price = self.request.GET.get('max_price')
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        
        in_stock = self.request.GET.get('in_stock')
        if in_stock:
            queryset = queryset.filter(stock__gt=0)
        
        # Search
        q = self.request.GET.get('q')
        if q:
            queryset = queryset.filter(name__icontains=q) | queryset.filter(description__icontains=q)
        
        # Sorting
        sort = self.request.GET.get('sort', 'newest')
        if sort == 'price_low':
            queryset = queryset.order_by('price')
        elif sort == 'price_high':
            queryset = queryset.order_by('-price')
        elif sort == 'rating':
            queryset = queryset.order_by('-average_rating')
        elif sort == 'bestselling':
            queryset = queryset.order_by('-sales_count')
        else:
            queryset = queryset.order_by('-created_at')
        
        return queryset
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['categories'] = Category.objects.filter(is_active=True)
        context['brands'] = Brand.objects.filter(is_active=True)
        return context


class ProductDetailView(DetailView):
    model = Product
    template_name = 'products/detail.html'
    context_object_name = 'product'
    slug_field = 'slug'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        product = self.get_object()
        
        # Increment view count
        product.views_count += 1
        product.save(update_fields=['views_count'])
        
        # Related products
        context['related_products'] = Product.objects.filter(
            category=product.category,
            is_active=True
        ).exclude(id=product.id)[:4]
        
        return context
    

class ProductSearchView(ListView):
    model = Product
    template_name = 'products/search_results.html'
    context_object_name = 'product'

    def get_queryset(self):
        query = self.request.GET.get('q', '')
        if query:
            return Product.objects.filter(name__icontains=query)
        return Product.objects.none()
    

def home(request):
    # Get featured products
    featured_products = Product.objects.filter(
        is_active=True,
        is_featured=True
    ).select_related('brand', 'category').prefetch_related('images')[:8]

    # Get categories with product count for "Shop by Categories"
    from django.db.models import Count
    featured_categories = Category.objects.filter(
        is_active=True,
        parent=None   # Only main categories
    ).annotate(
        product_count=Count('products')
    ).order_by('-product-count')[:6]

    # Add icon mappint for categories
    icon_map = {
        'Electronics': 'mobile-alt',
        'Clothing': 'tshirt',
        'Home & Living': 'couch',
        'Beauty & Personal care': 'spa',
        'Sports & Outdoors': 'dumbell',
        'Books': 'book',
        'Toys & Games': 'puzzle-pieces',
    }

    for category in featured_categories:
        category.icon = icon_map.get(category.name, 'tag')

    context = {
        'featured_products': featured_products,
        'featured_categories': featured_categories,
        'cart_item_count': request.session.get('cart_itrm_count', 0),       # Adjust it according to your cart implementation
    }    

    return render(request, home.html, context)