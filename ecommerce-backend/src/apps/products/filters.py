import django_filters
from .models import Product
from django.db.models import Q, F




class ProductFilter(django_filters.FilterSet):
    """Advanced filtering for products"""
    
    # Price range
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr='lte')
    
    # Categories
    category = django_filters.CharFilter(field_name="category__slug")
    category_id = django_filters.NumberFilter(field_name="category__id")
    
    # Brands
    brand = django_filters.CharFilter(field_name="brand__slug")
    brand_id = django_filters.NumberFilter(field_name="brand__id")
    
    # Stock status
    in_stock = django_filters.BooleanFilter(method='filter_in_stock')
    
    # On sale
    on_sale = django_filters.BooleanFilter(method='filter_on_sale')
    
    # Rating
    min_rating = django_filters.NumberFilter(field_name="average_rating", lookup_expr='gte')
    
    # Tags
    tags = django_filters.CharFilter(method='filter_tags')
    
    # Search in name and description
    search = django_filters.CharFilter(method='filter_search')
    
    class Meta:
        model = Product
        fields = [
            'is_active', 'is_featured', 'is_digital',
            'min_price', 'max_price', 'category', 'brand',
            'in_stock', 'on_sale', 'min_rating'
        ]
    
    def filter_in_stock(self, queryset, name, value):
        if value:
            return queryset.filter(Q(stock__gt=0) | Q(allow_backorders=True))
        return queryset.filter(stock=0, allow_backorders=False)
    
    def filter_on_sale(self, queryset, name, value):
        if value:
            return queryset.filter(
                compare_at_price__isnull=False,
                compare_at_price__gt=F('price')
            )
        return queryset
    
    def filter_tags(self, queryset, name, value):
        if value:
            tags = value.split(',')
            for tag in tags:
                queryset = queryset.filter(tags__contains=[tag.strip()])
        return queryset
    
    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(name__icontains=value) |
            Q(description__icontains=value) |
            Q(short_description__icontains=value) |
            Q(sku__icontains=value) |
            Q(tags__icontains=value)
        )