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

1. **Build the frontend:**
   ```bash
   cd client-phone-verification
   npm run build
   ```

2. **Copy to web directory:**
   ```bash
   sudo cp -r dist/* /var/www/html/
   sudo chown -R www-data:www-data /var/www/html/
   ```

## Backend Deployment

1. **Start the backend:**
   ```bash
   cd smsbackend
   docker-compose up -d
   ```
