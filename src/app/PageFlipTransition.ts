/**
 * Custom 3D Page Flip Transition (`src/app/PageFlipTransition.ts`).
 *
 * Uses a standalone, zero-dependency WebGL cylindrical page-curl GLSL shader
 * (with an automatic 2D-canvas shaded-curl fallback and `prefers-reduced-motion`
 * crossfade) paired with the 3D perspective stage and optical overlays in
 * `src/index.css` to smoothly flip between the Main Menu and the 3D Game World.
 */

export type PageFlipDirection = 'menu-to-game' | 'game-to-menu';

export interface PageCurlUniformState {
  /** Eased transition progress in [0, 1]. */
  progress: number;
  /** Normalized curl cylinder axis position across [0, 1] viewport space. */
  curlAxisX: number;
  /** Physical cylinder curl radius in normalized screen height units. */
  curlRadius: number;
  /** Diagonal peel tilt angle in radians. */
  tiltRad: number;
  /** Cast drop-shadow alpha projected onto the revealed destination below. */
  shadowOpacity: number;
  /** Specular paper-crest sheen intensity along the rolled cylinder. */
  specularIntensity: number;
  /** +1 = right-to-left forward flip (menu -> game), -1 = left-to-right return flip (game -> menu). */
  directionSign: 1 | -1;
}

export interface PageFlipStartOptions {
  direction: PageFlipDirection;
  frontCanvas?: HTMLCanvasElement | null;
  loadingLabel?: string;
  mountParent?: HTMLElement | null;
}

/**
 * Tactile weighted page-turn easing curve: gentle corner lift, brisk mid-arc sweep,
 * and cushioned settle as the sheet clears the viewport.
 */
export function easePageFlipCurve(t: number): number {
  const x = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
  const cubic = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const sine = 0.5 - 0.5 * Math.cos(Math.PI * x);
  return Number((cubic * 0.68 + sine * 0.32).toFixed(6));
}

/**
 * Pure cylindrical page-curl geometry & lighting solver used by both the WebGL GLSL
 * fragment shader and the 2D canvas fallback renderer.
 *
 * Coordinate convention (in right-to-left canonical space before direction flip):
 * - `progress = 0.0`: `curlAxisX = 1.14` (page lies 100% flat across the viewport)
 * - `progress = 0.5`: `curlAxisX ≈ 0.25` (curl cylinder sweeps across screen center with max lift)
 * - `progress = 1.0`: `curlAxisX = -0.68` (cylinder and cast shadow fully clear the viewport)
 */
export function computePageCurlUniforms(
  rawProgress: number,
  direction: PageFlipDirection,
): PageCurlUniformState {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(rawProgress) ? rawProgress : 0));
  const progress = easePageFlipCurve(clamped);
  const directionSign: 1 | -1 = direction === 'menu-to-game' ? 1 : -1;

  // Sweep cylinder axis cleanly from beyond the lifting edge to past the opposite edge
  const startAxis = 1.14;
  const endAxis = -0.68;
  const curlAxisX = startAxis + (endAxis - startAxis) * progress;

  // Cylinder radius swells during mid-sweep (weighted parchment arc) and relaxes near edges
  const archBell = Math.sin(Math.PI * progress);
  const curlRadius = 0.072 + 0.098 * Math.pow(archBell, 0.85);

  // Diagonal hand-peel angle tilts gently during lift and flattens as the page exits
  const baseTilt = direction === 'menu-to-game' ? 0.145 : 0.125;
  const tiltRad = baseTilt * (0.35 + 0.65 * archBell);

  // Cast shadow onto the live destination underneath fades cleanly to 0 at start & finish
  const shadowOpacity = Number((0.64 * Math.pow(archBell, 0.72)).toFixed(4));

  // Warm parchment / gold specular crest sheen across the roll
  const specularIntensity = Number((0.28 + 0.52 * archBell).toFixed(4));

  return {
    progress: Number(progress.toFixed(6)),
    curlAxisX: Number(curlAxisX.toFixed(5)),
    curlRadius: Number(curlRadius.toFixed(5)),
    tiltRad: Number(tiltRad.toFixed(5)),
    shadowOpacity,
    specularIntensity,
    directionSign,
  };
}

