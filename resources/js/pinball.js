import Matter from 'matter-js';

const { Engine, Render, Runner, Bodies, Composite, Body, Constraint } = Matter;

// =============================================================================
// CONFIG - All dimensions defined here
// =============================================================================
const config = {
    table: {
        width: 400,
        topWidth: 400,      // Width at top
        bottomWidth: 200,   // Width at bottom (where flippers are)
        height: 700,
        wallThickness: 12,
    },
    flipper: {
        width: 70,
        height: 14,
        gap: 10,            // Gap between flippers at center
        yOffset: 50,        // Distance from bottom
        power: 0.2,
        maxAngle: 0.7,
    },
    ball: {
        radius: 10,
        restitution: 0.6,
    },
    colors: {
        background: '#1a1a2e',
        walls: '#0f3460',
        flippers: '#e94560',
        bumpers: '#ff9a00',
        ball: '#16c79a',
    }
};

// =============================================================================
// ENGINE SETUP
// =============================================================================
const engine = Engine.create();
const world = engine.world;

const screenWidth = window.innerWidth;
const screenHeight = window.innerHeight;
const centerX = screenWidth / 2;
const centerY = screenHeight / 2;

// Table bounds (centered on screen)
const table = {
    left: centerX - config.table.width / 2,
    right: centerX + config.table.width / 2,
    top: centerY - config.table.height / 2,
    bottom: centerY + config.table.height / 2,
    // Funnel points (where it narrows)
    funnelY: centerY + config.table.height * 0.25,
    funnelLeftX: centerX - config.table.bottomWidth / 2,
    funnelRightX: centerX + config.table.bottomWidth / 2,
};

const render = Render.create({
    element: document.getElementById('pinball-container'),
    engine: engine,
    options: {
        width: screenWidth,
        height: screenHeight,
        wireframes: false,
        background: config.colors.background
    }
});

// =============================================================================
// TABLE WALLS - Defined as connected path points
// =============================================================================
// Points define the INNER edge of the table, going clockwise from top-left
const tablePath = [
    { x: table.left, y: table.top },                          // Top-left
    { x: table.right, y: table.top },                         // Top-right
    { x: table.right, y: table.funnelY },                     // Right side, start of funnel
    { x: table.funnelRightX, y: table.bottom - 80 },          // Right funnel bottom
    { x: table.funnelRightX, y: table.bottom },               // Right drain edge
    { x: table.funnelLeftX, y: table.bottom },                // Left drain edge
    { x: table.funnelLeftX, y: table.bottom - 80 },           // Left funnel bottom
    { x: table.left, y: table.funnelY },                      // Left side, start of funnel
];

// Create walls between consecutive points
function createWallBetweenPoints(p1, p2, thickness, color) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    return Bodies.rectangle(midX, midY, length + thickness, thickness, {
        isStatic: true,
        angle: angle,
        render: { fillStyle: color },
        chamfer: { radius: 2 }
    });
}

const walls = [];
for (let i = 0; i < tablePath.length; i++) {
    const p1 = tablePath[i];
    const p2 = tablePath[(i + 1) % tablePath.length];
    
    // Skip the bottom (drain opening) - from point 4 to point 5
    if (i === 4) continue;
    
    walls.push(createWallBetweenPoints(p1, p2, config.table.wallThickness, config.colors.walls));
}

Composite.add(world, walls);

// =============================================================================
// FLIPPERS - Pivot from OUTER end (near walls), extend toward center
// =============================================================================
const flipperY = table.bottom - config.flipper.yOffset;

// Pivot points are near the walls
const leftPivotX = table.funnelLeftX + 15;
const rightPivotX = table.funnelRightX - 15;

// Left flipper - pivot on LEFT end, extends RIGHT toward center
const leftFlipper = Bodies.rectangle(
    leftPivotX + config.flipper.width / 2,  // Center of flipper is to the right of pivot
    flipperY,
    config.flipper.width,
    config.flipper.height,
    {
        isStatic: false,
        render: { fillStyle: config.colors.flippers },
        chamfer: { radius: 6 },
        collisionFilter: { group: -1 }
    }
);

