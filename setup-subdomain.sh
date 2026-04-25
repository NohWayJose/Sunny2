#!/bin/bash

# Setup script for solar.lubel.me subdomain

echo "=========================================="
echo "Solar Dashboard Subdomain Setup"
echo "=========================================="

# Step 1: Copy Nginx configuration
echo "1. Installing Nginx configuration..."
sudo cp /home/greg/Development/Sunny2/nginx-solar-subdomain.conf /etc/nginx/sites-available/solar.lubel.me

# Step 2: Enable the site
echo "2. Enabling site..."
sudo ln -sf /etc/nginx/sites-available/solar.lubel.me /etc/nginx/sites-enabled/

# Step 3: Test configuration
echo "3. Testing Nginx configuration..."
if sudo nginx -t; then
    echo "✓ Configuration test passed!"
else
    echo "✗ Configuration test failed!"
    exit 1
fi

# Step 4: Get SSL certificate
echo "4. Setting up SSL certificate..."
echo "Running certbot for solar.lubel.me..."
sudo certbot --nginx -d solar.lubel.me

# Step 5: Reload Nginx
echo "5. Reloading Nginx..."
sudo systemctl reload nginx

echo ""
echo "=========================================="
echo "✓ Setup Complete!"
echo "=========================================="
echo ""
echo "Your dashboard should now be accessible at:"
echo "https://solar.lubel.me"
echo ""
echo "Next steps:"
echo "1. Install PM2: sudo npm install -g pm2"
echo "2. Setup database: sudo mariadb < setup-database-user.sql"
echo "3. Start backend: cd backend && pm2 start src/server.js --name solar-dashboard"
echo ""
echo "=========================================="

# Made with Bob
