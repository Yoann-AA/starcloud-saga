import { useEffect, useMemo, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Instances, Instance } from '@react-three/drei';
import { THEMES } from './constants';
import { isSolidChar } from './physics';
import type { SolidGrid } from './physics';
import type { LevelData, ThemeName } from './types';
import { LEVEL_DATA } from '../levels/index';

/** Load a level by id. Throws if unknown — callers validate ids first. */
export function loadLevel(id: string): LevelData {
  const level = LEVEL_DATA[id];
  if (!level) throw new Error(`Unknown level: ${id}`);
  return level;
}

/**
 * Mutable tile state for a running level. Coins get collected, question
 * blocks get used, bricks break — the visual TileField subscribes to changes.
 * The collision grid reads from the same arrays, so physics stays in sync.
 */
export class LevelRuntime {
  readonly level: LevelData;
  readonly grid: SolidGrid;
  private chars: string[];
  private solid: Uint8Array;
  private listeners = new Set<() => void>();
  version = 0;

  constructor(level: LevelData) {
    this.level = level;
    const { width, height } = level;
    this.chars = new Array<string>(width * height).fill('.');
    this.solid = new Uint8Array(width * height);

    for (let r = 0; r < level.tiles.length && r < height; r++) {
      const row = level.tiles[r];
      const ty = height - 1 - r;
      for (let x = 0; x < width && x < row.length; x++) {
        const ch = row[x];
        this.chars[ty * width + x] = ch;
        if (isSolidChar(ch)) this.solid[ty * width + x] = 1;
      }
    }
    for (const pipe of level.pipes ?? []) {
      const bottom = Math.round(pipe.top - pipe.h);
      for (let x = pipe.x; x < pipe.x + 2; x++) {
        for (let y = bottom; y < pipe.top; y++) {
          if (x >= 0 && x < width && y >= 0 && y < height) this.solid[y * width + x] = 1;
        }
      }
    }

    const chars = this.chars;
    const solidArr = this.solid;
    this.grid = {
      width,
      height,
      isSolid: (tx, ty) => {
        if (tx < 0 || tx >= width) return true;
        if (ty < 0 || ty >= height) return false;
        return solidArr[ty * width + tx] === 1;
      },
      tileAt: (tx, ty) => {
        if (tx < 0 || tx >= width || ty < 0 || ty >= height) return '.';
        return chars[ty * width + tx];
      },
    };
  }

  setTile(tx: number, ty: number, ch: string): void {
    const { width, height } = this.level;
    if (tx < 0 || tx >= width || ty < 0 || ty >= height) return;
    this.chars[ty * width + tx] = ch;
    this.solid[ty * width + tx] = isSolidChar(ch) ? 1 : 0;
    this.bump();
  }

  clearTile(tx: number, ty: number): void {
    this.setTile(tx, ty, '.');
  }

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  getVersion = (): number => this.version;

  private bump(): void {
    this.version++;
    for (const cb of this.listeners) cb();
  }
}

// ---------------------------------------------------------------------------
// TileField — instanced low-poly meshes per theme
// ---------------------------------------------------------------------------

interface TileBuckets {
  ground: Array<[number, number]>;
  brick: Array<[number, number]>;
  question: Array<[number, number]>;
  used: Array<[number, number]>;
  coin: Array<[number, number]>;
  lava: Array<[number, number]>;
  spring: Array<[number, number]>;
  checkpoint: Array<[number, number]>;
  fence: Array<[number, number]>;
  axe: Array<[number, number]>;
}

