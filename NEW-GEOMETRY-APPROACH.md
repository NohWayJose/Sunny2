# New Geometry Approach - Arc Splitting Method

## Overview
Complete redesign of the morphing geometry. **Ditch ellipses entirely.**

## Key Principles

### 1 Year → 6 Months: Circular Geometry (Split from South)
- Maintain full circular geometry
- Split occurs at the **South** (bottom) of the circle
- Split is **symmetrical** - opens up evenly on both sides
- At 6 months: semicircle (180°)

### 6 Months → 1 Month: Arc Flattening
This is where the magic happens - two independent arcs with different constraints:

#### Upper Arc (Top Border)
- **North apex constraint**: ALWAYS goes through the same fixed point
- **Width constraint**: Extends to the same width as the diameter of the original circle
- As time window decreases, the arc flattens (radius increases)
- Endpoints move horizontally outward to maintain width

#### Lower Arc (Bottom Border)  
- **Endpoint constraint**: Endpoints ALWAYS stay on the horizontal centerline of the original circle
- **Apex distance constraint**: Lower arc's apex maintains a CONSTANT distance from the upper arc's apex
- As time window decreases, this arc also flattens (radius increases)
- The vertical separation between upper and lower arcs stays constant

#### Side Segments
- **Straight lines** connect the upper and lower arcs on both left and right sides
- These are simply the vertical (or near-vertical) connectors between arc endpoints

### 1 Month → Shorter: Jump to Rectangle
- When arcs are nearly flat (radii very large), make a discrete jump
- Assume radii = infinity (i.e., straight lines)
- Viewport becomes a **rectangle**
- No more arc calculations needed

## Geometry Constraints Summary

### Fixed Points/Distances
1. **Upper arc apex Y-coordinate**: Fixed (North point of original circle)
2. **Upper arc width**: Fixed (= diameter of original circle)
3. **Lower arc endpoint Y-coordinates**: Fixed (= centerline of original circle)
4. **Vertical separation**: Fixed distance between upper and lower arc apexes

### Variable Parameters (based on time window)
1. **Split angle** (1yr → 6mo): 0° → 180°
2. **Upper arc radius** (6mo → 1mo): Increases as arc flattens
3. **Lower arc radius** (6mo → 1mo): Increases as arc flattens
4. **Arc curvature**: Decreases toward flat

## Implementation Strategy

### Phase 1: Circular Split (1yr → 6mo)
- Calculate split angle based on time window
- Draw two symmetric arc segments from South
- Maintain circular geometry with fixed center

### Phase 2: Dual Arc Flattening (6mo → 1mo)
- Calculate upper arc radius to satisfy apex and width constraints
- Calculate lower arc radius to satisfy endpoint and separation constraints
- Draw connecting straight segments on sides

### Phase 3: Rectangle Mode (< 1mo)
- Switch to pure rectangular viewport
- All borders are straight lines
- Simpler rendering, better performance

## Data Plotting
- Data always plotted between the two arcs (upper and lower borders)
- Radial distance from baseline represents value
- Temporal position follows the arc/line geometry

## Next Steps
1. Create new geometry engine with three modes
2. Implement constraint-based arc calculations
3. Test transitions between modes
4. Verify all fixed points remain constant