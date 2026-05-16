// Aurora — a domain-warped fractal-noise field rendered entirely on the GPU.
// One full-screen fragment shader; the cursor offsets the noise domain.
// Self-contained vanilla WebGL: no build step, no dependencies.

const canvas = document.getElementById("gl");
const gl = canvas.getContext("webgl", { antialias: false, alpha: false });

// Passthrough vertex shader for a full-screen triangle pair.
const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// Fragment shader: two-stage domain-warped fBm, colored through a cosine
// palette, with folded sine ribbons layered on top.
const FRAG = `
precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;

// Cheap hash -> value noise -> fractal Brownian motion.
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 6; i++) {
    v += amp * noise(p);
    p = p * 2.03 + 7.13;
    amp *= 0.5;
  }
  return v;
}

// Iridescent cosine palette (after Inigo Quilez).
vec3 palette(float t) {
  vec3 a = vec3(0.52, 0.42, 0.55);
  vec3 b = vec3(0.45, 0.38, 0.48);
  vec3 c = vec3(1.0, 1.1, 0.9);
  vec3 d = vec3(0.05, 0.25, 0.55);
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float t = u_time * 0.07;
  vec2 m = (u_mouse - 0.5 * u_res) / u_res.y;

  // Domain warping: noise coordinates pushed by noise, twice over.
  vec2 q = vec2(
    fbm(uv * 1.8 + vec2(0.0, t)),
    fbm(uv * 1.8 + vec2(5.2, -t))
  );
  vec2 r = vec2(
    fbm(uv * 1.8 + 4.0 * q + vec2(1.7, 9.2) + t * 1.4 + m * 1.6),
    fbm(uv * 1.8 + 4.0 * q + vec2(8.3, 2.8) - t * 1.1 + m * 1.6)
  );
  float f = fbm(uv * 1.8 + 4.0 * r);

  // Fold the field into thin ribbons of light.
  float ribbon = abs(sin((f + length(r)) * 7.85 + t * 4.0));
  ribbon = pow(1.0 - ribbon, 3.0);

  vec3 col = palette(f + 0.35 * length(r) + t);
  col = mix(col, vec3(1.0), ribbon * 0.85);
  col *= 0.5 + 0.9 * f;             // depth shading
  col *= 1.0 - 0.45 * dot(uv, uv);  // vignette
  col += 0.03;                      // floor so darks never crush to black
  col = pow(col, vec3(0.85));       // lift the midtones

  gl_FragColor = vec4(col, 1.0);
}
`;

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
  const uMouse = gl.getUniformLocation(program, "u_mouse");

  // Mouse position in device pixels; defaults to the canvas center.
  const mouse = { x: 0, y: 0 };
  let hasMouse = false;

  /** Match the drawing buffer to the container (DPR capped for perf). */
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (!hasMouse) {
      mouse.x = canvas.width / 2;
      mouse.y = canvas.height / 2;
    }
  }

  /** Track the pointer in device pixels, flipping Y to match gl_FragCoord. */
  function trackPointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / rect.width;
    mouse.x = (clientX - rect.left) * dpr;
    mouse.y = (rect.height - (clientY - rect.top)) * dpr;
    hasMouse = true;
  }

  canvas.addEventListener("mousemove", (e) => trackPointer(e.clientX, e.clientY));
  canvas.addEventListener(
    "touchmove",
    (e) => trackPointer(e.touches[0].clientX, e.touches[0].clientY),
    { passive: true }
  );
  window.addEventListener("resize", resize);

  const t0 = performance.now();

  function render(now) {
    resize();
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, (now - t0) / 1000);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
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
