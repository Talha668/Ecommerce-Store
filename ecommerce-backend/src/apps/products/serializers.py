from rest_framework import serializers
from .models import (
    Category, Brand, Product, ProductImage, 
    ProductVariant, Review, Wishlist
)
from apps.users.serializers import UserSerializer




class CategorySerializer(serializers.ModelSerializer):
    """Category serializer"""
    full_path = serializers.ReadOnlyField()
    product_count = serializers.IntegerField(source='products.count', read_only=True)
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'slug', 'parent', 'full_path', 
            'description', 'image', 'is_active', 'order',
            'product_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']


class CategoryDetailSerializer(serializers.ModelSerializer):
    """Detailed category serializer with children"""
    children = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = '__all__'
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']
    
    def get_children(self, obj):
        children = obj.children.filter(is_active=True)
        return CategorySerializer(children, many=True).data


class BrandSerializer(serializers.ModelSerializer):
    """Brand serializer"""
    product_count = serializers.IntegerField(source='products.count', read_only=True)
    
    class Meta:
        model = Brand
        fields = '__all__'
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']


class ProductImageSerializer(serializers.ModelSerializer):
    """Product image serializer"""
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'image_url', 'alt_text', 'is_default', 'order']
        read_only_fields = ['id']
    
    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class ProductVariantSerializer(serializers.ModelSerializer):
    """Product variant serializer"""
    current_price = serializers.ReadOnlyField()
    
    class Meta:
        model = ProductVariant
        fields = [
            'id', 'name', 'value', 'sku', 'price_adjustment',
            'current_price', 'stock', 'image', 'is_active'
        ]
        read_only_fields = ['id', 'sku']


class ReviewSerializer(serializers.ModelSerializer):
    """Review serializer"""
    user = UserSerializer(read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = Review
        fields = [
            'id', 'user', 'user_email', 'title', 'content', 'rating',
            'is_verified_purchase', 'helpful_votes', 'unhelpful_votes',
            'images', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'is_verified_purchase', 'helpful_votes',
            'unhelpful_votes', 'created_at', 'updated_at'
        ]


class ReviewCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating reviews"""
    
    class Meta:
        model = Review
        fields = ['title', 'content', 'rating', 'images']
    
    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        validated_data['product'] = self.context['product']
        
        # Check if user already reviewed this product
        if Review.objects.filter(
            product=validated_data['product'],
            user=validated_data['user']
        ).exists():
            raise serializers.ValidationError("You have already reviewed this product")
        
        return super().create(validated_data)


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight product serializer for list views"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    brand_name = serializers.CharField(source='brand.name', read_only=True, default=None)
    default_image = serializers.SerializerMethodField()
    discount_percentage = serializers.ReadOnlyField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'sku', 'price', 'compare_at_price',
            'discount_percentage', 'category_name', 'brand_name',
            'default_image', 'stock', 'is_active', 'average_rating',
            'review_count', 'is_featured'
        ]
    
    def get_default_image(self, obj):
        request = self.context.get('request')
        default_image = obj.images.filter(is_default=True).first()
        if not default_image:
            default_image = obj.images.first()
        
        if default_image and default_image.image and request:
            return request.build_absolute_uri(default_image.image.url)
        return None


class ProductDetailSerializer(serializers.ModelSerializer):
    """Detailed product serializer for single product view"""
    category = CategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    reviews = serializers.SerializerMethodField()
    discount_percentage = serializers.ReadOnlyField()
    is_in_stock = serializers.ReadOnlyField()
    is_low_stock = serializers.ReadOnlyField()
    
    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ['id', 'slug', 'sku', 'views_count', 'sales_count',
                           'average_rating', 'review_count', 'created_at', 'updated_at']
    
    def get_reviews(self, obj):
        reviews = obj.reviews.filter(is_approved=True)[:5]
        return ReviewSerializer(reviews, many=True, context=self.context).data


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating products"""
    
    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ['id', 'slug', 'sku', 'views_count', 'sales_count',
                           'average_rating', 'review_count', 'created_at', 'updated_at']
    
    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than 0")
        return value


class WishlistSerializer(serializers.ModelSerializer):
    """Wishlist serializer"""
    products = ProductListSerializer(many=True, read_only=True)
    product_count = serializers.IntegerField(source='products.count', read_only=True)
    
    class Meta:
        model = Wishlist
        fields = ['id', 'name', 'products', 'product_count', 'is_public', 
                 'share_token', 'created_at', 'updated_at']
        read_only_fields = ['id', 'share_token', 'created_at', 'updated_at']


class WishlistCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating wishlists"""
    
    class Meta:
        model = Wishlist
        fields = ['name', 'is_public']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)