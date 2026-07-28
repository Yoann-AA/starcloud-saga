import type { InputState } from './types';

/**
 * Shared mutable input state. Keyboard listeners (Game.tsx) and touch buttons
 * write here; the sim loop reads it each fixed step. Module-level so the
 * 120 Hz loop never goes through React state.
 */
export const inputState: InputState = {
  left: false,
  right: false,
  jump: false,
  run: false,
  down: false,
  shoot: false,
};

/** Extra one-shot actions (pause, mute) are handled by Game.tsx directly. */

const KEYMAP: Record<string, keyof InputState> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  Space: 'jump',
  KeyZ: 'jump',
  KeyX: 'shoot',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  ArrowDown: 'down',
  KeyS: 'down',
};

/** Returns a cleanup function. */
export function bindKeyboard(): () => void {
  const down = (e: KeyboardEvent) => {
    const key = KEYMAP[e.code];
    if (!key) return;
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    inputState[key] = true;
  };
  const up = (e: KeyboardEvent) => {
    const key = KEYMAP[e.code];
    if (!key) return;
    inputState[key] = false;
  };
  const blur = () => resetInput();
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', blur);
  };
}

export function resetInput(): void {
  inputState.left = false;
  inputState.right = false;
  inputState.jump = false;
  inputState.run = false;
  inputState.down = false;
  inputState.shoot = false;
}

/** Touch buttons call these. */
export function setTouchInput(key: keyof InputState, value: boolean): void {
  inputState[key] = value;
}
