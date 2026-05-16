// Flow field — thousands of particles drift along an animated vector field.
// The field is a sum of trigonometric layers (no noise library), so it stays
// smooth and organic while remaining a single self-contained file.

const canvas = document.getElementById("field");
const ctx = canvas.getContext("2d");

// How many particles ride the field at once.
const PARTICLE_COUNT = 2800;

// Base movement speed along the field, in CSS pixels per frame.
const STEP = 1.6;

// Spatial frequency of the field — larger means tighter swirls.
const FIELD_SCALE = 0.0038;

// How fast the field itself morphs over time.
const TIME_SCALE = 0.0001;

// Frames a particle lives before it respawns elsewhere.
const MAX_AGE = 260;

// Cursor vortex: influence radius and swirl strength.
const CURSOR_RADIUS = 175;
const CURSOR_FORCE = 2.7;

// Logical (CSS pixel) canvas size, kept in sync with the container.
let width = 0;
let height = 0;

// The particle pool and the cursor state.
const particles = [];
const pointer = { x: 0, y: 0, active: false };

// A slowly drifting base hue so the palette breathes over time.
let hueBase = 200;

/** Resize the canvas to its container, accounting for device pixel ratio. */
function resize() {
  const dpr = window.devicePixelRatio || 1;
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Paint the dark stage so the opening frames are never transparent.
  ctx.fillStyle = "#06070d";
  ctx.fillRect(0, 0, width, height);

  if (particles.length === 0) seed();
}

/** A random number in [min, max). */
function rand(min, max) {
  return min + Math.random() * (max - min);
}

/** (Re)place a particle at a fresh random position and age. */
function spawn(p) {
  p.x = Math.random() * width;
  p.y = Math.random() * height;
  p.px = p.x;
  p.py = p.y;
  // Stagger ages so respawns are spread out, not synchronized.
  p.age = Math.floor(rand(0, MAX_AGE));
  p.speed = rand(0.7, 1.7);
}

/** Fill the pool on the first run. */
function seed() {
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = {};
    spawn(p);
    particles.push(p);
  }
}

// Flow direction at a point — four sine layers sum into a smooth, swirling
// field that slowly evolves with time.
function fieldAngle(x, y, t) {
  const a =
    Math.sin(x * FIELD_SCALE + t) +
    Math.cos(y * FIELD_SCALE * 1.3 - t * 0.8) +
    Math.sin((x + y) * FIELD_SCALE * 0.7 + t * 0.6) +
    Math.cos((x - y) * FIELD_SCALE * 1.1 - t * 0.4);
  return a * Math.PI;
}

/** Advance the simulation and draw one frame. */
function frame(now) {
  const t = now * TIME_SCALE;
  hueBase += 0.06;

  // Fade the previous frame instead of clearing it — particles leave glowing
  // trails that slowly dissolve into the dark background.
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(6, 7, 13, 0.075)";
  ctx.fillRect(0, 0, width, height);

  // Strokes are added together, so overlapping trails bloom into light.
  ctx.globalCompositeOperation = "lighter";
  ctx.lineWidth = 1.1;
  ctx.lineCap = "round";

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    // Base velocity from the field.
    const angle = fieldAngle(p.x, p.y, t);
    let vx = Math.cos(angle) * STEP * p.speed;
    let vy = Math.sin(angle) * STEP * p.speed;

    // The cursor injects a tangential swirl plus a gentle outward push.
    if (pointer.active) {
      const dx = p.x - pointer.x;
      const dy = p.y - pointer.y;
      const dist = Math.hypot(dx, dy);
      if (dist < CURSOR_RADIUS && dist > 0.001) {
        const fall = 1 - dist / CURSOR_RADIUS;
        const inv = 1 / dist;
        // Perpendicular component -> rotation around the cursor.
        vx += -dy * inv * CURSOR_FORCE * fall;
        vy += dx * inv * CURSOR_FORCE * fall;
        // Slight radial component so the swirl opens outward.
        vx += dx * inv * fall * 0.6;
        vy += dy * inv * fall * 0.6;
      }
    }

    p.px = p.x;
    p.py = p.y;
    p.x += vx;
    p.y += vy;
    p.age++;

    // Respawn once a particle drifts off-stage or ages out.
    if (
      p.x < -10 ||
      p.x > width + 10 ||
      p.y < -10 ||
      p.y > height + 10 ||
      p.age > MAX_AGE
    ) {
      spawn(p);
      continue;
    }

    // Faster particles glow brighter and shift hue; older ones fade out.
    const speed = Math.hypot(vx, vy);
    const life = 1 - p.age / MAX_AGE;
    const hue = (hueBase + speed * 26 + p.y * 0.05) % 360;
    const alpha = Math.min(0.5, 0.12 + speed * 0.14) * life;

    ctx.strokeStyle = `hsla(${hue}, 92%, 64%, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(p.px, p.py);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  requestAnimationFrame(frame);
}

/** Map a pointer event to canvas-local coordinates. */
function onPointerMove(event) {
  const rect = canvas.getBoundingClientRect();
  const point = event.touches ? event.touches[0] : event;
  pointer.x = point.clientX - rect.left;
  pointer.y = point.clientY - rect.top;
  pointer.active = true;
}

/** Drop the vortex once the pointer leaves. */
function onPointerLeave() {
  pointer.active = false;
}

window.addEventListener("resize", resize);
canvas.addEventListener("mousemove", onPointerMove);
canvas.addEventListener("touchmove", onPointerMove, { passive: true });
canvas.addEventListener("mouseleave", onPointerLeave);
canvas.addEventListener("touchend", onPointerLeave);

resize();
requestAnimationFrame(frame);
