# src/config/settings/development.py
from .base import *

DEBUG = True

# Database
DATABASES['default'] = {
    'ENGINE': 'django.db.backends.postgresql',
    'NAME': config('DB_NAME'),
    'USER': config('DB_USER'),
    'PASSWORD': config('DB_PASSWORD'),
    'HOST': config('DB_HOST'),
    'PORT': config('DB_PORT'),
}

# CORS for development
CORS_ALLOW_ALL_ORIGINS = True

# Email backend for development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Debug toolbar
INSTALLED_APPS += ['debug_toolbar']
MIDDLEWARE.insert(0, 'debug_toolbar.middleware.DebugToolbarMiddleware')
INTERNAL_IPS = ['127.0.0.1']



import sys
print("BASE_DIR", BASE_DIR)
print("template directory:", BASE_DIR/ 'templates')
print("Does tempalet dir exists?", (BASE_DIR / 'templates').exists())
print("templates dirs:", TEMPLATES[0]['DIRS'])