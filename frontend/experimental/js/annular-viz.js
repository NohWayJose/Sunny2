/**
 * Annular Visualization
 * Main class that orchestrates the circle-to-line morphing solar data visualization
 */

class AnnularVisualization {
    constructor(svgId) {
        this.svgId = svgId;
        this.svg = null;
        this.width = 1200;  // Wide viewport for horizontal lines
        this.height = 800;  // Tall enough for full circles
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        
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
        this.currentTimeWindow = this.geometryEngine.ONE_YEAR_MS;
        
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
            // Setup SVG
            this.setupSVG();
            
            // Initialize components
            this.timeNavigator = new TimeNavigator();
            this.logSlider = new LogSlider('time-window-slider', 'current-window', this.geometryEngine);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initial render
            await this.loadAndRender();
            
            console.log('Annular visualization initialized successfully');
        } catch (error) {
            console.error('Error initializing visualization:', error);
            this.showError('Failed to initialize visualization');
        }
    }

    /**
     * Setup SVG element and groups
     */
    setupSVG() {
        this.svg = d3.select(`#${this.svgId}`)
            .attr('viewBox', `0 0 ${this.width} ${this.height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');
        
        // Create groups for different layers
        this.borderGroup = this.svg.append('g').attr('class', 'border-layer');
        this.baseGroup = this.svg.append('g').attr('class', 'base-layer');
        this.ticksGroup = this.svg.append('g').attr('class', 'ticks-layer');
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
            this.loadAndRender();
        });
        
        // All years toggle
        const allYearsToggle = document.getElementById('all-years-toggle');
        if (allYearsToggle) {
            allYearsToggle.addEventListener('change', (e) => {
                this.allYearsMode = e.target.checked;
                this.timeNavigator.setYearSliderEnabled(!this.allYearsMode);
                this.loadAndRender();
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
            // Use a small negative value to position slightly inward from outer border
            const pos = this.geometryEngine.calculateDataPosition(t, -0.05, 1, geometry);
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
                    .text(labels[i]);
            }
        });
    }

    /**
     * Calculate tick data based on current time window
     * @returns {Object} {majorTicks, minorTicks, labels}
     */
    calculateTickData() {
        const days = this.currentTimeWindow / (24 * 60 * 60 * 1000);
        
        if (days >= 180) {
            // Year view: monthly ticks
            return this.getMonthlyTicks();
        } else if (days >= 30) {
            // Month view: weekly ticks
            return this.getWeeklyTicks();
        } else if (days >= 7) {
            // Week view: daily ticks
            return this.getDailyTicks();
        } else if (days >= 1) {
            // Day view: hourly ticks
            return this.getHourlyTicks();
        } else {
            // Hour view: 10-minute ticks
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
        
        // Calculate number of months to display based on time window
        const days = this.currentTimeWindow / (24 * 60 * 60 * 1000);
        const numMonths = Math.min(12, Math.round(days / 30));
        
        for (let i = 0; i < numMonths; i++) {
            majorTicks.push(i / numMonths);
            labels.push(monthNames[i]);
            
            // Add weekly minor ticks (4 per month)
            for (let j = 1; j < 4; j++) {
                minorTicks.push((i + j / 4) / numMonths);
            }
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
        
        for (let i = 0; i < weeks; i++) {
            majorTicks.push(i / weeks);
            labels.push(`W${i + 1}`);
            
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
        
        for (let i = 0; i < days; i++) {
            majorTicks.push(i / days);
            labels.push(`D${i + 1}`);
            
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
        
        for (let i = 0; i < 24; i++) {
            majorTicks.push(i / 24);
            labels.push(`${i}h`);
            
            // 10-minute minor ticks
            for (let j = 1; j < 6; j++) {
                minorTicks.push((i + j / 6) / 24);
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
            if (this.allYearsMode) {
                // Load data for all available years with the same time window pattern
                await this.loadMultiYearData(startDate, endDate);
            } else {
                // Load data for single time period
                await this.loadSinglePeriodData(startDate, endDate);
            }
            
            this.updateInfoDisplay();
        } catch (error) {
            console.error('Error loading data:', error);
            this.currentData = [];
        }
    }

    /**
     * Load data for a single time period
     */
    async loadSinglePeriodData(startDate, endDate) {
        const days = (endDate - startDate) / (24 * 60 * 60 * 1000);
        
        let data;
        if (days <= 1) {
            // Use raw data for day view or less
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
        } else if (days <= 31) {
            // Use daily aggregation
            const result = await API.getDailyData(
                this.timeNavigator.formatDateForAPI(startDate),
                this.timeNavigator.formatDateForAPI(endDate)
            );
            data = result.data.map(d => ({
                timestamp: new Date(d.date),
                kwh: parseFloat(d.totalKwh),
                year: new Date(d.date).getFullYear()
            }));
        } else {
            // Use monthly aggregation
            const startMonth = `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}`;
            const endMonth = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}`;
            const result = await API.getMonthlyData(startMonth, endMonth);
            data = result.data.map(d => ({
                timestamp: new Date(d.month + '-01'),
                kwh: parseFloat(d.totalKwh),
                year: parseInt(d.month.split('-')[0])
            }));
        }
        
        this.currentData = data;
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
                
                await this.loadSinglePeriodData(yearStart, yearEnd);
                allData.push(...this.currentData);
            } catch (error) {
                console.warn(`Failed to load data for year ${year}:`, error);
            }
        }
        
        this.currentData = allData;
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
     * Calculate dynamic layout based on current curvature
     * Maintains perceptual distance from outer edge and scales vertical space
     */
    calculateDynamicLayout() {
        const blend = this.currentCurvature / 360;
        
        // Keep scale at fixed position for consistent morphing
        // Scale always at radius 250 (reduced to fit in new viewport)
        this.baseRadius = 250;
        
        // Data extension: increases as diagram flattens for better visibility
        // At 360°: 80px, At 0°: 150px (nearly 2x for flat view)
        this.dataExtension = 80 + (150 - 80) * (1 - blend);
        
        // Outer border: increases distance from scale as it flattens
        // At 360°: 80px from scale, At 0°: 100px from scale
        const outerDistance = 80 + (100 - 80) * (1 - blend);
        this.outerBorderRadius = this.baseRadius + outerDistance;
        
        // Inner border: maintain 15px clearance
        this.innerBorderRadius = this.baseRadius - this.dataExtension - 15;
        
        console.log(`Layout (blend=${blend.toFixed(2)}): outer=${this.outerBorderRadius.toFixed(0)}, base=${this.baseRadius}, data=${this.dataExtension.toFixed(0)}, inner=${this.innerBorderRadius.toFixed(0)}`);
    }

    /**
     * Render the visualization
     */
    render() {
        // Calculate dynamic layout based on current curvature
        this.calculateDynamicLayout();
        
        // Update base circle
        this.drawBaseCircle();
        
        // Update borders
        this.drawBorders();
        
        // Update ticks
        this.drawTicks();
        
        // Draw data
        this.drawData();
        
        // Update legend if in all years mode
        if (this.allYearsMode) {
            this.updateLegend();
        } else {
            this.hideLegend();
        }
    }

    /**
     * Draw data on the visualization
     */
    drawData() {
        this.dataGroup.selectAll('*').remove();
        
        if (this.currentData.length === 0) {
            console.log('No data to draw');
            return;
        }
        
        // Find max value for scaling
        const maxValue = d3.max(this.currentData, d => d.kwh) || 1;
        console.log(`Drawing data: ${this.currentData.length} points, maxValue: ${maxValue.toFixed(2)} kWh`);
        console.log(`Layout: baseRadius=${this.baseRadius}, dataExtension=${this.dataExtension}, innerRadius=${this.innerBorderRadius}`);
        
        if (this.allYearsMode) {
            // Group by year and draw each separately
            const dataByYear = d3.group(this.currentData, d => d.year);
            let colorIndex = 0;
            
            dataByYear.forEach((yearData, year) => {
                const color = this.yearColors[colorIndex % this.yearColors.length];
                console.log(`  Year ${year}: ${yearData.length} points, color: ${color}`);
                this.drawDataPath(yearData, maxValue, color);
                colorIndex++;
            });
        } else {
            // Draw single year
            this.drawDataPath(this.currentData, maxValue, this.singleYearColor);
        }
    }

    /**
     * Draw a data path using new geometry engine
     */
    drawDataPath(data, maxValue, color) {
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
        
        // Calculate positions for each data point based on actual timestamp
        const points = sortedData.map((d, i) => {
            // Calculate t based on actual timestamp position in range
            const t = (d.timestamp.getTime() - startTime) / (endTime - startTime);
            const pos = this.geometryEngine.calculateDataPosition(
                t,
                d.kwh,
                maxValue,
                geometry
            );
            if (i === 0 || i === sortedData.length - 1) {
                console.log(`    Point ${i}: t=${t.toFixed(3)}, kwh=${d.kwh.toFixed(2)}, pos=(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`);
            }
            return pos;
        });
        
        // Create path - stroke only, no fill
        // Use curveCardinal for smoother curves that follow data points
        const line = d3.line()
            .x(d => d.x)
            .y(d => d.y)
            .curve(d3.curveCardinal.tension(0.5));
        
        this.dataGroup.append('path')
            .datum(points)
            .attr('d', line)
            .attr('class', 'data-path')
            .style('stroke', color)
            .style('stroke-width', 2)
            .style('fill', 'none');
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
     * Update legend for multi-year mode
     */
    updateLegend() {
        const legend = document.getElementById('legend');
        if (!legend) return;
        
        legend.classList.add('active');
        legend.innerHTML = '<strong>Years:</strong>';
        
        const dataByYear = d3.group(this.currentData, d => d.year);
        let colorIndex = 0;
        
        dataByYear.forEach((yearData, year) => {
            const color = this.yearColors[colorIndex % this.yearColors.length];
            const totalKwh = yearData.reduce((sum, d) => sum + d.kwh, 0);
            
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <div class="legend-color" style="background-color: ${color}"></div>
                <div class="legend-text">${year}: ${totalKwh.toFixed(0)} kWh</div>
            `;
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
