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


class CategoryListView(generics.ListCreateAPIView):
    """List and create categories"""
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'order', 'created_at']
    pagination_class = None  # plain array — frontend extractResults() accepts both

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
    pagination_class = None  # plain array — frontend extractResults() accepts both


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
    pagination_class = None  # plain array — frontend accepts both shapes

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
