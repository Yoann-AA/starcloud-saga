// Typed event bus — the ONLY channel audio/fx/overlays may listen to
// (engine-api.md §"Behavior contract").

export interface GameEventMap {
  coin: undefined;
  oneUp: undefined;
  score: { n: number };
  stomp: { x: number; y: number };
  brickBreak: { x: number; y: number };
  powerupSpawn: { kind: string; x: number; y: number };
  powerupCollect: { kind: string };
  shoot: undefined;
  damage: undefined;
  death: undefined;
  checkpoint: { x: number; y: number };
  flagGrab: { height01: number };
  bossDown: undefined;
  levelComplete: undefined;
  gameOver: undefined;
  pipeEnter: { x: number; y: number };
  spring: { x: number; y: number };
  kickShell: undefined;
  uiClick: undefined;
  uiHover: undefined;
  pause: { paused: boolean };
}

export type GameEventType = keyof GameEventMap;

type Handler<T> = (payload: T) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlers = new Map<GameEventType, Set<Handler<any>>>();

/** Subscribe to an event. Returns an unsubscribe function. */
export function on<T extends GameEventType>(
  type: T,
  handler: Handler<GameEventMap[T]>,
): () => void {
  let set = handlers.get(type);
  if (!set) {
    set = new Set();
    handlers.set(type, set);
  }
  set.add(handler);
  return () => {
    set.delete(handler);
  };
}

/** Emit an event to all subscribers. */
export function emit<T extends GameEventType>(type: T, payload: GameEventMap[T]): void {
  const set = handlers.get(type);
  if (!set) return;
  for (const handler of set) handler(payload);
}

/** Remove every subscription (used on level unload / tests). */
export function clearAllListeners(): void {
  handlers.clear();
}
