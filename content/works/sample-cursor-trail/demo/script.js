// Cursor trail — the eased point chain follows the cursor in JS, and a
// fragment shader turns it into a glowing, tapered ribbon of light. Each pixel
// measures its distance to the trail polyline and converts that into glow.
// Self-contained vanilla WebGL: no build step, no dependencies.

const canvas = document.getElementById("gl");
const gl = canvas.getContext("webgl", { antialias: false, alpha: false });

// Points in the trailing chain. The head eases toward the cursor; each
// following point eases toward the one before it.
const POINT_COUNT = 24;

// Eased follow factor — lower means a looser, more lagging trail.
const FOLLOW_EASE = 0.28;

// Idle drift: gentle orbit around the center when the cursor is still.
const IDLE_DRIFT = 0.04;

// Passthrough vertex shader for a full-screen triangle pair.
const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// Fragment shader: distance to the trail polyline -> a tapered neon ribbon.
const FRAG = `
precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_trail[24];

// Distance from point p to the segment a-b.
float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
  return length(pa - ba * h);
}

// Iridescent cosine palette.
vec3 palette(float t) {
  return 0.55 + 0.45 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.66)));
}

void main() {
  vec2 p = gl_FragCoord.xy;
  float unit = u_res.y / 720.0;   // resolution-independent line widths

  float core = 0.0;
  vec3 col = vec3(0.0);

  // Walk the 23 segments of the 24-point chain.
  for (int i = 0; i < 23; i++) {
    vec2 a = u_trail[i];
    vec2 b = u_trail[i + 1];

    float seg = float(i) / 23.0;          // 0 at the head, 1 at the tail
    float taper = 1.0 - seg;
    float width = (1.0 + 14.0 * taper) * unit;

    float d = segDist(p, a, b);
    float body = smoothstep(width, width * 0.25, d) * taper;     // solid core
    float glow = width / (d + width * 0.7) * taper * taper;      // soft halo

    vec3 segCol = palette(0.62 + seg * 0.55 + u_time * 0.05);
    col += segCol * (body * 1.3 + glow * 0.5);
    core = max(core, body);
  }

  col += vec3(1.0) * core * core * 0.85;   // hot white core

  // Subtle dark backdrop with a vignette.
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  col += vec3(0.03, 0.035, 0.06) * (1.0 - 0.55 * dot(uv, uv));

  col = col / (1.0 + col);          // tone map
  col = pow(col, vec3(0.4545));     // gamma
  gl_FragColor = vec4(col, 1.0);
}
`;

// --- Trail chain (logical / CSS pixel space) -------------------------------

let width = 0;
let height = 0;
let dpr = 1;

// The target the head of the chain moves toward.
const target = { x: 0, y: 0 };

// The chain of trailing points, head first.
const points = [];

let pointerActive = false;
let idlePhase = 0;

/** Linear interpolation. */
function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

/** Place every point at one position (used for the initial layout). */
function seedPoints(x, y) {
  points.length = 0;
  for (let i = 0; i < POINT_COUNT; i++) {
    points.push({ x, y });
  }
}

/** When the cursor is idle, gently orbit the target around the center. */
function driftTarget() {
  idlePhase += IDLE_DRIFT;
  const radius = Math.min(width, height) * 0.18;
  target.x = lerp(target.x, width / 2 + Math.cos(idlePhase) * radius, 0.05);
  target.y = lerp(target.y, height / 2 + Math.sin(idlePhase * 1.3) * radius, 0.05);
}

/** Advance the eased chain by one step. */
function updateChain() {
  if (!pointerActive) driftTarget();

  points[0].x = lerp(points[0].x, target.x, FOLLOW_EASE);
  points[0].y = lerp(points[0].y, target.y, FOLLOW_EASE);
  for (let i = 1; i < points.length; i++) {
    points[i].x = lerp(points[i].x, points[i - 1].x, FOLLOW_EASE);
    points[i].y = lerp(points[i].y, points[i - 1].y, FOLLOW_EASE);
  }
}

// --- WebGL setup -----------------------------------------------------------

/** Reveal the fallback message and stop. */
function showFallback(message) {
  const el = document.getElementById("fallback");
  el.textContent = message;
  el.style.display = "flex";
}

/** Compile one shader stage, throwing with the info log on failure. */
function compile(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "shader compile failed");
  }
  return shader;
}

function start() {
  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "program link failed");
    }
  } catch (err) {
    showFallback("셰이더를 초기화할 수 없습니다.");
    return;
  }

  gl.useProgram(program);

  // Two triangles covering clip space.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );
  const posLoc = gl.getAttribLocation(program, "a_pos");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(program, "u_res");
  const uTime = gl.getUniformLocation(program, "u_time");
  const uTrail = gl.getUniformLocation(program, "u_trail");

  // Flat [x, y, x, y, ...] buffer uploaded to the u_trail uniform each frame.
  const trailData = new Float32Array(POINT_COUNT * 2);

  /** Match the drawing buffer to the container, accounting for DPR. */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);

    // On the first run, center the target and seed the chain there.
    if (points.length === 0) {
      target.x = width / 2;
      target.y = height / 2;
      seedPoints(target.x, target.y);
    }
  }

  /** Map a pointer event to canvas-local coordinates. */
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

  resize();
  const t0 = performance.now();

  function render(now) {
    updateChain();

    // Pack the chain into device pixels, flipping Y to match gl_FragCoord.
    for (let i = 0; i < POINT_COUNT; i++) {
      trailData[i * 2] = points[i].x * dpr;
      trailData[i * 2 + 1] = (height - points[i].y) * dpr;
    }

    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, (now - t0) / 1000);
    gl.uniform2fv(uTrail, trailData);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

if (!gl) {
  showFallback("이 브라우저는 WebGL을 지원하지 않습니다.");
} else {
  start();
}
