import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import Headphones3D from './Headphones3D.jsx';

function CameraPresetController({ preset = 'perspective', controlsRef, reducedMotion = false }) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 0.2, 4.2));
  const isTransitioning = useRef(false);

  useEffect(() => {
    switch (preset) {
      case 'side':
        targetPos.current.set(3.8, 0.1, 0.2);
        break;
      case 'top':
        targetPos.current.set(0.01, 4.0, 0.1);
        break;
      case 'front':
        targetPos.current.set(0, 0.1, 4.0);
        break;
      case 'perspective':
      default:
        targetPos.current.set(2.4, 1.2, 3.4);
        break;
    }

    if (reducedMotion) {
      camera.position.copy(targetPos.current);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
      isTransitioning.current = false;
    } else {
      isTransitioning.current = true;
    }
  }, [preset, camera, controlsRef, reducedMotion]);

  useFrame((_, delta) => {
    if (isTransitioning.current && !reducedMotion) {
      camera.position.lerp(targetPos.current, Math.min(1, delta * 5));
      if (controlsRef.current) {
        controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), delta * 5);
        controlsRef.current.update();
      }
      if (camera.position.distanceTo(targetPos.current) < 0.05) {
        camera.position.copy(targetPos.current);
        isTransitioning.current = false;
      }
    }
  });

  return null;
}

export default function ConfiguratorCanvas({
  colorway,
  finish,
  exploded,
  isPulsing,
  autoRotate,
  rotationSpeed,
  reducedMotion,
  cameraPreset,
}) {
  const controlsRef = useRef();

  return (
    <div className="canvas-container" tabIndex={0} aria-label="Interactive 3D view: Click or touch to rotate, pinch or scroll to zoom">
      <Canvas
        shadows
        dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2)]}
        camera={{ position: [2.4, 1.2, 3.4], fov: 46 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true,
        }}
      >
        {/* Soft Ambient Lighting */}
        <ambientLight intensity={0.75} />

        {/* Key Directional Sunlight with Soft Shadows */}
        <directionalLight
          position={[4, 6, 4]}
          intensity={1.6}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={15}
          shadow-camera-left={-3}
          shadow-camera-right={3}
          shadow-camera-top={3}
          shadow-camera-bottom={-3}
          shadow-bias={-0.0005}
        />

        {/* Soft Fill Light from opposite side */}
        <directionalLight position={[-4, 2, -3]} intensity={0.65} color="#93c5fd" />

        {/* Subtle Rim / Under Glow */}
        <pointLight position={[0, -2, 2]} intensity={0.35} color="#ffffff" />

        {/* Headphones 3D Model */}
        <Headphones3D
          colorway={colorway}
          finish={finish}
          exploded={exploded}
          isPulsing={isPulsing}
          autoRotate={autoRotate}
          rotationSpeed={rotationSpeed}
          reducedMotion={reducedMotion}
        />

        {/* Orbit Controls for mouse drag and mobile touch gestures */}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping={true}
          dampingFactor={0.06}
          minDistance={2.0}
          maxDistance={6.5}
          maxPolarAngle={Math.PI / 2 + 0.12}
          minPolarAngle={0.2}
          rotateSpeed={0.8}
          zoomSpeed={0.9}
        />

        {/* Preset Camera Smooth Transitions */}
        <CameraPresetController
          preset={cameraPreset}
          controlsRef={controlsRef}
          reducedMotion={reducedMotion}
        />
      </Canvas>

      {/* Viewport Control Instructions Overlay Badge */}
      <div className="viewport-overlay-hint" aria-hidden="true">
        <span>Drag to rotate</span> • <span>Pinch / scroll to zoom</span>
      </div>
    </div>
  );
}
