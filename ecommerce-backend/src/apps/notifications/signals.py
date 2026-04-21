from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from apps.orders.models import Order
from apps.users.models import User
from .services.notification_service import NotificationService
from .services.email_service import EmailService


User = get_user_model()

@receiver(post_save, sender=User)
def send_welcome_notifcation(sender, instance, created, **kwargs):
    """Send welcome email when a new user registers"""
    if created:
        # Send welcome email
        EmailService.send_welcome_email(instance)

        # Create welcome notification
        NotificationService.create_notification(
            user=instance,
            notification_type_code='welcome',
            subject='Welcome to MasterShop!',
            content='Thankyou for joining MasterShop. Start shopping now!',
            template_data={
                'user_name': instance.first_name or instance.email,
            }
        )


@receiver(post_save, sender=Order)
def send_order_notification(sender, instance, created, **kwargs):
    """Send notification when order status changes"""
    if created:
        # New order created
        NotificationService.send_order_notifications(instance)

    else:
        # check if status changed
        try:
            old_instsance = Order.objects.get(pk=instance.pk)
            if old_instsance.status != instance.status:
                # Order status changed
                if instance.status == 'shipped':
                    NotificationService.send_order_notifications(instance)
                elif instance.status == 'delivered':
                    NotificationService.create_notification(
                        user=instance.user,
                        notification_type_code='order_delivered',
                        subject=f'Order #{instance.order_number} Delivered',
                        content='Your order has been delivered. Enjoy your purchase!',
                        related_object=instance
                    )
                elif instance.status == 'cancelled':
                    NotificationService.create_notification(
                        user=instance.user,
                        notification_type_code='order_cancelled',
                        subject=f'Order #{instance.order_number} Cancelled',
                        content='Your order has been cancelled.',
                        related_object=instance
                    )       
        except Order.DoesNotExist:
            pass


@receiver(pre_save, sender=Order)
def track_order_status_change(sender, instance, **kwargs):
    """Track order status change for notifications""" 
    if instance.pk:
        try:
            old_instance =  Order.objects.get(pk=instance.pk)
            if old_instance.payment_status != instance.payment_status:
                if instance.payment_status == 'paid':
                    # Payment successfull
                    NotificationService.create_notification(
                        user=instance.user,
                        notification_type_code='payment_success',
                        subject=f'Payment confirmed for order #{instance.prder_number}',
                        content=f'Your payment of ${instance.total} has been confirmed.',
                        related_object=instance
                    )        
        except Order.DoesNotExist:
            pass                            