function bucketize(runtime: LevelRuntime): TileBuckets {
  const b: TileBuckets = {
    ground: [], brick: [], question: [], used: [], coin: [],
    lava: [], spring: [], checkpoint: [], fence: [], axe: [],
  };
  const { width, height } = runtime.level;
  for (let ty = 0; ty < height; ty++) {
    for (let tx = 0; tx < width; tx++) {
      const ch = runtime.grid.tileAt(tx, ty);
      const pos: [number, number] = [tx + 0.5, ty + 0.5];
      switch (ch) {
        case '#': b.ground.push(pos); break;
        case 'B': b.brick.push(pos); break;
        case '?': case 'M': case 'F': case 'S': case 'U': b.question.push(pos); break;
        case 'u': b.used.push(pos); break;
        case 'o': b.coin.push(pos); break;
        case '^': b.lava.push(pos); break;
        case 'J': b.spring.push(pos); break;
        case 'C': b.checkpoint.push(pos); break;
        case '|': b.fence.push(pos); break;
        case 'X': b.axe.push(pos); break;
        default: break;
      }
    }
  }
  return b;
}

const QUESTION_MAT = new THREE.MeshStandardMaterial({
  color: '#FFC93C', emissive: '#E8A50F', emissiveIntensity: 0.25, roughness: 0.5,
});
const COIN_MAT = new THREE.MeshStandardMaterial({
  color: '#FFC93C', emissive: '#E8A50F', emissiveIntensity: 0.45, metalness: 0.4, roughness: 0.3,
});
const LAVA_MAT = new THREE.MeshStandardMaterial({
  color: '#FF6B35', emissive: '#FF3B12', emissiveIntensity: 0.9, roughness: 0.7,
});
const LAVA_GEO = new THREE.BoxGeometry(1, 0.6, 1);
const SPRING_GEO = new THREE.CylinderGeometry(0.32, 0.4, 0.5, 10);
const SPRING_MAT = new THREE.MeshStandardMaterial({ color: '#FF5D7E', roughness: 0.5 });
const FENCE_GEO = new THREE.BoxGeometry(0.9, 0.5, 0.15);

/** Rotating coin field — one instanced mesh animated per-frame. */
function CoinsField({ positions }: { positions: Array<[number, number]> }) {
  const count = positions.length;
  const mesh = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 12);
    const m = new THREE.InstancedMesh(geo, COIN_MAT, Math.max(1, count));
    m.frustumCulled = false;
    return m;
  }, [count]);

  useEffect(() => () => mesh.geometry.dispose(), [mesh]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const mat4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < count; i++) {
      const [x, y] = positions[i];
      q.setFromAxisAngle(up, t * 2.4 + i * 0.35);
      mat4.compose(
        new THREE.Vector3(x, y + Math.sin(t * 2 + i) * 0.05, 0),
        q,
        new THREE.Vector3(1, 1, 1),
      );
      mesh.setMatrixAt(i, mat4);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <primitive object={mesh} />;
}

/** Lava tiles — pulsing emissive. */
function LavaField({ positions }: { positions: Array<[number, number]> }) {
  useFrame(({ clock }) => {
    LAVA_MAT.emissiveIntensity = 0.7 + Math.sin(clock.elapsedTime * 3.2) * 0.3;
  });
  return (
    <Instances limit={positions.length} geometry={LAVA_GEO} material={LAVA_MAT} frustumCulled={false}>
      {positions.map(([x, y], i) => (
        <Instance key={i} position={[x, y - 0.2, 0]} />
      ))}
    </Instances>
  );
}

