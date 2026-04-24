# Solar Dashboard Project Plan

## Project Overview
A web-based dashboard to visualize solar panel generation data from March 2012 to present, with data collected every 10 minutes and stored in MariaDB.

**Project Location:** `/home/greg/Development/Sunny2`  
**Web Access:** `https://lubel.me/solar`  
**Deployment Location:** `/srv/www/htdocs/solar`

## Database Information
- **Database Name:** SunnyData2
- **Main Table:** DTP
  - `idDTP` (int, PK, auto_increment): Record ID
  - `DT` (datetime): Timestamp of reading (every 10 minutes)
  - `PWR` (varchar(6)): Power generation value
- **Metadata Table:** FILES (tracks CSV ingestion history)
- **Data Range:** March 2012 - Present (~736,000 records)

## Technology Stack
- **Backend:** Node.js with Express
- **Database:** MariaDB (existing SunnyData2 database)
- **Frontend:** HTML5, CSS3, D3.js v7
- **Web Server:** Nginx (reverse proxy with Let's Encrypt SSL)
- **Version Control:** Git + GitHub
- **Process Manager:** PM2 (for backend service)

## Project Structure
```
/home/greg/Development/Sunny2/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # MariaDB connection config
│   │   ├── services/
│   │   │   └── solarDataService.js  # Data aggregation logic
│   │   ├── routes/
│   │   │   └── api.js               # API endpoints
│   │   └── server.js                # Express app entry point
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── index.html                   # Main dashboard page
│   ├── css/
│   │   └── styles.css               # Dashboard styling
│   ├── js/
│   │   ├── charts/
│   │   │   ├── dailyChart.js        # D3.js daily trends
│   │   │   ├── monthlyChart.js      # D3.js monthly trends
│   │   │   └── yearlyChart.js       # D3.js yearly comparison
│   │   ├── utils/
│   │   │   └── api.js               # API client functions
│   │   └── main.js                  # Dashboard initialization
│   └── assets/
├── deploy.sh                        # Deployment script
├── .gitignore
├── README.md
└── nginx-config-example.conf        # Nginx configuration reference
```

## API Endpoints Design

### 1. Daily Aggregated Data
**GET** `/api/solar/daily?start=YYYY-MM-DD&end=YYYY-MM-DD`

Response:
```json
{
  "data": [
    {
      "date": "2024-01-15",
      "totalKwh": 12.5,
      "avgPower": 520,
      "maxPower": 3200,
      "minPower": 0,
      "readingCount": 144
    }
  ],
  "summary": {
    "totalDays": 30,
    "totalGeneration": 375.5
  }
}
```

### 2. Monthly Aggregated Data
**GET** `/api/solar/monthly?start=YYYY-MM&end=YYYY-MM`

Response:
```json
{
  "data": [
    {
      "month": "2024-01",
      "totalKwh": 375.5,
      "avgDailyKwh": 12.1,
      "peakDay": "2024-01-15",
      "peakDayKwh": 18.2
    }
  ],
  "summary": {
    "totalMonths": 12,
    "totalGeneration": 4500.0
  }
}
```

### 3. Yearly Aggregated Data
**GET** `/api/solar/yearly?start=YYYY&end=YYYY`

Response:
```json
{
  "data": [
    {
      "year": "2024",
      "totalKwh": 4500.0,
      "avgMonthlyKwh": 375.0,
      "peakMonth": "2024-06",
      "peakMonthKwh": 520.5
    }
  ],
  "summary": {
    "totalYears": 12,
    "totalGeneration": 54000.0,
    "avgYearlyGeneration": 4500.0
  }
}
```

### 4. Raw Data (10-minute intervals)
**GET** `/api/solar/raw?start=YYYY-MM-DD&end=YYYY-MM-DD&limit=1000&offset=0`

Response:
```json
{
  "data": [
    {
      "timestamp": "2024-01-15T10:00:00Z",
      "power": 2850
    }
  ],
  "pagination": {
    "total": 15000,
    "limit": 1000,
    "offset": 0,
    "hasMore": true
  }
}
```

## D3.js Visualizations - Phase 1

### 1. Daily Power Generation Chart
- **Type:** Line chart with area fill
- **X-axis:** Date
- **Y-axis:** Total kWh per day
- **Features:**
  - Tooltip showing exact values
  - Zoom and pan functionality
  - Brush selection for date range
  - Responsive design

### 2. Monthly Power Generation Chart
- **Type:** Line chart with markers
- **X-axis:** Month-Year
- **Y-axis:** Total kWh per month
- **Features:**
  - Hover effects
  - Comparison with previous year (optional overlay)
  - Seasonal trend highlighting

### 3. Yearly Comparison Chart
- **Type:** Grouped bar chart
- **X-axis:** Year
- **Y-axis:** Total kWh per year
- **Features:**
  - Color-coded bars
  - Year-over-year growth percentage
  - Average line overlay

### Interactive Controls
- Date range picker (start/end dates)
- View switcher (Daily/Monthly/Yearly)
- Export data button (CSV download)
- Refresh data button

## Database Query Optimization

### Indexing Strategy
```sql
-- Add index on DT column for faster date range queries
CREATE INDEX idx_dt ON DTP(DT);

-- Composite index for common query patterns
CREATE INDEX idx_dt_pwr ON DTP(DT, PWR);
```

### Query Examples

**Daily Aggregation:**
```sql
SELECT 
  DATE(DT) as date,
  SUM(CAST(PWR AS DECIMAL(10,2))) as totalKwh,
  AVG(CAST(PWR AS DECIMAL(10,2))) as avgPower,
  MAX(CAST(PWR AS DECIMAL(10,2))) as maxPower,
  MIN(CAST(PWR AS DECIMAL(10,2))) as minPower,
  COUNT(*) as readingCount
FROM DTP
WHERE DT BETWEEN ? AND ?
GROUP BY DATE(DT)
ORDER BY date;
```

**Monthly Aggregation:**
```sql
SELECT 
  DATE_FORMAT(DT, '%Y-%m') as month,
  SUM(CAST(PWR AS DECIMAL(10,2))) as totalKwh,
  AVG(CAST(PWR AS DECIMAL(10,2))) as avgPower
FROM DTP
WHERE DT BETWEEN ? AND ?
GROUP BY DATE_FORMAT(DT, '%Y-%m')
ORDER BY month;
```

## Deployment Configuration

### Nginx Reverse Proxy Setup
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

### Environment Variables
```bash
# .env file
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=SunnyData2
PORT=3000
NODE_ENV=production
```

### Deployment Script
```bash
#!/bin/bash
# deploy.sh

echo "Deploying Solar Dashboard..."

# Sync frontend to production directory
echo "Syncing frontend files..."
rsync -av --delete frontend/ /srv/www/htdocs/solar/frontend/

# Restart backend service
echo "Restarting backend service..."
pm2 restart solar-dashboard || pm2 start backend/src/server.js --name solar-dashboard

echo "Deployment complete!"
echo "Dashboard available at: https://lubel.me/solar"
```

## Git Workflow

### Initial Setup
1. Initialize Git repository in `/home/greg/Development/Sunny2`
2. Create `.gitignore` for Node.js projects
3. Commit initial project structure
4. Create GitHub repository
5. Push to GitHub

### Development Workflow
1. Work on feature branches
2. Commit regularly with descriptive messages
3. Push to GitHub after completing each major feature
4. Tag releases (v1.0.0, v1.1.0, etc.)

### Commit Strategy
- After initial project setup
- After backend API implementation
- After frontend visualization implementation
- After adding new features
- Before deployment

## Future Enhancements - Phase 2

### ROI Analysis Features
1. **Feed-in Tariff Integration**
   - Research UK FIT rates (2012-present)
   - Create tariff rate table in database
   - Calculate earnings based on generation and tariff periods

2. **Financial Dashboard**
   - Total earnings to date
   - Monthly/yearly earnings breakdown
   - ROI calculation (if installation cost provided)
   - Payback period visualization

3. **Custom D3.js Visualizations**
   - Stacked area chart (generation vs. earnings)
   - Sankey diagram (energy flow)
   - Calendar heatmap (daily generation patterns)
   - Performance ratio gauge

### Additional Features
- Export reports (PDF/Excel)
- Email alerts for system issues
- Weather data integration
- Predictive analytics
- Mobile-responsive design improvements

## Timeline Estimate

**Phase 1: Basic Dashboard (Time-Series Trends)**
- Project setup & Git initialization: 1 hour
- Backend API development: 4-6 hours
- Frontend dashboard layout: 2-3 hours
- D3.js visualizations: 6-8 hours
- Testing & deployment: 2-3 hours
- **Total: ~15-20 hours**

**Phase 2: ROI Analysis (Future)**
- Feed-in tariff research & data: 3-4 hours
- ROI calculations & API: 3-4 hours
- Financial visualizations: 4-6 hours
- **Total: ~10-14 hours**

## Success Criteria

### Phase 1 Completion
- ✓ Dashboard accessible at https://lubel.me/solar
- ✓ Daily, monthly, and yearly views working
- ✓ Interactive date range selection
- ✓ Responsive design on desktop and mobile
- ✓ Code committed to GitHub
- ✓ Documentation complete

### Performance Targets
- API response time < 2 seconds for 1 year of data
- Page load time < 3 seconds
- Smooth chart interactions (60fps)
- Handle 14+ years of historical data efficiently

## Implementation Checklist

### Phase 1: Setup & Infrastructure
- [ ] Create project directory structure
- [ ] Initialize Git repository
- [ ] Set up .gitignore
- [ ] Create README.md
- [ ] Initialize Node.js project
- [ ] Create .env.example
- [ ] Commit initial setup

### Phase 2: Backend Development
- [ ] Configure MariaDB connection
- [ ] Create database service layer
- [ ] Build daily aggregation endpoint
- [ ] Build monthly aggregation endpoint
- [ ] Build yearly aggregation endpoint
- [ ] Build raw data endpoint
- [ ] Commit backend implementation

### Phase 3: Frontend Development
- [ ] Create HTML dashboard layout
- [ ] Implement daily chart (D3.js)
- [ ] Implement monthly chart (D3.js)
- [ ] Implement yearly chart (D3.js)
- [ ] Add date range picker
- [ ] Add view switcher
- [ ] Commit frontend implementation

### Phase 4: Enhancement & Polish
- [ ] Add zoom/pan functionality
- [ ] Implement loading states
- [ ] Add error handling
- [ ] Create deployment script
- [ ] Document nginx configuration
- [ ] Test with full dataset

### Phase 5: Deployment & Documentation
- [ ] Create GitHub repository
- [ ] Push code to GitHub
- [ ] Deploy to production
- [ ] Document deployment process
- [ ] Final testing

## Notes
- PWR field is varchar(6) - needs conversion to numeric for calculations
- Data points every 10 minutes = 144 readings per day
- Total records: ~14 years × 365 days × 144 = ~736,000 records
- Consider data caching for frequently accessed aggregations
- Ensure proper error handling for database connection issues
- Plan for future scalability as data continues to grow