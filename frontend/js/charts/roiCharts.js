/**
 * ROI Charts - Feed-in Tariff Earnings Visualizations
 */

class ROICharts {
    constructor() {
        this.earningsData = null;
        this.roiData = null;
        this.tariffsData = null;
    }

    /**
     * Initialize ROI dashboard
     */
    async init() {
        try {
            console.log('ROI Dashboard init started...');
            await this.loadROIData();
            await this.loadTariffsData();
            this.updateROIStats();
            console.log('About to render earnings chart...');
            await this.renderEarningsChart();
            console.log('About to render cumulative chart...');
            await this.renderCumulativeChart();
            console.log('ROI Dashboard init complete!');
        } catch (error) {
            console.error('Error initializing ROI dashboard:', error);
            this.showError('Failed to load ROI data');
        }
    }

    /**
     * Load ROI data from API
     */
    async loadROIData() {
        try {
            this.roiData = await API.getROI();
            console.log('ROI Data loaded:', this.roiData);
        } catch (error) {
            console.error('Error loading ROI data:', error);
            throw error;
        }
    }

    /**
     * Load tariffs data from API
     */
    async loadTariffsData() {
        try {
            this.tariffsData = await API.getTariffs();
            console.log('Tariffs Data loaded:', this.tariffsData);
        } catch (error) {
            console.error('Error loading tariffs data:', error);
            throw error;
        }
    }

    /**
     * Load earnings data for charts
     */
    async loadEarningsData() {
        try {
            const currentYear = new Date().getFullYear();
            this.earningsData = await API.getEarnings(2012, currentYear);
            console.log('Earnings Data loaded:', this.earningsData);
        } catch (error) {
            console.error('Error loading earnings data:', error);
            throw error;
        }
    }

