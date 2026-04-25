# Geometry Mathematics Specification

## Fixed Constants (from original 1-year circle)

```javascript
const ORIGINAL_DIAMETER = 700;  // Original outer circle diameter
const ORIGINAL_RADIUS = 350;    // Original outer circle radius
const CENTER_X = 600;           // Fixed center X
const CENTER_Y = 400;           // Fixed center Y (horizontal centerline)
const NORTH_APEX_Y = CENTER_Y - ORIGINAL_RADIUS;  // = 50 (top of original circle)
const ANNULUS_WIDTH = 165;      // Distance between upper and lower arcs (constant)
```

## Mode 1: Circular Split (1 year → 6 months, 360° → 180°)

### Geometry
- Full circle splits from South (bottom)
- Split opens symmetrically
- Both upper and lower borders follow circular arcs with same center

### Calculations
```javascript
// Split angle: 360° at 1yr, 180° at 6mo
splitAngle = (timeWindow / ONE_YEAR) * 360;  // degrees

// Gap angle (how much is split open at South)
gapAngle = 360 - splitAngle;  // 0° at 1yr, 180° at 6mo

// Arc spans from (270° - gapAngle/2) to (270° + gapAngle/2)
// Where 270° = South (6 o'clock), measured from East (0°)
startAngle = (270 - gapAngle/2) * (PI/180);  // radians
endAngle = (270 + gapAngle/2) * (PI/180);    // radians

// Both arcs use same center and radius
centerX = CENTER_X;
centerY = CENTER_Y;
outerRadius = ORIGINAL_RADIUS;
innerRadius = ORIGINAL_RADIUS - ANNULUS_WIDTH;
```

## Mode 2: Dual Arc Flattening (6 months → 1 month, 180° → 30°)

### Upper Arc Constraints
1. **Apex passes through fixed point**: (CENTER_X, NORTH_APEX_Y)
2. **Width equals original diameter**: ORIGINAL_DIAMETER
3. **Arc is symmetric** about vertical centerline

### Upper Arc Calculations
```javascript
// Arc endpoints at y = NORTH_APEX_Y (same height as apex)
// Spread horizontally to achieve ORIGINAL_DIAMETER width
upperLeftX = CENTER_X - ORIGINAL_DIAMETER / 2;
upperRightX = CENTER_X + ORIGINAL_DIAMETER / 2;
upperY = NORTH_APEX_Y;  // All three points at same Y initially

// As we flatten (6mo → 1mo), endpoints move down while apex stays fixed
// Calculate how much endpoints drop based on time window
t = (180 - splitAngle) / 150;  // 0 at 180°, 1 at 30°

// Endpoint drop distance (increases as we flatten)
// At 180°: endpoints at apex (no drop)
// At 30°: endpoints significantly below apex
maxDrop = ANNULUS_WIDTH * 2;  // Tune this value
endpointDrop = maxDrop * t * t;  // Quadratic easing

upperEndpointY = NORTH_APEX_Y + endpointDrop;

// Now calculate arc radius and center
// Arc passes through 3 points:
// - (upperLeftX, upperEndpointY)
// - (CENTER_X, NORTH_APEX_Y)  [apex]
// - (upperRightX, upperEndpointY)

// For a symmetric arc, center is at (CENTER_X, centerY)
// We need to find centerY and radius

// Distance from center to apex (vertical)
d_apex = abs(NORTH_APEX_Y - centerY);

// Distance from center to endpoint (diagonal)
d_endpoint = sqrt((upperLeftX - CENTER_X)^2 + (upperEndpointY - centerY)^2);

// Both must equal radius: d_apex = d_endpoint = radius
// Solve for centerY:
// (NORTH_APEX_Y - centerY)^2 = (ORIGINAL_DIAMETER/2)^2 + (upperEndpointY - centerY)^2

// Rearranging:
halfWidth = ORIGINAL_DIAMETER / 2;
centerY = (NORTH_APEX_Y^2 - upperEndpointY^2 - halfWidth^2) / (2 * (NORTH_APEX_Y - upperEndpointY));
radius = abs(NORTH_APEX_Y - centerY);

upperArcCenter = { x: CENTER_X, y: centerY };
upperArcRadius = radius;
```

### Lower Arc Constraints
1. **Endpoints on horizontal centerline**: y = CENTER_Y
2. **Endpoints horizontally aligned with upper arc endpoints**: x = upperLeftX, upperRightX
3. **Constant vertical separation from upper arc apex**: ANNULUS_WIDTH

