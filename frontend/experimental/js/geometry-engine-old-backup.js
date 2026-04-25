/**
 * Geometry Engine
 * Handles circle-to-line morphing calculations for the annular visualization
 *
 * New approach (simpler):
 * - 1 year to 6 months (360° to 180°): Keep circular geometry
 * - 6 months to 1 month (180° to 30°): Move arc centers downward, flattening arcs
 * - Top arc always passes through 12 o'clock
 * - Bottom arc endpoints extend horizontally
 * - Width stays constant (original outer diameter)
 */

class GeometryEngine {
    constructor() {
        // Constants
        this.ONE_YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
        this.ONE_HOUR_MS = 60 * 60 * 1000;
    }

    /**
     * Calculate arc center Y-offset for flattening effect
     * From 6 months (180°) to 1 month (30°), move arc centers downward
     * @param {number} angle - Current curvature angle (0-360)
     * @param {number} outerRadius - Outer radius
     * @returns {Object} {outerOffset, innerOffset} Y-offsets for arc centers
     */
    calculateArcCenterOffsets(angle, outerRadius, innerRadius) {
        if (angle >= 180) {
            // 6 months to 1 year: no offset, keep circular
            return { outer: 0, inner: 0 };
        }
        
        // From 180° (6 months) to 30° (1 month): progressively move centers down
        // Use non-linear easing for smooth transition
        const t = (180 - angle) / 150; // 0 at 180°, 1 at 30°
        const eased = t * t; // Quadratic easing
        
        // Move centers down to flatten arcs
        // Outer arc: move down by outerRadius * eased
        // Inner arc: move down by innerRadius * eased (proportional)
        return {
            outer: outerRadius * eased,
            inner: innerRadius * eased
        };
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
     * Calculate position for a data point using arc-center-shift approach
     * Three modes:
     * 1. angle >= 180° (6mo-1yr): Circular arc
     * 2. 30° < angle < 180° (1mo-6mo): Arc with shifted center (flattening)
     * 3. angle <= 30° (< 1mo): Rectangle
     *
     * @param {number} t - Normalized time position (0 to 1)
     * @param {number} value - Data value (kWh)
     * @param {number} angle - Current curvature angle (0-360)
     * @param {number} outerRadius - Outer border radius
     * @param {number} innerRadius - Inner border radius
     * @param {number} maxValue - Maximum value for scaling
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate (original, before offset)
     * @returns {Object} {x, y} coordinates
     */
    calculatePosition(t, value, angle, outerRadius, innerRadius, maxValue, centerX, centerY) {
        // Calculate how far into the annulus this data point should be
        // value=0 -> at outer radius, value=maxValue -> at inner radius
        const annulusWidth = outerRadius - innerRadius;
        const normalizedValue = Math.min(value / maxValue, 1.0);
        const dataRadius = outerRadius - (normalizedValue * annulusWidth);
        
        if (angle >= 180) {
            // Mode 1: 6 months to 1 year - circular arc centered at 12 o'clock
            const angleRad = (angle / 360) * 2 * Math.PI;
            const centerAngle = 3 * Math.PI / 2; // 270° = 12 o'clock
            const theta = t * angleRad + centerAngle - angleRad / 2;
            
            return {
                x: centerX + dataRadius * Math.cos(theta),
                y: centerY + dataRadius * Math.sin(theta)
            };
        } else if (angle > 30) {
            // Mode 2: 1 month to 6 months - arc with shifted center (flattening)
            const offsets = this.calculateArcCenterOffsets(angle, outerRadius, innerRadius);
            const dataOffset = outerRadius > 0 ? offsets.outer * (dataRadius / outerRadius) : 0;
            
            const angleRad = (angle / 360) * 2 * Math.PI;
            const centerAngle = 3 * Math.PI / 2; // 270° = 12 o'clock
            const theta = t * angleRad + centerAngle - angleRad / 2;
            
            // Arc center is shifted down
            const arcCenterY = centerY + dataOffset;
            
            return {
                x: centerX + dataRadius * Math.cos(theta),
                y: arcCenterY + dataRadius * Math.sin(theta)
            };
        } else {
            // Mode 3: Less than 1 month - simple rectangle
            const rectWidth = outerRadius * 2; // Width = diameter of original circle
            const rectHeight = annulusWidth;
            
            return {
                x: centerX - rectWidth / 2 + t * rectWidth,
                y: centerY - rectHeight / 2 + normalizedValue * rectHeight
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
                // Interpolated mode - all elements keyed off outer border ellipse
                const blend = angle / 360;
                const angleRad = (angle / 360) * 2 * Math.PI;
                const centerAngle = 3 * Math.PI / 2; // 270° = 12 o'clock
                const theta = t * angleRad + centerAngle - angleRad / 2;
                
                // Calculate outer border radius (varies with curvature)
                // At 360°: baseRadius + 80, At 0°: baseRadius + 100
                const outerBorderDistance = 80 + (100 - 80) * (1 - blend);
                const outerBorderRadiusX = baseRadius + outerBorderDistance;
                
                // All elements maintain constant horizontal offsets from outer border
                // Labels: 15px outside outer border
                const labelRadiusX = outerBorderRadiusX + 15;
                const labelRadiusY = this.calculateEllipseRadiusY(labelRadiusX, angle, baseRadius);
                
                // Tick baseline: at baseRadius (inside outer border)
                const tickBaseRadiusX = baseRadius;
                const tickBaseRadiusY = this.calculateEllipseRadiusY(tickBaseRadiusX, angle, baseRadius);
                
                // Tick marks straddle the baseline
                const innerRadiusX = baseRadius - tickLength / 2;
                const innerRadiusY = this.calculateEllipseRadiusY(innerRadiusX, angle, baseRadius);
                
                const outerRadiusX = baseRadius + tickLength / 2;
                const outerRadiusY = this.calculateEllipseRadiusY(outerRadiusX, angle, baseRadius);
                
                // Elliptical arc positions
                const arcX1 = centerX + innerRadiusX * Math.cos(theta);
                const arcY1 = centerY + innerRadiusY * Math.sin(theta);
                const arcX2 = centerX + outerRadiusX * Math.cos(theta);
                const arcY2 = centerY + outerRadiusY * Math.sin(theta);
                const arcLabelX = centerX + labelRadiusX * Math.cos(theta);
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
