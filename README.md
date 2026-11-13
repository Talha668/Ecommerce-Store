Django E-Commerce Backend.

A robust, scalable, and modular backend system for an e-commerce platform, built with Python and Django. This project is designed with a clean architecture, separating concerns into dedicated apps (Users, Products, Orders, Notifications) and utilizing service layers for business logic.

Python: 3.13
Django: 5.x
License: MIT

🚀 Features

- Product Management: Comprehensive product catalog with support for categories, filtering, and pagination.
- Order Processing: Full order lifecycle management, including cart management and checkout logic.
- User Management: Secure user authentication, profile management, and permissions handling.
- Notification System: In-app and email notifications with background processing capabilities using custom management - commands.
- Payment Integration: Service layer structure ready for payment gateway integration (e.g., Mastercard service).
- Modular Architecture: Organized into distinct Django apps (users, products, orders, notifications) for maintainability.
- Database: SQLite for development (easily configurable for PostgreSQL/MySQL in production).

🛠 Tech Stack

- Language: Python 3.13
- Framework: Django & Django REST Framework
- Database: SQLite (Dev), PostgreSQL (Prod ready)
- Task Processing: Custom Management Commands (Background notifications)
- Cloud Tools: Boto3 (AWS integration ready)
- Frontend: Django Templates (Basic rendering for emails/views)

📁 Project Structure

The project is organized into a modular architecture using Django Apps. Business logic is decoupled into service layers, and settings are split for different environments.

ecommerce-backend/├── .env                          # Environment configuration├── requirements.txt              # Project dependencies├── scripts/                      # Utility scripts│   ├── reset_db.sh              # Database reset utility│   └── setup.sh                 # Project initialization script│└── src/                          # Main source directory    ├── manage.py                 # Django CLI entry point    ├── add_categories.py         # DB seeding script    ├── add_products.py          # DB seeding script    │    ├── config/                   # Project configuration    │   ├── settings/             # Environment-specific settings    │   │   ├── base.py          # Common settings    │   │   ├── development.py   # Dev environment    │   │   └── production.py    # Prod environment    │   ├── urls.py               # Root URL configuration    │   ├── asgi.py               # ASGI config (async)    │   └── wsgi.py               # WSGI config (sync)    │    ├── core/                     # Core app for shared utilities    │   ├── admin.py    │   └── models.py    │    ├── templates/                # HTML Templates    │   ├── auth/                 # Login/Register pages    │   ├── cart/                 # Shopping cart views    │   ├── checkout/             # Checkout flow    │   ├── emails/               # Transactional email templates    │   ├── orders/               # Order history/confirmation    │   ├── products/             # Product listing/search    │   └── profile/              # User profile management    │    └── apps/                     # Feature-specific Django apps        │        ├── notifications/        # Alert system        │   ├── services/         # Business Logic        │   │   ├── email_service.py        │   │   └── notification_service.py        │   ├── management/       # Background tasks        │   │   └── commands/        │   │       └── process_notifications.py        │   ├── signals.py        # Event triggers        │   └── models.py        │        ├── orders/               # Order processing        │   ├── services/         # Business Logic        │   │   └── mastercard_service.py        │   ├── context_processors.py        │   └── models.py        │        ├── products/             # Inventory management        │   ├── filters.py        # Query filtering logic        │   ├── pagination.py     # API response pagination        │   ├── permissions.py    # Access control        │   └── models.py        │        └── users/                # User management            ├── permissions.py    # Custom permissions            ├── signals.py        # User triggers            └── models.py

⚙️ Installation

- Clone repo
- cd ecommerce-backend
- Create virtual environment
- pip install requirements.txt
- Create database
- Apply migration
- Start server

📄 License

This project is licensed under MIT license.
