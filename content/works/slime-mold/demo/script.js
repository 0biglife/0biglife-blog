// Slime mold — a Physarum simulation. 262,144 agents each sense the pheromone
// trail ahead, turn toward the strongest, step forward, and deposit. The trail
// diffuses and decays. From those three rules, vein-like networks emerge.
// Stateful GPGPU via ping-pong FBOs. Vanilla WebGL2: no build, no dependencies.

const canvas = document.getElementById("gl");
const fallback = document.getElementById("fallback");
const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });

/** Reveal the fallback message and stop. */
function showFallback(message) {
  fallback.textContent = message;
  fallback.style.display = "flex";
}

// Agent state lives in an AW x AH texture; the trail in a square map.
const AW = 512;
const AH = 512;
const AGENTS = AW * AH;
const TRAIL = 1024;

// Shader sources -------------------------------------------------------------

const QUAD_VS = `#version 300 es
layout(location = 0) in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// Agent update: sense three points, steer, step forward.
const AGENT_FS = `#version 300 es
precision highp float;

uniform sampler2D u_agents;
uniform sampler2D u_trail;
uniform float u_time;

in vec2 v_uv;
out vec4 outAgent;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec4 a = texture(u_agents, v_uv);
  vec2 pos = a.xy;
  float ang = a.z;

  const float SENSOR_ANGLE = 0.6;
  const float SENSOR_DIST = 0.011;
  const float TURN = 0.5;
  const float SPEED = 0.0013;

  vec2 dirC = vec2(cos(ang), sin(ang));
  vec2 dirL = vec2(cos(ang + SENSOR_ANGLE), sin(ang + SENSOR_ANGLE));
  vec2 dirR = vec2(cos(ang - SENSOR_ANGLE), sin(ang - SENSOR_ANGLE));

  float sc = texture(u_trail, pos + dirC * SENSOR_DIST).r;
  float sl = texture(u_trail, pos + dirL * SENSOR_DIST).r;
  float sr = texture(u_trail, pos + dirR * SENSOR_DIST).r;

  float rnd = hash(pos + u_time);
  if (sc > sl && sc > sr) {
    // straight ahead is strongest — hold course
  } else if (sc < sl && sc < sr) {
    ang += (rnd - 0.5) * 2.0 * TURN; // ahead is weakest — turn randomly
  } else if (sl > sr) {
    ang += TURN;
  } else if (sr > sl) {
    ang -= TURN;
  }

  pos += vec2(cos(ang), sin(ang)) * SPEED;
  pos = fract(pos); // wrap around the toroidal world

  outAgent = vec4(pos, ang, 1.0);
}`;

// Deposit: render each agent as a point that adds pheromone.
const DEPOSIT_VS = `#version 300 es
precision highp float;
uniform sampler2D u_agents;
void main() {
  ivec2 tc = ivec2(gl_VertexID % 512, gl_VertexID / 512);
  vec4 a = texelFetch(u_agents, tc, 0);
  gl_Position = vec4(a.xy * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = 1.0;
}`;

const DEPOSIT_FS = `#version 300 es
precision highp float;
out vec4 frag;
void main() {
  frag = vec4(0.22);
}`;

// Diffuse + decay the trail, and let the cursor paint pheromone.
const DIFFUSE_FS = `#version 300 es
precision highp float;

uniform sampler2D u_trail;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform float u_mouseOn;

in vec2 v_uv;
out vec4 frag;

void main() {
  vec2 t = 1.0 / u_res;
  vec4 sum = vec4(0.0);
  sum += texture(u_trail, v_uv + t * vec2(-1.0, -1.0));
  sum += texture(u_trail, v_uv + t * vec2( 0.0, -1.0));
  sum += texture(u_trail, v_uv + t * vec2( 1.0, -1.0));
  sum += texture(u_trail, v_uv + t * vec2(-1.0,  0.0));
  sum += texture(u_trail, v_uv);
  sum += texture(u_trail, v_uv + t * vec2( 1.0,  0.0));
  sum += texture(u_trail, v_uv + t * vec2(-1.0,  1.0));
  sum += texture(u_trail, v_uv + t * vec2( 0.0,  1.0));
  sum += texture(u_trail, v_uv + t * vec2( 1.0,  1.0));

  vec4 result = (sum / 9.0) * 0.93; // diffuse, then decay

  if (u_mouseOn > 0.5) {
    result += vec4(0.6) * smoothstep(0.06, 0.0, distance(v_uv, u_mouse));
  }

  frag = result;
}`;

// Color the pheromone map.
const RENDER_FS = `#version 300 es
precision highp float;
uniform sampler2D u_trail;
uniform float u_time;
in vec2 v_uv;
out vec4 frag;
vec3 palette(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.35, 0.62)));
}
void main() {
  float v = pow(clamp(texture(u_trail, v_uv).r, 0.0, 1.0), 0.6);
  vec3 col = palette(0.55 + v * 0.5 + u_time * 0.02) * v;
  col += vec3(0.02, 0.025, 0.05);
  frag = vec4(col, 1.0);
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
  const agentProg = program(QUAD_VS, AGENT_FS);
  const depositProg = program(DEPOSIT_VS, DEPOSIT_FS);
  const diffuseProg = program(QUAD_VS, DIFFUSE_FS);
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
  gl.bindVertexArray(null);

  // Empty VAO for the deposit point pass.
  const pointVAO = gl.createVertexArray();

  function makeTexture(w, h, internal, format, type, filter, wrap, data) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    return tex;
  }

  function makeFBO(tex) {
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return fbo;
  }

  // Seed agents inside a centered disc, pointing in random directions.
  const seed = new Float32Array(AGENTS * 4);
  for (let i = 0; i < AGENTS; i++) {
    const r = Math.sqrt(Math.random()) * 0.32;
    const a = Math.random() * Math.PI * 2;
    seed[i * 4 + 0] = 0.5 + Math.cos(a) * r;
    seed[i * 4 + 1] = 0.5 + Math.sin(a) * r;
    seed[i * 4 + 2] = Math.random() * Math.PI * 2;
    seed[i * 4 + 3] = 1.0;
  }

  let agentCur = makeTexture(AW, AH, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, seed);
  let agentNext = makeTexture(AW, AH, gl.RGBA32F, gl.RGBA, gl.FLOAT, gl.NEAREST, gl.CLAMP_TO_EDGE, null);
  let trailCur = makeTexture(TRAIL, TRAIL, gl.RGBA16F, gl.RGBA, gl.FLOAT, gl.LINEAR, gl.REPEAT, null);
  let trailNext = makeTexture(TRAIL, TRAIL, gl.RGBA16F, gl.RGBA, gl.FLOAT, gl.LINEAR, gl.REPEAT, null);

  let fboAgentCur = makeFBO(agentCur);
  let fboAgentNext = makeFBO(agentNext);
  let fboTrailCur = makeFBO(trailCur);
  let fboTrailNext = makeFBO(trailNext);

  // Clear both trail maps to zero.
  for (const fbo of [fboTrailCur, fboTrailNext]) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  const agentU = {
    agents: gl.getUniformLocation(agentProg, "u_agents"),
    trail: gl.getUniformLocation(agentProg, "u_trail"),
    time: gl.getUniformLocation(agentProg, "u_time"),
  };
  const depositU = { agents: gl.getUniformLocation(depositProg, "u_agents") };
  const diffuseU = {
    trail: gl.getUniformLocation(diffuseProg, "u_trail"),
    res: gl.getUniformLocation(diffuseProg, "u_res"),
    mouse: gl.getUniformLocation(diffuseProg, "u_mouse"),
    mouseOn: gl.getUniformLocation(diffuseProg, "u_mouseOn"),
  };
  const renderU = {
    trail: gl.getUniformLocation(renderProg, "u_trail"),
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
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
  }
  window.addEventListener("resize", resize);
  resize();

  const t0 = performance.now();

  function frame(now) {
    const t = (now - t0) / 1000;

    // --- 1. Update agents (agentCur -> agentNext).
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboAgentNext);
    gl.viewport(0, 0, AW, AH);
    gl.disable(gl.BLEND);
    gl.useProgram(agentProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, agentCur);
    gl.uniform1i(agentU.agents, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, trailCur);
    gl.uniform1i(agentU.trail, 1);
    gl.uniform1f(agentU.time, t);
    gl.bindVertexArray(quadVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // --- 2. Deposit pheromone: render agents additively into trailCur.
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboTrailCur);
    gl.viewport(0, 0, TRAIL, TRAIL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(depositProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, agentNext);
    gl.uniform1i(depositU.agents, 0);
    gl.bindVertexArray(pointVAO);
    gl.drawArrays(gl.POINTS, 0, AGENTS);
    gl.disable(gl.BLEND);

    // --- 3. Diffuse + decay (trailCur -> trailNext).
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboTrailNext);
    gl.viewport(0, 0, TRAIL, TRAIL);
    gl.useProgram(diffuseProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, trailCur);
    gl.uniform1i(diffuseU.trail, 0);
    gl.uniform2f(diffuseU.res, TRAIL, TRAIL);
    gl.uniform2f(diffuseU.mouse, mouse.x, mouse.y);
    gl.uniform1f(diffuseU.mouseOn, mouse.active ? 1.0 : 0.0);
    gl.bindVertexArray(quadVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // --- 4. Render the pheromone map to the screen.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(renderProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, trailNext);
    gl.uniform1i(renderU.trail, 0);
    gl.uniform1f(renderU.time, t);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Swap ping-pong pairs.
    let ta = agentCur; agentCur = agentNext; agentNext = ta;
    let fa = fboAgentCur; fboAgentCur = fboAgentNext; fboAgentNext = fa;
    let tt = trailCur; trailCur = trailNext; trailNext = tt;
    let ft = fboTrailCur; fboTrailCur = fboTrailNext; fboTrailNext = ft;

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
