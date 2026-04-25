/**
 * Geometry Engine - New Arc Splitting Approach
 * Handles three-mode morphing: Circular Split → Dual Arc Flattening → Rectangle
 * 
 * Key principles:
 * - 1yr → 6mo: Circular geometry, splits from South
 * - 6mo → 1mo: Dual independent arcs with fixed constraints
 * - < 1mo: Pure rectangle
 */

class GeometryEngine {
    constructor() {
        // Time constants
        this.ONE_YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
        this.ONE_HOUR_MS = 60 * 60 * 1000;
        this.SIX_MONTHS_MS = this.ONE_YEAR_MS / 2;
        this.ONE_MONTH_MS = this.ONE_YEAR_MS / 12;
        
        // Fixed geometry constants (from original 1-year circle)
        this.ORIGINAL_RADIUS = 350;
        this.ORIGINAL_DIAMETER = 700;
        this.ANNULUS_WIDTH = 165;  // Vertical separation between upper and lower arcs
        
        // Mode transition thresholds (in degrees)
        this.MODE_1_TO_2_THRESHOLD = 180;  // 6 months
        this.MODE_2_TO_3_THRESHOLD = 30;   // 1 month
    }

    /**
     * Calculate split angle based on time window
     * @param {number} windowSizeMs - Time window in milliseconds
     * @returns {number} Split angle in degrees (0-360)
     */
    calculateSplitAngle(windowSizeMs) {
        const ratio = Math.min(1, Math.max(0, windowSizeMs / this.ONE_YEAR_MS));
        return ratio * 360;
    }

    /**
     * Determine which geometry mode to use
     * @param {number} splitAngle - Split angle in degrees
     * @returns {number} Mode (1, 2, or 3)
     */
    getMode(splitAngle) {
        if (splitAngle >= this.MODE_1_TO_2_THRESHOLD) return 1;
        if (splitAngle >= this.MODE_2_TO_3_THRESHOLD) return 2;
        return 3;
    }

    /**
     * Calculate geometry parameters for current mode
     * @param {number} splitAngle - Split angle in degrees
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate (horizontal centerline)
     * @returns {Object} Geometry parameters for the current mode
     */
    calculateGeometry(splitAngle, centerX, centerY) {
        const mode = this.getMode(splitAngle);
        
        if (mode === 1) {
            return this.calculateMode1Geometry(splitAngle, centerX, centerY);
        } else if (mode === 2) {
            return this.calculateMode2Geometry(splitAngle, centerX, centerY);
        } else {
            return this.calculateMode3Geometry(centerX, centerY);
        }
    }

    /**
     * Mode 1: Circular Split (1yr → 6mo, 360° → 180°)
     */
    calculateMode1Geometry(splitAngle, centerX, centerY) {
        const gapAngle = 360 - splitAngle;  // How much is split open at South
        
        // Arc spans from South, opening symmetrically
        // South = 270° (measured from East = 0°)
        const startAngleDeg = 270 - gapAngle / 2;
        const endAngleDeg = 270 + gapAngle / 2;
        
        return {
            mode: 1,
            type: 'circular',
            outerArc: {
                centerX: centerX,
                centerY: centerY,
                radius: this.ORIGINAL_RADIUS,
                startAngle: startAngleDeg * Math.PI / 180,
                endAngle: endAngleDeg * Math.PI / 180
            },
            innerArc: {
                centerX: centerX,
                centerY: centerY,
                radius: this.ORIGINAL_RADIUS - this.ANNULUS_WIDTH,
                startAngle: startAngleDeg * Math.PI / 180,
                endAngle: endAngleDeg * Math.PI / 180
            }
        };
    }

