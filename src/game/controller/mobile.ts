/**
 * Mobile Virtual Cursor & Analog Thumbstick Controller.
 *
 * Supports two distinct interaction modes:
 * - 'joystick' (default): Relative movement thumbstick with floating touch-down
 *   origin, radial clamping, inner deadzone rescaling, non-linear response curve,
 *   continuous frame-rate-independent cursor velocity integration, and spring-back
 *   recentering on release for responsive mobile game feel.
 * - 'absolute': Classic absolute pad-to-screen positioning where touching a point
 *   on the circular pad maps directly to the corresponding viewport coordinate.
 */

export type MobileControlMode = 'joystick' | 'absolute';

export const MOBILE_CONTROL_MODE_STORAGE_KEY = 'SERPENT_PEAKS_MOBILE_CURSOR_MODE';

export interface MobileControllerConfig {
  mode: MobileControlMode;
  /** Normalized inner deadzone radius [0..0.9] applied in joystick mode. */
  deadzone: number;
  /** Non-linear response curve exponent (>= 1 gives finer center control). */
  responseCurve: number;
  /** Maximum virtual cursor glide speed in CSS pixels/second at full stick throw. */
  cursorMaxSpeedPxPerSec: number;
  /** Viewport edge inset margin in CSS pixels for cursor clamping. */
  cursorMarginPx: number;
  /** Maximum pointer travel (px) to treat a quick press-release as a tap action. */
  tapMoveThresholdPx: number;
  /** Maximum press duration (ms) to treat a quick press-release as a tap action. */
  tapMaxDurationMs: number;
  /** When true in joystick mode, touch-down anchors a neutral floating origin. */
  dynamicOrigin: boolean;
}

export const DEFAULT_MOBILE_CONTROLLER_CONFIG: MobileControllerConfig = {
  mode: 'joystick',
  deadzone: 0.14,
  responseCurve: 1.45,
  cursorMaxSpeedPxPerSec: 560,
  cursorMarginPx: 18,
  tapMoveThresholdPx: 10,
  tapMaxDurationMs: 280,
  dynamicOrigin: true,
};

export interface VirtualCursorPosition {
  x: number;
  y: number;
}

export interface JoystickVectorResult {
  /** Clamped visual puck offset in pixels from center. */
  rawX: number;
  rawY: number;
  /** Linear normalized displacement in [-1, 1]. */
  normX: number;
  normY: number;
  /** Deadzone-filtered & response-curved movement axis in [-1, 1]. */
  axisX: number;
  axisY: number;
  /** Curved radial magnitude in [0, 1]. */
  magnitude: number;
  /** True when displacement exceeds the deadzone threshold. */
  engaged: boolean;
}

export interface MobileStickSnapshot {
  active: boolean;
  mode: MobileControlMode;
  axisX: number;
  axisY: number;
  magnitude: number;
  cursorX: number;
  cursorY: number;
}

export interface MobileControllerElements {
  padEl: HTMLElement;
  puckEl: HTMLElement;
  cursorEl?: HTMLElement | null;
  labelEl?: HTMLElement | null;
}

