#!/bin/bash

echo "🔐 Generating Secure Admin Credentials"
echo "======================================"
echo ""

# Generate secure admin username
ADMIN_USERNAME="admin_$(openssl rand -hex 4)"
echo "ADMIN_USERNAME=$ADMIN_USERNAME"

# Generate secure admin password (32 characters)
ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
echo "ADMIN_PASSWORD=$ADMIN_PASSWORD"

# Generate JWT secret (128 characters)
JWT_SECRET=$(openssl rand -hex 64)
echo "JWT_SECRET=$JWT_SECRET"

echo ""
echo "✅ Copy these values to your .env file"
echo "⚠️  Keep these credentials secure and never commit them to git!"
