# Annular Visualization - Current Status

## Overview
Experimental annular visualization built in `frontend/experimental/` subfolder to avoid jeopardizing the working dashboard code.

## Access
- **URL:** http://localhost:8082/experimental/annular-viz.html
- **Server:** Node.js HTTP server on port 8082 (`node serve-frontend-node.js`)

## Completed Features ✅

### 1. Core Visualization
- Circle-to-line morphing based on time window
- Smooth transitions using D3.js v7
- Geometry engine for consistent morphing calculations
- All elements (borders, scale, ticks, data) morph together

### 2. Time Controls
- **Logarithmic time window slider:** 1 hour to 1 year
- **5-slider time navigator:** Year/Month/Week/Day/Hour
- Synchronized state management across sliders

### 3. Multi-Year Overlay Mode
- Checkbox to enable "Show All Years"
- Loads data for all years (2012-2026) with same day-of-year pattern
- Color-coded lines (15 distinct colors)
- Legend with year and total kWh

### 4. Data Integration
- API integration using existing backend endpoints
- Automatic aggregation selection (raw/daily/monthly)
- Timestamp-based positioning for accurate temporal placement

### 5. Layout & Styling
- Warm white (#fef9f3) and anthracite (#3a3a3a) color scheme
- Fixed dimensions: 800x800px viewport
- Responsive controls panel

## Current Issues ⚠️

### 1. Curve Matching ✅ IMPROVED
**Status:** Better but needs monitoring
**Details:** Borders, scale baseline, and ticks now all use geometry engine's `calculatePosition()` method

### 2. Loss of Height ⚠️ NEEDS WORK
**Problem:** As diagram flattens, vertical space collapses
**Impact:** Reduces data visibility at shorter time windows
**Solution needed:** Progressive vertical scaling

### 3. Clipping Control ⚠️ NEEDS WORK
**Problem:** Need better viewport bounds management
**Current:** Fixed layout prevents most clipping
**Solution needed:** Dynamic scaling with bounds checking

### 4. Plot Off Scale ⚠️ NEEDS INVESTIGATION
**Problem:** Data may not be positioned correctly relative to scale
**Possible causes:**
- maxValue calculation
- Data timestamp range mismatch
- Extension calculation

## Technical Architecture

### File Structure
```
frontend/experimental/
├── annular-viz.html          # Standalone page
├── README.md                  # Setup instructions
├── css/
│   └── annular-viz.css       # Styles
└── js/
    ├── annular-viz.js        # Main orchestrator
    ├── geometry-engine.js    # Morphing calculations
    ├── log-slider.js         # Logarithmic time slider
    └── time-navigator.js     # 5-slider navigator
```

### Key Classes

#### GeometryEngine
- `calculateCurvature(windowSizeMs)` - Maps time window to angle (0-360°)
- `calculatePosition(t, value, angle, radius, maxValue, centerX, centerY, maxExtension)` - Morphs between arc and line
- `calculateTickPositions()` - Positions tick marks

#### AnnularVisualization
- `calculateDynamicLayout()` - Fixed layout (baseRadius=305, dataExtension=100, innerRadius=185)
- `drawBorders()` - Annulus using geometry engine
- `drawBaseCircle()` - Scale baseline
- `drawTicks()` - Major/minor ticks with labels
- `drawData()` - Data paths (single or multi-year)
- `loadMultiYearData()` - Fetches all years with same pattern

### Layout Dimensions
```
outerBorderRadius: 350px (fixed)
baseRadius: 305px (scale position, fixed)
dataExtension: 100px (max inward extension, fixed)
innerBorderRadius: 185px (fixed, 20px clearance)
```

## Known Limitations

1. **Fixed vertical space:** No progressive scaling as diagram flattens
2. **No viewport adaptation:** 800x800px fixed size
3. **Limited error handling:** Minimal user feedback on data load failures
4. **Performance:** Not optimized for large datasets

## Next Steps

### Immediate (User Testing)
1. Test with real backend data
2. Verify data positioning and scaling
3. Check multi-year overlay performance
4. Gather feedback on usability

### Short Term (Refinement)
1. Add progressive vertical scaling
2. Implement viewport bounds checking
3. Debug data positioning issues
4. Add loading indicators
5. Improve error messages

### Long Term (Integration)
1. Integrate into main dashboard once stable
2. Add export/screenshot functionality
3. Performance optimization
4. Mobile responsiveness
5. Accessibility improvements

## Development Notes

### Git Breakpoint
Commit `cdc9466`: "BREAKPOINT: Before changing arc center from 6 o'clock to 12 o'clock"

### Key Decisions
- **Arc centering:** Changed from 6 o'clock (bottom) to 12 o'clock (top) for proper gap positioning
- **Morphing approach:** All elements use geometry engine for consistency
- **Layout strategy:** Fixed dimensions to prevent clipping (trade-off: no progressive scaling)
- **Data extension:** Inward from scale (not outward) to stay within bounds

### Debugging Tips
1. Check browser console for errors
2. Verify API responses in Network tab
3. Inspect SVG elements in DevTools
4. Check `currentData` array in console
5. Verify time range calculations

## Contact & Support
Built by Bob (AI Assistant) for Greg's solar dashboard project.