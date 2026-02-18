#!/bin/bash

# Deployment script for Phone Verifier application
# Run this on the server after SSH'ing in

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "📥 Pulling latest changes from main..."
git pull origin main

echo "🔨 Building and restarting backend..."
cd backend
docker-compose down
docker-compose build --no-cache
docker-compose up -d

echo "⏳ Waiting for backend to be ready..."
sleep 5

echo "📦 Building frontend..."
cd ../frontend
npm install --production=false  # Install dependencies if needed
npm run build

echo "📋 Copying frontend to web directory..."
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/

echo "✅ Checking backend status..."
docker ps | grep sms-backend
docker logs sms-backend --tail 20

echo "🎉 Deployment complete!"
echo ""
echo "Backend should be running on port 8080"
echo "Frontend should be accessible via nginx"
echo ""
echo "To check backend logs: docker logs sms-backend -f"
echo "To check if containers are running: docker ps"




