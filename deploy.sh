#!/bin/bash

# Solar Dashboard Deployment Script
# Deploys the application to /srv/www/htdocs/solar

set -e  # Exit on error

echo "=========================================="
echo "Solar Dashboard Deployment"
echo "=========================================="

# Configuration
DEPLOY_DIR="/srv/www/htdocs/solar"
FRONTEND_SRC="./frontend"
BACKEND_DIR="./backend"
PM2_APP_NAME="solar-dashboard"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running from correct directory
if [ ! -f "deploy.sh" ]; then
    echo -e "${RED}Error: Must run from project root directory${NC}"
    exit 1
fi

# Check if deployment directory exists
if [ ! -d "$DEPLOY_DIR" ]; then
    echo -e "${YELLOW}Creating deployment directory: $DEPLOY_DIR${NC}"
    sudo mkdir -p "$DEPLOY_DIR"
    sudo chown $USER:$USER "$DEPLOY_DIR"
fi

# Deploy Frontend
echo -e "${GREEN}Deploying frontend files...${NC}"
rsync -av --delete \
    --exclude='*.map' \
    --exclude='.DS_Store' \
    "$FRONTEND_SRC/" "$DEPLOY_DIR/frontend/"

echo -e "${GREEN}✓ Frontend deployed${NC}"

# Check if backend .env exists
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${YELLOW}Warning: Backend .env file not found${NC}"
    echo "Please create $BACKEND_DIR/.env with your database credentials"
    echo "You can copy from $BACKEND_DIR/.env.example"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}Error: PM2 is not installed${NC}"
    echo "Install PM2 with: npm install -g pm2"
    exit 1
fi

# Restart or start backend with PM2
echo -e "${GREEN}Managing backend service...${NC}"

cd "$BACKEND_DIR"

# Check if app is already running
if pm2 list | grep -q "$PM2_APP_NAME"; then
    echo "Restarting existing PM2 process..."
    pm2 restart "$PM2_APP_NAME"
else
    echo "Starting new PM2 process..."
    pm2 start src/server.js --name "$PM2_APP_NAME"
    pm2 save
fi

cd ..

echo -e "${GREEN}✓ Backend service updated${NC}"

# Show PM2 status
echo ""
echo "PM2 Status:"
pm2 list

# Check Nginx configuration
echo ""
echo -e "${YELLOW}Checking Nginx configuration...${NC}"

if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
    
    # Ask to reload Nginx
    read -p "Reload Nginx? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo systemctl reload nginx
        echo -e "${GREEN}✓ Nginx reloaded${NC}"
    fi
else
    echo -e "${RED}✗ Nginx configuration has errors${NC}"
    echo "Please check your Nginx configuration"
fi

# Display deployment info
echo ""
echo "=========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=========================================="
echo "Frontend: $DEPLOY_DIR/frontend/"
echo "Backend: Running on port 3000 (PM2: $PM2_APP_NAME)"
echo "Dashboard URL: https://lubel.me/solar"
echo ""
echo "Useful commands:"
echo "  pm2 logs $PM2_APP_NAME    - View backend logs"
echo "  pm2 restart $PM2_APP_NAME - Restart backend"
echo "  pm2 stop $PM2_APP_NAME    - Stop backend"
echo "=========================================="

# Made with Bob
