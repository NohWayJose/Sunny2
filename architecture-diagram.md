# Solar Dashboard Architecture Diagrams

## System Architecture Overview

```mermaid
graph TB
    subgraph "Client Browser"
        A[User Interface<br/>HTML/CSS/D3.js]
    end
    
    subgraph "Web Server - lubel.me"
        B[Nginx<br/>Reverse Proxy<br/>Let's Encrypt SSL]
    end
    
    subgraph "Application Server"
        C[Node.js/Express<br/>Backend API<br/>Port 3000]
        D[Solar Data Service<br/>Aggregation Logic]
    end
    
    subgraph "Database Server"
        E[(MariaDB<br/>SunnyData2<br/>DTP Table)]
    end
    
    subgraph "Version Control"
        F[GitHub<br/>Repository]
    end
    
    A -->|HTTPS Requests| B
    B -->|/solar/api/*| C
    B -->|/solar/*| A
    C --> D
    D -->|SQL Queries| E
    F -.->|Git Push/Pull| C
    F -.->|Git Push/Pull| A

    style A fill:#e1f5ff
    style B fill:#fff4e1
    style C fill:#e8f5e9
    style D fill:#e8f5e9
    style E fill:#f3e5f5
    style F fill:#fce4ec
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant U as User Browser
    participant N as Nginx
    participant API as Express API
    participant S as Solar Service
    participant DB as MariaDB

    U->>N: GET /solar/
    N->>U: Return index.html + assets
    
    U->>N: GET /solar/api/daily?start=2024-01&end=2024-12
    N->>API: Proxy to localhost:3000/api/daily
    API->>S: Request daily aggregation
    S->>DB: SELECT DATE(DT), SUM(PWR)...<br/>GROUP BY DATE(DT)
    DB->>S: Return aggregated data
    S->>API: Process and format data
    API->>N: JSON response
    N->>U: Return JSON data
    
    U->>U: D3.js renders chart
```

## Project Structure

```mermaid
graph LR
    subgraph "Sunny2/"
        A[backend/]
        B[frontend/]
        C[deploy.sh]
        D[README.md]
        E[.gitignore]
    end
    
    subgraph "backend/"
        A1[src/config/database.js]
        A2[src/services/solarDataService.js]
        A3[src/routes/api.js]
        A4[src/server.js]
        A5[package.json]
        A6[.env]
    end
    
    subgraph "frontend/"
        B1[index.html]
        B2[css/styles.css]
        B3[js/charts/dailyChart.js]
        B4[js/charts/monthlyChart.js]
        B5[js/charts/yearlyChart.js]
        B6[js/utils/api.js]
        B7[js/main.js]
    end
    
    A --> A1
    A --> A2
    A --> A3
    A --> A4
    A --> A5
    A --> A6
    
    B --> B1
    B --> B2
    B --> B3
    B --> B4
    B --> B5
    B --> B6
    B --> B7
```

## API Endpoint Structure

```mermaid
graph TD
    A[Express Server<br/>localhost:3000] --> B[/api/solar/daily]
    A --> C[/api/solar/monthly]
    A --> D[/api/solar/yearly]
    A --> E[/api/solar/raw]
    
    B --> F[Query Parameters:<br/>start, end]
    C --> G[Query Parameters:<br/>start, end]
    D --> H[Query Parameters:<br/>start, end]
    E --> I[Query Parameters:<br/>start, end, limit, offset]
    
    F --> J[Solar Data Service]
    G --> J
    H --> J
    I --> J
    
    J --> K[(MariaDB<br/>DTP Table)]
    
    style A fill:#4caf50
    style B fill:#2196f3
    style C fill:#2196f3
    style D fill:#2196f3
    style E fill:#2196f3
    style J fill:#ff9800
    style K fill:#9c27b0
```

## D3.js Visualization Components

```mermaid
graph TB
    A[Dashboard UI] --> B[Date Range Picker]
    A --> C[View Switcher<br/>Daily/Monthly/Yearly]
    
    C --> D[Daily Chart Component]
    C --> E[Monthly Chart Component]
    C --> F[Yearly Chart Component]
    
    D --> G[D3.js Line Chart<br/>with Area Fill]
    E --> H[D3.js Line Chart<br/>with Markers]
    F --> I[D3.js Bar Chart<br/>Grouped]
    
    G --> J[Features:<br/>- Tooltip<br/>- Zoom/Pan<br/>- Brush Selection]
    H --> K[Features:<br/>- Hover Effects<br/>- Year Comparison<br/>- Trend Lines]
    I --> L[Features:<br/>- Color Coding<br/>- Growth %<br/>- Average Line]
    
    style A fill:#e3f2fd
    style D fill:#fff3e0
    style E fill:#fff3e0
    style F fill:#fff3e0
    style G fill:#c8e6c9
    style H fill:#c8e6c9
    style I fill:#c8e6c9
```

## Database Query Flow

