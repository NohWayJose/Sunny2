# Solar Dashboard

A web-based dashboard for visualizing solar panel generation data from March 2012 to present, with data collected every 10 minutes.

## Overview

This dashboard provides interactive visualizations of solar power generation data stored in a MariaDB database. It features daily, monthly, and yearly trend analysis with D3.js charts.

## Technology Stack

- **Backend:** Node.js with Express
- **Database:** MariaDB (SunnyData2)
- **Frontend:** HTML5, CSS3, D3.js v7
- **Web Server:** Nginx with Let's Encrypt SSL
- **Process Manager:** PM2

## Project Structure

```
Sunny2/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # MariaDB connection
│   │   ├── services/
│   │   │   └── solarDataService.js  # Data aggregation logic
│   │   ├── routes/
│   │   │   └── api.js               # API endpoints
│   │   └── server.js                # Express app
│   ├── package.json
│   └── .env                         # Environment variables (not in git)
├── frontend/
│   ├── index.html                   # Main dashboard
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── charts/
│   │   │   ├── dailyChart.js
│   │   │   ├── monthlyChart.js
│   │   │   └── yearlyChart.js
│   │   ├── utils/
│   │   │   └── api.js
│   │   └── main.js
│   └── assets/
├── deploy.sh                        # Deployment script
├── .env.example                     # Environment template
└── README.md
```

## Database Schema

**Table: DTP**
- `idDTP` (int, PK): Record ID
- `DT` (datetime): Timestamp (10-minute intervals)
- `PWR` (varchar(6)): Power generation value

**Data Range:** March 2012 - Present (~736,000 records)

## API Endpoints

### Daily Aggregated Data
```
GET /api/solar/daily?start=YYYY-MM-DD&end=YYYY-MM-DD
```

### Monthly Aggregated Data
```
GET /api/solar/monthly?start=YYYY-MM&end=YYYY-MM
```

### Yearly Aggregated Data
```
GET /api/solar/yearly?start=YYYY&end=YYYY
```

### Raw Data (10-minute intervals)
```
GET /api/solar/raw?start=YYYY-MM-DD&end=YYYY-MM-DD&limit=1000&offset=0
```

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MariaDB with SunnyData2 database
- Nginx with SSL configured
- PM2 process manager

### Installation

1. **Clone the repository:**
   ```bash
   cd /home/greg/Development
   git clone <repository-url> Sunny2
   cd Sunny2
   ```

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Start the backend (development):**
   ```bash
   npm run dev
   ```

5. **Start the backend (production with PM2):**
   ```bash
   pm2 start src/server.js --name solar-dashboard
   pm2 save
   ```

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=SunnyData2
PORT=3000
NODE_ENV=production
```

## Deployment

### Production Deployment

The application is deployed to `/srv/www/htdocs/solar` and accessible at `https://lubel.me/solar`.

1. **Deploy using the deployment script:**
   ```bash
   ./deploy.sh
   ```

2. **Manual deployment:**
   ```bash
   # Sync frontend files
   rsync -av --delete frontend/ /srv/www/htdocs/solar/frontend/
   
   # Restart backend service
   pm2 restart solar-dashboard
   ```

### Nginx Configuration

Add to your Nginx configuration:

```nginx
# API proxy
location /solar/api/ {
    proxy_pass http://localhost:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}

# Static files
location /solar/ {
    alias /srv/www/htdocs/solar/frontend/;
    try_files $uri $uri/ /solar/index.html;
}
```

Reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Development

### Running Locally

1. Start the backend:
   ```bash
   cd backend
   npm run dev
   ```

2. Open the frontend in a browser:
   ```bash
   # If using a local web server
   cd frontend
   python3 -m http.server 8080
   ```

3. Access at `http://localhost:8080`

### Git Workflow

```bash
# Make changes
git add .
git commit -m "Description of changes"
git push origin main

# Deploy to production
./deploy.sh
```

## Features

### Phase 1 (Current)
- ✅ Daily power generation trends
- ✅ Monthly power generation trends
- ✅ Yearly comparison charts
- ✅ Interactive date range selection
- ✅ Zoom and pan functionality
- ✅ Responsive design

### Phase 2 (Planned)
- [ ] UK Feed-in Tariff integration
- [ ] ROI calculations
- [ ] Financial dashboard
- [ ] Custom D3.js visualizations
- [ ] Calendar heatmap
- [ ] Performance analytics

## Performance Optimization

- Database indexes on `DT` column for faster queries
- Data aggregation at the database level
- Efficient date range queries
- Responsive chart rendering with D3.js

## Troubleshooting

### Backend won't start
- Check database credentials in `.env`
- Ensure MariaDB is running
- Check port 3000 is available

### Charts not loading
- Check browser console for errors
- Verify API endpoints are accessible
- Check Nginx proxy configuration

### Database connection errors
- Verify database credentials
- Check MariaDB service status
- Ensure database user has proper permissions

## License

Private project for personal use.

## Contact

For questions or issues, contact the repository owner.