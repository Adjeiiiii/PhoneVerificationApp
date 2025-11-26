#!/bin/sh
set -e

# Auto-generate JWT_SECRET if not provided (64 hex characters = 512 bits for HS512)
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "change-this-secret-key-in-production-use-at-least-64-characters-for-hs512-algorithm" ]; then
    echo "🔐 Auto-generating JWT_SECRET..."
    export JWT_SECRET=$(openssl rand -hex 32)
    echo "✅ JWT_SECRET has been auto-generated (64 characters)"
    echo "⚠️  Note: JWT_SECRET will change on each container restart unless set in .env file"
fi

# Auto-generate ADMIN_PASSWORD if using default
if [ -z "$ADMIN_PASSWORD" ] || [ "$ADMIN_PASSWORD" = "changeme" ]; then
    echo "🔐 Auto-generating ADMIN_PASSWORD..."
    export ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    echo "✅ ADMIN_PASSWORD has been auto-generated"
    echo "📋 Generated ADMIN_PASSWORD: $ADMIN_PASSWORD"
    echo "⚠️  Note: Save this password! It will change on each container restart unless set in .env file"
fi

# Execute the main command
exec java $JAVA_OPTS ${SPRING_PROFILES_ACTIVE:+-Dspring.profiles.active=$SPRING_PROFILES_ACTIVE} -jar app.jar

