from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg
from .models import Product, Review




@receiver(post_save, sender=Review)
@receiver(post_delete, sender=Review)
def update_product_rating(sender, instance, **kwargs):
    """Update product average rating when a review is saved or deleted"""
    product = instance.product
    reviews = product.reviews.filter(is_approved=True)
    
    if reviews.exists():
        product.average_rating = reviews.aggregate(Avg('rating'))['rating__avg']
        product.review_count = reviews.count()
    else:
        product.average_rating = 0
        product.review_count = 0
    
    product.save(update_fields=['average_rating', 'review_count'])