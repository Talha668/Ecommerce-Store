from rest_framework import serializers
from .models import Notification, NotificationPreference, NotificationEvent, NotificationType




class NotificationTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationType
        fields = ['id', 'name', 'code', 'description']


class NotificationSerializer(serializers.ModelSerializer):
    type_name = serializers.CharField(source='notification_type.name', read_only=True)
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_id', 'subject', 'content',
            'type_name', 'channel', 'priority', 'status',
            'time_ago', 'created_at', 'opened_at'
        ]
        read_only_fields = fields
    
    def get_time_ago(self, obj):
        from django.utils.timesince import timesince
        return timesince(obj.created_at)


class NotificationDetailSerializer(serializers.ModelSerializer):
    notification_type = NotificationTypeSerializer(read_only=True)
    events = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['notification_id', 'created_at', 'updated_at']
    
    def get_events(self, obj):
        events = obj.events.all().order_by('-created_at')[:10]
        return NotificationEventSerializer(events, many=True).data


class NotificationEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationEvent
        fields = ['event_type', 'ip_address', 'user_agent', 'created_at']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        exclude = ['id', 'user']
    
    def validate(self, data):
        # Add any validation logic here
        return data


class NotificationMarkReadSerializer(serializers.Serializer):
    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
    all = serializers.BooleanField(default=False)
    
    def validate(self, data):
        if not data.get('all') and not data.get('notification_ids'):
            raise serializers.ValidationError(
                "Either 'all' must be true or 'notification_ids' must be provided"
            )
        return data


class CreateNotificationSerializer(serializers.Serializer):
    """Serializer for creating notifications (admin only)"""
    user_id = serializers.IntegerField(required=False)
    recipient_email = serializers.EmailField(required=False)
    notification_type_code = serializers.CharField()
    subject = serializers.CharField()
    content = serializers.CharField()
    channel = serializers.ChoiceField(choices=['email', 'sms', 'push'], default='email')
    priority = serializers.ChoiceField(choices=['high', 'medium', 'low'], default='medium')
    scheduled_at = serializers.DateTimeField(required=False, allow_null=True)
    template_data = serializers.JSONField(required=False, default=dict)
    
    def validate(self, data):
        if not data.get('user_id') and not data.get('recipient_email'):
            raise serializers.ValidationError(
                "Either user_id or recipient_email must be provided"
            )
        
        try:
            from .models import NotificationType
            NotificationType.objects.get(code=data['notification_type_code'], is_active=True)
        except NotificationType.DoesNotExist:
            raise serializers.ValidationError(
                f"Notification type '{data['notification_type_code']}' not found"
            )
        
        return data