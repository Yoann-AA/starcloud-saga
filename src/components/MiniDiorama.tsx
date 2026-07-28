import { useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';

/**
 * Tiny looping autoplay diorama for the home page "How It Plays" section:
 * Pip idling on a low-poly hill, coins rotating, a ? block pulsing.
 * This is the ONLY WebGL scene on the home page (the hero is an image).
 */

function Coin({ position, index }: { position: [number, number, number]; index: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 2 + index * 0.5;
    ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 2 + index) * 0.06;
  });
  return (
    <mesh ref={ref} position={position} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.22, 0.22, 0.06, 12]} />
      <meshStandardMaterial color="#FFC93C" emissive="#E8A50F" emissiveIntensity={0.5} metalness={0.4} roughness={0.3} />
    </mesh>
  );
}

function QuestionBlock() {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!mat.current) return;
    mat.current.emissiveIntensity = 0.25 + (Math.sin(clock.elapsedTime * (Math.PI * 2) / 1.2) + 1) * 0.3;
  });
  return (
    <mesh position={[1.4, 1.1, 0]}>
      <boxGeometry args={[0.7, 0.7, 0.7]} />
      <meshStandardMaterial ref={mat} color="#FFC93C" emissive="#E8A50F" emissiveIntensity={0.3} roughness={0.5} />
    </mesh>
  );
}

function Pip() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = 0.72 + Math.abs(Math.sin(clock.elapsedTime * 2.2)) * 0.18;
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.8) * 0.4;
  });
  return (
    <group ref={ref} position={[0, 0.72, 0.3]}>
      <mesh castShadow>
        <sphereGeometry args={[0.34, 18, 14]} />
        <meshStandardMaterial color="#FFF6E8" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.02, 0.33]}>
        <octahedronGeometry args={[0.13]} />
        <meshStandardMaterial color="#FFC93C" emissive="#E8A50F" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[-0.26, -0.02, -0.08]} rotation={[0.2, 0.5, 0.3]}>
        <planeGeometry args={[0.34, 0.4]} />
        <meshStandardMaterial color="#FF6B35" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export default function MiniDiorama() {
  return (
    <Canvas
      style={{ width: '100%', height: '100%' }}
      camera={{ fov: 40, position: [0, 1.6, 5.2] }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ camera }) => camera.lookAt(0, 0.8, 0)}
    >
      <hemisphereLight args={['#FFF2D9', '#3E9E6E', 1]} />
      <directionalLight position={[-4, 6, 5]} intensity={1.6} color="#FFF2D9" />
      {/* rounded hill */}
      <mesh position={[0, -1.1, 0]} scale={[1.6, 0.8, 1.2]}>
        <sphereGeometry args={[1.6, 24, 16]} />
        <meshStandardMaterial color="#59D99C" roughness={0.9} flatShading />
      </mesh>
      {/* grass top accent */}
      <mesh position={[0, -0.28, 0]} scale={[1.62, 0.3, 1.22]}>
        <sphereGeometry args={[1.6, 24, 12]} />
        <meshStandardMaterial color="#8FE388" roughness={0.9} flatShading />
      </mesh>
      <Pip />
      <Coin position={[-1.3, 1.2, 0]} index={0} />
      <Coin position={[-0.8, 1.55, 0]} index={1} />
      <Coin position={[-0.3, 1.7, 0]} index={2} />
      <QuestionBlock />
      {/* tiny distant pines */}
      <mesh position={[-2, -0.4, -1.4]}>
        <coneGeometry args={[0.5, 1.1, 6]} />
        <meshStandardMaterial color="#3E9E6E" flatShading />
      </mesh>
      <mesh position={[2.2, -0.5, -1.2]}>
        <coneGeometry args={[0.4, 0.9, 6]} />
        <meshStandardMaterial color="#3E9E6E" flatShading />
      </mesh>
    </Canvas>
  );
}