/** The whole tile layer for a level. Re-buckets when the runtime version changes. */
export function TileField({ runtime }: { runtime: LevelRuntime }) {
  const version = useSyncExternalStore(runtime.subscribe, runtime.getVersion);
  const theme = THEMES[runtime.level.theme];
  const buckets = useMemo(() => bucketize(runtime), [runtime, version]);

  const groundMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: theme.ground, roughness: 0.85 }),
    [theme],
  );
  const brickMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: theme.brick, roughness: 0.8 }),
    [theme],
  );
  const usedMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: theme.groundDark, roughness: 0.9 }),
    [theme],
  );
  const pipeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: theme.pipe, roughness: 0.6 }),
    [theme],
  );
  const fenceMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: theme.dirt, roughness: 0.9 }),
    [theme],
  );
  const unitBox = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const { level } = runtime;

  return (
    <group>
      {/* solid ground */}
      <Instances limit={Math.max(1, buckets.ground.length)} geometry={unitBox} material={groundMat} frustumCulled={false}>
        {buckets.ground.map(([x, y], i) => (
          <Instance key={i} position={[x, y, 0]} />
        ))}
      </Instances>
      {/* bricks */}
      <Instances limit={Math.max(1, buckets.brick.length)} geometry={unitBox} material={brickMat} frustumCulled={false}>
        {buckets.brick.map(([x, y], i) => (
          <Instance key={i} position={[x, y, 0]} scale={[1, 0.96, 0.96]} />
        ))}
      </Instances>
      {/* question / item blocks */}
      <Instances limit={Math.max(1, buckets.question.length)} geometry={unitBox} material={QUESTION_MAT} frustumCulled={false}>
        {buckets.question.map(([x, y], i) => (
          <Instance key={i} position={[x, y, 0]} scale={[0.96, 0.96, 0.96]} />
        ))}
      </Instances>
      {/* used blocks */}
      <Instances limit={Math.max(1, buckets.used.length)} geometry={unitBox} material={usedMat} frustumCulled={false}>
        {buckets.used.map(([x, y], i) => (
          <Instance key={i} position={[x, y, 0]} scale={[0.96, 0.96, 0.96]} />
        ))}
      </Instances>
      {buckets.coin.length > 0 && <CoinsField positions={buckets.coin} />}
      {buckets.lava.length > 0 && <LavaField positions={buckets.lava} />}
      {/* springs */}
      <Instances
        limit={Math.max(1, buckets.spring.length)}
        geometry={SPRING_GEO}
        material={SPRING_MAT}
        frustumCulled={false}
      >
        {buckets.spring.map(([x, y], i) => (
          <Instance key={i} position={[x, y - 0.2, 0]} />
        ))}
      </Instances>
      {/* checkpoint mid-flags */}
      {buckets.checkpoint.map(([x, y], i) => (
        <group key={`cp${i}`} position={[x, y, 0]}>
          <mesh material={usedMat}>
            <cylinderGeometry args={[0.06, 0.06, 3, 6]} />
          </mesh>
          <mesh position={[0.35, 1.2, 0]}>
            <boxGeometry args={[0.6, 0.4, 0.05]} />
            <meshStandardMaterial color="#4FC4FF" />
          </mesh>
        </group>
      ))}
      {/* decorative fences */}
      <Instances
        limit={Math.max(1, buckets.fence.length)}
        geometry={FENCE_GEO}
        material={fenceMat}
        frustumCulled={false}
      >
        {buckets.fence.map(([x, y], i) => (
          <Instance key={i} position={[x, y - 0.25, -0.6]} />
        ))}
      </Instances>
      {/* castle axe tile */}
      {buckets.axe.map(([x, y], i) => (
        <group key={`axe${i}`} position={[x, y, 0]}>
          <mesh geometry={unitBox} material={brickMat} />
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[0.15, 0.5, 0.15]} />
            <meshStandardMaterial color="#F2E4CE" />
          </mesh>
          <mesh position={[0.2, 0.9, 0]} rotation={[0, 0, -0.6]}>
            <boxGeometry args={[0.4, 0.28, 0.06]} />
            <meshStandardMaterial color="#C0C8D8" metalness={0.6} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {/* pipes */}
      {level.pipes.map((pipe, i) => (
        <group key={`pipe${i}`} position={[pipe.x + 1, pipe.top - pipe.h / 2, 0]}>
          <mesh material={pipeMat}>
            <boxGeometry args={[1.9, pipe.h, 1.4]} />
          </mesh>
          <mesh position={[0, pipe.h / 2 - 0.15, 0]} material={pipeMat}>
            <boxGeometry args={[2.2, 0.4, 1.6]} />
          </mesh>
        </group>
      ))}
      {/* flagpole + star flag */}
      <group position={[level.flagX, 0, 0]}>
        <mesh position={[0, Math.min(6, level.height - 2) / 2 + 1, 0]}>
          <cylinderGeometry args={[0.08, 0.08, Math.min(6, level.height - 2) + 2, 8]} />
          <meshStandardMaterial color="#F2E4CE" roughness={0.4} />
        </mesh>
        <mesh position={[0, Math.min(6, level.height - 2) + 2.2, 0]}>
          <sphereGeometry args={[0.28, 12, 10]} />
          <meshStandardMaterial color="#FFC93C" emissive="#E8A50F" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[-0.55, Math.min(6, level.height - 2) + 1.3, 0]}>
          <boxGeometry args={[1, 0.65, 0.06]} />
          <meshStandardMaterial color="#FF5D7E" />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// ThemeBackdrop — sky gradient, fog is set by GameCanvas, parallax hill layers
// ---------------------------------------------------------------------------

const SKY_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SKY_FRAG = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  varying vec2 vUv;
  void main() {
    gl_FragColor = vec4(mix(bottomColor, topColor, smoothstep(0.0, 1.0, vUv.y)), 1.0);
  }
`;

export interface ParallaxHandles {
  layers: Array<THREE.Group | null>;
}

/** Low-poly silhouette hills for one parallax layer. */
function HillLayer({
  color,
  width,
  seed,
  size,
  register,
}: {
  color: string;
  width: number;
  seed: number;
  size: number;
  register: (g: THREE.Group | null) => void;
}) {
  const hills = useMemo(() => {
    const rng = mulberry32(seed);
    const out: Array<{ x: number; s: number; h: number }> = [];
    for (let x = -10; x < width + 30; x += 5 + rng() * 5) {
      out.push({ x, s: size * (0.7 + rng() * 0.9), h: size * (0.5 + rng() * 1.1) });
    }
    return out;
  }, [color, width, seed, size]);

  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }),
    [color],
  );

  return (
    <group ref={register}>
      {hills.map((hill, i) => (
        <mesh key={i} position={[hill.x, hill.h / 2 - 1.5, 0]} material={mat}>
          <coneGeometry args={[hill.s, hill.h, 5]} />
        </mesh>
      ))}
    </group>
  );
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sky gradient plane + 3 parallax silhouette layers (z=-8/-16/-28). */
export function ThemeBackdrop({
  theme,
  levelWidth,
  parallax,
}: {
  theme: ThemeName;
  levelWidth: number;
  parallax: ParallaxHandles;
}) {
  const t = THEMES[theme];
  const skyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        uniforms: {
          topColor: { value: new THREE.Color(t.skyTop) },
          bottomColor: { value: new THREE.Color(t.skyBottom) },
        },
        depthWrite: false,
      }),
    [t],
  );

  return (
    <group>
      {/* huge gradient plane behind everything */}
      <mesh position={[levelWidth / 2, 10, -60]} material={skyMat}>
        <planeGeometry args={[Math.max(400, levelWidth * 2.5), 120]} />
      </mesh>
      {/* parallax silhouettes at z = -8 / -16 / -28 */}
      <group position={[0, 0, -8]}>
        <HillLayer
          color={t.hillNear}
          width={levelWidth}
          seed={7}
          size={3.2}
          register={(g) => { parallax.layers[0] = g; }}
        />
      </group>
      <group position={[0, 0, -16]}>
        <HillLayer
          color={t.hillNear}
          width={levelWidth}
          seed={42}
          size={5}
          register={(g) => { parallax.layers[1] = g; }}
        />
      </group>
      <group position={[0, 0, -28]}>
        <HillLayer
          color={t.hillFar}
          width={levelWidth}
          seed={99}
          size={8}
          register={(g) => { parallax.layers[2] = g; }}
        />
      </group>
    </group>
  );
}