export const PAGE_FLIP_VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const PAGE_FLIP_FRAGMENT_SHADER = `
precision highp float;

varying vec2 vUv;

uniform sampler2D uFrontTex;
uniform sampler2D uBackTex;
uniform float uAspect;
uniform float uCurlAxisX;
uniform float uCurlRadius;
uniform float uTilt;
uniform float uShadowOpacity;
uniform float uSpecularIntensity;
uniform float uDirection;

const float PI = 3.14159265359;

bool isInsidePage(vec2 uv) {
  return uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0;
}

vec2 toCanonical(vec2 uv) {
  return vec2(uDirection > 0.0 ? uv.x : 1.0 - uv.x, uv.y);
}

vec2 fromCanonical(vec2 uv) {
  return vec2(uDirection > 0.0 ? uv.x : 1.0 - uv.x, uv.y);
}

void main() {
  // Canonical UV space where page always peels from right (1.0) toward left (0.0)
  vec2 cUv = toCanonical(vUv);

  // Isotropic aspect-corrected space so the curl cylinder stays a true geometric circle
  vec2 pIso = vec2(cUv.x * uAspect, cUv.y);
  vec2 foldOrigin = vec2(uCurlAxisX * uAspect, 0.5);
  vec2 foldDir = vec2(cos(uTilt), sin(uTilt));

  float R = max(0.015, uCurlRadius);
  float d = dot(pIso - foldOrigin, foldDir);

  // Region 1: Past the cylinder crest — revealed live destination underneath + soft cast shadow
  if (d > R) {
    float shadowSpan = max(0.08, R * 1.65);
    float normDist = clamp((d - R) / shadowSpan, 0.0, 1.0);
    float penumbra = exp(-normDist * 3.1) * (1.0 - smoothstep(0.55, 1.0, normDist));
    float shadowAlpha = clamp(penumbra * uShadowOpacity, 0.0, 0.72);
    gl_FragColor = vec4(0.015, 0.032, 0.042, shadowAlpha);
    return;
  }

  // Region 2: Directly along the 3D rolled cylinder (0 <= d <= R)
  if (d >= 0.0) {
    float ratio = clamp(d / R, 0.0, 1.0);
    float asinRatio = asin(ratio);

    // Top/back half of cylinder (closest to viewer)
    float arcBack = R * (PI - asinRatio);
    vec2 pBackIso = pIso + foldDir * (arcBack - d);
    vec2 uvBackCanonical = vec2(pBackIso.x / uAspect, pBackIso.y);

    if (isInsidePage(uvBackCanonical)) {
      vec2 sampleBackUv = fromCanonical(uvBackCanonical);
      vec3 backColor = texture2D(uBackTex, sampleBackUv).rgb;
      vec3 frontBleed = texture2D(uFrontTex, sampleBackUv).rgb;
      vec3 paperBase = mix(backColor, frontBleed, 0.14);

      // Cylinder normal on the curled-over top surface
      float nZ = sqrt(max(0.0, 1.0 - ratio * ratio));
      vec3 normal = normalize(vec3(ratio * 0.92, -sin(uTilt) * ratio * 0.25, nZ));
      vec3 lightDir = normalize(vec3(0.42, 0.28, 0.86));
      vec3 viewDir = vec3(0.0, 0.0, 1.0);
      vec3 halfVec = normalize(lightDir + viewDir);

      float diffuse = 0.54 + 0.56 * max(0.0, dot(normal, lightDir));
      float spec = pow(max(0.0, dot(normal, halfVec)), 18.0) * uSpecularIntensity;
      // Subtle warm gilded rim along the outermost crest of the curl
      float rimCrest = pow(ratio, 3.2) * 0.22;

      vec3 lit = paperBase * diffuse + vec3(0.98, 0.85, 0.54) * (spec * 0.44 + rimCrest * 0.35);
      // Soft valley AO where the curled sheet meets the left fold seam
      float seamAo = mix(0.74, 1.0, smoothstep(0.0, 0.26, ratio));
      gl_FragColor = vec4(lit * seamAo, 1.0);
      return;
    }

    // Bottom/front half of cylinder curving upward away from the destination
    float arcFront = R * asinRatio;
    vec2 pFrontIso = pIso + foldDir * (arcFront - d);
    vec2 uvFrontCanonical = vec2(pFrontIso.x / uAspect, pFrontIso.y);

    if (isInsidePage(uvFrontCanonical)) {
      vec2 sampleFrontUv = fromCanonical(uvFrontCanonical);
      vec3 frontColor = texture2D(uFrontTex, sampleFrontUv).rgb;
      float nZ = sqrt(max(0.0, 1.0 - ratio * ratio));
      float shade = mix(0.68, 1.04, nZ);
      float crestGlow = pow(ratio, 2.4) * 0.16;
      vec3 lit = frontColor * shade + vec3(0.95, 0.82, 0.52) * crestGlow;
      gl_FragColor = vec4(lit, 1.0);
      return;
    }

    // Page edge has already peeled past this cylinder slice — cast shadow on destination
    float edgeFade = clamp((1.0 - ratio * 0.55) * uShadowOpacity * 0.65, 0.0, 0.65);
    gl_FragColor = vec4(0.015, 0.032, 0.042, edgeFade);
    return;
  }

  // Region 3: Ahead of the fold line (d < 0) — either flat turned-over back face or flat front face
  vec2 pTurnedIso = pIso + foldDir * (PI * R - 2.0 * d);
  vec2 uvTurnedCanonical = vec2(pTurnedIso.x / uAspect, pTurnedIso.y);

  if (isInsidePage(uvTurnedCanonical)) {
    vec2 sampleTurnedUv = fromCanonical(uvTurnedCanonical);
    vec3 backColor = texture2D(uBackTex, sampleTurnedUv).rgb;
    vec3 frontBleed = texture2D(uFrontTex, sampleTurnedUv).rgb;
    vec3 paperBase = mix(backColor, frontBleed, 0.12);

    // Subtle crease shadow near d = 0 and soft golden parchment edge bevel
    float creaseShade = mix(0.76, 1.0, smoothstep(0.0, -R * 1.15, d));
    float edgeDist = min(
      min(uvTurnedCanonical.x, 1.0 - uvTurnedCanonical.x),
      min(uvTurnedCanonical.y, 1.0 - uvTurnedCanonical.y)
    );
    float goldRim = (1.0 - smoothstep(0.0, 0.014, edgeDist)) * 0.24;
    vec3 lit = paperBase * creaseShade + vec3(0.95, 0.78, 0.38) * goldRim;
    gl_FragColor = vec4(lit, 1.0);
    return;
  }

  // Flat, still-unturned portion of the front page + contact shadow cast by the approaching turned sheet
  vec2 sampleFlatUv = fromCanonical(cUv);
  vec3 flatFront = texture2D(uFrontTex, sampleFlatUv).rgb;

  // Compute distance outside the turned sheet rectangle for soft hover shadow
  vec2 overMin = max(vec2(0.0), -uvTurnedCanonical);
  vec2 overMax = max(vec2(0.0), uvTurnedCanonical - vec2(1.0));
  float outDist = length(vec2((overMin.x + overMax.x) * uAspect, overMin.y + overMax.y));
  float hoverShadow = exp(-outDist * 14.0) * uShadowOpacity * 0.58;
  float creaseLead = exp(d / max(0.04, R * 0.9)) * uShadowOpacity * 0.22;
  float dim = 1.0 - clamp(hoverShadow + creaseLead, 0.0, 0.52);

  gl_FragColor = vec4(flatFront * dim, 1.0);
}
`;

