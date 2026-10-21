import * as THREE from 'three';
import definitions from '../config/symptom-photo-illustrations.json';

export type PhotoSymptom = 'asymmetry' | 'skin' | 'dimpling' | 'nipple';

const fragmentShader = /* glsl */ `
  uniform sampler2D uContours;
  uniform float uTime;
  uniform float uKind;
  uniform vec4 uPoints[2];
  uniform vec2 uAngles;
  uniform float uPointCount;
  varying vec2 vUv;

  float blobHash(vec2 position) {
    position = fract(position * vec2(123.34, 456.21));
    position += dot(position, position + 45.32);
    return fract(position.x * position.y);
  }

  float blobNoise(vec2 position) {
    vec2 cell = floor(position);
    vec2 fraction = fract(position);
    vec2 blend = fraction * fraction * (3.0 - 2.0 * fraction);
    return mix(
      mix(blobHash(cell), blobHash(cell + vec2(1.0, 0.0)), blend.x),
      mix(blobHash(cell + vec2(0.0, 1.0)), blobHash(cell + vec2(1.0)), blend.x),
      blend.y
    );
  }

  float animatedPoint(vec2 position, vec4 point, float rotation, float seed) {
    // Anchor the stain to the baked point. Only its rim flows and deforms.
    vec2 delta = position - point.xy;
    float c = cos(rotation), s = sin(rotation);
    vec2 local = vec2(c * delta.x + s * delta.y, -s * delta.x + c * delta.y) / point.zw;
    float radius = length(local);
    // Keep the fully opaque core and avoid noise work outside the moving rim.
    if (radius < 1.04) return 1.0;
    if (radius > 1.7) return 0.0;
    float angle = atan(local.y, local.x);
    // Sampling noise around a circle keeps the edge continuous at 0 / 2π.
    // Two flowing scales make uneven ink lobes rather than a pulsing ellipse.
    vec2 ring = vec2(cos(angle), sin(angle));
    float broad = blobNoise(ring * 1.65 + vec2(seed * 2.1, uTime * .55));
    float detail = blobNoise(ring * 4.2 + vec2(-uTime * .32, seed * 1.7));
    float edge = max(1.07, 1.29 + .48 * (broad - .5) + .20 * (detail - .5)
      + .04 * sin(angle * 2.0 + uTime * .8 + seed));
    return 1.0 - smoothstep(edge - .025, edge + .025, radius);
  }

  void main() {
    // All registration uses the same top-left 720 × 960 photo coordinates.
    vec2 position = vec2(vUv.x, 1.0 - vUv.y) * vec2(720.0, 960.0);
    vec2 warped = position;
    float time = uTime;
    if (uKind < .5) {
      // Uneven, slow expansion of the breast outline.
      warped.x += sin(position.y * .012 + time * .9) * 6.0;
      warped.y += sin(position.x * .011 - time * .7) * 4.0;
    } else if (uKind < 1.5) {
      // Small ripples travel through the skin marks and lower contour.
      warped.x += sin(position.y * .035 - time * 1.5) * 3.5;
      warped.y += sin(position.x * .026 + time * 1.2) * 3.0;
    } else if (uKind < 2.5) {
      // Local contraction at the drawn dimple rather than moving the whole photo.
      vec2 delta = position - vec2(341.0, 520.0);
      float local = exp(-dot(delta, delta) / 3800.0);
      warped.y += local * (5.0 + 9.0 * sin(time * 1.4));
      warped.x += sin(position.y * .018 + time) * 2.3;
    } else {
      warped.x += sin(position.y * .013 + time * .8) * 2.0;
      // The outlined drop slides down and rises gently below the fixed nipple.
      vec2 delta = position - vec2(391.0, 568.0);
      warped.y -= exp(-dot(delta, delta) / 1600.0) * 13.0 * sin(time * 1.7);
    }
    vec2 uv = vec2(warped.x / 720.0, 1.0 - warped.y / 960.0);
    float ink = texture2D(uContours, clamp(uv, .001, .999)).a;
    float points = animatedPoint(position, uPoints[0], uAngles.x, uKind * 1.7);
    if (uPointCount > 1.5) {
      points = max(points, animatedPoint(position, uPoints[1], uAngles.y, uKind * 1.7 + 2.3));
    }
    gl_FragColor = vec4(1.0, 209.0 / 255.0, 226.0 / 255.0, max(ink, points));
  }
`;

export async function createSymptomPhotoAnimation(canvas: HTMLCanvasElement, symptom: PhotoSymptom, source: string) {
  const kind = definitions.findIndex(definition => definition.symptom === symptom);
  const definition = definitions[kind];
  if (!definition) throw new Error(`Unknown photo symptom: ${symptom}`);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  let texture: THREE.Texture;
  try {
    texture = await new THREE.TextureLoader().loadAsync(source);
  } catch (error) {
    renderer.dispose();
    renderer.forceContextLoss();
    throw error;
  }
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const points = definition.points.map(point => new THREE.Vector4(point[0], point[1], point[2], point[3]));
  const angles = definition.points.map(point => point[4]! * Math.PI / 180);
  const material = new THREE.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    uniforms: {
      uContours: { value: texture }, uTime: { value: 0 }, uKind: { value: kind },
      uPoints: { value: [points[0], points[1] ?? points[0]] },
      uAngles: { value: new THREE.Vector2(angles[0], angles[1] ?? angles[0]) },
      uPointCount: { value: points.length },
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene.add(new THREE.Mesh(geometry, material));
  let frame = 0;
  let lastPaint = 0;
  let elapsed = 0;
  let disposed = false;
  let running = false;

  const paint = () => renderer.render(scene, camera);
  const tick = (now: number) => {
    if (!running || disposed) return;
    if (now - lastPaint >= 1000 / 30) {
      elapsed += Math.min((now - lastPaint) / 1000, .08);
      lastPaint = now;
      material.uniforms.uTime!.value = elapsed;
      paint();
    }
    frame = requestAnimationFrame(tick);
  };
  return {
    resize() {
      if (disposed) return;
      renderer.setSize(Math.max(1, canvas.clientWidth), Math.max(1, canvas.clientHeight), false);
      paint();
    },
    setRunning(value: boolean) {
      if (disposed || running === value) return;
      running = value;
      cancelAnimationFrame(frame);
      if (running) {
        lastPaint = performance.now();
        frame = requestAnimationFrame(tick);
      }
    },
    dispose() {
      disposed = true;
      running = false;
      cancelAnimationFrame(frame);
      texture.dispose();
      material.dispose();
      geometry.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