export interface MobileControllerCallbacks {
  onSteerAxis?: (axis: number) => void;
  onCursorMove?: (pos: VirtualCursorPosition) => void;
  onTapAction?: () => void;
  onModeChange?: (mode: MobileControlMode) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Pure joystick vector calculation:
 * - Radially clamps pixel displacement to `maxRadius`
 * - Applies normalized circular deadzone with smooth rescaling from [deadzone, 1] -> [0, 1]
 * - Shapes magnitude by `responseCurve` for fine precision near neutral and snappy full-throw steering
 */
export function computeJoystickVector(
  dx: number,
  dy: number,
  maxRadius: number,
  deadzone: number = DEFAULT_MOBILE_CONTROLLER_CONFIG.deadzone,
  responseCurve: number = DEFAULT_MOBILE_CONTROLLER_CONFIG.responseCurve,
): JoystickVectorResult {
  const safeRadius = Math.max(1, maxRadius);
  const safeDeadzone = clamp(deadzone, 0, 0.9);
  const safeCurve = Math.max(0.25, responseCurve);

  const dist = Math.hypot(dx, dy);
  if (dist <= 1e-6) {
    return {
      rawX: 0,
      rawY: 0,
      normX: 0,
      normY: 0,
      axisX: 0,
      axisY: 0,
      magnitude: 0,
      engaged: false,
    };
  }

  const clampedDist = Math.min(safeRadius, dist);
  const ux = dx / dist;
  const uy = dy / dist;
  const rawX = ux * clampedDist;
  const rawY = uy * clampedDist;
  const normX = rawX / safeRadius;
  const normY = rawY / safeRadius;
  const rawMag = clampedDist / safeRadius;

  if (rawMag <= safeDeadzone) {
    return {
      rawX,
      rawY,
      normX,
      normY,
      axisX: 0,
      axisY: 0,
      magnitude: 0,
      engaged: false,
    };
  }

  const rescaled = clamp((rawMag - safeDeadzone) / (1 - safeDeadzone), 0, 1);
  const curvedMag = Math.pow(rescaled, safeCurve);

  return {
    rawX,
    rawY,
    normX,
    normY,
    axisX: ux * curvedMag,
    axisY: uy * curvedMag,
    magnitude: curvedMag,
    engaged: true,
  };
}

/**
 * Clamp a virtual cursor coordinate inside the current viewport margins.
 */
export function clampCursorToViewport(
  pos: VirtualCursorPosition,
  viewportWidth: number,
  viewportHeight: number,
  marginPx: number = DEFAULT_MOBILE_CONTROLLER_CONFIG.cursorMarginPx,
): VirtualCursorPosition {
  const safeMargin = Math.max(0, marginPx);
  const maxX = Math.max(safeMargin, viewportWidth - safeMargin);
  const maxY = Math.max(safeMargin, viewportHeight - safeMargin);
  return {
    x: clamp(pos.x, safeMargin, maxX),
    y: clamp(pos.y, safeMargin, maxY),
  };
}

/**
 * Integrate one frame of relative joystick cursor motion using clamped delta time.
 */
export function stepJoystickCursorPosition(
  current: VirtualCursorPosition,
  axisX: number,
  axisY: number,
  dtSeconds: number,
  viewportWidth: number,
  viewportHeight: number,
  maxSpeedPxPerSec: number = DEFAULT_MOBILE_CONTROLLER_CONFIG.cursorMaxSpeedPxPerSec,
  marginPx: number = DEFAULT_MOBILE_CONTROLLER_CONFIG.cursorMarginPx,
): VirtualCursorPosition {
  const dt = clamp(Number.isFinite(dtSeconds) ? dtSeconds : 0, 0, 0.05);
  if (dt <= 0 || (axisX === 0 && axisY === 0)) {
    return clampCursorToViewport(current, viewportWidth, viewportHeight, marginPx);
  }
  const speed = Math.max(0, maxSpeedPxPerSec);
  return clampCursorToViewport(
    {
      x: current.x + axisX * speed * dt,
      y: current.y + axisY * speed * dt,
    },
    viewportWidth,
    viewportHeight,
    marginPx,
  );
}

/**
 * Map normalized pad coordinates [-1, 1] directly to absolute viewport coordinates.
 */
export function computeAbsoluteCursorPosition(
  normX: number,
  normY: number,
  viewportWidth: number,
  viewportHeight: number,
  marginPx: number = DEFAULT_MOBILE_CONTROLLER_CONFIG.cursorMarginPx,
): VirtualCursorPosition {
  const safeMargin = Math.max(0, marginPx);
  const usableW = Math.max(0, viewportWidth - safeMargin * 2);
  const usableH = Math.max(0, viewportHeight - safeMargin * 2);
  const tx = (clamp(normX, -1, 1) + 1) * 0.5;
  const ty = (clamp(normY, -1, 1) + 1) * 0.5;
  return {
    x: safeMargin + tx * usableW,
    y: safeMargin + ty * usableH,
  };
}

export function loadSavedMobileControlMode(
  fallback: MobileControlMode = 'joystick',
): MobileControlMode {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const raw = window.localStorage.getItem(MOBILE_CONTROL_MODE_STORAGE_KEY);
    if (raw === 'joystick' || raw === 'absolute') {
      return raw;
    }
  } catch {
    // Ignore storage read failures in private/restricted webviews
  }
  return fallback;
}

