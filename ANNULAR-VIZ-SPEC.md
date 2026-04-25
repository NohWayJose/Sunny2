# Annular Time Visualization - Technical Specification

## Overview
An innovative D3.js visualization that displays solar generation data in a circular/linear hybrid format that morphs based on the time window being viewed.

## Core Concept: "Unfolding Circle"
- **1 Year window**: Full circle (360°) - data wraps around
- **1 Day window**: Straight line (0°) - data is linear
- **Continuous morphing**: Smooth transition between circular and linear as time window changes
- **Unfold behavior**: Circle "unfolds" from curved to flat (not a fixed center point)

## Main Visualization

### Data Representation
- **Radial dimension**: Generation values (kWh) - distance from center/baseline
- **Angular/Linear dimension**: Time progression
- **Color coding**: Used for multi-year overlays (when "All Years" mode is active)

### Tick Marks (Scale-Adaptive)
- **Major ticks**: Months (at larger scales)
- **Minor ticks**: Weeks (at larger scales)
- **Adaptive**: Tick density and labels adjust as user zooms in/out
  - Year view: Month labels
  - Month view: Week labels  
  - Week view: Day labels
  - Day view: Hour labels
  - Hour view: Minute labels (10-min intervals)

## Control 1: Logarithmic Time Window Slider

### Purpose
Controls the observation window (time span being viewed)

### Range
- **Maximum**: 1 year (365 days)
- **Minimum**: 1 hour
- **Scale**: Logarithmic (to handle the wide range smoothly)

### Effect on Visualization
- Directly controls the "curvature" of the display
- 1 year = 360° circle
- 1 hour = ~0° (nearly flat line)
- Formula: `angle = 360 * (window_size / 1_year)`

## Control 2: Multi-Scale Time Navigator

### Structure
5 parallel vertical sliders representing different time scales:
1. **Years** (2012-2026, 14 positions)
2. **Months** (1-12)
3. **Weeks** (1-52)
4. **Days** (1-31, context-aware for month length)
5. **Hours** (0-23)

### Behavior
- **Any slider draggable**: User can interact with any of the 5 sliders
- **Synchronized movement**: When one slider moves, all others update proportionally
- **Maintains consistency**: All sliders always represent the same absolute timestamp
- **Visual feedback**: Active slider highlights, others show relative position

### Example Interactions
- Drag "Days" slider: Move through days, Years/Months/Weeks/Hours all update
- Drag "Years" slider: Jump between years, other sliders maintain relative position within that year
- Drag "Hours" slider: Fine-tune time of day, date sliders stay fixed

## Control 3: Year Selection Mode

### Toggle Checkbox
- **"Selected Year" mode** (default):
  - Shows data from single year selected in Year slider
  - Single color (e.g., orange/yellow)
  - Year slider is active and visible
  
- **"All Years" mode**:
  - Shows data from ALL years that intersect the current viewport
  - Each year gets unique color
  - Legend in top-left shows year-to-color mapping
  - Year slider becomes inactive/hidden
  - Allows comparison of same time period across multiple years

### Multi-Year Color Scheme
- Distinct colors for each year (2012-2026)
- Colorblind-friendly palette
- Legend shows: Year + Color swatch + Total kWh for that year

## Data Requirements

### API Endpoints Needed
1. **High-resolution data**: `/api/solar/detailed?start=YYYY-MM-DD HH:mm&end=YYYY-MM-DD HH:mm`
   - Returns 10-minute interval data for specified range
   - Used for zoomed-in views (day/hour scales)

2. **Aggregated data**: `/api/solar/aggregated?start=YYYY-MM-DD&end=YYYY-MM-DD&interval=hour|day|week`
   - Returns pre-aggregated data for performance
   - Used for zoomed-out views (month/year scales)

### Data Format
```json
{
  "data": [
    {
      "timestamp": "2024-06-15T14:30:00Z",
      "kwh": 1.25,
      "year": 2024
    }
  ],
  "summary": {
    "totalKwh": 1234.56,
    "dataPoints": 144,
    "timeRange": {
      "start": "2024-06-15T00:00:00Z",
      "end": "2024-06-15T23:59:59Z"
    }
  }
}
```

## Technical Implementation

