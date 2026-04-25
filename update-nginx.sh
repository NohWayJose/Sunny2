#!/bin/bash

# Script to update Nginx configuration for Solar Dashboard

echo "=========================================="
echo "Nginx Configuration Update for Solar Dashboard"
echo "=========================================="

# Backup current config
echo "Creating backup of current configuration..."
sudo cp /etc/nginx/sites-available/lubel.me /etc/nginx/sites-available/lubel.me.backup.$(date +%Y%m%d_%H%M%S)

# Copy new config
echo "Copying new configuration..."
sudo cp /home/greg/Development/Sunny2/nginx-lubel.me-updated.conf /etc/nginx/sites-available/lubel.me

# Test configuration
echo "Testing Nginx configuration..."
if sudo nginx -t; then
    echo "✓ Configuration test passed!"
    
    # Ask to reload
    read -p "Reload Nginx to apply changes? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo systemctl reload nginx
        echo "✓ Nginx reloaded successfully!"
        echo ""
        echo "Solar Dashboard should now be accessible at:"
        echo "https://lubel.me/solar"
    fi
else
    echo "✗ Configuration test failed!"
    echo "Restoring backup..."
    sudo cp /etc/nginx/sites-available/lubel.me.backup.$(date +%Y%m%d)* /etc/nginx/sites-available/lubel.me
    echo "Please check the error messages above."
    exit 1
fi

echo "=========================================="
echo "Done!"
echo "=========================================="

# Made with Bob
