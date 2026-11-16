import os
from decouple import config
from django.core.asgi import get_asgi_application


environment = config('DJANGO_ENV', default='development')

if environment == 'production':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
else:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_asgi_application()