// Right flipper - pivot on RIGHT end, extends LEFT toward center
const rightFlipper = Bodies.rectangle(
    rightPivotX - config.flipper.width / 2,  // Center of flipper is to the left of pivot
    flipperY,
    config.flipper.width,
    config.flipper.height,
    {
        isStatic: false,
        render: { fillStyle: config.colors.flippers },
        chamfer: { radius: 6 },
        collisionFilter: { group: -1 }
    }
);

// Constraints pin the OUTER end of each flipper (near walls)
const leftFlipperConstraint = Constraint.create({
    pointA: { x: leftPivotX, y: flipperY },
    bodyB: leftFlipper,
    pointB: { x: -config.flipper.width / 2, y: 0 }, // LEFT edge of flipper = pivot end
    stiffness: 1,
    length: 0,
    render: { visible: false }
});

const rightFlipperConstraint = Constraint.create({
    pointA: { x: rightPivotX, y: flipperY },
    bodyB: rightFlipper,
    pointB: { x: config.flipper.width / 2, y: 0 }, // RIGHT edge of flipper = pivot end
    stiffness: 1,
    length: 0,
    render: { visible: false }
});

Composite.add(world, [leftFlipper, rightFlipper, leftFlipperConstraint, rightFlipperConstraint]);

// =============================================================================
// BALL
// =============================================================================
const ball = Bodies.circle(centerX, table.top + 50, config.ball.radius, {
    restitution: config.ball.restitution,
    friction: 0.001,
    frictionAir: 0.001,
    render: { fillStyle: config.colors.ball }
});

Composite.add(world, ball);

// =============================================================================
// BUMPERS
// =============================================================================
const bumperPositions = [
    { x: centerX - 70, y: table.top + 150, r: 22 },
    { x: centerX + 70, y: table.top + 150, r: 22 },
    { x: centerX, y: table.top + 220, r: 25 },
    { x: centerX - 50, y: table.top + 320, r: 18 },
    { x: centerX + 50, y: table.top + 320, r: 18 },
];

const bumpers = bumperPositions.map(b =>
    Bodies.circle(b.x, b.y, b.r, {
        isStatic: true,
        restitution: 1.5,
        render: { fillStyle: config.colors.bumpers }
    })
);

Composite.add(world, bumpers);

// =============================================================================
// CONTROLS
// =============================================================================
let leftActive = false;
let rightActive = false;

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') leftActive = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') rightActive = true;
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') leftActive = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') rightActive = false;
});

// Flipper physics each frame
Matter.Events.on(engine, 'beforeUpdate', () => {
    const { power, maxAngle } = config.flipper;

    // Left flipper: rests pointing down-left, swings UP (negative angle)
    if (leftActive && leftFlipper.angle > -maxAngle) {
        Body.setAngularVelocity(leftFlipper, -power);
    } else if (!leftActive && leftFlipper.angle < 0.4) {
        Body.setAngularVelocity(leftFlipper, power * 0.6);
    } else {
        Body.setAngularVelocity(leftFlipper, 0);
    }

    // Right flipper: rests pointing down-right, swings UP (positive angle)
    if (rightActive && rightFlipper.angle < maxAngle) {
        Body.setAngularVelocity(rightFlipper, power);
    } else if (!rightActive && rightFlipper.angle > -0.4) {
        Body.setAngularVelocity(rightFlipper, -power * 0.6);
    } else {
        Body.setAngularVelocity(rightFlipper, 0);
    }
});

// Reset ball when it drains
Matter.Events.on(engine, 'afterUpdate', () => {
    if (ball.position.y > table.bottom + 50) {
        Body.setPosition(ball, { x: centerX, y: table.top + 50 });
        Body.setVelocity(ball, { x: 0, y: 0 });
    }
});

// =============================================================================
// RUN
// =============================================================================
Render.run(render);
Runner.run(Runner.create(), engine);

console.log('🎱 Pinball ready! Left/Right arrows or A/D for flippers.');
