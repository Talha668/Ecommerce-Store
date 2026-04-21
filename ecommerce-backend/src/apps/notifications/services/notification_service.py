from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
import logging
from ..models import Notification, NotificationType, NotificationPreference
from .email_service import EmailService

logger = logging.getLogger(__name__)



class NotificationService:
    """Main notification service to handle all notifications"""
    
    @staticmethod
    def create_notification(user, notification_type_code, subject, content, 
                           related_object=None, channel='email', priority='medium', 
                           scheduled_at=None, template_data=None):
        """
        Create a new notification
        """
        try:
            # Get notification type
            notification_type = NotificationType.objects.get(
                code=notification_type_code,
                is_active=True
            )
            
            # Check user preferences
            if user and not NotificationService.check_user_preferences(user, notification_type_code, channel):
                logger.info(f"User {user.email} has disabled {notification_type_code} notifications")
                return None
            
            # Create notification
            notification = Notification(
                user=user,
                recipient_email=user.email if user else None,
                notification_type=notification_type,
                channel=channel,
                priority=priority,
                subject=subject,
                content=content,
                template_data=template_data or {},
                scheduled_at=scheduled_at or timezone.now()
            )
            
            # Add related object if provided
            if related_object:
                notification.content_type = ContentType.objects.get_for_model(related_object)
                notification.object_id = related_object.pk
            
            notification.save()
            
            # Process immediately if not scheduled for later
            if not scheduled_at or scheduled_at <= timezone.now():
                NotificationService.process_notification(notification)
            
            return notification
            
        except NotificationType.DoesNotExist:
            logger.error(f"Notification type {notification_type_code} not found")
            return None
        except Exception as e:
            logger.error(f"Error creating notification: {str(e)}")
            return None
    
    @staticmethod
    def process_notification(notification):
        """Process and send a notification"""
        try:
            notification.status = 'processing'
            notification.save()
            
            if notification.channel == 'email':
                success, message = EmailService.send_email(
                    recipient_email=notification.recipient_email,
                    subject=notification.subject,
                    template_name=notification.notification_type.email_template,
                    context=notification.template_data,
                    notification=notification
                )
                
                if success:
                    logger.info(f"Notification {notification.notification_id} sent successfully")
                else:
                    logger.error(f"Failed to send notification {notification.notification_id}: {message}")
                    
            # Add other channels (SMS, push) here
            
        except Exception as e:
            notification.mark_as_failed(str(e))
            logger.error(f"Error processing notification {notification.notification_id}: {str(e)}")
    
    @staticmethod
    def check_user_preferences(user, notification_type_code, channel):
        """Check if user wants to receive this type of notification"""
        try:
            preferences = user.notification_preferences
        except NotificationPreference.DoesNotExist:
            # Create default preferences
            preferences = NotificationPreference.objects.create(user=user)
        
        # Check based on notification type
        if notification_type_code == 'order_confirmation':
            if channel == 'email':
                return preferences.order_confirmation_email
            elif channel == 'sms':
                return preferences.order_confirmation_sms and preferences.sms_enabled
                
        elif notification_type_code == 'shipping_update':
            if channel == 'email':
                return preferences.shipping_update_email
            elif channel == 'sms':
                return preferences.shipping_update_sms and preferences.sms_enabled
                
        elif notification_type_code == 'promotional':
            if channel == 'email':
                return preferences.promotional_email
                
        elif notification_type_code == 'newsletter':
            if channel == 'email':
                return preferences.newsletter_email
        
        return True  # Default to True for other types
    
    @staticmethod
    def send_order_notifications(order):
        """Send all notifications related to an order"""
        user = order.user
        if not user:
            return
        
        # Order confirmation
        NotificationService.create_notification(
            user=user,
            notification_type_code='order_confirmation',
            subject=f"Order Confirmation #{order.order_number}",
            content=f"Thank you for your order! Your order #{order.order_number} has been confirmed.",
            related_object=order,
            template_data={
                'order_number': order.order_number,
                'order_total': str(order.total),
                'order_items': order.items,
                'shipping_address': order.shipping_address,
            }
        )
        
        # Payment confirmation if paid
        if order.is_paid:
            NotificationService.create_notification(
                user=user,
                notification_type_code='payment_confirmation',
                subject=f"Payment Confirmed for Order #{order.order_number}",
                content=f"Your payment of ${order.total} for order #{order.order_number} has been confirmed.",
                related_object=order
            )
    
    @staticmethod
    def send_shipping_notification(order):
        """Send shipping update notification"""
        if order.user:
            NotificationService.create_notification(
                user=order.user,
                notification_type_code='shipping_update',
                subject=f"Your Order #{order.order_number} Has Shipped!",
                content=f"Your order has been shipped via {order.shipping_carrier}. Track it with #{order.tracking_number}",
                related_object=order,
                template_data={
                    'order_number': order.order_number,
                    'tracking_number': order.tracking_number,
                    'tracking_url': order.tracking_url,
                    'carrier': order.shipping_carrier,
                    'estimated_delivery': str(order.estimated_delivery),
                }
            )