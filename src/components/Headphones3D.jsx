import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Headphones3D({
  colorway,
  finish = 'matte',
  exploded = false,
  isPulsing = false,
  autoRotate = true,
  rotationSpeed = 0.8,
  reducedMotion = false,
}) {
  const rootGroupRef = useRef();
  const leftEarcupGroupRef = useRef();
  const rightEarcupGroupRef = useRef();
  const leftCushionRef = useRef();
  const rightCushionRef = useRef();
  const leftDriverRef = useRef();
  const rightDriverRef = useRef();
  const pulseRingRef = useRef();

  // Material properties computed from finish preset
  const materialProps = useMemo(() => {
    switch (finish) {
      case 'metallic':
        return {
          roughness: 0.18,
          metalness: 0.85,
          clearcoat: 0.3,
        };
      case 'gloss':
        return {
          roughness: 0.08,
          metalness: 0.15,
          clearcoat: 0.9,
        };
      case 'matte':
      default:
        return {
          roughness: 0.72,
          metalness: 0.1,
          clearcoat: 0.0,
        };
    }
  }, [finish]);

  // Frame update for rotation, smooth exploded lerping, and acoustic pulsing
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // 1. Auto-rotation
    if (rootGroupRef.current && autoRotate && !reducedMotion) {
      rootGroupRef.current.rotation.y += delta * (rotationSpeed * 0.4);
    }

    // 2. Exploded view animation (smooth lerp toward target offset)
    const targetCupOffset = exploded ? 0.75 : 0;
    const targetCushionOffset = exploded ? 0.6 : 0;
    const targetDriverOffset = exploded ? 0.25 : 0;
    const lerpFactor = reducedMotion ? 1 : Math.min(1, delta * 7);

    // Left assemblies (negative X direction)
    if (leftEarcupGroupRef.current) {
      leftEarcupGroupRef.current.position.x = THREE.MathUtils.lerp(
        leftEarcupGroupRef.current.position.x,
        -1.3 - targetCupOffset,
        lerpFactor
      );
    }
    if (leftCushionRef.current) {
      leftCushionRef.current.position.x = THREE.MathUtils.lerp(
        leftCushionRef.current.position.x,
        0.25 + targetCushionOffset,
        lerpFactor
      );
    }
    if (leftDriverRef.current) {
      leftDriverRef.current.position.x = THREE.MathUtils.lerp(
        leftDriverRef.current.position.x,
        targetDriverOffset,
        lerpFactor
      );
    }

    // Right assemblies (positive X direction)
    if (rightEarcupGroupRef.current) {
      rightEarcupGroupRef.current.position.x = THREE.MathUtils.lerp(
        rightEarcupGroupRef.current.position.x,
        1.3 + targetCupOffset,
        lerpFactor
      );
    }
    if (rightCushionRef.current) {
      rightCushionRef.current.position.x = THREE.MathUtils.lerp(
        rightCushionRef.current.position.x,
        -0.25 - targetCushionOffset,
        lerpFactor
      );
    }
    if (rightDriverRef.current) {
      rightDriverRef.current.position.x = THREE.MathUtils.lerp(
        rightDriverRef.current.position.x,
        -targetDriverOffset,
        lerpFactor
      );
    }

    // 3. User-triggered acoustic pulse animation
    if (isPulsing && !reducedMotion) {
      const pulseScale = 1 + Math.sin(time * 16) * 0.045;
      if (leftEarcupGroupRef.current) {
        leftEarcupGroupRef.current.scale.set(pulseScale, pulseScale, pulseScale);
      }
      if (rightEarcupGroupRef.current) {
        rightEarcupGroupRef.current.scale.set(pulseScale, pulseScale, pulseScale);
      }
      if (pulseRingRef.current) {
        pulseRingRef.current.scale.setScalar(1 + (Math.sin(time * 8) + 1) * 0.2);
        pulseRingRef.current.material.opacity = Math.max(0, 0.6 - (Math.sin(time * 8) + 1) * 0.3);
      }
    } else {
      if (leftEarcupGroupRef.current) leftEarcupGroupRef.current.scale.set(1, 1, 1);
      if (rightEarcupGroupRef.current) rightEarcupGroupRef.current.scale.set(1, 1, 1);
    }
  });

  return (
    <group ref={rootGroupRef} position={[0, 0.1, 0]} dispose={null}>
      {/* ─── HEADBAND ASSEMBLY ─── */}
      <group position={[0, 0.4, 0]}>
        {/* Main Arch Band (Torus arc) */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <torusGeometry args={[1.35, 0.08, 16, 40, Math.PI]} />
          <meshStandardMaterial
            color={colorway.body}
            roughness={materialProps.roughness}
            metalness={materialProps.metalness}
          />
        </mesh>

        {/* Headband Outer Protective Spine */}
        <mesh position={[0, 0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[1.39, 0.03, 14, 36, Math.PI * 0.85]} />
          <meshStandardMaterial
            color={colorway.accent}
            roughness={0.25}
            metalness={0.8}
          />
        </mesh>

        {/* Inner Comfort Cushion */}
        <mesh position={[0, -0.06, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <torusGeometry args={[1.27, 0.065, 14, 32, Math.PI * 0.72]} />
          <meshStandardMaterial
            color={colorway.cushion}
            roughness={0.85}
            metalness={0.05}
          />
        </mesh>

        {/* Left Slider Collar & Gimbal Mount */}
        <mesh position={[-1.35, 0, 0]} castShadow>
          <boxGeometry args={[0.18, 0.35, 0.18]} />
          <meshStandardMaterial color={colorway.accent} roughness={0.2} metalness={0.85} />
        </mesh>
        <mesh position={[-1.35, -0.28, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.25, 16]} />
          <meshStandardMaterial color="#333742" roughness={0.3} metalness={0.7} />
        </mesh>

        {/* Right Slider Collar & Gimbal Mount */}
        <mesh position={[1.35, 0, 0]} castShadow>
          <boxGeometry args={[0.18, 0.35, 0.18]} />
          <meshStandardMaterial color={colorway.accent} roughness={0.2} metalness={0.85} />
        </mesh>
        <mesh position={[1.35, -0.28, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.25, 16]} />
          <meshStandardMaterial color="#333742" roughness={0.3} metalness={0.7} />
        </mesh>
      </group>

      {/* ─── LEFT EARCUP ASSEMBLY ─── */}
      <group ref={leftEarcupGroupRef} position={[-1.3, -0.2, 0]}>
        {/* Gimbal Fork */}
        <mesh position={[0.05, 0.1, 0]} rotation={[0, 0, 0.1]}>
          <boxGeometry args={[0.12, 0.25, 0.2]} />
          <meshStandardMaterial color={colorway.accent} roughness={0.2} metalness={0.9} />
        </mesh>

        {/* Outer Cup Shell */}
        <mesh position={[-0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.62, 0.58, 0.35, 32]} />
          <meshStandardMaterial
            color={colorway.body}
            roughness={materialProps.roughness}
            metalness={materialProps.metalness}
          />
        </mesh>

        {/* Outer Metallic Accent Bezel Ring */}
        <mesh position={[-0.24, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.61, 0.03, 16, 32]} />
          <meshStandardMaterial color={colorway.accent} roughness={0.15} metalness={0.9} />
        </mesh>

        {/* Center Logo Faceplate Medallion */}
        <mesh position={[-0.276, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.42, 0.42, 0.02, 28]} />
          <meshStandardMaterial
            color={colorway.accent}
            roughness={0.15}
            metalness={0.95}
          />
        </mesh>

        {/* Left Internal Driver (Acoustic Diaphragm & Magnet - revealed on exploded) */}
        <group ref={leftDriverRef} position={[0, 0, 0]}>
          <mesh position={[0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.48, 0.48, 0.04, 28]} />
            <meshStandardMaterial color="#1f2937" roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[0.072, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.22, 0.22, 0.02, 24]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.25} metalness={0.9} />
          </mesh>
          <mesh position={[0.075, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <ringGeometry args={[0.28, 0.46, 24]} />
            <meshBasicMaterial color="#374151" wireframe={true} />
          </mesh>
        </group>

        {/* Left Memory Foam Ear Cushion */}
        <group ref={leftCushionRef} position={[0.25, 0, 0]}>
          <mesh rotation={[0, Math.PI / 2, 0]} castShadow>
            <torusGeometry args={[0.46, 0.17, 18, 32]} />
            <meshStandardMaterial
              color={colorway.cushion}
              roughness={0.88}
              metalness={0.02}
            />
          </mesh>
          {/* Inner Acoustic Mesh Screen */}
          <mesh position={[0.02, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <circleGeometry args={[0.38, 24]} />
            <meshStandardMaterial
              color="#0d1117"
              roughness={0.95}
              metalness={0.0}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      </group>

      {/* ─── RIGHT EARCUP ASSEMBLY ─── */}
      <group ref={rightEarcupGroupRef} position={[1.3, -0.2, 0]}>
        {/* Gimbal Fork */}
        <mesh position={[-0.05, 0.1, 0]} rotation={[0, 0, -0.1]}>
          <boxGeometry args={[0.12, 0.25, 0.2]} />
          <meshStandardMaterial color={colorway.accent} roughness={0.2} metalness={0.9} />
        </mesh>

        {/* Outer Cup Shell */}
        <mesh position={[0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.58, 0.62, 0.35, 32]} />
          <meshStandardMaterial
            color={colorway.body}
            roughness={materialProps.roughness}
            metalness={materialProps.metalness}
          />
        </mesh>

        {/* Outer Metallic Accent Bezel Ring */}
        <mesh position={[0.24, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.61, 0.03, 16, 32]} />
          <meshStandardMaterial color={colorway.accent} roughness={0.15} metalness={0.9} />
        </mesh>

        {/* Center Logo Faceplate Medallion */}
        <mesh position={[0.276, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.42, 0.42, 0.02, 28]} />
          <meshStandardMaterial
            color={colorway.accent}
            roughness={0.15}
            metalness={0.95}
          />
        </mesh>

        {/* Status / Power Indicator LED */}
        <mesh position={[0.27, -0.32, 0.15]}>
          <sphereGeometry args={[0.03, 12, 12]} />
          <meshStandardMaterial
            color="#10b981"
            emissive="#10b981"
            emissiveIntensity={isPulsing ? 2.5 : 1.2}
            roughness={0.1}
          />
        </mesh>

        {/* Right Internal Driver (Acoustic Diaphragm & Magnet) */}
        <group ref={rightDriverRef} position={[0, 0, 0]}>
          <mesh position={[-0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.48, 0.48, 0.04, 28]} />
            <meshStandardMaterial color="#1f2937" roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[-0.072, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.22, 0.22, 0.02, 24]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.25} metalness={0.9} />
          </mesh>
          <mesh position={[-0.075, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <ringGeometry args={[0.28, 0.46, 24]} />
            <meshBasicMaterial color="#374151" wireframe={true} />
          </mesh>
        </group>

        {/* Right Memory Foam Ear Cushion */}
        <group ref={rightCushionRef} position={[-0.25, 0, 0]}>
          <mesh rotation={[0, Math.PI / 2, 0]} castShadow>
            <torusGeometry args={[0.46, 0.17, 18, 32]} />
            <meshStandardMaterial
              color={colorway.cushion}
              roughness={0.88}
              metalness={0.02}
            />
          </mesh>
          {/* Inner Acoustic Mesh Screen */}
          <mesh position={[-0.02, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <circleGeometry args={[0.38, 24]} />
            <meshStandardMaterial
              color="#0d1117"
              roughness={0.95}
              metalness={0.0}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      </group>

      {/* Acoustic wave visual ripple when Soundwave Pulse is active */}
      {isPulsing && !reducedMotion && (
        <mesh ref={pulseRingRef} position={[0, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.8, 1.88, 36]} />
          <meshBasicMaterial
            color={colorway.accent}
            transparent={true}
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Subtle Ground Contact Shadow Catcher */}
      <mesh position={[0, -1.35, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5, 5]} />
        <shadowMaterial opacity={0.35} />
      </mesh>
    </group>
  );
}