export function saveMobileControlMode(mode: MobileControlMode): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(MOBILE_CONTROL_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage write failures
  }
}

/**
 * DOM controller binding a mobile touch pad + puck + virtual cursor with
 * selectable 'joystick' (relative stick) and 'absolute' positioning modes.
 */
export class MobileVirtualCursorController {
  private readonly padEl: HTMLElement;
  private readonly puckEl: HTMLElement;
  private readonly cursorEl: HTMLElement | null;
  private readonly labelEl: HTMLElement | null;
  private readonly callbacks: MobileControllerCallbacks;
  private readonly config: MobileControllerConfig;

  private active = false;
  private activePointerId = -1;
  private originX = 0;
  private originY = 0;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private totalMovedPx = 0;
  private pressStartMs = 0;

  private axisX = 0;
  private axisY = 0;
  private magnitude = 0;

  private cursorX: number;
  private cursorY: number;

  private rafId = 0;
  private lastFrameMs = 0;
  private disposed = false;

  constructor(
    elements: MobileControllerElements,
    callbacks: MobileControllerCallbacks = {},
    config: Partial<MobileControllerConfig> = {},
    initialCursor?: VirtualCursorPosition,
  ) {
    this.padEl = elements.padEl;
    this.puckEl = elements.puckEl;
    this.cursorEl = elements.cursorEl ?? null;
    this.labelEl = elements.labelEl ?? null;
    this.callbacks = callbacks;
    this.config = {
      ...DEFAULT_MOBILE_CONTROLLER_CONFIG,
      ...config,
    };

    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 720;
    this.cursorX = initialCursor?.x ?? vw * 0.5;
    this.cursorY = initialCursor?.y ?? vh * 0.42;

    this.applyModeAttributes();
    this.attachListeners();
  }

  public getMode(): MobileControlMode {
    return this.config.mode;
  }

  public setMode(mode: MobileControlMode, persist = true): void {
    if (this.config.mode === mode) {
      this.applyModeAttributes();
      return;
    }
    this.reset();
    this.config.mode = mode;
    if (persist) {
      saveMobileControlMode(mode);
    }
    this.applyModeAttributes();
    this.callbacks.onModeChange?.(mode);
  }

  public toggleMode(persist = true): MobileControlMode {
    const next: MobileControlMode = this.config.mode === 'joystick' ? 'absolute' : 'joystick';
    this.setMode(next, persist);
    return next;
  }

  public getCursorPosition(): VirtualCursorPosition {
    return { x: this.cursorX, y: this.cursorY };
  }

  public setCursorPosition(x: number, y: number): void {
    const { vw, vh } = this.getViewportSize();
    const clamped = clampCursorToViewport({ x, y }, vw, vh, this.config.cursorMarginPx);
    this.cursorX = clamped.x;
    this.cursorY = clamped.y;
    this.callbacks.onCursorMove?.({ x: this.cursorX, y: this.cursorY });
  }

  public syncToViewport(): void {
    this.setCursorPosition(this.cursorX, this.cursorY);
  }

  public getStickState(): MobileStickSnapshot {
    return {
      active: this.active,
      mode: this.config.mode,
      axisX: this.axisX,
      axisY: this.axisY,
      magnitude: this.magnitude,
      cursorX: this.cursorX,
      cursorY: this.cursorY,
    };
  }

