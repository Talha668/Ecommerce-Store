import os 
from .settings.base import *


# Override with the environment specific settings, They can be according to the enviromment you are using
if os.environ.get('DJANGO_ENV') == 'Production':
    from .settings.production import *
elif os.environ.get("DJANGO_ENV") == "Development":
    from .settings.development import *
# else:
#     from .settings.testing import *          