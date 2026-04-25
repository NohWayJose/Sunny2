/**
 * Yearly Chart - Bar chart for yearly power generation comparison
 */

function createYearlyChart(data, containerId = 'chart') {
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
    const margin = { top: 20, right: 30, bottom: 60, left: 70 };
    const width = Math.max(containerWidth - margin.left - margin.right, 800);
    const height = 450 - margin.top - margin.bottom;

    // Prepare data
    data.forEach(d => {
        d.year = +d.year;
        d.totalKwh = +d.totalKwh;
        d.avgMonthlyKwh = +d.avgMonthlyKwh;
    });

    // Calculate year-over-year growth
    data.forEach((d, i) => {
        if (i > 0) {
            const prevYear = data[i - 1];
            d.growth = ((d.totalKwh - prevYear.totalKwh) / prevYear.totalKwh * 100).toFixed(1);
        } else {
            d.growth = null;
        }
    });

    // Create SVG
    const svg = d3.select(`#${containerId}`)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const x = d3.scaleBand()
        .domain(data.map(d => d.year))
        .range([0, width])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.totalKwh) * 1.1])
        .nice()
        .range([height, 0]);

    // Color scale based on generation
    const colorScale = d3.scaleSequential()
        .domain([d3.min(data, d => d.totalKwh), d3.max(data, d => d.totalKwh)])
        .interpolator(d3.interpolateYlOrRd);

    // Create axes
    const xAxis = d3.axisBottom(x)
        .tickFormat(d => d.toString());

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

    // Create tooltip
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('opacity', 0);

    // Add bars
    const bars = svg.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.year))
        .attr('width', x.bandwidth())
        .attr('y', height)
        .attr('height', 0)
        .attr('fill', d => colorScale(d.totalKwh))
        .style('cursor', 'pointer');

    // Animate bars
    bars.transition()
        .duration(1000)
        .delay((d, i) => i * 100)
        .attr('y', d => y(d.totalKwh))
        .attr('height', d => height - y(d.totalKwh));

    // Add hover effects
    bars
        .on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 0.7);

            tooltip.transition()
                .duration(200)
                .style('opacity', 1);

            const growthText = d.growth !== null 
                ? `<br/><strong>YoY Growth:</strong> ${d.growth > 0 ? '+' : ''}${d.growth}%`
                : '';

            tooltip.html(`
                <strong>Year:</strong> ${d.year}<br/>
                <strong>Total Generation:</strong> ${parseFloat(d.totalKwh).toFixed(2)} kWh<br/>
                <strong>Avg Monthly:</strong> ${parseFloat(d.avgMonthlyKwh).toFixed(2)} kWh<br/>
                <strong>Months:</strong> ${d.monthsInYear}<br/>
                <strong>Peak Month:</strong> ${d.peakMonth || 'N/A'}<br/>
                <strong>Peak Month kWh:</strong> ${d.peakMonthKwh ? parseFloat(d.peakMonthKwh).toFixed(2) : 'N/A'}${growthText}
            `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 1);

            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        });

    // Add value labels on top of bars
    svg.selectAll('.bar-label')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'bar-label')
        .attr('x', d => x(d.year) + x.bandwidth() / 2)
        .attr('y', d => y(d.totalKwh) - 5)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', '#111827')
        .style('opacity', 0)
        .text(d => d.totalKwh.toFixed(0))
        .transition()
        .delay((d, i) => i * 100 + 1000)
        .duration(500)
        .style('opacity', 1);

    // Add growth indicators
    data.forEach((d, i) => {
        if (d.growth !== null && i > 0) {
            const prevYear = data[i - 1];
            const x1 = x(prevYear.year) + x.bandwidth() / 2;
            const x2 = x(d.year) + x.bandwidth() / 2;
            const y1 = y(prevYear.totalKwh);
            const y2 = y(d.totalKwh);

            // Add growth arrow
            svg.append('line')
                .attr('x1', x1)
                .attr('y1', y1)
                .attr('x2', x2)
                .attr('y2', y2)
                .attr('stroke', d.growth > 0 ? '#10b981' : '#ef4444')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '3,3')
                .attr('opacity', 0.3);
        }
    });

    // Add X axis
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis);

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
        .text('Yearly Generation (kWh)');

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
        .text('Yearly Power Generation Comparison');

    // Add legend for growth indicators
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 150}, 20)`);

    legend.append('line')
        .attr('x1', 0)
        .attr('x2', 20)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', '#10b981')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3');

    legend.append('text')
        .attr('x', 25)
        .attr('y', 4)
        .style('font-size', '11px')
        .style('fill', '#6b7280')
        .text('Growth');

    legend.append('line')
        .attr('x1', 0)
        .attr('x2', 20)
        .attr('y1', 15)
        .attr('y2', 15)
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3');

    legend.append('text')
        .attr('x', 25)
        .attr('y', 19)
        .style('font-size', '11px')
        .style('fill', '#6b7280')
        .text('Decline');
}

// Made with Bob
