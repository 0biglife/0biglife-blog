"use strict";

/* 중력 렌즈 블랙홀 — WebGL2 프래그먼트 셰이더 측지선 레이마처
 * 픽셀마다 광자 하나를 쏘고 경로를 수치 적분한다. */

(function () {
  const canvas = document.getElementById("gl");
  const fallbackEl = document.getElementById("fallback");
  const hintEl = document.getElementById("hint");

  function fail(msg) {
    canvas.style.display = "none";
    if (hintEl) hintEl.hidden = true;
    if (fallbackEl) {
      fallbackEl.style.display = "flex";
      fallbackEl.textContent = msg;
    }
  }

  const gl = canvas.getContext("webgl2", {
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  if (!gl) {
    fail("이 브라우저는 WebGL2를 지원하지 않아 블랙홀 데모를 표시할 수 없습니다.");
    return;
  }

  // 풀스크린 삼각형 — 정점 버퍼 없이 gl_VertexID 로 생성
  const VS = `#version 300 es
  void main() {
    vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
  }`;

  const FS = `#version 300 es
  precision highp float;
  out vec4 fragColor;

  uniform vec2  u_res;
  uniform float u_time;
  uniform vec3  u_camPos;
  uniform mat3  u_camBasis; // [right, up, forward]

  const float RS       = 1.0;   // 사건의 지평선 반지름
  const float DISK_IN  = 3.0;   // 강착원반 안쪽
  const float DISK_OUT = 9.0;   // 강착원반 바깥쪽
  const float ESCAPE   = 52.0;  // 탈출 거리
  const int   STEPS    = 300;
  const float DT       = 0.20;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float hash31(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  // 휘어진 광자 방향에서 별빛 + 옅은 성운
  vec3 starfield(vec3 dir) {
    vec3 col = vec3(0.0);
    for (int i = 0; i < 3; i++) {
      float s = float(i + 1);
      vec3 g  = dir * (55.0 * s);
      vec3 id = floor(g);
      float h = hash31(id);
      if (h > 0.984) {
        float bri = (h - 0.984) / 0.016;
        col += vec3(bri) * (0.35 + 0.65 * hash31(id + 1.7));
      }
    }
    // 옅은 청자색 성운 그라데이션
    float neb = hash31(floor(dir * 6.0));
    col += vec3(0.018, 0.022, 0.045) * (0.5 + 0.5 * neb);
    return col;
  }

  // 강착원반: 반지름에 따른 온도 + 소용돌이 밴딩
  vec3 diskColor(float r, float ang, float t) {
    float k = clamp((r - DISK_IN) / (DISK_OUT - DISK_IN), 0.0, 1.0);
    vec3 hot  = vec3(1.00, 0.95, 0.86);
    vec3 mid  = vec3(1.00, 0.58, 0.24);
    vec3 cool = vec3(0.66, 0.20, 0.08);
    vec3 c = mix(hot, mid, smoothstep(0.0, 0.5, k));
    c = mix(c, cool, smoothstep(0.5, 1.0, k));
    float bands = 0.62 + 0.38 * sin(r * 5.5 - t * 2.0 + ang * 2.0);
    float swirl = 0.78 + 0.22 * sin(ang * 3.0 - t * 1.5 + r * 1.4);
    float grain = 0.74 + 0.26 * hash21(vec2(ang * 4.0 + t * 0.35, r));
    float bright = ((1.0 - k) * 1.7 + 0.45) * bands * swirl * grain;
    return c * bright;
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
    vec3 dir = normalize(u_camBasis * vec3(uv, 1.5));
    vec3 pos = u_camPos;
    vec3 vel = dir;

    // 각운동량 제곱 — 보존량
    vec3 h = cross(pos, vel);
    float h2 = dot(h, h);

    bool captured = false;
    vec3 diskAccum = vec3(0.0);
    float diskAlpha = 0.0;

    for (int i = 0; i < STEPS; i++) {
      vec3 oldPos = pos;
      float r2 = dot(pos, pos);
      // 곡률 가속도 (r^-5)
      vec3 accel = -1.5 * h2 * pos / (r2 * r2 * sqrt(r2));
      vel += accel * DT;
      pos += vel * DT;

      float r = length(pos);
      if (r < RS) { captured = true; break; }

      // 적도면(y=0) 교차 → 강착원반 샘플
      if (oldPos.y * pos.y < 0.0 && diskAlpha < 0.99) {
        float f = oldPos.y / (oldPos.y - pos.y);
        vec3 cp = mix(oldPos, pos, f);
        float dr = length(cp.xz);
        if (dr > DISK_IN && dr < DISK_OUT) {
          float ang = atan(cp.z, cp.x);
          vec3 dc = diskColor(dr, ang, u_time);
          float edge = smoothstep(DISK_IN, DISK_IN + 0.6, dr) *
                       (1.0 - smoothstep(DISK_OUT - 1.8, DISK_OUT, dr));
          float a = edge * 0.85;
          diskAccum += dc * a * (1.0 - diskAlpha);
          diskAlpha += a * (1.0 - diskAlpha);
        }
      }

      if (r > ESCAPE) break;
    }

    vec3 color = captured ? vec3(0.0) : starfield(normalize(vel));
    color = color * (1.0 - diskAlpha) + diskAccum;

    // 톤 매핑 + 감마
    color = color / (1.0 + color);
    color = pow(max(color, 0.0), vec3(0.4545));
    fragColor = vec4(color, 1.0);
  }`;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error("shader compile error:", gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  const vs = compile(gl.VERTEX_SHADER, VS);
  const fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) {
    fail("셰이더 컴파일에 실패해 블랙홀 데모를 표시할 수 없습니다.");
    return;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("program link error:", gl.getProgramInfoLog(prog));
    fail("셰이더 링크에 실패해 블랙홀 데모를 표시할 수 없습니다.");
    return;
  }
  gl.useProgram(prog);

  const uRes = gl.getUniformLocation(prog, "u_res");
  const uTime = gl.getUniformLocation(prog, "u_time");
  const uCamPos = gl.getUniformLocation(prog, "u_camPos");
  const uCamBasis = gl.getUniformLocation(prog, "u_camBasis");

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  // --- 카메라 상태 ---
  let yaw = 0.6;
  let pitch = 0.32;
  let dist = 16.0;
  let targetYaw = yaw;
  let targetPitch = pitch;
  let targetDist = dist;
  const PITCH_LIMIT = 1.45;

  function resize() {
    const cssW = Math.max(1, canvas.clientWidth);
    const cssH = Math.max(1, canvas.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = Math.round(cssW * dpr);
    let h = Math.round(cssH * dpr);
    // 레이마칭 비용이 커서 픽셀 수 상한 (~720p)
    const MAXPIX = 1280 * 720;
    if (w * h > MAXPIX) {
      const k = Math.sqrt(MAXPIX / (w * h));
      w = Math.max(1, Math.round(w * k));
      h = Math.max(1, Math.round(h * k));
    }
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }
  window.addEventListener("resize", resize);
  resize();

  // --- 포인터 인터랙션 ---
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let interacted = false;

  function markInteracted() {
    if (!interacted) {
      interacted = true;
      if (hintEl) hintEl.classList.add("hidden");
    }
  }

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    markInteracted();
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    targetYaw -= dx * 0.006;
    targetPitch += dy * 0.006;
    targetPitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, targetPitch));
  });
  function endDrag(e) {
    dragging = false;
    if (e && e.pointerId !== undefined && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      markInteracted();
      targetDist *= 1.0 + Math.sign(e.deltaY) * 0.08;
      targetDist = Math.max(7.0, Math.min(34.0, targetDist));
    },
    { passive: false }
  );

  // 자동 숨김 힌트 (인터랙션 없으면 6초 후)
  setTimeout(() => {
    if (!interacted && hintEl) hintEl.classList.add("hidden");
  }, 6000);

  // --- 렌더 루프 ---
  const start = performance.now();
  let raf = 0;
  let running = true;

  function frame() {
    if (!running) return;
    const t = (performance.now() - start) / 1000;

    // 인터랙션 없으면 천천히 자동 공전
    if (!dragging && !interacted) targetYaw += 0.0016;

    // 부드러운 추종
    yaw += (targetYaw - yaw) * 0.12;
    pitch += (targetPitch - pitch) * 0.12;
    dist += (targetDist - dist) * 0.12;

    // 궤도 카메라 기저
    const cp = Math.cos(pitch);
    const camPos = [
      dist * cp * Math.cos(yaw),
      dist * Math.sin(pitch),
      dist * cp * Math.sin(yaw),
    ];
    // forward = 원점 방향
    let fx = -camPos[0], fy = -camPos[1], fz = -camPos[2];
    const fl = Math.hypot(fx, fy, fz) || 1;
    fx /= fl; fy /= fl; fz /= fl;
    // right = normalize(cross(forward, worldUp)), worldUp = (0, 1, 0)
    let rx = -fz, ry = 0.0, rz = fx;
    const rl = Math.hypot(rx, ry, rz) || 1;
    rx /= rl; ry /= rl; rz /= rl;
    // up = cross(right, forward)
    const ux = ry * fz - rz * fy;
    const uy = rz * fx - rx * fz;
    const uz = rx * fy - ry * fx;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, t);
    gl.uniform3f(uCamPos, camPos[0], camPos[1], camPos[2]);
    // mat3: 열 우선 [right, up, forward]
    gl.uniformMatrix3fv(uCamBasis, false, [
      rx, ry, rz,
      ux, uy, uz,
      fx, fy, fz,
    ]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    raf = requestAnimationFrame(frame);
  }

  // 탭이 보이지 않으면 일시정지 (배터리 절약)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      running = false;
      if (raf) cancelAnimationFrame(raf);
    } else if (!running) {
      running = true;
      raf = requestAnimationFrame(frame);
    }
  });

  raf = requestAnimationFrame(frame);
})();
