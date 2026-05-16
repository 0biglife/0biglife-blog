// GPU particle flow — 65,536 particles whose entire state lives in a
// floating-point texture. A simulation shader advances them all at once
// through a divergence-free curl-noise field; a render pass draws them as
// 65k additive points. Stateful GPGPU via the ping-pong FBO technique.
// Self-contained vanilla WebGL2: no build step, no dependencies.

const canvas = document.getElementById("gl");
const fallback = document.getElementById("fallback");
const gl = canvas.getContext("webgl2", {
  antialias: false,
  alpha: false,
  preserveDrawingBuffer: true, // keep the canvas between frames for trails
});

/** Reveal the fallback message and stop. */
function showFallback(message) {
  fallback.textContent = message;
  fallback.style.display = "flex";
}

// One particle per texel of a 256x256 texture.
const TEX = 256;
const COUNT = TEX * TEX;

// Shader sources -------------------------------------------------------------

// Full-screen quad — used by the simulation and the fade pass.
const QUAD_VS = `#version 300 es
layout(location = 0) in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// Simulation: reads the particle texture, writes the next state.
const SIM_FS = `#version 300 es
precision highp float;

uniform sampler2D u_particles;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_mouseOn;
uniform float u_aspect;

in vec2 v_uv;
out vec4 outState;

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
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + 7.1;
    a *= 0.5;
  }
  return v;
}
float potential(vec2 p) {
  return fbm(p * 3.2 + vec2(0.0, u_time * 0.06));
}
// Divergence-free flow: the curl of a scalar noise potential.
vec2 curl(vec2 p) {
  float e = 0.009;
  float dx = potential(p + vec2(e, 0.0)) - potential(p - vec2(e, 0.0));
  float dy = potential(p + vec2(0.0, e)) - potential(p - vec2(0.0, e));
  return vec2(dy, -dx) / (2.0 * e);
}
vec2 hash22(vec2 p) {
  vec3 a = fract(vec3(p.xyx) * vec3(123.34, 234.34, 345.65));
  a += dot(a, a + 34.45);
  return fract(vec2(a.x * a.y, a.y * a.z));
}

