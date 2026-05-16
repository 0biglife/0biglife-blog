// Ink fluid — a velocity field and a dye field on the GPU. The cursor stirs
// the velocity; the dye is carried along by it. Semi-Lagrangian advection
// (trace each pixel one step backward) keeps the simulation unconditionally
// stable. Four ping-pong passes per frame.
// Self-contained vanilla WebGL2: no build step, no dependencies.

const canvas = document.getElementById("gl");
const fallback = document.getElementById("fallback");
const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });

/** Reveal the fallback message and stop. */
function showFallback(message) {
  fallback.textContent = message;
  fallback.style.display = "flex";
}

// Fixed simulation grid.
const SIM_W = 512;
const SIM_H = 288;

// Shader sources -------------------------------------------------------------

const QUAD_VS = `#version 300 es
layout(location = 0) in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// Advect any field: trace backward along the velocity, sample, dissipate.
const ADVECT_FS = `#version 300 es
precision highp float;
uniform sampler2D u_src;
uniform sampler2D u_velocity;
uniform float u_dissipation;
in vec2 v_uv;
out vec4 outColor;
void main() {
  vec2 vel = texture(u_velocity, v_uv).xy;
  vec2 source = v_uv - vel;
  outColor = texture(u_src, source) * u_dissipation;
}`;

// Splat: add a Gaussian dab at the cursor. Velocity passes also pick up a
// faint curl-noise drift so the ink keeps moving on its own.
const SPLAT_FS = `#version 300 es
precision highp float;
uniform sampler2D u_src;
uniform vec3 u_splat;
uniform vec2 u_mouse;
uniform float u_radius;
uniform float u_aspect;
uniform float u_ambient;
uniform float u_time;
in vec2 v_uv;
out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.05 + 3.1; a *= 0.5; }
  return v;
}
float potential(vec2 p) { return fbm(p * 2.4 + vec2(0.0, u_time * 0.05)); }
vec2 curl(vec2 p) {
  float e = 0.02;
  float dx = potential(p + vec2(e, 0.0)) - potential(p - vec2(e, 0.0));
  float dy = potential(p + vec2(0.0, e)) - potential(p - vec2(0.0, e));
  return vec2(dy, -dx) / (2.0 * e);
}

