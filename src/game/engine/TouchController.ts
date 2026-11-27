export interface TouchInputState {
  moveX: number;
  moveY: number;
  isBoosting: boolean;
  isAttacking: boolean;
  isBlocking: boolean;
}

export class MobileTouchController {
  private container: HTMLElement;
  private joystickBase: HTMLElement | null = null;
  private joystickKnob: HTMLElement | null = null;
  private actionDock: HTMLElement | null = null;
  private touchState: TouchInputState = {
    moveX: 0,
    moveY: 0,
    isBoosting: false,
    isAttacking: false,
    isBlocking: false,
  };
  private activeTouchId: number | null = null;
  private originX = 0;
  private originY = 0;
  private maxRadius = 55;
  private listenersAttached = false;
  private onInputChanged?: (state: TouchInputState) => void;

  constructor(parentContainer: HTMLElement, onInputChanged?: (state: TouchInputState) => void) {
    this.container = parentContainer;
    this.onInputChanged = onInputChanged;
    this.buildUi();
    this.attachListeners();
  }

  private buildUi(): void {
    // Avoid duplicate injection
    if (this.container.querySelector('.mobile-touch-rig')) return;

    const rig = document.createElement('div');
    rig.className = 'mobile-touch-rig fixed inset-0 pointer-events-none z-50 flex justify-between items-end p-5 md:hidden';

    // Virtual Joystick Area (Bottom-Left)
    const joystickArea = document.createElement('div');
    joystickArea.className = 'relative w-36 h-36 pointer-events-auto flex items-center justify-center bg-black/20 rounded-full backdrop-blur-xs border border-white/10 touch-none';
    
    const knob = document.createElement('div');
    knob.className = 'absolute w-14 h-14 bg-emerald-500/80 rounded-full shadow-lg border border-white/30 transition-transform duration-75';
    knob.style.transform = 'translate(0px, 0px)';
    joystickArea.appendChild(knob);

    this.joystickBase = joystickArea;
    this.joystickKnob = knob;

    // Action Buttons Area (Bottom-Right)
    const actionArea = document.createElement('div');
    actionArea.className = 'pointer-events-auto flex gap-3 items-center';

    const createBtn = (label: string, className: string, onClick: () => void) => {
      const btn = document.createElement('button');
      btn.className = `w-14 h-14 rounded-full font-bold text-white shadow-xl flex items-center justify-center active:scale-95 transition-transform ${className}`;
      btn.innerText = label;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        onClick();
      });
      actionArea.appendChild(btn);
      return btn;
    };

    createBtn('⚔️', 'bg-red-600/80 border border-red-400/40', () => {
      this.touchState.isAttacking = true;
      this.notify();
      setTimeout(() => {
        this.touchState.isAttacking = false;
        this.notify();
      }, 250);
    });

    createBtn('🛡️', 'bg-blue-600/80 border border-blue-400/40', () => {
      this.touchState.isBlocking = !this.touchState.isBlocking;
      this.notify();
    });

    createBtn('⚡', 'bg-amber-600/80 border border-amber-400/40', () => {
      this.touchState.isBoosting = true;
      this.notify();
      setTimeout(() => {
        this.touchState.isBoosting = false;
        this.notify();
      }, 400);
    });

    rig.appendChild(joystickArea);
    rig.appendChild(actionArea);
    this.container.appendChild(rig);
    this.actionDock = actionArea;
  }

  private attachListeners(): void {
    if (this.listenersAttached || !this.joystickBase) return;
    this.listenersAttached = true;

    const onPointerDown = (e: PointerEvent) => {
      if (this.activeTouchId !== null) return;
      const rect = this.joystickBase!.getBoundingClientRect();
      this.originX = rect.left + rect.width / 2;
      this.originY = rect.top + rect.height / 2;
      this.activeTouchId = e.pointerId;
      this.updateJoystick(e.clientX, e.clientY);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== this.activeTouchId) return;
      this.updateJoystick(e.clientX, e.clientY);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId !== this.activeTouchId) return;
      this.activeTouchId = null;
      this.touchState.moveX = 0;
      this.touchState.moveY = 0;
      if (this.joystickKnob) {
        this.joystickKnob.style.transform = 'translate(0px, 0px)';
      }
      this.notify();
    };

    this.joystickBase.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  private updateJoystick(clientX: number, clientY: number): void {
    const dx = clientX - this.originX;
    const dy = clientY - this.originY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, this.maxRadius);
    const angle = Math.atan2(dy, dx);

    const nx = Math.cos(angle) * clampedDist;
    const ny = Math.sin(angle) * clampedDist;

    if (this.joystickKnob) {
      this.joystickKnob.style.transform = `translate(${nx}px, ${ny}px)`;
    }

    // Deadzone filter to prevent accidental jitter/flick
    const deadzone = 8;
    if (dist < deadzone) {
      this.touchState.moveX = 0;
      this.touchState.moveY = 0;
    } else {
      this.touchState.moveX = nx / this.maxRadius;
      // Invert Y for standard 3D cartesian coordinates where up is negative screen Y
      this.touchState.moveY = -ny / this.maxRadius;
    }
    this.notify();
  }

  private notify(): void {
    if (this.onInputChanged) {
      this.onInputChanged({ ...this.touchState });
    }
  }

  public getState(): TouchInputState {
    return { ...this.touchState };
  }

  public destroy(): void {
    const rig = this.container.querySelector('.mobile-touch-rig');
    if (rig) rig.remove();
    this.listenersAttached = false;
  }
}
