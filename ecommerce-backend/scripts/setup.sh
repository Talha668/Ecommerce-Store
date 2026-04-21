#!/bin/bash

echo "🚀 Setting up E-commerce Backend..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔓 Activating virtual environment..."
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "📚 Installing requirements..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📄 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit the .env file with your configuration!"
fi

# Navigate to src directory
cd src

# Apply migrations
echo "🗄️  Applying migrations..."
python manage.py migrate

# Create superuser
echo "👑 Creating superuser..."
python manage.py createsuperuser

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the server:"
echo "1. cd src"
echo "2. python manage.py runserver"
echo ""
echo "Default admin: http://localhost:8000/admin"