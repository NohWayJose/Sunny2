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
     * @param {number} baseRadius - Base radius of the circle (scale position)
     * @param {number} maxValue - Maximum value for scaling
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate
     * @param {number} maxRadialExtension - Maximum radial extension for data (optional, default 100)
     * @returns {Object} {x, y} coordinates
     */
    calculatePosition(t, value, angle, baseRadius, maxValue, centerX, centerY, maxRadialExtension = 100) {
        // Normalize value to radial distance (data extends INWARD from scale)
        const normalizedValue = Math.min((value / maxValue) * maxRadialExtension, maxRadialExtension);
        const radius = baseRadius - normalizedValue; // SUBTRACT to go inward

        if (angle >= 359.9) {
            // Full circle mode - start at bottom (6 o'clock), Jan/Dec at bottom
            const theta = t * 2 * Math.PI + Math.PI / 2;
            return {
                x: centerX + radius * Math.cos(theta),
                y: centerY + radius * Math.sin(theta)
            };
        } else if (angle <= 0.1) {
            // Straight line mode - horizontal left to right
            const lineLength = baseRadius * 2 * Math.PI;
            return {
                x: centerX - lineLength / 2 + t * lineLength,
                y: centerY - normalizedValue // NEGATIVE to go up (inward toward center)
            };
        } else {
            // Interpolated mode (partial arc) - use elliptical geometry for smooth transitions
            const angleRad = (angle / 360) * 2 * Math.PI;
            const centerAngle = 3 * Math.PI / 2; // 270° = 12 o'clock
            const theta = t * angleRad + centerAngle - angleRad / 2;
            
            // Calculate ellipse parameters to maintain minimum 75° angles at transitions
            // Inner ellipse flattens more aggressively than outer ellipse
            const blend = angle / 360;
            
            // Calculate compression factor based on radius
            // Smaller radius (inner) = more compression
            // Larger radius (outer) = less compression
            // This creates smoother transitions at the inner edge
            const radiusRatio = radius / baseRadius; // 0 to ~1.4 (inner to outer)
            
            // Compression formula:
            // Inner (radiusRatio ≈ 0.6): compress to 10%
            // Base (radiusRatio = 1.0): compress to 25%
            // Outer (radiusRatio ≈ 1.4): compress to 35%
            const minCompression = 0.10 + (radiusRatio - 0.6) * 0.25; // Varies with radius
            const compressionFactor = minCompression + (1.0 - minCompression) * blend;
            
            // Calculate ellipse radii
            const radiusX = radius; // Horizontal radius stays constant
            const radiusY = radius * compressionFactor; // Vertical radius compressed
            
            // Calculate elliptical arc position
            const arcX = centerX + radiusX * Math.cos(theta);
            const arcY = centerY + radiusY * Math.sin(theta);
            
            // Calculate line position (horizontal)
            const lineLength = baseRadius * 2 * Math.PI; // Full circumference
            const lineX = centerX - lineLength / 2 + t * lineLength;
            const lineY = centerY - normalizedValue; // NEGATIVE to go up (inward toward center)
            
            // Blend between elliptical arc and line based on angle
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
                // Full circle mode - start at bottom (6 o'clock)
                const theta = t * 2 * Math.PI + Math.PI / 2;
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
                // Straight line mode - horizontal
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
                // Interpolated mode - use elliptical geometry (same as borders)
                const blend = angle / 360;
                const angleRad = (angle / 360) * 2 * Math.PI;
                const centerAngle = 3 * Math.PI / 2; // 270° = 12 o'clock
                const theta = t * angleRad + centerAngle - angleRad / 2;
                const innerRadius = baseRadius - tickLength / 2;
                const outerRadius = baseRadius + tickLength / 2;
                
                // Calculate elliptical compression for each radius
                
                // Inner tick end (more compressed)
                const innerRatio = innerRadius / baseRadius;
                const innerMinComp = 0.10 + (innerRatio - 0.6) * 0.25;
                const innerCompression = innerMinComp + (1.0 - innerMinComp) * blend;
                const innerRadiusY = innerRadius * innerCompression;
                
                // Outer tick end (less compressed)
                const outerRatio = outerRadius / baseRadius;
                const outerMinComp = 0.10 + (outerRatio - 0.6) * 0.25;
                const outerCompression = outerMinComp + (1.0 - outerMinComp) * blend;
                const outerRadiusY = outerRadius * outerCompression;
                
                // Label position (slightly more compressed than outer)
                const labelRadius = baseRadius + tickLength + 15;
                const labelRatio = labelRadius / baseRadius;
                const labelMinComp = 0.10 + (labelRatio - 0.6) * 0.25;
                const labelCompression = labelMinComp + (1.0 - labelMinComp) * blend;
                const labelRadiusY = labelRadius * labelCompression;
                
                // Elliptical arc positions
                const arcX1 = centerX + innerRadius * Math.cos(theta);
                const arcY1 = centerY + innerRadiusY * Math.sin(theta);
                const arcX2 = centerX + outerRadius * Math.cos(theta);
                const arcY2 = centerY + outerRadiusY * Math.sin(theta);
                const arcLabelX = centerX + labelRadius * Math.cos(theta);
                const arcLabelY = centerY + labelRadiusY * Math.sin(theta);
                
                // Line position (horizontal)
                // Use full circumference as line length to maintain consistent scale
                const lineLength = baseRadius * 2 * Math.PI; // Full circumference
                const lineX = centerX - lineLength / 2 + t * lineLength;
                const lineY1 = centerY - tickLength / 2;
                const lineY2 = centerY + tickLength / 2;
                const lineLabelX = lineX;
                const lineLabelY = centerY + tickLength + 15;
                
                // Blend between arc and line positions
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

    calculateBasePath(angle, baseRadius, centerX, centerY) {
        if (angle >= 359.9) {
            // Full circle - start at bottom (6 o'clock position)
            return `M ${centerX},${centerY + baseRadius}
                    A ${baseRadius},${baseRadius} 0 1,1 ${centerX},${centerY - baseRadius}
                    A ${baseRadius},${baseRadius} 0 1,1 ${centerX},${centerY + baseRadius}`;
        } else if (angle <= 0.1) {
            // Straight line - horizontal
            const lineLength = baseRadius * 2 * Math.PI;
            return `M ${centerX - lineLength / 2},${centerY}
                    L ${centerX + lineLength / 2},${centerY}`;
        } else {
            // Partial arc - use morphed geometry (same as ticks and annulus)
            const numPoints = 100;
            let pathData = '';
            
            for (let i = 0; i <= numPoints; i++) {
                const t = i / numPoints;
                const pos = this.calculatePosition(t, 0, angle, baseRadius, 1, centerX, centerY);
                
                if (i === 0) {
                    pathData = `M ${pos.x},${pos.y}`;
                } else {
                    pathData += ` L ${pos.x},${pos.y}`;
                }
            }
            
            return pathData;
        }
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
            // Full circle - start at left (9 o'clock position)
            return `M ${centerX - baseRadius},${centerY}
                    A ${baseRadius},${baseRadius} 0 1,1 ${centerX + baseRadius},${centerY}
                    A ${baseRadius},${baseRadius} 0 1,1 ${centerX - baseRadius},${centerY}`;
        } else if (angle <= 0.1) {
            // Straight line - horizontal
            const lineLength = baseRadius * 2 * Math.PI;
            return `M ${centerX - lineLength / 2},${centerY}
                    L ${centerX + lineLength / 2},${centerY}`;
        } else {
            // Partial arc - unfolds horizontally from left
            const angleRad = (angle / 360) * 2 * Math.PI;
            const startAngle = Math.PI - angleRad / 2;
            const endAngle = Math.PI + angleRad / 2;
            
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
