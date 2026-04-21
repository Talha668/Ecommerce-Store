from .models import Cart


def cart_item_count(request):
    """Context processor to add cart item count to all templates"""
    if request.user.is_authenticated:
        cart = Cart.objects.filter(user=request.user).first()
        if cart:
            return {'cart_item_count': cart.item_count}
    return {'cart_item_count': 0}