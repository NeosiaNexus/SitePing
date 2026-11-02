import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Plane,
  Points,
  Raycaster,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from "three";
import { PING_EVENT, type PingDetail } from "./ping-events";

/*
 * The hero's "ping field": a sheet of dots seen in perspective, the page a
 * client is reviewing. Pins drop onto it and every impact sends a ring across
 * the dots, the way a note pings its owner. The pointer warms the dots it
 * passes over through a spring, so the light trails the cursor instead of
 * snapping to it.
 *
 * Cost control: one draw call for ~12k points (all motion in the vertex
 * shader), pixel ratio capped, rendering stops while the hero is off screen
 * or the tab is hidden, and reduced motion gets one still frame.
 */

const COLS = 150;
const ROWS = 84;
const SPACING = 0.42;
const MAX_RIPPLES = 10;
const RIPPLE_LIFE = 4.2;
const RIPPLE_SPEED = 5.2;
const MAX_PINS = 7;
const PIN_FALL = 0.55;
const PIN_LIFE = 7;
const PIN_HEIGHT = 7;

const vertexShader = /* glsl */ `
  #define MAX_RIPPLES ${MAX_RIPPLES}
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uScale;
  uniform vec4 uRipples[MAX_RIPPLES];
  uniform vec3 uPointer;
  attribute float aSeed;
  varying float vGlow;
  varying float vFade;
  varying float vBase;

  void main() {
    vec3 p = position;
    float glow = 0.0;
    float lift = 0.0;

    for (int i = 0; i < MAX_RIPPLES; i++) {
      vec4 r = uRipples[i];
      float t = uTime - r.z;
      if (r.w <= 0.0 || t < 0.0 || t > ${RIPPLE_LIFE.toFixed(1)}) continue;
      float d = distance(p.xz, r.xy);
      float band = d - t * ${RIPPLE_SPEED.toFixed(1)};
      float ring = exp(-band * band * 1.4);
      float decay = 1.0 - t / ${RIPPLE_LIFE.toFixed(1)};
      float k = ring * decay * decay * r.w / (1.0 + d * 0.1);
      lift += k * 0.5;
      glow += k;
    }

    float pd = distance(p.xz, uPointer.xy);
    float hover = exp(-pd * pd * 0.09) * uPointer.z;
    lift += hover * 0.32;
    glow += hover * 0.55;

    p.y += lift;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float depth = -mv.z;
    vFade = smoothstep(44.0, 12.0, depth) * smoothstep(2.0, 6.0, depth);
    vGlow = clamp(glow, 0.0, 1.6);
    // Quieter behind the headline (left), brighter where the pins land (right).
    float side = smoothstep(-16.0, 12.0, position.x);
    vBase = (0.5 + 0.14 * sin(uTime * 0.5 + aSeed * 6.2831)) * mix(0.55, 1.2, side);
    gl_PointSize = (1.8 + vGlow * 2.6) * uPixelRatio * uScale * (24.0 / depth);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uAccent;
  uniform vec3 uHot;
  varying float vGlow;
  varying float vFade;
  varying float vBase;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    if (r > 0.5) discard;
    float soft = smoothstep(0.5, 0.12, r);
    vec3 col = mix(uBase, uAccent, clamp(vGlow, 0.0, 1.0));
    col = mix(col, uHot, clamp(vGlow - 0.9, 0.0, 0.6));
    gl_FragColor = vec4(col, soft * vFade * (vBase + vGlow * 0.85));
  }
`;

interface Pin {
  group: Group;
  head: Mesh;
  stem: Mesh;
  halo: Mesh;
  glow: Sprite;
  born: number;
  x: number;
  z: number;
  landed: boolean;
}

