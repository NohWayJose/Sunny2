# Annular Solar Visualization - Experimental

This folder contains the experimental annular (circle-to-line morphing) visualization for solar generation data.

## Overview

An innovative D3.js visualization that displays solar generation data in a circular/linear hybrid format that morphs based on the time window being viewed. The visualization "unfolds" from a full circle (1 year view) to a straight line (1 hour view).

## Features

- **Circle-to-Line Morphing**: Smooth transition between circular (360°) and linear (0°) layouts
- **Logarithmic Time Window Control**: Navigate from 1 hour to 1 year seamlessly
- **Multi-Scale Time Navigator**: 5 synchronized sliders (Year, Month, Week, Day, Hour)
- **Multi-Year Overlay**: Compare data across multiple years with color coding
- **Adaptive Tick Marks**: Scale-appropriate labels (months, weeks, days, hours, minutes)
- **Real-time Data Integration**: Connects to existing backend API endpoints

## Design Specifications

### Visual Style
- **Circle Face**: Warm white (#fef9f3)
- **Circle Stroke**: 1px anthracite (#3a3a3a)
- **Tick Marks**: Anthracite color
- **Tick Labels**: 8pt font, centered on radial axis with 2px margins
- **Data Color**: Orange (#ff8c42) for single year, colorblind-friendly palette for multi-year

### Components

1. **Main Visualization** (`annular-viz.html`)
   - Standalone HTML page for development and testing
   - SVG-based rendering with D3.js

2. **Geometry Engine** (`js/geometry-engine.js`)
   - Circle-to-line morphing mathematics
   - Position calculations for data points and tick marks
   - Logarithmic time window scaling

3. **Time Navigator** (`js/time-navigator.js`)
   - 5-slider synchronized time control
   - Year, Month, Week, Day, Hour navigation
   - Maintains timestamp consistency across all sliders

4. **Logarithmic Slider** (`js/log-slider.js`)
   - Time window control (1 hour to 1 year)
   - Logarithmic scaling for smooth navigation
   - Real-time curvature calculation

5. **Main Visualization Class** (`js/annular-viz.js`)
   - Orchestrates all components
   - Data loading and caching
   - Rendering and animation
   - Multi-year mode support

## Usage

### Standalone Testing

1. Ensure the backend server is running:
   ```bash
   cd backend
   npm start
   ```

2. Open the visualization in a browser:
   ```
   http://localhost:3001/experimental/annular-viz.html
   ```
   Or if using a file server:
   ```
   file:///path/to/frontend/experimental/annular-viz.html
   ```

### Controls

- **Time Window Slider**: Drag to change the observation window (1 hour to 1 year)
- **Time Navigator Sliders**: Drag any of the 5 sliders to navigate through time
- **All Years Toggle**: Check to overlay data from all years for comparison

## Data Integration

The visualization uses the existing backend API endpoints:

- `/api/solar/raw` - 10-minute interval data (for day/hour views)
- `/api/solar/daily` - Daily aggregated data (for week/month views)
- `/api/solar/monthly` - Monthly aggregated data (for year views)

Data is automatically selected based on the current time window for optimal performance.

## File Structure

```
frontend/experimental/
├── README.md                    # This file
├── annular-viz.html            # Standalone visualization page
├── css/
│   └── annular-viz.css         # Visualization-specific styles
└── js/
    ├── annular-viz.js          # Main visualization class
    ├── geometry-engine.js      # Circle-to-line morphing math
    ├── log-slider.js           # Logarithmic window slider
    └── time-navigator.js       # Multi-scale time control
```

## Integration with Main Dashboard

Once tested and working, this visualization can be integrated into the main dashboard by:

1. Adding a new tab in `frontend/index.html`
2. Importing the necessary JS modules
3. Creating a container div for the visualization
4. Initializing the `AnnularVisualization` class

Example integration:
```javascript
// In main.js or new tab file
const annularViz = new AnnularVisualization('annular-container');
annularViz.initialize();
```

## Development Status

✅ Core geometry engine implemented
✅ Time window control (logarithmic slider)
✅ Multi-scale time navigator
✅ Data integration with existing API
✅ Single year visualization
✅ Multi-year overlay mode
✅ Adaptive tick marks
✅ Styling per specification

## Next Steps

- [ ] Test with real data across different time windows
- [ ] Fine-tune morphing animations
- [ ] Optimize performance for large datasets
- [ ] Add tooltips for data points
- [ ] Implement data caching strategy
- [ ] Add "play" button for time animation
- [ ] Handle data gaps (nighttime, cloudy days)
- [ ] Responsive design for mobile devices
- [ ] Integration into main dashboard

## Technical Notes

### Performance Considerations

- Uses Canvas for data points when dataset is large (>1000 points)
- SVG for controls and interactive elements
- Debounced slider movements to reduce API calls
- Data caching for recently viewed time periods
- Level-of-detail rendering based on zoom level

### Browser Compatibility

- Requires modern browser with ES6 support
- D3.js v7 for visualization
- CSS Grid for layout
- SVG for rendering

## References

- [ANNULAR-VIZ-SPEC.md](../../ANNULAR-VIZ-SPEC.md) - Full technical specification
- [D3.js Documentation](https://d3js.org/)
- [Solar Dashboard API](../../backend/src/routes/api.js)

---

**Status**: Experimental - Ready for testing
**Last Updated**: 2026-04-25