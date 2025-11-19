import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useMemo } from 'react';
import type { MezzanineConfig } from '../types';

interface MezzanineViewerProps {
  config: MezzanineConfig;
}

export default function MezzanineViewer({ config }: MezzanineViewerProps) {
  return (
    <div className="w-full h-full bg-white rounded">
      <Canvas camera={{ position: [15, 10, 15], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 10, 5]} intensity={0.9} />
        <pointLight position={[-10, 10, -10]} intensity={0.4} />
        <MezzanineModel config={config} />
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        <gridHelper args={[50, 50, '#e5e5e5', '#f5f5f5']} />
      </Canvas>
    </div>
  );
}

// MezzanineModel component that renders the actual 3D structure
function MezzanineModel({ config }: { config: MezzanineConfig }) {
  // Convert mm to meters for Three.js (1 unit = 1 meter)
  const length = config.length / 1000;
  const width = config.width / 1000;
  const height = config.height / 1000;

  const stairs = useMemo(
    () => config.accessories.filter((a) => a.type === 'stairs'),
    [config.accessories]
  );
  const railings = useMemo(
    () => config.accessories.filter((a) => a.type === 'railings'),
    [config.accessories]
  );
  const palletGates = useMemo(
    () => config.accessories.filter((a) => a.type === 'palletGate'),
    [config.accessories]
  );

  return (
    <group>
      {/* Base frame/platform - light grey */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[length, width, 0.1]} />
        <meshStandardMaterial color="#d3d3d3" />
      </mesh>

      {/* Support columns */}
      <SupportColumns length={length} width={width} height={height} />

      {/* Floor - light yellow */}
      <mesh position={[0, height, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[length, width, 0.05]} />
        <meshStandardMaterial color="#fffacd" />
      </mesh>

      {/* Railings */}
      {railings.map((railing, idx) => {
        const railingLength = (railing.length || 10) * railing.quantity;
        return (
          <Railings
            key={railing.id}
            length={length}
            width={width}
            height={height}
            railingLength={railingLength}
            index={idx}
          />
        );
      })}

      {/* Stairs */}
      {stairs.map((stair, idx) => (
        <Stairs
          key={stair.id}
          length={length}
          width={width}
          height={height}
          index={idx}
          quantity={stair.quantity}
        />
      ))}

      {/* Pallet gates */}
      {palletGates.map((gate, idx) => (
        <PalletGate
          key={gate.id}
          length={length}
          width={width}
          height={height}
          index={idx}
          gateWidth={gate.width || '2000mm'}
        />
      ))}
    </group>
  );
}

// Support columns component
function SupportColumns({
  length,
  width,
  height,
}: {
  length: number;
  width: number;
  height: number;
}) {
  const columnPositions = [
    [-length / 2 + 0.5, height / 2, -width / 2 + 0.5],
    [length / 2 - 0.5, height / 2, -width / 2 + 0.5],
    [-length / 2 + 0.5, height / 2, width / 2 - 0.5],
    [length / 2 - 0.5, height / 2, width / 2 - 0.5],
  ];

  return (
    <>
      {columnPositions.map((pos, idx) => (
        <mesh key={idx} position={pos}>
          <cylinderGeometry args={[0.1, 0.1, height, 8]} />
          <meshStandardMaterial color="#d3d3d3" />
        </mesh>
      ))}
    </>
  );
}

// Railings component
function Railings({
  length,
  width,
  height,
  railingLength,
  index,
}: {
  length: number;
  width: number;
  height: number;
  railingLength: number;
  index: number;
}) {
  const railingHeight = 1.1; // 1.1 meters
  const positions = [
    // Front
    [0, height + railingHeight / 2, -width / 2],
    // Back
    [0, height + railingHeight / 2, width / 2],
    // Left
    [-length / 2, height + railingHeight / 2, 0],
    // Right
    [length / 2, height + railingHeight / 2, 0],
  ];

  return (
    <>
      {positions.slice(0, Math.min(4, Math.ceil(railingLength / Math.max(length, width)))).map(
        (pos, idx) => {
          const isHorizontal = idx < 2;
          const railingLen = isHorizontal ? length : width;
          return (
            <group key={idx} position={pos}>
              {/* Main railing bar */}
              <mesh>
                <boxGeometry args={isHorizontal ? [railingLen, 0.05, 0.05] : [0.05, 0.05, railingLen]} />
                <meshStandardMaterial color="#555555" />
              </mesh>
              {/* Top bar */}
              <mesh position={[0, railingHeight / 2, 0]}>
                <boxGeometry args={isHorizontal ? [railingLen, 0.05, 0.05] : [0.05, 0.05, railingLen]} />
                <meshStandardMaterial color="#555555" />
              </mesh>
              {/* Bottom bar */}
              <mesh position={[0, -railingHeight / 2, 0]}>
                <boxGeometry args={isHorizontal ? [railingLen, 0.05, 0.05] : [0.05, 0.05, railingLen]} />
                <meshStandardMaterial color="#555555" />
              </mesh>
              {/* Vertical supports */}
              {Array.from({ length: Math.floor(railingLen / 2) }).map((_, i) => (
                <mesh
                  key={i}
                  position={[
                    isHorizontal ? (i - Math.floor(railingLen / 4)) * 2 : 0,
                    0,
                    isHorizontal ? 0 : (i - Math.floor(railingLen / 4)) * 2,
                  ]}
                >
                  <boxGeometry args={[0.03, railingHeight, 0.03]} />
                  <meshStandardMaterial color="#555555" />
                </mesh>
              ))}
            </group>
          );
        }
      )}
    </>
  );
}

// Stairs component
function Stairs({
  length,
  width,
  height,
  index,
  quantity,
}: {
  length: number;
  width: number;
  height: number;
  index: number;
  quantity: number;
}) {
  const stairWidth = 1.0; // 1 meter wide
  const stairLength = 3.84; // 3.84 meters long
  const angle = Math.atan2(height, stairLength);

  return (
    <group position={[length / 2 - 1, 0, -width / 2 + index * 2]}>
      {Array.from({ length: quantity }).map((_, qIdx) => (
        <group key={qIdx} position={[0, 0, qIdx * 2]}>
          <mesh rotation={[0, 0, -angle]} position={[0, height / 2, 0]}>
            <boxGeometry args={[stairLength, 0.1, stairWidth]} />
            <meshStandardMaterial color="#555555" />
          </mesh>
          {/* Steps */}
          {Array.from({ length: Math.floor(stairLength / 0.3) }).map((_, stepIdx) => (
            <mesh
              key={stepIdx}
              rotation={[0, 0, -angle]}
              position={[
                (stepIdx - Math.floor(stairLength / 0.6)) * 0.3,
                (stepIdx - Math.floor(stairLength / 0.6)) * (height / Math.floor(stairLength / 0.3)),
                0,
              ]}
            >
              <boxGeometry args={[0.3, 0.05, stairWidth]} />
              <meshStandardMaterial color="#555555" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// Pallet gate component
function PalletGate({
  length,
  width,
  height,
  index,
  gateWidth,
}: {
  length: number;
  width: number;
  height: number;
  index: number;
  gateWidth: string;
}) {
  const gateWidthNum = parseFloat(gateWidth) / 1000; // Convert mm to meters
  const gateHeight = 2.0; // 2 meters high

  return (
    <group position={[0, height + gateHeight / 2, -width / 2 + index * 3]}>
      {/* Gate frame */}
      <mesh>
        <boxGeometry args={[gateWidthNum, gateHeight, 0.1]} />
        <meshStandardMaterial color="#ffd700" />
      </mesh>
      {/* Gate bars */}
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[gateWidthNum, 0.05, 0.02]} />
        <meshStandardMaterial color="#ffd700" />
      </mesh>
      <mesh position={[0, gateHeight / 2, 0.05]}>
        <boxGeometry args={[gateWidthNum, 0.05, 0.02]} />
        <meshStandardMaterial color="#ffd700" />
      </mesh>
      <mesh position={[0, -gateHeight / 2, 0.05]}>
        <boxGeometry args={[gateWidthNum, 0.05, 0.02]} />
        <meshStandardMaterial color="#ffd700" />
      </mesh>
    </group>
  );
}