    /**
     * Mode 2: Dual Arc Flattening (6mo → 1mo, 180° → 30°)
     */
    calculateMode2Geometry(splitAngle, centerX, centerY) {
        const northApexY = centerY - this.ORIGINAL_RADIUS;
        
        // Calculate endpoint drop based on how far we are from 180° to 30°
        const t = (180 - splitAngle) / 150;  // 0 at 180°, 1 at 30°
        const maxDrop = this.ANNULUS_WIDTH * 2;
        const endpointDrop = maxDrop * t * t;  // Quadratic easing
        
        // Upper arc constraints
        const upperEndpointY = northApexY + endpointDrop;
        const upperLeftX = centerX - this.ORIGINAL_DIAMETER / 2;
        const upperRightX = centerX + this.ORIGINAL_DIAMETER / 2;
        
        // Calculate upper arc center and radius
        // Arc passes through: (upperLeftX, upperEndpointY), (centerX, northApexY), (upperRightX, upperEndpointY)
        const halfWidth = this.ORIGINAL_DIAMETER / 2;
        const upperCenterY = (northApexY * northApexY - upperEndpointY * upperEndpointY - halfWidth * halfWidth) / 
                            (2 * (northApexY - upperEndpointY));
        const upperRadius = Math.abs(northApexY - upperCenterY);
        
        // Lower arc constraints
        const lowerApexY = northApexY + this.ANNULUS_WIDTH;
        const lowerEndpointY = centerY;  // Always on horizontal centerline
        
        // Calculate lower arc center and radius
        const lowerCenterY = (lowerApexY * lowerApexY - lowerEndpointY * lowerEndpointY - halfWidth * halfWidth) / 
                            (2 * (lowerApexY - lowerEndpointY));
        const lowerRadius = Math.abs(lowerApexY - lowerCenterY);
        
        // Calculate arc angles for both arcs
        // Upper arc: from left endpoint to right endpoint, passing through top
        const upperStartAngle = Math.PI - Math.acos((upperLeftX - centerX) / upperRadius);
        const upperEndAngle = Math.acos((upperRightX - centerX) / upperRadius);
        
        // Lower arc: from left endpoint to right endpoint, passing through bottom
        const lowerStartAngle = Math.PI - Math.acos((upperLeftX - centerX) / lowerRadius);
        const lowerEndAngle = Math.acos((upperRightX - centerX) / lowerRadius);
        
        return {
            mode: 2,
            type: 'dual-arc',
            outerArc: {
                centerX: centerX,
                centerY: upperCenterY,
                radius: upperRadius,
                startAngle: upperStartAngle,
                endAngle: upperEndAngle,
                leftX: upperLeftX,
                rightX: upperRightX,
                leftY: upperEndpointY,
                rightY: upperEndpointY,
                apexY: northApexY
            },
            innerArc: {
                centerX: centerX,
                centerY: lowerCenterY,
                radius: lowerRadius,
                startAngle: lowerStartAngle,
                endAngle: lowerEndAngle,
                leftX: upperLeftX,
                rightX: upperRightX,
                leftY: lowerEndpointY,
                rightY: lowerEndpointY,
                apexY: lowerApexY
            }
        };
    }

    /**
     * Mode 3: Rectangle (< 1mo, < 30°)
     */
    calculateMode3Geometry(centerX, centerY) {
        const northApexY = centerY - this.ORIGINAL_RADIUS;
        
        return {
            mode: 3,
            type: 'rectangle',
            topLeft: { x: centerX - this.ORIGINAL_DIAMETER / 2, y: northApexY },
            topRight: { x: centerX + this.ORIGINAL_DIAMETER / 2, y: northApexY },
            bottomLeft: { x: centerX - this.ORIGINAL_DIAMETER / 2, y: northApexY + this.ANNULUS_WIDTH },
            bottomRight: { x: centerX + this.ORIGINAL_DIAMETER / 2, y: northApexY + this.ANNULUS_WIDTH }
        };
    }

