import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_MOBILE_CONTROLLER_CONFIG,
  MobileVirtualCursorController,
  computeAbsoluteCursorPosition,
  computeJoystickVector,
  stepJoystickCursorPosition,
} from '../src/game/controller/mobile.ts';

test('computeJoystickVector filters inner deadzone and rescales with response curve', () => {
  const zero = computeJoystickVector(0, 0, 50, 0.14, 1.45);
  assert.equal(zero.engaged, false);
  assert.equal(zero.axisX, 0);
  assert.equal(zero.axisY, 0);
  assert.equal(zero.magnitude, 0);

  // Inside 14% deadzone (5px / 50px = 0.10)
  const inside = computeJoystickVector(5, 0, 50, 0.14, 1.45);
  assert.equal(inside.engaged, false);
  assert.equal(inside.axisX, 0);
  assert.equal(inside.rawX, 5);

  // Mid-throw outside deadzone: non-linear curve should stay softer than linear norm
  const mid = computeJoystickVector(28.5, 0, 50, 0.14, 1.45);
  assert.equal(mid.engaged, true);
  assert.ok(mid.axisX > 0 && mid.axisX < mid.normX);
  assert.equal(mid.axisY, 0);

  // Beyond maxRadius: radially clamped to maxRadius with full magnitude 1
  const full = computeJoystickVector(120, 0, 50, 0.14, 1.45);
  assert.equal(full.engaged, true);
  assert.ok(Math.abs(full.rawX - 50) < 1e-6);
  assert.ok(Math.abs(full.axisX - 1) < 1e-6);
  assert.ok(Math.abs(full.magnitude - 1) < 1e-6);
});

test('stepJoystickCursorPosition integrates relative velocity and clamps dt/viewport', () => {
  const start = { x: 400, y: 300 };
  const next = stepJoystickCursorPosition(start, 0.5, -1.0, 0.02, 1000, 600, 500, 18);
  assert.ok(Math.abs(next.x - (400 + 0.5 * 500 * 0.02)) < 1e-6);
  assert.ok(Math.abs(next.y - (300 - 1.0 * 500 * 0.02)) < 1e-6);

  // Large dt spike is capped to 0.05s to avoid cursor teleporting
  const spike = stepJoystickCursorPosition(start, 1, 0, 2.0, 1000, 600, 500, 18);
  assert.ok(Math.abs(spike.x - (400 + 500 * 0.05)) < 1e-6);

  // Clamped to viewport margins
  const edge = stepJoystickCursorPosition({ x: 10, y: 595 }, -1, 1, 0.05, 1000, 600, 500, 18);
  assert.equal(edge.x, 18);
  assert.equal(edge.y, 582);
});

test('computeAbsoluteCursorPosition maps normalized pad coordinates directly onto viewport', () => {
  const topLeft = computeAbsoluteCursorPosition(-1, -1, 1000, 600, 20);
  assert.deepEqual(topLeft, { x: 20, y: 20 });

  const center = computeAbsoluteCursorPosition(0, 0, 1000, 600, 20);
  assert.deepEqual(center, { x: 500, y: 300 });

  const bottomRight = computeAbsoluteCursorPosition(1, 1, 1000, 600, 20);
  assert.deepEqual(bottomRight, { x: 980, y: 580 });
});

