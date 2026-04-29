// Solar Dashboard — annular visualisation
// Copyright (C) 2024-2026 Greg Lubel
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

/**
 * Logarithmic Slider
 * Manages the time window slider with logarithmic scaling
 */

class LogSlider {
    constructor(sliderId, displayId, geometryEngine) {
        this.slider = document.getElementById(sliderId);
        this.display = document.getElementById(displayId);
        this.geometryEngine = geometryEngine;
        this.listeners = [];
        
        // Initialize
        this.initialize();
    }

    /**
     * Initialize the slider
     */
    initialize() {
        if (!this.slider) {
            console.error('Slider element not found');
            return;
        }

        // Set initial value
        this.slider.value = 100; // Start at 1 year
        this.updateDisplay();

        // Attach event listener
        this.slider.addEventListener('input', () => {
            this.updateDisplay();
            this.notifyListeners();
        });
    }

    /**
     * Update the display text
     */
    updateDisplay() {
        const timeWindowMs = this.getTimeWindow();
        const formatted = this.geometryEngine.formatTimeWindow(timeWindowMs);
        
        if (this.display) {
            this.display.textContent = formatted;
        }
    }

    /**
     * Get the current time window in milliseconds
     * @returns {number} Time window in milliseconds
     */
    getTimeWindow() {
        const sliderValue = parseFloat(this.slider.value);
        return this.geometryEngine.sliderToTimeWindow(sliderValue);
    }

    /**
     * Set the time window
     * @param {number} timeWindowMs - Time window in milliseconds
     */
    setTimeWindow(timeWindowMs) {
        const sliderValue = this.geometryEngine.timeWindowToSlider(timeWindowMs);
        this.slider.value = sliderValue;
        this.updateDisplay();
        this.notifyListeners();
    }

    /**
     * Get the current curvature angle
     * @returns {number} Angle in degrees (0-360)
     */
    getCurvature() {
        const timeWindowMs = this.getTimeWindow();
        return this.geometryEngine.calculateCurvature(timeWindowMs);
    }

    /**
     * Add a listener for slider changes
     * @param {Function} callback - Callback function(timeWindowMs, curvature)
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
     * Notify all listeners of slider change
     */
    notifyListeners() {
        const timeWindowMs = this.getTimeWindow();
        const curvature = this.getCurvature();
        
        this.listeners.forEach(callback => {
            callback(timeWindowMs, curvature);
        });
    }

    /**
     * Get slider value (0-100)
     * @returns {number} Slider value
     */
    getValue() {
        return parseFloat(this.slider.value);
    }

    /**
     * Set slider value (0-100)
     * @param {number} value - Slider value
     */
    setValue(value) {
        this.slider.value = Math.max(0, Math.min(100, value));
        this.updateDisplay();
        this.notifyListeners();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LogSlider;
}

// Made with Bob