    /**
     * Calculate position for a data point
     * @param {number} t - Normalized time position (0 to 1)
     * @param {number} value - Data value
     * @param {number} maxValue - Maximum value for scaling
     * @param {Object} geometry - Geometry parameters from calculateGeometry()
     * @returns {Object} {x, y} coordinates
     */
    calculateDataPosition(t, value, maxValue, geometry) {
        const normalizedValue = Math.min(value / maxValue, 1.0);
        
        if (geometry.mode === 1) {
            return this.calculateMode1Position(t, normalizedValue, geometry);
        } else if (geometry.mode === 2) {
            return this.calculateMode2Position(t, normalizedValue, geometry);
        } else {
            return this.calculateMode3Position(t, normalizedValue, geometry);
        }
    }

    /**
     * Mode 1: Position on circular arc
     */
    calculateMode1Position(t, normalizedValue, geometry) {
        const { outerArc, innerArc } = geometry;
        
        // Interpolate angle along the arc
        const angle = outerArc.startAngle + t * (outerArc.endAngle - outerArc.startAngle);
        
        // Interpolate radius between outer and inner
        const radius = outerArc.radius - normalizedValue * (outerArc.radius - innerArc.radius);
        
        return {
            x: outerArc.centerX + radius * Math.cos(angle),
            y: outerArc.centerY + radius * Math.sin(angle)
        };
    }

    /**
     * Mode 2: Position between dual arcs
     */
    calculateMode2Position(t, normalizedValue, geometry) {
        const { outerArc, innerArc } = geometry;
        
        // Calculate position on upper arc
        const upperX = outerArc.leftX + t * (outerArc.rightX - outerArc.leftX);
        const upperAngle = this.calculateArcAngleFromX(upperX, outerArc);
        const upperPoint = {
            x: outerArc.centerX + outerArc.radius * Math.cos(upperAngle),
            y: outerArc.centerY + outerArc.radius * Math.sin(upperAngle)
        };
        
        // Calculate position on lower arc
        const lowerX = innerArc.leftX + t * (innerArc.rightX - innerArc.leftX);
        const lowerAngle = this.calculateArcAngleFromX(lowerX, innerArc);
        const lowerPoint = {
            x: innerArc.centerX + innerArc.radius * Math.cos(lowerAngle),
            y: innerArc.centerY + innerArc.radius * Math.sin(lowerAngle)
        };
        
        // Interpolate between upper and lower arcs
        return {
            x: upperPoint.x + (lowerPoint.x - upperPoint.x) * normalizedValue,
            y: upperPoint.y + (lowerPoint.y - upperPoint.y) * normalizedValue
        };
    }

    /**
     * Mode 3: Position in rectangle
     */
    calculateMode3Position(t, normalizedValue, geometry) {
        const { topLeft, bottomLeft } = geometry;
        const width = this.ORIGINAL_DIAMETER;
        const height = this.ANNULUS_WIDTH;
        
        return {
            x: topLeft.x + t * width,
            y: topLeft.y + normalizedValue * height
        };
    }

    /**
     * Helper: Calculate arc angle from X coordinate
     */
    calculateArcAngleFromX(targetX, arc) {
        const cosAngle = (targetX - arc.centerX) / arc.radius;
        const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
        
        // Return the angle on the correct side (upper or lower part of circle)
        // For upper arc, we want the angle in the upper half
        // For lower arc, we want the angle in the lower half
        return angle;
    }

    /**
     * Generate border path for SVG
     * @param {Object} geometry - Geometry parameters
     * @returns {string} SVG path string
     */
    generateBorderPath(geometry) {
        if (geometry.mode === 1) {
            return this.generateMode1BorderPath(geometry);
        } else if (geometry.mode === 2) {
            return this.generateMode2BorderPath(geometry);
        } else {
            return this.generateMode3BorderPath(geometry);
        }
    }

