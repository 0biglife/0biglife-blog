// Liquid chrome — five spheres melted together with a smooth-minimum SDF and
// rendered by ray marching. A procedural studio environment is reflected off
// the surface for a polished-metal look.
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

// Fragment shader: ray-marched metaball with chrome shading.
const FRAG = `
precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;

// Smooth minimum — blends two distance fields without a hard seam.
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Scene distance: five orbiting spheres melted into one body.
float map(vec3 p) {
  float t = u_time * 0.55;
  float d = length(p - vec3(sin(t) * 0.9, cos(t * 0.8) * 0.6, cos(t * 0.5) * 0.3)) - 0.55;
  d = smin(d, length(p - vec3(cos(t * 1.1) * 0.9, sin(t * 0.7) * 0.7, sin(t) * 0.5)) - 0.5, 0.55);
  d = smin(d, length(p - vec3(sin(t * 0.6) * 0.7, cos(t * 1.3) * 0.8, cos(t * 0.9) * 0.6)) - 0.46, 0.55);
  d = smin(d, length(p - vec3(cos(t * 0.9) * 0.5, sin(t * 1.5) * 0.5, sin(t * 1.2) * 0.7)) - 0.4, 0.5);
  d = smin(d, length(p) - 0.45, 0.6);
  return d;
}

// Surface normal from the gradient of the distance field.
vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.0016, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)
  ));
}

// Procedural studio environment, sampled for chrome reflections.
vec3 env(vec3 rd) {
  float y = rd.y * 0.5 + 0.5;
  vec3 col = mix(vec3(0.03, 0.04, 0.08), vec3(0.16, 0.23, 0.42), y);
  col += vec3(1.0, 0.62, 0.32) * smoothstep(0.6, 0.98, rd.y) * 0.7;
  vec3 key = normalize(vec3(0.6, 0.7, -0.35));
  col += vec3(1.0, 0.92, 0.82) * pow(max(dot(rd, key), 0.0), 48.0) * 1.6;
  vec3 fill = normalize(vec3(-0.7, 0.15, 0.5));
  col += vec3(0.32, 0.5, 1.0) * pow(max(dot(rd, fill), 0.0), 14.0) * 0.7;
  return col;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;

  // Orbit the camera from the cursor; a slow idle spin keeps it alive.
  vec2 m = u_mouse / u_res - 0.5;
  float yaw = m.x * 3.2 + u_time * 0.06;
  float pitch = clamp(m.y * 2.2, -1.2, 1.2);
  float cy = cos(yaw), sy = sin(yaw), cp = cos(pitch), sp = sin(pitch);
  vec3 ro = vec3(sy * cp, sp, cy * cp) * 3.3;

  // Camera basis.
  vec3 fwd = normalize(-ro);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
  vec3 up = cross(fwd, right);
  vec3 rd = normalize(fwd * 1.4 + uv.x * right + uv.y * up);

  // March the ray until it hits the surface or escapes.
  float dist = 0.0;
  float hit = 0.0;
  for (int i = 0; i < 64; i++) {
    vec3 p = ro + rd * dist;
    float d = map(p);
    if (d < 0.001) {
      hit = 1.0;
      break;
    }
    dist += d;
    if (dist > 9.0) break;
  }

  vec3 col;
  if (hit > 0.5) {
    vec3 p = ro + rd * dist;
    vec3 n = calcNormal(p);
    vec3 refl = reflect(rd, n);
    float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);

    col = env(refl);                                  // mirror reflection
    col += fres * vec3(0.7, 0.82, 1.0) * 0.7;         // bright fresnel rim
    float diff = max(dot(n, normalize(vec3(0.6, 0.7, -0.35))), 0.0);
    col += diff * vec3(0.16, 0.14, 0.11);             // faint diffuse form
    // Subtle iridescence keyed to the surface normal.
    col *= 0.82 + 0.32 * vec3(
      0.5 + 0.5 * sin(n.x * 3.1),
      0.5 + 0.5 * sin(n.y * 3.1 + 2.0),
      0.5 + 0.5 * sin(n.z * 3.1 + 4.0)
    );
  } else {
    col = env(rd);
  }

  col = col / (1.0 + col);          // Reinhard tone map
  col = pow(col, vec3(0.4545));     // gamma
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

  /** Match the drawing buffer to the container (DPR capped — ray marching
   *  is fill-rate heavy, so keep the pixel count modest). */
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
