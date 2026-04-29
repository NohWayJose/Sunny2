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
 * Annular Visualization
 * Main class that orchestrates the circle-to-line morphing solar data visualization
 */

class AnnularVisualization {
    constructor(svgId) {
        this.svgId = svgId;
        this.svg = null;
        this.containerElement = null;
        
        // Initial dimensions (will be updated by calculateDimensions)
        this.width = 1200;
        this.height = 800;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2 + 30;
        
        // Layout dimensions - work from outside in
        this.outerBorderRadius = 350; // Outer border (fixed)
        this.labelClearance = 20; // Space between outer border and labels (INSIDE)
        this.labelHeight = 15; // Approximate label height
        this.tickLength = 10; // Tick mark length
        
        // These will be calculated dynamically based on curvature
        this.baseRadius = 305; // Scale position (will be adjusted)
        this.dataExtension = 100; // Max data extension inward from scale (will be adjusted)
        this.innerBorderRadius = 185; // Inner border (will be adjusted)
        
        // Components
        this.geometryEngine = new GeometryEngine();
        this.timeNavigator = null;
        this.logSlider = null;
        
        // State
        this.currentData = [];
        this.allYearsMode = false;
        this.currentCurvature = 360;
        this.selectedYear = null; // Track selected year for highlighting
        this.currentTimeWindow = this.geometryEngine.ONE_YEAR_MS;
        this.visibleYears = new Set(); // Track which years are visible (for checkboxes)
        this.hiddenYears = new Set(); // Track which years user explicitly hid
        this.sigmaBandMode = 2; // 0=off, 1=visible years, 2=all years — default to all years
        this.sigmaData = [];   // multi-year data for sigma in single-year display mode
        this.labelFontScale = 1.0;
        this.lastCenteredTimeWindow = null;
        this.aggregationPeriod = 'days'; // Current aggregation period label
        
        // Data cache: key = "startDate-endDate", value = data array
        this.dataCache = new Map();
        this.maxCacheSize = 50; // Limit cache size to prevent memory issues
        
        // Global data range for consistent scale across all time windows
        this.globalMinValue = 0;
        this.globalMaxValue = 100; // Will be updated when data loads
        this.absoluteMaxValue = null; // True maximum across all data (calculated once)
        this.absoluteMaxCalculated = false;
        
        // Amplitude scaling
        this.amplitudeScale = 1.0; // 1.0 = 100% (use globalMaxValue), 0.0 = auto-fit to current data max
        
        
        // Color schemes
        this.singleYearColor = '#ff8c42';
        this.yearColors = [
            '#e63946', '#f77f00', '#fcbf49', '#06d6a0', '#118ab2',
            '#073b4c', '#8338ec', '#ff006e', '#fb5607', '#ffbe0b',
            '#3a86ff', '#8ac926', '#ff006e', '#fb5607', '#ffbe0b'
        ];
    }

    /**
     * Initialize the visualization
     */
    async initialize() {
        try {
            // Get container element
            this.containerElement = document.getElementById(this.svgId)?.parentElement;
            
            // Calculate initial dimensions
            this.calculateDimensions();
            
            // Setup SVG
            this.setupSVG();
            
            // Initialize components
            this.timeNavigator = new TimeNavigator();
            this.logSlider = new LogSlider('time-window-slider', 'current-window', this.geometryEngine);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup resize listener
            this.setupResizeListener();
            
            // Initialize legend sidebar state (hidden by default)
            this.toggleLegendSidebar(false);
            
            // Initial render with loading indicator
            this.showLoadingIndicator();
            await this.loadAndRender();
            this.hideLoadingIndicator();
            
            console.log('Annular visualization initialized successfully');
        } catch (error) {
            console.error('Error initializing visualization:', error);
            this.hideLoadingIndicator();
            this.showError('Failed to initialize visualization');
        }
    }

    /**
     * Calculate dimensions based on container size
     */
    calculateDimensions() {
        // The geometry engine works in a fixed 1200x800 coordinate space.
        // We keep the viewBox fixed and let CSS scale the SVG element visually.
        this.width = 1200;
        this.height = 800;
        this.centerX = 600;
        this.centerY = 430;
        this.outerBorderRadius = 350;
        this.baseRadius = 305;
        this.dataExtension = 100;
        this.innerBorderRadius = 185;
    }

