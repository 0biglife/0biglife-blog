"use strict";

/* WebGPU 은하 — 컴퓨트 셰이더 N-body 중력 시뮬레이션
 * 별 N개가 매 프레임 모든 별쌍 + 중심 질량의 중력을 GPU에서 적분한다. */

(async function () {
  const canvas = document.getElementById("gpu");
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

  if (!navigator.gpu) {
    fail(
      "이 브라우저는 WebGPU를 지원하지 않습니다. 최신 Chrome·Edge 또는 Safari 18 이상에서 확인해 주세요."
    );
    return;
  }

  let adapter, device;
  try {
    adapter = await navigator.gpu.requestAdapter({
      powerPreference: "high-performance",
    });
    if (!adapter) {
      fail("WebGPU 어댑터를 찾을 수 없어 은하 시뮬레이션을 표시할 수 없습니다.");
      return;
    }
    device = await adapter.requestDevice();
  } catch (e) {
    console.error(e);
    fail("WebGPU 초기화에 실패해 은하 시뮬레이션을 표시할 수 없습니다.");
    return;
  }

  const ctx = canvas.getContext("webgpu");
  if (!ctx) {
    fail("WebGPU 캔버스 컨텍스트를 생성할 수 없습니다.");
    return;
  }
  const format = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format, alphaMode: "opaque" });

  device.lost.then((info) => {
    console.error("WebGPU device lost:", info && info.message);
  });

  // --- 시뮬레이션 파라미터 ---
  const N = 4096; // 별 개수 (N² 상호작용)
  const G_CENTRAL = 9000.0; // 중심 질량
  const R_MAX = 28.0;

  // --- 별 초기화: 회전 원반 ---
  const positions = new Float32Array(N * 4);
  const velocities = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const r = 2.5 + (R_MAX - 2.5) * Math.sqrt(Math.random());
    const th = Math.random() * Math.PI * 2;
    const x = r * Math.cos(th);
    const z = r * Math.sin(th);
    const y = (Math.random() + Math.random() - 1) * 1.4 * (1 - (0.6 * r) / R_MAX);
    const v = Math.sqrt(G_CENTRAL / r); // 원궤도 속도
    positions[i * 4 + 0] = x;
    positions[i * 4 + 1] = y;
    positions[i * 4 + 2] = z;
    positions[i * 4 + 3] = 1.0;
    velocities[i * 4 + 0] = -Math.sin(th) * v + (Math.random() - 0.5) * 1.5;
    velocities[i * 4 + 1] = (Math.random() - 0.5) * 0.5;
    velocities[i * 4 + 2] = Math.cos(th) * v + (Math.random() - 0.5) * 1.5;
    velocities[i * 4 + 3] = 0.0;
  }

  // --- 버퍼 ---
  const bufBytes = N * 4 * 4;
  const posBuf = [0, 1].map(() =>
    device.createBuffer({
      size: bufBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })
  );
  const velBuf = device.createBuffer({
    size: bufBytes,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(posBuf[0], 0, positions);
  device.queue.writeBuffer(posBuf[1], 0, positions);
  device.queue.writeBuffer(velBuf, 0, velocities);

  const paramsBuf = device.createBuffer({
    size: 32, // 5 x f32 + 패딩
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const cameraBuf = device.createBuffer({
    size: 64, // mat4x4
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // --- 컴퓨트 셰이더 (N-body) ---
  const computeWGSL = `
  const COUNT: u32 = ${N}u;
  struct Params {
    dt: f32,
    soft: f32,
    centralMass: f32,
    starMass: f32,
    damping: f32,
  };
  @group(0) @binding(0) var<uniform> P: Params;
  @group(0) @binding(1) var<storage, read>       posIn:  array<vec4<f32>, ${N}>;
  @group(0) @binding(2) var<storage, read_write> posOut: array<vec4<f32>, ${N}>;
  @group(0) @binding(3) var<storage, read_write> vel:    array<vec4<f32>, ${N}>;

  @compute @workgroup_size(64)
  fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    if (i >= COUNT) { return; }

    let p = posIn[i].xyz;
    var v = vel[i].xyz;
    var force = vec3<f32>(0.0);

    // 중심 질량
    let toC = -p;
    let rc2 = dot(toC, toC) + P.soft;
    force += toC * (P.centralMass / (rc2 * sqrt(rc2)));

    // 모든 별쌍 (j == i 는 d=0 이라 기여 0)
    for (var j: u32 = 0u; j < COUNT; j = j + 1u) {
      let d  = posIn[j].xyz - p;
      let r2 = dot(d, d) + P.soft;
      force += d * (P.starMass / (r2 * sqrt(r2)));
    }

    v += force * P.dt;
    v *= P.damping;
    posOut[i] = vec4<f32>(p + v * P.dt, posIn[i].w);
    vel[i] = vec4<f32>(v, 0.0);
  }`;

  // --- 렌더 셰이더 (인스턴스드 빌보드) ---
  const renderWGSL = `
  struct Camera { viewProj: mat4x4<f32>, };
  @group(0) @binding(0) var<uniform> cam: Camera;
  @group(0) @binding(1) var<storage, read> pos: array<vec4<f32>, ${N}>;
  @group(0) @binding(2) var<storage, read> vel: array<vec4<f32>, ${N}>;

  struct VSOut {
    @builtin(position) clip: vec4<f32>,
    @location(0) uv: vec2<f32>,
    @location(1) color: vec3<f32>,
  };

  @vertex
  fn vs(@builtin(vertex_index) vi: u32,
        @builtin(instance_index) ii: u32) -> VSOut {
    var corners = array<vec2<f32>, 6>(
      vec2<f32>(-1.0, -1.0), vec2<f32>( 1.0, -1.0), vec2<f32>(-1.0,  1.0),
      vec2<f32>(-1.0,  1.0), vec2<f32>( 1.0, -1.0), vec2<f32>( 1.0,  1.0)
    );
    let c = corners[vi];
    let center = pos[ii].xyz;
    var clip = cam.viewProj * vec4<f32>(center, 1.0);
    // 스크린 정렬 빌보드 — clip.w 로 스케일해 화면상 크기 고정
    let size = 0.013;
    clip = vec4<f32>(clip.xy + c * size * clip.w, clip.z, clip.w);

    var out: VSOut;
    out.clip = clip;
    out.uv = c;
    let spd = length(vel[ii].xyz);
    let t = clamp(spd * 0.012, 0.0, 1.0);
    out.color = mix(vec3<f32>(0.55, 0.72, 1.0), vec3<f32>(1.0, 0.86, 0.55), t);
    return out;
  }

  @fragment
  fn fs(in: VSOut) -> @location(0) vec4<f32> {
    let r = length(in.uv);
    if (r > 1.0) { discard; }
    let glow = pow(1.0 - r, 2.2);
    return vec4<f32>(in.color * glow, glow);
  }`;

  let computePipeline, renderPipeline;
  try {
    computePipeline = device.createComputePipeline({
      layout: "auto",
      compute: {
        module: device.createShaderModule({ code: computeWGSL }),
        entryPoint: "main",
      },
    });
    const renderModule = device.createShaderModule({ code: renderWGSL });
    renderPipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module: renderModule, entryPoint: "vs" },
      fragment: {
        module: renderModule,
        entryPoint: "fs",
        targets: [
          {
            format,
            blend: {
              color: { srcFactor: "one", dstFactor: "one", operation: "add" },
              alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
            },
          },
        ],
      },
      primitive: { topology: "triangle-list" },
    });
  } catch (e) {
    console.error(e);
    fail("WebGPU 파이프라인 생성에 실패해 은하 시뮬레이션을 표시할 수 없습니다.");
    return;
  }

  // 핑퐁: computeBG[s] 는 posBuf[s]→posBuf[1-s], renderBG[s] 는 posBuf[1-s] 를 읽음
  const computeBG = [0, 1].map((s) =>
    device.createBindGroup({
      layout: computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: paramsBuf } },
        { binding: 1, resource: { buffer: posBuf[s] } },
        { binding: 2, resource: { buffer: posBuf[1 - s] } },
        { binding: 3, resource: { buffer: velBuf } },
      ],
    })
  );
  const renderBG = [0, 1].map((s) =>
    device.createBindGroup({
      layout: renderPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: cameraBuf } },
        { binding: 1, resource: { buffer: posBuf[1 - s] } },
        { binding: 2, resource: { buffer: velBuf } },
      ],
    })
  );

  // --- 행렬 헬퍼 (열 우선) ---
  function perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    const o = new Float32Array(16);
    o[0] = f / aspect;
    o[5] = f;
    o[10] = far * nf;
    o[11] = -1;
    o[14] = near * far * nf;
    return o;
  }
  function lookAt(eye, center, up) {
    let zx = eye[0] - center[0],
      zy = eye[1] - center[1],
      zz = eye[2] - center[2];
    const zl = Math.hypot(zx, zy, zz) || 1;
    zx /= zl; zy /= zl; zz /= zl;
    let xx = up[1] * zz - up[2] * zy,
      xy = up[2] * zx - up[0] * zz,
      xz = up[0] * zy - up[1] * zx;
    const xl = Math.hypot(xx, xy, xz) || 1;
    xx /= xl; xy /= xl; xz /= xl;
    const yx = zy * xz - zz * xy,
      yy = zz * xx - zx * xz,
      yz = zx * xy - zy * xx;
    return new Float32Array([
      xx, yx, zx, 0,
      xy, yy, zy, 0,
      xz, yz, zz, 0,
      -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
      -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
      -(zx * eye[0] + zy * eye[1] + zz * eye[2]),
      1,
    ]);
  }
  function mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        o[c * 4 + r] =
          a[0 * 4 + r] * b[c * 4 + 0] +
          a[1 * 4 + r] * b[c * 4 + 1] +
          a[2 * 4 + r] * b[c * 4 + 2] +
          a[3 * 4 + r] * b[c * 4 + 3];
      }
    }
    return o;
  }

  // --- 리사이즈 ---
  function resize() {
    const cssW = Math.max(1, canvas.clientWidth);
    const cssH = Math.max(1, canvas.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }
  window.addEventListener("resize", resize);
  resize();

  // --- 카메라 (궤도) ---
  let yaw = 0.7,
    pitch = 0.55,
    dist = 70;
  let targetYaw = yaw,
    targetPitch = pitch,
    targetDist = dist;
  const PITCH_LIMIT = 1.45;
  let dragging = false,
    lastX = 0,
    lastY = 0,
    interacted = false;

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
    targetYaw -= (e.clientX - lastX) * 0.006;
    targetPitch += (e.clientY - lastY) * 0.006;
    targetPitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, targetPitch));
    lastX = e.clientX;
    lastY = e.clientY;
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
      targetDist = Math.max(28, Math.min(160, targetDist));
    },
    { passive: false }
  );
  setTimeout(() => {
    if (!interacted && hintEl) hintEl.classList.add("hidden");
  }, 6000);

  // --- 렌더 루프 ---
  const params = new Float32Array([0.0016, 1.2, G_CENTRAL, 1.6, 0.9996]);
  let s = 0;
  let raf = 0;
  let running = true;

  function frame() {
    if (!running) return;

    if (!dragging && !interacted) targetYaw += 0.0014;
    yaw += (targetYaw - yaw) * 0.1;
    pitch += (targetPitch - pitch) * 0.1;
    dist += (targetDist - dist) * 0.1;

    const cp = Math.cos(pitch);
    const eye = [
      dist * cp * Math.cos(yaw),
      dist * Math.sin(pitch),
      dist * cp * Math.sin(yaw),
    ];
    const aspect = canvas.width / Math.max(1, canvas.height);
    const viewProj = mul(
      perspective((50 * Math.PI) / 180, aspect, 1.0, 600.0),
      lookAt(eye, [0, 0, 0], [0, 1, 0])
    );

    device.queue.writeBuffer(paramsBuf, 0, params);
    device.queue.writeBuffer(cameraBuf, 0, viewProj);

    const enc = device.createCommandEncoder();
    const cpass = enc.beginComputePass();
    cpass.setPipeline(computePipeline);
    cpass.setBindGroup(0, computeBG[s]);
    cpass.dispatchWorkgroups(Math.ceil(N / 64));
    cpass.end();

    const rpass = enc.beginRenderPass({
      colorAttachments: [
        {
          view: ctx.getCurrentTexture().createView(),
          clearValue: { r: 0.012, g: 0.014, b: 0.035, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    rpass.setPipeline(renderPipeline);
    rpass.setBindGroup(0, renderBG[s]);
    rpass.draw(6, N);
    rpass.end();

    device.queue.submit([enc.finish()]);
    s = 1 - s;
    raf = requestAnimationFrame(frame);
  }

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
