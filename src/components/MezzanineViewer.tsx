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
        const segmentLength = railing.length || 10; // Length of each segment in meters
        // Calculate total stairs quantity from all stair accessories
        const totalStairsQuantity = stairs.reduce((sum, stair) => sum + stair.quantity, 0);
        // Calculate pallet gate ranges - each accessory positions its gates independently
        // Collect all gate positions from all accessories
        const palletGatesWidths: number[] = [];
        palletGates.forEach(gate => {
          const gateWidth = parseFloat(gate.width || '2000mm') / 1000;
          for (let q = 0; q < gate.quantity; q++) {
            palletGatesWidths.push(gateWidth);
          }
        });
        return (
          <Railings
            key={railing.id}
            length={length}
            width={width}
            height={height}
            quantity={railing.quantity}
            segmentLength={segmentLength}
            index={idx}
            stairsQuantity={totalStairsQuantity}
            palletGatesWidths={palletGatesWidths}
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
      {(() => {
        // Calculate positions for all pallet gates together
        const allGateWidths = palletGates.flatMap(gate => 
          Array.from({ length: gate.quantity }, () => ({
            width: parseFloat(gate.width || '2000mm') / 1000,
            id: `${gate.id}-${Date.now()}-${Math.random()}`
          }))
        );
        
        // Calculate positions sequentially
        let currentX = 0;
        let totalSpan = 0;
        if (allGateWidths.length > 0) {
          allGateWidths.forEach((gate, idx) => {
            if (idx > 0) {
              const prevWidth = allGateWidths[idx - 1].width;
              const spacing = Math.max(Math.max(prevWidth, gate.width) + 1, 2);
              totalSpan += spacing;
            }
            totalSpan += gate.width;
          });
          currentX = -totalSpan / 2;
        }
        
        let gateIndex = 0;
        return palletGates.map((gate) => {
          const gateWidth = parseFloat(gate.width || '2000mm') / 1000;
          const gates = [];
          for (let q = 0; q < gate.quantity; q++) {
            if (gateIndex > 0) {
              const prevWidth = allGateWidths[gateIndex - 1].width;
              const spacing = Math.max(Math.max(prevWidth, gateWidth) + 1, 2);
              currentX += spacing;
            }
            currentX += gateWidth / 2;
            gates.push({ x: currentX, width: gateWidth });
            currentX += gateWidth / 2;
            gateIndex++;
          }
          return (
            <PalletGate
              key={gate.id}
              length={length}
              width={width}
              height={height}
              positions={gates}
            />
          );
        });
      })()}
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
  const columnPositions: [number, number, number][] = [
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
  quantity,
  segmentLength,
  index: _index,
  stairsQuantity,
  palletGatesWidths,
}: {
  length: number;
  width: number;
  height: number;
  quantity: number;
  segmentLength: number;
  index: number;
  stairsQuantity: number;
  palletGatesWidths: number[];
}) {
  const railingHeight = 1.1; // 1.1 meters
  const stairWidth = 1.0; // 1 meter wide (matches Stairs component)

  // Calculate X-axis ranges occupied by stairs
  // Each stair is 1.0m wide, spaced 2m apart (center-to-center)
  // For quantity N, calculate occupied X ranges
  const getStairsXRanges = (quantity: number): Array<[number, number]> => {
    if (quantity === 0) return [];
    const ranges: Array<[number, number]> = [];
    for (let qIdx = 0; qIdx < quantity; qIdx++) {
      // Center stairs: for quantity=1: 0, quantity=2: -1,1, quantity=3: -2,0,2, etc.
      const offsetX = (qIdx - (quantity - 1) / 2) * 2;
      // Each stair occupies: X from (offsetX - 0.5) to (offsetX + 0.5)
      ranges.push([offsetX - stairWidth / 2, offsetX + stairWidth / 2]);
    }
    return ranges;
  };

  // Calculate X-axis ranges occupied by pallet gates
  // Since each PalletGate component positions its gates independently (centered),
  // we need to account for all possible positions. For simplicity, we'll position
  // all gates in sequence with proper spacing, centered as a group.
  const getPalletGatesXRanges = (widths: number[]): Array<[number, number]> => {
    if (widths.length === 0) return [];
    const ranges: Array<[number, number]> = [];
    
    // Position all gates in sequence, centered as a group
    let currentX = 0;
    let totalSpan = 0;
    
    // First, calculate total span needed
    widths.forEach((gateWidth, idx) => {
      if (idx > 0) {
        const prevWidth = widths[idx - 1];
        const spacing = Math.max(Math.max(prevWidth, gateWidth) + 1, 2);
        totalSpan += spacing;
      }
      totalSpan += gateWidth;
    });
    
    // Now position gates starting from the left edge of the group
    currentX = -totalSpan / 2;
    
    widths.forEach((gateWidth, idx) => {
      if (idx > 0) {
        const prevWidth = widths[idx - 1];
        const spacing = Math.max(Math.max(prevWidth, gateWidth) + 1, 2);
        currentX += spacing;
      }
      currentX += gateWidth / 2;
      // Each gate occupies: X from (currentX - gateWidth/2) to (currentX + gateWidth/2)
      ranges.push([currentX - gateWidth / 2, currentX + gateWidth / 2]);
      currentX += gateWidth / 2;
    });
    
    return ranges;
  };

  const stairsXRanges = getStairsXRanges(stairsQuantity);
  const palletGatesXRanges = getPalletGatesXRanges(palletGatesWidths);

  // Helper function to check if a railing segment overlaps with any stair
  const overlapsWithStairs = (segmentCenterX: number, segmentLength: number): boolean => {
    const segmentMinX = segmentCenterX - segmentLength / 2;
    const segmentMaxX = segmentCenterX + segmentLength / 2;
    return stairsXRanges.some(([stairMinX, stairMaxX]) => {
      // Check if segments overlap
      return segmentMinX < stairMaxX && segmentMaxX > stairMinX;
    });
  };

  // Helper function to check if a railing segment overlaps with any pallet gate
  const overlapsWithPalletGates = (segmentCenterX: number, segmentLength: number): boolean => {
    const segmentMinX = segmentCenterX - segmentLength / 2;
    const segmentMaxX = segmentCenterX + segmentLength / 2;
    return palletGatesXRanges.some(([gateMinX, gateMaxX]) => {
      // Check if segments overlap
      return segmentMinX < gateMaxX && segmentMaxX > gateMinX;
    });
  };

  // Calculate capacity for each side
  const frontCapacity = Math.floor(length / segmentLength);
  const backCapacity = Math.floor(length / segmentLength);
  const leftCapacity = Math.floor(width / segmentLength);
  const rightCapacity = Math.floor(width / segmentLength);

  // Distribute quantity across sides: front → back → left → right
  const segments: Array<{
    side: 'front' | 'back' | 'left' | 'right';
    sideIndex: number; // Index within the side (0, 1, 2, ...)
  }> = [];

  let remaining = quantity;

  // Fill front side, skipping segments that overlap with stairs or pallet gates
  let frontSideIndex = 0;
  let frontCount = 0;
  while (remaining > 0 && frontSideIndex < frontCapacity) {
    // Calculate the center position of this potential segment
    const segmentCenterOffset = (frontSideIndex + 0.5) * segmentLength - length / 2;
    
    // Check if this segment would overlap with stairs or pallet gates
    if (!overlapsWithStairs(segmentCenterOffset, segmentLength) && 
        !overlapsWithPalletGates(segmentCenterOffset, segmentLength)) {
      segments.push({ side: 'front', sideIndex: frontSideIndex });
      remaining--;
      frontCount++;
    }
    frontSideIndex++;
  }

  // Fill back side
  const backCount = Math.min(remaining, backCapacity);
  for (let i = 0; i < backCount; i++) {
    segments.push({ side: 'back', sideIndex: i });
  }
  remaining -= backCount;

  // Fill left side
  const leftCount = Math.min(remaining, leftCapacity);
  for (let i = 0; i < leftCount; i++) {
    segments.push({ side: 'left', sideIndex: i });
  }
  remaining -= leftCount;

  // Fill right side
  const rightCount = Math.min(remaining, rightCapacity);
  for (let i = 0; i < rightCount; i++) {
    segments.push({ side: 'right', sideIndex: i });
  }

  return (
    <>
      {segments.map((segment, idx) => {
        const isHorizontal = segment.side === 'front' || segment.side === 'back';
        const sideLength = isHorizontal ? length : width;

        // Calculate the center position of this segment along the side
        // Position starts from the left/bottom edge and spaces segments evenly
        const segmentCenterOffset = (segment.sideIndex + 0.5) * segmentLength - sideLength / 2;

        // Base position for each side
        let basePosition: [number, number, number];
        if (segment.side === 'front') {
          basePosition = [segmentCenterOffset, height + railingHeight / 2, -width / 2];
        } else if (segment.side === 'back') {
          basePosition = [segmentCenterOffset, height + railingHeight / 2, width / 2];
        } else if (segment.side === 'left') {
          basePosition = [-length / 2, height + railingHeight / 2, segmentCenterOffset];
        } else {
          // right
          basePosition = [length / 2, height + railingHeight / 2, segmentCenterOffset];
        }

        return (
          <group key={idx} position={basePosition}>
            {/* Main railing bar */}
            <mesh>
              <boxGeometry
                args={isHorizontal ? [segmentLength, 0.05, 0.05] : [0.05, 0.05, segmentLength]}
              />
              <meshStandardMaterial color="#555555" />
            </mesh>
            {/* Top bar */}
            <mesh position={[0, railingHeight / 2, 0]}>
              <boxGeometry
                args={isHorizontal ? [segmentLength, 0.05, 0.05] : [0.05, 0.05, segmentLength]}
              />
              <meshStandardMaterial color="#555555" />
            </mesh>
            {/* Bottom bar */}
            <mesh position={[0, -railingHeight / 2, 0]}>
              <boxGeometry
                args={isHorizontal ? [segmentLength, 0.05, 0.05] : [0.05, 0.05, segmentLength]}
              />
              <meshStandardMaterial color="#555555" />
            </mesh>
            {/* Vertical supports */}
            {Array.from({ length: Math.max(1, Math.floor(segmentLength / 2)) }).map((_, i) => (
              <mesh
                key={i}
                position={[
                  isHorizontal ? (i - Math.floor(segmentLength / 4)) * 2 : 0,
                  0,
                  isHorizontal ? 0 : (i - Math.floor(segmentLength / 4)) * 2,
                ]}
              >
                <boxGeometry args={[0.03, railingHeight, 0.03]} />
                <meshStandardMaterial color="#555555" />
              </mesh>
            ))}
          </group>
        );
      })}
    </>
  );
}