    /**
     * Setup resize listener
     */
    setupResizeListener() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250); // Debounce resize events
        });
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // ViewBox is fixed at 1200x800; CSS scales the SVG element.
        this.render();
    }

    /**
     * Setup SVG element and groups
     */
    setupSVG() {
        this.svg = d3.select(`#${this.svgId}`)
            .attr('viewBox', '120 0 960 800')
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('width', '100%')
            .style('height', 'auto');
        
        // Create defs for clip paths
        this.defs = this.svg.append('defs');
        
        // Create groups for different layers (order matters for z-index)
        this.borderGroup = this.svg.append('g').attr('class', 'border-layer');
        this.scaleRingsGroup = this.svg.append('g').attr('class', 'scale-rings-layer');
        this.baseGroup = this.svg.append('g').attr('class', 'base-layer');
        this.ticksGroup = this.svg.append('g').attr('class', 'ticks-layer');
        this.timestampGroup = this.svg.append('g').attr('class', 'timestamp-layer');
        this.dataGroup = this.svg.append('g').attr('class', 'data-layer');
        
        // Draw initial base circle and borders
        this.drawBaseCircle();
        this.drawBorders();
    }

    /**
     * Setup event listeners for controls
     */
    setupEventListeners() {
        // Time window slider
        this.logSlider.addListener((timeWindowMs, curvature) => {
            this.currentTimeWindow = timeWindowMs;
            this.currentCurvature = curvature;
            this.loadAndRender();
        });
        
        // Time navigator
        this.timeNavigator.addListener((timestamp) => {
            // Always reload when time navigator changes
            // In all-years mode, this changes which time window pattern to show across all years
            // In single-year mode, this changes which specific time period to show
            this.loadAndRender();
        });
        
        // All years toggle
        const allYearsToggle = document.getElementById('all-years-toggle');
        if (allYearsToggle) {
            allYearsToggle.addEventListener('change', (e) => {
                this.allYearsMode = e.target.checked;
                this.toggleLegendSidebar(this.allYearsMode);
                // "Visible years" (state 1) only makes sense in all-years mode;
                // snap to "all years" (state 2) when switching to single-year
                if (!this.allYearsMode && this.sigmaBandMode === 1) {
                    this.sigmaBandMode = 2;
                    sigmaBandToggle.indeterminate = false;
                    sigmaBandToggle.checked = true;
                    if (sigmaBandLabel) sigmaBandLabel.textContent = SIGMA_LABELS[2];
                }
                this.loadAndRender();
            });
            
            // Sigma band tristate toggle: off → visible years → all years → off
            const sigmaBandToggle = document.getElementById('sigma-band-toggle');
            const sigmaBandLabel  = document.getElementById('sigma-band-label');
            const SIGMA_LABELS = ['σ band: off', 'σ band: visible', '⊃σ band: all years'];
            if (sigmaBandToggle) {
                sigmaBandToggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (this.allYearsMode) {
                        // All Years mode: off → selected years → all years → off
                        this.sigmaBandMode = (this.sigmaBandMode + 1) % 3;
                    } else {
                        // Single Year mode: off ↔ all years (no mode switch, no "selected years")
                        this.sigmaBandMode = this.sigmaBandMode === 0 ? 2 : 0;
                    }
                    sigmaBandToggle.indeterminate = this.sigmaBandMode === 1;
                    sigmaBandToggle.checked       = this.sigmaBandMode === 2;
                    if (sigmaBandLabel) sigmaBandLabel.textContent = SIGMA_LABELS[this.sigmaBandMode];
                    // In single year mode, sigma still needs all-years data — load it separately
                    this.loadAndRender();
                });
            }
        }
        
        // Amplitude slider with logarithmic scaling
        const amplitudeSlider = document.getElementById('amplitude-slider');
        if (amplitudeSlider) {
            amplitudeSlider.addEventListener('input', (e) => {
                // Slider value 0-100 with logarithmic mapping
                // 0 = No change (amplitudeScale = 1.0, use global max)
                // 100 = 100% magnification (amplitudeScale = 0.0, use current data max)
                
                const sliderValue = parseFloat(e.target.value);
                
                if (sliderValue === 100) {
                    // 100% magnification: use current data max
                    this.amplitudeScale = 0.0;
                } else if (sliderValue === 0) {
                    // No change: use global max
                    this.amplitudeScale = 1.0;
                } else {
                    // Logarithmic scale from 1 to 99
                    // Map slider 1-99 to amplitudeScale 0.99-0.01 logarithmically (inverted)
                    const minLog = Math.log(0.01);
                    const maxLog = Math.log(0.99);
                    const scale = (maxLog - minLog) / 99; // 99 steps from 1 to 99
                    // Invert: slider 1 -> 0.99, slider 99 -> 0.01
                    this.amplitudeScale = Math.exp(maxLog - scale * (sliderValue - 1));
                }
                
                // Re-render with new amplitude scale (no need to reload data)
                this.render();
            });
        }
    }

    /**
     * Draw the base circle/line (tick baseline)
     */
    drawBaseCircle() {
        this.baseGroup.selectAll('*').remove();
        
        // Get geometry from new engine
        const geometry = this.geometryEngine.calculateGeometry(
            this.currentCurvature,
            this.centerX,
            this.centerY
        );
        
        // Sample points along the baseline (slightly inward from outer border)
        const numPoints = 100;
        const points = [];
        
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            // 5px inside the tick bases (which sit at the outer ring)
            const baselineOffset = 1 - 5 / this.geometryEngine.ANNULUS_WIDTH;
            const pos = this.geometryEngine.calculateDataPosition(t, baselineOffset, 1, geometry);
            points.push(pos);
        }
        
        // Build path
        let pathData = `M ${points[0].x},${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            pathData += ` L ${points[i].x},${points[i].y}`;
        }
        
        this.baseGroup.append('path')
            .attr('d', pathData)
            .attr('class', 'circle-face')
            .attr('fill', 'none');
    }

    /**
     * Draw borders and background fill using new geometry engine
     */
    drawBorders() {
        this.borderGroup.selectAll('*').remove();
        
        // Get geometry from new engine
        const geometry = this.geometryEngine.calculateGeometry(
            this.currentCurvature,
            this.centerX,
            this.centerY
        );
        
        // Generate border path using new engine
        const borderPath = this.geometryEngine.generateBorderPath(geometry);
        
        this.borderGroup.append('path')
            .attr('d', borderPath)
            .attr('fill', '#fef9f3')
            .attr('fill-rule', 'evenodd')
            .attr('stroke', '#3a3a3a')
            .attr('stroke-width', 1);
    }

    /**
     * Draw tick marks
     */
    drawTicks() {
        this.ticksGroup.selectAll('*').remove();
        
        // Determine tick positions based on time window
        const { majorTicks, minorTicks, labels } = this.calculateTickData();
        
        // Calculate tick positions
        const majorTickPositions = this.geometryEngine.calculateTickPositions(
            this.currentCurvature,
            this.baseRadius,
            this.centerX,
            this.centerY,
            majorTicks
        );
        
        const minorTickPositions = this.geometryEngine.calculateTickPositions(
            this.currentCurvature,
            this.baseRadius,
            this.centerX,
            this.centerY,
            minorTicks
        );
        
        // Draw minor ticks
        minorTickPositions.forEach(tick => {
            this.ticksGroup.append('line')
                .attr('x1', tick.x1)
                .attr('y1', tick.y1)
                .attr('x2', tick.x2)
                .attr('y2', tick.y2)
                .attr('class', 'tick-minor');
        });
        
        // Draw major ticks with labels
        majorTickPositions.forEach((tick, i) => {
            this.ticksGroup.append('line')
                .attr('x1', tick.x1)
                .attr('y1', tick.y1)
                .attr('x2', tick.x2)
                .attr('y2', tick.y2)
                .attr('class', 'tick-major');
            
            // Add label
            if (labels[i]) {
                this.ticksGroup.append('text')
                    .attr('x', tick.labelX)
                    .attr('y', tick.labelY)
                    .attr('class', 'tick-label')
                    .attr('font-size', `${Math.round(11 * this.labelFontScale)}px`)
                    .text(labels[i]);
            }
        });
    }

    /**
     * Draw timestamp labels above the scale (left, center, right)
     * Timestamp granularity is one step up from the major tick granularity
     */
    drawTimestampLabels() {
        this.timestampGroup.selectAll('*').remove();
        
        // Get the time range
        const timeRange = this.timeNavigator.getDateRange(this.currentTimeWindow);
        const startDate = timeRange.start;
        const endDate = timeRange.end;
        
        // Calculate middle date
        const middleMs = (startDate.getTime() + endDate.getTime()) / 2;
        const middleDate = new Date(middleMs);
        
        // Determine timestamp format based on time window (one step up from tick granularity)
        const days = this.currentTimeWindow / (24 * 60 * 60 * 1000);
        const hours = this.currentTimeWindow / (60 * 60 * 1000);
        
        let formatTimestamp;
        if (days > 180) {
            // Year view (monthly ticks) → show year
            formatTimestamp = (date) => date.getFullYear().toString();
        } else if (days > 28) {
            // Month+ view (weekly ticks) → show month-year
            formatTimestamp = (date) => {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return `${months[date.getMonth()]} ${date.getFullYear()}`;
            };
        } else if (days > 1) {
            // Multi-day view (daily ticks) → show date
            formatTimestamp = (date) => {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
            };
        } else if (hours > 1) {
            // Multi-hour view (hourly ticks) → show date-time
            formatTimestamp = (date) => {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                return `${date.getDate()} ${months[date.getMonth()]} ${hours}:${minutes}`;
            };
        } else {
            // Single hour or less (minute ticks) → show time
            formatTimestamp = (date) => {
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                return `${hours}:${minutes}`;
            };
        }
        
        // Get geometry to calculate label positions
        const geometry = this.geometryEngine.calculateGeometry(
            this.currentCurvature,
            this.centerX,
            this.centerY
        );
        
        const positions = [
            { t: 0, date: startDate, anchor: 'start' },      // Left
            { t: 0.5, date: middleDate, anchor: 'middle' },  // Center
            { t: 1, date: endDate, anchor: 'end' }           // Right
        ];
        
        positions.forEach(({ t, date, anchor }) => {
            let pos;
            
            if (geometry.mode === 2) {
                // Mode 2: Use absolute pixel offset from outer arc (same as ticks)
                const labelRadius = geometry.outerArc.radius + 65;  // 65 pixels outside outer arc
                const startAngle = geometry.outerArc.startAngle;
                const endAngle = geometry.outerArc.endAngle;
                const angle = startAngle + t * (endAngle - startAngle);
                
                pos = {
                    x: geometry.outerArc.centerX + labelRadius * Math.cos(angle),
                    y: geometry.outerArc.centerY + labelRadius * Math.sin(angle)
                };
            } else {
                // Mode 1 and 3: Use normalized offset
                const labelOffset = 1 + 65 / this.geometryEngine.ANNULUS_WIDTH;
                pos = this.geometryEngine.calculateDataPosition(t, labelOffset, geometry.mode, geometry);
            }
            
            this.timestampGroup.append('text')
                .attr('x', pos.x)
                .attr('y', pos.y)
                .attr('text-anchor', anchor)
                .attr('dominant-baseline', 'middle')
                .attr('font-size', `${Math.round(11 * this.labelFontScale)}px`)
                .attr('font-weight', 'bold')
                .attr('fill', '#333')
                .text(formatTimestamp(date));
        });
    }

    /**
     * Calculate tick data based on current time window
     * @returns {Object} {majorTicks, minorTicks, labels}
     */
    calculateTickData() {
        const days = this.currentTimeWindow / (24 * 60 * 60 * 1000);
        const hours = this.currentTimeWindow / (60 * 60 * 1000);
        
        if (days > 180) {
            // Year view: monthly ticks
            return this.getMonthlyTicks();
        } else if (days > 28) {
            // Month+ view: weekly ticks
            return this.getWeeklyTicks();
        } else if (days > 1) {
            // Multi-day view (2-28 days): daily ticks
            return this.getDailyTicks();
        } else if (hours > 1) {
            // Multi-hour view (2-24 hours): hourly ticks
            return this.getHourlyTicks();
        } else {
            // Single hour or less: minute ticks
            return this.getMinuteTicks();
        }
    }

    /**
     * Get monthly tick positions
     */
    getMonthlyTicks() {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const majorTicks = [];
        const minorTicks = [];
        const labels = [];

        const timeRange = this.timeNavigator.getDateRange(this.currentTimeWindow);
        const startTime = timeRange.start.getTime();
        const endTime   = timeRange.end.getTime();
        const totalMs   = endTime - startTime;

        // Walk month-by-month through the actual date range, not January→numMonths
        let m    = timeRange.start.getMonth();
        let year = timeRange.start.getFullYear();

        for (let iter = 0; iter < 15; iter++) {          // 15 iterations = more than a year
            const monthStart   = new Date(year, m, 1, 0, 0, 0, 0);
            const monthStartMs = monthStart.getTime();
            if (monthStartMs > endTime) break;

            const t = (monthStartMs - startTime) / totalMs;
            if (t >= 0 && t <= 1) {
                majorTicks.push(t);
                labels.push(monthNames[m]);

                // Weekly minor ticks within this month
                const daysInMonth = new Date(year, m + 1, 0).getDate();
                for (let j = 1; j < 4; j++) {
                    const weekDay  = Math.floor(daysInMonth * j / 4);
                    const weekDate = new Date(year, m, weekDay, 0, 0, 0, 0);
                    const weekT    = (weekDate.getTime() - startTime) / totalMs;
                    if (weekT >= 0 && weekT <= 1) minorTicks.push(weekT);
                }
            }

            // Advance to next month
            m++;
            if (m > 11) { m = 0; year++; }
        }

        return { majorTicks, minorTicks, labels };
    }

    /**
     * Get weekly tick positions
     */
    getWeeklyTicks() {
        const majorTicks = [];
        const minorTicks = [];
        const labels = [];
        
        const weeks = Math.ceil(this.currentTimeWindow / (7 * 24 * 60 * 60 * 1000));
        
        // Get the actual time range to show correct week numbers
        const timeRange = this.timeNavigator.getDateRange(this.currentTimeWindow);
        const startDate = timeRange.start;
        
        // Helper function to get ISO week number
        const getWeekNumber = (date) => {
            const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        };
        
        for (let i = 0; i < weeks; i++) {
            majorTicks.push(i / weeks);
            
            // Calculate the actual date for this week
            const weekDate = new Date(startDate);
            weekDate.setDate(startDate.getDate() + (i * 7));
            const weekNum = getWeekNumber(weekDate);
            labels.push(`W${weekNum}`);
            
            // Daily minor ticks
            for (let j = 1; j < 7; j++) {
                minorTicks.push((i + j / 7) / weeks);
            }
        }
        
        return { majorTicks, minorTicks, labels };
    }

    /**
     * Get daily tick positions
     */
    getDailyTicks() {
        const majorTicks = [];
        const minorTicks = [];
        const labels = [];
        
        const days = Math.ceil(this.currentTimeWindow / (24 * 60 * 60 * 1000));
        
        // Get the actual time range to show correct day labels
        const timeRange = this.timeNavigator.getDateRange(this.currentTimeWindow);
        const startDate = timeRange.start;
        
        for (let i = 0; i < days; i++) {
            majorTicks.push(i / days);
            
            // Calculate the actual date for this tick
            const tickDate = new Date(startDate);
            tickDate.setDate(startDate.getDate() + i);
            labels.push(`D${tickDate.getDate()}`);
            
            // 6-hour minor ticks
            for (let j = 1; j < 4; j++) {
                minorTicks.push((i + j / 4) / days);
            }
        }
        
        return { majorTicks, minorTicks, labels };
    }

    /**
     * Get hourly tick positions
     */
    getHourlyTicks() {
        const majorTicks = [];
        const minorTicks = [];
        const labels = [];
        
        // Calculate actual number of hours in the time window
        const hours = Math.ceil(this.currentTimeWindow / (60 * 60 * 1000));
        
        // Get the actual time range to show correct hour labels
        const timeRange = this.timeNavigator.getDateRange(this.currentTimeWindow);
        const startHour = timeRange.start.getHours();
        
        for (let i = 0; i < hours; i++) {
            majorTicks.push(i / hours);
            const hourLabel = (startHour + i) % 24;
            labels.push(`${hourLabel}h`);
            
            // 10-minute minor ticks
            for (let j = 1; j < 6; j++) {
                minorTicks.push((i + j / 6) / hours);
            }
        }
        
        return { majorTicks, minorTicks, labels };
    }

    /**
     * Get minute tick positions
     */
    getMinuteTicks() {
        const majorTicks = [];
        const minorTicks = [];
        const labels = [];
        
        for (let i = 0; i < 6; i++) {
            majorTicks.push(i / 6);
            labels.push(`${i * 10}m`);
        }
        
        return { majorTicks, minorTicks, labels };
    }

    /**
     * Load data and render visualization
     */
    async loadAndRender() {
        try {
            // Get date range from time navigator and window
            const dateRange = this.timeNavigator.getDateRange(this.currentTimeWindow);
            
            // Load data
            await this.loadData(dateRange.start, dateRange.end);
            
            // Render
            this.render();
        } catch (error) {
            console.error('Error loading and rendering:', error);
            this.showError('Failed to load data');
        }
    }

    /**
     * Load data from API
     */
    async loadData(startDate, endDate) {
        try {
            // Set absolute maximum immediately (no calculation needed)
            if (!this.absoluteMaxCalculated) {
                this.absoluteMaxValue = 50; // Default for daily data
                this.absoluteMaxCalculated = true;
            }
            
            if (this.allYearsMode) {
                // Load data for all available years with the same time window pattern
                await this.loadMultiYearData(startDate, endDate);
            } else if (this.sigmaBandMode > 0) {
                // Single year mode with sigma: load display data normally,
                // then load all-years data separately for the band computation
                await this.loadSinglePeriodData(startDate, endDate);
                const savedData = this.currentData;
                await this.loadMultiYearData(startDate, endDate);
                this.sigmaData = this.currentData;
                this.currentData = savedData;
            } else {
                // Load data for single time period
                await this.loadSinglePeriodData(startDate, endDate);
            }
            
            // Calculate current window min/max from loaded data
            if (this.currentData.length > 0) {
                this.currentWindowMin = d3.min(this.currentData, d => d.kwh) || 0;
                this.currentWindowMax = d3.max(this.currentData, d => d.kwh) || 1;
            } else {
                this.currentWindowMin = 0;
                this.currentWindowMax = 1;
            }
            
            // Use absolute scale, but expand if current window exceeds it
            this.globalMinValue = 0;
            this.globalMaxValue = Math.max(this.absoluteMaxValue, this.currentWindowMax * 1.1);
            
            console.log(`Scale: min=${this.globalMinValue.toFixed(2)}, max=${this.globalMaxValue.toFixed(2)} (absolute: ${this.absoluteMaxValue.toFixed(2)}, window: ${this.currentWindowMin.toFixed(2)}-${this.currentWindowMax.toFixed(2)})`);
            console.log(`Data sample: ${this.currentData.slice(0, 3).map(d => d.kwh.toFixed(2)).join(', ')}`);
            
            this.updateInfoDisplay();
        } catch (error) {
            console.error('Error loading data:', error);
            this.currentData = [];
        }
    }

    /**
     * Calculate the absolute maximum power value across all available data
     * This is used for fixed grid lines
     * Uses daily data to match the visualization granularity
     */
    async calculateAbsoluteMaximum() {
        // Skip calculation entirely - use reasonable default
        // This prevents mobile browsers from hanging on 14+ sequential API calls
        console.log('Using default absolute maximum for mobile compatibility');
        this.absoluteMaxValue = 50; // Reasonable default for daily data
        this.absoluteMaxCalculated = true;
    }

    /**
     * Aggregate data into hourly or multi-hour buckets
     * @param {Array} data - Array of data points with timestamp and kwh
     * @param {number} hours - Number of hours per bucket (1, 6, etc.)
     * @returns {Array} Aggregated data
     */
    aggregateDataByHours(data, hours) {
        if (!data || data.length === 0) return [];
        
        const buckets = new Map();
        const msPerBucket = hours * 60 * 60 * 1000;
        
        // Group data into time buckets
        data.forEach(point => {
            const bucketTime = Math.floor(point.timestamp.getTime() / msPerBucket) * msPerBucket;
            
            if (!buckets.has(bucketTime)) {
                buckets.set(bucketTime, {
                    timestamp: new Date(bucketTime),
                    kwh: 0,
                    count: 0,
                    year: point.year
                });
            }
            
            const bucket = buckets.get(bucketTime);
            bucket.kwh += point.kwh;
            bucket.count++;
        });
        
        // Convert map to array and sort by timestamp
        return Array.from(buckets.values())
            .sort((a, b) => a.timestamp - b.timestamp)
            .map(bucket => ({
                timestamp: bucket.timestamp,
                kwh: bucket.kwh,
                year: bucket.year
            }));
    }

    /**
     * Load data for a single time period with caching
     */
    async loadSinglePeriodData(startDate, endDate) {
        // Create cache key from date range AND aggregation mode
        const cacheKey = `${startDate.toISOString()}-${endDate.toISOString()}-${this.aggregationMode}`;
        
        // Check cache first
        if (this.dataCache.has(cacheKey)) {
            console.log(`Cache hit for ${cacheKey}`);
            this.currentData = this.dataCache.get(cacheKey);
            return;
        }
        
        console.log(`Cache miss for ${cacheKey}, fetching data...`);
        const days = (endDate - startDate) / (24 * 60 * 60 * 1000);
        const hours = (endDate - startDate) / (60 * 60 * 1000);
        
        // Smart aggregation: match the SMALL ticks on the scale
        // Aim for data points that align with the finest tick marks shown
        let data;
        let aggregationPeriod;
        
        if (days > 60) {
            // For 2+ months: daily data (60-365 points)
            // Scale shows days as small ticks
            aggregationPeriod = 'days';
            const result = await API.getDailyData(
                this.timeNavigator.formatDateForAPI(startDate),
                this.timeNavigator.formatDateForAPI(endDate)
            );
            data = result.data.map(d => ({
                timestamp: new Date(d.date),
                kwh: parseFloat(d.totalKwh),
                year: new Date(d.date).getFullYear()
            }));
        } else if (days > 14) {
            // For 2 weeks to 2 months: aggregate 10-min data into 6-hour buckets
            // Scale shows quarter-day (6-hour) ticks - perfect match!
            aggregationPeriod = '6 hours';
            const result = await API.getRawData(
                this.timeNavigator.formatDateForAPI(startDate),
                this.timeNavigator.formatDateForAPI(endDate),
                20000
            );
            console.log(`Fetched ${result.data.length} raw data points for 6-hour aggregation`);
            const rawData = result.data.map(d => ({
                timestamp: new Date(d.timestamp),
                kwh: d.power * (10 / 60),
                year: new Date(d.timestamp).getFullYear()
            }));
            
            // Aggregate into 6-hour buckets
            data = this.aggregateDataByHours(rawData, 6);
            console.log(`Aggregated to ${data.length} 6-hour buckets`);
        } else if (days > 2) {
            // For 2 days to 2 weeks: aggregate 10-min data into hourly buckets
            // Better readability than 10-minute points
            aggregationPeriod = '1 hour';
            const result = await API.getRawData(
                this.timeNavigator.formatDateForAPI(startDate),
                this.timeNavigator.formatDateForAPI(endDate),
                20000
            );
            console.log(`Fetched ${result.data.length} raw data points for hourly aggregation`);
            const rawData = result.data.map(d => ({
                timestamp: new Date(d.timestamp),
                kwh: d.power * (10 / 60),
                year: new Date(d.timestamp).getFullYear()
            }));
            
            // Aggregate into 1-hour buckets
            data = this.aggregateDataByHours(rawData, 1);
            console.log(`Aggregated to ${data.length} hourly buckets`);
        } else {
            // For < 2 days: 10-minute data (~288 points/day)
            // Fine detail for very short windows
            aggregationPeriod = '10 minutes';
            const result = await API.getRawData(
                this.timeNavigator.formatDateForAPI(startDate),
                this.timeNavigator.formatDateForAPI(endDate),
                10000
            );
            data = result.data.map(d => ({
                timestamp: new Date(d.timestamp),
                kwh: d.power * (10 / 60), // Convert 10-min power to kWh
                year: new Date(d.timestamp).getFullYear()
            }));
        }
        
        
        // Update aggregation period display to show the actual tick period
        this.aggregationPeriod = aggregationPeriod;
        const periodLabel = document.getElementById('aggregation-period');
        if (periodLabel) {
            periodLabel.textContent = aggregationPeriod;
        }
        
        this.currentData = data;
        
        // Add to cache
        this.dataCache.set(cacheKey, data);
        
        // Limit cache size (LRU-style: remove oldest entries)
        if (this.dataCache.size > this.maxCacheSize) {
            const firstKey = this.dataCache.keys().next().value;
            this.dataCache.delete(firstKey);
            console.log(`Cache full, removed oldest entry: ${firstKey}`);
        }
        
        // Update global min/max if we have data
        if (data.length > 0) {
            const dataMin = d3.min(data, d => d.kwh) || 0;
            const dataMax = d3.max(data, d => d.kwh) || 1;
            this.globalMinValue = Math.min(this.globalMinValue, dataMin);
            this.globalMaxValue = Math.max(this.globalMaxValue, dataMax);
        }
    }

    /**
     * Load data for multiple years with the same time window pattern
     */
    async loadMultiYearData(startDate, endDate) {
        const allData = [];
        const currentYear = new Date().getFullYear();
        const startYear = 2012; // First year of data
        
        // Calculate the day-of-year range for the time window
        const startDayOfYear = this.getDayOfYear(startDate);
        const endDayOfYear = this.getDayOfYear(endDate);
        
        // Load data for each year
        for (let year = startYear; year <= currentYear; year++) {
            try {
                // Create date range for this year with same day-of-year pattern
                const yearStart = this.dateFromDayOfYear(year, startDayOfYear);
                const yearEnd = this.dateFromDayOfYear(year, endDayOfYear);
                
                // Store current data temporarily
                const tempData = this.currentData;
                await this.loadSinglePeriodData(yearStart, yearEnd);
                // Add the loaded data to allData
                allData.push(...this.currentData);
                // Restore for next iteration
                this.currentData = tempData;
            } catch (error) {
                console.warn(`Failed to load data for year ${year}:`, error);
            }
        }
        
        this.currentData = allData;
        console.log(`Loaded multi-year data: ${allData.length} total points across ${new Set(allData.map(d => d.year)).size} years`);
    }

    /**
     * Get day of year (1-366)
     */
    getDayOfYear(date) {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start;
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
    }

    /**
     * Create date from year and day of year
     */
    dateFromDayOfYear(year, dayOfYear) {
        const date = new Date(year, 0);
        date.setDate(dayOfYear);
        return date;
    }

    /**
     * Calculate dynamic layout based on current geometry
     * Layout is now determined by the geometry engine, not by blend calculations
     */
    calculateDynamicLayout() {
        // Get current geometry from engine
        const geometry = this.geometryEngine.calculateGeometry(
            this.currentCurvature,
            this.centerX,
            this.centerY
        );
        
        // Layout parameters are now derived from actual geometry
        if (geometry.mode === 1) {
            // Mode 1: Circular
            this.outerBorderRadius = geometry.outerArc.radius;
            this.innerBorderRadius = geometry.innerArc.radius;
            this.baseRadius = geometry.innerArc.radius;
            this.dataExtension = geometry.outerArc.radius - geometry.innerArc.radius;
        } else if (geometry.mode === 2) {
            // Mode 2: Dual arc - use actual arc radii
            this.outerBorderRadius = geometry.outerArc.radius;
            this.innerBorderRadius = geometry.innerArc.radius;
            this.baseRadius = geometry.outerArc.radius;
            this.dataExtension = geometry.outerArc.radius - geometry.innerArc.radius;
        } else {
            // Mode 3: Rectangle
            this.outerBorderRadius = 350;
            this.innerBorderRadius = 185;
            this.baseRadius = 250;
            this.dataExtension = 165;
        }
        
        console.log(`Layout (mode=${geometry.mode}): outer=${this.outerBorderRadius.toFixed(0)}, inner=${this.innerBorderRadius.toFixed(0)}, data=${this.dataExtension.toFixed(0)}`);
    }

    /**
     * Render the visualization
     */
    render() {
        // Calculate dynamic layout based on current curvature
        this.calculateDynamicLayout();
        
        // Update clip path for current geometry
        this.updateClipPath();
        
        // Update base circle
        this.drawBaseCircle();
        
        // Update borders
        this.drawBorders();
        
        // Draw scale rings (before data so they're behind)
        this.drawScaleRings();
        
        // Update ticks
        this.drawTicks();
        
        // Draw timestamp labels above the scale
        this.drawTimestampLabels();
        
        // Update legend BEFORE drawing data (so visibleYears is populated)
        if (this.allYearsMode) {
            this.updateLegend();
        } else {
            this.hideLegend();
        }
        
        // Draw data (after legend so visibleYears is set)
        this.drawData();

        // Recentre only when the time window duration changes (i.e. geometry shape changes).
        // Skipping on navigator updates avoids erratic shifting during month/week dragging.
        if (this.currentTimeWindow !== this.lastCenteredTimeWindow) {
            this.centerOnContent();
            this.lastCenteredTimeWindow = this.currentTimeWindow;
        }
    }

    setLabelFontScale(scale) {
        this.labelFontScale = scale;
        this.render();
    }

    centerOnContent() {
        try {
            const bbox = this.svg.node().getBBox();
            if (bbox.width === 0 && bbox.height === 0) return;

            const cx = bbox.x + bbox.width  / 2;
            const cy = bbox.y + bbox.height / 2;

            // Keep same viewport size (960×800), just shift origin to centre content
            this.svg.attr('viewBox', `${cx - 480} ${cy - 400} 960 800`);
        } catch (e) {
            // getBBox unavailable (e.g. hidden tab) — leave viewBox unchanged
        }
    }

    /**
     * Update clip path to match current geometry
     * Creates a clip path that constrains data rendering to the annulus shape
     */
    updateClipPath() {
        // Remove existing clip path
        this.defs.selectAll('clipPath').remove();
        
        // Get current geometry
        const geometry = this.geometryEngine.calculateGeometry(
            this.currentCurvature,
            this.centerX,
            this.centerY
        );
        
        // Create clip path based on mode
        const clipPath = this.defs.append('clipPath')
            .attr('id', 'annulus-clip');
        
        if (geometry.mode === 1) {
            // Full annular ring clip — data only exists within the arc span by construction
            // so no angular clipping is needed, and it avoids d3/SVG angle convention mismatches
            const annulusArc = d3.arc()
                .innerRadius(geometry.innerArc.radius)
                .outerRadius(geometry.outerArc.radius)
                .startAngle(0)
                .endAngle(2 * Math.PI);

            clipPath.append('path')
                .attr('d', annulusArc)
                .attr('transform', `translate(${geometry.outerArc.centerX}, ${geometry.outerArc.centerY})`);
                
        } else if (geometry.mode === 2) {
            // Mode 2: Dual arc annulus
            // Create path: outer arc → right perpendicular → inner arc (reversed) → left perpendicular → close
            const path = clipPath.append('path');
            
            const outerArc = geometry.outerArc;
            const innerArc = geometry.innerArc;
            
            // Start at left endpoint of outer arc
            const outerStartX = outerArc.centerX + outerArc.radius * Math.cos(outerArc.startAngle);
            const outerStartY = outerArc.centerY + outerArc.radius * Math.sin(outerArc.startAngle);
            
            // End at right endpoint of outer arc
            const outerEndX = outerArc.centerX + outerArc.radius * Math.cos(outerArc.endAngle);
            const outerEndY = outerArc.centerY + outerArc.radius * Math.sin(outerArc.endAngle);
            
            // Inner arc endpoints (at same angles as outer)
            const innerStartX = innerArc.centerX + innerArc.radius * Math.cos(innerArc.startAngle);
            const innerStartY = innerArc.centerY + innerArc.radius * Math.sin(innerArc.startAngle);
            
            const innerEndX = innerArc.centerX + innerArc.radius * Math.cos(innerArc.endAngle);
            const innerEndY = innerArc.centerY + innerArc.radius * Math.sin(innerArc.endAngle);
            
            // Build path
            let pathData = `M ${outerStartX} ${outerStartY} `;
            
            // Outer arc (large arc flag = 0 for upper arc)
            pathData += `A ${outerArc.radius} ${outerArc.radius} 0 0 1 ${outerEndX} ${outerEndY} `;
            
            // Right perpendicular segment
            pathData += `L ${innerEndX} ${innerEndY} `;
            
            // Inner arc (reversed, large arc flag = 0)
            pathData += `A ${innerArc.radius} ${innerArc.radius} 0 0 0 ${innerStartX} ${innerStartY} `;
            
            // Left perpendicular segment and close
            pathData += `Z`;
            
            path.attr('d', pathData);
            
        } else {
            // Mode 3: Rectangle
            // For now, use a large rectangle (will implement proper rectangle clipping later)
            clipPath.append('rect')
                .attr('x', this.centerX - 400)
                .attr('y', this.centerY - 200)
                .attr('width', 800)
                .attr('height', 400);
        }
        
        // Apply clip path to data group
        this.dataGroup.attr('clip-path', 'url(#annulus-clip)');
        
        console.log(`Updated clip path for mode ${geometry.mode}`);
    }

    /**
     * Get the effective max value for rendering, considering amplitude scale
     * @returns {number} The max value to use for scaling
     */
    getEffectiveMaxValue() {
        if (this.currentData.length === 0) {
            return this.globalMaxValue;
        }
        
        // Calculate current data max
        const currentDataMax = d3.max(this.currentData, d => d.kwh) || 1;
        
        // Blend between current data max (auto-fit) and global max based on amplitude scale
        // amplitudeScale = 0.0 → use currentDataMax (auto-fit)
        // amplitudeScale = 1.0 → use globalMaxValue (100%)
        const effectiveMax = currentDataMax + (this.globalMaxValue - currentDataMax) * this.amplitudeScale;
        
        return effectiveMax;
    }

    /**
     * Draw circular scale rings with 4-5 sensible bands
     * Uses amplitude-scaled max for dynamic scaling
     */
    drawScaleRings() {
        this.scaleRingsGroup.selectAll('*').remove();
        
        // Use amplitude-scaled max value
        const minValue = this.globalMinValue;
        const maxValue = this.getEffectiveMaxValue();
        
        // Calculate sensible band size to get 4-5 bands
        const range = maxValue - minValue;
        const targetBands = 4;
        const rawBandSize = range / targetBands;
        
        // Round to sensible values: 0.5, 1, 2, 5, 10, 20, 50, etc.
        const magnitude = Math.pow(10, Math.floor(Math.log10(rawBandSize)));
        const normalized = rawBandSize / magnitude;
        let bandSize;
        if (normalized <= 1.5) bandSize = 1 * magnitude;
        else if (normalized <= 3) bandSize = 2 * magnitude;
        else if (normalized <= 7) bandSize = 5 * magnitude;
        else bandSize = 10 * magnitude;
        
        // Round min/max to band boundaries
        const minBand = Math.floor(minValue / bandSize) * bandSize;
        const maxBand = Math.ceil(maxValue / bandSize) * bandSize;
        
        // Get geometry from engine
        const geometry = this.geometryEngine.calculateGeometry(
            this.currentCurvature,
            this.centerX,
            this.centerY
        );
        
        // Draw a ring for each band
        const scaleValues = [];
        for (let value = minBand; value <= maxBand; value += bandSize) {
            // Skip baseline and any ring that would exceed the effective max (outside outer arc)
            if (Math.abs(value) < 0.001) continue;
            if (value > maxValue * 1.001) continue;
            
            scaleValues.push(value);
            
            // Sample points around the ring
            const numPoints = 100;
            const points = [];
            
            for (let i = 0; i <= numPoints; i++) {
                const t = i / numPoints;
                // Grid lines should be INSIDE the annulus (between lower and upper arcs)
                // Use the standard calculateDataPosition which maps values to the annulus
                const pos = this.geometryEngine.calculateDataPosition(
                    t,
                    value,
                    maxValue,
                    geometry
                );
                points.push(pos);
            }
            
            // Build path
            let pathData = `M ${points[0].x},${points[0].y}`;
            for (let i = 1; i < points.length; i++) {
                pathData += ` L ${points[i].x},${points[i].y}`;
            }
            
            // Draw the ring
            this.scaleRingsGroup.append('path')
                .attr('d', pathData)
                .attr('fill', 'none')
                .attr('stroke', '#000000')
                .attr('stroke-width', 1)
                .attr('opacity', 0.5)
                .attr('class', 'scale-ring');
        }
        
        // Add labels on the straight edge (bottom split line)
        // Position labels at t=0.5 (middle of the split)
        scaleValues.forEach(value => {
            const pos = this.geometryEngine.calculateDataPosition(
                0.5, // Middle of split line
                value,
                maxValue,
                geometry
            );
            
            // Format value nicely
            const label = value < 1 ? value.toFixed(1) : value.toFixed(0);
            
            this.scaleRingsGroup.append('text')
                .attr('x', pos.x)
                .attr('y', pos.y)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('font-size', `${Math.round(10 * this.labelFontScale)}px`)
                .attr('font-family', 'monospace')
                .attr('fill', '#000000')
                .attr('opacity', 0.7)
                .text(`${label} kWh`);
        });
        
        console.log(`Drew ${scaleValues.length} scale rings with band size ${bandSize.toFixed(2)} kWh`);
    }

    /**
     * Draw data on the visualization
     * Uses amplitude-scaled max value for dynamic scaling
     */
    drawData() {
        this.dataGroup.selectAll('*').remove();
        
        if (this.currentData.length === 0) {
            console.log('No data to draw');
            return;
        }
        
        // Use amplitude-scaled max value
        const maxValue = this.getEffectiveMaxValue();
        console.log(`Drawing data: ${this.currentData.length} points, effectiveMaxValue: ${maxValue.toFixed(2)} kWh (amplitude: ${(this.amplitudeScale * 100).toFixed(0)}%)`);
        console.log(`Layout: baseRadius=${this.baseRadius}, dataExtension=${this.dataExtension}, innerRadius=${this.innerBorderRadius}`);
        
        if (this.allYearsMode) {
            // Draw σ band behind individual year lines (if enabled)
            if (this.sigmaBandMode > 0) this.drawSigmaBand(maxValue);

            // Group by year and draw each separately
            const dataByYear = d3.group(this.currentData, d => d.year);
            let colorIndex = 0;

            dataByYear.forEach((yearData, year) => {
                // Only draw if year is visible (checked in legend)
                if (this.visibleYears.has(year)) {
                    const color = this.yearColors[colorIndex % this.yearColors.length];
                    const isSelected = this.selectedYear === year;
                    console.log(`  Year ${year}: ${yearData.length} points, color: ${color}`);
                    this.drawDataPath(yearData, maxValue, color, year, isSelected);
                }
                colorIndex++;
            });
        } else {
            // Draw σ band behind single year line if enabled (uses separately loaded sigmaData)
            if (this.sigmaBandMode > 0) this.drawSigmaBand(maxValue);
            this.drawDataPath(this.currentData, maxValue, this.singleYearColor, null, false);
        }
    }

    /**
     * Draw ±1σ band across all visible years in all-years mode.
     * Band is drawn behind individual year lines.
     */
    drawSigmaBand(maxValue) {
        const timeRange = this.timeNavigator.getDateRange(this.currentTimeWindow);
        const geometry = this.geometryEngine.calculateGeometry(
            this.currentCurvature, this.centerX, this.centerY
        );

        // In single-year display mode, use the separately loaded sigmaData.
        // In all-years mode: mode 1 = visible years, mode 2 = all years.
        let sourceData;
        if (!this.allYearsMode) {
            sourceData = this.sigmaData;
        } else if (this.sigmaBandMode === 2) {
            sourceData = this.currentData;
        } else {
            sourceData = this.currentData.filter(d => this.visibleYears.has(d.year));
        }

        // Normalise each point to t ∈ [0,1] using its own year's window
        const normalised = sourceData.map(d => {
                const yr = d.timestamp.getFullYear();
                const yrStart = new Date(yr, timeRange.start.getMonth(), timeRange.start.getDate(),
                    timeRange.start.getHours(), timeRange.start.getMinutes()).getTime();
                const yrEnd   = new Date(yr, timeRange.end.getMonth(),   timeRange.end.getDate(),
                    timeRange.end.getHours(),   timeRange.end.getMinutes()).getTime();
                const t = Math.max(0, Math.min(1, (d.timestamp.getTime() - yrStart) / (yrEnd - yrStart)));
                return { t, kwh: d.kwh };
            });

        // Bin into 100 equal slices along t
        const N = 100;
        const bins = Array.from({ length: N }, () => []);
        normalised.forEach(({ t, kwh }) => {
            bins[Math.min(N - 1, Math.floor(t * N))].push(kwh);
        });

        // Compute mean ± σ per bin (skip bins with fewer than 2 years of data)
        const stats = bins.map((vals, i) => {
            if (vals.length < 2) return null;
            const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
            const sigma = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
            return { t: (i + 0.5) / N, upper: mean + sigma, lower: Math.max(0, mean - sigma) };
        }).filter(Boolean);

        if (stats.length < 2) return;

        // Build closed polygon: upper edge forward, lower edge backward
        const upper = stats.map(s =>
            this.geometryEngine.calculateDataPosition(s.t, s.upper, maxValue, geometry));
        const lower = [...stats].reverse().map(s =>
            this.geometryEngine.calculateDataPosition(s.t, s.lower, maxValue, geometry));

        const polygon = [...upper, ...lower];

        const closedPath = d3.line().x(d => d.x).y(d => d.y)
            .curve(d3.curveCardinal.tension(0.5));

        this.dataGroup.append('path')
            .datum(polygon)
            .attr('d', closedPath(polygon) + ' Z')
            .attr('clip-path', 'url(#annulus-clip)')
            .style('fill', 'rgba(150,150,150,0.4)')
            .style('stroke', 'rgba(100,100,100,0.7)')
            .style('stroke-width', 2);
    }

    /**
     * Draw a data path using new geometry engine
     */
    drawDataPath(data, maxValue, color, year = null, isSelected = false) {
        const sortedData = data.sort((a, b) => a.timestamp - b.timestamp);
        
        // Get time range for proper positioning
        const timeRange = this.timeNavigator.getDateRange(this.currentTimeWindow);
        const startTime = timeRange.start.getTime();
        const endTime = timeRange.end.getTime();
        
        console.log(`  Time range: ${timeRange.start.toISOString()} to ${timeRange.end.toISOString()}`);
        console.log(`  Data range: ${sortedData[0].timestamp.toISOString()} to ${sortedData[sortedData.length-1].timestamp.toISOString()}`);
        
        // Get geometry from new engine
        const geometry = this.geometryEngine.calculateGeometry(
            this.currentCurvature,
            this.centerX,
            this.centerY
        );
        
        // Calculate positions for each data point
        const points = sortedData.map((d, i) => {
            let t;
            
            if (this.allYearsMode && year !== null) {
                // Multi-year mode: normalize timestamp within THIS YEAR'S time window
                // Create the same day-of-year range but for this data point's year
                const dataYear = d.timestamp.getFullYear();
                const yearStartTime = new Date(dataYear, timeRange.start.getMonth(), timeRange.start.getDate(),
                                               timeRange.start.getHours(), timeRange.start.getMinutes()).getTime();
                const yearEndTime = new Date(dataYear, timeRange.end.getMonth(), timeRange.end.getDate(),
                                             timeRange.end.getHours(), timeRange.end.getMinutes()).getTime();
                
                t = (d.timestamp.getTime() - yearStartTime) / (yearEndTime - yearStartTime);
                
                if (i === 0 || i === sortedData.length - 1 || i % 50 === 0) {
                    console.log(`    Point ${i}: ${d.timestamp.toISOString().substr(0,10)}, t=${t.toFixed(4)}, kwh=${d.kwh.toFixed(2)}`);
                }
            } else {
                // Single period mode: use actual time range
                t = (d.timestamp.getTime() - startTime) / (endTime - startTime);
            }
            
            // Clamp t to [0, 1] to ensure data stays within bounds
            t = Math.max(0, Math.min(1, t));
            
            const pos = this.geometryEngine.calculateDataPosition(
                t,
                d.kwh,
                maxValue,
                geometry
            );
            return pos;
        });
        
        // Detect gaps in data - threshold depends on aggregation period
        // For monthly data: gap > 60 days, for daily: > 2 days, for 10-min: > 1 hour
        const segments = [];
        let currentSegment = [points[0]];
        
        // Determine gap threshold based on data density
        let gapThresholdDays;
        if (sortedData.length > 1) {
            const avgTimeDiff = (sortedData[sortedData.length - 1].timestamp - sortedData[0].timestamp) / (sortedData.length - 1);
            const avgDaysDiff = avgTimeDiff / (24 * 60 * 60 * 1000);
            // Gap threshold is 3x the average spacing
            gapThresholdDays = avgDaysDiff * 3;
        } else {
            gapThresholdDays = 2; // Default for single point
        }
        
        for (let i = 1; i < points.length; i++) {
            const timeDiff = sortedData[i].timestamp - sortedData[i-1].timestamp;
            const daysDiff = timeDiff / (24 * 60 * 60 * 1000);
            
            // If gap is more than threshold, start a new segment
            if (daysDiff > gapThresholdDays) {
                segments.push(currentSegment);
                currentSegment = [points[i]];
            } else {
                currentSegment.push(points[i]);
            }
        }
        segments.push(currentSegment);
        
        console.log(`  Created ${segments.length} segments, lengths: ${segments.map(s => s.length).join(', ')}`);
        
        // Create path for each segment - stroke only, no fill
        // Use curveCardinal for smoother curves that follow data points
        const line = d3.line()
            .x(d => d.x)
            .y(d => d.y)
            .curve(d3.curveCardinal.tension(0.5));
        
        let pathsCreated = 0;
        segments.forEach((segment, segIdx) => {
            if (segment.length < 2) {
                console.log(`  Segment ${segIdx}: skipped (length ${segment.length})`);
                return; // Skip single points
            }
            
            const path = this.dataGroup.append('path')
                .datum(segment)
                .attr('d', line)
                .attr('class', 'data-path')
                .attr('data-year', year)
                .style('stroke', color)
                .style('stroke-width', isSelected ? '4px' : '2px')
                .style('fill', 'none')
                .style('opacity', this.selectedYear && !isSelected ? 0.3 : 1)
                .style('cursor', year ? 'pointer' : 'default');
            
            // Add click handler for multi-year mode
            if (year) {
                path.on('click', () => {
                    this.toggleYearSelection(year);
                });
            }
            pathsCreated++;
        });
        
        console.log(`  Created ${pathsCreated} paths for ${year || 'single period'}`);
    }

    /**
     * Toggle year selection for highlighting
     */
    toggleYearSelection(year) {
        if (this.selectedYear === year) {
            this.selectedYear = null; // Deselect
        } else {
            this.selectedYear = year; // Select
        }
        
        // Update legend text styling without full re-render
        this.updateLegendSelection();
        
        // Redraw data with new selection
        this.drawData();
    }
    
    /**
     * Update legend text styling based on current selection
     */
    updateLegendSelection() {
        const legend = document.getElementById('legend');
        if (!legend) return;
        
        // Update all legend text items
        const legendItems = legend.querySelectorAll('.legend-text');
        legendItems.forEach(textDiv => {
            const text = textDiv.textContent;
            const year = parseInt(text.split(':')[0]);
            if (!isNaN(year)) {
                textDiv.style.fontWeight = (this.selectedYear === year) ? 'bold' : 'normal';
            }
        });
    }

    /**
     * Update info display
     */
    updateInfoDisplay() {
        const totalKwh = this.currentData.reduce((sum, d) => sum + d.kwh, 0);
        
        const totalGenDisplay = document.getElementById('total-generation');
        if (totalGenDisplay) {
            totalGenDisplay.textContent = `${totalKwh.toFixed(2)} kWh`;
        }
        
        const dataPointsDisplay = document.getElementById('data-points');
        if (dataPointsDisplay) {
            dataPointsDisplay.textContent = this.currentData.length;
        }
    }
    /**
     * Toggle legend sidebar visibility based on all-years mode
     */
    toggleLegendSidebar(show) {
        const legendSidebar = document.getElementById('legend-sidebar');
        if (!legendSidebar) return;
        
        if (show) {
            // Show and open the sidebar
            legendSidebar.style.display = 'flex';
            legendSidebar.classList.add('open');
        } else {
            // Hide the sidebar completely
            legendSidebar.style.display = 'none';
            legendSidebar.classList.remove('open');
        }
    }


    /**
     * Update legend for multi-year mode with checkboxes
     */
    updateLegend() {
        const legend = document.getElementById('legend');
        if (!legend) return;
        
        legend.classList.add('active');
        legend.innerHTML = '<strong>Years:</strong>';
        
        const dataByYear = d3.group(this.currentData, d => d.year);
        let colorIndex = 0;
        
        // Initialize visibleYears based on what's in the data and what user has hidden
        // Add years that are in data AND not explicitly hidden by user
        dataByYear.forEach((_, year) => {
            if (!this.hiddenYears.has(year)) {
                // Year is not hidden, so it should be visible
                this.visibleYears.add(year);
            } else {
                // Year is hidden, remove from visible
                this.visibleYears.delete(year);
            }
        });
        
        // Add "Select All" checkbox at the top
        const selectAllItem = document.createElement('div');
        selectAllItem.className = 'legend-item';
        selectAllItem.style.display = 'flex';
        selectAllItem.style.alignItems = 'center';
        selectAllItem.style.gap = '8px';
        selectAllItem.style.cursor = 'pointer';
        selectAllItem.style.marginBottom = '8px';
        selectAllItem.style.paddingBottom = '8px';
        selectAllItem.style.borderBottom = '1px solid #ccc';
        
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.checked = this.visibleYears.size === dataByYear.size;
        selectAllCheckbox.style.cursor = 'pointer';
        
        const selectAllHandler = () => {
            // Check the checkbox state AFTER it has changed
            if (selectAllCheckbox.checked) {
                // Check all - clear hidden years and add all to visible
                this.hiddenYears.clear();
                dataByYear.forEach((_, year) => this.visibleYears.add(year));
            } else {
                // Uncheck all - add all to hidden and clear visible
                dataByYear.forEach((_, year) => this.hiddenYears.add(year));
                this.visibleYears.clear();
            }
            // Only redraw data, not the entire legend (which would remove event listeners)
            this.drawData();
            // Update individual checkboxes to match
            document.querySelectorAll('.legend-item input[type="checkbox"]').forEach((cb, index) => {
                if (index > 0) { // Skip the first one (Select All)
                    cb.checked = selectAllCheckbox.checked;
                }
            });
        };
        
        // Only listen to checkbox change, not row click
        selectAllCheckbox.addEventListener('change', selectAllHandler);
        
        selectAllItem.appendChild(selectAllCheckbox);
        legend.appendChild(selectAllItem);
        
        dataByYear.forEach((yearData, year) => {
            const color = this.yearColors[colorIndex % this.yearColors.length];
            const totalKwh = yearData.reduce((sum, d) => sum + d.kwh, 0);
            const isVisible = this.visibleYears.has(year);
            const isSelected = this.selectedYear === year;
            
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '8px';
            item.style.cursor = 'pointer';
            item.style.opacity = isVisible ? 1 : 0.5;
            
            // Create checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = isVisible;
            checkbox.style.cursor = 'pointer';
            
            // Create color indicator
            const colorDiv = document.createElement('div');
            colorDiv.className = 'legend-color';
            colorDiv.style.backgroundColor = color;
            colorDiv.style.width = '12px';
            colorDiv.style.height = '12px';
            colorDiv.style.borderRadius = '2px';
            
            // Create text
            const textDiv = document.createElement('div');
            textDiv.className = 'legend-text';
            textDiv.textContent = `${year}: ${totalKwh.toFixed(0)} kWh`;
            textDiv.style.fontWeight = isSelected ? 'bold' : 'normal';
            textDiv.style.cursor = 'pointer';
            
            // Add click handler to text for selection (bold toggle)
            textDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleYearSelection(year);
            });
            
            // Add click handler to toggle visibility
            const toggleVisibility = (e) => {
                e.stopPropagation();
                if (this.visibleYears.has(year)) {
                    // Hide this year
                    this.visibleYears.delete(year);
                    this.hiddenYears.add(year);
                } else {
                    // Show this year
                    this.visibleYears.add(year);
                    this.hiddenYears.delete(year);
                }
                checkbox.checked = this.visibleYears.has(year);
                
                // Update Select All checkbox state
                const selectAllCheckbox = legend.querySelector('input[type="checkbox"]');
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = this.visibleYears.size === dataByYear.size;
                }
                
                // Only redraw data, not the entire legend (preserves event listeners)
                this.drawData();
            };
            
            // Only listen to checkbox change, not row click
            // (Row click would trigger twice: once for checkbox, once for row)
            checkbox.addEventListener('change', toggleVisibility);
            
            item.appendChild(checkbox);
            item.appendChild(colorDiv);
            item.appendChild(textDiv);
            legend.appendChild(item);
            
            colorIndex++;
        });
    }

    /**
     * Hide legend
     */
    hideLegend() {
        const legend = document.getElementById('legend');
        if (legend) {
            legend.classList.remove('active');
        }
    }

    /**
     * Show loading indicator
     */
    showLoadingIndicator() {
        // Create loading overlay if it doesn't exist
        let overlay = document.getElementById('viz-loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'viz-loading-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                color: white;
                font-size: 18px;
                font-family: Arial, sans-serif;
            `;
            overlay.innerHTML = '<div>Loading solar data...</div>';
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
    }

    /**
     * Hide loading indicator
     */
    hideLoadingIndicator() {
        const overlay = document.getElementById('viz-loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error(message);
        // Could add UI error display here
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnnularVisualization;
}

// Made with Bob
