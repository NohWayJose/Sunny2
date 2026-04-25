# Quick Start Guide

## 🚀 Get Your Dashboard Running in 5 Minutes!

### Step 1: Secure the Database (1 minute)

Run this SQL script to create the database user:

```bash
sudo mariadb < /home/greg/Development/Sunny2/setup-database-user.sql
```

Or manually:
```bash
sudo mariadb
```

Then paste the contents of `setup-database-user.sql`

### Step 2: Install PM2 (1 minute)

```bash
sudo npm install -g pm2
```

### Step 3: Start the Backend (30 seconds)

```bash
cd /home/greg/Development/Sunny2/backend
pm2 start src/server.js --name solar-dashboard
pm2 save
```

### Step 4: Configure Nginx (2 minutes)

Edit your Nginx config:
```bash
sudo nano /etc/nginx/sites-available/lubel.me
```

Add these location blocks inside your `server` block:

```nginx
# Solar Dashboard API
location /solar/api/ {
    proxy_pass http://localhost:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# Solar Dashboard Frontend
location /solar/ {
    alias /srv/www/htdocs/solar/frontend/;
    try_files $uri $uri/ /solar/index.html;
}

location = /solar {
    return 301 /solar/;
}
```

Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: Access Your Dashboard! (30 seconds)

Open your browser to:
**https://lubel.me/solar**

## ✅ Verification

### Check Backend Status
```bash
pm2 status
pm2 logs solar-dashboard
```

### Test API Directly
```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/solar/range
```

### Check Frontend
```bash
ls -la /srv/www/htdocs/solar/frontend/
```

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
pm2 logs solar-dashboard --lines 50

# Check database connection
cd /home/greg/Development/Sunny2/backend
node -e "require('./src/config/database').testConnection()"
```

### Can't access dashboard
```bash
# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# Check if backend is running
curl http://localhost:3000/api/health
```

### Database connection errors
```bash
# Test database access
sudo mariadb -u archery -p SunnyData2
# Password: ralosbackwards

# Then run:
SELECT COUNT(*) FROM DTP;
```

## 📊 Using the Dashboard

1. **Select View Type**: Daily, Monthly, or Yearly
2. **Choose Date Range**: Use the date pickers
3. **Click Update Chart**: Load the data
4. **Interact**: Hover for details, scroll to zoom, drag to pan

## 🔄 Updates

When you make changes:
```bash
cd /home/greg/Development/Sunny2
git pull
./deploy.sh
```

## 📝 Useful Commands

```bash
# View backend logs
pm2 logs solar-dashboard

# Restart backend
pm2 restart solar-dashboard

# Stop backend
pm2 stop solar-dashboard

# Backend status
pm2 status

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

## 🎉 Success!


---

## 🧪 Testing the Experimental Annular Visualization

The experimental annular visualization (circle-to-line morphing) is in a separate folder for safe testing.

### Local Development Testing

1. **Start the backend API** (if not already running):
   ```bash
   cd backend
   npm start
   ```

2. **Serve the frontend files** (choose one method):

   **Option A: Using the provided script**
   ```bash
   ./serve-frontend.sh
   ```

   **Option B: Using Python**
   ```bash
   cd frontend
   python3 -m http.server 8080
   ```

   **Option C: Using Node.js http-server**
   ```bash
   npm install -g http-server
   cd frontend
   http-server -p 8080
   ```

3. **Open in browser**:
   ```
   http://localhost:8080/experimental/annular-viz.html
   ```

### What to Test

- **Time Window Slider**: Drag to morph between circle (1 year) and line (1 hour)
- **Time Navigator**: Use the 5 sliders to navigate through your data
- **Multi-Year Mode**: Toggle "Show All Years" to compare years
- **Data Loading**: Verify it loads your solar data correctly

### Integration

Once tested and working, the visualization can be integrated into the main dashboard. See `frontend/experimental/README.md` for details.
Your dashboard should now be live at **https://lubel.me/solar** showing 14+ years of solar generation data!