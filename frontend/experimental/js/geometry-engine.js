/**
 * Geometry Engine
 * Handles circle-to-line morphing calculations for the annular visualization
 */

class GeometryEngine {
    constructor() {
        // Constants
        this.ONE_YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
        this.ONE_HOUR_MS = 60 * 60 * 1000;
    }

    /**
     * Calculate the curvature angle based on time window size
     * @param {number} windowSizeMs - Time window in milliseconds
     * @returns {number} Angle in degrees (0-360)
     */
    calculateCurvature(windowSizeMs) {
        // Linear interpolation between 0° (1 hour) and 360° (1 year)
        const ratio = Math.min(1, Math.max(0, windowSizeMs / this.ONE_YEAR_MS));
        return ratio * 360;
    }

    /**
     * Calculate position for a data point in the morphing visualization
     * @param {number} t - Normalized time position (0 to 1)
     * @param {number} value - Data value (kWh)
     * @param {number} angle - Current curvature angle (0-360)
     * @param {number} baseRadius - Base radius of the circle
     * @param {number} maxValue - Maximum value for scaling
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate
     * @returns {Object} {x, y} coordinates
     */
    calculatePosition(t, value, angle, baseRadius, maxValue, centerX, centerY) {
        // Normalize value to radial distance
        const radialScale = 100; // Maximum radial extension in pixels
        const normalizedValue = (value / maxValue) * radialScale;
        const radius = baseRadius + normalizedValue;

        if (angle >= 359.9) {
            // Full circle mode
            const theta = t * 2 * Math.PI;
            return {
                x: centerX + radius * Math.cos(theta - Math.PI / 2),
                y: centerY + radius * Math.sin(theta - Math.PI / 2)
            };
        } else if (angle <= 0.1) {
            // Straight line mode
            const lineLength = baseRadius * 2 * Math.PI;
            return {
                x: centerX - lineLength / 2 + t * lineLength,
                y: centerY - normalizedValue
            };
        } else {
            // Interpolated mode (partial circle)
            const angleRad = (angle / 360) * 2 * Math.PI;
            const theta = t * angleRad;
            
            // Calculate arc position
            const arcX = centerX + radius * Math.cos(theta - angleRad / 2);
            const arcY = centerY + radius * Math.sin(theta - angleRad / 2);
            
            // Calculate line position
            const lineLength = baseRadius * angleRad;
            const lineX = centerX - lineLength / 2 + t * lineLength;
            const lineY = centerY - normalizedValue;
            
            // Blend between arc and line based on angle
            const blend = angle / 360;
            return {
                x: lineX + (arcX - lineX) * blend,
                y: lineY + (arcY - lineY) * blend
            };
        }
    }

    /**
     * Calculate tick mark positions
     * @param {number} angle - Current curvature angle (0-360)
     * @param {number} baseRadius - Base radius of the circle
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate
     * @param {Array} tickPositions - Array of normalized positions (0-1) for ticks
     * @returns {Array} Array of tick objects with start and end coordinates
     */
    calculateTickPositions(angle, baseRadius, centerX, centerY, tickPositions) {
        const ticks = [];
        const tickLength = 10; // Length of tick marks in pixels
        
        for (const t of tickPositions) {
            if (angle >= 359.9) {
                // Full circle mode
                const theta = t * 2 * Math.PI - Math.PI / 2;
                const innerRadius = baseRadius - tickLength / 2;
                const outerRadius = baseRadius + tickLength / 2;
                
                ticks.push({
                    x1: centerX + innerRadius * Math.cos(theta),
                    y1: centerY + innerRadius * Math.sin(theta),
                    x2: centerX + outerRadius * Math.cos(theta),
                    y2: centerY + outerRadius * Math.sin(theta),
                    labelX: centerX + (baseRadius + tickLength + 15) * Math.cos(theta),
                    labelY: centerY + (baseRadius + tickLength + 15) * Math.sin(theta),
                    angle: theta
                });
            } else if (angle <= 0.1) {
                // Straight line mode
                const lineLength = baseRadius * 2 * Math.PI;
                const x = centerX - lineLength / 2 + t * lineLength;
                
                ticks.push({
                    x1: x,
                    y1: centerY - tickLength / 2,
                    x2: x,
                    y2: centerY + tickLength / 2,
                    labelX: x,
                    labelY: centerY + tickLength + 15,
                    angle: 0
                });
            } else {
                // Interpolated mode
                const angleRad = (angle / 360) * 2 * Math.PI;
                const theta = t * angleRad - angleRad / 2;
                const innerRadius = baseRadius - tickLength / 2;
                const outerRadius = baseRadius + tickLength / 2;
                
                // Arc position
                const arcX1 = centerX + innerRadius * Math.cos(theta);
                const arcY1 = centerY + innerRadius * Math.sin(theta);
                const arcX2 = centerX + outerRadius * Math.cos(theta);
                const arcY2 = centerY + outerRadius * Math.sin(theta);
                const arcLabelX = centerX + (baseRadius + tickLength + 15) * Math.cos(theta);
                const arcLabelY = centerY + (baseRadius + tickLength + 15) * Math.sin(theta);
                
                // Line position
                const lineLength = baseRadius * angleRad;
                const lineX = centerX - lineLength / 2 + t * lineLength;
                const lineY1 = centerY - tickLength / 2;
                const lineY2 = centerY + tickLength / 2;
                const lineLabelX = lineX;
                const lineLabelY = centerY + tickLength + 15;
                
                // Blend
                const blend = angle / 360;
                ticks.push({
                    x1: lineX + (arcX1 - lineX) * blend,
                    y1: lineY1 + (arcY1 - lineY1) * blend,
                    x2: lineX + (arcX2 - lineX) * blend,
                    y2: lineY2 + (arcY2 - lineY2) * blend,
                    labelX: lineLabelX + (arcLabelX - lineLabelX) * blend,
                    labelY: lineLabelY + (arcLabelY - lineLabelY) * blend,
                    angle: theta
                });
            }
        }
        
        return ticks;
    }