function clampCanvasSize(
  vw: number,
  vh: number,
  maxWidth = 1280,
): { width: number; height: number } {
  const safeW = Math.max(320, Math.round(vw || 1280));
  const safeH = Math.max(240, Math.round(vh || 720));
  if (safeW <= maxWidth) {
    return { width: safeW, height: safeH };
  }
  const scale = maxWidth / safeW;
  return {
    width: maxWidth,
    height: Math.max(240, Math.round(safeH * scale)),
  };
}

/**
 * Draws a visual front-page snapshot of the Main Menu shell onto an offscreen canvas,
 * reusing the already-loaded hero artwork image when available for instant zero-flicker capture.
 */
export function captureMainMenuSnapshotCanvas(rootElement: HTMLElement): HTMLCanvasElement {
  const { width, height } = clampCanvasSize(window.innerWidth, window.innerHeight);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Deep alpine jade-obsidian canvas base
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#071214');
  bgGrad.addColorStop(0.55, '#0b1b1d');
  bgGrad.addColorStop(1, '#060d11');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Draw the live loaded hero mountain artwork if present
  const heroImg = rootElement.querySelector<HTMLImageElement>('.scm-backdrop-img');
  if (heroImg && heroImg.complete && heroImg.naturalWidth > 0) {
    const imgRatio = heroImg.naturalWidth / heroImg.naturalHeight;
    const canvasRatio = width / height;
    let drawW = width;
    let drawH = height;
    let offsetX = 0;
    let offsetY = 0;
    if (imgRatio > canvasRatio) {
      drawW = height * imgRatio;
      offsetX = (width - drawW) * 0.5;
    } else {
      drawH = width / imgRatio;
      offsetY = (height - drawH) * 0.5;
    }
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.drawImage(heroImg, offsetX, offsetY, drawW, drawH);
    ctx.restore();
  }

  // Editorial contrast scrim matching `.scm-backdrop-scrim`
  const scrim = ctx.createLinearGradient(0, 0, 0, height);
  scrim.addColorStop(0, 'rgba(6, 13, 15, 0.76)');
  scrim.addColorStop(0.42, 'rgba(6, 13, 15, 0.54)');
  scrim.addColorStop(1, 'rgba(6, 12, 14, 0.94)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, width, height);

  // Subtle top bar hairline + wordmark
  const padX = Math.round(width * 0.08);
  const topY = Math.round(height * 0.085);
  ctx.strokeStyle = 'rgba(242, 193, 78, 0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padX, topY + 18);
  ctx.lineTo(width - padX, topY + 18);
  ctx.stroke();

  ctx.fillStyle = '#f8f4e8';
  ctx.font = `700 ${Math.round(Math.max(15, width * 0.015))}px Cinzel, Georgia, serif`;
  ctx.fillText('Serpent Peaks', padX, topY);

  // Hero display title + kicker mirrored from the front page
  const titleEl = rootElement.querySelector<HTMLElement>('.scm-title');
  const kickerEl = rootElement.querySelector<HTMLElement>('.scm-kicker');
  const titleText = titleEl?.textContent?.trim() || 'Ascend the Serpent Peaks';
  const kickerText =
    kickerEl?.textContent?.trim() || '3D Alpine Cultivation · Spatial Portal Ecosystem';

  const heroY = Math.round(height * 0.37);
  ctx.fillStyle = 'rgba(242, 193, 78, 0.88)';
  ctx.font = `600 ${Math.round(Math.max(11, width * 0.01))}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.fillText(kickerText, padX, heroY - Math.round(height * 0.055));

  ctx.fillStyle = '#f9f6ee';
  const titleSize = Math.round(Math.max(30, Math.min(62, width * 0.044)));
  ctx.font = `700 ${titleSize}px Cinzel, Georgia, serif`;
  ctx.fillText(titleText, padX, heroY);

  // Subtle gilded accent rule and editorial card silhouettes
  const ruleGrad = ctx.createLinearGradient(padX, 0, padX + Math.round(width * 0.24), 0);
  ruleGrad.addColorStop(0, 'rgba(242, 193, 78, 0.85)');
  ruleGrad.addColorStop(1, 'rgba(242, 193, 78, 0)');
  ctx.fillStyle = ruleGrad;
  ctx.fillRect(padX, heroY + 22, Math.round(width * 0.24), 2);

  // Warm gilded primary button silhouette
  const btnW = Math.round(Math.max(170, width * 0.17));
  const btnH = Math.round(Math.max(40, height * 0.062));
  const btnY = heroY + Math.round(height * 0.09);
  const btnGrad = ctx.createLinearGradient(padX, btnY, padX + btnW, btnY + btnH);
  btnGrad.addColorStop(0, '#d8a437');
  btnGrad.addColorStop(1, '#f2c14e');
  ctx.fillStyle = btnGrad;
  ctx.beginPath();
  ctx.roundRect(padX, btnY, btnW, btnH, 10);
  ctx.fill();

  ctx.fillStyle = '#091418';
  ctx.font = `700 ${Math.round(Math.max(13, width * 0.0115))}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.fillText('Enter Snake City  →', padX + 20, btnY + Math.round(btnH * 0.62));

  return canvas;
}

/**
 * Generates a fallback stylized alpine panorama snapshot when a live WebGL frame
 * cannot be read (e.g., context lost or headless test environment).
 */
export function createFallbackGameSnapshotCanvas(): HTMLCanvasElement {
  const { width, height } = clampCanvasSize(window.innerWidth, window.innerHeight);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#0c1f29');
  sky.addColorStop(0.48, '#173842');
  sky.addColorStop(1, '#091318');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Layered misty mountain silhouettes
  const layers = [
    { y: 0.56, amp: 0.14, freq: 2.3, color: 'rgba(18, 44, 50, 0.92)' },
    { y: 0.68, amp: 0.11, freq: 3.1, color: 'rgba(12, 31, 37, 0.96)' },
    { y: 0.8, amp: 0.08, freq: 4.0, color: 'rgba(7, 19, 24, 1)' },
  ];
  for (const layer of layers) {
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 24) {
      const nx = x / width;
      const ridge =
        Math.sin(nx * Math.PI * layer.freq) * height * layer.amp +
        Math.cos(nx * Math.PI * (layer.freq * 1.7 + 0.5)) * height * (layer.amp * 0.42);
      ctx.lineTo(x, height * layer.y - Math.abs(ridge));
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = layer.color;
    ctx.fill();
  }

  return canvas;
}

/**
 * Synthesizes the tactile gilded manuscript back-face texture revealed on the underside
 * of the turning 3D page (woven parchment fibers, antique gold border, peak crest emblem).
 */
function createManuscriptBackCanvas(direction: PageFlipDirection): HTMLCanvasElement {
  const width = 768;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Deep jade-ink Xuan scroll reverse tone (harmonizes with Serpent Peaks palette)
  const baseGrad = ctx.createLinearGradient(0, 0, width, height);
  if (direction === 'menu-to-game') {
    baseGrad.addColorStop(0, '#132425');
    baseGrad.addColorStop(0.5, '#193030');
    baseGrad.addColorStop(1, '#0e1b1d');
  } else {
    baseGrad.addColorStop(0, '#1b1d26');
    baseGrad.addColorStop(0.5, '#142629');
    baseGrad.addColorStop(1, '#0d181c');
  }
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, width, height);

  // Fine horizontal parchment fiber grain
  ctx.strokeStyle = 'rgba(242, 220, 170, 0.038)';
  ctx.lineWidth = 1;
  for (let y = 6; y < height; y += 7) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y + ((y * 13) % 5) - 2);
    ctx.stroke();
  }

  // Double gilded hairline frame
  ctx.strokeStyle = 'rgba(242, 193, 78, 0.34)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(22, 22, width - 44, height - 44);
  ctx.strokeStyle = 'rgba(242, 193, 78, 0.14)';
  ctx.lineWidth = 1;
  ctx.strokeRect(32, 32, width - 64, height - 64);

  // Central mountain-peak & compass crest watermark
  const cx = width * 0.5;
  const cy = height * 0.5;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = 'rgba(242, 193, 78, 0.24)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, 74, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(242, 193, 78, 0.14)';
  ctx.beginPath();
  ctx.arc(0, 0, 92, 0, Math.PI * 2);
  ctx.stroke();

  // Mountain triad emblem
  ctx.beginPath();
  ctx.moveTo(-48, 26);
  ctx.lineTo(-14, -22);
  ctx.lineTo(6, 4);
  ctx.lineTo(24, -32);
  ctx.lineTo(50, 26);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(242, 193, 78, 0.42)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Subtle emblem caption
  ctx.fillStyle = 'rgba(242, 214, 146, 0.46)';
  ctx.font = '600 13px Cinzel, Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('SERPENT PEAKS CHRONICLE', 0, 118);
  ctx.restore();

  return canvas;
}