    /**
     * Update ROI statistics cards
     */
    updateROIStats() {
        if (!this.roiData) return;

        // Format currency
        const formatCurrency = (value) => `£${parseFloat(value).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // Update stat cards
        document.getElementById('totalEarnings').textContent = formatCurrency(this.roiData.totalEarningsToDate);
        document.getElementById('avgYearlyEarnings').textContent = formatCurrency(this.roiData.avgYearlyEarnings);
        document.getElementById('projectedEarnings').textContent = formatCurrency(this.roiData.projectedTotalEarnings);
        
        if (this.tariffsData) {
            document.getElementById('currentTariff').textContent = `${this.tariffsData.currentTariffs.generation}p/kWh`;
        }
    }

    /**
     * Render yearly earnings bar chart
     */
    async renderEarningsChart() {
        await this.loadEarningsData();
        if (!this.earningsData || !this.earningsData.yearlyEarnings) return;

        const container = d3.select('#earningsChart');
        container.selectAll('*').remove();

        const margin = { top: 20, right: 30, bottom: 60, left: 70 };
        const containerNode = container.node();
        const containerWidth = containerNode.clientWidth || containerNode.offsetWidth || containerNode.getBoundingClientRect().width || 1200;
        const width = Math.max(containerWidth - margin.left - margin.right, 800);
        const height = 400 - margin.top - margin.bottom;

        const svg = container.append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const data = this.earningsData.yearlyEarnings;

        // X scale
        const x = d3.scaleBand()
            .domain(data.map(d => d.year))
            .range([0, width])
            .padding(0.2);

        // Y scale
        const maxEarnings = d3.max(data, d => parseFloat(d.totalEarnings));
        const y = d3.scaleLinear()
            .domain([0, maxEarnings * 1.1])
            .range([height, 0]);

        // Color scale
        const color = d3.scaleSequential()
            .domain([0, data.length - 1])
            .interpolator(d3.interpolateYlOrRd);

        // Add bars
        svg.selectAll('.bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.year))
            .attr('y', d => y(parseFloat(d.totalEarnings)))
            .attr('width', x.bandwidth())
            .attr('height', d => height - y(parseFloat(d.totalEarnings)))
            .attr('fill', (d, i) => color(i))
            .attr('opacity', 0.8)
            .on('mouseover', function(event, d) {
                d3.select(this).attr('opacity', 1);
                
                // Show tooltip
                const tooltip = svg.append('g')
                    .attr('class', 'tooltip')
                    .attr('transform', `translate(${x(d.year) + x.bandwidth() / 2}, ${y(parseFloat(d.totalEarnings)) - 10})`);

                tooltip.append('rect')
                    .attr('x', -60)
                    .attr('y', -40)
                    .attr('width', 120)
                    .attr('height', 35)
                    .attr('fill', 'white')
                    .attr('stroke', '#f59e0b')
                    .attr('stroke-width', 2)
                    .attr('rx', 5);

                tooltip.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('y', -25)
                    .style('font-weight', 'bold')
                    .text(`${d.year}`);

                tooltip.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('y', -10)
                    .style('font-size', '12px')
                    .text(`£${parseFloat(d.totalEarnings).toFixed(2)}`);
            })
            .on('mouseout', function() {
                d3.select(this).attr('opacity', 0.8);
                svg.selectAll('.tooltip').remove();
            });

        // Add X axis
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end');

        // Add Y axis
        svg.append('g')
            .call(d3.axisLeft(y).ticks(8).tickFormat(d => `£${d}`));

        // Add Y axis label
        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -50)
            .attr('x', -height / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .text('Earnings (£)');
    }

    /**
     * Render cumulative earnings line chart
     */
    async renderCumulativeChart() {
        if (!this.earningsData || !this.earningsData.yearlyEarnings) return;

        const container = d3.select('#cumulativeChart');
        container.selectAll('*').remove();

        const margin = { top: 20, right: 30, bottom: 60, left: 70 };
        const containerNode = container.node();
        const containerWidth = containerNode.clientWidth || containerNode.offsetWidth || containerNode.getBoundingClientRect().width || 1200;
        const width = Math.max(containerWidth - margin.left - margin.right, 800);
        const height = 400 - margin.top - margin.bottom;

        const svg = container.append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Calculate cumulative earnings
        let cumulative = 0;
        const data = this.earningsData.yearlyEarnings.map(d => {
            cumulative += parseFloat(d.totalEarnings);
            return {
                year: d.year,
                cumulative: cumulative
            };
        });

        // Add projection to 2037
        const avgRecentEarnings = parseFloat(this.roiData.avgYearlyEarnings);
        const currentYear = new Date().getFullYear();
        for (let year = currentYear + 1; year <= 2037; year++) {
            cumulative += avgRecentEarnings;
            data.push({
                year: year,
                cumulative: cumulative,
                projected: true
            });
        }

        // X scale
        const x = d3.scaleLinear()
            .domain([2012, 2037])
            .range([0, width]);

        // Y scale
        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.cumulative) * 1.1])
            .range([height, 0]);

        // Line generator
        const line = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.cumulative))
            .curve(d3.curveMonotoneX);

        // Split data into actual and projected
        const actualData = data.filter(d => !d.projected);
        const projectedData = data.filter(d => d.year >= currentYear);

        // Add actual earnings line
        svg.append('path')
            .datum(actualData)
            .attr('fill', 'none')
            .attr('stroke', '#f59e0b')
            .attr('stroke-width', 3)
            .attr('d', line);

        // Add projected earnings line (dashed)
        svg.append('path')
            .datum(projectedData)
            .attr('fill', 'none')
            .attr('stroke', '#f59e0b')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5')
            .attr('opacity', 0.6)
            .attr('d', line);

        // Add area under curve
        const area = d3.area()
            .x(d => x(d.year))
            .y0(height)
            .y1(d => y(d.cumulative))
            .curve(d3.curveMonotoneX);

        svg.append('path')
            .datum(actualData)
            .attr('fill', '#fbbf24')
            .attr('opacity', 0.2)
            .attr('d', area);

        // Add dots for actual data
        svg.selectAll('.dot')
            .data(actualData)
            .enter()
            .append('circle')
            .attr('class', 'dot')
            .attr('cx', d => x(d.year))
            .attr('cy', d => y(d.cumulative))
            .attr('r', 4)
            .attr('fill', '#f59e0b')
            .on('mouseover', function(event, d) {
                d3.select(this).attr('r', 6);
                
                const tooltip = svg.append('g')
                    .attr('class', 'tooltip')
                    .attr('transform', `translate(${x(d.year)}, ${y(d.cumulative) - 10})`);

                tooltip.append('rect')
                    .attr('x', -60)
                    .attr('y', -40)
                    .attr('width', 120)
                    .attr('height', 35)
                    .attr('fill', 'white')
                    .attr('stroke', '#f59e0b')
                    .attr('stroke-width', 2)
                    .attr('rx', 5);

                tooltip.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('y', -25)
                    .style('font-weight', 'bold')
                    .text(`${d.year}`);

                tooltip.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('y', -10)
                    .style('font-size', '12px')
                    .text(`£${d.cumulative.toFixed(2)}`);
            })
            .on('mouseout', function() {
                d3.select(this).attr('r', 4);
                svg.selectAll('.tooltip').remove();
            });

        // Add vertical line at current year
        svg.append('line')
            .attr('x1', x(currentYear))
            .attr('x2', x(currentYear))
            .attr('y1', 0)
            .attr('y2', height)
            .attr('stroke', '#6b7280')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '3,3');

        svg.append('text')
            .attr('x', x(currentYear))
            .attr('y', -5)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('fill', '#6b7280')
            .text('Today');

        // Add X axis
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(10));

        // Add Y axis
        svg.append('g')
            .call(d3.axisLeft(y).ticks(8).tickFormat(d => `£${d.toLocaleString()}`));

        // Add Y axis label
        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -50)
            .attr('x', -height / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .text('Cumulative Earnings (£)');

        // Add legend
        const legend = svg.append('g')
            .attr('transform', `translate(${width - 150}, 10)`);

        legend.append('line')
            .attr('x1', 0)
            .attr('x2', 30)
            .attr('y1', 0)
            .attr('y2', 0)
            .attr('stroke', '#f59e0b')
            .attr('stroke-width', 3);

        legend.append('text')
            .attr('x', 35)
            .attr('y', 4)
            .style('font-size', '12px')
            .text('Actual');

        legend.append('line')
            .attr('x1', 0)
            .attr('x2', 30)
            .attr('y1', 20)
            .attr('y2', 20)
            .attr('stroke', '#f59e0b')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5')
            .attr('opacity', 0.6);

        legend.append('text')
            .attr('x', 35)
            .attr('y', 24)
            .style('font-size', '12px')
            .text('Projected');
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('ROI Charts Error:', message);
        document.getElementById('totalEarnings').textContent = 'Error loading data';
    }
}

// Don't auto-initialize - let TabManager handle it for lazy loading
// This prevents slow page loads
console.log('ROICharts class loaded and ready');

// Made with Bob
