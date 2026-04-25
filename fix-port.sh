#!/bin/bash
# Fix solar dashboard port conflict

echo "Updating Nginx configuration..."
sudo sed -i 's|proxy_pass http://localhost:3000/api/|proxy_pass http://localhost:3001/api/|g' /etc/nginx/sites-enabled/lubel.me

echo "Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "Reloading Nginx..."
    sudo systemctl reload nginx
    
    echo "Restarting solar dashboard..."
    pm2 restart solar-dashboard
    
    echo "Waiting for startup..."
    sleep 3
    
    echo "Testing API..."
    curl -s http://localhost:3001/api/health | jq .
    
    echo ""
    echo "✅ Done! Visit https://lubel.me/solar"
else
    echo "❌ Nginx configuration test failed!"
    exit 1
fi

# Made with Bob
