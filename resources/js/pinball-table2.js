import Matter from 'matter-js';

const { Engine, Render, Runner, Bodies, Composite, Body, Constraint } = Matter;

// =============================================================================
// CONFIG - Table 2: Wider, more bumpers, different vibe
// =============================================================================
const config = {
    table: {
        width: 450,
        topWidth: 450,
        bottomWidth: 220,
        height: 750,
        wallThickness: 12,
    },
    flipper: {
        width: 75,
        height: 14,
        gap: 10,
        yOffset: 50,
        power: 0.22,
        maxAngle: 0.7,
    },
    ball: {
        radius: 11,
        restitution: 0.7,
    },
    colors: {
        background: '#0d1117',
        walls: '#238636',
        flippers: '#f85149',
        bumpers: '#a371f7',
        ball: '#58a6ff',
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

const table = {
    left: centerX - config.table.width / 2,
    right: centerX + config.table.width / 2,
    top: centerY - config.table.height / 2,
    bottom: centerY + config.table.height / 2,
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
// TABLE WALLS
// =============================================================================
const tablePath = [
    { x: table.left, y: table.top },
    { x: table.right, y: table.top },
    { x: table.right, y: table.funnelY },
    { x: table.funnelRightX, y: table.bottom - 80 },
    { x: table.funnelRightX, y: table.bottom },
    { x: table.funnelLeftX, y: table.bottom },
    { x: table.funnelLeftX, y: table.bottom - 80 },
    { x: table.left, y: table.funnelY },
];

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
    if (i === 4) continue;
    walls.push(createWallBetweenPoints(p1, p2, config.table.wallThickness, config.colors.walls));
}

Composite.add(world, walls);

// =============================================================================
// FLIPPERS
// =============================================================================
const flipperY = table.bottom - config.flipper.yOffset;
const leftPivotX = table.funnelLeftX + 15;
const rightPivotX = table.funnelRightX - 15;

const leftFlipper = Bodies.rectangle(
    leftPivotX + config.flipper.width / 2,
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

const rightFlipper = Bodies.rectangle(
    rightPivotX - config.flipper.width / 2,
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

const leftFlipperConstraint = Constraint.create({
    pointA: { x: leftPivotX, y: flipperY },
    bodyB: leftFlipper,
    pointB: { x: -config.flipper.width / 2, y: 0 },
    stiffness: 1,
    length: 0,
    render: { visible: false }
});

const rightFlipperConstraint = Constraint.create({
    pointA: { x: rightPivotX, y: flipperY },
    bodyB: rightFlipper,
    pointB: { x: config.flipper.width / 2, y: 0 },
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
// BUMPERS - More of them in a different pattern
// =============================================================================
const bumperPositions = [
    // Top row
    { x: centerX - 90, y: table.top + 120, r: 20 },
    { x: centerX, y: table.top + 100, r: 25 },
    { x: centerX + 90, y: table.top + 120, r: 20 },
    // Middle diamond
    { x: centerX - 60, y: table.top + 200, r: 22 },
    { x: centerX + 60, y: table.top + 200, r: 22 },
    { x: centerX, y: table.top + 270, r: 28 },
    // Lower scattered
    { x: centerX - 80, y: table.top + 370, r: 18 },
    { x: centerX + 80, y: table.top + 370, r: 18 },
    { x: centerX - 40, y: table.top + 430, r: 15 },
    { x: centerX + 40, y: table.top + 430, r: 15 },
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

Matter.Events.on(engine, 'beforeUpdate', () => {
    const { power, maxAngle } = config.flipper;

    if (leftActive && leftFlipper.angle > -maxAngle) {
        Body.setAngularVelocity(leftFlipper, -power);
    } else if (!leftActive && leftFlipper.angle < 0.4) {
        Body.setAngularVelocity(leftFlipper, power * 0.6);
    } else {
        Body.setAngularVelocity(leftFlipper, 0);
    }

    if (rightActive && rightFlipper.angle < maxAngle) {
        Body.setAngularVelocity(rightFlipper, power);
    } else if (!rightActive && rightFlipper.angle > -0.4) {
        Body.setAngularVelocity(rightFlipper, -power * 0.6);
    } else {
        Body.setAngularVelocity(rightFlipper, 0);
    }
});

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

console.log('🎱 Table 2 loaded! Left/Right arrows or A/D for flippers.');