```mermaid
graph LR
    A[API Request] --> B{Aggregation Type?}
    
    B -->|Daily| C[Daily Query<br/>GROUP BY DATE]
    B -->|Monthly| D[Monthly Query<br/>GROUP BY MONTH]
    B -->|Yearly| E[Yearly Query<br/>GROUP BY YEAR]
    B -->|Raw| F[Raw Query<br/>10-min intervals]
    
    C --> G[Process Results]
    D --> G
    E --> G
    F --> G
    
    G --> H[Format JSON]
    H --> I[Return to Client]
    
    subgraph "MariaDB DTP Table"
        J[idDTP, DT, PWR<br/>~736,000 records]
    end
    
    C -.-> J
    D -.-> J
    E -.-> J
    F -.-> J
    
    style B fill:#ffeb3b
    style G fill:#4caf50
    style J fill:#9c27b0
```

## Deployment Workflow

```mermaid
graph TB
    A[Local Development<br/>/home/greg/Development/Sunny2] --> B[Git Commit]
    B --> C[Git Push to GitHub]
    C --> D[Pull on Server]
    D --> E[Run deploy.sh]
    
    E --> F[Sync Frontend to<br/>/srv/www/htdocs/solar/frontend/]
    E --> G[Restart Backend<br/>PM2 restart]
    
    F --> H[Nginx serves<br/>static files]
    G --> I[Nginx proxies<br/>API requests]
    
    H --> J[https://lubel.me/solar]
    I --> J
    
    style A fill:#e1f5ff
    style C fill:#fce4ec
    style E fill:#fff9c4
    style J fill:#c8e6c9
```

## Data Aggregation Logic

```mermaid
graph TD
    A[Raw 10-min Data<br/>144 readings/day] --> B[Daily Aggregation]
    
    B --> C[Calculate:<br/>- Total kWh<br/>- Avg Power<br/>- Max Power<br/>- Min Power]
    
    C --> D[Daily Data Points]
    
    D --> E[Monthly Aggregation]
    E --> F[Calculate:<br/>- Total kWh<br/>- Avg Daily kWh<br/>- Peak Day]
    
    F --> G[Monthly Data Points]
    
    G --> H[Yearly Aggregation]
    H --> I[Calculate:<br/>- Total kWh<br/>- Avg Monthly kWh<br/>- Peak Month]
    
    I --> J[Yearly Data Points]
    
    style A fill:#ffcdd2
    style D fill:#fff9c4
    style G fill:#c5e1a5
    style J fill:#b2dfdb
```

## Future Phase 2: ROI Analysis

```mermaid
graph TB
    A[Generation Data] --> B[Feed-in Tariff Rates<br/>by Period]
    
    B --> C[Calculate Earnings<br/>kWh × Rate]
    
    C --> D[ROI Dashboard]
    
    D --> E[Total Earnings]
    D --> F[Monthly Breakdown]
    D --> G[Payback Period]
    D --> H[Custom D3.js Viz]
    
    H --> I[Stacked Area Chart<br/>Generation vs Earnings]
    H --> J[Calendar Heatmap<br/>Daily Patterns]
    H --> K[Performance Gauge]
    
    style A fill:#e1f5ff
    style B fill:#fff3e0
    style C fill:#f3e5f5
    style D fill:#c8e6c9
    style H fill:#ffccbc
```

## Technology Stack

```mermaid
graph LR
    subgraph "Frontend"
        A[HTML5]
        B[CSS3]
        C[JavaScript ES6+]
        D[D3.js v7]
    end
    
    subgraph "Backend"
        E[Node.js]
        F[Express.js]
        G[mysql2 driver]
    end
    
    subgraph "Database"
        H[MariaDB 10.x]
        I[SunnyData2 DB]
    end
    
    subgraph "Infrastructure"
        J[Nginx]
        K[Let's Encrypt SSL]
        L[PM2 Process Manager]
    end
    
    subgraph "DevOps"
        M[Git]
        N[GitHub]
        O[Bash Scripts]
    end
    
    A --> C
    B --> C
    C --> D
    
    E --> F
    F --> G
    G --> H
    H --> I
    
    J --> K
    J --> L
    
    M --> N
    N --> O
    
    style A fill:#e3f2fd
    style E fill:#e8f5e9
    style H fill:#f3e5f5
    style J fill:#fff3e0
    style M fill:#fce4ec
```

## File System Layout

```
/home/greg/Development/Sunny2/          # Development directory
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── services/
│   │   │   └── solarDataService.js
│   │   ├── routes/
│   │   │   └── api.js
│   │   └── server.js
│   ├── package.json
│   ├── package-lock.json
│   └── .env
├── frontend/
│   ├── index.html
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
├── deploy.sh
├── .gitignore
├── .env.example
├── README.md
└── nginx-config-example.conf

/srv/www/htdocs/solar/                  # Production directory
├── frontend/                           # Synced from dev
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
└── (backend runs as PM2 service)