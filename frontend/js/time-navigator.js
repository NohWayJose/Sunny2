/**
 * Time Navigator
 * Manages the 5-slider time navigation system with synchronized movement
 */

class TimeNavigator {
    constructor() {
        // Initialize to current date at 12:00 (noon)
        this.currentTimestamp = new Date();
        this.currentTimestamp.setHours(12, 0, 0, 0);
        this.listeners = [];
        
        // Month names for display
        this.monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // Initialize sliders
        this.initializeSliders();
    }

    /**
     * Initialize all slider elements and attach event listeners
     */
    initializeSliders() {
        this.sliders = {
            year: document.getElementById('year-slider'),
            month: document.getElementById('month-slider'),
            week: document.getElementById('week-slider'),
            day: document.getElementById('day-slider'),
            hour: document.getElementById('hour-slider')
        };

        this.displays = {
            year: document.getElementById('year-value'),
            month: document.getElementById('month-value'),
            week: document.getElementById('week-value'),
            day: document.getElementById('day-value'),
            hour: document.getElementById('hour-value')
        };

        // Check if all required elements exist
        const allSlidersExist = Object.values(this.sliders).every(slider => slider !== null);
        const allDisplaysExist = Object.values(this.displays).every(display => display !== null);
        
        if (!allSlidersExist || !allDisplaysExist) {
            console.error('Time Navigator: Missing required slider or display elements');
            throw new Error('Time Navigator initialization failed: missing DOM elements');
        }

        // Attach event listeners
        this.sliders.year.addEventListener('input', () => this.onYearChange());
        this.sliders.month.addEventListener('input', () => this.onMonthChange());
        this.sliders.week.addEventListener('input', () => this.onWeekChange());
        this.sliders.day.addEventListener('input', () => this.onDayChange());
        this.sliders.hour.addEventListener('input', () => this.onHourChange());

        // Set initial values
        this.updateFromTimestamp(this.currentTimestamp);
    }

    /**
     * Handle year slider change
     */
    onYearChange() {
        const year = parseInt(this.sliders.year.value);
        const current = new Date(this.currentTimestamp);
        current.setFullYear(year);
        this.updateFromTimestamp(current);
        this.notifyListeners();
    }

    /**
     * Handle month slider change
     */
    onMonthChange() {
        const month = parseInt(this.sliders.month.value) - 1; // 0-indexed
        const current = new Date(this.currentTimestamp);
        current.setMonth(month);
        this.updateFromTimestamp(current);
        this.notifyListeners();
    }

    /**
     * Handle week slider change
     */
    onWeekChange() {
        const week = parseInt(this.sliders.week.value);
        const year = parseInt(this.sliders.year.value);
        
        // Calculate date from year and week number
        const jan1 = new Date(year, 0, 1);
        const daysOffset = (week - 1) * 7;
        const targetDate = new Date(jan1.getTime() + daysOffset * 24 * 60 * 60 * 1000);
        
        // Preserve hour
        targetDate.setHours(this.currentTimestamp.getHours());
        
        this.updateFromTimestamp(targetDate);
        this.notifyListeners();
    }

    /**
     * Handle day slider change
     */
    onDayChange() {
        const day = parseInt(this.sliders.day.value);
        const current = new Date(this.currentTimestamp);
        current.setDate(day);
        this.updateFromTimestamp(current);
        this.notifyListeners();
    }

    /**
     * Handle hour slider change
     */
    onHourChange() {
        const hour = parseInt(this.sliders.hour.value);
        const current = new Date(this.currentTimestamp);
        current.setHours(hour);
        this.updateFromTimestamp(current);
        this.notifyListeners();
    }