// Stairs component
function Stairs({
  length: _length,
  width,
  height,
  index: _index,
  quantity,
}: {
  length: number;
  width: number;
  height: number;
  index: number;
  quantity: number;
}) {
  const stairWidth = 1.0; // 1 meter wide
  const stepHeight = 0.2; // 0.2 meters per step
  const stepDepth = 0.3; // 0.3 meters depth per step
  const numSteps = Math.ceil(height / stepHeight);

  return (
    <group position={[0, 0, -width / 2]}>
      {Array.from({ length: quantity }).map((_, qIdx) => {
        // Center stairs: for quantity=1: 0, quantity=2: -1,1, quantity=3: -2,0,2, etc.
        const offsetX = (qIdx - (quantity - 1) / 2) * 2;
        return (
          <group key={qIdx} position={[offsetX, 0, 0]}>
            {/* Vertical support beams on both sides */}
            <mesh position={[-stairWidth / 2, height / 2, -stepDepth / 2]}>
              <boxGeometry args={[0.1, height, 0.1]} />
              <meshStandardMaterial color="#555555" />
            </mesh>
            <mesh position={[stairWidth / 2, height / 2, -stepDepth / 2]}>
              <boxGeometry args={[0.1, height, 0.1]} />
              <meshStandardMaterial color="#555555" />
            </mesh>
            {/* Steps - positioned progressively outward to create proper stair structure */}
            {Array.from({ length: numSteps }).map((_, stepIdx) => {
              const stepY = stepIdx * stepHeight + stepHeight / 2;
              // Position steps progressively outward: top step flush with mezzanine edge, bottom step extends furthest
              const stepZ = -((numSteps - 1 - stepIdx) * stepDepth + stepDepth / 2);
              return (
                <mesh
                  key={stepIdx}
                  position={[0, stepY, stepZ]}
                >
                  <boxGeometry args={[stairWidth, 0.05, stepDepth]} />
                  <meshStandardMaterial color="#555555" />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

// Pallet gate component
function PalletGate({
  length: _length,
  width,
  height,
  positions,
}: {
  length: number;
  width: number;
  height: number;
  positions: Array<{ x: number; width: number }>;
}) {
  const railingHeight = 1.1; // 1.1 meters high (matches railings)

  return (
    <group position={[0, 0, -width / 2]}>
      {positions.map((pos, qIdx) => {
        return (
          <group key={qIdx} position={[pos.x, height + railingHeight / 2, 0]}>
            {/* Main railing bar (middle) */}
            <mesh>
              <boxGeometry args={[pos.width, 0.05, 0.05]} />
              <meshStandardMaterial color="#ffd700" />
            </mesh>
            {/* Top bar */}
            <mesh position={[0, railingHeight / 2, 0]}>
              <boxGeometry args={[pos.width, 0.05, 0.05]} />
              <meshStandardMaterial color="#ffd700" />
            </mesh>
            {/* Bottom bar */}
            <mesh position={[0, -railingHeight / 2, 0]}>
              <boxGeometry args={[pos.width, 0.05, 0.05]} />
              <meshStandardMaterial color="#ffd700" />
            </mesh>
            {/* Vertical supports */}
            {Array.from({ length: Math.max(1, Math.floor(pos.width / 2)) }).map((_, i) => (
              <mesh
                key={i}
                position={[
                  (i - Math.floor(pos.width / 4)) * 2,
                  0,
                  0,
                ]}
              >
                <boxGeometry args={[0.03, railingHeight, 0.03]} />
                <meshStandardMaterial color="#ffd700" />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

