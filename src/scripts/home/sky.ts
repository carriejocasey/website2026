/**
 * Slow cloud drift for the sky photo, drawn with a tiny WebGL shader.
 *
 * The photo is sampled through a gently moving, low-frequency warp plus a slow
 * pan-and-breathe. The warp fades out toward the bottom-right corner so the tree
 * stays still while the sky moves. All of it runs on the GPU, so it costs the
 * page almost nothing (the SVG-filter version in the prototype re-rendered the whole
 * photo on the CPU every frame and dropped transitions to ~30fps).
 *
 * If WebGL isn't available, or anything fails, the canvas never fades in and the
 * plain <img> underneath is what people see.
 */

/** Tweak the feel here. */
const SKY = {
  warp: 0.012,        // how far the clouds bend (fraction of the image)
  warpSpeed: 0.018,   // how fast the bending evolves
  driftSeconds: 70,   // one full pan cycle (there and back)
  scaleMin: 1.04,     // breathing zoom range; > 1 keeps the warped edges off-screen
  scaleMax: 1.065,
  maxDpr: 2,
};

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);  // y down, matching the image
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
uniform sampler2D u_tex;
uniform float u_time;
uniform float u_warp;
uniform float u_warpSpeed;
uniform float u_cycle;
uniform vec2 u_scale;
varying vec2 v_uv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = v_uv;
  float t = u_time;

  // Slow pan and breathe, eased at both ends of the cycle.
  float k = 0.5 - 0.5 * cos(6.2831853 * t / u_cycle);
  float s = mix(u_scale.x, u_scale.y, k);
  vec2 pan = mix(vec2(-0.006, 0.0), vec2(0.006, -0.005), k);
  vec2 moved = (uv - 0.5) / s + 0.5 + pan;

  // Domain-warped noise: clouds bend and billow rather than slide.
  vec2 p = uv * vec2(2.6, 2.0);
  float w = u_warpSpeed * t;
  vec2 q = vec2(fbm(p + vec2(0.0, w)), fbm(p + vec2(5.2, 1.3) - vec2(w, 0.0)));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + 0.6 * w), fbm(p + 3.0 * q + vec2(8.3, 2.8) - 0.4 * w));
  moved += (r - 0.5) * u_warp;

  // Keep the tree (bottom-right) still: fade every offset out toward that corner.
  vec2 d = (uv - vec2(1.0, 1.0)) / vec2(0.36, 0.34);
  float still = 1.0 - smoothstep(0.55, 1.05, length(d));
  vec2 st = mix(moved, uv, still);

  gl_FragColor = texture2D(u_tex, clamp(st, 0.0, 1.0));
}`;

export function mountSky(canvas: HTMLCanvasElement, img: HTMLImageElement) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  if (!gl) return;

  const program = link(gl, VERT, FRAG);
  if (!program) return;
  gl.useProgram(program);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uTime = u('u_time');
  gl.uniform1f(u('u_warp'), SKY.warp);
  gl.uniform1f(u('u_warpSpeed'), SKY.warpSpeed);
  gl.uniform1f(u('u_cycle'), SKY.driftSeconds);
  gl.uniform2f(u('u_scale'), SKY.scaleMin, SKY.scaleMax);

  let texSize = { w: 0, h: 0 };
  let raf = 0;
  let lost = false;
  const t0 = performance.now() - Math.random() * 20_000; // start somewhere mid-drift

  function upload() {
    const tex = gl!.createTexture();
    gl!.bindTexture(gl!.TEXTURE_2D, tex);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGB, gl!.RGB, gl!.UNSIGNED_BYTE, img);
    texSize = { w: img.naturalWidth, h: img.naturalHeight };
    resize();
  }

  // Never render more pixels than the photo has: past that it's just upscaling.
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, SKY.maxDpr);
    const w = Math.round(Math.min(rect.width * dpr, texSize.w || rect.width * dpr));
    const h = Math.round(w * (rect.height / Math.max(1, rect.width)));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl!.viewport(0, 0, w, h);
      draw(performance.now()); // resizing clears the canvas; repaint right away
    }
  }

  function draw(now: number) {
    if (lost || !texSize.w) return;
    gl!.uniform1f(uTime, (now - t0) / 1000);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    draw(now);
  }

  function start() {
    if (raf || lost) return;
    raf = requestAnimationFrame((now) => {
      frame(now);
      // Fade the live canvas in over the still photo once it has drawn a frame.
      canvas.classList.add('is-live');
    });
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    lost = true;
    stop();
    canvas.classList.remove('is-live');
  });

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  new ResizeObserver(resize).observe(canvas);

  const go = () => {
    try { upload(); start(); } catch { canvas.remove(); }
  };
  if (img.complete && img.naturalWidth) go();
  else img.addEventListener('load', go, { once: true });
}

function link(gl: WebGLRenderingContext, vs: string, fs: string) {
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const v = compile(gl.VERTEX_SHADER, vs);
  const f = compile(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const p = gl.createProgram()!;
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(p)); return null; }
  return p;
}