interface WebGLFlipRenderer {
  render: (uniforms: PageCurlUniformState) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

function createWebGLFlipRenderer(
  canvas: HTMLCanvasElement,
  frontSource: HTMLCanvasElement,
  backSource: HTMLCanvasElement,
): WebGLFlipRenderer | null {
  const gl =
    canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    }) ||
    (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

  if (!gl) return null;

  const compile = (type: number, source: string): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vs = compile(gl.VERTEX_SHADER, PAGE_FLIP_VERTEX_SHADER);
  const fs = compile(gl.FRAGMENT_SHADER, PAGE_FLIP_FRAGMENT_SHADER);
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }

  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );

  const uploadTexture = (source: HTMLCanvasElement, unit: number): WebGLTexture | null => {
    const tex = gl.createTexture();
    if (!tex) return null;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    return tex;
  };

  const frontTex = uploadTexture(frontSource, 0);
  const backTex = uploadTexture(backSource, 1);
  if (!frontTex || !backTex) {
    if (frontTex) gl.deleteTexture(frontTex);
    if (backTex) gl.deleteTexture(backTex);
    gl.deleteBuffer(quadBuffer);
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }

  const aPosLoc = gl.getAttribLocation(program, 'aPosition');
  const uFrontLoc = gl.getUniformLocation(program, 'uFrontTex');
  const uBackLoc = gl.getUniformLocation(program, 'uBackTex');
  const uAspectLoc = gl.getUniformLocation(program, 'uAspect');
  const uCurlAxisLoc = gl.getUniformLocation(program, 'uCurlAxisX');
  const uCurlRadiusLoc = gl.getUniformLocation(program, 'uCurlRadius');
  const uTiltLoc = gl.getUniformLocation(program, 'uTilt');
  const uShadowLoc = gl.getUniformLocation(program, 'uShadowOpacity');
  const uSpecLoc = gl.getUniformLocation(program, 'uSpecularIntensity');
  const uDirLoc = gl.getUniformLocation(program, 'uDirection');

  gl.useProgram(program);
  gl.uniform1i(uFrontLoc, 0);
  gl.uniform1i(uBackLoc, 1);

  let disposed = false;

  return {
    resize: (width: number, height: number) => {
      if (disposed) return;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    },
    render: (uniforms: PageCurlUniformState) => {
      if (disposed) return;
      const aspect = canvas.width / Math.max(1, canvas.height);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);

      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      gl.enableVertexAttribArray(aPosLoc);
      gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, frontTex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, backTex);

      gl.uniform1f(uAspectLoc, aspect);
      gl.uniform1f(uCurlAxisLoc, uniforms.curlAxisX);
      gl.uniform1f(uCurlRadiusLoc, uniforms.curlRadius);
      gl.uniform1f(uTiltLoc, uniforms.tiltRad);
      gl.uniform1f(uShadowLoc, uniforms.shadowOpacity);
      gl.uniform1f(uSpecLoc, uniforms.specularIntensity);
      gl.uniform1f(uDirLoc, uniforms.directionSign);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      gl.deleteTexture(frontTex);
      gl.deleteTexture(backTex);
      gl.deleteBuffer(quadBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

/**
 * Software 2D Canvas shaded page-curl fallback if WebGL is unavailable.
 */
function create2DFallbackFlipRenderer(
  canvas: HTMLCanvasElement,
  frontSource: HTMLCanvasElement,
  backSource: HTMLCanvasElement,
): WebGLFlipRenderer {
  const ctx = canvas.getContext('2d');
  return {
    resize: (width: number, height: number) => {
      canvas.width = width;
      canvas.height = height;
    },
    render: (u: PageCurlUniformState) => {
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const peelX =
        u.directionSign > 0
          ? Math.max(-w * 0.25, Math.min(w * 1.15, u.curlAxisX * w))
          : Math.max(-w * 0.15, Math.min(w * 1.25, (1 - u.curlAxisX) * w));
      const curlBand = Math.max(24, u.curlRadius * h * 1.35);

      // 1. Flat unpeeled portion of the front face
      ctx.save();
      ctx.beginPath();
      if (u.directionSign > 0) {
        ctx.rect(0, 0, Math.max(0, peelX), h);
      } else {
        ctx.rect(Math.max(0, peelX), 0, Math.max(0, w - peelX), h);
      }
      ctx.clip();
      ctx.drawImage(frontSource, 0, 0, w, h);
      ctx.restore();

      // 2. Cast shadow onto the revealed live destination
      const shadowW = curlBand * 1.1;
      const shadowStart = u.directionSign > 0 ? peelX : peelX - shadowW;
      const shadowGrad = ctx.createLinearGradient(
        u.directionSign > 0 ? peelX : peelX,
        0,
        u.directionSign > 0 ? peelX + shadowW : peelX - shadowW,
        0,
      );
      shadowGrad.addColorStop(0, `rgba(4, 10, 14, ${u.shadowOpacity * 0.72})`);
      shadowGrad.addColorStop(1, 'rgba(4, 10, 14, 0)');
      ctx.fillStyle = shadowGrad;
      ctx.fillRect(shadowStart, 0, shadowW, h);

      // 3. Curled back-face strip with gilded specular highlight
      const backLeft = u.directionSign > 0 ? peelX - curlBand : peelX;
      ctx.save();
      ctx.beginPath();
      ctx.rect(backLeft, 0, curlBand, h);
      ctx.clip();
      ctx.drawImage(backSource, backLeft, 0, curlBand, h);
      const sheen = ctx.createLinearGradient(backLeft, 0, backLeft + curlBand, 0);
      sheen.addColorStop(0, 'rgba(0, 0, 0, 0.34)');
      sheen.addColorStop(0.55, `rgba(248, 220, 152, ${0.26 * u.specularIntensity})`);
      sheen.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
      ctx.fillStyle = sheen;
      ctx.fillRect(backLeft, 0, curlBand, h);
      ctx.restore();
    },
    dispose: () => {
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}

/**
 * Coordinates the fullscreen 3D Page Flip overlay lifecycle across async route swaps:
 * 1. `start()` mounts the overlay immediately and lifts the page corner (0 -> 0.16)
 *    while the target subsystem loads underneath.
 * 2. `complete()` sweeps the curl smoothly from its current progress to 1.0 over
 *    `sweepDurationMs` and disposes all GPU resources & DOM nodes cleanly.
 */
export class PageFlipTransitionController {
  private stageEl: HTMLDivElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;
  private sheenEl: HTMLDivElement | null = null;
  private whisperEl: HTMLDivElement | null = null;
  private renderer: WebGLFlipRenderer | null = null;
  private rafId: number | null = null;
  private whisperTimer: number | null = null;
  private resizeHandler: (() => void) | null = null;
  private reducedMotion = false;
  private direction: PageFlipDirection = 'menu-to-game';
  private currentProgress = 0;
  private active = false;

  public start(options: PageFlipStartOptions): void {
    this.cancel();

    this.direction = options.direction;
    this.currentProgress = 0;
    this.active = true;
    this.reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const mountParent = options.mountParent ?? document.body;

    const stage = document.createElement('div');
    stage.className = [
      'pf-transition-stage',
      options.direction === 'menu-to-game' ? 'pf-dir-to-game' : 'pf-dir-to-menu',
      this.reducedMotion ? 'pf-reduced-motion' : '',
    ]
      .filter(Boolean)
      .join(' ');
    stage.setAttribute('aria-hidden', 'true');
    stage.style.setProperty('--pf-progress', '0');
    stage.style.setProperty('--pf-curl-x', options.direction === 'menu-to-game' ? '100%' : '0%');

    const canvas = document.createElement('canvas');
    canvas.className = 'pf-shader-canvas';
    stage.appendChild(canvas);

    const sheen = document.createElement('div');
    sheen.className = 'pf-spine-sheen';
    stage.appendChild(sheen);

    if (options.loadingLabel) {
      const whisper = document.createElement('div');
      whisper.className = 'pf-loading-whisper';
      whisper.textContent = options.loadingLabel;
      stage.appendChild(whisper);
      this.whisperEl = whisper;
      // Show quiet loading whisper only if async chunk load takes > 180ms
      this.whisperTimer = window.setTimeout(() => {
        if (this.active && this.whisperEl) {
          this.whisperEl.classList.add('is-visible');
        }
      }, 180);
    }

    mountParent.appendChild(stage);
    this.stageEl = stage;
    this.canvasEl = canvas;
    this.sheenEl = sheen;

    const frontSource = options.frontCanvas ?? createFallbackGameSnapshotCanvas();
    const backSource = createManuscriptBackCanvas(options.direction);

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(320, Math.round(window.innerWidth * dpr));
    const h = Math.max(240, Math.round(window.innerHeight * dpr));
    canvas.width = w;
    canvas.height = h;

    this.renderer =
      createWebGLFlipRenderer(canvas, frontSource, backSource) ??
      create2DFallbackFlipRenderer(canvas, frontSource, backSource);
    this.renderer.resize(w, h);

    this.resizeHandler = () => {
      if (!this.renderer || !this.canvasEl) return;
      const nextDpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const nw = Math.max(320, Math.round(window.innerWidth * nextDpr));
      const nh = Math.max(240, Math.round(window.innerHeight * nextDpr));
      this.renderer.resize(nw, nh);
      this.drawAt(this.currentProgress);
    };
    window.addEventListener('resize', this.resizeHandler);

    if (this.reducedMotion) {
      // Render flat static snapshot; `complete()` will perform a clean opacity fade
      this.drawAt(0);
      return;
    }

    // Immediate tactile page-corner lift (0 -> 0.17) while the destination scene mounts underneath
    this.drawAt(0);
    const liftStart = performance.now();
    const liftDurationMs = 260;
    const liftTarget = 0.17;

    const stepLift = (now: number) => {
      if (!this.active) return;
      const t = Math.min(1, (now - liftStart) / liftDurationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      this.currentProgress = liftTarget * eased;
      this.drawAt(this.currentProgress);
      if (t < 1) {
        this.rafId = requestAnimationFrame(stepLift);
      } else {
        this.rafId = null;
      }
    };
    this.rafId = requestAnimationFrame(stepLift);
  }

  public complete(sweepDurationMs = 780): Promise<void> {
    if (!this.active || !this.stageEl) {
      return Promise.resolve();
    }

    if (this.whisperTimer !== null) {
      window.clearTimeout(this.whisperTimer);
      this.whisperTimer = null;
    }
    this.whisperEl?.classList.remove('is-visible');

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // Release pointer interception once the reveal begins so player controls feel instant
    this.stageEl.classList.add('is-sweeping');

    if (this.reducedMotion) {
      this.stageEl.classList.add('is-fading-out');
      return new Promise<void>((resolve) => {
        window.setTimeout(() => {
          this.cancel();
          resolve();
        }, 220);
      });
    }

    const startProgress = this.currentProgress;
    const startTime = performance.now();
    const duration = Math.max(260, sweepDurationMs);

    return new Promise<void>((resolve) => {
      const stepSweep = (now: number) => {
        if (!this.active) {
          resolve();
          return;
        }
        const elapsed = (now - startTime) / duration;
        const t = Math.min(1, elapsed);
        this.currentProgress = startProgress + (1 - startProgress) * t;
        this.drawAt(this.currentProgress);

        if (t < 1) {
          this.rafId = requestAnimationFrame(stepSweep);
        } else {
          this.rafId = null;
          this.cancel();
          resolve();
        }
      };
      this.rafId = requestAnimationFrame(stepSweep);
    });
  }

  private drawAt(rawProgress: number): void {
    const uniforms = computePageCurlUniforms(rawProgress, this.direction);
    this.renderer?.render(uniforms);

    if (this.stageEl) {
      this.stageEl.style.setProperty('--pf-progress', uniforms.progress.toFixed(4));
      const visualPercent =
        this.direction === 'menu-to-game'
          ? Math.max(0, Math.min(100, uniforms.curlAxisX * 100))
          : Math.max(0, Math.min(100, (1 - uniforms.curlAxisX) * 100));
      this.stageEl.style.setProperty('--pf-curl-x', `${visualPercent.toFixed(2)}%`);
    }
    if (this.sheenEl) {
      this.sheenEl.style.opacity = (uniforms.shadowOpacity * 0.72).toFixed(3);
    }
  }

  public cancel(): void {
    this.active = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.whisperTimer !== null) {
      window.clearTimeout(this.whisperTimer);
      this.whisperTimer = null;
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    if (this.stageEl) {
      this.stageEl.remove();
      this.stageEl = null;
    }
    this.canvasEl = null;
    this.sheenEl = null;
    this.whisperEl = null;
  }
}