### Lower Arc Calculations
```javascript
// Endpoints fixed by upper arc
lowerLeftX = upperLeftX;
lowerRightX = upperRightX;
lowerEndpointY = CENTER_Y;  // Always on centerline

// Apex Y-coordinate maintains constant distance from upper apex
lowerApexY = NORTH_APEX_Y + ANNULUS_WIDTH;

// Arc passes through 3 points:
// - (lowerLeftX, lowerEndpointY)
// - (CENTER_X, lowerApexY)  [apex]
// - (lowerRightX, lowerEndpointY)

// Similar calculation as upper arc
halfWidth = ORIGINAL_DIAMETER / 2;
centerY = (lowerApexY^2 - lowerEndpointY^2 - halfWidth^2) / (2 * (lowerApexY - lowerEndpointY));
radius = abs(lowerApexY - centerY);

lowerArcCenter = { x: CENTER_X, y: centerY };
lowerArcRadius = radius;
```

### Side Segments
```javascript
// Left side: straight line from (upperLeftX, upperEndpointY) to (lowerLeftX, lowerEndpointY)
// Right side: straight line from (upperRightX, upperEndpointY) to (lowerRightX, lowerEndpointY)
```

## Mode 3: Rectangle (< 1 month, < 30°)

### Geometry
When arcs become nearly flat (radii very large), jump to pure rectangle.

```javascript
// Rectangle dimensions
rectWidth = ORIGINAL_DIAMETER;
rectHeight = ANNULUS_WIDTH;

// Rectangle corners
topLeft = { x: CENTER_X - rectWidth/2, y: NORTH_APEX_Y };
topRight = { x: CENTER_X + rectWidth/2, y: NORTH_APEX_Y };
bottomLeft = { x: CENTER_X - rectWidth/2, y: NORTH_APEX_Y + rectHeight };
bottomRight = { x: CENTER_X + rectWidth/2, y: NORTH_APEX_Y + rectHeight };
```

## Data Point Positioning

### Mode 1 (Circular)
```javascript
// Standard polar coordinates
angle = startAngle + t * (endAngle - startAngle);
radius = outerRadius - (value/maxValue) * ANNULUS_WIDTH;
x = CENTER_X + radius * cos(angle);
y = CENTER_Y + radius * sin(angle);
```

### Mode 2 (Dual Arc)
```javascript
// Interpolate between upper and lower arcs
// t = temporal position (0 to 1 along time axis)
// value = data value (determines position between arcs)

// Find position on upper arc at time t
upperAngle = calculateArcAngle(t, upperArcCenter, upperArcRadius, upperLeftX, upperRightX);
upperPoint = {
    x: upperArcCenter.x + upperArcRadius * cos(upperAngle),
    y: upperArcCenter.y + upperArcRadius * sin(upperAngle)
};

// Find position on lower arc at time t
lowerAngle = calculateArcAngle(t, lowerArcCenter, lowerArcRadius, lowerLeftX, lowerRightX);
lowerPoint = {
    x: lowerArcCenter.x + lowerArcRadius * cos(lowerAngle),
    y: lowerArcCenter.y + lowerArcRadius * sin(lowerAngle)
};

// Interpolate between upper and lower based on value
normalizedValue = value / maxValue;
x = upperPoint.x + (lowerPoint.x - upperPoint.x) * normalizedValue;
y = upperPoint.y + (lowerPoint.y - upperPoint.y) * normalizedValue;
```

### Mode 3 (Rectangle)
```javascript
// Simple linear interpolation
x = topLeft.x + t * rectWidth;
y = topLeft.y + (value/maxValue) * rectHeight;
```

## Helper Functions

### Calculate Arc Angle from Horizontal Position
```javascript
function calculateArcAngle(t, arcCenter, arcRadius, leftX, rightX) {
    // t is normalized position (0 to 1)
    // We need to find the angle on the arc that corresponds to this horizontal position
    
    // Target X position
    targetX = leftX + t * (rightX - leftX);
    
    // Solve for angle: arcCenter.x + arcRadius * cos(angle) = targetX
    // cos(angle) = (targetX - arcCenter.x) / arcRadius
    cosAngle = (targetX - arcCenter.x) / arcRadius;
    
    // Two solutions (upper and lower part of circle)
    // We want the one that's on our arc (check Y coordinate)
    angle = acos(cosAngle);
    
    // Return the angle that gives us a point on the correct side of the arc
    return angle;
}
```

## Transition Thresholds

```javascript
// Mode boundaries
MODE_1_TO_2_THRESHOLD = 180;  // degrees (6 months)
MODE_2_TO_3_THRESHOLD = 30;   // degrees (1 month)

function getMode(splitAngle) {
    if (splitAngle >= MODE_1_TO_2_THRESHOLD) return 1;
    if (splitAngle >= MODE_2_TO_3_THRESHOLD) return 2;
    return 3;
}