'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

/* ── 丝网印刷机模型 ── */
function ScreenPressMachine() {
  const groupRef = useRef<THREE.Group>(null);
  const armRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
    if (armRef.current) {
      armRef.current.position.y = 0.3 + Math.sin(performance.now() * 0.001) * 0.08;
    }
  });

  const glowMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#22d3ee',
        emissive: '#06b6d4',
        emissiveIntensity: 0.6,
        metalness: 0.8,
        roughness: 0.2,
      }),
    []
  );

  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1e3a5f',
        metalness: 0.9,
        roughness: 0.15,
      }),
    []
  );

  const accentMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#FF6B35',
        emissive: '#FF6B35',
        emissiveIntensity: 0.4,
        metalness: 0.7,
        roughness: 0.3,
      }),
    []
  );

  const screenMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#22d3ee',
        transparent: true,
        opacity: 0.25,
        emissive: '#22d3ee',
        emissiveIntensity: 0.3,
        side: THREE.DoubleSide,
      }),
    []
  );

  return (
    <group ref={groupRef} position={[0, -0.3, 0]}>
      {/* 底座 */}
      <mesh material={bodyMat} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.25, 1.6]} />
      </mesh>
      {/* 底座发光边缘 */}
      <mesh position={[0, 0.13, 0]}>
        <boxGeometry args={[2.24, 0.02, 1.64]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.2} />
      </mesh>

      {/* 左右立柱 */}
      <mesh material={bodyMat} position={[-1.0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.2, 1.4, 0.2]} />
      </mesh>
      <mesh material={bodyMat} position={[1.0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.2, 1.4, 0.2]} />
      </mesh>
      {/* 立柱发光条 */}
      <mesh position={[-1.0, 0.7, 0.11]}>
        <boxGeometry args={[0.03, 1.3, 0.02]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[1.0, 0.7, 0.11]}>
        <boxGeometry args={[0.03, 1.3, 0.02]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.5} />
      </mesh>

      {/* 顶部横梁 */}
      <mesh material={bodyMat} position={[0, 1.45, 0]} castShadow>
        <boxGeometry args={[2.2, 0.18, 0.5]} />
      </mesh>
      <mesh position={[0, 1.5, 0.26]}>
        <boxGeometry args={[2.0, 0.02, 0.02]} />
        <meshStandardMaterial color="#FF6B35" emissive="#FF6B35" emissiveIntensity={1.2} />
      </mesh>

      {/* 印刷臂（上下浮动） */}
      <group ref={armRef} position={[0, 0.3, 0]}>
        <mesh material={glowMat} position={[0, 0, 0]} castShadow>
          <boxGeometry args={[1.8, 0.15, 0.35]} />
        </mesh>
        {/* 刮刀 */}
        <mesh material={accentMat} position={[0, -0.2, 0.05]}>
          <boxGeometry args={[1.6, 0.05, 0.08]} />
        </mesh>
        {/* 刮刀发光 */}
        <mesh position={[0, -0.24, 0.05]}>
          <boxGeometry args={[1.62, 0.01, 0.1]} />
          <meshStandardMaterial color="#FF6B35" emissive="#FF6B35" emissiveIntensity={2} />
        </mesh>
      </group>

      {/* 丝网网版（半透明发光面） */}
      <mesh material={screenMat} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.8, 1.2]} />
      </mesh>

      {/* 网版框架 */}
      <mesh material={bodyMat} position={[-0.95, 0.05, 0]}>
        <boxGeometry args={[0.1, 0.05, 1.2]} />
      </mesh>
      <mesh material={bodyMat} position={[0.95, 0.05, 0]}>
        <boxGeometry args={[0.1, 0.05, 1.2]} />
      </mesh>

      {/* 控制面板 */}
      <mesh material={bodyMat} position={[0, 0.2, -0.85]} castShadow>
        <boxGeometry args={[0.6, 0.4, 0.1]} />
      </mesh>
      {/* 控制面板屏幕 */}
      <mesh position={[0, 0.2, -0.79]}>
        <planeGeometry args={[0.45, 0.28]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.8} />
      </mesh>

      {/* 能量光环 */}
      <mesh position={[0, 0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.3, 1.35, 64]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.8} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.53, 64]} />
        <meshStandardMaterial color="#FF6B35" emissive="#FF6B35" emissiveIntensity={0.5} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ── 环绕粒子 ── */
function DataParticles() {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const count = 80;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 1.8 + Math.random() * 0.8;
      const height = (Math.random() - 0.5) * 2;
      arr[i * 3] = Math.cos(angle) * radius;
      arr[i * 3 + 1] = height;
      arr[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.2;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#22d3ee"
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ── 导出组件 ── */
export default function ScreenPrinter3D() {
  return (
    <Canvas
      camera={{ position: [3, 2, 3.5], fov: 45 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.3} />
      <spotLight position={[5, 5, 5]} angle={0.3} penumbra={1} intensity={1.5} color="#22d3ee" />
      <spotLight position={[-5, 3, -2]} angle={0.3} penumbra={1} intensity={0.8} color="#FF6B35" />
      <pointLight position={[0, 2, 0]} intensity={0.5} color="#22d3ee" />

      <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.15}>
        <ScreenPressMachine />
      </Float>

      <DataParticles />

      <ContactShadows
        position={[0, -1.2, 0]}
        opacity={0.4}
        scale={6}
        blur={2.5}
        far={4}
        color="#22d3ee"
      />

      <Environment preset="night" />
    </Canvas>
  );
}