void main() {
  vec4 s = texture(u_particles, v_uv);
  vec2 pos = s.xy;
  float life = s.z;
  float seed = s.w;

  // Aspect-corrected sample coordinate keeps the flow field isotropic.
  vec2 fp = vec2(pos.x * u_aspect, pos.y);
  vec2 vel = curl(fp);

  // The cursor injects a swirl plus a gentle outward push.
  if (u_mouseOn > 0.5) {
    vec2 d = vec2((pos.x - u_mouse.x) * u_aspect, pos.y - u_mouse.y);
    float dist = length(d);
    if (dist < 0.24 && dist > 1e-4) {
      float fall = 1.0 - dist / 0.24;
      vec2 dir = d / dist;
      vel += vec2(-dir.y, dir.x) * fall * 9.0;
      vel += dir * fall * 2.5;
    }
  }

  pos += vel * 0.0016;
  life -= 0.0017;

  // Recycle dead or escaped particles to a fresh random position.
  if (life <= 0.0 ||
      pos.x < -0.05 || pos.x > 1.05 ||
      pos.y < -0.05 || pos.y > 1.05) {
    pos = hash22(vec2(seed, u_time));
    life = 0.65 + 0.35 * hash(vec2(seed * 7.0, u_time));
    seed = fract(seed + 0.618034);
  }

  outState = vec4(pos, life, seed);
}`;

// Fade pass: a translucent quad that darkens the previous frame.
const FADE_FS = `#version 300 es
precision highp float;
out vec4 fragColor;
void main() {
  fragColor = vec4(0.035, 0.04, 0.075, 0.09);
}`;

// Render pass: pull each particle from the texture and place a point.
const POINT_VS = `#version 300 es
precision highp float;
uniform sampler2D u_particles;
out float v_life;
out vec2 v_pos;
void main() {
  ivec2 tc = ivec2(gl_VertexID % 256, gl_VertexID / 256);
  vec4 s = texelFetch(u_particles, tc, 0);
  v_life = s.z;
  v_pos = s.xy;
  gl_Position = vec4(s.xy * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = 2.0 + 2.4 * clamp(s.z, 0.0, 1.0);
}`;

const POINT_FS = `#version 300 es
precision highp float;
uniform float u_time;
in float v_life;
in vec2 v_pos;
out vec4 fragColor;
vec3 palette(float t) {
  return 0.55 + 0.45 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.66)));
}
void main() {
  vec2 pc = gl_PointCoord * 2.0 - 1.0;
  float r = dot(pc, pc);
  if (r > 1.0) discard;
  float soft = 1.0 - r;
  soft *= soft;
  float hue = v_pos.x * 0.35 + v_pos.y * 0.45 + u_time * 0.03;
  float a = soft * clamp(v_life, 0.0, 1.0) * 0.55;
  fragColor = vec4(palette(hue), a);
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
  const simProg = program(QUAD_VS, SIM_FS);
  const fadeProg = program(QUAD_VS, FADE_FS);
  const renderProg = program(POINT_VS, POINT_FS);

  // Full-screen quad geometry shared by the simulation and fade passes.
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
  gl.bindVertexArray(null);

  // An empty VAO for the point pass — positions come from the texture.
  const pointVAO = gl.createVertexArray();

  /** Create an RGBA32F particle-state texture. */
  function makeStateTexture(data) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, TEX, TEX, 0, gl.RGBA, gl.FLOAT, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
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

  // Seed every particle with a random position, life, and seed value.
  const seed = new Float32Array(COUNT * 4);
  for (let i = 0; i < COUNT; i++) {
    seed[i * 4 + 0] = Math.random();
    seed[i * 4 + 1] = Math.random();
    seed[i * 4 + 2] = Math.random();
    seed[i * 4 + 3] = Math.random();
  }

  // Ping-pong pair of state textures.
  let texSrc = makeStateTexture(seed);
  let texDst = makeStateTexture(null);
  let fboSrc = makeFBO(texSrc);
  let fboDst = makeFBO(texDst);

  const simU = {
    particles: gl.getUniformLocation(simProg, "u_particles"),
    time: gl.getUniformLocation(simProg, "u_time"),
    mouse: gl.getUniformLocation(simProg, "u_mouse"),
    mouseOn: gl.getUniformLocation(simProg, "u_mouseOn"),
    aspect: gl.getUniformLocation(simProg, "u_aspect"),
  };
  const renderU = {
    particles: gl.getUniformLocation(renderProg, "u_particles"),
    time: gl.getUniformLocation(renderProg, "u_time"),
  };

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

  // Paint the dark stage once so the first frames are not transparent.
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.clearColor(0.035, 0.04, 0.075, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const t0 = performance.now();

  function frame(now) {
    const t = (now - t0) / 1000;

    // --- Simulation pass: advance every particle into the destination FBO.
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboDst);
    gl.viewport(0, 0, TEX, TEX);
    gl.disable(gl.BLEND);
    gl.useProgram(simProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texSrc);
    gl.uniform1i(simU.particles, 0);
    gl.uniform1f(simU.time, t);
    gl.uniform2f(simU.mouse, mouse.x, mouse.y);
    gl.uniform1f(simU.mouseOn, mouse.active ? 1.0 : 0.0);
    gl.uniform1f(simU.aspect, canvas.width / Math.max(canvas.height, 1));
    gl.bindVertexArray(quadVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Swap so texSrc now holds the freshly computed state.
    let tt = texSrc; texSrc = texDst; texDst = tt;
    let tf = fboSrc; fboSrc = fboDst; fboDst = tf;

    // --- Screen: fade the previous frame, then draw the particles.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.BLEND);

    gl.useProgram(fadeProg);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(quadVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.useProgram(renderProg);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // additive
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texSrc);
    gl.uniform1i(renderU.particles, 0);
    gl.uniform1f(renderU.time, t);
    gl.bindVertexArray(pointVAO);
    gl.drawArrays(gl.POINTS, 0, COUNT);

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