void main() {
  vec4 base = texture(u_src, v_uv);

  vec2 d = (v_uv - u_mouse) * vec2(u_aspect, 1.0);
  float g = exp(-dot(d, d) / u_radius);
  base.rgb += u_splat * g;

  // Velocity pass only: ambient drift + a clamp so it never runs away.
  if (u_ambient > 0.5) {
    base.xy += curl(v_uv) * 0.00022;
    base.xy = clamp(base.xy, vec2(-0.03), vec2(0.03));
  }

  outColor = base;
}`;

// Present the dye field.
const RENDER_FS = `#version 300 es
precision highp float;
uniform sampler2D u_dye;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec3 c = texture(u_dye, v_uv).rgb;
  vec2 uv = v_uv - 0.5;
  c *= 1.0 - 0.55 * dot(uv, uv);   // vignette
  c = c / (1.0 + c);               // tone map
  c = pow(c, vec3(0.78));          // lift the midtones
  fragColor = vec4(c + vec3(0.018, 0.022, 0.045), 1.0);
}`;

// WebGL helpers --------------------------------------------------------------

function compile(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "shader compile failed");
  }
  return shader;
}

function program(vsSource, fsSource) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSource));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSource));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog) || "program link failed");
  }
  return prog;
}

function start() {
  const advectProg = program(QUAD_VS, ADVECT_FS);
  const splatProg = program(QUAD_VS, SPLAT_FS);
  const renderProg = program(QUAD_VS, RENDER_FS);

  // Shared full-screen quad.
  const quadVAO = gl.createVertexArray();
  gl.bindVertexArray(quadVAO);
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  /** Create an RGBA16F field texture with bilinear filtering. */
  function makeField(data) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, SIM_W, SIM_H, 0, gl.RGBA, gl.FLOAT, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  function makeFBO(tex) {
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return fbo;
  }

  // Dye starts with a few soft colored blobs so the screen is alive at once.
  const dyeSeed = new Float32Array(SIM_W * SIM_H * 4);
  const blobs = [];
  for (let i = 0; i < 5; i++) {
    blobs.push({
      x: Math.random() * SIM_W,
      y: Math.random() * SIM_H,
      r: 38 + Math.random() * 34,
      col: [0.4 + Math.random() * 0.6, 0.3 + Math.random() * 0.6, 0.5 + Math.random() * 0.5],
    });
  }
  for (let y = 0; y < SIM_H; y++) {
    for (let x = 0; x < SIM_W; x++) {
      const idx = (y * SIM_W + x) * 4;
      for (const b of blobs) {
        const dx = x - b.x;
        const dy = y - b.y;
        const g = Math.exp(-(dx * dx + dy * dy) / (b.r * b.r));
        dyeSeed[idx + 0] += b.col[0] * g;
        dyeSeed[idx + 1] += b.col[1] * g;
        dyeSeed[idx + 2] += b.col[2] * g;
      }
    }
  }

  // Velocity: A is current, B is scratch. Dye: A is current, B is scratch.
  const velA = makeField(null);
  const velB = makeField(null);
  const dyeA = makeField(dyeSeed);
  const dyeB = makeField(null);
  const fboVelA = makeFBO(velA);
  const fboVelB = makeFBO(velB);
  const fboDyeA = makeFBO(dyeA);
  const fboDyeB = makeFBO(dyeB);

  // Zero the velocity textures.
  for (const fbo of [fboVelA, fboVelB]) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  const advectU = {
    src: gl.getUniformLocation(advectProg, "u_src"),
    velocity: gl.getUniformLocation(advectProg, "u_velocity"),
    dissipation: gl.getUniformLocation(advectProg, "u_dissipation"),
  };
  const splatU = {
    src: gl.getUniformLocation(splatProg, "u_src"),
    splat: gl.getUniformLocation(splatProg, "u_splat"),
    mouse: gl.getUniformLocation(splatProg, "u_mouse"),
    radius: gl.getUniformLocation(splatProg, "u_radius"),
    aspect: gl.getUniformLocation(splatProg, "u_aspect"),
    ambient: gl.getUniformLocation(splatProg, "u_ambient"),
    time: gl.getUniformLocation(splatProg, "u_time"),
  };
  const renderU = { dye: gl.getUniformLocation(renderProg, "u_dye") };

  const aspect = SIM_W / SIM_H;
  gl.bindVertexArray(quadVAO);
  gl.disable(gl.BLEND);

  // Pointer state; when idle, a virtual cursor keeps stirring the ink.
  const mouse = { x: 0.5, y: 0.5, active: false };
  function trackPointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (clientX - rect.left) / rect.width;
    mouse.y = 1.0 - (clientY - rect.top) / rect.height;
    mouse.active = true;
  }
  canvas.addEventListener("mousemove", (e) => trackPointer(e.clientX, e.clientY));
  canvas.addEventListener("mouseleave", () => (mouse.active = false));
  canvas.addEventListener(
    "touchmove",
    (e) => trackPointer(e.touches[0].clientX, e.touches[0].clientY),
    { passive: true }
  );
  canvas.addEventListener("touchend", () => (mouse.active = false));

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
  }
  window.addEventListener("resize", resize);
  resize();

  /** Run a full-screen pass into a framebuffer. */
  function pass(fbo) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, SIM_W, SIM_H);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  const prev = { x: 0.5, y: 0.5 };
  const t0 = performance.now();

  function frame(now) {
    const t = (now - t0) / 1000;

    // Effective injector: the real cursor, or a slow Lissajous path when idle.
    const cur = mouse.active
      ? { x: mouse.x, y: mouse.y }
      : { x: 0.5 + 0.34 * Math.cos(t * 0.31), y: 0.5 + 0.28 * Math.sin(t * 0.43) };

    // Drag velocity, clamped so a jump never injects a huge force.
    let fx = cur.x - prev.x;
    let fy = cur.y - prev.y;
    const fl = Math.hypot(fx, fy);
    if (fl > 0.06) { fx = (fx / fl) * 0.06; fy = (fy / fl) * 0.06; }
    prev.x = cur.x;
    prev.y = cur.y;

    // Ink color slowly cycles through the spectrum.
    const ink = [
      0.55 + 0.45 * Math.cos(6.2831 * (t * 0.05 + 0.0)),
      0.55 + 0.45 * Math.cos(6.2831 * (t * 0.05 + 0.33)),
      0.55 + 0.45 * Math.cos(6.2831 * (t * 0.05 + 0.66)),
    ];

    // --- 1. Advect velocity (velA -> velB).
    gl.useProgram(advectProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velA);
    gl.uniform1i(advectU.src, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, velA);
    gl.uniform1i(advectU.velocity, 1);
    gl.uniform1f(advectU.dissipation, 0.997);
    pass(fboVelB);

    // --- 2. Splat force + ambient drift into velocity (velB -> velA).
    gl.useProgram(splatProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, velB);
    gl.uniform1i(splatU.src, 0);
    gl.uniform3f(splatU.splat, fx * 5.0, fy * 5.0, 0.0);
    gl.uniform2f(splatU.mouse, cur.x, cur.y);
    gl.uniform1f(splatU.radius, 0.0012);
    gl.uniform1f(splatU.aspect, aspect);
    gl.uniform1f(splatU.ambient, 1.0);
    gl.uniform1f(splatU.time, t);
    pass(fboVelA);

    // --- 3. Advect dye along the velocity (dyeA -> dyeB).
    gl.useProgram(advectProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dyeA);
    gl.uniform1i(advectU.src, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, velA);
    gl.uniform1i(advectU.velocity, 1);
    gl.uniform1f(advectU.dissipation, 0.994);
    pass(fboDyeB);

    // --- 4. Splat ink color into the dye (dyeB -> dyeA).
    gl.useProgram(splatProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dyeB);
    gl.uniform1i(splatU.src, 0);
    gl.uniform3f(splatU.splat, ink[0] * 0.6, ink[1] * 0.6, ink[2] * 0.6);
    gl.uniform2f(splatU.mouse, cur.x, cur.y);
    gl.uniform1f(splatU.radius, 0.0009);
    gl.uniform1f(splatU.aspect, aspect);
    gl.uniform1f(splatU.ambient, 0.0);
    gl.uniform1f(splatU.time, t);
    pass(fboDyeA);

    // --- Render the dye field to the screen.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(renderProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dyeA);
    gl.uniform1i(renderU.dye, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (!gl) {
  showFallback("이 브라우저는 WebGL2를 지원하지 않습니다.");
} else if (!gl.getExtension("EXT_color_buffer_float")) {
  showFallback("이 브라우저는 부동소수점 렌더 타깃을 지원하지 않습니다.");
} else {
  try {
    start();
  } catch (err) {
    showFallback("시뮬레이션을 초기화할 수 없습니다.");
  }
}