    /**
     * Update all sliders and displays from a timestamp
     * @param {Date} timestamp - The timestamp to display
     */
    updateFromTimestamp(timestamp) {
        this.currentTimestamp = new Date(timestamp);
        
        // Update year
        this.sliders.year.value = timestamp.getFullYear();
        this.displays.year.textContent = timestamp.getFullYear();
        
        // Update month
        const month = timestamp.getMonth() + 1;
        this.sliders.month.value = month;
        this.displays.month.textContent = this.monthNames[timestamp.getMonth()];
        
        // Update week (ISO week number)
        const weekNum = this.getWeekNumber(timestamp);
        this.sliders.week.value = weekNum;
        this.displays.week.textContent = weekNum;
        
        // Update day
        const day = timestamp.getDate();
        this.sliders.day.value = day;
        this.displays.day.textContent = day;
        
        // Update day slider max based on month
        const daysInMonth = new Date(timestamp.getFullYear(), timestamp.getMonth() + 1, 0).getDate();
        this.sliders.day.max = daysInMonth;
        
        // Update hour
        const hour = timestamp.getHours();
        this.sliders.hour.value = hour;
        this.displays.hour.textContent = `${hour.toString().padStart(2, '0')}:00`;
        
        // Update current time display
        const currentTimeDisplay = document.getElementById('current-time');
        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = this.formatTimestamp(timestamp);
        }
    }

    /**
     * Get ISO week number for a date
     * @param {Date} date - The date
     * @returns {number} Week number (1-52)
     */
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return weekNo;
    }

    /**
     * Format timestamp for display
     * @param {Date} timestamp - The timestamp
     * @returns {string} Formatted string
     */
    formatTimestamp(timestamp) {
        const year = timestamp.getFullYear();
        const month = (timestamp.getMonth() + 1).toString().padStart(2, '0');
        const day = timestamp.getDate().toString().padStart(2, '0');
        const hour = timestamp.getHours().toString().padStart(2, '0');
        const minute = timestamp.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day} ${hour}:${minute}`;
    }

    /**
     * Set the current timestamp programmatically
     * @param {Date} timestamp - The new timestamp
     */
    setTimestamp(timestamp) {
        this.updateFromTimestamp(timestamp);
        this.notifyListeners();
    }

    /**
     * Get the current timestamp
     * @returns {Date} Current timestamp
     */
    getTimestamp() {
        return new Date(this.currentTimestamp);
    }

    /**
     * Add a listener for timestamp changes
     * @param {Function} callback - Callback function(timestamp)
     */
    addListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * Remove a listener
     * @param {Function} callback - The callback to remove
     */
    removeListener(callback) {
        this.listeners = this.listeners.filter(cb => cb !== callback);
    }

    /**
     * Notify all listeners of timestamp change
     */
    notifyListeners() {
        this.listeners.forEach(callback => {
            callback(this.getTimestamp());
        });
    }

    /**
     * Enable or disable the year slider
     * @param {boolean} enabled - Whether to enable the slider
     */
    setYearSliderEnabled(enabled) {
        this.sliders.year.disabled = !enabled;
        this.sliders.year.style.opacity = enabled ? '1' : '0.5';
    }

    /**
     * Get date range for a given time window
     * For year-long windows, aligns to calendar year (Jan 1 - Dec 31)
     * For shorter windows, centers on current timestamp
     * @param {number} windowSizeMs - Time window in milliseconds
     * @returns {Object} {start, end} Date objects
     */
    getDateRange(windowSizeMs) {
        const oneYear = 365 * 24 * 60 * 60 * 1000;
        
        // For year-long windows (>= 11 months), align to calendar year
        if (windowSizeMs >= oneYear * 0.9) {
            const year = this.currentTimestamp.getFullYear();
            return {
                start: new Date(year, 0, 1, 0, 0, 0, 0),  // Jan 1st
                end: new Date(year, 11, 31, 23, 59, 59, 999)  // Dec 31st
            };
        }
        
        // For shorter windows, center on current timestamp
        const center = this.currentTimestamp.getTime();
        const halfWindow = windowSizeMs / 2;
        
        return {
            start: new Date(center - halfWindow),
            end: new Date(center + halfWindow)
        };
    }

    /**
     * Format date for API calls (YYYY-MM-DD)
     * @param {Date} date - The date
     * @returns {string} Formatted date string
     */
    formatDateForAPI(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Format datetime for API calls (YYYY-MM-DD HH:mm:ss)
     * @param {Date} date - The date
     * @returns {string} Formatted datetime string
     */
    formatDateTimeForAPI(date) {
        const dateStr = this.formatDateForAPI(date);
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');
        const second = date.getSeconds().toString().padStart(2, '0');
        return `${dateStr} ${hour}:${minute}:${second}`;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimeNavigator;
}

// Made with Bob
