#!/usr/bin/env bash
# Manual test for bulk-complete-by-links feature.
# Usage:
#   export BASE_URL=http://localhost:8080
#   export ADMIN_USERNAME=your_admin_username
#   export ADMIN_PASSWORD=your_admin_password
#   ./scripts/manual-test-bulk-complete.sh
#
# Or with a .env in backend: source .env 2>/dev/null; export ADMIN_USERNAME ADMIN_PASSWORD; BASE_URL=http://localhost:8080 ./scripts/manual-test-bulk-complete.sh

set -e
BASE_URL="${BASE_URL:-http://localhost:8080}"
ADMIN_USERNAME="${ADMIN_USERNAME:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

if [[ -z "$ADMIN_USERNAME" || -z "$ADMIN_PASSWORD" ]]; then
  echo "Set ADMIN_USERNAME and ADMIN_PASSWORD (or source backend .env)."
  exit 1
fi

echo "=== 1. Admin login ==="
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")
echo "$LOGIN_RESPONSE" | head -c 200
echo ""

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [[ -z "$TOKEN" ]]; then
  echo "Login failed; no token. Check credentials and that backend is running at $BASE_URL"
  exit 1
fi
echo "Token received (length ${#TOKEN})"

echo ""
echo "=== 2. Preview links (POST /api/admin/invitations/preview-links) ==="
# Use a few sample links; replace with real invitation link URLs from your DB for real test
PREVIEW_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/invitations/preview-links" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"links":["https://example.com/survey/1","https://example.com/survey/2"]}')
echo "$PREVIEW_RESPONSE"
echo ""

echo "=== 3. Bulk complete by links (POST /api/admin/invitations/bulk-complete-by-links) ==="
BULK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/invitations/bulk-complete-by-links" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"links":["https://example.com/survey/1","https://example.com/survey/2"]}')
echo "$BULK_RESPONSE"
echo ""

echo "=== Done ==="
echo "Preview and bulk-complete endpoints were called. Check responses above."
echo "For a meaningful test, use real survey invitation link URLs from your database (survey_invitation.link_url)."