  /**
   * Release any active stick interaction, recenter the visual puck, stop the
   * joystick integration loop, and zero steering output.
   */
  public reset(): void {
    const wasActive = this.active || this.axisX !== 0 || this.axisY !== 0;
    this.active = false;
    this.activePointerId = -1;
    this.axisX = 0;
    this.axisY = 0;
    this.magnitude = 0;
    this.stopJoystickLoop();
    this.padEl.classList.remove('is-dragging');
    this.cursorEl?.classList.remove('is-gliding');
    this.puckEl.style.transform = 'translate3d(0px, 0px, 0)';
    if (wasActive) {
      this.callbacks.onSteerAxis?.(0);
    }
  }

  public destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.reset();
    this.padEl.removeEventListener('pointerdown', this.handlePointerDown);
    this.padEl.removeEventListener('pointermove', this.handlePointerMove);
    this.padEl.removeEventListener('pointerup', this.handlePointerEnd);
    this.padEl.removeEventListener('pointercancel', this.handlePointerEnd);
    this.padEl.removeEventListener('lostpointercapture', this.handleLostCapture);
  }

  private getViewportSize(): { vw: number; vh: number } {
    if (typeof window === 'undefined') {
      return { vw: 1280, vh: 720 };
    }
    return {
      vw: Math.max(1, window.innerWidth),
      vh: Math.max(1, window.innerHeight),
    };
  }

  private applyModeAttributes(): void {
    this.padEl.dataset.controlMode = this.config.mode;
    this.padEl.setAttribute(
      'aria-label',
      this.config.mode === 'joystick'
        ? 'Virtual Relative Joystick and Steering Stick'
        : 'Virtual Cursor Absolute Positioning Pad',
    );
    if (this.cursorEl) {
      this.cursorEl.dataset.controlMode = this.config.mode;
    }
    if (this.labelEl) {
      this.labelEl.textContent =
        this.config.mode === 'joystick' ? 'JOYSTICK' : 'ABSOLUTE PAD';
    }
  }

  private attachListeners(): void {
    this.padEl.addEventListener('pointerdown', this.handlePointerDown);
    this.padEl.addEventListener('pointermove', this.handlePointerMove);
    this.padEl.addEventListener('pointerup', this.handlePointerEnd);
    this.padEl.addEventListener('pointercancel', this.handlePointerEnd);
    this.padEl.addEventListener('lostpointercapture', this.handleLostCapture);
  }

  private getPadMetrics(): { cx: number; cy: number; maxRadius: number } {
    const rect = this.padEl.getBoundingClientRect();
    return {
      cx: rect.left + rect.width * 0.5,
      cy: rect.top + rect.height * 0.5,
      maxRadius: Math.max(24, rect.width * 0.38),
    };
  }

  private readonly handlePointerDown = (e: PointerEvent): void => {
    if (this.disposed) return;
    e.stopPropagation();
    const { cx, cy } = this.getPadMetrics();

    this.active = true;
    this.activePointerId = e.pointerId;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.totalMovedPx = 0;
    this.pressStartMs = performance.now();

    if (this.config.mode === 'joystick' && this.config.dynamicOrigin) {
      // Anchor floating stick origin at initial touch point so thumb-down never jumps.
      this.originX = e.clientX;
      this.originY = e.clientY;
    } else {
      this.originX = cx;
      this.originY = cy;
    }

    this.padEl.classList.add('is-dragging');
    try {
      this.padEl.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic or unsupported pointer capture environments can safely ignore.
    }

    if (this.config.mode === 'joystick') {
      this.cursorEl?.classList.add('is-gliding');
      this.updateJoystickFromPointer(e.clientX, e.clientY);
      this.startJoystickLoop();
    } else {
      this.updateAbsoluteFromPointer(e.clientX, e.clientY);
    }
  };

  private readonly handlePointerMove = (e: PointerEvent): void => {
    if (!this.active || e.pointerId !== this.activePointerId) return;
    e.stopPropagation();
    this.totalMovedPx += Math.hypot(
      e.clientX - this.lastPointerX,
      e.clientY - this.lastPointerY,
    );
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    if (this.config.mode === 'joystick') {
      this.updateJoystickFromPointer(e.clientX, e.clientY);
    } else {
      this.updateAbsoluteFromPointer(e.clientX, e.clientY);
    }
  };

  private readonly handlePointerEnd = (e: PointerEvent): void => {
    if (!this.active || e.pointerId !== this.activePointerId) return;
    const elapsedMs = performance.now() - this.pressStartMs;
    const wasTap =
      this.totalMovedPx < this.config.tapMoveThresholdPx &&
      elapsedMs <= this.config.tapMaxDurationMs;

    this.reset();

    if (wasTap) {
      this.callbacks.onTapAction?.();
    }
  };

  private readonly handleLostCapture = (e: PointerEvent): void => {
    if (!this.active || e.pointerId !== this.activePointerId) return;
    this.reset();
  };

  private updateJoystickFromPointer(clientX: number, clientY: number): void {
    const { maxRadius } = this.getPadMetrics();
    const dx = clientX - this.originX;
    const dy = clientY - this.originY;
    const vec = computeJoystickVector(
      dx,
      dy,
      maxRadius,
      this.config.deadzone,
      this.config.responseCurve,
    );

    this.axisX = vec.axisX;
    this.axisY = vec.axisY;
    this.magnitude = vec.magnitude;

    this.puckEl.style.transform = `translate3d(${vec.rawX.toFixed(1)}px, ${vec.rawY.toFixed(1)}px, 0)`;
    this.callbacks.onSteerAxis?.(vec.axisX === 0 ? 0 : -vec.axisX);
  }

  private updateAbsoluteFromPointer(clientX: number, clientY: number): void {
    const { cx, cy, maxRadius } = this.getPadMetrics();
    const vec = computeJoystickVector(clientX - cx, clientY - cy, maxRadius, 0, 1);

    this.axisX = vec.normX;
    this.axisY = vec.normY;
    this.magnitude = Math.hypot(vec.normX, vec.normY);

    this.puckEl.style.transform = `translate3d(${vec.rawX.toFixed(1)}px, ${vec.rawY.toFixed(1)}px, 0)`;
    this.callbacks.onSteerAxis?.(vec.normX === 0 ? 0 : -vec.normX);

    const { vw, vh } = this.getViewportSize();
    const nextPos = computeAbsoluteCursorPosition(
      vec.normX,
      vec.normY,
      vw,
      vh,
      this.config.cursorMarginPx,
    );
    this.cursorX = nextPos.x;
    this.cursorY = nextPos.y;
    this.callbacks.onCursorMove?.(nextPos);
  }

  private startJoystickLoop(): void {
    if (this.rafId !== 0 || typeof window === 'undefined') return;
    this.lastFrameMs = performance.now();
    this.rafId = window.requestAnimationFrame(this.tickJoystickLoop);
  }

  private stopJoystickLoop(): void {
    if (this.rafId !== 0 && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.rafId);
    }
    this.rafId = 0;
  }

  private readonly tickJoystickLoop = (nowMs: number): void => {
    this.rafId = 0;
    if (!this.active || this.config.mode !== 'joystick' || this.disposed) return;

    const dtSec = (nowMs - this.lastFrameMs) * 0.001;
    this.lastFrameMs = nowMs;

    if (this.axisX !== 0 || this.axisY !== 0) {
      const { vw, vh } = this.getViewportSize();
      const nextPos = stepJoystickCursorPosition(
        { x: this.cursorX, y: this.cursorY },
        this.axisX,
        this.axisY,
        dtSec,
        vw,
        vh,
        this.config.cursorMaxSpeedPxPerSec,
        this.config.cursorMarginPx,
      );
      if (nextPos.x !== this.cursorX || nextPos.y !== this.cursorY) {
        this.cursorX = nextPos.x;
        this.cursorY = nextPos.y;
        this.callbacks.onCursorMove?.(nextPos);
      }
    }

    this.rafId = window.requestAnimationFrame(this.tickJoystickLoop);
  };
}