function createMockElement(rect = { left: 100, top: 200, width: 120, height: 120 }) {
  const listeners = new Map<string, Set<(e: unknown) => void>>();
  const classes = new Set<string>();
  const attrs = new Map<string, string>();
  const dataset: Record<string, string> = {};
  const el = {
    dataset,
    textContent: '',
    style: { transform: '' },
    classList: {
      add: (c: string) => classes.add(c),
      remove: (c: string) => classes.delete(c),
      contains: (c: string) => classes.has(c),
    },
    setAttribute: (k: string, v: string) => attrs.set(k, v),
    getAttribute: (k: string) => attrs.get(k) ?? null,
    getBoundingClientRect: () => rect,
    setPointerCapture: () => {},
    addEventListener: (type: string, fn: (e: unknown) => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener: (type: string, fn: (e: unknown) => void) => {
      listeners.get(type)?.delete(fn);
    },
    emit: (type: string, event: Record<string, unknown>) => {
      for (const fn of listeners.get(type) ?? []) {
        fn({ stopPropagation: () => {}, ...event });
      }
    },
  };
  return el;
}

test('MobileVirtualCursorController defaults to relative joystick mode and switches cleanly to absolute mode', () => {
  const padEl = createMockElement();
  const puckEl = createMockElement();
  const cursorEl = createMockElement();
  const labelEl = createMockElement();

  const steerValues: number[] = [];
  const cursorMoves: Array<{ x: number; y: number }> = [];
  let tapCount = 0;

  const controller = new MobileVirtualCursorController(
    {
      padEl: padEl as unknown as HTMLElement,
      puckEl: puckEl as unknown as HTMLElement,
      cursorEl: cursorEl as unknown as HTMLElement,
      labelEl: labelEl as unknown as HTMLElement,
    },
    {
      onSteerAxis: (axis) => steerValues.push(axis),
      onCursorMove: (pos) => cursorMoves.push(pos),
      onTapAction: () => {
        tapCount += 1;
      },
    },
    {},
    { x: 640, y: 360 },
  );

  assert.equal(DEFAULT_MOBILE_CONTROLLER_CONFIG.mode, 'joystick');
  assert.equal(controller.getMode(), 'joystick');
  assert.equal(padEl.dataset.controlMode, 'joystick');
  assert.equal(labelEl.textContent, 'JOYSTICK');

  // Touch down off-center in dynamic-origin joystick mode starts neutral (zero jump)
  padEl.emit('pointerdown', { pointerId: 1, clientX: 130, clientY: 240 });
  assert.equal(controller.getStickState().active, true);
  assert.equal(controller.getStickState().axisX, 0);
  assert.equal(steerValues.at(-1), 0);

  // Dragging 50px right engages stick smoothly relative to touch-down origin
  padEl.emit('pointermove', { pointerId: 1, clientX: 180, clientY: 240 });
  assert.ok(controller.getStickState().axisX > 0.9);
  assert.ok((steerValues.at(-1) ?? 0) < -0.9);
  assert.equal(padEl.classList.contains('is-dragging'), true);

  // Releasing resets stick, centers puck, zeroes steering, and does not count as tap (moved 50px)
  padEl.emit('pointerup', { pointerId: 1, clientX: 180, clientY: 240 });
  assert.equal(controller.getStickState().active, false);
  assert.equal(controller.getStickState().axisX, 0);
  assert.equal(puckEl.style.transform, 'translate3d(0px, 0px, 0)');
  assert.equal(steerValues.at(-1), 0);
  assert.equal(tapCount, 0);

  // Quick tap triggers onTapAction
  padEl.emit('pointerdown', { pointerId: 2, clientX: 160, clientY: 260 });
  padEl.emit('pointerup', { pointerId: 2, clientX: 161, clientY: 260 });
  assert.equal(tapCount, 1);

  // Switch to absolute mode: touch down maps directly to absolute screen coordinate
  const nextMode = controller.toggleMode(false);
  assert.equal(nextMode, 'absolute');
  assert.equal(padEl.dataset.controlMode, 'absolute');
  assert.equal(labelEl.textContent, 'ABSOLUTE PAD');

  padEl.emit('pointerdown', { pointerId: 3, clientX: 220, clientY: 260 });
  const absPos = cursorMoves.at(-1);
  assert.ok(absPos && absPos.x > 1200, 'touching right edge in absolute mode positions cursor near right edge');
  padEl.emit('pointerup', { pointerId: 3, clientX: 220, clientY: 260 });

  controller.destroy();
});
