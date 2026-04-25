/**
 * Daily Chart - Line chart with area fill for daily power generation
 */

function createDailyChart(data, containerId = 'chart') {
    // Clear existing chart
    d3.select(`#${containerId}`).selectAll('*').remove();

    if (!data || data.length === 0) {
        d3.select(`#${containerId}`)
            .append('div')
            .attr('class', 'no-data-message')
            .style('text-align', 'center')
            .style('padding', '50px')
            .style('color', '#6b7280')
            .html('<p>No data available for the selected date range</p>');
        return;
    }

    // Set dimensions
    const container = document.getElementById(containerId);
    const containerWidth = container.clientWidth || container.offsetWidth || 1200;
    const margin = { top: 20, right: 30, bottom: 50, left: 70 };
    const width = Math.max(containerWidth - margin.left - margin.right, 800);
    const height = 450 - margin.top - margin.bottom;

    // Parse dates
    const parseDate = d3.timeParse('%Y-%m-%d');
    data.forEach(d => {
        d.date = parseDate(d.date);
        d.totalKwh = +d.totalKwh;
    });

    // Create SVG
    const svg = d3.select(`#${containerId}`)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.date))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.totalKwh) * 1.1])
        .nice()
        .range([height, 0]);

    // Create axes
    const xAxis = d3.axisBottom(x)
        .ticks(width > 600 ? 10 : 5)
        .tickFormat(d3.timeFormat('%b %d, %Y'));

    const yAxis = d3.axisLeft(y)
        .ticks(10)
        .tickFormat(d => `${d} kWh`);

    // Add grid lines
    svg.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat('')
        );

    // Create area generator
    const area = d3.area()
        .x(d => x(d.date))
        .y0(height)
        .y1(d => y(d.totalKwh))
        .curve(d3.curveMonotoneX);

    // Create line generator
    const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.totalKwh))
        .curve(d3.curveMonotoneX);

    // Add area
    svg.append('path')
        .datum(data)
        .attr('class', 'area')
        .attr('d', area);

    // Add line
    svg.append('path')
        .datum(data)
        .attr('class', 'line')
        .attr('d', line);

    // Add X axis
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis)
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');

    // Add Y axis
    svg.append('g')
        .attr('class', 'axis')
        .call(yAxis);

    // Add Y axis label
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .style('fill', '#6b7280')
        .style('font-size', '14px')
        .text('Daily Generation (kWh)');

    // Create tooltip
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('opacity', 0);

    // Add invisible overlay for mouse tracking
    const overlay = svg.append('rect')
        .attr('class', 'overlay')
        .attr('width', width)
        .attr('height', height)
        .style('fill', 'none')
        .style('pointer-events', 'all');

    // Add dots for data points
    const dots = svg.selectAll('.dot')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'dot')
        .attr('cx', d => x(d.date))
        .attr('cy', d => y(d.totalKwh))
        .attr('r', 4)
        .attr('fill', '#f59e0b')
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 6);

            tooltip.transition()
                .duration(200)
                .style('opacity', 1);

            tooltip.html(`
                <strong>Date:</strong> ${d3.timeFormat('%B %d, %Y')(d.date)}<br/>
                <strong>Generation:</strong> ${d.totalKwh.toFixed(2)} kWh<br/>
                <strong>Avg Power:</strong> ${d.avgPower.toFixed(2)} W<br/>
                <strong>Max Power:</strong> ${d.maxPower.toFixed(2)} W
            `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 4);

            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        });

    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([1, 10])
        .translateExtent([[0, 0], [width, height]])
        .extent([[0, 0], [width, height]])
        .on('zoom', zoomed);

    svg.call(zoom);

    function zoomed(event) {
        const newX = event.transform.rescaleX(x);
        
        // Update axes
        svg.select('.axis')
            .call(xAxis.scale(newX));

        // Update line and area
        svg.select('.line')
            .attr('d', line.x(d => newX(d.date)));

        svg.select('.area')
            .attr('d', area.x(d => newX(d.date)));

        // Update dots
        dots.attr('cx', d => newX(d.date));
    }

    // Add title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', '600')
        .style('fill', '#111827')
        .text('Daily Power Generation');
}

// Made with Bob