    /**
     * Calculate the base circle path for the visualization background
     * @param {number} angle - Current curvature angle (0-360)
     * @param {number} baseRadius - Base radius of the circle
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate
     * @returns {string} SVG path string
     */
    calculateBasePath(angle, baseRadius, centerX, centerY) {
        if (angle >= 359.9) {
            // Full circle
            return `M ${centerX - baseRadius},${centerY}
                    A ${baseRadius},${baseRadius} 0 1,1 ${centerX + baseRadius},${centerY}
                    A ${baseRadius},${baseRadius} 0 1,1 ${centerX - baseRadius},${centerY}`;
        } else if (angle <= 0.1) {
            // Straight line
            const lineLength = baseRadius * 2 * Math.PI;
            return `M ${centerX - lineLength / 2},${centerY}
                    L ${centerX + lineLength / 2},${centerY}`;
        } else {
            // Partial arc
            const angleRad = (angle / 360) * 2 * Math.PI;
            const startAngle = -angleRad / 2;
            const endAngle = angleRad / 2;
            
            const startX = centerX + baseRadius * Math.cos(startAngle);
            const startY = centerY + baseRadius * Math.sin(startAngle);
            const endX = centerX + baseRadius * Math.cos(endAngle);
            const endY = centerY + baseRadius * Math.sin(endAngle);
            
            const largeArcFlag = angleRad > Math.PI ? 1 : 0;
            
            return `M ${startX},${startY}
                    A ${baseRadius},${baseRadius} 0 ${largeArcFlag},1 ${endX},${endY}`;
        }
    }

    /**
     * Convert time window slider value (0-100) to milliseconds (logarithmic scale)
     * @param {number} sliderValue - Slider value (0-100)
     * @returns {number} Time window in milliseconds
     */
    sliderToTimeWindow(sliderValue) {
        // Logarithmic scale from 1 hour to 1 year
        const minLog = Math.log(this.ONE_HOUR_MS);
        const maxLog = Math.log(this.ONE_YEAR_MS);
        const scale = (maxLog - minLog) / 100;
        return Math.exp(minLog + scale * sliderValue);
    }

    /**
     * Convert time window in milliseconds to slider value (0-100)
     * @param {number} timeWindowMs - Time window in milliseconds
     * @returns {number} Slider value (0-100)
     */
    timeWindowToSlider(timeWindowMs) {
        const minLog = Math.log(this.ONE_HOUR_MS);
        const maxLog = Math.log(this.ONE_YEAR_MS);
        const scale = (maxLog - minLog) / 100;
        return (Math.log(timeWindowMs) - minLog) / scale;
    }

    /**
     * Format time window for display
     * @param {number} timeWindowMs - Time window in milliseconds
     * @returns {string} Formatted string
     */
    formatTimeWindow(timeWindowMs) {
        const days = timeWindowMs / (24 * 60 * 60 * 1000);
        
        if (days >= 365) {
            return '1 Year';
        } else if (days >= 30) {
            return `${Math.round(days / 30)} Months`;
        } else if (days >= 7) {
            return `${Math.round(days / 7)} Weeks`;
        } else if (days >= 1) {
            return `${Math.round(days)} Days`;
        } else {
            const hours = timeWindowMs / (60 * 60 * 1000);
            return `${Math.round(hours)} Hours`;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeometryEngine;
}

// Made with Bob
