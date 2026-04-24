/**
 * API Client for Solar Dashboard
 * Handles all API requests to the backend
 */

// API base URL - adjust based on environment
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : '/solar/api';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * Get daily aggregated solar data
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Object>}
 */
async function getDailyData(startDate, endDate) {
    const params = new URLSearchParams({ start: startDate, end: endDate });
    return fetchAPI(`/solar/daily?${params}`);
}

/**
 * Get monthly aggregated solar data
 * @param {string} startMonth - Start month (YYYY-MM)
 * @param {string} endMonth - End month (YYYY-MM)
 * @returns {Promise<Object>}
 */
async function getMonthlyData(startMonth, endMonth) {
    const params = new URLSearchParams({ start: startMonth, end: endMonth });
    return fetchAPI(`/solar/monthly?${params}`);
}

/**
 * Get yearly aggregated solar data
 * @param {number} startYear - Start year (YYYY)
 * @param {number} endYear - End year (YYYY)
 * @returns {Promise<Object>}
 */
async function getYearlyData(startYear, endYear) {
    const params = new URLSearchParams({ start: startYear, end: endYear });
    return fetchAPI(`/solar/yearly?${params}`);
}

/**
 * Get raw solar data (10-minute intervals)
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {number} limit - Number of records
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Object>}
 */
async function getRawData(startDate, endDate, limit = 1000, offset = 0) {
    const params = new URLSearchParams({ 
        start: startDate, 
        end: endDate,
        limit,
        offset
    });
    return fetchAPI(`/solar/raw?${params}`);
}

/**
 * Get the date range of available data
 * @returns {Promise<Object>}
 */
async function getDataRange() {
    return fetchAPI('/solar/range');
}

/**
 * Health check
 * @returns {Promise<Object>}
 */
async function healthCheck() {
    return fetchAPI('/health');
}

/**
 * Format date to YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format date to YYYY-MM
 * @param {Date} date
 * @returns {string}
 */
function formatMonth(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Parse date string to Date object
 * @param {string} dateStr
 * @returns {Date}
 */
function parseDate(dateStr) {
    return new Date(dateStr);
}

/**
 * Get date range for last N days
 * @param {number} days
 * @returns {Object} { start, end }
 */
function getLastNDays(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    return {
        start: formatDate(start),
        end: formatDate(end)
    };
}

/**
 * Get date range for last N months
 * @param {number} months
 * @returns {Object} { start, end }
 */
function getLastNMonths(months) {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    return {
        start: formatMonth(start),
        end: formatMonth(end)
    };
}

/**
 * Get date range for last N years
 * @param {number} years
 * @returns {Object} { start, end }
 */
function getLastNYears(years) {
    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - years);
    return {
        start: start.getFullYear().toString(),
        end: end.getFullYear().toString()
    };
}

// Made with Bob
