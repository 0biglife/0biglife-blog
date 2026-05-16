// Cursor trail — a chain of points eases toward the cursor each frame.
// Self-contained vanilla JS: no build step, no dependencies.

const canvas = document.getElementById("trail");
const ctx = canvas.getContext("2d");

// Number of points in the trailing chain. The first follows the cursor,
// each subsequent point follows the one before it.
const POINT_COUNT = 22;

// Eased follow factor: lower = looser, more lagging trail.
const FOLLOW_EASE = 0.28;

// Strength of the idle drift (gentle orbit around the center).
const IDLE_DRIFT = 0.04;

// The accent color of the trail.
const HUE = 265;

// Logical (CSS pixel) size of the canvas, kept in sync with the container.
let width = 0;
let height = 0;

// The target the head of the chain moves toward.
const target = { x: 0, y: 0 };

// The chain of trailing points.
const points = [];

// Whether the user has moved the mouse recently.
let pointerActive = false;
let idlePhase = 0;

/** Resize the canvas to its container, accounting for device pixel ratio. */
function resize() {
  const dpr = window.devicePixelRatio || 1;
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // On the first run only, center the target and seed the chain there so the
  // trail starts from the middle. On later resizes the points keep their
  // current positions — only the idle-drift center (derived from width/height)
  // shifts, which driftTarget() already reads live, so nothing drifts off-canvas.
  if (points.length === 0) {
    target.x = width / 2;
    target.y = height / 2;
    seedPoints(target.x, target.y);
  }
}

/** Place every point at a position (used for the initial layout). */
function seedPoints(x, y) {
  points.length = 0;
  for (let i = 0; i < POINT_COUNT; i++) {
    points.push({ x, y });
  }
}

/** Linear interpolation between two values. */
function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

/** When the cursor is idle, gently orbit the target around the center. */
function driftTarget() {
  idlePhase += IDLE_DRIFT;
  const radius = Math.min(width, height) * 0.18;
  target.x = lerp(target.x, width / 2 + Math.cos(idlePhase) * radius, 0.05);
  target.y = lerp(target.y, height / 2 + Math.sin(idlePhase * 1.3) * radius, 0.05);
}

/** Advance the simulation and draw one frame. */
function render() {
  if (!pointerActive) {
    driftTarget();
  }

  // The head eases toward the target; each point eases toward the previous.
  points[0].x = lerp(points[0].x, target.x, FOLLOW_EASE);
  points[0].y = lerp(points[0].y, target.y, FOLLOW_EASE);
  for (let i = 1; i < points.length; i++) {
    points[i].x = lerp(points[i].x, points[i - 1].x, FOLLOW_EASE);
    points[i].y = lerp(points[i].y, points[i - 1].y, FOLLOW_EASE);
  }

  ctx.clearRect(0, 0, width, height);

  // Draw the trail as a fading, tapering stroke.
  for (let i = 1; i < points.length; i++) {
    const progress = i / points.length;
    const fade = 1 - progress;
    ctx.beginPath();
    ctx.moveTo(points[i - 1].x, points[i - 1].y);
    ctx.lineTo(points[i].x, points[i].y);
    ctx.lineWidth = 14 * fade + 1;
    ctx.lineCap = "round";
    ctx.strokeStyle = `hsla(${HUE + progress * 60}, 90%, 65%, ${fade})`;
    ctx.stroke();
  }

  // A soft glowing head dot.
  const head = points[0];
  ctx.beginPath();
  ctx.arc(head.x, head.y, 7, 0, Math.PI * 2);
  ctx.fillStyle = `hsl(${HUE}, 95%, 72%)`;
  ctx.shadowBlur = 24;
  ctx.shadowColor = `hsl(${HUE}, 95%, 60%)`;
  ctx.fill();
  ctx.shadowBlur = 0;

  requestAnimationFrame(render);
}

/** Update the target from a pointer position relative to the canvas. */
function onPointerMove(event) {
  const rect = canvas.getBoundingClientRect();
  const point = event.touches ? event.touches[0] : event;
  target.x = point.clientX - rect.left;
  target.y = point.clientY - rect.top;
  pointerActive = true;
}

/** Resume idle drift once the pointer leaves. */
function onPointerLeave() {
  pointerActive = false;
}

window.addEventListener("resize", resize);
canvas.addEventListener("mousemove", onPointerMove);
canvas.addEventListener("touchmove", onPointerMove, { passive: true });
canvas.addEventListener("mouseleave", onPointerLeave);
canvas.addEventListener("touchend", onPointerLeave);

// resize() also seeds the points on its first call, so init is just these two.
resize();
requestAnimationFrame(render);
