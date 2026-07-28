import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { MutableRefObject } from 'react';
import type { PlayerSim } from './player';

function makeStarShape(r: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.45;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

/**
 * Pip — the star-sprite hero. Reads the mutable PlayerSim every frame and
 * poses the mesh (position, facing flip, squash & stretch, death spin).
 * All gameplay logic lives in player.ts; this is presentation only.
 */
export default function PlayerController({
  sim,
}: {
  sim: MutableRefObject<PlayerSim>;
}) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);

  const mats = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: '#FFF6E8', roughness: 0.55 }),
      star: new THREE.MeshStandardMaterial({
        color: '#FFC93C', emissive: '#E8A50F', emissiveIntensity: 0.35, roughness: 0.4,
      }),
      cape: new THREE.MeshStandardMaterial({ color: '#FF6B35', roughness: 0.7, side: THREE.DoubleSide }),
      eye: new THREE.MeshStandardMaterial({ color: '#1B1233', roughness: 0.3 }),
    }),
    [],
  );
  const starGeo = useMemo(() => new THREE.ShapeGeometry(makeStarShape(0.16)), []);

  useFrame(() => {
    const p = sim.current;
    const g = group.current;
    if (!g) return;

    g.position.set(p.x + p.w / 2, p.y + p.h / 2, 0);
    g.rotation.y = p.facing === -1 ? Math.PI : 0;
    // grown forms scale the whole sprite (meshes are authored at small size)
    g.scale.setScalar(p.h / 0.8);

    // squash & stretch: stretch while rising, squash on landing run
    if (body.current) {
      const stretch = THREE.MathUtils.clamp(Math.abs(p.vy) * 0.018, 0, 0.28);
      const sy = p.onGround ? 1 : 1 + stretch;
      const sx = p.onGround ? 1 : 1 - stretch * 0.6;
      body.current.scale.set(sx, sy, sx);
      body.current.rotation.z = p.dead ? body.current.rotation.z + 0.2 : 0;
    }

    // comet invincibility flicker
    const flicker = p.invincibleT > 0 && Math.floor(p.invincibleT * 20) % 2 === 0;
    const hurtFlicker = p.hurtT > 0 && Math.floor(p.hurtT * 12) % 2 === 0;
    g.visible = !hurtFlicker;
    mats.skin.emissive.set(flicker ? '#9B7BFF' : '#000000');
    mats.skin.emissiveIntensity = flicker ? 0.8 : 0;
  });

  return (
    <group ref={group}>
      <group ref={body}>
        {/* round cream body */}
        <mesh material={mats.skin} castShadow>
          <sphereGeometry args={[0.34, 18, 14]} />
        </mesh>
        {/* gold star on chest */}
        <mesh geometry={starGeo} material={mats.star} position={[0, 0.02, 0.35]} />
        {/* eyes */}
        <mesh material={mats.eye} position={[0.1, 0.12, 0.3]}>
          <sphereGeometry args={[0.05, 8, 6]} />
        </mesh>
        <mesh material={mats.eye} position={[-0.06, 0.12, 0.32]}>
          <sphereGeometry args={[0.04, 8, 6]} />
        </mesh>
        {/* tiny cape */}
        <mesh material={mats.cape} position={[-0.28, -0.05, -0.05]} rotation={[0.2, 0.5, 0.3]}>
          <planeGeometry args={[0.36, 0.42]} />
        </mesh>
        {/* feet */}
        <mesh material={mats.star} position={[0.14, -0.36, 0.05]}>
          <sphereGeometry args={[0.09, 8, 6]} />
        </mesh>
        <mesh material={mats.star} position={[-0.14, -0.36, 0.05]}>
          <sphereGeometry args={[0.09, 8, 6]} />
        </mesh>
      </group>
    </group>
  );
}
