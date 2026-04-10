# Nginx Deployment Instructions

## Server Setup

1. **Copy the configuration:**
   ```bash
   sudo cp nginx/sites-available/myapp /etc/nginx/sites-available/
   sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
   ```

2. **Test and reload Nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. **Get SSL certificate:**
   ```bash
   sudo certbot --nginx -d health.networks.howard.edu
   ```

## Frontend Deployment

The repo’s canonical flow is **`deploy.sh`** at the project root (pull, Docker backend, `npm run build`, copy). For frontend-only steps:

1. **From the repo root, pull and build:**
   ```bash
   cd ~/PhoneVerificationApp   # or your clone path
   git pull origin main
   cd frontend
   npm ci                      # or: npm install --production=false
   npm run build
   ```

2. **Copy build output** (`dist/` is not in git — you must build on the server after every pull):
   ```bash
   sudo rm -rf /var/www/html/* 2>/dev/null || true
   sudo cp -r dist/. /var/www/html/
   sudo chown -R www-data:www-data /var/www/html/
   ```

Using `dist/.` copies the *contents* of `dist` (including `index.html` and hashed assets). Do not copy an old `dist` without rebuilding after `git pull`.

## Backend Deployment

1. **Start the backend** (from `backend/` where `docker-compose.yml` lives):
   ```bash
   cd ~/PhoneVerificationApp/backend
   docker-compose up -d --build
   ```

Or run **`./deploy.sh`** from the repo root for a full deploy.