    /**
     * Mode 1: Circular annulus path
     */
    generateMode1BorderPath(geometry) {
        const { outerArc, innerArc } = geometry;
        
        // Outer arc
        const outerStartX = outerArc.centerX + outerArc.radius * Math.cos(outerArc.startAngle);
        const outerStartY = outerArc.centerY + outerArc.radius * Math.sin(outerArc.startAngle);
        const outerEndX = outerArc.centerX + outerArc.radius * Math.cos(outerArc.endAngle);
        const outerEndY = outerArc.centerY + outerArc.radius * Math.sin(outerArc.endAngle);
        
        // Inner arc
        const innerStartX = innerArc.centerX + innerArc.radius * Math.cos(innerArc.startAngle);
        const innerStartY = innerArc.centerY + innerArc.radius * Math.sin(innerArc.startAngle);
        const innerEndX = innerArc.centerX + innerArc.radius * Math.cos(innerArc.endAngle);
        const innerEndY = innerArc.centerY + innerArc.radius * Math.sin(innerArc.endAngle);
        
        const largeArcFlag = (outerArc.endAngle - outerArc.startAngle) > Math.PI ? 1 : 0;
        
        return `
            M ${outerStartX},${outerStartY}
            A ${outerArc.radius},${outerArc.radius} 0 ${largeArcFlag},1 ${outerEndX},${outerEndY}
            L ${innerEndX},${innerEndY}
            A ${innerArc.radius},${innerArc.radius} 0 ${largeArcFlag},0 ${innerStartX},${innerStartY}
            Z
        `;
    }

    /**
     * Mode 2: Dual arc path with side segments
     */
    generateMode2BorderPath(geometry) {
        const { outerArc, innerArc } = geometry;
        
        // Sample points along upper arc
        const numPoints = 50;
        let path = `M ${outerArc.leftX},${outerArc.leftY}`;
        
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const x = outerArc.leftX + t * (outerArc.rightX - outerArc.leftX);
            const angle = this.calculateArcAngleFromX(x, outerArc);
            const px = outerArc.centerX + outerArc.radius * Math.cos(angle);
            const py = outerArc.centerY + outerArc.radius * Math.sin(angle);
            path += ` L ${px},${py}`;
        }
        
        // Right side segment
        path += ` L ${innerArc.rightX},${innerArc.rightY}`;
        
        // Sample points along lower arc (reverse direction)
        for (let i = numPoints; i >= 0; i--) {
            const t = i / numPoints;
            const x = innerArc.leftX + t * (innerArc.rightX - innerArc.leftX);
            const angle = this.calculateArcAngleFromX(x, innerArc);
            const px = innerArc.centerX + innerArc.radius * Math.cos(angle);
            const py = innerArc.centerY + innerArc.radius * Math.sin(angle);
            path += ` L ${px},${py}`;
        }
        
        // Left side segment
        path += ` Z`;
        
        return path;
    }

    /**
     * Mode 3: Rectangle path
     */
    generateMode3BorderPath(geometry) {
        const { topLeft, topRight, bottomRight, bottomLeft } = geometry;
        
        return `
            M ${topLeft.x},${topLeft.y}
            L ${topRight.x},${topRight.y}
            L ${bottomRight.x},${bottomRight.y}
            L ${bottomLeft.x},${bottomLeft.y}
            Z
        `;
    }

    /**
     * Legacy compatibility methods
     */
    calculateCurvature(windowSizeMs) {
        return this.calculateSplitAngle(windowSizeMs);
    }

    sliderToTimeWindow(sliderValue) {
        const minLog = Math.log(this.ONE_HOUR_MS);
        const maxLog = Math.log(this.ONE_YEAR_MS);
        const scale = (maxLog - minLog) / 100;
        return Math.exp(minLog + scale * sliderValue);
    }

    timeWindowToSlider(timeWindowMs) {
        const minLog = Math.log(this.ONE_HOUR_MS);
        const maxLog = Math.log(this.ONE_YEAR_MS);
        const scale = (maxLog - minLog) / 100;
        return (Math.log(timeWindowMs) - minLog) / scale;
    }

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
