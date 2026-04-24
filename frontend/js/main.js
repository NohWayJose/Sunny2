/**
 * Main Dashboard Controller
 * Handles UI interactions and coordinates chart rendering
 */

// Global state
let currentView = 'monthly';
let currentData = null;

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Solar Dashboard initializing...');
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize with default date range (last 12 months)
    await initializeDashboard();
});

/**
 * Set up event listeners for UI controls
 */
function setupEventListeners() {
    const viewType = document.getElementById('viewType');
    const updateBtn = document.getElementById('updateBtn');
    const resetBtn = document.getElementById('resetBtn');

    viewType.addEventListener('change', (e) => {
        currentView = e.target.value;
        updateDateInputs();
    });

    updateBtn.addEventListener('click', () => {
        loadData();
    });

    resetBtn.addEventListener('click', () => {
        resetToDefaults();
    });
}

/**
 * Initialize dashboard with default settings
 */
async function initializeDashboard() {
    try {
        // Set default view to monthly
        currentView = 'monthly';
        document.getElementById('viewType').value = 'monthly';
        
        // Set default date range
        resetToDefaults();
        
        // Load initial data
        await loadData();
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        showError('Failed to initialize dashboard. Please refresh the page.');
    }
}

/**
 * Reset to default date range based on view type
 */
function resetToDefaults() {
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    
    const today = new Date();
    let start, end;

    switch (currentView) {
        case 'daily':
            // Last 30 days
            start = new Date(today);
            start.setDate(start.getDate() - 30);
            end = today;
            startDate.value = formatDate(start);
            endDate.value = formatDate(today);
            break;
            
        case 'monthly':
            // Last 12 months
            start = new Date(today);
            start.setMonth(start.getMonth() - 12);
            end = today;
            startDate.value = formatMonth(start);
            endDate.value = formatMonth(today);
            break;
            
        case 'yearly':
            // Last 10 years
            start = new Date(today);
            start.setFullYear(start.getFullYear() - 10);
            end = today;
            startDate.value = start.getFullYear().toString();
            endDate.value = today.getFullYear().toString();
            break;
    }
    
    updateDateInputs();
}

/**
 * Update date input types based on view
 */
function updateDateInputs() {
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    
    switch (currentView) {
        case 'daily':
            startDate.type = 'date';
            endDate.type = 'date';
            break;
        case 'monthly':
            startDate.type = 'month';
            endDate.type = 'month';
            break;
        case 'yearly':
            startDate.type = 'number';
            startDate.min = '2012';
            startDate.max = new Date().getFullYear().toString();
            endDate.type = 'number';
            endDate.min = '2012';
            endDate.max = new Date().getFullYear().toString();
            break;
    }
}

/**
 * Load data based on current view and date range
 */
async function loadData() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        showError('Please select both start and end dates');
        return;
    }
    
    showLoading();
    hideError();
    
    try {
        let result;
        
        switch (currentView) {
            case 'daily':
                result = await getDailyData(startDate, endDate);
                break;
            case 'monthly':
                result = await getMonthlyData(startDate, endDate);
                break;
            case 'yearly':
                result = await getYearlyData(startDate, endDate);
                break;
        }
        
        currentData = result;
        updateStats(result.summary);
        renderChart(result.data);
        hideLoading();
        
    } catch (error) {
        console.error('Error loading data:', error);
        hideLoading();
        showError(`Failed to load data: ${error.message}`);
    }
}

/**
 * Update statistics display
 */
function updateStats(summary) {
    const totalGeneration = document.getElementById('totalGeneration');
    const avgGeneration = document.getElementById('avgGeneration');
    const peakPeriod = document.getElementById('peakPeriod');
    const peakValue = document.getElementById('peakValue');
    const dataPoints = document.getElementById('dataPoints');
    
    totalGeneration.textContent = parseFloat(summary.totalGeneration).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    let avgLabel, avgValue, peakLabel, peakVal, points;
    
    switch (currentView) {
        case 'daily':
            avgLabel = 'kWh/day';
            avgValue = summary.avgDailyGeneration || 0;
            peakLabel = summary.peakDay?.date || 'N/A';
            peakVal = summary.peakDay?.totalKwh ? `${summary.peakDay.totalKwh} kWh` : 'N/A';
            points = summary.totalDays || 0;
            break;
        case 'monthly':
            avgLabel = 'kWh/month';
            avgValue = summary.avgMonthlyGeneration || 0;
            peakLabel = summary.peakMonth?.month || 'N/A';
            peakVal = summary.peakMonth?.totalKwh ? `${summary.peakMonth.totalKwh} kWh` : 'N/A';
            points = summary.totalMonths || 0;
            break;
        case 'yearly':
            avgLabel = 'kWh/year';
            avgValue = summary.avgYearlyGeneration || 0;
            peakLabel = summary.peakYear?.year || 'N/A';
            peakVal = summary.peakYear?.totalKwh ? `${summary.peakYear.totalKwh} kWh` : 'N/A';
            points = summary.totalYears || 0;
            break;
    }
    
    avgGeneration.textContent = parseFloat(avgValue).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    document.querySelector('#avgGeneration').nextElementSibling.textContent = avgLabel;
    peakPeriod.textContent = peakLabel;
    peakValue.textContent = peakVal;
    dataPoints.textContent = points;
}

/**
 * Render appropriate chart based on view type
 */
function renderChart(data) {
    // Remove any existing tooltips
    d3.selectAll('.tooltip').remove();
    
    switch (currentView) {
        case 'daily':
            createDailyChart(data);
            break;
        case 'monthly':
            createMonthlyChart(data);
            break;
        case 'yearly':
            createYearlyChart(data);
            break;
    }
}

/**
 * Show loading indicator
 */
function showLoading() {
    document.getElementById('loadingIndicator').style.display = 'flex';
    document.getElementById('chart').style.display = 'none';
}

/**
 * Hide loading indicator
 */
function hideLoading() {
    document.getElementById('loadingIndicator').style.display = 'none';
    document.getElementById('chart').style.display = 'block';
}

/**
 * Show error message
 */
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    errorText.textContent = message;
    errorMessage.style.display = 'flex';
    document.getElementById('chart').style.display = 'none';
}

/**
 * Hide error message
 */
function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format date to YYYY-MM
 */
function formatMonth(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

// Handle window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (currentData && currentData.data) {
            renderChart(currentData.data);
        }
    }, 250);
});

// Log when dashboard is ready
console.log('Solar Dashboard loaded successfully');

// Made with Bob