### File Structure
```
frontend/
├── experimental/
│   ├── annular-viz.html          # Standalone page for development
│   ├── css/
│   │   └── annular-viz.css       # Visualization-specific styles
│   └── js/
│       ├── annular-viz.js        # Main visualization class
│       ├── time-navigator.js     # Multi-scale time control
│       ├── log-slider.js         # Logarithmic window slider
│       └── geometry-engine.js    # Circle-to-line morphing math
```

### Key Algorithms

#### 1. Circle-to-Line Morphing
```javascript
// Pseudo-code
function calculatePosition(dataPoint, windowSize, totalData) {
  const angle = 360 * (windowSize / ONE_YEAR);
  const t = dataPoint.index / totalData.length; // 0 to 1
  
  if (angle === 360) {
    // Full circle
    const theta = t * 2 * Math.PI;
    return { x: radius * cos(theta), y: radius * sin(theta) };
  } else if (angle === 0) {
    // Straight line
    return { x: t * lineLength, y: 0 };
  } else {
    // Interpolate between circle and line
    const circlePos = calculateCirclePosition(t, angle);
    const linePos = calculateLinePosition(t);
    const blend = angle / 360;
    return interpolate(linePos, circlePos, blend);
  }
}
```

#### 2. Time Navigator Synchronization
```javascript
// When any slider moves
function onSliderChange(scale, value) {
  // Convert to absolute timestamp
  const timestamp = calculateAbsoluteTime(scale, value, otherSliders);
  
  // Update all other sliders
  updateYearSlider(timestamp);
  updateMonthSlider(timestamp);
  updateWeekSlider(timestamp);
  updateDaySlider(timestamp);
  updateHourSlider(timestamp);
  
  // Refresh visualization
  refreshVisualization(timestamp, currentWindowSize);
}
```

#### 3. Adaptive Tick Marks
```javascript
function calculateTicks(windowSize) {
  if (windowSize >= 180 * DAYS) {
    return { major: 'months', minor: 'weeks' };
  } else if (windowSize >= 30 * DAYS) {
    return { major: 'weeks', minor: 'days' };
  } else if (windowSize >= 7 * DAYS) {
    return { major: 'days', minor: 'hours' };
  } else if (windowSize >= 1 * DAY) {
    return { major: 'hours', minor: '10-minutes' };
  } else {
    return { major: '10-minutes', minor: 'none' };
  }
}
```

## Performance Considerations

### Data Loading Strategy
1. **Initial load**: Load current viewport data only
2. **Preload**: Load adjacent time periods in background
3. **Cache**: Keep recently viewed data in memory
4. **Throttle**: Debounce slider movements to avoid excessive API calls

### Rendering Optimization
1. **Canvas vs SVG**: Use Canvas for data points (performance), SVG for controls (interactivity)
2. **Level of Detail**: Reduce data point density when zoomed out
3. **Smooth transitions**: Use requestAnimationFrame for morphing animations

## Development Phases

### Phase 1: Core Geometry (Week 1)
- [ ] Implement circle-to-line morphing algorithm
- [ ] Create basic radial data plotting
- [ ] Test with static dataset

### Phase 2: Time Window Control (Week 1)
- [ ] Build logarithmic slider
- [ ] Connect slider to morphing algorithm
- [ ] Add smooth transitions

### Phase 3: Time Navigator (Week 2)
- [ ] Build 5-slider component
- [ ] Implement synchronization logic
- [ ] Add visual feedback

### Phase 4: Data Integration (Week 2)
- [ ] Create API endpoints for detailed/aggregated data
- [ ] Implement data loading and caching
- [ ] Connect to live database

### Phase 5: Multi-Year Mode (Week 3)
- [ ] Add year selection toggle
- [ ] Implement color coding
- [ ] Create legend component

### Phase 6: Polish & Integration (Week 3)
- [ ] Adaptive tick marks
- [ ] Animations and transitions
- [ ] Integrate into main dashboard
- [ ] Performance optimization

## Success Criteria
- [ ] Smooth morphing from circle to line
- [ ] All 5 time sliders stay synchronized
- [ ] Can navigate entire 14-year dataset
- [ ] Multi-year overlay works correctly
- [ ] Responsive and performant (60fps)
- [ ] Intuitive and discoverable UI

## Open Questions
1. Should the visualization auto-rotate to keep "now" at the top when in circular mode?
2. How should we handle data gaps (nighttime, cloudy days)?
3. Should there be a "play" button to animate through time?
4. What's the ideal size for the visualization (full screen, or embedded)?

---
*This is a living document. Update as design evolves.*