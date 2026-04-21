from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.conf import settings
from django.utils import timezone
import uuid





class NotificationType(models.Model):
    """types of notification available in the system"""
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=50, unique=True)   # e.g order_conforamtion, password_reset etc
    description = models.TextField(blank=True)

    # Template configuration
    email_template = models.CharField(max_length=200, blank=True)
    sms_template = models.CharField(max_length=200, blank=True)
    push_template = models.CharField(max_length=200, blank=True)

    # Channels
    email_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=True)
    push_enabled = models.BooleanField(default=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

            
class Notification(models.Model):
    """Individual notifications sent to user"""

    CHANNEL_CHOICES = (
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('push', 'Push Notification'),
    )

    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
        ('opened', 'Opened'),
        ('clicked', 'Clicked'),
    )

    PIORITY_CHOICES = (
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    )

    # Uniuque identifier
    notification_id = models.CharField(max_length=100, unique=True, blank=True)

    # Receipt
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='notification')
    receipient_email = models.EmailField(blank=True)
    receipient_phone = models.CharField(max_length=20, blank=True)

    # Type and content
    notification_type = models.ForeignKey(NotificationType, on_delete=models.PROTECT)
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default='email')
    priority = models.CharField(max_length=20, choices=PIORITY_CHOICES, default='medium')

    # Content
    subject = models.CharField(max_length=200)
    content = models.TextField()
    html_content = models.TextField(blank=True)

    # Template data (JSON)
    template_data = models.JSONField(default=dict, blank=True)

    # related object (Generic FK to any model)
    content_type = models.ForeignKey(ContentType, on_delete=models.SET_NULL, null=True, blank=True)
    object_id = models.PositiveBigIntegerField(null=True, blank=True)
    related_object = GenericForeignKey('content_type', 'object_id')

    # Status tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    attempts = models.IntegerField(default=0)
    error_message = models.TextField(blank=True)
    
    # Provider info (SendGrid, Twilio, etc.)
    provider_message_id = models.CharField(max_length=200, blank=True)
    provider_response = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    clicked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['notification_id']),
            models.Index(fields=['user']),
            models.Index(fields=['status']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['scheduled_at']),
        ]
    
    def __str__(self):
        return f"{self.notification_id} - {self.subject}"
    
    def save(self, *args, **kwargs):
        if not self.notification_id:
            self.notification_id = f"NOTIF-{uuid.uuid4().hex[:12].upper()}"
        super().save(*args, **kwargs)
    
    def mark_as_sent(self, provider_message_id=None):
        """Mark notification as sent"""
        self.status = 'sent'
        self.sent_at = timezone.now()
        self.attempts += 1
        if provider_message_id:
            self.provider_message_id = provider_message_id
        self.save()
    
    def mark_as_delivered(self):
        """Mark notification as delivered"""
        self.status = 'delivered'
        self.delivered_at = timezone.now()
        self.save()
    
    def mark_as_opened(self):
        """Mark notification as opened"""
        self.status = 'opened'
        self.opened_at = timezone.now()
        self.save()
    
    def mark_as_failed(self, error_message):
        """Mark notification as failed"""
        self.status = 'failed'
        self.error_message = error_message
        self.attempts += 1
        self.save()


class EmailTemplate(models.Model):
    """Email templates for different notification types"""
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    subject = models.CharField(max_length=200)
    plain_text = models.TextField(help_text="Plain text version of the email")
    html_template = models.TextField(help_text="HTML template with variables like {{ user.name }}")
    
    # Template variables documentation
    available_variables = models.TextField(blank=True, help_text="List of available variables for this template")
    
    # For A/B testing
    is_active = models.BooleanField(default=True)
    version = models.IntegerField(default=1)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['code', '-version']
        unique_together = ['code', 'version']
    
    def __str__(self):
        return f"{self.code} v{self.version}: {self.name}"


class NotificationPreference(models.Model):
    """User preferences for notifications"""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, 
                               related_name='notification_preferences')
    
    # Email preferences
    email_enabled = models.BooleanField(default=True)
    order_confirmation_email = models.BooleanField(default=True)
    shipping_update_email = models.BooleanField(default=True)
    promotional_email = models.BooleanField(default=False)
    newsletter_email = models.BooleanField(default=False)
    
    # SMS preferences
    sms_enabled = models.BooleanField(default=False)
    order_confirmation_sms = models.BooleanField(default=False)
    shipping_update_sms = models.BooleanField(default=False)
    promotional_sms = models.BooleanField(default=False)
    
    # Push preferences
    push_enabled = models.BooleanField(default=False)
    order_confirmation_push = models.BooleanField(default=False)
    shipping_update_push = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Notification preferences for {self.user.email}"


class NotificationEvent(models.Model):
    """Track notification events (opens, clicks, etc.)"""
    notification = models.ForeignKey(Notification, on_delete=models.CASCADE, related_name='events')
    event_type = models.CharField(max_length=50, choices=[
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('opened', 'Opened'),
        ('clicked', 'Clicked'),
        ('bounced', 'Bounced'),
        ('spam', 'Marked as Spam'),
        ('unsubscribed', 'Unsubscribed'),
    ])
    
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.notification.notification_id} - {self.event_type} at {self.created_at}"