// Reaction-diffusion — the Gray-Scott model on the GPU. Two virtual chemicals
// diffuse and react on a grid; a few simple rules, iterated thousands of
// times, grow coral-like Turing patterns. Stateful GPGPU via ping-pong FBO.
// Self-contained vanilla WebGL2: no build step, no dependencies.

const canvas = document.getElementById("gl");
const fallback = document.getElementById("fallback");
const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });

/** Reveal the fallback message and stop. */
function showFallback(message) {
  fallback.textContent = message;
  fallback.style.display = "flex";
}

// Fixed simulation grid — pattern scale stays consistent across viewports.
const SIM_W = 640;
const SIM_H = 360;

// Reaction-diffusion update steps per displayed frame.
const STEPS_PER_FRAME = 6;

// Shader sources -------------------------------------------------------------

const QUAD_VS = `#version 300 es
layout(location = 0) in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// One Gray-Scott step. x = chemical A, y = chemical B.
const UPDATE_FS = `#version 300 es
precision highp float;

uniform sampler2D u_state;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform float u_mouseOn;

in vec2 v_uv;
out vec4 outState;

void main() {
  vec2 texel = 1.0 / u_res;
  vec2 c = texture(u_state, v_uv).xy;

  // Weighted 3x3 Laplacian (orthogonal 0.2, diagonal 0.05, center -1).
  vec2 lap = c * -1.0;
  lap += texture(u_state, v_uv + texel * vec2(-1.0, -1.0)).xy * 0.05;
  lap += texture(u_state, v_uv + texel * vec2( 0.0, -1.0)).xy * 0.20;
  lap += texture(u_state, v_uv + texel * vec2( 1.0, -1.0)).xy * 0.05;
  lap += texture(u_state, v_uv + texel * vec2(-1.0,  0.0)).xy * 0.20;
  lap += texture(u_state, v_uv + texel * vec2( 1.0,  0.0)).xy * 0.20;
  lap += texture(u_state, v_uv + texel * vec2(-1.0,  1.0)).xy * 0.05;
  lap += texture(u_state, v_uv + texel * vec2( 0.0,  1.0)).xy * 0.20;
  lap += texture(u_state, v_uv + texel * vec2( 1.0,  1.0)).xy * 0.05;

  float A = c.x;
  float B = c.y;
  float f = 0.0367;   // feed rate
  float k = 0.0649;   // kill rate — these two values give coral growth
  float reaction = A * B * B;
  float A2 = A + (1.0 * lap.x - reaction + f * (1.0 - A));
  float B2 = B + (0.5 * lap.y + reaction - (k + f) * B);

  // The cursor paints chemical B, seeding new growth.
  if (u_mouseOn > 0.5) {
    vec2 d = (v_uv - u_mouse) * vec2(u_res.x / u_res.y, 1.0);
    if (length(d) < 0.03) {
      A2 = 0.0;
      B2 = 1.0;
    }
  }

  outState = vec4(clamp(A2, 0.0, 1.0), clamp(B2, 0.0, 1.0), 0.0, 1.0);
}`;

// Color the chemical field with fake lighting from its gradient.
const RENDER_FS = `#version 300 es
precision highp float;

uniform sampler2D u_state;
uniform vec2 u_res;
uniform float u_time;

in vec2 v_uv;
out vec4 fragColor;

vec3 palette(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.35, 0.62)));
}

void main() {
  vec2 texel = 1.0 / u_res;
  float b = texture(u_state, v_uv).y;
  float bx = texture(u_state, v_uv + vec2(texel.x, 0.0)).y -
             texture(u_state, v_uv - vec2(texel.x, 0.0)).y;
  float by = texture(u_state, v_uv + vec2(0.0, texel.y)).y -
             texture(u_state, v_uv - vec2(0.0, texel.y)).y;

  // A normal from the chemical gradient gives the growth a raised, coral look.
  vec3 n = normalize(vec3(-bx * 6.0, -by * 6.0, 1.0));
  float light = clamp(dot(n, normalize(vec3(0.5, 0.6, 0.8))), 0.0, 1.0);

  vec3 col = palette(0.55 + b * 0.7 + u_time * 0.02);
  col *= 0.25 + 0.95 * b;                           // dark substrate
  col += vec3(1.0) * pow(light, 3.0) * b * 0.5;     // sheen on the ridges
  col = pow(col, vec3(0.85));
  fragColor = vec4(col, 1.0);
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
  const updateProg = program(QUAD_VS, UPDATE_FS);
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

  /** Create an RGBA32F state texture. */
  function makeStateTexture(data) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, SIM_W, SIM_H, 0, gl.RGBA, gl.FLOAT, data);
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

  // Seed the grid: chemical A everywhere, with scattered blobs of B.
  const seed = new Float32Array(SIM_W * SIM_H * 4);
  for (let i = 0; i < SIM_W * SIM_H; i++) {
    seed[i * 4 + 0] = 1.0; // A
    seed[i * 4 + 1] = 0.0; // B
  }
  for (let blob = 0; blob < 16; blob++) {
    const cx = Math.floor(Math.random() * SIM_W);
    const cy = Math.floor(Math.random() * SIM_H);
    const radius = 4 + Math.floor(Math.random() * 6);
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        if (x * x + y * y > radius * radius) continue;
        const px = cx + x;
        const py = cy + y;
        if (px < 0 || px >= SIM_W || py < 0 || py >= SIM_H) continue;
        const idx = (py * SIM_W + px) * 4;
        seed[idx + 0] = 0.0;
        seed[idx + 1] = 1.0;
      }
    }
  }

  // Ping-pong pair.
  let texSrc = makeStateTexture(seed);
  let texDst = makeStateTexture(null);
  let fboSrc = makeFBO(texSrc);
  let fboDst = makeFBO(texDst);

  const updU = {
    state: gl.getUniformLocation(updateProg, "u_state"),
    res: gl.getUniformLocation(updateProg, "u_res"),
    mouse: gl.getUniformLocation(updateProg, "u_mouse"),
    mouseOn: gl.getUniformLocation(updateProg, "u_mouseOn"),
  };
  const renU = {
    state: gl.getUniformLocation(renderProg, "u_state"),
    res: gl.getUniformLocation(renderProg, "u_res"),
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

  gl.disable(gl.BLEND);
  const t0 = performance.now();

  function frame(now) {
    // --- Run several reaction-diffusion steps per displayed frame.
    gl.useProgram(updateProg);
    gl.viewport(0, 0, SIM_W, SIM_H);
    gl.uniform2f(updU.res, SIM_W, SIM_H);
    gl.uniform2f(updU.mouse, mouse.x, mouse.y);
    gl.uniform1f(updU.mouseOn, mouse.active ? 1.0 : 0.0);
    gl.bindVertexArray(quadVAO);

    for (let step = 0; step < STEPS_PER_FRAME; step++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboDst);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texSrc);
      gl.uniform1i(updU.state, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      let tt = texSrc; texSrc = texDst; texDst = tt;
      let tf = fboSrc; fboSrc = fboDst; fboDst = tf;
    }

    // --- Render the current state to the screen.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(renderProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texSrc);
    gl.uniform1i(renU.state, 0);
    gl.uniform2f(renU.res, SIM_W, SIM_H);
    gl.uniform1f(renU.time, (now - t0) / 1000);
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
