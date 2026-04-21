from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Notification, NotificationType, EmailTemplate,
    NotificationPreference, NotificationEvent
)
from django.utils import timezone




@admin.register(NotificationType)
class NotificationTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'email_enabled', 'sms_enabled', 'push_enabled', 'is_active']
    list_filter = ['email_enabled', 'sms_enabled', 'push_enabled', 'is_active']
    search_fields = ['name', 'code', 'description']
    prepopulated_fields = {'code': ('name',)}



class NotificationEventInline(admin.TabularInline):
    model = NotificationEvent
    extra = 0
    readonly_fields = ['event_type', 'ip_address', 'user_agent', 'created_at']
    can_delete = False


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['notification_id', 'user', 'subject_preview', 'channel', 'status', 'priority', 'created_at']
    list_filter = ['status', 'channel', 'priority', 'notification_type', 'created_at']
    search_fields = ['notification_id', 'user__email', 'subject', 'recipient_email']
    readonly_fields = ['notification_id', 'created_at', 'updated_at', 'sent_at', 
                      'delivered_at', 'opened_at', 'clicked_at']
    inlines = [NotificationEventInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('notification_id', 'user', 'recipient_email', 'recipient_phone')
        }),
        ('Type & Channel', {
            'fields': ('notification_type', 'channel', 'priority')
        }),
        ('Content', {
            'fields': ('subject', 'content', 'html_content', 'template_data')
        }),
        ('Status', {
            'fields': ('status', 'attempts', 'error_message')
        }),
        ('Provider Info', {
            'fields': ('provider_message_id', 'provider_response')
        }),
        ('Related Object', {
            'fields': ('content_type', 'object_id')
        }),
        ('Timestamps', {
            'fields': ('scheduled_at', 'sent_at', 'delivered_at', 'opened_at', 
                      'clicked_at', 'created_at', 'updated_at')
        }),
    )
    
    def subject_preview(self, obj):
        return obj.subject[:50] + '...' if len(obj.subject) > 50 else obj.subject
    subject_preview.short_description = 'Subject'
    
    actions = ['resend_failed', 'mark_as_sent', 'mark_as_failed']
    
    def resend_failed(self, request, queryset):
        from .services.notification_service import NotificationService
        failed = queryset.filter(status='failed')
        for notification in failed:
            notification.status = 'pending'
            notification.attempts = 0
            notification.save()
        self.message_user(request, f"{failed.count()} notifications queued for resend.")
    resend_failed.short_description = "Resend failed notifications"
    
    def mark_as_sent(self, request, queryset):
        queryset.update(status='sent', sent_at=timezone.now())
    mark_as_sent.short_description = "Mark selected as sent"
    
    def mark_as_failed(self, request, queryset):
        queryset.update(status='failed')
    mark_as_failed.short_description = "Mark selected as failed"


@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'version', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'code', 'subject']
    prepopulated_fields = {'code': ('name',)}
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'code', 'subject', 'is_active', 'version')
        }),
        ('Content', {
            'fields': ('plain_text', 'html_template')
        }),
        ('Documentation', {
            'fields': ('available_variables',)
        }),
    )


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ['user', 'email_enabled', 'sms_enabled', 'push_enabled', 'updated_at']
    list_filter = ['email_enabled', 'sms_enabled', 'push_enabled', 
                  'promotional_email', 'newsletter_email']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']


@admin.register(NotificationEvent)
class NotificationEventAdmin(admin.ModelAdmin):
    list_display = ['notification', 'event_type', 'ip_address', 'created_at']
    list_filter = ['event_type', 'created_at']
    search_fields = ['notification__notification_id', 'notification__user__email']
    readonly_fields = ['created_at']