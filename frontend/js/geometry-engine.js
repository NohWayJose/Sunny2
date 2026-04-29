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
        
        // Mode transition thresholds
        this.MODE_1_TO_2_THRESHOLD = 180;  // 6 months (degrees)
        this.MODE_2_TO_3_THRESHOLD_MS = 1 * 60 * 60 * 1000;  // 1 hour in milliseconds
        this.MODE_2_TO_3_RADIUS_THRESHOLD = 5000;  // 5 meters in pixels (increased for more dramatic flattening)
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
     * Determine which geometry mode to use based on time window
     * @param {number} splitAngle - Split angle in degrees
     * @param {number} windowSizeMs - Time window in milliseconds (optional, calculated from splitAngle if not provided)
     * @returns {number} Mode (1, 2, or 3)
     */
    getMode(splitAngle, windowSizeMs = null) {
        // Mode 1: 6 months to 1 year
        if (splitAngle >= this.MODE_1_TO_2_THRESHOLD) return 1;
        
        // Calculate time window if not provided
        if (windowSizeMs === null) {
            windowSizeMs = (splitAngle / 360) * this.ONE_YEAR_MS;
        }
        
        // Mode 3: Less than 1 week
        if (windowSizeMs < this.MODE_2_TO_3_THRESHOLD_MS) return 3;
        
        // Mode 2: 1 week to 6 months
        return 2;
    }

    /**
     * Calculate geometry parameters for current mode
     * @param {number} splitAngle - Split angle in degrees
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate (horizontal centerline)
     * @returns {Object} Geometry parameters for the current mode
     */
    calculateGeometry(splitAngle, centerX, centerY) {
        const windowSizeMs = (splitAngle / 360) * this.ONE_YEAR_MS;
        const mode = this.getMode(splitAngle, windowSizeMs);
        
        if (mode === 1) {
            return this.calculateMode1Geometry(splitAngle, centerX, centerY);
        } else if (mode === 2) {
            return this.calculateMode2Geometry(splitAngle, windowSizeMs, centerX, centerY);
        } else {
            return this.calculateMode3Geometry(centerX, centerY);
        }
    }

    /**
     * Mode 1: Circular Split (1yr → 6mo, 360° → 180°)
     * SVG coordinates: Y increases downward, so South is at bottom (90° in SVG = 270° in math)
     * Gap should be at South (bottom) and get smaller as we approach 1 year
     */
    calculateMode1Geometry(splitAngle, centerX, centerY) {
        // At 1 year (360°): gap = MIN_GAP_ANGLE (small visible gap)
        // At 6 months (180°): gap = 180° (semicircle with 180° gap at South)
        const MIN_GAP_ANGLE = 5;  // Minimum gap in degrees (always visible)
        const gapAngle = Math.max(MIN_GAP_ANGLE, 360 - splitAngle);
        
        // In SVG coordinates:
        // 0° = East (right), 90° = South (bottom), 180° = West (left), 270° = North (top)
        // We want the gap centered at South (90° in SVG)
        const southAngleSVG = 90;  // degrees
        
        // Arc goes from (South - gapAngle/2) clockwise to (South + gapAngle/2)
        // But we want the ARC, not the gap, so we go the OTHER way:
        // Start at South + gapAngle/2, go clockwise around to South - gapAngle/2
        const startAngleDeg = southAngleSVG + gapAngle / 2;
        const endAngleDeg = southAngleSVG - gapAngle / 2 + 360;  // Add 360 to go the long way
        
        console.log(`Split angle: ${splitAngle}°, Gap: ${gapAngle}°, Arc from ${startAngleDeg}° to ${endAngleDeg}°`);
        
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
     * Mode 2: Dual Arc Flattening (6mo → 1 week)
     * Upper arc passes through fixed anchor points
     * Radius interpolates from 350px to 2000px using secant-based function
     * Lower arc shares same center, maintains constant distance
     * Side segments perpendicular to both arcs
     */
    calculateMode2Geometry(splitAngle, windowSizeMs, centerX, centerY) {
        // Fixed anchor points for upper arc
        const upperApexX = centerX;
        const upperApexY = centerY - this.ORIGINAL_RADIUS;  // Top of original circle
        const leftX = centerX - this.ORIGINAL_RADIUS;
        const rightX = centerX + this.ORIGINAL_RADIUS;
        
        // Calculate interpolation parameter: 0 at 6mo, 1 at threshold (1 hour)
        // Use time-based interpolation for consistent behavior
        const sixMonthsMs = this.SIX_MONTHS_MS;
        const thresholdMs = this.MODE_2_TO_3_THRESHOLD_MS;
        const t = (sixMonthsMs - windowSizeMs) / (sixMonthsMs - thresholdMs);
        const clampedT = Math.max(0, Math.min(1, t));
        
        // Interpolate radius using secant function for natural arc flattening
        // sec(θ) = 1/cos(θ) grows from 1 to infinity as θ goes from 0 to π/2
        // We map t ∈ [0,1] to angle ∈ [0, π/2 - small_offset]
        const maxAngle = Math.PI / 2 - 0.1;  // Stop before vertical (infinity)
        const angle = clampedT * maxAngle;
        const secant = 1 / Math.cos(angle);  // sec(angle)
        
        // Map secant value to radius range [350, 2000]
        const minRadius = this.ORIGINAL_RADIUS;  // 350
        const maxRadius = this.MODE_2_TO_3_RADIUS_THRESHOLD;  // 2000
        const upperRadius = minRadius + (maxRadius - minRadius) * ((secant - 1) / (1 / Math.cos(maxAngle) - 1));
        
        // At 6 months (180°): We transition from Mode 1 (circular) to Mode 2
        // Mode 1 at 180° has a semicircular arc with gap at bottom
        // The TOP of that arc becomes our apex
        // The SIDES of that arc become our endpoints
        
        // From Mode 1 at 180°: arc goes from left, over top, to right
        // Apex is at top center (0, 50)
        // Endpoints are at sides, at the SAME Y as the center of the original circle (0, 400)
        // So at 6 months: apex Y=50, endpoint Y=400
        
        // As we flatten: apex stays at Y=50, endpoints RISE toward Y=50
        
        const halfWidth = this.ORIGINAL_RADIUS;
        
        // Given: apex at (0, apexY), endpoints at (±halfWidth, endpointY)
        // Find: center (0, centerY) and radius such that all three points are on the circle
        
        // From your diagram: as radius increases, endpoints rise (smaller Y)
        // Calculate endpoint Y from the radius using the constraint that
        // the arc passes through the fixed apex
        
        // For now, use the formula that worked in Mode 1:
        // Center is at apex + radius (below apex)
        const upperCenterY = upperApexY + upperRadius;
        // Endpoints are above center
        const dy_squared = upperRadius * upperRadius - halfWidth * halfWidth;
        const upperEndpointY = upperCenterY - Math.sqrt(Math.max(0, dy_squared));
        
        // Lower arc shares the same center as upper arc
        // but has a smaller radius (by ANNULUS_WIDTH)
        const lowerRadius = upperRadius - this.ANNULUS_WIDTH;
        const lowerCenterY = upperCenterY;  // Same center as upper arc
        
        // Lower apex is where the lower arc passes through center X
        const lowerApexY = lowerCenterY - lowerRadius;
        
        // Calculate lower arc endpoints:
        // They must lie on BOTH:
        // 1. The lower arc (circle with center and lowerRadius)
        // 2. The perpendicular from the upper arc endpoint
        
        // For left endpoint:
        // Upper endpoint is at (leftX, upperEndpointY)
        // Radius vector from center to upper endpoint
        const upperLeftRadiusX = leftX - centerX;
        const upperLeftRadiusY = upperEndpointY - upperCenterY;
        
        // The perpendicular line from upper endpoint has direction perpendicular to radius
        // Perpendicular direction (rotated 90° clockwise): (radiusY, -radiusX)
        // But we want the point on the lower arc, so we find intersection
        
        // The lower endpoint is on the lower arc at the same angle as upper endpoint
        // (since both arcs are concentric, perpendicular = radial direction)
        const upperLeftAngle = Math.atan2(upperLeftRadiusY, upperLeftRadiusX);
        const lowerLeftX = centerX + lowerRadius * Math.cos(upperLeftAngle);
        const lowerLeftY = upperCenterY + lowerRadius * Math.sin(upperLeftAngle);
        
        // For right endpoint (same logic):
        const upperRightRadiusX = rightX - centerX;
        const upperRightRadiusY = upperEndpointY - upperCenterY;
        const upperRightAngle = Math.atan2(upperRightRadiusY, upperRightRadiusX);
        const lowerRightX = centerX + lowerRadius * Math.cos(upperRightAngle);
        const lowerRightY = upperCenterY + lowerRadius * Math.sin(upperRightAngle);
        
        // Store calculated endpoint positions
        const lowerEndpointY = lowerLeftY;  // For compatibility
        
        // Calculate arc angles for upper arc
        // For rainbow arc: left endpoint through apex to right endpoint
        // Endpoints are at (±halfWidth, endpointY), apex at (0, apexY)
        // We need angles for the endpoints
        // Using the corrected calculateArcAngleFromX which returns angles in [π, 2π] for upper arc
        const upperStartAngle = this.calculateArcAngleFromX(leftX, {
            centerX: centerX,
            centerY: upperCenterY,
            radius: upperRadius,
            apexY: upperApexY
        });
        const upperEndAngle = this.calculateArcAngleFromX(rightX, {
            centerX: centerX,
            centerY: upperCenterY,
            radius: upperRadius,
            apexY: upperApexY
        });
        
        // Calculate arc angles for lower arc
        const lowerStartAngle = this.calculateArcAngleFromX(leftX, {
            centerX: centerX,
            centerY: lowerCenterY,
            radius: lowerRadius,
            apexY: lowerApexY
        });
        const lowerEndAngle = this.calculateArcAngleFromX(rightX, {
            centerX: centerX,
            centerY: lowerCenterY,
            radius: lowerRadius,
            apexY: lowerApexY
        });
        
        console.log('Mode 2 Geometry:', {
            splitAngle,
            windowSizeMs,
            windowSizeDays: windowSizeMs / (24 * 60 * 60 * 1000),
            sixMonthsMs,
            thresholdMs,
            thresholdHours: thresholdMs / (60 * 60 * 1000),
            t: clampedT,
            angle,
            secant,
            upperRadius,
            upperCenterY,
            upperEndpointY,
            lowerCenterY,
            lowerRadius,
            lowerEndpointY
        });
        
        return {
            mode: 2,
            type: 'dual-arc',
            outerArc: {
                centerX: centerX,
                centerY: upperCenterY,
                radius: upperRadius,
                startAngle: upperStartAngle,
                endAngle: upperEndAngle,
                leftX: leftX,
                rightX: rightX,
                leftY: upperEndpointY,
                rightY: upperEndpointY,
                apexY: upperApexY
            },
            innerArc: {
                centerX: centerX,
                centerY: lowerCenterY,
                radius: lowerRadius,
                startAngle: lowerStartAngle,
                endAngle: lowerEndAngle,
                leftX: lowerLeftX,
                rightX: lowerRightX,
                leftY: lowerLeftY,
                rightY: lowerRightY,
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
        const normalizedValue = value / maxValue;
        
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
        
        // Interpolate radius: 0 = inner (baseline), 1 = outer (maximum)
        const radius = innerArc.radius + normalizedValue * (outerArc.radius - innerArc.radius);
        
        return {
            x: outerArc.centerX + radius * Math.cos(angle),
            y: outerArc.centerY + radius * Math.sin(angle)
        };
    }

    /**
     * Mode 2: Position between dual arcs
     * Data values map to radii:
     * - normalizedValue < 0: outside upper arc (for ticks/labels)
     * - normalizedValue 0-1: between lower and upper arcs (for data)
     * - normalizedValue > 1: inside lower arc
     * t interpolates along the angular span of the arcs
     */
    calculateMode2Position(t, normalizedValue, geometry) {
        const { outerArc, innerArc } = geometry;
        
        // Calculate radius based on normalized value
        // normalizedValue = 0 → lower arc, normalizedValue = 1 → upper arc
        // Can extend beyond for ticks/labels (negative values = outside upper arc)
        const radius = innerArc.radius + normalizedValue * (outerArc.radius - innerArc.radius);
        
        // Interpolate angle between start and end angles
        // Use the upper arc's angular span (both arcs share same center and angular span)
        const startAngle = outerArc.startAngle;
        const endAngle = outerArc.endAngle;
        const angle = startAngle + t * (endAngle - startAngle);
        
        // Calculate position on the arc at this radius and angle
        return {
            x: outerArc.centerX + radius * Math.cos(angle),
            y: outerArc.centerY + radius * Math.sin(angle)
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
            y: topLeft.y + (1 - normalizedValue) * height
        };
    }

    /**
     * Helper: Calculate arc angle from X coordinate
     * Returns the angle that corresponds to the given X position on the arc
     */
    calculateArcAngleFromX(targetX, arc) {
        const cosAngle = (targetX - arc.centerX) / arc.radius;
        const clampedCos = Math.max(-1, Math.min(1, cosAngle));
        
        // Determine if this is upper or lower arc based on apex position
        const isUpperArc = arc.apexY < arc.centerY;
        
        if (isUpperArc) {
            // Upper arc: apex is ABOVE center (smaller Y in SVG)
            // Arc curves upward (rainbow shape)
            // In SVG: angle 0 = right, π/2 = down, π = left, 3π/2 = up
            // For rainbow: we want angles in range [π, 2π] (left side through top to right side)
            // acos gives [0, π], we need to map to upper semicircle
            // Left side (X < centerX): angle in [π/2, π] → map to [π, 3π/2]
            // Right side (X > centerX): angle in [0, π/2] → map to [3π/2, 2π]
            return 2 * Math.PI - Math.acos(clampedCos);
        } else {
            // Lower arc: apex is BELOW center (larger Y in SVG)
            // Arc curves downward (frown shape)
            // For frown: we want angles in range [0, π] (left side through bottom to right side)
            return Math.acos(clampedCos);
        }
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
        
        console.log('Mode 1 Border Path:', {
            outerRadius: outerArc.radius,
            innerRadius: innerArc.radius,
            startAngle: outerArc.startAngle * 180 / Math.PI,
            endAngle: outerArc.endAngle * 180 / Math.PI,
            center: [outerArc.centerX, outerArc.centerY]
        });
        
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
        
        const arcSpan = outerArc.endAngle - outerArc.startAngle;
        const largeArcFlag = arcSpan > Math.PI ? 1 : 0;
        
        console.log('Arc points:', {
            outerStart: [outerStartX, outerStartY],
            outerEnd: [outerEndX, outerEndY],
            innerStart: [innerStartX, innerStartY],
            innerEnd: [innerEndX, innerEndY],
            arcSpan: arcSpan * 180 / Math.PI,
            largeArcFlag
        });
        
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
     * Calculate tick mark positions (legacy compatibility)
     * Tick baseline: outer border radius - 25px
     * Label position: outer border radius + 20px (35px more than before)
     * @param {number} angle - Current curvature angle (0-360)
     * @param {number} baseRadius - Base radius (not used in new system)
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate
     * @param {Array} tickPositions - Array of normalized positions (0-1) for ticks
     * @returns {Array} Array of tick objects with start and end coordinates
     */
    calculateTickPositions(angle, baseRadius, centerX, centerY, tickPositions) {
        const geometry = this.calculateGeometry(angle, centerX, centerY);
        const ticks = [];
        const tickLength = 10;
        
        for (const t of tickPositions) {
            let innerPos, outerPos, labelPos;
            
            if (geometry.mode === 2) {
                // Mode 2: Ticks and labels should be outside the upper arc
                const tickBaselineRadius = geometry.outerArc.radius + 25;
                const tickInnerRadius = tickBaselineRadius - tickLength / 2;
                const tickOuterRadius = tickBaselineRadius + tickLength / 2;
                const labelRadius = geometry.outerArc.radius + 35;
                
                const startAngle = geometry.outerArc.startAngle;
                const endAngle = geometry.outerArc.endAngle;
                const tickAngle = startAngle + t * (endAngle - startAngle);
                
                innerPos = {
                    x: geometry.outerArc.centerX + tickInnerRadius * Math.cos(tickAngle),
                    y: geometry.outerArc.centerY + tickInnerRadius * Math.sin(tickAngle)
                };
                outerPos = {
                    x: geometry.outerArc.centerX + tickOuterRadius * Math.cos(tickAngle),
                    y: geometry.outerArc.centerY + tickOuterRadius * Math.sin(tickAngle)
                };
                labelPos = {
                    x: geometry.outerArc.centerX + labelRadius * Math.cos(tickAngle),
                    y: geometry.outerArc.centerY + labelRadius * Math.sin(tickAngle)
                };
            } else {
                // Mode 1 and 3: ticks start at the outer arc and extend outward.
                // innerOffset = 1.0 anchors the tick base at the outer ring.
                const innerOffset = 1.0;
                const outerOffset = 1 + tickLength / this.ANNULUS_WIDTH;
                const labelOffset = 1 + (tickLength + 12) / this.ANNULUS_WIDTH;

                innerPos = this.calculateDataPosition(t, innerOffset, 1, geometry);
                outerPos = this.calculateDataPosition(t, outerOffset, 1, geometry);
                labelPos = this.calculateDataPosition(t, labelOffset, 1, geometry);
            }
            
            ticks.push({
                x1: innerPos.x,
                y1: innerPos.y,
                x2: outerPos.x,
                y2: outerPos.y,
                labelX: labelPos.x,
                labelY: labelPos.y,
                angle: 0  // Not used in new system
            });
        }
        
        return ticks;
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
