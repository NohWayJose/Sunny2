/**
 * Monthly Chart - Line chart with markers for monthly power generation
 */

function createMonthlyChart(data, containerId = 'chart') {
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
    const margin = { top: 20, right: 30, bottom: 70, left: 70 };
    const width = Math.max(containerWidth - margin.left - margin.right, 800);
    const height = 450 - margin.top - margin.bottom;

    // Parse months and prepare data
    const parseMonth = d3.timeParse('%Y-%m');
    data.forEach(d => {
        d.monthDate = parseMonth(d.month);
        d.totalKwh = +d.totalKwh;
        d.avgDailyKwh = +d.avgDailyKwh;
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
        .domain(d3.extent(data, d => d.monthDate))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.totalKwh) * 1.1])
        .nice()
        .range([height, 0]);

    // Create axes
    const xAxis = d3.axisBottom(x)
        .ticks(width > 600 ? d3.timeMonth.every(1) : d3.timeMonth.every(2))
        .tickFormat(d3.timeFormat('%b %Y'));

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

    // Create line generator
    const line = d3.line()
        .x(d => x(d.monthDate))
        .y(d => y(d.totalKwh))
        .curve(d3.curveMonotoneX);

    // Add line
    const path = svg.append('path')
        .datum(data)
        .attr('class', 'line')
        .attr('d', line);

    // Animate line drawing
    const totalLength = path.node().getTotalLength();
    path
        .attr('stroke-dasharray', totalLength + ' ' + totalLength)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', 0);

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
        .text('Monthly Generation (kWh)');

    // Create tooltip
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('opacity', 0);

    // Add markers (circles) for each data point
    const markers = svg.selectAll('.marker')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'marker')
        .attr('cx', d => x(d.monthDate))
        .attr('cy', d => y(d.totalKwh))
        .attr('r', 0)
        .attr('fill', '#f59e0b')
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer');

    // Animate markers
    markers.transition()
        .delay((d, i) => i * 50)
        .duration(500)
        .attr('r', 5);

    // Add hover effects
    markers
        .on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 8);

            tooltip.transition()
                .duration(200)
                .style('opacity', 1);

            tooltip.html(`
                <strong>Month:</strong> ${d3.timeFormat('%B %Y')(d.monthDate)}<br/>
                <strong>Total Generation:</strong> ${d.totalKwh.toFixed(2)} kWh<br/>
                <strong>Avg Daily:</strong> ${d.avgDailyKwh.toFixed(2)} kWh<br/>
                <strong>Days in Month:</strong> ${d.daysInMonth}<br/>
                <strong>Peak Day:</strong> ${d.peakDay ? new Date(d.peakDay).toLocaleDateString() : 'N/A'}<br/>
                <strong>Peak Day kWh:</strong> ${d.peakDayKwh ? d.peakDayKwh.toFixed(2) : 'N/A'}
            `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 5);

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

        // Update line
        svg.select('.line')
            .attr('d', line.x(d => newX(d.monthDate)));

        // Update markers
        markers.attr('cx', d => newX(d.monthDate));
    }

    // Add average line
    const avgValue = d3.mean(data, d => d.totalKwh);
    svg.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', y(avgValue))
        .attr('y2', y(avgValue))
        .attr('stroke', '#3b82f6')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.5);

    // Add average label
    svg.append('text')
        .attr('x', width - 5)
        .attr('y', y(avgValue) - 5)
        .attr('text-anchor', 'end')
        .style('font-size', '12px')
        .style('fill', '#3b82f6')
        .text(`Avg: ${avgValue.toFixed(2)} kWh`);

    // Add title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', '600')
        .style('fill', '#111827')
        .text('Monthly Power Generation');
}

// Made with Bob