function glowTexture(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(140,160,255,0.9)");
    g.addColorStop(0.35, "rgba(70,100,255,0.35)");
    g.addColorStop(1, "rgba(23,60,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return new CanvasTexture(canvas);
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

export function createPingField(host: HTMLElement, hitArea: HTMLElement): () => void {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    return () => {}; // No WebGL: the hero keeps its CSS backdrop.
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);

  const canvas = renderer.domElement;
  canvas.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity 1200ms cubic-bezier(0.23,1,0.32,1)";
  host.appendChild(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 120);
  const lookTarget = new Vector3(0, 0, -6);
  const camBase = new Vector3(0, 3.4, 13);

  // ── The dot sheet ──
  const count = COLS * ROWS;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const i = row * COLS + col;
      positions[i * 3] = (col - (COLS - 1) / 2) * SPACING;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 4 - row * SPACING;
      seeds[i] = Math.random();
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));

  const ripples = Array.from({ length: MAX_RIPPLES }, () => new Vector4(0, 0, 0, 0));
  let rippleCursor = 0;
  const pointerUniform = new Vector3(0, 0, 0);

  const uTime = { value: 0 };
  // Dots keep their look on tall canvases instead of shrinking into dust.
  const uScale = { value: 1 };
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime,
      uScale,
      uPixelRatio: { value: renderer.getPixelRatio() },
      uRipples: { value: ripples },
      uPointer: { value: pointerUniform },
      uBase: { value: new Color("#7d8de6") },
      uAccent: { value: new Color("#2f56ff") },
      uHot: { value: new Color("#dfe6ff") },
    },
  });
  scene.add(new Points(geometry, material));

  // ── Pins ──
  const headGeometry = new SphereGeometry(0.1, 24, 16);
  const stemGeometry = new CylinderGeometry(0.008, 0.004, 0.6, 6);
  stemGeometry.translate(0, 0.3, 0);
  const haloGeometry = new RingGeometry(0.2, 0.24, 64);
  haloGeometry.rotateX(-Math.PI / 2);
  const sharedGlow = glowTexture();
  const pins: Pin[] = [];

  let time = 0;

  function addRipple(x: number, z: number, strength: number) {
    const slot = ripples[rippleCursor];
    if (slot) slot.set(x, z, time, strength);
    rippleCursor = (rippleCursor + 1) % MAX_RIPPLES;
  }

  function removePin(pin: Pin) {
    scene.remove(pin.group);
    (pin.head.material as MeshBasicMaterial).dispose();
    (pin.stem.material as MeshBasicMaterial).dispose();
    (pin.halo.material as MeshBasicMaterial).dispose();
    (pin.glow.material as SpriteMaterial).dispose();
    pins.splice(pins.indexOf(pin), 1);
  }

  function dropPin(x: number, z: number, settled = false) {
    const oldest = pins[0];
    if (pins.length >= MAX_PINS && oldest) removePin(oldest);
    const group = new Group();
    const head = new Mesh(headGeometry, new MeshBasicMaterial({ color: "#6f88ff", transparent: true }));
    head.position.y = 0.6;
    const stem = new Mesh(stemGeometry, new MeshBasicMaterial({ color: "#c9d3ff", transparent: true, opacity: 0.55 }));
    const glow = new Sprite(
      new SpriteMaterial({
        map: sharedGlow,
        blending: AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.6,
      }),
    );
    glow.scale.setScalar(0.7);
    glow.position.y = 0.6;
    const halo = new Mesh(
      haloGeometry,
      new MeshBasicMaterial({ color: "#5b78ff", transparent: true, opacity: 0, blending: AdditiveBlending }),
    );
    halo.position.y = 0.01;
    group.add(stem, head, glow, halo);
    group.position.set(x, settled ? 0 : PIN_HEIGHT, z);
    // Near pins would loom: soften the perspective so every pin reads as a pin.
    const size = Math.min(1, Math.max(0.5, camBase.distanceTo(new Vector3(x, 0, z)) / 24));
    group.userData.size = size;
    group.scale.setScalar(size);
    scene.add(group);
    pins.push({ group, head, stem, halo, glow, born: settled ? time - PIN_FALL - 2 : time, x, z, landed: settled });
  }

  function updatePins() {
    for (const pin of [...pins]) {
      const age = time - pin.born;
      if (!pin.landed) {
        const f = clamp01(age / PIN_FALL);
        pin.group.position.y = PIN_HEIGHT * (1 - f * f); // gravity: accelerates into the page
        if (f >= 1) {
          pin.landed = true;
          addRipple(pin.x, pin.z, 1);
        }
        continue;
      }
      const since = age - PIN_FALL;
      // Impact: a damped spring squashes the pin once (bounce ~0.2).
      const squash = Math.exp(-since * 9) * Math.cos(since * 22) * 0.22;
      const size = (pin.group.userData.size as number | undefined) ?? 1;
      pin.group.scale.set(size * (1 + squash * 0.6), size * (1 - squash), size * (1 + squash * 0.6));
      const halo = clamp01(since / 1.1);
      pin.halo.scale.setScalar(1 + easeOutCubic(halo) * 5);
      (pin.halo.material as MeshBasicMaterial).opacity = 0.85 * (1 - halo) ** 2;
      const fade = clamp01((age - (PIN_LIFE - 0.7)) / 0.7);
      (pin.head.material as MeshBasicMaterial).opacity = 1 - fade;
      (pin.glow.material as SpriteMaterial).opacity = 0.6 * (1 - fade);
      (pin.stem.material as MeshBasicMaterial).opacity = 0.55 * (1 - fade);
      pin.group.position.y = fade * 0.4;
      if (age > PIN_LIFE) removePin(pin);
    }
  }

  // ── Screen point → point on the sheet ──
  const raycaster = new Raycaster();
  const floor = new Plane(new Vector3(0, 1, 0), 0);
  const ndc = new Vector2();
  const hit = new Vector3();

  function toFloor(clientX: number, clientY: number, clampToNear: boolean): Vector3 | null {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return null;
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    // Points above the visible sheet (the headline) ring from the sheet below them.
    if (clampToNear) ndc.y = Math.min(ndc.y, -0.35);
    raycaster.setFromCamera(ndc, camera);
    const found = raycaster.ray.intersectPlane(floor, hit);
    if (!found || hit.z < -28) return null;
    return hit;
  }

  // ── Layout ──
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    uScale.value = Math.min(1.7, Math.max(0.85, height / 900));
    const aspect = width / height;
    camera.aspect = aspect;
    camera.fov = aspect < 0.9 ? 44 : aspect < 1.3 ? 36 : 30;
    camBase.set(0, aspect < 0.9 ? 4.2 : 3.4, 13);
    camera.position.copy(camBase);
    camera.lookAt(lookTarget);
    camera.updateProjectionMatrix();
    if (reduceMotion) renderer.render(scene, camera);
  }

  // ── Pointer (decorative, so it trails through a spring) ──
  const spring = { x: 0, z: 0, vx: 0, vz: 0, s: 0, vs: 0 };
  const target = { x: 0, z: 0, s: 0 };
  // The camera leans a little toward the pointer, through a softer spring.
  const lean = { x: 0, y: 0, vx: 0, vy: 0 };
  const leanTarget = { x: 0, y: 0 };

  function onPointerMove(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    leanTarget.x = ((e.clientX - rect.left) / rect.width - 0.5) * 1.6;
    leanTarget.y = ((e.clientY - rect.top) / rect.height - 0.5) * -0.6;
    const p = toFloor(e.clientX, e.clientY, false);
    if (!p) {
      target.s = 0;
      return;
    }
    target.x = p.x;
    target.z = p.z;
    target.s = 1;
  }
  function onPointerLeave() {
    target.s = 0;
    leanTarget.x = 0;
    leanTarget.y = 0;
  }
  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    const el = e.target as Element | null;
    // Only empty space drops a pin: text stays selectable, controls stay controls.
    if (el?.closest("a, button, input, textarea, select, label, summary, code, pre, h1, p, [data-no-ping]")) return;
    const p = toFloor(e.clientX, e.clientY, false);
    if (p) dropPin(p.x, p.z);
  }
  function onPing(e: Event) {
    const detail = (e as CustomEvent<PingDetail>).detail;
    const p = toFloor(detail.clientX, detail.clientY, true);
    if (!p) return;
    if (detail.kind === "pin") dropPin(p.x, p.z);
    else addRipple(p.x, p.z, detail.strength ?? 1.3);
  }

  function stepSpring(dt: number) {
    const k = 48;
    const c = 2 * Math.sqrt(k) * 0.85;
    spring.vx += (k * (target.x - spring.x) - c * spring.vx) * dt;
    spring.vz += (k * (target.z - spring.z) - c * spring.vz) * dt;
    spring.vs += (k * (target.s - spring.s) - c * spring.vs) * dt;
    spring.x += spring.vx * dt;
    spring.z += spring.vz * dt;
    spring.s += spring.vs * dt;
    pointerUniform.set(spring.x, spring.z, Math.max(0, spring.s));

    const kl = 14;
    const cl = 2 * Math.sqrt(kl);
    lean.vx += (kl * (leanTarget.x - lean.x) - cl * lean.vx) * dt;
    lean.vy += (kl * (leanTarget.y - lean.y) - cl * lean.vy) * dt;
    lean.x += lean.vx * dt;
    lean.y += lean.vy * dt;
    camera.position.set(camBase.x + lean.x, camBase.y + lean.y, camBase.z);
    camera.lookAt(lookTarget);
  }

  // ── Ambient: notes keep arriving while the hero is on screen ──
  let nextDrop = 1.6;
  function ambientDrop() {
    const rect = canvas.getBoundingClientRect();
    const wide = rect.width > rect.height;
    const nx = wide ? 0.1 + Math.random() * 0.8 : -0.8 + Math.random() * 1.6;
    const ny = wide ? -0.15 - Math.random() * 0.45 : -0.45 - Math.random() * 0.35;
    const x = rect.left + ((nx + 1) / 2) * rect.width;
    const y = rect.top + ((1 - ny) / 2) * rect.height;
    const p = toFloor(x, y, false);
    if (p) dropPin(p.x, p.z);
  }

  // ── Loop ──
  let raf = 0;
  let last = 0;
  let running = false;
  let firstFrame = true;

  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    time += dt;
    uTime.value = time;
    stepSpring(dt);
    nextDrop -= dt;
    if (nextDrop <= 0) {
      ambientDrop();
      nextDrop = 3.4 + Math.random() * 2.6;
    }
    updatePins();
    renderer.render(scene, camera);
    if (firstFrame) {
      firstFrame = false;
      canvas.style.opacity = "1";
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduceMotion) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  let onScreen = false;
  const io = new IntersectionObserver(([entry]) => {
    onScreen = Boolean(entry?.isIntersecting);
    if (onScreen && document.visibilityState === "visible") start();
    else stop();
  });
  io.observe(host);

  const onVisibility = () => {
    if (document.visibilityState === "visible" && onScreen) start();
    else stop();
  };
  document.addEventListener("visibilitychange", onVisibility);

  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  let stillCleanup: (() => void) | undefined;
  if (reduceMotion) {
    // One still frame: two notes already pinned, nothing moving.
    time = 10;
    const a = toFloor(window.innerWidth * 0.8, window.innerHeight * 0.74, false);
    if (a) dropPin(a.x, a.z, true);
    const b = toFloor(window.innerWidth * 0.64, window.innerHeight * 0.88, false);
    if (b) dropPin(b.x, b.z, true);
    uTime.value = time;
    updatePins();
    renderer.render(scene, camera);
    canvas.style.transition = "none";
    canvas.style.opacity = "1";
    // A click still pins a note: it appears in place, nothing falls or ripples.
    const onStillDown = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (
        e.button !== 0 ||
        el?.closest("a, button, input, textarea, select, label, summary, code, pre, h1, p, [data-no-ping]")
      )
        return;
      const p = toFloor(e.clientX, e.clientY, false);
      if (!p) return;
      dropPin(p.x, p.z, true);
      updatePins();
      renderer.render(scene, camera);
    };
    hitArea.addEventListener("pointerdown", onStillDown);
    stillCleanup = () => hitArea.removeEventListener("pointerdown", onStillDown);
  } else {
    window.addEventListener(PING_EVENT, onPing);
    hitArea.addEventListener("pointerdown", onPointerDown);
    if (finePointer) {
      hitArea.addEventListener("pointermove", onPointerMove);
      hitArea.addEventListener("pointerleave", onPointerLeave);
    }
  }

  return () => {
    stillCleanup?.();
    stop();
    io.disconnect();
    ro.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener(PING_EVENT, onPing);
    hitArea.removeEventListener("pointerdown", onPointerDown);
    hitArea.removeEventListener("pointermove", onPointerMove);
    hitArea.removeEventListener("pointerleave", onPointerLeave);
    for (const pin of [...pins]) removePin(pin);
    geometry.dispose();
    material.dispose();
    headGeometry.dispose();
    stemGeometry.dispose();
    haloGeometry.dispose();
    sharedGlow.dispose();
    renderer.dispose();
    canvas.remove();
  };
}
