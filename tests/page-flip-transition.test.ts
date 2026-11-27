import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  easePageFlipCurve,
  computePageCurlUniforms,
  PAGE_FLIP_VERTEX_SHADER,
  PAGE_FLIP_FRAGMENT_SHADER,
} from '../src/app/PageFlipTransition.ts';

test('easePageFlipCurve is bounded, endpoint-exact, and strictly monotonic', () => {
  assert.equal(easePageFlipCurve(-0.5), 0);
  assert.equal(easePageFlipCurve(0), 0);
  assert.equal(easePageFlipCurve(1), 1);
  assert.equal(easePageFlipCurve(1.8), 1);

  let prev = -1;
  for (let i = 0; i <= 20; i++) {
    const val = easePageFlipCurve(i / 20);
    assert.ok(val >= prev, `expected monotonic increase at step ${i}`);
    prev = val;
  }
});

test('computePageCurlUniforms sweeps smoothly from flat cover to full peel in both directions', () => {
  const startFwd = computePageCurlUniforms(0, 'menu-to-game');
  const midFwd = computePageCurlUniforms(0.5, 'menu-to-game');
  const endFwd = computePageCurlUniforms(1, 'menu-to-game');

  assert.equal(startFwd.directionSign, 1);
  assert.ok(startFwd.curlAxisX > 1.0, 'start axis should lie past lifting edge so page is 100% flat');
  assert.equal(startFwd.shadowOpacity, 0);

  assert.ok(midFwd.curlAxisX < startFwd.curlAxisX && midFwd.curlAxisX > endFwd.curlAxisX);
  assert.ok(midFwd.curlRadius > startFwd.curlRadius, 'curl cylinder swells at mid-flip');
  assert.ok(midFwd.shadowOpacity > 0.5, 'cast shadow peaks during mid-flip');
  assert.ok(midFwd.specularIntensity > startFwd.specularIntensity);

  assert.ok(endFwd.curlAxisX < -0.5, 'end axis clears viewport and shadow cleanly');
  assert.equal(endFwd.shadowOpacity, 0);

  const midRev = computePageCurlUniforms(0.5, 'game-to-menu');
  assert.equal(midRev.directionSign, -1);
  assert.ok(midRev.curlRadius > 0.14);
  assert.ok(midRev.shadowOpacity > 0.5);
});

test('GLSL page-flip shaders declare required cylindrical curl uniforms and varyings', () => {
  assert.match(PAGE_FLIP_VERTEX_SHADER, /attribute vec2 aPosition;/);
  assert.match(PAGE_FLIP_VERTEX_SHADER, /varying vec2 vUv;/);

  for (const uniformName of [
    'uFrontTex',
    'uBackTex',
    'uAspect',
    'uCurlAxisX',
    'uCurlRadius',
    'uTilt',
    'uShadowOpacity',
    'uSpecularIntensity',
    'uDirection',
  ]) {
    assert.ok(
      PAGE_FLIP_FRAGMENT_SHADER.includes(uniformName),
      `fragment shader must declare ${uniformName}`,
    );
  }
});

test('index.css defines 3D page-flip stage, shader canvas animations, and reduced-motion rules', () => {
  const css = fs.readFileSync(path.resolve('src/index.css'), 'utf8');
  assert.match(css, /\.pf-transition-stage\s*\{/);
  assert.match(css, /perspective:\s*1800px;/);
  assert.match(css, /\.pf-shader-canvas\s*\{/);
  assert.match(css, /@keyframes\s+pfShaderCanvasLift/);
  assert.match(css, /@keyframes\s+pfShaderCanvasReturn/);
  assert.match(css, /\.pf-spine-sheen\s*\{/);
  assert.match(css, /\.pf-transition-stage\.pf-reduced-motion/);
});
